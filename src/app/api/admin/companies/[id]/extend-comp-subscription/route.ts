import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import { extendCompSubscription } from "@/lib/comp-subscription";

const BodySchema = z.object({
  expiresAt: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ]),
});

function parseExpiryInput(raw: string): Date {
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

  try {
    await extendCompSubscription({
      companyId: company.id,
      newExpiresAt: parseExpiryInput(parsed.data.expiresAt),
      adminId: adminClerkUserId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "no_complimentary_subscription") {
      return NextResponse.json(
        { error: "No active complimentary subscription." },
        { status: 400 }
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
