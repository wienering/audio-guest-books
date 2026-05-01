import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { softDeleteEvent } from "@/lib/event-mutations";
import { requireEventCompanyOwner } from "@/lib/event-route-auth";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireEventCompanyOwner(eventId);
  if ("error" in gated) return gated.error;
  const { event } = gated;

  if (event.deletedAt) {
    return NextResponse.json(
      { error: "Event is already deleted." },
      { status: 409 }
    );
  }

  const { hardDeleteAfter } = await softDeleteEvent(db, eventId);

  return NextResponse.json({
    ok: true,
    hardDeleteAfter: hardDeleteAfter.toISOString().slice(0, 10),
  });
}
