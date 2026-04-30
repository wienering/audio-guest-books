import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { companyFeatures } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-audit";
import { findFeatureByKey } from "@/lib/admin-company-detail";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";

const BodySchema = z.object({
  featureKey: z.string().min(1),
  source: z.enum(["admin_grant", "founding_member"]).optional(),
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const feature = await findFeatureByKey(parsed.data.featureKey);
  if (!feature) {
    return NextResponse.json(
      { error: `Unknown feature: ${parsed.data.featureKey}` },
      { status: 400 }
    );
  }

  const source = parsed.data.source ?? "admin_grant";

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ source: companyFeatures.source })
      .from(companyFeatures)
      .where(
        and(
          eq(companyFeatures.companyId, company.id),
          eq(companyFeatures.featureId, feature.id)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.source !== source) {
        await tx
          .update(companyFeatures)
          .set({ source, grantedAt: new Date() })
          .where(
            and(
              eq(companyFeatures.companyId, company.id),
              eq(companyFeatures.featureId, feature.id)
            )
          );
      }
    } else {
      await tx.insert(companyFeatures).values({
        companyId: company.id,
        featureId: feature.id,
        source,
        grantedAt: new Date(),
      });
    }

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "feature_granted",
      description: `Granted feature “${feature.name}” (${feature.key}) to ${company.slug} as ${source}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        feature_key: feature.key,
        feature_id: feature.id,
        source,
        previous_source: existing?.source ?? null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
