import "server-only";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles, companies, events } from "@/db/schema";
import { bulkZipUsesSyncPath } from "@/lib/bulk-zip-policy";
import type { DbAudioFileRow } from "@/lib/display-audio-files";
import { getRetailPlaybackPicks } from "@/lib/display-audio-files";
import { presignGetUrl } from "@/lib/r2";

import type { RetailBulkZip } from "@/lib/retail-types";
import type { FileReactionCounts } from "@/lib/file-reaction-types";
import { emptyReactionCounts } from "@/lib/file-reaction-types";
import { fetchReactionCountsByFileIds } from "@/lib/file-reactions-db";

export { formatRetailEventDate } from "@/lib/format-retail-event-date";

export type RetailResolveError = "company_not_found" | "event_not_found";

export type RetailPublicAudioFile = {
  id: string;
  originalFilename: string;
  durationSeconds: number | null;
  playbackUrl: string;
  /** When MP3 is transcoded from lossless, link retail download to this id */
  losslessOriginalFileId: string | null;
  /** ISO timestamp for client-side sort (newest/oldest) */
  uploadedAtIso: string;
  reactions: FileReactionCounts;
};

export type RetailPublicEventPayload = {
  eventName: string;
  retailClientName: string;
  /** ISO date yyyy-mm-dd */
  eventDateIso: string;
  files: RetailPublicAudioFile[];
  recordingFilesAvailable: boolean;
  bulkZip: RetailBulkZip | null;
};

export async function resolveRetailEventForSlugs(
  companySlug: string,
  clientSlug: string
) {
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.slug, companySlug), isNull(companies.deletedAt)),
  });
  if (!company) {
    return { error: "company_not_found" as const };
  }

  const event = await db.query.events.findFirst({
    where: and(
      eq(events.companyId, company.id),
      eq(events.retailClientSlug, clientSlug),
      isNull(events.deletedAt)
    ),
    with: {
      audioFiles: {
        where: and(isNull(audioFiles.deletedAt), isNotNull(audioFiles.uploadedAt)),
        orderBy: [asc(audioFiles.displayOrder), asc(audioFiles.uploadedAt)],
      },
    },
  });

  if (!event) {
    return { error: "event_not_found" as const };
  }

  return { company, event };
}

export async function buildRetailPublicPayload(
  event: {
    id: string;
    name: string;
    retailClientName: string;
    eventDate: Date;
    metadataOnlyAfter: Date | null;
    audioFiles: DbAudioFileRow[];
  },
  slugs: { companySlug: string; clientSlug: string }
): Promise<RetailPublicEventPayload> {
  const recordingFilesAvailable = event.metadataOnlyAfter == null;
  const apiSeg = `/api/retail/${encodeURIComponent(slugs.companySlug)}/${encodeURIComponent(slugs.clientSlug)}`;

  const picks = getRetailPlaybackPicks(event.audioFiles);

  const retailFileIds = recordingFilesAvailable
    ? picks.map((p) => p.playbackRow.id)
    : [];
  const reactionMap = await fetchReactionCountsByFileIds(retailFileIds);

  const files: RetailPublicAudioFile[] = [];
  if (recordingFilesAvailable) {
    for (const pick of picks) {
      const f = pick.playbackRow;
      const playbackUrl = await presignGetUrl({ key: f.storageKey });
      files.push({
        id: f.id,
        originalFilename: f.originalFilename,
        durationSeconds: f.durationSeconds,
        playbackUrl,
        losslessOriginalFileId: pick.losslessOriginal?.id ?? null,
        uploadedAtIso: f.uploadedAt!.toISOString(),
        reactions: reactionMap.get(f.id) ?? emptyReactionCounts(),
      });
    }
  }

  let bulkZip: RetailPublicEventPayload["bulkZip"] = null;
  const zipMetrics = picks.map((p) => ({
    sizeBytes: p.playbackRow.sizeBytes,
  }));
  if (recordingFilesAvailable && zipMetrics.length > 0) {
    if (bulkZipUsesSyncPath(zipMetrics)) {
      bulkZip = { mode: "sync", zipUrl: `${apiSeg}/zip` };
    } else {
      bulkZip = {
        mode: "async",
        zipRequestUrl: `${apiSeg}/zip-request`,
        zipStatusUrl: `${apiSeg}/zip-status`,
      };
    }
  }

  return {
    eventName: event.name,
    retailClientName: event.retailClientName,
    eventDateIso: event.eventDate.toISOString().slice(0, 10),
    files,
    recordingFilesAvailable,
    bulkZip,
  };
}

export function sanitizeZipBaseName(name: string): string {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "Guest-book";
}
