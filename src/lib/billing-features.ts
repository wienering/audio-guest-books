import "server-only";

import type { Stripe } from "stripe";
import { and, eq, inArray } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { grantPlanFeaturesFromPlan } from "@/db/grant-features";
import {
  companies,
  companyFeatures,
  planFeatures,
  plans,
} from "@/db/schema";

import { subscriptionPlanCodeFromStripePriceId } from "@/lib/billing-stripe-price";

async function getPlanIdByCode(
  dbConn: AppDbClient,
  code: string
): Promise<string | undefined> {
  const [row] = await dbConn
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, code))
    .limit(1);
  return row?.id;
}

function unixSecondsToDate(seconds: number | null | undefined): Date | null {
  if (seconds == null) {
    return null;
  }
  return new Date(seconds * 1000);
}

/** Period end is on line items in current Stripe API typings. */
function subscriptionPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const end = sub.items.data[0]?.current_period_end;
  return end ?? null;
}

function primaryPriceId(sub: Stripe.Subscription): string | null {
  const id = sub.items.data[0]?.price?.id;
  return id ?? null;
}

/**
 * Applies an active Stripe subscription to the company: Ultimate plan rows + billing fields.
 */
export async function grantUltimateFeatures(
  dbConn: AppDbClient,
  companyId: string,
  subscription: Stripe.Subscription,
  opts: { isFoundingMember: boolean }
): Promise<{ planCode: string }> {
  const priceId = primaryPriceId(subscription);
  if (!priceId) {
    throw new Error("subscription_missing_price");
  }

  const planCode = subscriptionPlanCodeFromStripePriceId(priceId);
  const ultimatePlanId = await getPlanIdByCode(dbConn, "ultimate");
  if (!ultimatePlanId) {
    throw new Error("ultimate_plan_missing");
  }

  await dbConn
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "plan")
      )
    );

  await grantPlanFeaturesFromPlan(dbConn, companyId, ultimatePlanId);

  await dbConn
    .update(companies)
    .set({
      planId: ultimatePlanId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: unixSecondsToDate(
        subscriptionPeriodEndUnix(subscription)
      ),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      subscriptionPlanCode: planCode,
      isFoundingMember: opts.isFoundingMember,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  return { planCode };
}

/**
 * Removes Ultimate subscription benefits and returns the company to the Free plan.
 * Keeps stripe_customer_id so the same Customer can resubscribe.
 */
export async function revokeUltimateFeatures(
  dbConn: AppDbClient,
  companyId: string
): Promise<void> {
  const ultimatePlanId = await getPlanIdByCode(dbConn, "ultimate");
  const freePlanId = await getPlanIdByCode(dbConn, "free");
  if (!ultimatePlanId || !freePlanId) {
    throw new Error("plan_rows_missing");
  }

  const ultimateFeatureRows = await dbConn
    .select({ featureId: planFeatures.featureId })
    .from(planFeatures)
    .where(eq(planFeatures.planId, ultimatePlanId));

  const featureIds = ultimateFeatureRows.map((r) => r.featureId);
  if (featureIds.length > 0) {
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

  await dbConn
    .update(companies)
    .set({
      planId: freePlanId,
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      subscriptionPlanCode: null,
      isFoundingMember: false,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  await grantPlanFeaturesFromPlan(dbConn, companyId, freePlanId);
}

export async function updateCompanyStripeSubscriptionFields(
  dbConn: AppDbClient,
  companyId: string,
  subscription: Stripe.Subscription
): Promise<{ planCode: string | null; prevStatus: string | null }> {
  const [before] = await dbConn
    .select({ subscriptionStatus: companies.subscriptionStatus })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const priceId = primaryPriceId(subscription);
  const planCode = priceId
    ? subscriptionPlanCodeFromStripePriceId(priceId)
    : null;

  await dbConn
    .update(companies)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: unixSecondsToDate(
        subscriptionPeriodEndUnix(subscription)
      ),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(planCode ? { subscriptionPlanCode: planCode } : {}),
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  return {
    planCode,
    prevStatus: before?.subscriptionStatus ?? null,
  };
}
