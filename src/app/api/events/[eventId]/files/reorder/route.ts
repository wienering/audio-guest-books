import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { audioFiles, events } from "@/db/schema";
import { companyHasFeatureKey } from "@/lib/company-features";
import { getMembershipWithCompany } from "@/lib/company";

const bodySchema = z.object({
  originalFileIds: z.array(z.string().uuid()),
});

type RouteCtx = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
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

  const canReorder = await companyHasFeatureKey(
    membership.company.id,
    "drag_reorder_files"
  );
  if (!canReorder) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { originalFileIds } = parsed.data;

  const originals = await db.query.audioFiles.findMany({
    where: and(
      eq(audioFiles.eventId, eventId),
      eq(audioFiles.isOriginal, true),
      isNull(audioFiles.deletedAt)
    ),
    columns: { id: true },
  });

  const idSet = new Set(originals.map((r) => r.id));
  if (originalFileIds.length !== idSet.size) {
    return NextResponse.json(
      { error: "Must include every source file exactly once." },
      { status: 400 }
    );
  }
  for (const id of originalFileIds) {
    if (!idSet.has(id)) {
      return NextResponse.json({ error: "Unknown file id." }, { status: 400 });
    }
  }

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < originalFileIds.length; i++) {
        const id = originalFileIds[i]!;
        await tx
          .update(audioFiles)
          .set({ displayOrder: i })
          .where(and(eq(audioFiles.id, id), eq(audioFiles.eventId, eventId)));

        await tx
          .update(audioFiles)
          .set({ displayOrder: i })
          .where(
            and(
              eq(audioFiles.derivedFromId, id),
              eq(audioFiles.eventId, eventId),
              isNull(audioFiles.deletedAt)
            )
          );
      }
    });
  } catch (e) {
    console.error("audio file reorder", e);
    return NextResponse.json({ error: "Could not save order." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
