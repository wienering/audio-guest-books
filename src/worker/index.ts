import "dotenv/config";

import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import pino from "pino";

import { uploadJobs } from "@/db/schema";
import { EXTRACT_ZIP_QUEUE_NAME } from "@/lib/queue";
import { createRedisFromEnv } from "@/lib/redis";

import { closeWorkerDb, getWorkerDb } from "./db";
import {
  markUploadJobFailedFromWorkerError,
  processExtractZipJob,
  type ExtractZipPayload,
} from "./jobs/extract-zip";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "audio-guest-book-worker" },
});

const connection = createRedisFromEnv();

const worker = new Worker<ExtractZipPayload>(
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
    await processExtractZipJob(job.data, log);
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
  }
);

worker.on("failed", async (job, err) => {
  if (!job?.data?.uploadJobId || !err) return;
  if (!job.finishedOn) return;
  await markUploadJobFailedFromWorkerError(job.data.uploadJobId, err, log);
});

worker.on("error", (err) => {
  log.error({ err }, "worker error");
});

log.info("worker started");

async function shutdown(signal: string) {
  log.info({ signal }, "shutdown: closing worker");
  await worker.close();
  await connection.quit();
  await closeWorkerDb();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
