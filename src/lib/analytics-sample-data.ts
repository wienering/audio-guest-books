import type { DailySeriesRow } from "@/lib/analytics-queries";

/** Demo payloads for companies without `retail_analytics`. */

export type EventAnalyticsPayload = {
  sample?: boolean;
  range_key: string;
  summary: {
    page_views: number;
    unique_visitors: number;
    file_plays: number;
    file_downloads: number;
    zip_downloads: number;
  };
  top_played: { filename: string; count: number }[];
  top_downloaded: { filename: string; count: number }[];
  file_stats: {
    audio_file_id: string;
    filename: string;
    plays: number;
    downloads: number;
  }[];
  daily_series: DailySeriesRow[];
  recent_activity: {
    id: string;
    created_at: string;
    summary: string;
    user_agent_short: string;
  }[];
};

export type CompanyAnalyticsPayload = {
  sample?: boolean;
  range_key: string;
  summary: {
    total_events_created: number;
    total_events_active: number;
    total_files_uploaded: number;
    total_storage_bytes: number;
    total_page_views: number;
    unique_visitors: number;
    total_downloads: number;
  };
  top_events: {
    event_id: string;
    event_name: string;
    retail_client_name: string;
    page_views: number;
    downloads: number;
    last_activity_at: string | null;
  }[];
  daily_series: DailySeriesRow[];
  plan: {
    file_limit_per_event: number | null;
    max_originals_single_event: number;
  };
};

function demoDailySeries(days: number): DailySeriesRow[] {
  const out: DailySeriesRow[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - i
      )
    );
    const day = d.toISOString().slice(0, 10);
    const wave = Math.round(18 + 14 * Math.sin(i / 5));
    out.push({
      day,
      pageViews: wave + (i % 7),
      filePlays: Math.max(0, wave - 6 + (i % 4)),
      fileDownloads: Math.max(0, Math.round(wave / 3) + (i % 3)),
    });
  }
  return out;
}

export function sampleEventAnalytics(rangeKey: string): EventAnalyticsPayload {
  const days =
    rangeKey === "7d" ? 7 : rangeKey === "90d" ? 90 : rangeKey === "all" ? 60 : 30;
  const series =
    rangeKey === "all" ? demoDailySeries(60).slice(-45) : demoDailySeries(days);

  const files = [
    {
      audio_file_id: "sample-1",
      filename: "maid-of-honor-toast.mp3",
      plays: 156,
      downloads: 42,
    },
    {
      audio_file_id: "sample-2",
      filename: "best-man-speech.mp3",
      plays: 142,
      downloads: 38,
    },
    {
      audio_file_id: "sample-3",
      filename: "guest-message-line-12.mp3",
      plays: 89,
      downloads: 21,
    },
    {
      audio_file_id: "sample-4",
      filename: "congrats-from-grandma.mp3",
      plays: 64,
      downloads: 31,
    },
  ];

  const recent = [
    {
      id: "s1",
      created_at: new Date().toISOString(),
      summary: "Page viewed · visitor a1b2c3d4…",
      user_agent_short: "Safari on iPhone",
    },
    {
      id: "s2",
      created_at: new Date(Date.now() - 3600_000).toISOString(),
      summary: "Played “maid-of-honor-toast.mp3”",
      user_agent_short: "Chrome on Windows",
    },
    {
      id: "s3",
      created_at: new Date(Date.now() - 7200_000).toISOString(),
      summary: "Downloaded zip archive",
      user_agent_short: "Firefox on macOS",
    },
    {
      id: "s4",
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      summary: "Played “best-man-speech.mp3”",
      user_agent_short: "Chrome on Android",
    },
  ];

  const plays = files.reduce((s, f) => s + f.plays, 0);
  const dls = files.reduce((s, f) => s + f.downloads, 0);

  return {
    sample: true,
    range_key: rangeKey,
    summary: {
      page_views: 482,
      unique_visitors: 126,
      file_plays: plays + 40,
      file_downloads: dls + 12,
      zip_downloads: 14,
    },
    top_played: files.slice(0, 3).map((f) => ({
      filename: f.filename,
      count: f.plays,
    })),
    top_downloaded: [...files]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 3)
      .map((f) => ({ filename: f.filename, count: f.downloads })),
    file_stats: files,
    daily_series: series,
    recent_activity: recent,
  };
}

export function sampleCompanyAnalytics(
  rangeKey: string,
  planFileLimit: number | null
): CompanyAnalyticsPayload {
  const days =
    rangeKey === "7d" ? 7 : rangeKey === "90d" ? 90 : rangeKey === "all" ? 60 : 30;
  const series =
    rangeKey === "all" ? demoDailySeries(60).slice(-45) : demoDailySeries(days);

  return {
    sample: true,
    range_key: rangeKey,
    summary: {
      total_events_created: 14,
      total_events_active: 11,
      total_files_uploaded: 186,
      total_storage_bytes: 2_147_483_648,
      total_page_views: 2840,
      unique_visitors: 612,
      total_downloads: 438,
    },
    top_events: [
      {
        event_id: "sample-ev-1",
        event_name: "Sample Wedding — Demo",
        retail_client_name: "Jordan & Taylor",
        page_views: 612,
        downloads: 148,
        last_activity_at: new Date().toISOString(),
      },
      {
        event_id: "sample-ev-2",
        event_name: "Smith Anniversary (preview)",
        retail_client_name: "Alex Smith",
        page_views: 420,
        downloads: 96,
        last_activity_at: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        event_id: "sample-ev-3",
        event_name: "Corporate gala — demo data",
        retail_client_name: "Northwind Photos",
        page_views: 305,
        downloads: 72,
        last_activity_at: new Date(Date.now() - 172_800_000).toISOString(),
      },
    ],
    daily_series: series,
    plan: {
      file_limit_per_event: planFileLimit,
      max_originals_single_event: 67,
    },
  };
}
