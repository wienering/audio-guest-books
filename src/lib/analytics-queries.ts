import "server-only";

import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";

import { db } from "@/db/index";
import {
  audioFiles,
  eventAnalyticsEvents,
  events,
} from "@/db/schema";

import type { AnalyticsTimeRange } from "@/lib/analytics-range";
import { formatUserAgentShort } from "@/lib/format-user-agent";

function timeFilter(start: Date | null, endExclusive: Date | null) {
  const parts = [];
  if (start) parts.push(gte(eventAnalyticsEvents.createdAt, start));
  if (endExclusive) parts.push(lt(eventAnalyticsEvents.createdAt, endExclusive));
  return parts.length ? and(...parts) : undefined;
}

/** MAX(timestamp) from SQL often arrives as a string via the driver despite schema types. */
function sqlTimestampToIso(value: unknown): string | null {
  if (value == null) return null;
  const d =
    value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function truncateIpHash(h: string | null): string | null {
  if (!h) return null;
  if (h.length <= 10) return `${h.slice(0, 4)}…`;
  return `${h.slice(0, 8)}…`;
}

export type EventAnalyticsSummary = {
  pageViews: number;
  uniqueVisitors: number;
  filePlays: number;
  fileDownloads: number;
  zipDownloads: number;
};

export async function fetchEventAnalyticsSummary(
  eventId: string,
  range: AnalyticsTimeRange
): Promise<EventAnalyticsSummary> {
  const tf = timeFilter(range.start, range.endExclusive);
  const base = and(eq(eventAnalyticsEvents.eventId, eventId), tf);

  const [[pv], [uv], [play], [dl], [zip]] = await Promise.all([
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .where(and(base, eq(eventAnalyticsEvents.eventType, "page_view"))),
    db
      .select({ n: countDistinct(eventAnalyticsEvents.ipHash) })
      .from(eventAnalyticsEvents)
      .where(and(base, isNotNull(eventAnalyticsEvents.ipHash))),
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .where(and(base, eq(eventAnalyticsEvents.eventType, "file_play"))),
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .where(and(base, eq(eventAnalyticsEvents.eventType, "file_download"))),
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .where(and(base, eq(eventAnalyticsEvents.eventType, "zip_download"))),
  ]);

  return {
    pageViews: Number(pv?.n ?? 0),
    uniqueVisitors: Number(uv?.n ?? 0),
    filePlays: Number(play?.n ?? 0),
    fileDownloads: Number(dl?.n ?? 0),
    zipDownloads: Number(zip?.n ?? 0),
  };
}

export type FileCountRow = {
  audioFileId: string | null;
  n: number;
};

export async function fetchEventTopFileCounts(
  eventId: string,
  range: AnalyticsTimeRange,
  eventType: "file_play" | "file_download",
  limit: number
): Promise<FileCountRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);
  return db
    .select({
      audioFileId: eventAnalyticsEvents.audioFileId,
      n: count(),
    })
    .from(eventAnalyticsEvents)
    .where(
      and(
        eq(eventAnalyticsEvents.eventId, eventId),
        eq(eventAnalyticsEvents.eventType, eventType),
        isNotNull(eventAnalyticsEvents.audioFileId),
        tf
      )
    )
    .groupBy(eventAnalyticsEvents.audioFileId)
    .orderBy(desc(count()))
    .limit(limit);
}

export type EventFileStatsRow = {
  audioFileId: string;
  filename: string;
  plays: number;
  downloads: number;
};

