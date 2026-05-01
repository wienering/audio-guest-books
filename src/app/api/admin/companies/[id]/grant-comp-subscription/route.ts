import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import { grantCompSubscription } from "@/lib/comp-subscription";
import { isStripePaidSubscriptionActive } from "@/lib/comp-subscription-utils";

const BodySchema = z.object({
  planCode: z.enum(["pro_comp", "ultimate_comp"]),
  expiresAt: z
    .union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ])
    .optional()
    .nullable(),
  notes: z.string().max(8000).optional().nullable(),
});

function parseExpiryInput(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) {
    return null;
  }
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    return new Date(
      Date.UTC(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999)
    );
  }
  return new Date(t);
}

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

  const stripeOverlap = isStripePaidSubscriptionActive(company);

  await grantCompSubscription({
    companyId: company.id,
    planCode: parsed.data.planCode,
    expiresAt: parseExpiryInput(parsed.data.expiresAt ?? null),
    notes: parsed.data.notes ?? null,
    adminId: adminClerkUserId,
  });

  return NextResponse.json({
    ok: true,
    warningOverlappingStripePaidSubscription: stripeOverlap,
  });
}
