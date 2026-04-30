import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { and, eq, isNull, or } from "drizzle-orm";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import type { Logger } from "pino";

import type { TranscodeAudioJobPayload } from "@/lib/queue";
import { deleteObject, getR2BucketName, getR2Client } from "@/lib/r2";
import { audioFiles } from "@/db/schema";

import { getWorkerDb } from "../db";

/**
 * `ffmpeg-static` is CJS; the default export is the absolute path to a
 * platform-specific FFmpeg binary bundled with the package, or `null` if no
 * binary exists for the current platform/arch (e.g. unsupported musl build).
 *
 * Production previously relied on `FFMPEG_PATH` / a system `ffmpeg` install,
 * which broke on Railway with `spawn /usr/bin/ffmpeg ENOENT`. We now bundle
 * the binary so transcoding has zero runtime system dependencies.
 */
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.warn(
    "[transcode-audio] ffmpeg-static did not resolve a binary path for this " +
      "platform; transcoding will fail until an FFmpeg binary is available."
  );
}

function mp3DisplayName(originalFilename: string): string {
  const trimmed = originalFilename.trim() || "recording";
  const m = /^(.+?)(\.[^.]+)$/i.exec(trimmed);
  const stemRaw = m?.[1] ?? trimmed.replace(/\.[^.]+$/, "");
  const stem = stemRaw || trimmed;
  return `${stem}.mp3`;
}

export async function processTranscodeAudioJob(
  payload: TranscodeAudioJobPayload,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const db = getWorkerDb();
  const claimed = await db
    .update(audioFiles)
    .set({
      transcodingStatus: "processing",
      transcodingError: null,
    })
    .where(
      and(
        eq(audioFiles.id, payload.audioFileId),
        eq(audioFiles.isOriginal, true),
        or(
          eq(audioFiles.transcodingStatus, "pending"),
          eq(audioFiles.transcodingStatus, "failed")
        ),
        isNull(audioFiles.deletedAt)
      )
    )
    .returning({
      id: audioFiles.id,
      eventId: audioFiles.eventId,
      storageKey: audioFiles.storageKey,
      originalFilename: audioFiles.originalFilename,
      displayOrder: audioFiles.displayOrder,
    });

  const originalRow = claimed[0];
  if (!originalRow) {
    log.info(
      { audioFileId: payload.audioFileId },
      "transcode skip: not claimable"
    );
    return;
  }

  const orphans = await db.query.audioFiles.findMany({
    where: and(
      eq(audioFiles.derivedFromId, originalRow.id),
      isNull(audioFiles.deletedAt)
    ),
  });

  for (const o of orphans) {
    try {
      await deleteObject(o.storageKey);
    } catch (err) {
      log.warn({ err, key: o.storageKey }, "transcode: orphan r2 delete failed");
    }
    await db.delete(audioFiles).where(eq(audioFiles.id, o.id));
  }

  let tempDir: string | null = null;
  try {
    tempDir = await mkdtemp(path.join(tmpdir(), "agb-transcode-"));
    const inPath = path.join(tempDir, "source");
    const outPath = path.join(tempDir, "out.mp3");

    const s3 = getR2Client();
    const bucket = getR2BucketName();
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: originalRow.storageKey,
      })
    );
    const body = obj.Body;
    if (!body) {
      throw new Error("Empty R2 response body");
    }

    await pipeline(body as AsyncIterable<Uint8Array>, createWriteStream(inPath));

    let stderrCaptured = "";

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(inPath)
        .audioChannels(2)
        .audioCodec("libmp3lame")
        .audioBitrate(192);
      cmd.on("stderr", (line: string) => {
        stderrCaptured += `${line}\n`;
      });
      cmd.on("end", () => resolve());
      // fluent-ffmpeg's `.on()` overloads omit `error` for this fluent stage
      (
        cmd as unknown as {
          on(
            e: "error",
            cb: (err: Error, stdout?: unknown, stderr?: unknown) => void
          ): void;
        }
      ).on(
        "error",
        (err: Error, _stdout?: unknown, stderr?: unknown) => {
          const stderrStr =
            typeof stderr === "string"
              ? stderr
              : Array.isArray(stderr)
                ? stderr.join("\n")
                : typeof stderr === "object" && stderr != null
                  ? JSON.stringify(stderr)
                  : "";
          stderrCaptured += stderrStr;
          log.warn(
            { err: err.message, stderr: stderrCaptured.slice(0, 4000) },
            "ffmpeg error"
          );
          reject(Object.assign(err, { stderrCombined: stderrCaptured }));
        }
      );
      cmd.save(outPath);
    });

    const outKey = `${payload.companyId}/${payload.eventId}/${randomUUID()}-transcoded.mp3`;
    const mp3Buf = await readFile(outPath);

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: outKey,
        Body: mp3Buf,
        ContentType: "audio/mpeg",
      },
    });
    await upload.done();

    const mp3Name = mp3DisplayName(originalRow.originalFilename);

    await db.transaction(async (tx) => {
      await tx.insert(audioFiles).values({
        eventId: originalRow.eventId,
        originalFilename: mp3Name,
        storageKey: outKey,
        mimeType: "audio/mpeg",
        sizeBytes: mp3Buf.length,
        displayOrder: originalRow.displayOrder,
        uploadedAt: new Date(),
        isOriginal: false,
        derivedFromId: originalRow.id,
        transcodingStatus: "not_needed",
      });

      await tx
        .update(audioFiles)
        .set({
          transcodingStatus: "succeeded",
          transcodingError: null,
        })
        .where(eq(audioFiles.id, originalRow.id));
    });

    log.info(
      { audioFileId: originalRow.id, eventId: payload.eventId },
      "transcode: succeeded"
    );
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderrCombined" in err
        ? String((err as { stderrCombined?: string }).stderrCombined)
        : "";
    const msg = err instanceof Error ? err.message : String(err);
    const combined =
      stderr.length > 0 ? `${msg}\n---\n${stderr}`.slice(0, 2000) : msg.slice(0, 2000);

    await db
      .update(audioFiles)
      .set({
        transcodingStatus: "failed",
        transcodingError: combined,
      })
      .where(eq(audioFiles.id, originalRow.id));

    log.warn(
      { err: combined, audioFileId: originalRow.id },
      "transcode: failed (original marked failed)"
    );
  } finally {
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
