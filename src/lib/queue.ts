import { Queue } from "bullmq";

import { getSharedRedis } from "@/lib/redis";

/** Shared bounded retention so Redis does not grow unbounded job history. */
const REMOVE_ON_COMPLETE = { count: 50, age: 24 * 3600 };
const REMOVE_ON_FAIL = { count: 100, age: 7 * 24 * 3600 };

/**
 * BullMQ v5 `JobsOptions` has no typed `timeout` field; enforced per attempt in the extract-zip Worker.
 */
export const EXTRACT_ZIP_ATTEMPT_TIMEOUT_MS = 15 * 60 * 1000;

export const EXTRACT_ZIP_QUEUE_NAME = "extract-zip";
export const GENERATE_ZIP_QUEUE_NAME = "generate-zip";
export const RETENTION_SCHEDULER_QUEUE_NAME = "retention-scheduler";

export const TRANSCODE_AUDIO_QUEUE_NAME = "transcode-audio";

export type TranscodeAudioJobPayload = {
  audioFileId: string;
  eventId: string;
  companyId: string;
};

const gTc = globalThis as typeof globalThis & {
  __transcodeAudioQueue?: Queue<TranscodeAudioJobPayload>;
};

export function getTranscodeAudioQueue(): Queue<TranscodeAudioJobPayload> {
  if (!gTc.__transcodeAudioQueue) {
    const connection = getSharedRedis();
    gTc.__transcodeAudioQueue = new Queue<TranscodeAudioJobPayload>(
      TRANSCODE_AUDIO_QUEUE_NAME,
      { connection }
    );
  }
  return gTc.__transcodeAudioQueue;
}

export async function enqueueTranscodeAudioJob(
  payload: TranscodeAudioJobPayload
): Promise<void> {
  const queue = getTranscodeAudioQueue();
  try {
    await queue.add(
      "transcode-audio",
      payload,
      {
        jobId: `transcode-${payload.audioFileId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 8000 },
        removeOnComplete: REMOVE_ON_COMPLETE,
        removeOnFail: REMOVE_ON_FAIL,
      }
    );
  } catch (e) {
    console.warn("enqueue transcode job", e);
  }
}

export type ExtractZipJobPayload = {
  uploadJobId: string;
  companyId: string;
  eventId: string;
  storageKey: string;
};

const g = globalThis as typeof globalThis & {
  __extractZipQueue?: Queue<ExtractZipJobPayload>;
};

export function getExtractZipQueue(): Queue<ExtractZipJobPayload> {
  if (!g.__extractZipQueue) {
    const connection = getSharedRedis();
    g.__extractZipQueue = new Queue<ExtractZipJobPayload>(
      EXTRACT_ZIP_QUEUE_NAME,
      { connection }
    );
  }
  return g.__extractZipQueue;
}

export async function enqueueExtractZipJob(
  payload: ExtractZipJobPayload
): Promise<void> {
  const queue = getExtractZipQueue();
  await queue.add("extract-zip", payload, {
    jobId: payload.uploadJobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: REMOVE_ON_COMPLETE,
    removeOnFail: REMOVE_ON_FAIL,
  });
}

export type GenerateZipJobPayload = {
  downloadJobId: string;
  eventId: string;
  companyId: string;
};

const gZip = globalThis as typeof globalThis & {
  __generateZipQueue?: Queue<GenerateZipJobPayload>;
};

export function getGenerateZipQueue(): Queue<GenerateZipJobPayload> {
  if (!gZip.__generateZipQueue) {
    const connection = getSharedRedis();
    gZip.__generateZipQueue = new Queue<GenerateZipJobPayload>(
      GENERATE_ZIP_QUEUE_NAME,
      { connection }
    );
  }
  return gZip.__generateZipQueue;
}

export async function enqueueGenerateZipJob(
  payload: GenerateZipJobPayload
): Promise<void> {
  const queue = getGenerateZipQueue();
  await queue.add("generate-zip", payload, {
    jobId: payload.downloadJobId,
    attempts: 2,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: REMOVE_ON_COMPLETE,
    removeOnFail: REMOVE_ON_FAIL,
  });
}

export type RetentionSchedulerJobPayload = Record<string, never>;

const gRet = globalThis as typeof globalThis & {
  __retentionSchedulerQueue?: Queue<RetentionSchedulerJobPayload>;
};

export function getRetentionSchedulerQueue(): Queue<RetentionSchedulerJobPayload> {
  if (!gRet.__retentionSchedulerQueue) {
    const connection = getSharedRedis();
    gRet.__retentionSchedulerQueue = new Queue<RetentionSchedulerJobPayload>(
      RETENTION_SCHEDULER_QUEUE_NAME,
      { connection }
    );
  }
  return gRet.__retentionSchedulerQueue;
}
