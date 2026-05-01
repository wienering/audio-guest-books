import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { companies, events } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-route-auth";

export type RequireAdminEventOk = {
  adminClerkUserId: string;
  event: typeof events.$inferSelect;
  company: typeof companies.$inferSelect;
};

/**
 * Admin gate that loads the target event and its owning company in one go.
 * Admin sessions can mutate any event regardless of company ownership.
 */
export async function requireAdminApiAndEvent(
  eventId: string
): Promise<RequireAdminEventOk | { error: NextResponse }> {
  const gated = await requireAdminApi();
  if ("error" in gated) return gated;

  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!eventRow) {
    return {
      error: NextResponse.json({ error: "Event not found" }, { status: 404 }),
    };
  }

  const [companyRow] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, eventRow.companyId))
    .limit(1);

  if (!companyRow) {
    return {
      error: NextResponse.json(
        { error: "Owning company not found" },
        { status: 404 }
      ),
    };
  }

  return {
    adminClerkUserId: gated.adminClerkUserId,
    event: eventRow,
    company: companyRow,
  };
}
