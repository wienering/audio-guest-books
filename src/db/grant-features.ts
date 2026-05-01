import { eq } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import { companyFeatures, planFeatures } from "@/db/schema";

export type GrantPlanFeaturesSource =
  | (typeof companyFeatures.$inferInsert)["source"];

export async function grantPlanFeaturesFromPlan(
  db: AppDbClient,
  companyId: string,
  planId: string
): Promise<void> {
  const rows = await db
    .select({ featureId: planFeatures.featureId })
    .from(planFeatures)
    .where(eq(planFeatures.planId, planId));

  if (rows.length === 0) {
    return;
  }

  await db.insert(companyFeatures).values(
    rows.map((r) => ({
      companyId,
      featureId: r.featureId,
      grantedAt: new Date(),
      expiresAt: null as Date | null,
      source: "plan" as const,
    }))
  ).onConflictDoNothing({
    target: [companyFeatures.companyId, companyFeatures.featureId],
  });
}

export async function grantPlanFeaturesFromPlanWithSource(
  dbConn: AppDbClient,
  companyId: string,
  planId: string,
  source: GrantPlanFeaturesSource
): Promise<void> {
  const rows = await dbConn
    .select({ featureId: planFeatures.featureId })
    .from(planFeatures)
    .where(eq(planFeatures.planId, planId));

  if (rows.length === 0) {
    return;
  }

  await dbConn.insert(companyFeatures).values(
    rows.map((r) => ({
      companyId,
      featureId: r.featureId,
      grantedAt: new Date(),
      expiresAt: null as Date | null,
      source,
    }))
  ).onConflictDoNothing({
    target: [companyFeatures.companyId, companyFeatures.featureId],
  });
}
