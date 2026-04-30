import { Queue } from "bullmq";

import { getSharedRedis } from "@/lib/redis";

export const EXTRACT_ZIP_QUEUE_NAME = "extract-zip";

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
