/** Plan code fallback when `plans.default_retention_months` is unavailable. */
export function retentionMonthsForPlanCode(code: string): number {
  switch (code) {
    case "free":
      return 6;
    case "pro":
      return 18;
    case "ultimate":
      return 24;
    default:
      return 6;
  }
}

/**
 * `retention_until` on events: anchor is when the event **row is created**
 * (server “now”), not `event_date`. Adds plan months in UTC calendar terms.
 */
export function computeRetentionUntil(
  retentionMonths: number,
  anchorUtc: Date
): Date {
  const d = new Date(anchorUtc.getTime());
  d.setUTCMonth(d.getUTCMonth() + retentionMonths);
  return d;
}

/** Calendar add months from a date (UTC). */
export function addUtcMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Earlier of two dates by UTC millis. */
export function minUtcDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

/** Start of UTC calendar day for the given instant. */
export function utcCalendarDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

/** Whole UTC calendar days from `today` (start of UTC day) until `end` (date-only anchor). */
export function daysUntilUtcCalendarEnd(today: Date, end: Date): number {
  const start = utcCalendarDate(today);
  const e = utcCalendarDate(end);
  return Math.ceil((e.getTime() - start.getTime()) / 86_400_000);
}
