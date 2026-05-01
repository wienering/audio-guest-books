
import bcrypt from "bcryptjs";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Logger } from "pino";

import type { AppDatabase, AppDbClient } from "@/db/index";
import { db } from "@/db/index";
import {
  audioFiles,
  downloadJobs,
  emailLog,
  eventAnalyticsEvents,
  events,
  retailPageSessions,
  uploadJobs,
} from "@/db/schema";
import { deleteObject } from "@/lib/r2";
import { utcCalendarDate } from "@/lib/retention";

export const SOFT_DELETE_GRACE_DAYS = 30;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EVENT_TYPES = ["wedding", "birthday", "corporate", "anniversary", "other"] as const;
export type EventTypeValue = (typeof EVENT_TYPES)[number];

function addUtcCalendarDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return utcCalendarDate(x);
}

export type EventEditInput = {
  name?: string;
  eventType?: EventTypeValue;
  eventTypeOther?: string | null;
  /** ISO date YYYY-MM-DD */
  eventDate?: string;
  retailClientName?: string;
  retailClientEmail?: string;
  retailClientSlug?: string;
  /** When set/changed: hash + store; when null: clear; when omitted: leave alone. */
  password?: string | null;
};

export type EventEditFieldErrors = Partial<
  Record<
    | "name"
    | "eventType"
    | "eventTypeOther"
    | "eventDate"
    | "retailClientName"
    | "retailClientEmail"
    | "retailClientSlug"
    | "password",
    string
  >
>;

export type EventEditResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: EventEditFieldErrors;
      status: 400 | 404 | 409;
    };

export type EventLoadResult =
  | { ok: true; event: typeof events.$inferSelect }
  | { ok: false; status: 404 };

export async function loadEventForCompany(
  eventId: string,
  companyId: string
): Promise<EventLoadResult> {
  const row = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.companyId, companyId)),
  });
  if (!row) return { ok: false, status: 404 };
  return { ok: true, event: row };
}

export async function loadEventAnyCompany(
  eventId: string
): Promise<EventLoadResult> {
  const row = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!row) return { ok: false, status: 404 };
  return { ok: true, event: row };
}

