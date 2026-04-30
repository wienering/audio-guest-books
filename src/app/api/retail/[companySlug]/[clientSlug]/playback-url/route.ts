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
import { hasValidRetailUnlockSession } from "@/lib/retail-session";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:playback");
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

  const sessionOk = await hasValidRetailUnlockSession(
    resolved.event.id,
    resolved.event.passwordHash
  );
  if (!sessionOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      eventType: "file_play",
      ipHash: hashIp(ac.ip),
      userAgent: ac.userAgent,
      referrer: ac.referrer,
    });
  } catch (e) {
    console.error("retail file_play log", e);
  }

  try {
    const signed = await presignGetUrl({ key: row.storageKey });
    return NextResponse.json({ url: signed });
  } catch (e) {
    console.error("retail playback presign", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}
