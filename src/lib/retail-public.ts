import "server-only";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles, companies, events } from "@/db/schema";
import { presignGetUrl } from "@/lib/r2";
import { bulkZipUsesSyncPath } from "@/lib/bulk-zip-policy";

import type { RetailBulkZip } from "@/lib/retail-types";

export { formatRetailEventDate } from "@/lib/format-retail-event-date";

export type RetailResolveError = "company_not_found" | "event_not_found";

export type RetailPublicAudioFile = {
  id: string;
  originalFilename: string;
  durationSeconds: number | null;
  playbackUrl: string;
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
    audioFiles: Array<{
      id: string;
      originalFilename: string;
      storageKey: string;
      durationSeconds: number | null;
      sizeBytes: number;
    }>;
  },
  slugs: { companySlug: string; clientSlug: string }
): Promise<RetailPublicEventPayload> {
  const recordingFilesAvailable = event.metadataOnlyAfter == null;
  const apiSeg = `/api/retail/${encodeURIComponent(slugs.companySlug)}/${encodeURIComponent(slugs.clientSlug)}`;

  const files: RetailPublicAudioFile[] = [];
  if (recordingFilesAvailable) {
    for (const f of event.audioFiles) {
      const playbackUrl = await presignGetUrl({ key: f.storageKey });
      files.push({
        id: f.id,
        originalFilename: f.originalFilename,
        durationSeconds: f.durationSeconds,
        playbackUrl,
      });
    }
  }

  let bulkZip: RetailPublicEventPayload["bulkZip"] = null;
  if (recordingFilesAvailable && event.audioFiles.length > 0) {
    if (bulkZipUsesSyncPath(event.audioFiles)) {
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
