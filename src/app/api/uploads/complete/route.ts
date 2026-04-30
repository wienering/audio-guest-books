import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { audioFiles } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { enqueueTranscodeAudioJob } from "@/lib/queue";
import { headObject } from "@/lib/r2";

const bodySchema = z.object({
  file_id: z.string().uuid(),
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await db.query.audioFiles.findFirst({
    where: and(
      eq(audioFiles.id, parsed.data.file_id),
      isNull(audioFiles.deletedAt)
    ),
    with: {
      event: {
        columns: {
          companyId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!row || row.event.companyId !== membership.company.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.event.deletedAt) {
    return NextResponse.json({ error: "Event not available" }, { status: 400 });
  }

  if (row.uploadedAt) {
    return NextResponse.json({ ok: true });
  }

  const meta = await headObject(row.storageKey);
  if (!meta || typeof meta.contentLength !== "number") {
    return NextResponse.json(
      { error: "Upload not found in storage yet. Try again shortly." },
      { status: 400 }
    );
  }

  if (meta.contentLength !== row.sizeBytes) {
    return NextResponse.json(
      {
        error: "Uploaded file size does not match. Please try again.",
      },
      { status: 400 }
    );
  }

  await db
    .update(audioFiles)
    .set({ uploadedAt: new Date() })
    .where(eq(audioFiles.id, row.id));

  if (row.transcodingStatus === "pending" && row.isOriginal) {
    await enqueueTranscodeAudioJob({
      audioFileId: row.id,
      eventId: row.eventId,
      companyId: row.event.companyId,
    });
  }

  return NextResponse.json({ ok: true });
}
