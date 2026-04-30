import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles } from "@/db/schema";

export async function getUploadedAudioFileForEvent(
  eventId: string,
  fileId: string
) {
  return db.query.audioFiles.findFirst({
    where: and(
      eq(audioFiles.id, fileId),
      eq(audioFiles.eventId, eventId),
      isNull(audioFiles.deletedAt),
      isNotNull(audioFiles.uploadedAt)
    ),
  });
}
