import { formatDateOnly } from "@/lib/date-format";

/**
 * Used by retail pages and the BullMQ worker (retention emails).
 *
 * Renders the calendar date the host picked verbatim — no timezone shift —
 * because `event_date` is stored as a date-only column. Timezone-aware
 * formatting would risk rolling the date forward/backward by a day.
 */
export function formatRetailEventDate(isoDate: string): string {
  return formatDateOnly(isoDate, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
