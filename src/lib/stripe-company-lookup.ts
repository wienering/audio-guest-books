import "server-only";

import { eq, or } from "drizzle-orm";

import { db } from "@/db/index";
import { companies } from "@/db/schema";

export async function getCompanyByStripeCustomer(
  customerId: string
): Promise<typeof companies.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, customerId))
    .limit(1);
  return row;
}

export async function getCompanyByStripeSubscriptionId(
  subscriptionId: string
): Promise<typeof companies.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeSubscriptionId, subscriptionId))
    .limit(1);
  return row;
}

export async function getCompanyByStripeCustomerOrSubscription(
  customerId: string | null | undefined,
  subscriptionId: string | null | undefined
): Promise<typeof companies.$inferSelect | undefined> {
  if (!customerId && !subscriptionId) {
    return undefined;
  }
  const conditions = [];
  if (customerId) {
    conditions.push(eq(companies.stripeCustomerId, customerId));
  }
  if (subscriptionId) {
    conditions.push(eq(companies.stripeSubscriptionId, subscriptionId));
  }
  if (conditions.length === 0) {
    return undefined;
  }
  const [row] = await db
    .select()
    .from(companies)
    .where(or(...conditions))
    .limit(1);
  return row;
}
