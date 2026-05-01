import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndEvent } from "@/lib/admin-event-route-auth";
import { restoreEvent } from "@/lib/event-mutations";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireAdminApiAndEvent(eventId);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, event, company } = gated;

  if (!event.deletedAt) {
    return NextResponse.json(
      { error: "Event is not deleted." },
      { status: 409 }
    );
  }

  const result = await db.transaction(async (tx) => {
    const r = await restoreEvent(tx, eventId, {
      companyId: event.companyId,
      retailClientSlug: event.retailClientSlug,
    });
    if (!r.ok) return r;

    await logAdminAction({
      dbConn: tx,
      adminClerkUserId,
      actionType: "event_restored",
      description: `Admin restored event "${event.name}" in ${company.slug}`,
      targetCompanyId: company.id,
      targetCompanySlug: company.slug,
      metadata: {
        event_id: eventId,
        event_slug: event.retailClientSlug,
        event_name: event.name,
        was_hard_delete_after:
          event.hardDeleteAfter instanceof Date
            ? event.hardDeleteAfter.toISOString().slice(0, 10)
            : (event.hardDeleteAfter ?? null),
      },
    });

    return r;
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          "Another active event is using this slug now. Edit one to free the slug first.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
