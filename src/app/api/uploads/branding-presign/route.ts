import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignPutUrl } from "@/lib/r2";
import { and, eq, isNull } from "drizzle-orm";

const LOGO_MAX = 5 * 1024 * 1024;
const COVER_MAX = 10 * 1024 * 1024;

const LOGO_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
]);

const COVER_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function logoExtension(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  return null;
}

function coverExtension(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
}

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("logo"),
    filename: z.string().min(1).max(500),
    mime_type: z.string().min(1).max(120),
    size: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("cover"),
    event_id: z.string().uuid(),
    filename: z.string().min(1).max(500),
    mime_type: z.string().min(1).max(120),
    size: z.number().int().positive(),
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

  const allowedBranding = await companyHasFeatureKey(
    membership.company.id,
    "custom_branding"
  );

  const body = parsed.data;

  if (body.kind === "logo") {
    if (!allowedBranding) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.size > LOGO_MAX) {
      return NextResponse.json(
        { error: "Logo must be 5 MB or smaller." },
        { status: 413 }
      );
    }
    if (!LOGO_MIMES.has(body.mime_type)) {
      return NextResponse.json(
        { error: "Logo must be PNG, JPG, or SVG." },
        { status: 400 }
      );
    }
    const ext = logoExtension(body.mime_type);
    if (!ext) {
      return NextResponse.json({ error: "Unsupported logo format." }, { status: 400 });
    }
    const objectId = randomUUID();
    const storageKey = `companies/${membership.company.id}/logo-${objectId}.${ext}`;
    let putUrl: string;
    try {
      putUrl = await presignPutUrl({
        key: storageKey,
        contentType: body.mime_type,
      });
    } catch (e) {
      console.error("branding logo presign", e);
      return NextResponse.json(
        { error: "Storage configuration error." },
        { status: 500 }
      );
    }
    return NextResponse.json({ putUrl, storageKey, kind: "logo" as const });
  }

  // cover
  if (!allowedBranding) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  if (body.size > COVER_MAX) {
    return NextResponse.json(
      { error: "Cover image must be 10 MB or smaller." },
      { status: 413 }
    );
  }

  if (!COVER_MIMES.has(body.mime_type)) {
    return NextResponse.json(
      { error: "Cover must be PNG, JPG, or WebP." },
      { status: 400 }
    );
  }

  const ext = coverExtension(body.mime_type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported cover format." }, { status: 400 });
  }

  const objectId = randomUUID();
  const storageKey = `events/${body.event_id}/cover-${objectId}.${ext}`;
  let putUrl: string;
  try {
    putUrl = await presignPutUrl({
      key: storageKey,
      contentType: body.mime_type,
    });
  } catch (e) {
    console.error("branding cover presign", e);
    return NextResponse.json(
      { error: "Storage configuration error." },
      { status: 500 }
    );
  }

  return NextResponse.json({ putUrl, storageKey, kind: "cover" as const });
}
