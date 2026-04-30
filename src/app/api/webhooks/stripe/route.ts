import type { Stripe } from "stripe";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { stripeEventsProcessed } from "@/db/schema";
import { dispatchStripeWebhookEvent } from "@/lib/stripe-webhook-handlers";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (e) {
    console.error("[stripe webhook] signature verification failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(stripeEventsProcessed)
        .values({
          stripeEventId: event.id,
          eventType: event.type,
        })
        .onConflictDoNothing({ target: stripeEventsProcessed.stripeEventId })
        .returning({ id: stripeEventsProcessed.id });

      if (inserted.length === 0) {
        return;
      }

      await dispatchStripeWebhookEvent(tx, event);
    });
  } catch (e) {
    console.error("[stripe webhook] handler failed", {
      stripeEventId: event.id,
      eventType: event.type,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
