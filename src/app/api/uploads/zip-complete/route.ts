import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { uploadJobs } from "@/db/schema";
import { enqueueExtractZipJob } from "@/lib/queue";
import { getMembershipWithCompany } from "@/lib/company";
import { headObject } from "@/lib/r2";

const bodySchema = z.object({
  upload_job_id: z.string().uuid(),
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

  const row = await db.query.uploadJobs.findFirst({
    where: eq(uploadJobs.id, parsed.data.upload_job_id),
    with: {
      event: true,
    },
  });

  if (!row || row.event.companyId !== membership.company.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.event.deletedAt) {
    return NextResponse.json({ error: "Event not available" }, { status: 400 });
  }

  if (row.status !== "pending") {
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
      { error: "Uploaded file size does not match. Please try again." },
      { status: 400 }
    );
  }

  try {
    await enqueueExtractZipJob({
      uploadJobId: row.id,
      companyId: row.companyId,
      eventId: row.eventId,
      storageKey: row.storageKey,
    });
  } catch (e) {
    console.error("enqueue extract-zip failed", e);
    return NextResponse.json(
      { error: "Could not queue processing job. Check Redis configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
