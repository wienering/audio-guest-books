import { NextResponse } from "next/server";

import { requireOwnerBilling } from "@/lib/billing-route-auth";
import {
  deriveEffectiveSubscriptionPlanCode,
  isComplimentarySubscriptionActiveNow,
  isStripePaidSubscriptionActive,
} from "@/lib/comp-subscription-utils";

function isPaidStripeSubscription(
  status: string | null | undefined
): boolean {
  if (!status) return false;
  return status === "active" || status === "trialing";
}

export async function GET(): Promise<Response> {
  const gated = await requireOwnerBilling();
  if ("error" in gated) {
    return gated.error;
  }
  const { membership } = gated;
  const company = membership.company;
  const planCode = company.plan?.code ?? "unknown";
  const stripePaid = isStripePaidSubscriptionActive(company);
  const complimentaryActiveNow = isComplimentarySubscriptionActiveNow({
    compSubscriptionPlanCode: company.compSubscriptionPlanCode,
    compSubscriptionExpiresAt: company.compSubscriptionExpiresAt,
  });
  const complimentaryBillingOnly = complimentaryActiveNow && !stripePaid;

  return NextResponse.json({
    planCode,
    subscriptionStatus: company.subscriptionStatus,
    subscriptionCurrentPeriodEnd:
      company.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
    subscriptionCancelAtPeriodEnd: company.subscriptionCancelAtPeriodEnd,
    isFoundingMember: company.isFoundingMember,
    subscriptionPlanCode: company.subscriptionPlanCode,
    stripeSubscriptionId: company.stripeSubscriptionId,
    isPaid: isPaidStripeSubscription(company.subscriptionStatus),
    effectiveSubscriptionPlanCode: deriveEffectiveSubscriptionPlanCode({
      stripeSubscriptionId: company.stripeSubscriptionId,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionPlanCode: company.subscriptionPlanCode,
      compSubscriptionPlanCode: company.compSubscriptionPlanCode,
      compSubscriptionExpiresAt: company.compSubscriptionExpiresAt,
    }),
    hasStripePaidSubscription: stripePaid,
    complimentarySubscriptionActive: complimentaryBillingOnly,
    compSubscriptionExpiresAt:
      company.compSubscriptionExpiresAt?.toISOString() ?? null,
    compSubscriptionPlanCode: company.compSubscriptionPlanCode,
  });
}
