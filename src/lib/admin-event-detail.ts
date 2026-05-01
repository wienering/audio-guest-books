import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/index";
import {
  adminAuditLog,
  audioFiles,
  companies,
  eventAnalyticsEvents,
  events,
} from "@/db/schema";

export type AdminEventDetailFile = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
  isOriginal: boolean;
  transcodingStatus:
    | "not_needed"
    | "pending"
    | "processing"
    | "succeeded"
    | "failed";
  uploadedAt: string | null;
  deletedAt: string | null;
};

export type AdminEventDetailAnalyticsSummary = {
  pageViews: number;
  filePlays: number;
  fileDownloads: number;
  zipDownloads: number;
  uniqueIps: number;
  lastSeenAt: string | null;
};

export type AdminEventDetailAuditRow = {
  id: string;
  adminClerkUserId: string;
  actionType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminEventDetail = {
  company: {
    id: string;
    slug: string;
    name: string;
  };
  event: {
    id: string;
    name: string;
    eventType:
      | "wedding"
      | "birthday"
      | "corporate"
      | "anniversary"
      | "other";
    eventTypeOther: string | null;
    eventDate: string;
    retailClientName: string;
    retailClientEmail: string;
    retailClientSlug: string;
    passwordActive: boolean;
    passwordSetAt: string | null;
    coverImageStorageKey: string | null;
    retentionUntil: string;
    metadataOnlyAfter: string | null;
    deletedAt: string | null;
    hardDeleteAfter: string | null;
    createdAt: string;
    updatedAt: string;
  };
  files: AdminEventDetailFile[];
  totalFiles: number;
  totalStorageBytes: number;
  analytics: AdminEventDetailAnalyticsSummary;
  adminAudit: AdminEventDetailAuditRow[];
};

function dateToIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export async function getAdminEventDetail(
  companySlug: string,
  eventId: string
): Promise<AdminEventDetail | null> {
  const [companyRow] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, companySlug))
    .limit(1);
  if (!companyRow) return null;

  const eventRow = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.companyId, companyRow.id)),
  });
  if (!eventRow) return null;

  const [fileRows, analyticsRow, auditRows, fileAggregateRow] =
    await Promise.all([
      db
        .select({
          id: audioFiles.id,
          originalFilename: audioFiles.originalFilename,
          sizeBytes: audioFiles.sizeBytes,
          mimeType: audioFiles.mimeType,
          durationSeconds: audioFiles.durationSeconds,
          isOriginal: audioFiles.isOriginal,
          transcodingStatus: audioFiles.transcodingStatus,
          uploadedAt: audioFiles.uploadedAt,
          deletedAt: audioFiles.deletedAt,
        })
        .from(audioFiles)
        .where(eq(audioFiles.eventId, eventId))
        .orderBy(asc(audioFiles.displayOrder)),
      db
        .select({
          pageViews: sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} = 'page_view' THEN 1 ELSE 0 END)::int, 0)`,
          filePlays: sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} = 'file_play' THEN 1 ELSE 0 END)::int, 0)`,
          fileDownloads: sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} = 'file_download' THEN 1 ELSE 0 END)::int, 0)`,
          zipDownloads: sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} = 'zip_download' THEN 1 ELSE 0 END)::int, 0)`,
          uniqueIps: sql<number>`COALESCE(COUNT(DISTINCT ${eventAnalyticsEvents.ipHash})::int, 0)`,
          lastSeenAt: sql<Date | string | null>`MAX(${eventAnalyticsEvents.createdAt})`,
        })
        .from(eventAnalyticsEvents)
        .where(eq(eventAnalyticsEvents.eventId, eventId)),
      db
        .select()
        .from(adminAuditLog)
        .where(
          sql`${adminAuditLog.metadata}->>'event_id' = ${eventId}`
        )
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(20),
      db
        .select({
          totalFiles: sql<number>`COALESCE(COUNT(*)::int, 0)`,
          totalStorageBytes: sql<number>`COALESCE(SUM(${audioFiles.sizeBytes})::bigint, 0)`,
        })
        .from(audioFiles)
        .where(
          and(eq(audioFiles.eventId, eventId), isNull(audioFiles.deletedAt))
        ),
    ]);

  const a = analyticsRow[0];
  const fa = fileAggregateRow[0];

  return {
    company: {
      id: companyRow.id,
      slug: companyRow.slug,
      name: companyRow.name,
    },
    event: {
      id: eventRow.id,
      name: eventRow.name,
      eventType: eventRow.eventType,
      eventTypeOther: eventRow.eventTypeOther,
      eventDate: dateOnly(eventRow.eventDate) ?? "",
      retailClientName: eventRow.retailClientName,
      retailClientEmail: eventRow.retailClientEmail,
      retailClientSlug: eventRow.retailClientSlug,
      passwordActive: !!eventRow.passwordHash?.trim(),
      passwordSetAt: dateToIsoOrNull(eventRow.passwordSetAt),
      coverImageStorageKey: eventRow.coverImageStorageKey,
      retentionUntil: dateOnly(eventRow.retentionUntil) ?? "",
      metadataOnlyAfter: dateOnly(eventRow.metadataOnlyAfter),
      deletedAt: dateToIsoOrNull(eventRow.deletedAt),
      hardDeleteAfter: dateOnly(eventRow.hardDeleteAfter),
      createdAt: dateToIsoOrNull(eventRow.createdAt) ?? "",
      updatedAt: dateToIsoOrNull(eventRow.updatedAt) ?? "",
    },
    files: fileRows.map((f) => ({
      id: f.id,
      originalFilename: f.originalFilename,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      durationSeconds: f.durationSeconds,
      isOriginal: f.isOriginal,
      transcodingStatus: f.transcodingStatus,
      uploadedAt: dateToIsoOrNull(f.uploadedAt),
      deletedAt: dateToIsoOrNull(f.deletedAt),
    })),
    totalFiles: Number(fa?.totalFiles ?? 0),
    totalStorageBytes: Number(fa?.totalStorageBytes ?? 0),
    analytics: {
      pageViews: Number(a?.pageViews ?? 0),
      filePlays: Number(a?.filePlays ?? 0),
      fileDownloads: Number(a?.fileDownloads ?? 0),
      zipDownloads: Number(a?.zipDownloads ?? 0),
      uniqueIps: Number(a?.uniqueIps ?? 0),
      lastSeenAt:
        a?.lastSeenAt
          ? new Date(
              a.lastSeenAt instanceof Date
                ? a.lastSeenAt.getTime()
                : (a.lastSeenAt as string)
            ).toISOString()
          : null,
    },
    adminAudit: auditRows.map((r) => ({
      id: r.id,
      adminClerkUserId: r.adminClerkUserId,
      actionType: r.actionType,
      description: r.description,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
