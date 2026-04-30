import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { markCompanyDeleted } from "@/lib/admin-company-mutations";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";

const BodySchema = z.object({
  /**
   * Defense-in-depth: client must pass the slug it intends to soft-delete.
   * Prevents stale UI / fat-finger mishaps when the URL path uses a UUID.
   */
  confirmSlug: z.string().min(1),
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

  if (parsed.data.confirmSlug.trim().toLowerCase() !== company.slug) {
    return NextResponse.json(
      { error: "Slug confirmation does not match" },
      { status: 400 }
    );
  }

  if (company.deletedAt) {
    return NextResponse.json(
      { error: "Company is already soft-deleted" },
      { status: 409 }
    );
  }

  const result = await db.transaction(async (tx) => {
    const r = await markCompanyDeleted(tx, company.id, adminClerkUserId);
    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "company_soft_deleted",
      description: `Admin soft-deleted ${company.slug}; hard-delete on ${r.hardDeleteAfter
        .toISOString()
        .slice(0, 10)}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        hard_delete_after: r.hardDeleteAfter.toISOString().slice(0, 10),
      },
    });
    return r;
  });

  return NextResponse.json({
    ok: true,
    hardDeleteAfter: result.hardDeleteAfter.toISOString().slice(0, 10),
  });
}