export async function fetchEventPerFileStats(
  eventId: string,
  range: AnalyticsTimeRange
): Promise<EventFileStatsRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);

  const files = await db.query.audioFiles.findMany({
    where: and(
      eq(audioFiles.eventId, eventId),
      isNull(audioFiles.deletedAt),
      isNotNull(audioFiles.uploadedAt),
      eq(audioFiles.isOriginal, true)
    ),
    columns: { id: true, originalFilename: true, displayOrder: true },
    orderBy: (t, { asc }) => [asc(t.displayOrder)],
  });

  const [playRows, dlRows] = await Promise.all([
    db
      .select({
        id: eventAnalyticsEvents.audioFileId,
        n: count(),
      })
      .from(eventAnalyticsEvents)
      .where(
        and(
          eq(eventAnalyticsEvents.eventId, eventId),
          eq(eventAnalyticsEvents.eventType, "file_play"),
          isNotNull(eventAnalyticsEvents.audioFileId),
          tf
        )
      )
      .groupBy(eventAnalyticsEvents.audioFileId),
    db
      .select({
        id: eventAnalyticsEvents.audioFileId,
        n: count(),
      })
      .from(eventAnalyticsEvents)
      .where(
        and(
          eq(eventAnalyticsEvents.eventId, eventId),
          eq(eventAnalyticsEvents.eventType, "file_download"),
          isNotNull(eventAnalyticsEvents.audioFileId),
          tf
        )
      )
      .groupBy(eventAnalyticsEvents.audioFileId),
  ]);

  const playMap = new Map(
    playRows
      .filter((r) => r.id)
      .map((r) => [r.id as string, Number(r.n)])
  );
  const dlMap = new Map(
    dlRows
      .filter((r) => r.id)
      .map((r) => [r.id as string, Number(r.n)])
  );

  return files.map((f) => ({
    audioFileId: f.id,
    filename: f.originalFilename,
    plays: playMap.get(f.id) ?? 0,
    downloads: dlMap.get(f.id) ?? 0,
  }));
}

export type DailySeriesRow = {
  day: string;
  pageViews: number;
  filePlays: number;
  fileDownloads: number;
};

export async function fetchEventDailySeries(
  eventId: string,
  range: AnalyticsTimeRange
): Promise<DailySeriesRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${eventAnalyticsEvents.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
      eventType: eventAnalyticsEvents.eventType,
      n: count(),
    })
    .from(eventAnalyticsEvents)
    .where(
      and(
        eq(eventAnalyticsEvents.eventId, eventId),
        tf,
        inArray(eventAnalyticsEvents.eventType, [
          "page_view",
          "file_play",
          "file_download",
        ])
      )
    )
    .groupBy(
      sql`date_trunc('day', ${eventAnalyticsEvents.createdAt} AT TIME ZONE 'UTC')`,
      eventAnalyticsEvents.eventType
    );

  const byDay = new Map<
    string,
    { pageViews: number; filePlays: number; fileDownloads: number }
  >();

  for (const r of rows) {
    const cur = byDay.get(r.day) ?? {
      pageViews: 0,
      filePlays: 0,
      fileDownloads: 0,
    };
    const k = Number(r.n);
    if (r.eventType === "page_view") cur.pageViews += k;
    else if (r.eventType === "file_play") cur.filePlays += k;
    else if (r.eventType === "file_download") cur.fileDownloads += k;
    byDay.set(r.day, cur);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }));
}

export type RecentActivityApiRow = {
  id: string;
  createdAt: string;
  eventType: string;
  summary: string;
  userAgentShort: string;
};

export async function fetchEventRecentActivity(
  eventId: string,
  range: AnalyticsTimeRange,
  limit: number
): Promise<RecentActivityApiRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);
  const rows = await db
    .select({
      id: eventAnalyticsEvents.id,
      createdAt: eventAnalyticsEvents.createdAt,
      eventType: eventAnalyticsEvents.eventType,
      ipHash: eventAnalyticsEvents.ipHash,
      userAgent: eventAnalyticsEvents.userAgent,
      audioFileId: eventAnalyticsEvents.audioFileId,
      filename: audioFiles.originalFilename,
    })
    .from(eventAnalyticsEvents)
    .leftJoin(
      audioFiles,
      eq(eventAnalyticsEvents.audioFileId, audioFiles.id)
    )
    .where(and(eq(eventAnalyticsEvents.eventId, eventId), tf))
    .orderBy(desc(eventAnalyticsEvents.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    eventType: r.eventType,
    summary: summarizeRow(r.eventType, r.filename, r.ipHash),
    userAgentShort: formatUserAgentShort(r.userAgent),
  }));
}

