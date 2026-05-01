/**
 * Centralized date/time formatting for user-facing display.
 *
 * Underlying timestamps are always stored in UTC; these helpers project them
 * into the app's display timezone. Date-only fields (DB `date` columns such as
 * `event_date`, `retention_until`, `hard_delete_after`, `metadata_only_after`)
 * should use {@link formatDateOnly} to avoid a one-day shift caused by
 * applying a timezone to a calendar-only value.
 *
 * Per-company timezone overrides are a planned future enhancement; for now
 * every formatter uses {@link APP_TIMEZONE}. Update this constant or pipe a
 * per-company value through these helpers when that work lands.
 */

/** App-wide default display timezone. */
export const APP_TIMEZONE = "America/Toronto";

/**
 * Locale used for all formatted date/time output. `en-US` keeps Node and
 * browser ICU output identical (avoids hydration mismatches on the dashboard).
 */
const FORMAT_LOCALE = "en-US";

type DateInput = Date | string | number;

function toDate(input: DateInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Format a timestamp as a date in {@link APP_TIMEZONE}.
 * Returns an empty string for invalid input so callers can render `?? "—"`.
 */
export function formatDate(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toDate(input);
  if (!date) return "";
  return new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...DEFAULT_DATE_OPTIONS,
    ...options,
    timeZone: APP_TIMEZONE,
  }).format(date);
}

/** Format a timestamp as date + time in {@link APP_TIMEZONE}. */
export function formatDateTime(
  input: DateInput,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toDate(input);
  if (!date) return "";
  return new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...DEFAULT_DATE_TIME_OPTIONS,
    ...options,
    timeZone: APP_TIMEZONE,
  }).format(date);
}

/**
 * Relative description of a timestamp ("2 hours ago", "yesterday", "in 3 days").
 * The current moment is interpreted in {@link APP_TIMEZONE} for the boundary
 * between "today" and "yesterday".
 */
export function formatRelativeDate(input: DateInput, baseDate?: Date): string {
  const date = toDate(input);
  if (!date) return "";
  const now = baseDate ?? new Date();
  const rtf = new Intl.RelativeTimeFormat(FORMAT_LOCALE, { numeric: "auto" });
  let seconds = Math.round((date.getTime() - now.getTime()) / 1000);
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

/**
 * Format a calendar-only date (DB `date` column / `YYYY-MM-DD` string) without
 * applying a display timezone. The host picked, e.g., "April 30, 2026" in their
 * own context — converting to a different zone could roll it back to April 29.
 *
 * Accepts a `Date` (interpreted via its UTC components, since Drizzle's
 * `mode: "date"` returns dates anchored to UTC midnight) or a `YYYY-MM-DD`
 * string (the leading 10 chars are taken if longer).
 */
export function formatDateOnly(
  isoDateOrDate: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  let y: number;
  let m: number;
  let d: number;
  if (isoDateOrDate instanceof Date) {
    if (Number.isNaN(isoDateOrDate.getTime())) return "";
    y = isoDateOrDate.getUTCFullYear();
    m = isoDateOrDate.getUTCMonth() + 1;
    d = isoDateOrDate.getUTCDate();
  } else {
    const parts = isoDateOrDate.slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      return String(isoDateOrDate);
    }
    [y, m, d] = parts as [number, number, number];
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...DEFAULT_DATE_OPTIONS,
    ...options,
    timeZone: "UTC",
  }).format(dt);
}
