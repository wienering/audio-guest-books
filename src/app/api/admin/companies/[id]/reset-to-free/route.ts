import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { resetCompanyToFree } from "@/lib/admin-company-mutations";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";

const BodySchema = z.object({
  acknowledged: z.literal(true),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const gated = await requireAdminApiAndCompany(id);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, company } = gated;

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Acknowledgement required" },
      { status: 400 }
    );
  }

  try {
    await db.transaction(async (tx) => {
      const r = await resetCompanyToFree(tx, company.id);
      await logAdminAction({
        dbConn: tx,
        adminClerkUserId,
        actionType: "plan_changed",
        description: `Admin reset ${company.slug} to Free (cleared Stripe state, removed ${r.removedPlanFeatureCount} plan features)`,
        targetCompanyId: company.id,
        targetCompanySlug: company.slug,
        metadata: {
          previous_plan_id: company.planId,
          previous_subscription_status: company.subscriptionStatus,
          previous_subscription_plan_code: company.subscriptionPlanCode,
          previous_stripe_customer_id: company.stripeCustomerId,
          previous_stripe_subscription_id: company.stripeSubscriptionId,
          removed_plan_feature_count: r.removedPlanFeatureCount,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "free_plan_missing") {
      return NextResponse.json(
        { error: "Free plan row is missing — re-run db:seed" },
        { status: 500 }
      );
    }
    console.error("[admin/reset-to-free] failed", {
      companyId: company.id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Reset to Free failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