function summarizeRow(
  eventType: string,
  filename: string | null,
  ipHash: string | null
): string {
  const ip = truncateIpHash(ipHash);
  switch (eventType) {
    case "page_view":
      return ip ? `Page viewed · visitor ${ip}` : "Page viewed";
    case "file_play":
      return filename ? `Played “${filename}”` : "Played audio";
    case "file_download":
      return filename ? `Downloaded “${filename}”` : "Downloaded audio";
    case "zip_download":
      return "Downloaded zip archive";
    default:
      return eventType;
  }
}

/** ---------- Company-wide ---------- */

export type CompanyAnalyticsSummary = {
  totalEventsCreated: number;
  totalEventsActive: number;
  totalFilesUploaded: number;
  totalStorageBytes: number;
  totalPageViews: number;
  uniqueVisitors: number;
  totalDownloads: number;
};

export async function fetchCompanyAnalyticsSummary(
  companyId: string,
  range: AnalyticsTimeRange
): Promise<CompanyAnalyticsSummary> {
  const tfEvent = timeFilter(range.start, range.endExclusive);

  const eventWhere = and(eq(events.companyId, companyId), isNull(events.deletedAt));

  const [[createdRow], [activeRow], [filesRow], [storageRow]] =
    await Promise.all([
      db.select({ n: count() }).from(events).where(eventWhere),
      db
        .select({ n: count() })
        .from(events)
        .where(
          and(eventWhere, isNull(events.metadataOnlyAfter))
        ),
      db
        .select({ n: count() })
        .from(audioFiles)
        .innerJoin(events, eq(audioFiles.eventId, events.id))
        .where(
          and(
            eq(events.companyId, companyId),
            isNull(events.deletedAt),
            isNull(audioFiles.deletedAt),
            eq(audioFiles.isOriginal, true),
            isNotNull(audioFiles.uploadedAt)
          )
        ),
      db
        .select({
          s: sql<number>`COALESCE(SUM(${audioFiles.sizeBytes}), 0)::bigint`,
        })
        .from(audioFiles)
        .innerJoin(events, eq(audioFiles.eventId, events.id))
        .where(
          and(
            eq(events.companyId, companyId),
            isNull(events.deletedAt),
            isNull(audioFiles.deletedAt)
          )
        ),
    ]);

  const analyticsJoin = and(
    eq(eventAnalyticsEvents.eventId, events.id),
    eq(events.companyId, companyId),
    isNull(events.deletedAt),
    tfEvent
  );

  const [[pv], [uv], [dlFiles], [dlZip]] = await Promise.all([
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
      .where(
        and(analyticsJoin, eq(eventAnalyticsEvents.eventType, "page_view"))
      ),
    db
      .select({ n: countDistinct(eventAnalyticsEvents.ipHash) })
      .from(eventAnalyticsEvents)
      .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
      .where(and(analyticsJoin, isNotNull(eventAnalyticsEvents.ipHash))),
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
      .where(
        and(analyticsJoin, eq(eventAnalyticsEvents.eventType, "file_download"))
      ),
    db
      .select({ n: count() })
      .from(eventAnalyticsEvents)
      .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
      .where(
        and(analyticsJoin, eq(eventAnalyticsEvents.eventType, "zip_download"))
      ),
  ]);

  return {
    totalEventsCreated: Number(createdRow?.n ?? 0),
    totalEventsActive: Number(activeRow?.n ?? 0),
    totalFilesUploaded: Number(filesRow?.n ?? 0),
    totalStorageBytes: Number(storageRow?.s ?? 0),
    totalPageViews: Number(pv?.n ?? 0),
    uniqueVisitors: Number(uv?.n ?? 0),
    totalDownloads: Number(dlFiles?.n ?? 0) + Number(dlZip?.n ?? 0),
  };
}

export type CompanyTopEventRow = {
  eventId: string;
  eventName: string;
  retailClientName: string;
  pageViews: number;
  downloads: number;
  lastActivityAt: string | null;
};

