import type { InferSelectModel } from "drizzle-orm";

import { audioFiles } from "@/db/schema";

export type DbAudioFileRow = InferSelectModel<typeof audioFiles>;

/** One logical recording on retail: streamed file + optional underlying original WAV/FLAC/AIFF. */
export type RetailLogicalFilePick = {
  playbackRow: DbAudioFileRow;
  /** Present when playbackRow is transcoded MP3 and original retained */
  losslessOriginal: DbAudioFileRow | null;
};

/** Zip uses this storage blob and this filename inside the archive. */
export type ZipIncludedFilePick = Pick<
  DbAudioFileRow,
  "storageKey" | "originalFilename" | "sizeBytes"
>;

export function sortAudioRowsForPlayback(
  rows: DbAudioFileRow[]
): DbAudioFileRow[] {
  return [...rows].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    const ta = a.uploadedAt?.getTime() ?? 0;
    const tb = b.uploadedAt?.getTime() ?? 0;
    return ta - tb;
  });
}

/** Only rows that participate in playlists (omit soft-deleted, require upload finalized). */
export function filterActiveUploadedRows(rows: DbAudioFileRow[]): DbAudioFileRow[] {
  return rows.filter(
    (r) => r.deletedAt == null && r.uploadedAt != null && r.mimeType !== ""
  );
}

/**
 * One entry per logical source file (`is_original` row).
 * Prefer succeeded transcoded MP3 for streaming/downloads; fallback to raw original.
 */
export function getRetailPlaybackPicks(rows: DbAudioFileRow[]): RetailLogicalFilePick[] {
  const active = filterActiveUploadedRows(sortAudioRowsForPlayback(rows));
  const byId = new Map(active.map((r) => [r.id, r]));
  const originals = active.filter((r) => r.isOriginal);
  const bestDerivedByOriginal = new Map<string, DbAudioFileRow>();

  for (const r of active) {
    if (r.isOriginal || !r.derivedFromId) continue;
    const parent = byId.get(r.derivedFromId);
    if (!parent?.isOriginal) continue;
    if (parent.transcodingStatus !== "succeeded") continue;
    if (r.mimeType !== "audio/mpeg") continue;
    bestDerivedByOriginal.set(parent.id, r);
  }

  return originals.map((orig) => {
    const transcoded = bestDerivedByOriginal.get(orig.id);

    const useMp3 =
      transcoded !== undefined && orig.transcodingStatus === "succeeded";

    if (useMp3) {
      return { playbackRow: transcoded!, losslessOriginal: orig };
    }

    return { playbackRow: orig, losslessOriginal: null };
  });
}

/** Physical files appended to retailer / worker zip archives. */
export function getZipIncludedFilePicks(
  rows: DbAudioFileRow[]
): ZipIncludedFilePick[] {
  return getRetailPlaybackPicks(rows).map(({ playbackRow }) => ({
    storageKey: playbackRow.storageKey,
    originalFilename: playbackRow.originalFilename,
    sizeBytes: playbackRow.sizeBytes,
  }));
}
