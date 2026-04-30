import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import { getStripe } from "@/lib/stripe";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const gated = await requireAdminApiAndCompany(id);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, company } = gated;

  if (!company.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Company has no active Stripe subscription" },
      { status: 409 }
    );
  }

  const stripe = getStripe();

  try {
    const canceled = await stripe.subscriptions.cancel(
      company.stripeSubscriptionId,
      { invoice_now: false, prorate: false }
    );

    await db.transaction(async (tx) => {
      await logAdminAction({
        dbConn: tx,
        adminClerkUserId,
        actionType: "subscription_canceled",
        description: `Admin canceled Stripe subscription for ${company.slug} (${company.stripeSubscriptionId})`,
        targetCompanyId: company.id,
        targetCompanySlug: company.slug,
        metadata: {
          stripe_subscription_id: company.stripeSubscriptionId,
          previous_status: company.subscriptionStatus,
          new_status: canceled.status,
          plan_code_at_cancel: company.subscriptionPlanCode,
          immediate: true,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      stripeStatus: canceled.status,
      note:
        "Cancellation request accepted by Stripe. Webhook will fully sync the company state.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/cancel-subscription] Stripe cancel failed", {
      companyId: company.id,
      stripeSubscriptionId: company.stripeSubscriptionId,
      message: msg,
    });
    return NextResponse.json(
      { error: `Stripe cancel failed: ${msg}` },
      { status: 502 }
    );
  }
}
