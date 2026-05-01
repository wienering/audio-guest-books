"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Download,
  Eye,
  Files,
  HardDrive,
  Layers,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsActivityChart } from "@/components/dashboard/analytics/analytics-activity-chart";
import { AnalyticsLockedOverlay } from "@/components/dashboard/analytics/analytics-locked-overlay";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyAnalyticsPayload } from "@/lib/analytics-sample-data";
import { formatDate } from "@/lib/date-format";
import { cn, formatBytes } from "@/lib/utils";

type Range =
  | { kind: "preset"; preset: "7d" | "30d" | "90d" | "all" }
  | { kind: "custom"; from: string; to: string };

function rangeToQuery(r: Range): string {
  if (r.kind === "custom") {
    return `from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`;
  }
  return `range=${r.preset}`;
}

function StatCard(props: {
  label: string;
  value: ReactNode;
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
        <div className="font-semibold text-2xl tracking-tight">{props.value}</div>
      </CardContent>
    </Card>
  );
}

type SortKey =
  | "event_name"
  | "retail_client_name"
  | "page_views"
  | "downloads"
  | "last_activity_at";

export function CompanyAnalyticsClient() {
  const [range, setRange] = useState<Range>({
    kind: "preset",
    preset: "30d",
  });
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [data, setData] = useState<CompanyAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "page_views",
    dir: "desc",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const r = await fetch(`/api/insights/company?${rangeToQuery(range)}`);
        if (!r.ok) throw new Error("bad response");
        const j = (await r.json()) as CompanyAnalyticsPayload;
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
  }, [range]);

  const sortedTop = useMemo(() => {
    if (!data) return [];
    const rows = [...data.top_events];
    rows.sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "event_name":
          return mul * a.event_name.localeCompare(b.event_name);
        case "retail_client_name":
          return mul * a.retail_client_name.localeCompare(b.retail_client_name);
        case "page_views":
          return mul * (a.page_views - b.page_views);
        case "downloads":
          return mul * (a.downloads - b.downloads);
        case "last_activity_at": {
          const ta = a.last_activity_at ?? "";
          const tb = b.last_activity_at ?? "";
          return mul * ta.localeCompare(tb);
        }
        default:
          return 0;
      }
    });
    return rows;
  }, [data, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir:
              key === "event_name" || key === "retail_client_name"
                ? "asc"
                : "desc",
          }
    );
  }

  const limit = data?.plan.file_limit_per_event ?? null;
  const maxSingle = data?.plan.max_originals_single_event ?? 0;
  const nearingFileCap =
    limit !== null && limit > 0 && maxSingle / limit >= 0.85;

  return (
    <div className="relative space-y-10">
      <header className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Client engagement across all events for your company.
        </p>
      </header>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Events created"
              value={data.summary.total_events_created.toLocaleString()}
              icon={<Layers className="size-4" aria-hidden />}
            />
            <StatCard
              label="Events active"
              value={data.summary.total_events_active.toLocaleString()}
              icon={<CalendarDays className="size-4" aria-hidden />}
            />
            <StatCard
              label="Original files"
              value={data.summary.total_files_uploaded.toLocaleString()}
              icon={<Files className="size-4" aria-hidden />}
            />
            <StatCard
              label="Storage used"
              value={formatBytes(data.summary.total_storage_bytes)}
              icon={<HardDrive className="size-4" aria-hidden />}
            />
            <StatCard
              label="Page views"
              value={data.summary.total_page_views.toLocaleString()}
              icon={<Eye className="size-4" aria-hidden />}
            />
            <StatCard
              label="Unique visitors"
              value={data.summary.unique_visitors.toLocaleString()}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatCard
              label="Downloads"
              value={data.summary.total_downloads.toLocaleString()}
              icon={<Download className="size-4" aria-hidden />}
            />
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Plan utilization</CardTitle>
              <p className="text-muted-foreground text-xs">
                Based on events and audio originals stored today — independent
                of the selected date range.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-foreground">
                  {data.summary.total_events_active.toLocaleString()}
                </span>{" "}
                active events with guest-visible recordings ·{" "}
                <span className="font-medium text-foreground">
                  {data.summary.total_events_created.toLocaleString()}
                </span>{" "}
                total events on your account.
              </p>
              <p>
                Storage:{" "}
                <span className="font-medium">
                  {formatBytes(data.summary.total_storage_bytes)}
                </span>{" "}
                across all audio files.
              </p>
              {limit === null ? (
                <p className="text-muted-foreground">
                  Your plan does not set a per-event cap on uploaded originals.
                </p>
              ) : (
                <p>
                  Busiest event has{" "}
                  <span className="font-medium">
                    {maxSingle.toLocaleString()}
                  </span>{" "}
                  originals · plan allows up to{" "}
                  <span className="font-medium">{limit}</span> per event.
                </p>
              )}
              {nearingFileCap ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 text-xs dark:text-amber-100">
                  You are approaching per-event file limits on your busiest
                  events.{" "}
                  <Link
                    href="/dashboard/settings/billing"
                    className="font-medium underline underline-offset-2"
                  >
                    Upgrade billing
                  </Link>{" "}
                  when you need more capacity (Stage&nbsp;9).
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Activity timeline</CardTitle>
              <p className="text-muted-foreground text-xs">
                Daily totals aggregated across every event
              </p>
            </CardHeader>
            <CardContent>
              <AnalyticsActivityChart data={data.daily_series} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Top events by activity</CardTitle>
              <p className="text-muted-foreground text-xs">
                Sorted by page views plus downloads for the selected range
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("event_name")}
                      >
                        Event{" "}
                        {sort.key === "event_name"
                          ? sort.dir === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </th>
                    <th className="pb-2 pr-4 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("retail_client_name")}
                      >
                        Client{" "}
                        {sort.key === "retail_client_name"
                          ? sort.dir === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </th>
                    <th className="pb-2 pr-4 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("page_views")}
                      >
                        Views{" "}
                        {sort.key === "page_views"
                          ? sort.dir === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </th>
                    <th className="pb-2 pr-4 font-medium">
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
                    <th className="pb-2 font-medium">
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort("last_activity_at")}
                      >
                        Last activity{" "}
                        {sort.key === "last_activity_at"
                          ? sort.dir === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTop.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No events yet — create one from the dashboard home.
                      </td>
                    </tr>
                  ) : (
                    sortedTop.map((row) => (
                      <tr
                        key={row.event_id}
                        className={cn(
                          "border-b border-border/60",
                          !data.sample && "hover:bg-muted/40"
                        )}
                      >
                        <td className="py-2 pr-4">
                          {data.sample ? (
                            <span className="font-medium">{row.event_name}</span>
                          ) : (
                            <Link
                              className="font-medium text-primary hover:underline"
                              href={`/dashboard/events/${row.event_id}`}
                            >
                              {row.event_name}
                            </Link>
                          )}
                        </td>
                        <td className="py-2 pr-4">{row.retail_client_name}</td>
                        <td className="py-2 pr-4 tabular-nums">
                          {row.page_views.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {row.downloads.toLocaleString()}
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {row.last_activity_at
                            ? formatDate(row.last_activity_at, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}

      {data?.sample ? <AnalyticsLockedOverlay /> : null}
    </div>
  );
}
