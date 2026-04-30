import "server-only";

import { unstable_cache } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import type { AnalyticsTimeRange } from "@/lib/analytics-range";
import type {
  EventAnalyticsPayload,
  CompanyAnalyticsPayload,
} from "@/lib/analytics-sample-data";
import {
  fetchCompanyAnalyticsSummary,
  fetchCompanyDailySeries,
  fetchCompanyMaxOriginalFilesPerEvent,
  fetchCompanyTopEvents,
  fetchEventAnalyticsSummary,
  fetchEventDailySeries,
  fetchEventPerFileStats,
  fetchEventRecentActivity,
  fetchEventTopFileCounts,
  type DailySeriesRow,
  type FileCountRow,
} from "@/lib/analytics-queries";

function rangeCacheKey(r: AnalyticsTimeRange): string {
  return `${r.rangeKey}|${r.start?.toISOString() ?? "∞"}|${r.endExclusive?.toISOString() ?? "∞"}`;
}

function trimSeriesForWideWindow(
  rangeKey: string,
  rows: DailySeriesRow[]
): DailySeriesRow[] {
  if (rangeKey !== "all" || rows.length <= 200) return rows;
  return rows.slice(-200);
}

async function buildRealEventPayload(
  eventId: string,
  range: AnalyticsTimeRange
): Promise<EventAnalyticsPayload> {
  const [
    summary,
    topPlay,
    topDl,
    fileStats,
    daily,
    recent,
  ] = await Promise.all([
    fetchEventAnalyticsSummary(eventId, range),
    fetchEventTopFileCounts(eventId, range, "file_play", 5),
    fetchEventTopFileCounts(eventId, range, "file_download", 5),
    fetchEventPerFileStats(eventId, range),
    fetchEventDailySeries(eventId, range),
    fetchEventRecentActivity(eventId, range, 50),
  ]);

  const idToName = new Map(
    fileStats.map((f) => [f.audioFileId, f.filename])
  );

  function mapTop(rows: FileCountRow[]) {
    return rows
      .filter((r) => r.audioFileId)
      .map((r) => ({
        filename: idToName.get(r.audioFileId as string) ?? "Removed file",
        count: Number(r.n),
      }));
  }

  const daily_series = trimSeriesForWideWindow(range.rangeKey, daily);

  return {
    range_key: range.rangeKey,
    summary: {
      page_views: summary.pageViews,
      unique_visitors: summary.uniqueVisitors,
      file_plays: summary.filePlays,
      file_downloads: summary.fileDownloads,
      zip_downloads: summary.zipDownloads,
    },
    top_played: mapTop(topPlay),
    top_downloaded: mapTop(topDl),
    file_stats: fileStats.map((f) => ({
      audio_file_id: f.audioFileId,
      filename: f.filename,
      plays: f.plays,
      downloads: f.downloads,
    })),
    daily_series,
    recent_activity: recent.map((r) => ({
      id: r.id,
      created_at: r.createdAt,
      summary: r.summary,
      user_agent_short: r.userAgentShort,
    })),
  };
}

export async function getCachedEventAnalyticsPayload(
  eventId: string,
  range: AnalyticsTimeRange
): Promise<EventAnalyticsPayload> {
  const rk = rangeCacheKey(range);
  return unstable_cache(
    () => buildRealEventPayload(eventId, range),
    ["event-analytics-v1", eventId, rk],
    { revalidate: 60 }
  )();
}

async function buildRealCompanyPayload(
  companyId: string,
  range: AnalyticsTimeRange,
  planFileLimit: number | null
): Promise<CompanyAnalyticsPayload> {
  const [summary, topEvents, daily, maxOriginals] = await Promise.all([
    fetchCompanyAnalyticsSummary(companyId, range),
    fetchCompanyTopEvents(companyId, range, 500),
    fetchCompanyDailySeries(companyId, range),
    fetchCompanyMaxOriginalFilesPerEvent(companyId),
  ]);

  const daily_series = trimSeriesForWideWindow(range.rangeKey, daily);

  return {
    range_key: range.rangeKey,
    summary: {
      total_events_created: summary.totalEventsCreated,
      total_events_active: summary.totalEventsActive,
      total_files_uploaded: summary.totalFilesUploaded,
      total_storage_bytes: summary.totalStorageBytes,
      total_page_views: summary.totalPageViews,
      unique_visitors: summary.uniqueVisitors,
      total_downloads: summary.totalDownloads,
    },
    top_events: topEvents.map((e) => ({
      event_id: e.eventId,
      event_name: e.eventName,
      retail_client_name: e.retailClientName,
      page_views: e.pageViews,
      downloads: e.downloads,
      last_activity_at: e.lastActivityAt,
    })),
    daily_series,
    plan: {
      file_limit_per_event: planFileLimit,
      max_originals_single_event: maxOriginals,
    },
  };
}

export async function getCachedCompanyAnalyticsPayload(
  companyId: string,
  range: AnalyticsTimeRange,
  planFileLimit: number | null
): Promise<CompanyAnalyticsPayload> {
  const rk = rangeCacheKey(range);
  return unstable_cache(
    () => buildRealCompanyPayload(companyId, range, planFileLimit),
    ["company-analytics-v1", companyId, rk],
    { revalidate: 60 }
  )();
}

export async function assertUserOwnsEvent(
  eventId: string,
  companyId: string
): Promise<boolean> {
  const row = await db.query.events.findFirst({
    where: and(
      eq(events.id, eventId),
      eq(events.companyId, companyId),
      isNull(events.deletedAt)
    ),
    columns: { id: true },
  });
  return Boolean(row);
}
