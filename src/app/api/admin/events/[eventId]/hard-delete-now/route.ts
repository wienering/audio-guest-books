import { NextResponse } from "next/server";
import pino from "pino";
import { z } from "zod";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndEvent } from "@/lib/admin-event-route-auth";
import {
  eventNameMatches,
  hardDeleteEvent,
} from "@/lib/event-mutations";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const BodySchema = z.object({
  confirmName: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireAdminApiAndEvent(eventId);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, event, company } = gated;

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type the event name to confirm." },
      { status: 400 }
    );
  }

  if (!eventNameMatches(parsed.data.confirmName, event.name)) {
    return NextResponse.json(
      { error: "Confirmation does not match the event name." },
      { status: 400 }
    );
  }

  // Audit BEFORE the row is gone — admin_audit_log keeps the slug/name as
  // metadata even after the foreign key is set to null on hard-delete.
  await logAdminAction({
    adminClerkUserId,
    actionType: "event_hard_deleted",
    description: `Admin hard-deleted event "${event.name}" in ${company.slug}`,
    targetCompanyId: company.id,
    targetCompanySlug: company.slug,
    metadata: {
      event_id: eventId,
      event_slug: event.retailClientSlug,
      event_name: event.name,
      was_soft_deleted_at: event.deletedAt?.toISOString() ?? null,
    },
  });

  try {
    await hardDeleteEvent(db, eventId, log);
  } catch (e) {
    log.error(
      { err: e, eventId },
      "admin hard-delete-now: transaction failed"
    );
    return NextResponse.json(
      { error: "Could not finish deletion. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
