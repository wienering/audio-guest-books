import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveAnalyticsRange } from "@/lib/analytics-range";
import {
  assertUserOwnsEvent,
  getCachedEventAnalyticsPayload,
} from "@/lib/analytics-payload";
import { sampleEventAnalytics } from "@/lib/analytics-sample-data";
import { companyHasFeatureKey } from "@/lib/company-features";
import { getMembershipWithCompany } from "@/lib/company";

/** Path uses `/insights` (not `analytics`) so browser privacy extensions don’t block XHR/fetch. */

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(session.userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await ctx.params;
  const owns = await assertUserOwnsEvent(eventId, membership.company.id);
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const range = resolveAnalyticsRange(url.searchParams);

  const hasRetail = await companyHasFeatureKey(
    membership.company.id,
    "retail_analytics"
  );

  if (!hasRetail) {
    return NextResponse.json(sampleEventAnalytics(range.rangeKey));
  }

  const payload = await getCachedEventAnalyticsPayload(eventId, range);
  return NextResponse.json(payload);
}
