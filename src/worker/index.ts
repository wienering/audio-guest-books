import "dotenv/config";

import { Queue, Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import pino from "pino";

import type { AppDatabase } from "@/db/index";
import { downloadJobs, uploadJobs } from "@/db/schema";
import {
  EXTRACT_ZIP_ATTEMPT_TIMEOUT_MS,
  EXTRACT_ZIP_QUEUE_NAME,
  GENERATE_ZIP_QUEUE_NAME,
  RETENTION_SCHEDULER_QUEUE_NAME,
  TRANSCODE_AUDIO_QUEUE_NAME,
  type TranscodeAudioJobPayload,
} from "@/lib/queue";
import { runRetentionScheduler } from "@/lib/retention-scheduler";
import { createRedisFromEnv } from "@/lib/redis";

import { closeWorkerDb, getWorkerDb } from "./db";
import {
  markUploadJobFailedFromWorkerError,
  processExtractZipJob,
  type ExtractZipPayload,
} from "./jobs/extract-zip";
import {
  processGenerateZipJob,
  type GenerateZipPayload,
} from "./jobs/generate-zip";
import { processTranscodeAudioJob } from "./jobs/transcode-audio";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "audio-guest-book-worker" },
});

const connection = createRedisFromEnv();

async function withAttemptTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}: exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

const extractWorker = new Worker<ExtractZipPayload>(
  EXTRACT_ZIP_QUEUE_NAME,
  async (job) => {
    const started = Date.now();
    log.info(
      {
        bullmqJobId: job.id,
        jobId: job.data.uploadJobId,
        eventId: job.data.eventId,
      },
      "extract-zip job start"
    );
    await withAttemptTimeout(
      processExtractZipJob(job.data, log),
      EXTRACT_ZIP_ATTEMPT_TIMEOUT_MS,
      "extract-zip"
    );
    const row = await getWorkerDb().query.uploadJobs.findFirst({
      where: eq(uploadJobs.id, job.data.uploadJobId),
    });
    log.info(
      {
        bullmqJobId: job.id,
        jobId: job.data.uploadJobId,
        eventId: job.data.eventId,
        status: row?.status ?? "unknown",
        durationMs: Date.now() - started,
        filesProcessed: row?.filesProcessed ?? 0,
        filesSucceeded: row?.filesSucceeded ?? 0,
        filesFailed: row?.filesFailed ?? 0,
      },
      "extract-zip job end"
    );
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 5 * 60 * 1000,
    lockRenewTime: 60 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 1,
    drainDelay: 30,
  }
);

const generateZipWorker = new Worker<GenerateZipPayload>(
  GENERATE_ZIP_QUEUE_NAME,
  async (job) => {
    const started = Date.now();
    log.info(
      { bullmqJobId: job.id, ...job.data },
      "generate-zip job start"
    );
    await processGenerateZipJob(job.data, log);
    const row = await getWorkerDb().query.downloadJobs.findFirst({
      where: eq(downloadJobs.id, job.data.downloadJobId),
    });
    log.info(
      {
        bullmqJobId: job.id,
        jobId: job.data.downloadJobId,
        status: row?.status ?? "unknown",
        durationMs: Date.now() - started,
      },
      "generate-zip job end"
    );
  },
  {
    connection,
    concurrency: 1,
    drainDelay: 30,
  }
);

const transcodeAudioWorker = new Worker<TranscodeAudioJobPayload>(
  TRANSCODE_AUDIO_QUEUE_NAME,
  async (job) => {
    const started = Date.now();
    log.info({ bullmqJobId: job.id, ...job.data }, "transcode-audio job start");
    await processTranscodeAudioJob(job.data, log);
    log.info(
      {
        bullmqJobId: job.id,
        audioFileId: job.data.audioFileId,
        durationMs: Date.now() - started,
      },
      "transcode-audio job end"
    );
  },
  {
    connection,
    concurrency: 2,
    drainDelay: 30,
  }
);

const retentionWorker = new Worker(
  RETENTION_SCHEDULER_QUEUE_NAME,
  async () => {
    log.info("retention scheduler job start");
    await runRetentionScheduler(
      getWorkerDb() as unknown as AppDatabase,
      log
    );
    log.info("retention scheduler job end");
  },
  {
    connection,
    concurrency: 1,
    drainDelay: 30,
  }
);

void (async () => {
  const q = new Queue(RETENTION_SCHEDULER_QUEUE_NAME, { connection });
  try {
    await q.add(
      "retention-daily",
      {},
      {
        repeat: { pattern: "0 3 * * *", tz: "UTC" },
        jobId: "retention-daily-utc-v1",
      }
    );
    log.info("retention scheduler repeatable job registered");
  } catch (e) {
    log.warn({ e }, "retention scheduler registration failed");
  }
})();

extractWorker.on("failed", async (job, err) => {
  if (!job?.data?.uploadJobId || !err) return;
  await markUploadJobFailedFromWorkerError(job.data.uploadJobId, err, log);
});

generateZipWorker.on("failed", async (job, err) => {
  if (!job?.data?.downloadJobId || !err) return;
  const db = getWorkerDb();
  await db
    .update(downloadJobs)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: err.message.slice(0, 2000),
    })
    .where(
      and(
        eq(downloadJobs.id, job.data.downloadJobId),
        eq(downloadJobs.status, "processing")
      )
    );
});

extractWorker.on("error", (err) => {
  log.error({ err }, "extract worker error");
});
generateZipWorker.on("error", (err) => {
  log.error({ err }, "generate-zip worker error");
});
transcodeAudioWorker.on("error", (err) => {
  log.error({ err }, "transcode-audio worker error");
});
retentionWorker.on("error", (err) => {
  log.error({ err }, "retention worker error");
});

log.info("worker started");

async function shutdown(signal: string) {
  log.info({ signal }, "shutdown: closing workers");
  await extractWorker.close();
  await generateZipWorker.close();
  await transcodeAudioWorker.close();
  await retentionWorker.close();
  await connection.quit();
  await closeWorkerDb();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
