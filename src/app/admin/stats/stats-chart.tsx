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

import type { AdminStatsDailyRow } from "@/lib/admin-stats";

type Props = {
  data: AdminStatsDailyRow[];
};

export function StatsChart({ data }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="signups"
            name="Signups"
            stroke="#2563eb"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="events"
            name="Events created"
            stroke="#16a34a"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="upgrades"
            name="Upgrades"
            stroke="#9333ea"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
