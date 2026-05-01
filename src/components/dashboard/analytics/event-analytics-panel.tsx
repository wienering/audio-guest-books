"use client";

import type { ReactNode } from "react";
import {
  Download,
  Eye,
  FileArchive,
  Headphones,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsActivityChart } from "@/components/dashboard/analytics/analytics-activity-chart";
import { AnalyticsLockedOverlay } from "@/components/dashboard/analytics/analytics-locked-overlay";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventAnalyticsPayload } from "@/lib/analytics-sample-data";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type Range =
  | { kind: "preset"; preset: "7d" | "30d" | "90d" | "all" }
  | { kind: "custom"; from: string; to: string };

function rangeToQuery(r: Range): string {
  if (r.kind === "custom") {
    return `from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`;
  }
  return `range=${r.preset}`;
}

type SortKey = "filename" | "plays" | "downloads";

function StatCard(props: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">
          {props.label}
        </CardTitle>
        <span className="text-muted-foreground">{props.icon}</span>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums tracking-tight">
          {props.value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

export function EventAnalyticsPanel(props: { eventId: string }) {
  const [range, setRange] = useState<Range>({
    kind: "preset",
    preset: "30d",
  });
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [data, setData] = useState<EventAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "plays",
    dir: "desc",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const r = await fetch(
          `/api/insights/event/${props.eventId}?${rangeToQuery(range)}`
        );
        if (!r.ok) throw new Error("bad response");
        const j = (await r.json()) as EventAnalyticsPayload;
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setError("Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId, range]);

  const sortedFiles = useMemo(() => {
    if (!data) return [];
    const rows = [...data.file_stats];
    rows.sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "filename") {
        return mul * a.filename.localeCompare(b.filename);
      }
      if (sort.key === "plays") return mul * (a.plays - b.plays);
      return mul * (a.downloads - b.downloads);
    });
    return rows;
  }, [data, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "filename" ? "asc" : "desc",
          }
    );
  }

  const emptyReal =
    data &&
    !data.sample &&
    data.summary.page_views === 0 &&
    data.summary.file_plays === 0 &&
    data.summary.file_downloads === 0 &&
    data.summary.zip_downloads === 0 &&
    data.recent_activity.length === 0;

  return (
    <div className="relative space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["7d", "Last 7 days"],
              ["30d", "Last 30 days"],
              ["90d", "Last 90 days"],
              ["all", "All time"],
            ] as const
          ).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              className={cn(
                buttonVariants({
                  variant:
                    range.kind === "preset" && range.preset === preset
                      ? "default"
                      : "outline",
                  size: "sm",
                })
              )}
              onClick={() =>
                setRange({
                  kind: "preset",
                  preset,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <span className="w-full text-muted-foreground text-xs sm:w-auto">
            Custom range (UTC)
          </span>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={draft.from}
              onChange={(e) =>
                setDraft((d) => ({ ...d, from: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </label>
          <button
            type="button"
            disabled={!draft.from || !draft.to || draft.from > draft.to}
            className={cn(buttonVariants({ size: "sm" }), "mb-px")}
            onClick={() =>
              setRange({
                kind: "custom",
                from: draft.from,
                to: draft.to,
              })
            }
          >
            Apply range
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading analytics…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : data ? (
        <>
          {emptyReal ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground text-sm">
              No activity yet. Share your client link to start collecting data.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Page views"
              value={data.summary.page_views}
              icon={<Eye className="size-4" aria-hidden />}
            />
            <StatCard
              label="Unique visitors"
              value={data.summary.unique_visitors}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatCard
              label="File plays"
              value={data.summary.file_plays}
              icon={<Headphones className="size-4" aria-hidden />}
            />
            <StatCard
              label="File downloads"
              value={data.summary.file_downloads}
              icon={<Download className="size-4" aria-hidden />}
            />
            <StatCard
              label="Zip downloads"
              value={data.summary.zip_downloads}
              icon={<FileArchive className="size-4" aria-hidden />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Most-played files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.top_played.length === 0 ? (
                  <p className="text-muted-foreground">No plays in range.</p>
                ) : (
                  <ol className="list-inside list-decimal space-y-1">
                    {data.top_played.map((r) => (
                      <li key={r.filename}>
                        <span className="font-medium">{r.filename}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.count.toLocaleString()} plays
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Most-downloaded files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.top_downloaded.length === 0 ? (
                  <p className="text-muted-foreground">
                    No downloads in range.
                  </p>
                ) : (
                  <ol className="list-inside list-decimal space-y-1">
                    {data.top_downloaded.map((r) => (
                      <li key={r.filename}>
                        <span className="font-medium">{r.filename}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.count.toLocaleString()} downloads
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Per-file breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("filename")}
                      >
                        Filename {sort.key === "filename" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="pb-2 pr-4 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("plays")}
                      >
                        Plays {sort.key === "plays" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="pb-2 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("downloads")}
                      >
                        Downloads{" "}
                        {sort.key === "downloads"
                          ? sort.dir === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No uploaded files for this event.
                      </td>
                    </tr>
                  ) : (
                    sortedFiles.map((r) => (
                      <tr key={r.audio_file_id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-medium break-words">
                          {r.filename}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {r.plays.toLocaleString()}
                        </td>
                        <td className="py-2 tabular-nums">
                          {r.downloads.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Activity timeline</CardTitle>
              <p className="text-muted-foreground text-xs">
                Daily totals · page views, plays, and file downloads
              </p>
            </CardHeader>
            <CardContent>
              <AnalyticsActivityChart data={data.daily_series} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <p className="text-muted-foreground text-xs">
                Latest {Math.min(50, data.recent_activity.length)} events
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recent_activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No recent actions in this range.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.recent_activity.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-1 border-b border-border/50 pb-3 text-sm last:border-0 last:pb-0 sm:flex-row sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{r.summary}</p>
                        <p className="text-muted-foreground text-xs">
                          {r.user_agent_short}
                        </p>
                      </div>
                      <time
                        className="shrink-0 text-muted-foreground text-xs sm:text-right"
                        dateTime={r.created_at}
                      >
                        {formatDateTime(r.created_at, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {data?.sample ? <AnalyticsLockedOverlay /> : null}
    </div>
  );
}
