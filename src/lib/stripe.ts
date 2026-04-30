import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/**
 * Stripe client (secret key). Lazily constructed so `next build` can run without Stripe env.
 * API version is pinned to the version bundled with `stripe-node` for type-safe responses.
 */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeSingleton = new Stripe(secret, {
      apiVersion: Stripe.API_VERSION,
      typescript: true,
    });
  }
  return stripeSingleton;
}

export type { Stripe };
