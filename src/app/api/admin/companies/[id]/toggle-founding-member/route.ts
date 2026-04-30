import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const gated = await requireAdminApiAndCompany(id);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, company } = gated;

  const next = !company.isFoundingMember;

  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({ isFoundingMember: next, updatedAt: new Date() })
      .where(eq(companies.id, company.id));

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "founding_member_toggled",
      description: `Set is_founding_member=${next} on ${company.slug}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        previous: company.isFoundingMember,
        next,
        note:
          "Stripe pricing is NOT changed automatically — migrate price separately if needed.",
      },
    });
  });

  return NextResponse.json({ ok: true, isFoundingMember: next });
}
