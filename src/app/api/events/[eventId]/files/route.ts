import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { audioFiles, events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { deleteObject } from "@/lib/r2";

type RouteCtx = { params: Promise<{ eventId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { eventId } = await ctx.params;

  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventRow = await db.query.events.findFirst({
    where: and(
      eq(events.id, eventId),
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
  });

  if (!eventRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.query.audioFiles.findMany({
    where: and(eq(audioFiles.eventId, eventId), isNull(audioFiles.deletedAt)),
  });

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  for (const r of rows) {
    try {
      await deleteObject(r.storageKey);
    } catch (e) {
      console.error("R2 bulk delete failed", e);
      return NextResponse.json(
        { error: "Could not delete all files from storage." },
        { status: 500 }
      );
    }
  }

  const ids = rows.map((r) => r.id);
  await db
    .update(audioFiles)
    .set({ deletedAt: new Date() })
    .where(inArray(audioFiles.id, ids));

  return NextResponse.json({ ok: true, deleted: ids.length });
}
