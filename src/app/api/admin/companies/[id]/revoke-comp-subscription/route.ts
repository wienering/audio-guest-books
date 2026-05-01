import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import { revokeCompSubscription } from "@/lib/comp-subscription";

const BodySchema = z.object({
  reason: z.string().max(2000).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const gated = await requireAdminApiAndCompany(id);
  if ("error" in gated) {
    return gated.error;
  }
  const { adminClerkUserId, company } = gated;

  if (company.deletedAt != null) {
    return NextResponse.json(
      { error: "Company is soft-deleted." },
      { status: 400 }
    );
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await revokeCompSubscription({
    companyId: company.id,
    adminClerkUserId,
    reason: parsed.data.reason ?? null,
    revocationNotes: parsed.data.notes ?? null,
  });

  return NextResponse.json({ ok: true });
}
