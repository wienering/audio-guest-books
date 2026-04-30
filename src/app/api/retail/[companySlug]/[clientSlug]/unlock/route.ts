import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/index";
import { retailPageSessions } from "@/db/schema";
import { hashIp } from "@/lib/retail-analytics";
import { resolveRetailEventForSlugs } from "@/lib/retail-public";
import {
  analyticsContextFromRequest,
  getClientIpFromRequest,
} from "@/lib/retail-request-meta";
import {
  retailCookieSecurityOptions,
  retailUnlockCookieName,
} from "@/lib/retail-session";
import { takeRetailUnlockRateLimit } from "@/lib/retail-unlock-rate-limit";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

const bodySchema = z.object({
  password: z.string().min(1).max(500),
});

export async function POST(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);

  const resolved = await resolveRetailEventForSlugs(
    decodeURIComponent(companySlug),
    decodeURIComponent(clientSlug)
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { event } = resolved;
  const hash = event.passwordHash;
  if (!hash?.trim()) {
    return NextResponse.json({ error: "Password not enabled." }, { status: 400 });
  }

  const rl = takeRetailUnlockRateLimit(ip, event.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ok = await bcrypt.compare(parsed.data.password, hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ac = analyticsContextFromRequest(req);

  await db.insert(retailPageSessions).values({
    eventId: event.id,
    sessionToken: token,
    ipHash: hashIp(ac.ip) ?? "unknown",
    unlockedAt: now,
    expiresAt,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(retailUnlockCookieName(event.id), token, retailCookieSecurityOptions());
  return res;
}
