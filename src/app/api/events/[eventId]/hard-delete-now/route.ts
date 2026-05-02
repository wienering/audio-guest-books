import { NextResponse } from "next/server";
import pino from "pino";
import { z } from "zod";

import { db } from "@/db/index";
import {
  eventNameMatches,
  hardDeleteEvent,
} from "@/lib/event-mutations";
import { requireEventCompanyOwner } from "@/lib/event-route-auth";
import { logImpersonatedDashboardMutation } from "@/lib/impersonation";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const BodySchema = z.object({
  confirmName: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireEventCompanyOwner(eventId);
  if ("error" in gated) return gated.error;
  const { event, membership } = gated;

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

  try {
    await hardDeleteEvent(db, eventId, log);
  } catch (e) {
    log.error(
      { err: e, eventId },
      "company hard-delete-now: transaction failed"
    );
    return NextResponse.json(
      { error: "Could not finish deletion. Please try again." },
      { status: 500 }
    );
  }

  await logImpersonatedDashboardMutation(membership, "hard-deleted event", {
    event_id: eventId,
  });

  return NextResponse.json({ ok: true });
}