function trim(s: string | undefined | null): string {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Validates and applies a partial edit to an event row. Slug uniqueness is
 * checked against active rows in the same company, excluding the event itself.
 *
 * `passwordEditAllowed` lets callers gate password edits on the
 * `password_protection` feature without re-fetching it per row.
 */
export async function editEvent(
  eventId: string,
  input: EventEditInput,
  options: { passwordEditAllowed: boolean }
): Promise<EventEditResult> {
  const fieldErrors: EventEditFieldErrors = {};
  const updates: Partial<typeof events.$inferInsert> = {};

  const existing = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!existing) {
    return { ok: false, message: "Event not found.", status: 404 };
  }

  if (input.name !== undefined) {
    const v = trim(input.name);
    if (v.length < 1 || v.length > 200) {
      fieldErrors.name = "Event name is required (1–200 characters).";
    } else {
      updates.name = v;
    }
  }

  if (input.eventType !== undefined) {
    if (!EVENT_TYPES.includes(input.eventType)) {
      fieldErrors.eventType = "Pick a valid event type.";
    } else {
      updates.eventType = input.eventType;
    }
  }

  // Always recompute eventTypeOther based on the (possibly updated) event type.
  const effectiveType = (updates.eventType ?? existing.eventType) as EventTypeValue;
  if (effectiveType === "other") {
    const candidate =
      input.eventTypeOther !== undefined
        ? trim(input.eventTypeOther)
        : (existing.eventTypeOther ?? "");
    if (!candidate) {
      fieldErrors.eventTypeOther = "Describe the custom event type.";
    } else if (candidate.length > 200) {
      fieldErrors.eventTypeOther = "Custom type must be 200 characters or fewer.";
    } else if (input.eventTypeOther !== undefined) {
      updates.eventTypeOther = candidate;
    } else if (input.eventType !== undefined && existing.eventTypeOther) {
      updates.eventTypeOther = existing.eventTypeOther;
    }
  } else if (input.eventType !== undefined) {
    // Switched away from "other" — clear the custom label.
    updates.eventTypeOther = null;
  }

  if (input.eventDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) {
      fieldErrors.eventDate = "Use YYYY-MM-DD.";
    } else {
      const d = new Date(`${input.eventDate}T12:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        fieldErrors.eventDate = "Invalid date.";
      } else {
        updates.eventDate = d;
      }
    }
  }

  if (input.retailClientName !== undefined) {
    const v = trim(input.retailClientName);
    if (v.length < 1 || v.length > 200) {
      fieldErrors.retailClientName = "Client name is required.";
    } else {
      updates.retailClientName = v;
    }
  }

  if (input.retailClientEmail !== undefined) {
    const v = trim(input.retailClientEmail);
    if (!v) {
      fieldErrors.retailClientEmail = "Client email is required.";
    } else if (v.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      fieldErrors.retailClientEmail = "Enter a valid email.";
    } else {
      updates.retailClientEmail = v;
    }
  }

  if (input.retailClientSlug !== undefined) {
    const candidate = trim(input.retailClientSlug).toLowerCase();
    if (candidate.length < 2 || candidate.length > 80) {
      fieldErrors.retailClientSlug = "Slug must be 2–80 characters.";
    } else if (!SLUG_REGEX.test(candidate)) {
      fieldErrors.retailClientSlug =
        "Use lowercase letters, numbers, and hyphens (no leading/trailing hyphen).";
    } else if (candidate !== existing.retailClientSlug) {
      const [dup] = await db
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.companyId, existing.companyId),
            eq(events.retailClientSlug, candidate),
            isNull(events.deletedAt),
            ne(events.id, eventId)
          )
        )
        .limit(1);
      if (dup) {
        fieldErrors.retailClientSlug =
          "This slug is already used by another event in your workspace.";
      } else {
        updates.retailClientSlug = candidate;
      }
    }
  }

  if (input.password !== undefined) {
    if (input.password === null || input.password === "") {
      updates.passwordHash = null;
      updates.passwordSetAt = null;
    } else {
      if (!options.passwordEditAllowed) {
        fieldErrors.password =
          "Your plan does not include password protection.";
      } else if (input.password.trim().length < 4) {
        fieldErrors.password = "Password must be at least 4 characters.";
      } else {
        updates.passwordHash = await bcrypt.hash(input.password.trim(), 10);
        updates.passwordSetAt = new Date();
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the fields below.",
      fieldErrors,
      status: 400,
    };
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  updates.updatedAt = new Date();

  await db.update(events).set(updates).where(eq(events.id, eventId));

  return { ok: true };
}

export type SoftDeleteResult = {
  hardDeleteAfter: Date;
};

export async function softDeleteEvent(
  dbConn: AppDbClient,
  eventId: string
): Promise<SoftDeleteResult> {
  const now = new Date();
  const hardDeleteAfter = addUtcCalendarDays(
    utcCalendarDate(now),
    SOFT_DELETE_GRACE_DAYS
  );

  await dbConn
    .update(events)
    .set({
      deletedAt: now,
      hardDeleteAfter,
      updatedAt: now,
    })
    .where(eq(events.id, eventId));

  return { hardDeleteAfter };
}

export async function restoreEvent(
  dbConn: AppDbClient,
  eventId: string,
  /**
   * Caller may have already validated against this; passing it lets us reject
   * restores that would collide with another active event using the same slug.
   */
  conflictCheck?: { companyId: string; retailClientSlug: string }
): Promise<{ ok: true } | { ok: false; reason: "slug_conflict" }> {
  if (conflictCheck) {
    const [dup] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.companyId, conflictCheck.companyId),
          eq(events.retailClientSlug, conflictCheck.retailClientSlug),
          isNull(events.deletedAt),
          ne(events.id, eventId)
        )
      )
      .limit(1);
    if (dup) return { ok: false, reason: "slug_conflict" };
  }

  await dbConn
    .update(events)
    .set({
      deletedAt: null,
      hardDeleteAfter: null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  return { ok: true };
}

/**
 * Best-effort R2 cleanup followed by atomic DB cleanup. R2 failures are logged
 * and ignored so we never leave partial DB state behind (orphaned objects can
 * be reconciled out-of-band; orphaned DB rows are user-visible).
 */
export async function hardDeleteEvent(
  database: AppDatabase,
  eventId: string,
  log?: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const eventRow = await database.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!eventRow) return;

  const keysToDelete = new Set<string>();
  if (eventRow.coverImageStorageKey) {
    keysToDelete.add(eventRow.coverImageStorageKey);
  }

  const audioRows = await database
    .select({ storageKey: audioFiles.storageKey })
    .from(audioFiles)
    .where(eq(audioFiles.eventId, eventId));
  for (const r of audioRows) keysToDelete.add(r.storageKey);

  const downloadRows = await database
    .select({ resultStorageKey: downloadJobs.resultStorageKey })
    .from(downloadJobs)
    .where(eq(downloadJobs.eventId, eventId));
  for (const r of downloadRows) {
    if (r.resultStorageKey) keysToDelete.add(r.resultStorageKey);
  }

  const uploadRows = await database
    .select({ storageKey: uploadJobs.storageKey })
    .from(uploadJobs)
    .where(eq(uploadJobs.eventId, eventId));
  for (const r of uploadRows) keysToDelete.add(r.storageKey);

  for (const key of keysToDelete) {
    try {
      await deleteObject(key);
    } catch (err) {
      log?.warn(
        { err, key, eventId },
        "event hard-delete: r2 delete failed (orphan may remain)"
      );
    }
  }

  await database.transaction(async (tx) => {
    await tx
      .delete(retailPageSessions)
      .where(eq(retailPageSessions.eventId, eventId));
    await tx
      .delete(eventAnalyticsEvents)
      .where(eq(eventAnalyticsEvents.eventId, eventId));
    await tx
      .delete(downloadJobs)
      .where(eq(downloadJobs.eventId, eventId));
    await tx.delete(uploadJobs).where(eq(uploadJobs.eventId, eventId));
    await tx
      .update(emailLog)
      .set({ eventId: null })
      .where(eq(emailLog.eventId, eventId));
    await tx.delete(audioFiles).where(eq(audioFiles.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
  });

  log?.info({ eventId }, "event hard-delete: row purged");
}

/**
 * Returns the count of soft-deleted events for a company that are still
 * within the grace period (hard_delete_after >= today).
 */
export async function countRestorableDeletedEvents(
  companyId: string
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(events)
    .where(
      and(
        eq(events.companyId, companyId),
        // Both soft-deleted (deletedAt set) and not yet purged.
        // hardDeleteAfter is nullable but always set on soft-delete, so use it for the cutoff.
        sql`${events.deletedAt} IS NOT NULL`,
        sql`${events.hardDeleteAfter} IS NOT NULL`
      )
    );
  return Number(row?.n ?? 0);
}

export type DeletedEventListRow = {
  id: string;
  name: string;
  retailClientName: string;
  retailClientSlug: string;
  deletedAt: string;
  hardDeleteAfter: string;
};

export async function listDeletedEventsForCompany(
  companyId: string
): Promise<DeletedEventListRow[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      retailClientName: events.retailClientName,
      retailClientSlug: events.retailClientSlug,
      deletedAt: events.deletedAt,
      hardDeleteAfter: events.hardDeleteAfter,
    })
    .from(events)
    .where(
      and(
        eq(events.companyId, companyId),
        sql`${events.deletedAt} IS NOT NULL`
      )
    )
    .orderBy(sql`${events.deletedAt} DESC`);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    retailClientName: r.retailClientName,
    retailClientSlug: r.retailClientSlug,
    deletedAt: r.deletedAt instanceof Date ? r.deletedAt.toISOString() : String(r.deletedAt),
    hardDeleteAfter:
      r.hardDeleteAfter instanceof Date
        ? r.hardDeleteAfter.toISOString().slice(0, 10)
        : (r.hardDeleteAfter ?? ""),
  }));
}

/** Used by the retention scheduler. */
export async function listEventsDueForHardDelete(
  database: AppDatabase,
  today: Date
): Promise<{ id: string }[]> {
  const rows = await database
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        sql`${events.deletedAt} IS NOT NULL`,
        sql`${events.hardDeleteAfter} IS NOT NULL`,
        sql`${events.hardDeleteAfter} <= ${today.toISOString().slice(0, 10)}`
      )
    );
  return rows;
}

/** Confirmation token comparison helper used by hard-delete endpoints. */
export function eventNameMatches(typed: string, expected: string): boolean {
  return typed.trim().toLowerCase() === expected.trim().toLowerCase();
}

// Re-export so callers that already import this module don't have to grab inArray separately.
export { inArray };
