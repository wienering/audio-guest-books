import { and, desc, eq, gt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { downloadJobs } from "@/db/schema";
import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import { enqueueGenerateZipJob } from "@/lib/queue";
import {
  resolveRetailEventForSlugs,
  sanitizeZipBaseName,
} from "@/lib/retail-public";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import {
  analyticsContextFromRequest,
  getClientIpFromRequest,
} from "@/lib/retail-request-meta";
import { presignGetUrl } from "@/lib/r2";
import { hasValidRetailUnlockSession } from "@/lib/retail-session";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function POST(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:zip-request");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const resolved = await resolveRetailEventForSlugs(
    decodeURIComponent(companySlug),
    decodeURIComponent(clientSlug)
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionOk = await hasValidRetailUnlockSession(
    resolved.event.id,
    resolved.event.passwordHash
  );
  if (!sessionOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { event, company } = resolved;

  if (event.metadataOnlyAfter) {
    return NextResponse.json({ error: "Files no longer available" }, { status: 410 });
  }

  if (!event.audioFiles.length) {
    return NextResponse.json({ error: "No files to zip" }, { status: 400 });
  }

  const ipHash = hashIp(getClientIpFromRequest(req)) ?? "unknown";
  const now = new Date();

  const cached = await db.query.downloadJobs.findFirst({
    where: and(
      eq(downloadJobs.eventId, event.id),
      eq(downloadJobs.status, "succeeded"),
      gt(downloadJobs.expiresAt, now)
    ),
    orderBy: [desc(downloadJobs.completedAt)],
  });

  if (cached?.resultStorageKey) {
    const baseName = sanitizeZipBaseName(event.name);
    const filename = `${baseName}-recordings.zip`;
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
    const downloadUrl = await presignGetUrl({
      key: cached.resultStorageKey,
      expiresInSeconds: 3600,
      responseContentDisposition: `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });

    const ac = analyticsContextFromRequest(req);
    try {
      await logRetailAnalytics({
        eventId: event.id,
        eventType: "zip_download",
        ipHash: hashIp(ac.ip),
        userAgent: ac.userAgent,
        referrer: ac.referrer,
      });
    } catch (e) {
      console.error("retail zip_download log", e);
    }

    return NextResponse.json({
      status: "ready",
      jobId: cached.id,
      downloadUrl,
    });
  }

  const active = await db.query.downloadJobs.findFirst({
    where: and(
      eq(downloadJobs.eventId, event.id),
      or(
        eq(downloadJobs.status, "pending"),
        eq(downloadJobs.status, "processing")
      )
    ),
    orderBy: [desc(downloadJobs.createdAt)],
  });

  if (active) {
    return NextResponse.json({
      status: "processing",
      jobId: active.id,
    });
  }

  const [row] = await db
    .insert(downloadJobs)
    .values({
      eventId: event.id,
      kind: "bulk_zip",
      status: "pending",
      requestedByIpHash: ipHash,
    })
    .returning({ id: downloadJobs.id });

  if (!row) {
    return NextResponse.json({ error: "Could not create job" }, { status: 500 });
  }

  await enqueueGenerateZipJob({
    downloadJobId: row.id,
    eventId: event.id,
    companyId: company.id,
  });

  return NextResponse.json({
    status: "processing",
    jobId: row.id,
  });
}
