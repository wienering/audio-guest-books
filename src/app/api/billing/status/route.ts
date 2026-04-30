import { NextResponse } from "next/server";

import { requireOwnerBilling } from "@/lib/billing-route-auth";

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
  });
}
