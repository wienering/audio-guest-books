import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { downloadJobs } from "@/db/schema";
import {
  resolveRetailEventForSlugs,
  sanitizeZipBaseName,
} from "@/lib/retail-public";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import { getClientIpFromRequest } from "@/lib/retail-request-meta";
import { presignGetUrl } from "@/lib/r2";
import { hasValidRetailUnlockSession } from "@/lib/retail-session";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:zip-status");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
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

  const { event } = resolved;

  const job = await db.query.downloadJobs.findFirst({
    where: and(eq(downloadJobs.id, jobId), eq(downloadJobs.eventId, event.id)),
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (job.status === "pending" || job.status === "processing") {
    return NextResponse.json({ status: job.status, jobId: job.id });
  }

  if (job.status === "failed") {
    return NextResponse.json({
      status: "failed",
      jobId: job.id,
      error: job.errorMessage ?? "Zip generation failed",
    });
  }

  if (job.status === "succeeded" && job.resultStorageKey && job.expiresAt) {
    const now = new Date();
    if (job.expiresAt > now) {
      const baseName = sanitizeZipBaseName(event.name);
      const filename = `${baseName}-recordings.zip`;
      const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
      const downloadUrl = await presignGetUrl({
        key: job.resultStorageKey,
        expiresInSeconds: 3600,
        responseContentDisposition: `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      });
      return NextResponse.json({
        status: "ready",
        jobId: job.id,
        downloadUrl,
      });
    }
  }

  return NextResponse.json({
    status: "expired",
    jobId: job.id,
    message: "Download expired — request a new zip.",
  });
}
