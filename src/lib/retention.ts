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
export function computeRetentionUntil(planCode: string, anchorUtc: Date): Date {
  const months = retentionMonthsForPlanCode(planCode);
  const d = new Date(anchorUtc.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
