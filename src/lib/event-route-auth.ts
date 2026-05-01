import "server-only";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { getMembershipWithCompany, type MembershipWithCompany } from "@/lib/company";

export type RequireEventOwnerOk = {
  membership: MembershipWithCompany;
  event: typeof events.$inferSelect;
};

/**
 * Resolves Clerk auth + company membership + the target event in one shot.
 * Loads soft-deleted events too so restore/edit-on-deleted flows can use the
 * same gate (filter `event.deletedAt` at the call site if needed).
 */
export async function requireEventCompanyOwner(
  eventId: string
): Promise<RequireEventOwnerOk | { error: NextResponse }> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.companyId, membership.company.id)),
  });

  if (!event) {
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { membership, event };
}
