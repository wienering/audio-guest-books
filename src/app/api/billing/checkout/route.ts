import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";
import { requireOwnerBilling } from "@/lib/billing-route-auth";
import { resolveUltimateCheckoutPriceId } from "@/lib/billing-founding";
import { getAppBaseUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";

const BodySchema = z.object({
  priceId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const gated = await requireOwnerBilling();
  if ("error" in gated) {
    return gated.error;
  }
  const { membership } = gated;
  const company = membership.company;
  const planCode = company.plan?.code;
  if (!planCode) {
    return NextResponse.json({ error: "Plan not found" }, { status: 500 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (planCode !== "free" && planCode !== "pro") {
    return NextResponse.json(
      { error: "Checkout is only available from Free or Pro" },
      { status: 400 }
    );
  }

  let resolved;
  try {
    resolved = await resolveUltimateCheckoutPriceId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "stripe_price_ultimate_missing") {
      console.error("[billing/checkout] STRIPE_PRICE_ID_ULTIMATE is not configured");
      return NextResponse.json(
        { error: "Billing is not configured" },
        { status: 503 }
      );
    }
    throw e;
  }

  if (
    parsed.data.priceId !== undefined &&
    parsed.data.priceId !== resolved.priceId
  ) {
    return NextResponse.json({ error: "Price mismatch" }, { status: 400 });
  }

  const base = getAppBaseUrl().replace(/\/$/, "");
  const stripe = getStripe();

  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(company.id);
  } catch (e) {
    if (e instanceof Error && e.message === "company_not_found") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    console.error("[billing/checkout] getOrCreateStripeCustomer failed", {
      companyId: company.id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 }
    );
  }

  const isFoundingStr = resolved.useFoundingPricing ? "true" : "false";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: resolved.priceId, quantity: 1 }],
      success_url: `${base}/dashboard/account?success=true&session_id={CHECKOUT_SESSION_ID}&_nav=billing`,
      cancel_url: `${base}/dashboard/account?canceled=true&_nav=billing`,
      metadata: {
        company_id: company.id,
        is_founding_member: isFoundingStr,
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          is_founding_member: isFoundingStr,
        },
      },
    });

    if (!session.url) {
      console.error("[billing/checkout] session missing url", {
        companyId: company.id,
        sessionId: session.id,
      });
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[billing/checkout] Stripe session creation failed", {
      companyId: company.id,
      stripeCustomerId: customerId,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
