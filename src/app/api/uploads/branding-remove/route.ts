import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { companies, events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { deleteObject } from "@/lib/r2";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("logo") }),
  z.object({
    kind: z.literal("cover"),
    event_id: z.string().uuid(),
  }),
]);

export async function POST(req: Request) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branding = await companyHasFeatureKey(
    membership.company.id,
    "custom_branding"
  );
  if (!branding) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = parsed.data;

  if (body.kind === "logo") {
    const key = membership.company.logoStorageKey;
    if (key) {
      try {
        await deleteObject(key);
      } catch {
        /* ignore */
      }
    }
    await db
      .update(companies)
      .set({
        logoStorageKey: null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, membership.company.id));

    return NextResponse.json({ ok: true });
  }

  const eventRow = await db.query.events.findFirst({
    where: and(
      eq(events.id, body.event_id),
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
  });

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const key = eventRow.coverImageStorageKey;
  if (key) {
    try {
      await deleteObject(key);
    } catch {
      /* ignore */
    }
  }

  await db
    .update(events)
    .set({
      coverImageStorageKey: null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, body.event_id));

  return NextResponse.json({ ok: true });
}