export async function fetchCompanyTopEvents(
  companyId: string,
  range: AnalyticsTimeRange,
  limit = 500
): Promise<CompanyTopEventRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);

  const eventRows = await db
    .select({
      id: events.id,
      name: events.name,
      retailClientName: events.retailClientName,
    })
    .from(events)
    .where(and(eq(events.companyId, companyId), isNull(events.deletedAt)));

  const aggRows = await db
    .select({
      eventId: eventAnalyticsEvents.eventId,
      pageViews:
        sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} = 'page_view' THEN 1 ELSE 0 END), 0)::int`,
      downloads:
        sql<number>`COALESCE(SUM(CASE WHEN ${eventAnalyticsEvents.eventType} IN ('file_download', 'zip_download') THEN 1 ELSE 0 END), 0)::int`,
      lastActivity: sql<string | Date | null>`MAX(${eventAnalyticsEvents.createdAt})`,
    })
    .from(eventAnalyticsEvents)
    .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
    .where(and(eq(events.companyId, companyId), isNull(events.deletedAt), tf))
    .groupBy(eventAnalyticsEvents.eventId);

  const aggMap = new Map(
    aggRows.map((r) => [
      r.eventId,
      {
        pageViews: Number(r.pageViews),
        downloads: Number(r.downloads),
        lastActivity: r.lastActivity,
      },
    ])
  );

  const merged = eventRows.map((e) => {
    const a = aggMap.get(e.id);
    return {
      eventId: e.id,
      eventName: e.name,
      retailClientName: e.retailClientName,
      pageViews: a?.pageViews ?? 0,
      downloads: a?.downloads ?? 0,
      lastActivityAt: sqlTimestampToIso(a?.lastActivity),
    };
  });

  merged.sort((x, y) => {
    const ax = x.pageViews + x.downloads;
    const ay = y.pageViews + y.downloads;
    if (ay !== ax) return ay - ax;
    const tx = x.lastActivityAt ?? "";
    const ty = y.lastActivityAt ?? "";
    return ty.localeCompare(tx);
  });

  return merged.slice(0, limit);
}

export async function fetchCompanyDailySeries(
  companyId: string,
  range: AnalyticsTimeRange
): Promise<DailySeriesRow[]> {
  const tf = timeFilter(range.start, range.endExclusive);
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${eventAnalyticsEvents.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
      eventType: eventAnalyticsEvents.eventType,
      n: count(),
    })
    .from(eventAnalyticsEvents)
    .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
    .where(
      and(
        eq(events.companyId, companyId),
        isNull(events.deletedAt),
        tf,
        inArray(eventAnalyticsEvents.eventType, [
          "page_view",
          "file_play",
          "file_download",
        ])
      )
    )
    .groupBy(
      sql`date_trunc('day', ${eventAnalyticsEvents.createdAt} AT TIME ZONE 'UTC')`,
      eventAnalyticsEvents.eventType
    );

  const byDay = new Map<
    string,
    { pageViews: number; filePlays: number; fileDownloads: number }
  >();

  for (const r of rows) {
    const cur = byDay.get(r.day) ?? {
      pageViews: 0,
      filePlays: 0,
      fileDownloads: 0,
    };
    const k = Number(r.n);
    if (r.eventType === "page_view") cur.pageViews += k;
    else if (r.eventType === "file_play") cur.filePlays += k;
    else if (r.eventType === "file_download") cur.fileDownloads += k;
    byDay.set(r.day, cur);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }));
}

export async function fetchCompanyMaxOriginalFilesPerEvent(
  companyId: string
): Promise<number> {
  const rows = await db
    .select({
      n: count(),
    })
    .from(audioFiles)
    .innerJoin(events, eq(audioFiles.eventId, events.id))
    .where(
      and(
        eq(events.companyId, companyId),
        isNull(events.deletedAt),
        isNull(audioFiles.deletedAt),
        eq(audioFiles.isOriginal, true),
        isNotNull(audioFiles.uploadedAt)
      )
    )
    .groupBy(audioFiles.eventId)
    .orderBy(desc(count()))
    .limit(1);
  return rows[0] ? Number(rows[0].n) : 0;
}