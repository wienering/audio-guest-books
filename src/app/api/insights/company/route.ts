import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveAnalyticsRange } from "@/lib/analytics-range";
import { getCachedCompanyAnalyticsPayload } from "@/lib/analytics-payload";
import { sampleCompanyAnalytics } from "@/lib/analytics-sample-data";
import { companyHasFeatureKey } from "@/lib/company-features";
import { getMembershipWithCompany } from "@/lib/company";

/** Path uses `/insights` (not `analytics`) so browser privacy extensions don’t block XHR/fetch. */

export async function GET(req: Request) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(session.userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const range = resolveAnalyticsRange(url.searchParams);

  const fileLimit = membership.company.plan?.fileLimitPerEvent ?? null;

  const hasRetail = await companyHasFeatureKey(
    membership.company.id,
    "retail_analytics"
  );

  if (!hasRetail) {
    return NextResponse.json(
      sampleCompanyAnalytics(range.rangeKey, fileLimit)
    );
  }

  const payload = await getCachedCompanyAnalyticsPayload(
    membership.company.id,
    range,
    fileLimit
  );
  return NextResponse.json(payload);
}
