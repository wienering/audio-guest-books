import { auth } from "@clerk/nextjs/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { audioFiles, events } from "@/db/schema";
import {
  formatNotAllowedMessage,
  isExtensionAllowedForPlan,
  MAX_UPLOAD_BYTES,
  normalizeExtension,
} from "@/lib/audio-upload-policy";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignPutUrl, sanitizeFilenameForKey } from "@/lib/r2";

const bodySchema = z.object({
  filename: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(200),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES),
  event_id: z.string().uuid(),
});

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

  const { filename, mime_type, size, event_id } = parsed.data;

  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File must be 100 MB or smaller." },
      { status: 413 }
    );
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventRow = await db.query.events.findFirst({
    where: and(
      eq(events.id, event_id),
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
  });

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const ext = normalizeExtension(filename);
  if (!ext) {
    return NextResponse.json(
      { error: "Could not determine file type from the name." },
      { status: 400 }
    );
  }

  const allowUltimateFormats = await companyHasFeatureKey(
    membership.company.id,
    "audio_transcoding"
  );

  if (!isExtensionAllowedForPlan(ext, allowUltimateFormats)) {
    return NextResponse.json(
      { error: formatNotAllowedMessage(ext) },
      { status: 400 }
    );
  }

  const planLimit = membership.company.plan.fileLimitPerEvent;
  const [agg] = await db
    .select({ n: count() })
    .from(audioFiles)
    .where(
      and(eq(audioFiles.eventId, event_id), isNull(audioFiles.deletedAt))
    );

  const fileCount = Number(agg?.n ?? 0);
  if (planLimit !== null && fileCount >= planLimit) {
    return NextResponse.json(
      { error: `Your plan allows up to ${planLimit} files per event.` },
      { status: 403 }
    );
  }

  const orderRows = await db
    .select({ displayOrder: audioFiles.displayOrder })
    .from(audioFiles)
    .where(
      and(eq(audioFiles.eventId, event_id), isNull(audioFiles.deletedAt))
    );

  const nextOrder =
    orderRows.length === 0
      ? 0
      : Math.max(...orderRows.map((r) => r.displayOrder)) + 1;

  const objectId = randomUUID();
  const safeName = sanitizeFilenameForKey(filename);
  const storageKey = `${membership.company.id}/${event_id}/${objectId}-${safeName}`;

  let putUrl: string;
  try {
    putUrl = await presignPutUrl({
      key: storageKey,
      contentType: mime_type,
    });
  } catch (e) {
    console.error("R2 presign failed", e);
    return NextResponse.json(
      { error: "Storage configuration error." },
      { status: 500 }
    );
  }

  const [row] = await db
    .insert(audioFiles)
    .values({
      eventId: event_id,
      originalFilename: filename.slice(0, 500),
      storageKey,
      mimeType: mime_type,
      sizeBytes: size,
      displayOrder: nextOrder,
      uploadedAt: null,
    })
    .returning({ id: audioFiles.id });

  if (!row) {
    return NextResponse.json(
      { error: "Could not create file row." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    putUrl,
    fileId: row.id,
    storageKey,
  });
}
