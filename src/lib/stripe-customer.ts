import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/index";
import { companies, companyUsers } from "@/db/schema";
import { getClerkPrimaryEmail } from "@/lib/clerk-primary-email";
import { getStripe } from "@/lib/stripe";

/**
 * Ensures a Stripe Customer exists for the company (lazy; first checkout/portal call).
 */
export async function getOrCreateStripeCustomer(companyId: string): Promise<string> {
  const stripe = getStripe();

  const customerId = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: companies.id,
        stripeCustomerId: companies.stripeCustomerId,
        slug: companies.slug,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .for("update");

    if (!row) {
      throw new Error("company_not_found");
    }

    if (row.stripeCustomerId) {
      return row.stripeCustomerId;
    }

    const [owner] = await tx
      .select({ clerkUserId: companyUsers.clerkUserId })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.role, "owner")
        )
      )
      .limit(1);

    const email = owner
      ? await getClerkPrimaryEmail(owner.clerkUserId)
      : null;

    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: {
        company_id: companyId,
        company_slug: row.slug,
      },
    });

    await tx
      .update(companies)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return customer.id;
  });

  return customerId;
}
