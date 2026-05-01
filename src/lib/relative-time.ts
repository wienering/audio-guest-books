import { formatRelativeDate } from "@/lib/date-format";

/** Past times only; for `retail_link_last_sent_at` style labels. */
export function formatRelativeTimePast(iso: string): string {
  return formatRelativeDate(iso);
}
