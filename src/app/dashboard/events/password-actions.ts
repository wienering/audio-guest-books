"use server";

import bcrypt from "bcryptjs";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";

export type EventPasswordActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function loadOwnedEvent(eventId: string, companyId: string) {
  return db.query.events.findFirst({
    where: and(
      eq(events.id, eventId),
      eq(events.companyId, companyId),
      isNull(events.deletedAt)
    ),
  });
}

export async function setEventRetailPassword(
  eventId: string,
  password: string
): Promise<EventPasswordActionResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return { ok: false, error: "Unauthorized" };

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return { ok: false, error: "Forbidden" };
  }

  const allowed = await companyHasFeatureKey(
    membership.company.id,
    "password_protection"
  );
  if (!allowed) return { ok: false, error: "Forbidden" };

  const trimmed = password.trim();
  if (trimmed.length < 4) {
    return {
      ok: false,
      error: "Password must be at least 4 characters.",
    };
  }

  const ev = await loadOwnedEvent(eventId, membership.company.id);
  if (!ev) return { ok: false, error: "Event not found." };

  const hash = await bcrypt.hash(trimmed, 10);
  const now = new Date();

  await db
    .update(events)
    .set({
      passwordHash: hash,
      passwordSetAt: now,
      updatedAt: now,
    })
    .where(eq(events.id, eventId));

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Clears protection whether or not plan currently includes the feature (downgrade cleanup). */
export async function clearEventRetailPassword(
  eventId: string
): Promise<EventPasswordActionResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return { ok: false, error: "Unauthorized" };

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return { ok: false, error: "Forbidden" };
  }

  const ev = await loadOwnedEvent(eventId, membership.company.id);
  if (!ev) return { ok: false, error: "Event not found." };

  const now = new Date();
  await db
    .update(events)
    .set({
      passwordHash: null,
      passwordSetAt: null,
      updatedAt: now,
    })
    .where(eq(events.id, eventId));

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
