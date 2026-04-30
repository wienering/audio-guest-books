import { NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { requireOwnerBilling } from "@/lib/billing-route-auth";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";
import { getStripe } from "@/lib/stripe";

export async function POST(): Promise<Response> {
  const gated = await requireOwnerBilling();
  if ("error" in gated) {
    return gated.error;
  }
  const { membership } = gated;
  const company = membership.company;

  if (!company.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription to manage" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const base = getAppBaseUrl().replace(/\/$/, "");

  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(company.id);
  } catch (e) {
    console.error("[billing/portal] getOrCreateStripeCustomer failed", {
      companyId: company.id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Could not open billing portal" },
      { status: 500 }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/dashboard/settings/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[billing/portal] Stripe portal session failed", {
      companyId: company.id,
      stripeCustomerId: customerId,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Could not open billing portal" },
      { status: 500 }
    );
  }
}
