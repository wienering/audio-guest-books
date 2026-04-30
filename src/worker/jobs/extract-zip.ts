import { createHash } from "node:crypto";

import { Upload } from "@aws-sdk/lib-storage";
import { UnrecoverableError } from "bullmq";
import { and, count, eq, gt, isNull, like, max, or } from "drizzle-orm";
import type { Logger } from "pino";
import unzipper from "unzipper";

import type { UploadJobErrorDetail } from "@/db/schema";
import {
  audioFiles,
  companies,
  companyFeatures,
  events,
  features,
  plans,
  uploadJobs,
} from "@/db/schema";
import {
  classifyZipEntry,
  MAX_UPLOAD_BYTES,
  zipIncompatibleFormatsErrorMessage,
} from "@/lib/audio-upload-policy";
import {
  deleteObject,
  getR2BucketName,
  getR2Client,
  sanitizeFilenameForKey,
} from "@/lib/r2";

import { getWorkerDb } from "../db";

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  flac: "audio/flac",
  aiff: "audio/aiff",
  aif: "audio/aiff",
};

function mimeForPath(pathInZip: string): string {
  const base = pathInZip.split(/[/\\]/).pop() ?? pathInZip;
  const m = /\.([^.]+)$/.exec(base.toLowerCase());
  const ext = m?.[1];
  if (!ext) return "application/octet-stream";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function zipObjectPrefix(params: {
  companyId: string;
  eventId: string;
  uploadJobId: string;
}): string {
  return `${params.companyId}/${params.eventId}/zip-${params.uploadJobId}/`;
}

function storageKeyForZipEntry(params: {
  companyId: string;
  eventId: string;
  uploadJobId: string;
  pathInZip: string;
}): string {
  const normalized = params.pathInZip.replace(/\\/g, "/");
  const pathHash = createHash("sha256")
    .update(`${params.uploadJobId}\0${normalized}`)
    .digest("hex")
    .slice(0, 24);
  const baseName = normalized.split("/").pop() ?? "audio";
  const safe = sanitizeFilenameForKey(baseName);
  return `${zipObjectPrefix(params)}${pathHash}-${safe}`;
}

async function safeDeleteZipArchive(
  storageKey: string,
  log: Logger
): Promise<void> {
  try {
    await deleteObject(storageKey);
  } catch (err) {
    log.warn({ err, storageKey }, "could not delete zip archive from R2");
  }
}

async function companyHasTranscodingFeature(
  companyId: string
): Promise<boolean> {
  const db = getWorkerDb();
  const now = new Date();
  const rows = await db
    .select({ id: features.id })
    .from(companyFeatures)
    .innerJoin(features, eq(companyFeatures.featureId, features.id))
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(features.key, "audio_transcoding"),
        or(
          isNull(companyFeatures.expiresAt),
          gt(companyFeatures.expiresAt, now)
        )
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function resolveUniqueOriginalFilename(
  eventId: string,
  desired: string
): Promise<string> {
  const db = getWorkerDb();
  const rows = await db
    .select({ name: audioFiles.originalFilename })
    .from(audioFiles)
    .where(and(eq(audioFiles.eventId, eventId), isNull(audioFiles.deletedAt)));
  const taken = new Set(rows.map((r) => r.name));
  if (!taken.has(desired)) return desired;
  const m = /^(.+?)(\.[^.]+)$/.exec(desired);
  const stem = m?.[1] ?? desired;
  const extPart = m?.[2] ?? "";
  let n = 2;
  let candidate = `${stem}-${n}${extPart}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${stem}-${n}${extPart}`;
  }
  return candidate;
}

async function failUploadJobTerminal(
  uploadJobId: string,
  message: string,
  details: UploadJobErrorDetail[] | null,
  zipStorageKey: string,
  log: Logger
): Promise<void> {
  const db = getWorkerDb();
  await db
    .update(uploadJobs)
    .set({
      status: "failed",
      errorMessage: message,
      errorDetails: details,
      completedAt: new Date(),
    })
    .where(eq(uploadJobs.id, uploadJobId));
  await safeDeleteZipArchive(zipStorageKey, log);
}

export type ExtractZipPayload = {
  uploadJobId: string;
  companyId: string;
  eventId: string;
  storageKey: string;
};

export async function processExtractZipJob(
  payload: ExtractZipPayload,
  log: Logger
): Promise<void> {
  const db = getWorkerDb();
  const start = Date.now();

  const jobRow = await db.query.uploadJobs.findFirst({
    where: eq(uploadJobs.id, payload.uploadJobId),
  });

  if (!jobRow) {
    throw new UnrecoverableError(`upload job not found: ${payload.uploadJobId}`);
  }

  const [planLimitRow] = await db
    .select({ fileLimitPerEvent: plans.fileLimitPerEvent })
    .from(events)
    .innerJoin(companies, eq(events.companyId, companies.id))
    .innerJoin(plans, eq(companies.planId, plans.id))
    .where(eq(events.id, jobRow.eventId))
    .limit(1);

  const planLimit = planLimitRow?.fileLimitPerEvent ?? null;

  if (
    jobRow.completedAt &&
    (jobRow.status === "succeeded" ||
      jobRow.status === "failed" ||
      jobRow.status === "partial")
  ) {
    log.info(
      { uploadJobId: payload.uploadJobId, status: jobRow.status },
      "extract-zip skip: already terminal"
    );
    return;
  }

  if (
    jobRow.storageKey !== payload.storageKey ||
    jobRow.companyId !== payload.companyId ||
    jobRow.eventId !== payload.eventId
  ) {
    await failUploadJobTerminal(
      payload.uploadJobId,
      "Upload job payload mismatch.",
      null,
      payload.storageKey,
      log
    );
    throw new UnrecoverableError("upload job payload mismatch");
  }

  const allowUltimate = await companyHasTranscodingFeature(payload.companyId);

  const now = new Date();
  await db
    .update(uploadJobs)
    .set({
      status: "processing",
      startedAt: jobRow.startedAt ?? now,
      errorMessage: null,
      errorDetails: null,
    })
    .where(eq(uploadJobs.id, payload.uploadJobId));

  const fileErrors: UploadJobErrorDetail[] = [];

  try {
    const directory = await unzipper.Open.s3_v3(getR2Client(), {
      Bucket: getR2BucketName(),
      Key: payload.storageKey,
    });

    type AudioEntry = unzipper.File;
    const audioEntries: AudioEntry[] = [];
    const incompatibleNames: string[] = [];

    for (const f of directory.files) {
      if (f.type !== "File") continue;
      const kind = classifyZipEntry(f.path);
      if (kind === "junk" || kind === "non_audio") continue;
      if (kind === "ultimate_only_audio" && !allowUltimate) {
        incompatibleNames.push(f.path.split(/[/\\]/).pop() ?? f.path);
        continue;
      }
      audioEntries.push(f);
    }

    if (incompatibleNames.length > 0) {
      const msg = zipIncompatibleFormatsErrorMessage(incompatibleNames);
      const details: UploadJobErrorDetail[] = incompatibleNames.map((name) => ({
        filename: name,
        reason: "Format not allowed on your plan.",
      }));
      await failUploadJobTerminal(
        payload.uploadJobId,
        msg,
        details,
        payload.storageKey,
        log
      );
      throw new UnrecoverableError("incompatible formats in zip");
    }

    await db
      .update(uploadJobs)
      .set({ totalFilesInArchive: audioEntries.length })
      .where(eq(uploadJobs.id, payload.uploadJobId));

    const [existingCountRow] = await db
      .select({ n: count() })
      .from(audioFiles)
      .where(
        and(
          eq(audioFiles.eventId, payload.eventId),
          isNull(audioFiles.deletedAt)
        )
      );
    const existingFilesCount = Number(existingCountRow?.n ?? 0);
    const zipAudioCount = audioEntries.length;

    if (
      planLimit !== null &&
      existingFilesCount + zipAudioCount > planLimit
    ) {
      const msg = `Upload would exceed your plan's limit of ${planLimit} files per event. This event has ${existingFilesCount} files already; the zip contains ${zipAudioCount} audio files. Either delete some existing files or upgrade your plan.`;
      await failUploadJobTerminal(
        payload.uploadJobId,
        msg,
        null,
        payload.storageKey,
        log
      );
      throw new UnrecoverableError("plan file limit exceeded");
    }

    for (const entry of audioEntries) {
      if (entry.uncompressedSize > MAX_UPLOAD_BYTES) {
        const name = entry.path.split(/[/\\]/).pop() ?? entry.path;
        const msg = `Zip contains an audio file over 100 MB: ${name}`;
        await failUploadJobTerminal(
          payload.uploadJobId,
          msg,
          [{ filename: name, reason: "Exceeds 100 MB limit." }],
          payload.storageKey,
          log
        );
        throw new UnrecoverableError("oversized zip entry");
      }
    }

    const [maxOrderRow] = await db
      .select({ m: max(audioFiles.displayOrder) })
      .from(audioFiles)
      .where(
        and(
          eq(audioFiles.eventId, payload.eventId),
          isNull(audioFiles.deletedAt)
        )
      );
    let nextDisplayOrder = Number(maxOrderRow?.m ?? -1) + 1;

    const keyPrefix = zipObjectPrefix({
      companyId: payload.companyId,
      eventId: payload.eventId,
      uploadJobId: payload.uploadJobId,
    });

    let idx = 0;
    for (const entry of audioEntries) {
      idx += 1;
      const basename = entry.path.split(/[/\\]/).pop() ?? entry.path;
      const storageKey = storageKeyForZipEntry({
        companyId: payload.companyId,
        eventId: payload.eventId,
        uploadJobId: payload.uploadJobId,
        pathInZip: entry.path,
      });

      const existing = await db.query.audioFiles.findFirst({
        where: and(
          eq(audioFiles.eventId, payload.eventId),
          eq(audioFiles.storageKey, storageKey),
          isNull(audioFiles.deletedAt)
        ),
      });

      if (existing?.uploadedAt) {
        await db
          .update(uploadJobs)
          .set({ filesProcessed: idx })
          .where(eq(uploadJobs.id, payload.uploadJobId));
        continue;
      }

      const originalFilename = await resolveUniqueOriginalFilename(
        payload.eventId,
        basename.slice(0, 500)
      );
      const mimeType = mimeForPath(entry.path);

      try {
        const bodyStream = entry.stream();
        const upload = new Upload({
          client: getR2Client(),
          params: {
            Bucket: getR2BucketName(),
            Key: storageKey,
            Body: bodyStream,
            ContentType: mimeType,
          },
        });
        await upload.done();

        await db.insert(audioFiles).values({
          eventId: payload.eventId,
          originalFilename,
          storageKey,
          mimeType,
          sizeBytes: Number(entry.uncompressedSize),
          displayOrder: nextDisplayOrder,
          uploadedAt: new Date(),
        });
        nextDisplayOrder += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        fileErrors.push({
          filename: basename,
          reason: msg,
        });
      }

      await db
        .update(uploadJobs)
        .set({ filesProcessed: idx })
        .where(eq(uploadJobs.id, payload.uploadJobId));
    }

    const [succRow] = await db
      .select({ n: count() })
      .from(audioFiles)
      .where(
        and(
          eq(audioFiles.eventId, payload.eventId),
          isNull(audioFiles.deletedAt),
          like(audioFiles.storageKey, `${keyPrefix}%`)
        )
      );
    const succCount = Number(succRow?.n ?? 0);
    const failCount = fileErrors.length;

    let terminalStatus: "succeeded" | "failed" | "partial" = "succeeded";
    if (failCount > 0 && succCount === 0) {
      terminalStatus = "failed";
    } else if (failCount > 0) {
      terminalStatus = "partial";
    }

    const finalMessage =
      terminalStatus === "partial"
        ? "Some files in the archive could not be processed."
        : terminalStatus === "failed" && fileErrors.length > 0
          ? "All audio entries in the archive failed to process."
          : null;

    await db
      .update(uploadJobs)
      .set({
        status: terminalStatus,
        completedAt: new Date(),
        filesProcessed: audioEntries.length,
        filesSucceeded: succCount,
        filesFailed: failCount,
        errorMessage: finalMessage,
        errorDetails: fileErrors.length > 0 ? fileErrors : null,
      })
      .where(eq(uploadJobs.id, payload.uploadJobId));

    await safeDeleteZipArchive(payload.storageKey, log);

    log.info(
      {
        jobId: payload.uploadJobId,
        eventId: payload.eventId,
        status: terminalStatus,
        durationMs: Date.now() - start,
        filesSucceeded: succCount,
        filesFailed: failCount,
        totalAudio: audioEntries.length,
      },
      "extract-zip job end"
    );
  } catch (e) {
    if (e instanceof UnrecoverableError) {
      throw e;
    }
    log.error(
      { err: e, uploadJobId: payload.uploadJobId },
      "extract-zip transient error (will retry if attempts remain)"
    );
    throw e;
  }
}

/** Mark job failed when BullMQ exhausts retries (DB may still show processing). */
export async function markUploadJobFailedFromWorkerError(
  uploadJobId: string,
  err: Error,
  log: Logger
): Promise<void> {
  const db = getWorkerDb();
  const msg = err.message || String(err);
  const [updated] = await db
    .update(uploadJobs)
    .set({
      status: "failed",
      errorMessage: msg,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(uploadJobs.id, uploadJobId),
        isNull(uploadJobs.completedAt)
      )
    )
    .returning({ id: uploadJobs.id, storageKey: uploadJobs.storageKey });
  if (updated) {
    log.warn({ jobId: uploadJobId, err: msg }, "marked upload job failed after retries");
    await safeDeleteZipArchive(updated.storageKey, log);
  }
}
