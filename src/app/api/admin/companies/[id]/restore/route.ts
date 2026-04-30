import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { restoreCompany } from "@/lib/admin-company-mutations";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const gated = await requireAdminApiAndCompany(id);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, company } = gated;

  const wasDeletedAt = company.deletedAt;
  if (!wasDeletedAt) {
    return NextResponse.json(
      { error: "Company is not soft-deleted" },
      { status: 409 }
    );
  }

  await db.transaction(async (tx) => {
    await restoreCompany(tx, company.id);
    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "company_undeleted",
      description: `Admin restored ${company.slug}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        was_deleted_at: wasDeletedAt.toISOString(),
        was_hard_delete_after:
          company.hardDeleteAfter instanceof Date
            ? company.hardDeleteAfter.toISOString().slice(0, 10)
            : company.hardDeleteAfter ?? null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
