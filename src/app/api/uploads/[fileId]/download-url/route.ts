import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { audioFiles } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { presignGetUrl } from "@/lib/r2";

type RouteCtx = { params: Promise<{ fileId: string }> };

function contentDispositionAttachment(filename: string): string {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename*=UTF-8''${encoded}`;
}

export async function GET(_req: Request, ctx: RouteCtx) {
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

  if (!row.uploadedAt) {
    return NextResponse.json({ error: "File not ready" }, { status: 400 });
  }

  try {
    const url = await presignGetUrl({
      key: row.storageKey,
      responseContentDisposition: contentDispositionAttachment(
        row.originalFilename
      ),
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("presign download", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}
