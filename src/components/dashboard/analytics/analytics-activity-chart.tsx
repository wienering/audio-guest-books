"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDateOnly } from "@/lib/date-format";

export type ActivityChartRow = {
  day: string;
  pageViews: number;
  filePlays: number;
  fileDownloads: number;
};

type Props = {
  data: ActivityChartRow[];
  compact?: boolean;
};

export function AnalyticsActivityChart(props: Props) {
  const { data, compact } = props;
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No timeline data for this range yet.
      </p>
    );
  }

  const formatted = data.map((r) => ({
    ...r,
    label: formatDateOnly(r.day, { month: "short", day: "numeric" }),
    tooltipDay: formatDateOnly(r.day, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }));

  const height = compact ? 220 : 280;

  return (
    <div className="w-full" style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis width={40} tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as
                | { tooltipDay?: string; day?: string }
                | undefined;
              return p?.tooltipDay ?? p?.day ?? "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="pageViews"
            name="Page views"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="filePlays"
            name="File plays"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fileDownloads"
            name="File downloads"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
