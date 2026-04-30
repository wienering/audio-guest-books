import { NextResponse } from "next/server";

import { resolveRetailEventForSlugs } from "@/lib/retail-public";
import { getUploadedAudioFileForEvent } from "@/lib/retail-audio-file";
import { presignGetUrl } from "@/lib/r2";
import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import {
  analyticsContextFromRequest,
  getClientIpFromRequest,
} from "@/lib/retail-request-meta";

function contentDispositionAttachment(filename: string): string {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename*=UTF-8''${encoded}`;
}

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:download");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const url = new URL(req.url);
  const fileId = url.searchParams.get("file_id");
  if (!fileId) {
    return NextResponse.json({ error: "file_id required" }, { status: 400 });
  }

  const resolved = await resolveRetailEventForSlugs(
    decodeURIComponent(companySlug),
    decodeURIComponent(clientSlug)
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await getUploadedAudioFileForEvent(resolved.event.id, fileId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ac = analyticsContextFromRequest(req);
  try {
    await logRetailAnalytics({
      eventId: resolved.event.id,
      audioFileId: row.id,
      eventType: "file_download",
      ipHash: hashIp(ac.ip),
      userAgent: ac.userAgent,
      referrer: ac.referrer,
    });
  } catch (e) {
    console.error("retail file_download log", e);
  }

  try {
    const signed = await presignGetUrl({
      key: row.storageKey,
      responseContentDisposition: contentDispositionAttachment(
        row.originalFilename
      ),
    });
    return NextResponse.json({ url: signed });
  } catch (e) {
    console.error("retail download presign", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}
