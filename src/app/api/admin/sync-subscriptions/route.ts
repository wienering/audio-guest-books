import { isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-audit";
import { updateCompanyStripeSubscriptionFields } from "@/lib/billing-features";
import { requireAdminApi } from "@/lib/admin-route-auth";
import { getStripe } from "@/lib/stripe";

export async function POST(): Promise<Response> {
  const gated = await requireAdminApi();
  if ("error" in gated) return gated.error;
  const { adminClerkUserId } = gated;

  const stripe = getStripe();

  const rows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      stripeSubscriptionId: companies.stripeSubscriptionId,
    })
    .from(companies)
    .where(isNotNull(companies.stripeSubscriptionId));

  const successes: { slug: string; status: string }[] = [];
  const failures: { slug: string; error: string }[] = [];

  for (const row of rows) {
    if (!row.stripeSubscriptionId) continue;
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
      await updateCompanyStripeSubscriptionFields(db, row.id, sub);
      successes.push({ slug: row.slug, status: sub.status });
    } catch (e) {
      failures.push({
        slug: row.slug,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await logAdminAction({
    adminClerkUserId,
    actionType: "subscriptions_synced",
    description: `Synced ${successes.length} subscriptions with Stripe (${failures.length} failed)`,
    metadata: {
      total_attempted: rows.length,
      successes: successes.length,
      failures: failures.length,
      failed_slugs: failures.map((f) => f.slug),
    },
  });

  return NextResponse.json({
    ok: true,
    attempted: rows.length,
    successes,
    failures,
  });
}
