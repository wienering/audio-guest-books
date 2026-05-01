import "server-only";

import { and, eq } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { db } from "@/db/index";
import { grantPlanFeaturesFromPlanWithSource } from "@/db/grant-features";
import { companies, companyFeatures, plans } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-audit";
import { clearComplimentarySubscriptionState } from "@/lib/comp-subscription-revoke-core";
import {
  type CompSubscriptionPlanCode,
  mapCompSubscriptionToPlanRowCode,
  parseCompSubscriptionPlanCode,
  isStripePaidSubscriptionActive,
  isComplimentarySubscriptionActiveNow,
  deriveEffectiveSubscriptionPlanCode,
  isComplimentarySubscriptionDisplayCode,
  COMP_SUBSCRIPTION_PLAN_CODES,
} from "@/lib/comp-subscription-utils";

export {
  type CompSubscriptionPlanCode,
  COMP_SUBSCRIPTION_PLAN_CODES,
  parseCompSubscriptionPlanCode,
  mapCompSubscriptionToPlanRowCode,
  isStripePaidSubscriptionActive,
  isComplimentarySubscriptionActiveNow,
  deriveEffectiveSubscriptionPlanCode,
  isComplimentarySubscriptionDisplayCode,
};

async function getPlanIdByRowCode(
  dbConn: AppDbClient,
  code: "pro" | "ultimate"
): Promise<string> {
  const [row] = await dbConn
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, code))
    .limit(1);
  if (!row) {
    throw new Error(`plan_missing_${code}`);
  }
  return row.id;
}

export async function upsertComplimentaryBenefitsInsideTx(
  tx: AppDbClient,
  companyId: string,
  plansTableCode: "pro" | "ultimate",
  subscriptionPlanDisplayCode: CompSubscriptionPlanCode
): Promise<void> {
  const planId = await getPlanIdByRowCode(tx, plansTableCode);

  await tx
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "plan")
      )
    );

  await tx
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "comp_subscription")
      )
    );

  await grantPlanFeaturesFromPlanWithSource(
    tx,
    companyId,
    planId,
    "comp_subscription"
  );

  await tx
    .update(companies)
    .set({
      planId,
      subscriptionStatus: "active",
      subscriptionPlanCode: subscriptionPlanDisplayCode,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

export async function tryApplyComplimentaryAfterStripeCancelled(
  tx: AppDbClient,
  companyId: string,
  snapshot: typeof companies.$inferSelect
): Promise<boolean> {
  const code = parseCompSubscriptionPlanCode(
    snapshot.compSubscriptionPlanCode
  );
  if (!code || !isComplimentarySubscriptionActiveNow(snapshot)) {
    return false;
  }
  await upsertComplimentaryBenefitsInsideTx(
    tx,
    companyId,
    mapCompSubscriptionToPlanRowCode(code),
    code
  );
  return true;
}

export async function grantCompSubscription(opts: {
  dbConn?: AppDbClient;
  companyId: string;
  planCode: CompSubscriptionPlanCode;
  expiresAt: Date | null;
  adminId: string;
  notes?: string | null;
}): Promise<void> {
  const conn = opts.dbConn ?? db;
  const now = new Date();

  await conn.transaction(async (tx) => {
    const [company] = await tx
      .select()
      .from(companies)
      .where(eq(companies.id, opts.companyId))
      .limit(1);
    if (!company) {
      throw new Error("company_not_found");
    }

    const stripePaid = isStripePaidSubscriptionActive(company);
    const plansTableCode = mapCompSubscriptionToPlanRowCode(opts.planCode);

    await tx
      .update(companies)
      .set({
        compSubscriptionPlanCode: opts.planCode,
        compSubscriptionGrantedAt: now,
        compSubscriptionGrantedByAdminId: opts.adminId,
        compSubscriptionExpiresAt: opts.expiresAt,
        compSubscriptionNotes: opts.notes ?? null,
        updatedAt: now,
      })
      .where(eq(companies.id, opts.companyId));

    if (!stripePaid) {
      await upsertComplimentaryBenefitsInsideTx(
        tx,
        opts.companyId,
        plansTableCode,
        opts.planCode
      );
    }

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId: opts.adminId,
      actionType: "comp_subscription_granted",
      description: `Complimentary ${opts.planCode}${
        opts.expiresAt
          ? ` (expires ${opts.expiresAt.toISOString()})`
          : " (no expiry)"
      }`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        plan_code: opts.planCode,
        expires_at: opts.expiresAt?.toISOString() ?? null,
        notes: opts.notes ?? null,
        overlapping_stripe_paid_subscription: stripePaid,
      },
    });
  });
}

export async function extendCompSubscription(opts: {
  dbConn?: AppDbClient;
  companyId: string;
  newExpiresAt: Date;
  adminId: string;
}): Promise<void> {
  const conn = opts.dbConn ?? db;

  await conn.transaction(async (tx) => {
    const [company] = await tx
      .select()
      .from(companies)
      .where(eq(companies.id, opts.companyId))
      .limit(1);
    if (!company) {
      throw new Error("company_not_found");
    }
    if (!company.compSubscriptionPlanCode) {
      throw new Error("no_complimentary_subscription");
    }

    await tx
      .update(companies)
      .set({
        compSubscriptionExpiresAt: opts.newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, opts.companyId));

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId: opts.adminId,
      actionType: "comp_subscription_extended",
      description: `Complimentary subscription extended to ${opts.newExpiresAt.toISOString()}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        new_expires_at: opts.newExpiresAt.toISOString(),
      },
    });
  });
}

export async function revokeCompSubscription(opts: {
  dbConn?: AppDbClient;
  companyId: string;
  adminClerkUserId: string;
  reason?: string | null;
  revocationNotes?: string | null;
}): Promise<void> {
  const conn = opts.dbConn ?? db;

  await conn.transaction(async (tx) => {
    const res = await clearComplimentarySubscriptionState(tx, opts.companyId);
    if (res.kind === "noop") {
      return;
    }

    const meta = {
      previous_plan_code: res.previousPlanCode,
      previous_expires_at: res.previousExpiresAt?.toISOString() ?? null,
      reason: opts.reason ?? null,
      notes: opts.revocationNotes ?? null,
    };

    const description = `Complimentary subscription revoked${
      opts.reason ? `: ${opts.reason}` : ""
    }`;
    const note = opts.revocationNotes?.trim();

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId: opts.adminClerkUserId,
      actionType: "comp_subscription_revoked",
      description: note ? `${description} Notes: ${note}` : description,
      targetCompanyId: res.company.id,
      targetCompanySlug: res.company.slug,
      metadata: meta,
    });
  });
}
