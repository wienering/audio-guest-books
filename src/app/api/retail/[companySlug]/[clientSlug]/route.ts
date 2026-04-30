import { NextResponse } from "next/server";

import {
  buildRetailPublicPayload,
  resolveRetailEventForSlugs,
} from "@/lib/retail-public";
import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import {
  analyticsContextFromRequest,
  getClientIpFromRequest,
} from "@/lib/retail-request-meta";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:get");
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
    if (resolved.error === "company_not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { event } = resolved;
  const ac = analyticsContextFromRequest(req);
  try {
    await logRetailAnalytics({
      eventId: event.id,
      eventType: "page_view",
      ipHash: hashIp(ac.ip),
      userAgent: ac.userAgent,
      referrer: ac.referrer,
    });
  } catch (e) {
    console.error("retail page_view log", e);
  }

  try {
    const payload = await buildRetailPublicPayload(event, {
      companySlug: decodeURIComponent(companySlug),
      clientSlug: decodeURIComponent(clientSlug),
    });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("retail public payload", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
