import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";

import { db } from "@/db/index";
import { companies } from "@/db/schema";

const FOUNDING_CAP = 5;

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export async function getFoundingMemberSpotsRemaining(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(companies)
    .where(
      and(
        eq(companies.isFoundingMember, true),
        inArray(companies.subscriptionStatus, [...ACTIVE_SUBSCRIPTION_STATUSES])
      )
    );

  const used = row?.n ?? 0;
  return Math.max(0, FOUNDING_CAP - Number(used));
}

function ultimatePriceFromEnv(): string | undefined {
  return process.env.STRIPE_PRICE_ID_ULTIMATE?.trim() || undefined;
}

function foundingPriceFromEnv(): string | undefined {
  return process.env.STRIPE_PRICE_ID_ULTIMATE_FOUNDING?.trim() || undefined;
}

/**
 * Picks Stripe Price ID for Ultimate checkout (founding when slots remain and env is configured).
 */
export async function resolveUltimateCheckoutPriceId(): Promise<{
  priceId: string;
  useFoundingPricing: boolean;
}> {
  const ultimate = ultimatePriceFromEnv();
  if (!ultimate) {
    throw new Error("stripe_price_ultimate_missing");
  }

  const founding = foundingPriceFromEnv();
  const spots = await getFoundingMemberSpotsRemaining();

  if (spots > 0 && founding) {
    return { priceId: founding, useFoundingPricing: true };
  }

  return { priceId: ultimate, useFoundingPricing: false };
}
