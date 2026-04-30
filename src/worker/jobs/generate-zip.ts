import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import archiver from "archiver";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import type { Logger } from "pino";
import { PassThrough } from "node:stream";

import {
  audioFiles,
  downloadJobs,
  events,
  eventAnalyticsEvents,
} from "@/db/schema";
import { getR2BucketName, getR2Client, headObject } from "@/lib/r2";

import { getWorkerDb } from "../db";

export type GenerateZipPayload = {
  downloadJobId: string;
  eventId: string;
  companyId: string;
};

export async function processGenerateZipJob(
  payload: GenerateZipPayload,
  log: Logger
): Promise<void> {
  try {
    await runGenerateZip(payload, log);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error(
      {
        err,
        stack,
        downloadJobId: payload.downloadJobId,
        eventId: payload.eventId,
        companyId: payload.companyId,
      },
      "generate-zip: unhandled exception — marking job failed"
    );
    await failJob(payload.downloadJobId, msg, log);
  }
}

async function runGenerateZip(
  payload: GenerateZipPayload,
  log: Logger
): Promise<void> {
  const db = getWorkerDb();
  const now = new Date();
  await db
    .update(downloadJobs)
    .set({
      status: "processing",
      startedAt: now,
      errorMessage: null,
    })
    .where(eq(downloadJobs.id, payload.downloadJobId));

  log.info(
    {
      downloadJobId: payload.downloadJobId,
      eventId: payload.eventId,
    },
    "generate-zip: status=processing"
  );

  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, payload.eventId),
    columns: {
      id: true,
    },
  });
  if (!eventRow) {
    log.warn(
      { downloadJobId: payload.downloadJobId, eventId: payload.eventId },
      "generate-zip: event not found"
    );
    await failJob(payload.downloadJobId, "Event not found", log);
    return;
  }

  const files = await db.query.audioFiles.findMany({
    where: and(
      eq(audioFiles.eventId, payload.eventId),
      isNull(audioFiles.deletedAt),
      isNotNull(audioFiles.uploadedAt)
    ),
    orderBy: [asc(audioFiles.displayOrder), asc(audioFiles.uploadedAt)],
  });

  if (files.length === 0) {
    log.warn(
      { downloadJobId: payload.downloadJobId, eventId: payload.eventId },
      "generate-zip: no audio files"
    );
    await failJob(payload.downloadJobId, "No audio files to include", log);
    return;
  }

  const bucket = getR2BucketName();
  const s3 = getR2Client();
  const storageKey = `event-zips/${payload.eventId}/${payload.downloadJobId}.zip`;

  const pass = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("error", (err: Error) => {
    pass.destroy(err);
  });
  archive.pipe(pass);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: storageKey,
      Body: pass,
      ContentType: "application/zip",
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024,
  });

  const filling = (async () => {
    let i = 0;
    for (const f of files) {
      const out = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: f.storageKey })
      );
      const body = out.Body;
      if (!body) continue;
      const safeName = f.originalFilename.replace(/[/\\]/g, "_");
      const nameInZip = `${String(i + 1).padStart(2, "0")}_${safeName}`;
      archive.append(body as import("node:stream").Readable, {
        name: nameInZip,
      });
      i += 1;
    }
    await archive.finalize();
  })();

  try {
    await Promise.all([upload.done(), filling]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      {
        err,
        downloadJobId: payload.downloadJobId,
        storageKey,
      },
      "generate-zip: stream/upload failed"
    );
    await failJob(payload.downloadJobId, msg, log);
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: storageKey,
        })
      );
    } catch (delErr) {
      log.warn({ delErr, storageKey }, "generate-zip: partial zip cleanup failed");
    }
    return;
  }

  const head = await headObject(storageKey);
  const sizeBytes = head?.contentLength ?? 0;
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

  await db
    .update(downloadJobs)
    .set({
      status: "succeeded",
      resultStorageKey: storageKey,
      resultSizeBytes: sizeBytes,
      expiresAt,
      completedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(downloadJobs.id, payload.downloadJobId));

  await db.insert(eventAnalyticsEvents).values({
    eventId: payload.eventId,
    eventType: "zip_download",
    ipHash: null,
    userAgent: "bulk_zip_worker",
    referrer: null,
  });

  log.info(
    {
      downloadJobId: payload.downloadJobId,
      eventId: payload.eventId,
      sizeBytes,
    },
    "generate-zip: succeeded"
  );
}

async function failJob(
  jobId: string,
  message: string,
  log: Logger
): Promise<void> {
  const db = getWorkerDb();
  const trimmed = message.slice(0, 2000);
  await db
    .update(downloadJobs)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: trimmed,
    })
    .where(eq(downloadJobs.id, jobId));
  log.warn({ jobId, errorMessage: trimmed }, "generate-zip: download_jobs marked failed");
}
