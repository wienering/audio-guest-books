/** Past times only; for `retail_link_last_sent_at` style labels. */
export function formatRelativeTimePast(iso: string): string {
  const date = new Date(iso);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];
  for (const { amount, unit } of divisions) {
    if (Math.abs(seconds) < amount) {
      return rtf.format(seconds, unit);
    }
    seconds = Math.round(seconds / amount);
  }
  return rtf.format(seconds, "year");
}
