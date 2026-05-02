import "server-only";

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles, events, fileReactions } from "@/db/schema";
import {
  emptyReactionCounts,
  type FileReactionCounts,
  type FileReactionType,
} from "@/lib/file-reaction-types";

export async function fetchReactionCountsByFileIds(
  fileIds: string[]
): Promise<Map<string, FileReactionCounts>> {
  const map = new Map<string, FileReactionCounts>();
  for (const id of fileIds) {
    map.set(id, emptyReactionCounts());
  }
  if (fileIds.length === 0) return map;

  const rows = await db
    .select({
      fileId: fileReactions.fileId,
      reactionType: fileReactions.reactionType,
      count: fileReactions.count,
    })
    .from(fileReactions)
    .where(inArray(fileReactions.fileId, fileIds));

  for (const r of rows) {
    const cur = map.get(r.fileId);
    if (!cur) continue;
    cur[r.reactionType as FileReactionType] = r.count;
  }
  return map;
}

export async function fetchReactionCountsForSingleFile(
  fileId: string
): Promise<FileReactionCounts> {
  const rows = await db
    .select({
      reactionType: fileReactions.reactionType,
      count: fileReactions.count,
    })
    .from(fileReactions)
    .where(eq(fileReactions.fileId, fileId));

  const out = emptyReactionCounts();
  for (const r of rows) {
    out[r.reactionType as FileReactionType] = r.count;
  }
  return out;
}

/** Row shape for validating POST /api/files/[id]/reactions (public retail guest). */
export async function getAudioFileWithEventForReaction(fileId: string) {
  const [row] = await db
    .select({
      fileId: audioFiles.id,
      eventId: audioFiles.eventId,
      fileDeletedAt: audioFiles.deletedAt,
      fileUploadedAt: audioFiles.uploadedAt,
      eventDeletedAt: events.deletedAt,
      metadataOnlyAfter: events.metadataOnlyAfter,
      passwordHash: events.passwordHash,
    })
    .from(audioFiles)
    .innerJoin(events, eq(audioFiles.eventId, events.id))
    .where(
      and(
        eq(audioFiles.id, fileId),
        isNull(audioFiles.deletedAt),
        isNotNull(audioFiles.uploadedAt),
        isNull(events.deletedAt)
      )
    )
    .limit(1);

  return row ?? null;
}
