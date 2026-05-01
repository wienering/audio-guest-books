import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { grantPlanFeaturesFromPlan } from "@/db/grant-features";
import { companies, companyFeatures, planFeatures, plans } from "@/db/schema";

export async function deletePlanSourcedFeaturesForPlan(
  dbConn: AppDbClient,
  companyId: string,
  planId: string
): Promise<void> {
  const rows = await dbConn
    .select({ featureId: planFeatures.featureId })
    .from(planFeatures)
    .where(eq(planFeatures.planId, planId));

  const featureIds = rows.map((r) => r.featureId);
  if (featureIds.length === 0) {
    return;
  }

  await dbConn
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "plan"),
        inArray(companyFeatures.featureId, featureIds)
      )
    );
}

export async function deleteAllPlanSourcedCompanyFeatures(
  dbConn: AppDbClient,
  companyId: string
): Promise<void> {
  await dbConn
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "plan")
      )
    );
}

/**
 * Clears paid subscription fields and assigns the Free plan + plan-sourced Free features.
 * Keeps stripe_customer_id (same as legacy revokeUltimateFeatures free path).
 */
export async function assignCompanyFreePlanTier(
  dbConn: AppDbClient,
  companyId: string
): Promise<void> {
  const [freePlan] = await dbConn
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, "free"))
    .limit(1);

  if (!freePlan) {
    throw new Error("free_plan_missing");
  }

  await deleteAllPlanSourcedCompanyFeatures(dbConn, companyId);

  await dbConn
    .update(companies)
    .set({
      planId: freePlan.id,
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      subscriptionPlanCode: null,
      isFoundingMember: false,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  await grantPlanFeaturesFromPlan(dbConn, companyId, freePlan.id);
}
