import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { restoreEvent } from "@/lib/event-mutations";
import { requireEventCompanyOwner } from "@/lib/event-route-auth";
import { logImpersonatedDashboardMutation } from "@/lib/impersonation";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireEventCompanyOwner(eventId);
  if ("error" in gated) return gated.error;
  const { event, membership } = gated;

  if (!event.deletedAt) {
    return NextResponse.json(
      { error: "Event is not deleted." },
      { status: 409 }
    );
  }

  const result = await restoreEvent(db, eventId, {
    companyId: event.companyId,
    retailClientSlug: event.retailClientSlug,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          "Another active event is using this slug now. Edit one to free the slug, then try again.",
      },
      { status: 409 }
    );
  }

  await logImpersonatedDashboardMutation(membership, "restored event", {
    event_id: eventId,
  });

  return NextResponse.json({ ok: true });
}
