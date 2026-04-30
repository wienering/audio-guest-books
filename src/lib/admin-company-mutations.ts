import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { grantPlanFeaturesFromPlan } from "@/db/grant-features";
import {
  companies,
  companyFeatures,
  planFeatures,
  plans,
} from "@/db/schema";
import { utcCalendarDate } from "@/lib/retention";

export function addUtcCalendarDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return utcCalendarDate(x);
}

/**
 * Marks the company for deletion with the standard 30-day grace period.
 * Mirrors the user-initiated path in /api/account/delete but uses the supplied
 * Clerk id (the admin) for `deletion_requested_by_user_id`.
 */
export async function markCompanyDeleted(
  dbConn: AppDbClient,
  companyId: string,
  byUserId: string
): Promise<{ hardDeleteAfter: Date }> {
  const now = new Date();
  const hardDeleteAfter = addUtcCalendarDays(utcCalendarDate(now), 30);

  await dbConn
    .update(companies)
    .set({
      deletedAt: now,
      hardDeleteAfter,
      deletionRequestedByUserId: byUserId,
      updatedAt: now,
    })
    .where(eq(companies.id, companyId));

  return { hardDeleteAfter };
}

export async function restoreCompany(
  dbConn: AppDbClient,
  companyId: string
): Promise<void> {
  await dbConn
    .update(companies)
    .set({
      deletedAt: null,
      hardDeleteAfter: null,
      deletionRequestedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

/**
 * Schedules immediate hard-delete: forces hard_delete_after to yesterday so
 * the next retention scheduler run will purge the company. Caller must run
 * the scheduler after calling this (admin override path).
 */
export async function scheduleHardDeleteNow(
  dbConn: AppDbClient,
  companyId: string,
  byUserId: string
): Promise<{ hardDeleteAfter: Date }> {
  const now = new Date();
  const yesterday = addUtcCalendarDays(utcCalendarDate(now), -1);

  await dbConn
    .update(companies)
    .set({
      deletedAt: now,
      hardDeleteAfter: yesterday,
      deletionRequestedByUserId: byUserId,
      updatedAt: now,
    })
    .where(eq(companies.id, companyId));

  return { hardDeleteAfter: yesterday };
}

/**
 * Resets a company back to the Free plan: clears Stripe identifiers + plan-source
 * features, sets plan_id to Free, regrants Free plan features. Does NOT call
 * Stripe to cancel — use cancelCompanySubscription separately for that.
 */
export async function resetCompanyToFree(
  dbConn: AppDbClient,
  companyId: string
): Promise<{ removedPlanFeatureCount: number }> {
  const [freePlan] = await dbConn
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, "free"))
    .limit(1);

  if (!freePlan) {
    throw new Error("free_plan_missing");
  }

  const [currentPlan] = await dbConn
    .select({ planId: companies.planId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  let removedPlanFeatureCount = 0;
  if (currentPlan?.planId && currentPlan.planId !== freePlan.id) {
    const planFeatureRows = await dbConn
      .select({ featureId: planFeatures.featureId })
      .from(planFeatures)
      .where(eq(planFeatures.planId, currentPlan.planId));

    if (planFeatureRows.length > 0) {
      const featureIds = planFeatureRows.map((r) => r.featureId);
      const removed = await dbConn
        .delete(companyFeatures)
        .where(
          and(
            eq(companyFeatures.companyId, companyId),
            eq(companyFeatures.source, "plan"),
            inArray(companyFeatures.featureId, featureIds)
          )
        )
        .returning({ companyId: companyFeatures.companyId });
      removedPlanFeatureCount = removed.length;
    }
  } else {
    const removed = await dbConn
      .delete(companyFeatures)
      .where(
        and(
          eq(companyFeatures.companyId, companyId),
          eq(companyFeatures.source, "plan")
        )
      )
      .returning({ companyId: companyFeatures.companyId });
    removedPlanFeatureCount = removed.length;
  }

  await dbConn
    .update(companies)
    .set({
      planId: freePlan.id,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionPlanCode: null,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      isFoundingMember: false,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  await grantPlanFeaturesFromPlan(dbConn, companyId, freePlan.id);

  return { removedPlanFeatureCount };
}
