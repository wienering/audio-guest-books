import { and, eq } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { companies, companyFeatures } from "@/db/schema";
import { assignCompanyFreePlanTier } from "@/lib/billing-plan-state";
import {
  type CompSubscriptionPlanCode,
  parseCompSubscriptionPlanCode,
  isStripePaidSubscriptionActive,
} from "@/lib/comp-subscription-utils";

export type RevokeComplimentaryResult =
  | { kind: "noop" }
  | {
      kind: "cleared";
      company: typeof companies.$inferSelect;
      stripePaid: boolean;
      previousPlanCode: CompSubscriptionPlanCode;
      previousExpiresAt: Date | null;
    };

/** Shared DB mutations for complimentary revoke (manual or scheduler). Caller logs audit. */
export async function clearComplimentarySubscriptionState(
  dbConn: AppDbClient,
  companyId: string
): Promise<RevokeComplimentaryResult> {
  const [company] = await dbConn
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) {
    throw new Error("company_not_found");
  }

  const code = parseCompSubscriptionPlanCode(
    company.compSubscriptionPlanCode
  );
  if (!code) {
    return { kind: "noop" };
  }

  const stripePaid = isStripePaidSubscriptionActive(company);

  await dbConn
    .delete(companyFeatures)
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(companyFeatures.source, "comp_subscription")
      )
    );

  await dbConn
    .update(companies)
    .set({
      compSubscriptionPlanCode: null,
      compSubscriptionGrantedAt: null,
      compSubscriptionGrantedByAdminId: null,
      compSubscriptionExpiresAt: null,
      compSubscriptionNotes: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  if (!stripePaid) {
    await assignCompanyFreePlanTier(dbConn, companyId);
  }

  return {
    kind: "cleared",
    company,
    stripePaid,
    previousPlanCode: code,
    previousExpiresAt: company.compSubscriptionExpiresAt,
  };
}
