import { eq } from "drizzle-orm";

import type { AppDatabase } from "@/db/index";
import { companyFeatures, planFeatures } from "@/db/schema";

export async function grantPlanFeaturesFromPlan(
  db: AppDatabase,
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
  );
}
