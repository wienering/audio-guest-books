/** Shared helpers for client report PDF filenames (used by API + dashboard button). */

import { APP_TIMEZONE } from "@/lib/date-format";

export function sanitizeReportFilenameSegment(slug: string): string {
  const s = slug
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "event";
}

export function reportFilenameDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
