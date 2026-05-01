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
import {
  assignCompanyFreePlanTier,
} from "@/lib/billing-plan-state";
import { tryApplyComplimentaryAfterStripeCancelled } from "@/lib/comp-subscription";

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

  const ultimateFeatureRows = await dbConn
    .select({ featureId: planFeatures.featureId })
    .from(planFeatures)
    .where(eq(planFeatures.planId, ultimatePlanId));

  const compFeatureIds = ultimateFeatureRows.map((r) => r.featureId);
  if (compFeatureIds.length > 0) {
    await dbConn
      .delete(companyFeatures)
      .where(
        and(
          eq(companyFeatures.companyId, companyId),
          eq(companyFeatures.source, "comp_subscription"),
          inArray(companyFeatures.featureId, compFeatureIds)
        )
      );
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
 * Removes Ultimate subscription benefits (Stripe + plan-sourced Ultimate features).
 * If a complimentary subscription is still active on the company row, applies that
 * tier instead of Free. Otherwise returns the company to the Free plan.
 * Keeps stripe_customer_id so the same Customer can resubscribe.
 */
export async function revokeUltimateFeatures(
  dbConn: AppDbClient,
  companyId: string
): Promise<void> {
  await dbConn.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!before) {
      throw new Error("company_not_found");
    }

    await tx
      .update(companies)
      .set({
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: null,
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    const applied = await tryApplyComplimentaryAfterStripeCancelled(
      tx,
      companyId,
      before
    );
    if (applied) {
      return;
    }

    await assignCompanyFreePlanTier(tx, companyId);
  });
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
