import { NextResponse } from "next/server";
import pino from "pino";
import { z } from "zod";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { scheduleHardDeleteNow } from "@/lib/admin-company-mutations";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import { runRetentionScheduler } from "@/lib/retention-scheduler";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const BodySchema = z.object({
  confirmSlug: z.string().min(1),
  acknowledged: z.literal(true),
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
    return NextResponse.json(
      { error: "Slug confirmation and acknowledgement required" },
      { status: 400 }
    );
  }

  if (parsed.data.confirmSlug.trim().toLowerCase() !== company.slug) {
    return NextResponse.json(
      { error: "Slug confirmation does not match" },
      { status: 400 }
    );
  }

  await db.transaction(async (tx) => {
    const r = await scheduleHardDeleteNow(tx, company.id, adminClerkUserId);
    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "company_hard_delete_now",
      description: `Admin override: scheduled immediate hard-delete for ${company.slug}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        forced_hard_delete_after: r.hardDeleteAfter.toISOString().slice(0, 10),
        was_deleted_at: company.deletedAt?.toISOString() ?? null,
      },
    });
  });

  try {
    await runRetentionScheduler(db, log);
  } catch (e) {
    console.error("[admin/hard-delete-now] retention scheduler failed", {
      companyId: company.id,
      slug: company.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "Hard-delete scheduled, but retention scheduler failed. Run manually to complete.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
