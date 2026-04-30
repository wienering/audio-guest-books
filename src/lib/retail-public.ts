import "server-only";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles, companies, events } from "@/db/schema";
import { presignGetUrl } from "@/lib/r2";

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

export async function buildRetailPublicPayload(event: {
  id: string;
  name: string;
  retailClientName: string;
  eventDate: Date;
  audioFiles: Array<{
    id: string;
    originalFilename: string;
    storageKey: string;
    durationSeconds: number | null;
  }>;
}): Promise<RetailPublicEventPayload> {
  const files: RetailPublicAudioFile[] = [];
  for (const f of event.audioFiles) {
    const playbackUrl = await presignGetUrl({ key: f.storageKey });
    files.push({
      id: f.id,
      originalFilename: f.originalFilename,
      durationSeconds: f.durationSeconds,
      playbackUrl,
    });
  }

  return {
    eventName: event.name,
    retailClientName: event.retailClientName,
    eventDateIso: event.eventDate.toISOString().slice(0, 10),
    files,
  };
}

export function formatRetailEventDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function sanitizeZipBaseName(name: string): string {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "Guest-book";
}
