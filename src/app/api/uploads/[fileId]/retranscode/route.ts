import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { audioFiles } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { enqueueTranscodeAudioJob } from "@/lib/queue";

type RouteCtx = { params: Promise<{ fileId: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
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

  if (row.event.deletedAt || !row.isOriginal) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  if (row.transcodingStatus !== "failed") {
    return NextResponse.json(
      { error: "Retry is only available after a failed transcode." },
      { status: 400 }
    );
  }

  await db
    .update(audioFiles)
    .set({
      transcodingStatus: "pending",
      transcodingError: null,
    })
    .where(eq(audioFiles.id, row.id));

  await enqueueTranscodeAudioJob({
    audioFileId: row.id,
    eventId: row.eventId,
    companyId: row.event.companyId,
  });

  return NextResponse.json({ ok: true });
}
