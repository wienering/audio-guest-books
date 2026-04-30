import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { companies, events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { deleteObject, headObject } from "@/lib/r2";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function logoKeyRegex(companyId: string) {
  return new RegExp(
    `^companies/${escapeRe(companyId)}/logo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg|jpeg|svg)$`,
    "i"
  );
}

function coverKeyRegex(eventId: string) {
  return new RegExp(
    `^events/${escapeRe(eventId)}/cover-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg|jpeg|webp)$`,
    "i"
  );
}

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("logo"),
    storage_key: z.string().min(1).max(600),
  }),
  z.object({
    kind: z.literal("cover"),
    event_id: z.string().uuid(),
    storage_key: z.string().min(1).max(600),
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
    if (!logoKeyRegex(membership.company.id).test(body.storage_key)) {
      return NextResponse.json({ error: "Invalid storage key." }, { status: 400 });
    }
    const meta = await headObject(body.storage_key);
    if (!meta) {
      return NextResponse.json(
        { error: "Upload was not found in storage yet." },
        { status: 400 }
      );
    }

    const prev = membership.company.logoStorageKey;
    if (prev && prev !== body.storage_key) {
      try {
        await deleteObject(prev);
      } catch {
        /* ignore */
      }
    }

    await db
      .update(companies)
      .set({
        logoStorageKey: body.storage_key,
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

  if (!coverKeyRegex(body.event_id).test(body.storage_key)) {
    return NextResponse.json({ error: "Invalid storage key." }, { status: 400 });
  }

  const meta = await headObject(body.storage_key);
  if (!meta) {
    return NextResponse.json(
      { error: "Upload was not found in storage yet." },
      { status: 400 }
    );
  }

  const prev = eventRow.coverImageStorageKey;
  if (prev && prev !== body.storage_key) {
    try {
      await deleteObject(prev);
    } catch {
      /* ignore */
    }
  }

  await db
    .update(events)
    .set({
      coverImageStorageKey: body.storage_key,
      updatedAt: new Date(),
    })
    .where(eq(events.id, body.event_id));

  return NextResponse.json({ ok: true });
}
