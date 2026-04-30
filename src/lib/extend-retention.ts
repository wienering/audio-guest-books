import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import {
  addUtcMonths,
  computeRetentionUntil,
  minUtcDate,
  retentionMonthsForPlanCode,
  utcCalendarDate,
} from "@/lib/retention";

export type ExtendRetentionResult =
  | { ok: true; retentionUntilIso: string }
  | { ok: false; message: string };

export async function extendEventRetentionForUser(
  eventId: string
): Promise<ExtendRetentionResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return { ok: false, message: "Sign in required." };
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return { ok: false, message: "Complete onboarding first." };
  }

  const plan = membership.company.plan;
  if (!plan) {
    return { ok: false, message: "Plan not found." };
  }

  const retentionMonths =
    plan.defaultRetentionMonths ?? retentionMonthsForPlanCode(plan.code);

  const [eventRow] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.companyId, membership.company.id),
        isNull(events.deletedAt)
      )
    )
    .limit(1);

  if (!eventRow) {
    return { ok: false, message: "Event not found." };
  }

  if (eventRow.metadataOnlyAfter) {
    return {
      ok: false,
      message:
        "Files are already removed for this event; retention cannot be extended.",
    };
  }

  const nowDay = utcCalendarDate(new Date());
  const cap = computeRetentionUntil(retentionMonths, nowDay);
  const currentAnchored = utcCalendarDate(eventRow.retentionUntil);
  const extended = addUtcMonths(eventRow.retentionUntil, 12);
  const next = minUtcDate(extended, cap);

  if (next.getTime() <= currentAnchored.getTime()) {
    return {
      ok: false,
      message:
        "This event is already at the maximum retention allowed by your plan.",
    };
  }

  await db
    .update(events)
    .set({
      retentionUntil: next,
      retentionExtendedCount: sql`${events.retentionExtendedCount} + 1`,
      lastRetentionNotificationThreshold: null,
      lastRetentionNotificationSentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  return {
    ok: true,
    retentionUntilIso: next.toISOString().slice(0, 10),
  };
}
