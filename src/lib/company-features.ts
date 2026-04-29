import "server-only";

import { and, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/db/index";
import { companyFeatures, features } from "@/db/schema";

export async function companyHasFeatureKey(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select({ id: features.id })
    .from(companyFeatures)
    .innerJoin(features, eq(companyFeatures.featureId, features.id))
    .where(
      and(
        eq(companyFeatures.companyId, companyId),
        eq(features.key, featureKey),
        or(
          isNull(companyFeatures.expiresAt),
          gt(companyFeatures.expiresAt, now)
        )
      )
    )
    .limit(1);
  return rows.length > 0;
}
