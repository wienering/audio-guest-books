import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndEvent } from "@/lib/admin-event-route-auth";
import { softDeleteEvent } from "@/lib/event-mutations";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireAdminApiAndEvent(eventId);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, event, company } = gated;

  if (event.deletedAt) {
    return NextResponse.json(
      { error: "Event is already deleted." },
      { status: 409 }
    );
  }

  const result = await db.transaction(async (tx) => {
    const r = await softDeleteEvent(tx, eventId);
    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "event_soft_deleted",
      description: `Admin soft-deleted event "${event.name}" in ${company.slug}; hard-delete on ${r.hardDeleteAfter
        .toISOString()
        .slice(0, 10)}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        event_id: eventId,
        event_slug: event.retailClientSlug,
        event_name: event.name,
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
