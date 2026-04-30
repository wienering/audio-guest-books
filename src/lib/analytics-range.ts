export type AnalyticsTimeRange = {
  /** Stable cache/API key fragment */
  rangeKey: string;
  /** Inclusive lower bound (UTC start of day); null = all-time lower */
  start: Date | null;
  /** Exclusive upper bound (UTC start of day after last included day) */
  endExclusive: Date | null;
};

function startOfUtcDayFromParts(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Parse YYYY-MM-DD as UTC midnight */
export function parseUtcDateParam(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [ys, ms, ds] = s.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  return startOfUtcDayFromParts(y, m, d);
}

/**
 * Rolling calendar windows: "last N days" includes today (UTC) as the final day.
 */
export function resolveAnalyticsRange(searchParams: URLSearchParams): AnalyticsTimeRange {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && to) {
    const start = parseUtcDateParam(from);
    const endDay = parseUtcDateParam(to);
    if (start && endDay && endDay >= start) {
      return {
        rangeKey: `custom:${from}:${to}`,
        start,
        endExclusive: addUtcDays(startOfUtcDay(endDay), 1),
      };
    }
  }

  const raw = searchParams.get("range") ?? "30d";
  const now = new Date();

  if (raw === "all") {
    return { rangeKey: "all", start: null, endExclusive: null };
  }

  const days =
    raw === "7d" ? 7 : raw === "90d" ? 90 : raw === "30d" ? 30 : 30;
  const todayStart = startOfUtcDay(now);
  const start = addUtcDays(todayStart, -(days - 1));
  const endExclusive = addUtcDays(todayStart, 1);

  return {
    rangeKey: raw === "7d" || raw === "90d" || raw === "30d" ? raw : "30d",
    start,
    endExclusive,
  };
}
