import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { audioFiles } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { deleteObject } from "@/lib/r2";

type RouteCtx = { params: Promise<{ fileId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { fileId } = await ctx.params;

  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await db.query.audioFiles.findFirst({
    where: and(eq(audioFiles.id, fileId), isNull(audioFiles.deletedAt)),
    with: { event: true },
  });

  if (!row || row.event.companyId !== membership.company.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.event.deletedAt) {
    return NextResponse.json({ error: "Event not available" }, { status: 400 });
  }

  try {
    await deleteObject(row.storageKey);
  } catch (e) {
    console.error("R2 delete failed", e);
    return NextResponse.json(
      { error: "Could not delete file from storage." },
      { status: 500 }
    );
  }

  await db
    .update(audioFiles)
    .set({ deletedAt: new Date() })
    .where(eq(audioFiles.id, row.id));

  return NextResponse.json({ ok: true });
}
