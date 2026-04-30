import { Queue } from "bullmq";

import { getSharedRedis } from "@/lib/redis";

export const EXTRACT_ZIP_QUEUE_NAME = "extract-zip";
export const GENERATE_ZIP_QUEUE_NAME = "generate-zip";
export const RETENTION_SCHEDULER_QUEUE_NAME = "retention-scheduler";

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
    removeOnComplete: true,
    removeOnFail: false,
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
    removeOnComplete: true,
    removeOnFail: false,
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
