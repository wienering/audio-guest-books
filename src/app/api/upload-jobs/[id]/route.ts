import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { uploadJobs } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await db.query.uploadJobs.findFirst({
    where: eq(uploadJobs.id, id),
  });

  if (!row || row.companyId !== membership.company.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    original_filename: row.originalFilename,
    total_files_in_archive: row.totalFilesInArchive,
    files_processed: row.filesProcessed,
    files_succeeded: row.filesSucceeded,
    files_failed: row.filesFailed,
    error_message: row.errorMessage,
    error_details: row.errorDetails,
    created_at: row.createdAt.toISOString(),
    started_at: row.startedAt?.toISOString() ?? null,
    completed_at: row.completedAt?.toISOString() ?? null,
  });
}
