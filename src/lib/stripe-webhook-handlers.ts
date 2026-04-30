import "server-only";

import { createElement } from "react";
import { eq } from "drizzle-orm";
import type { Stripe } from "stripe";

import type { AppDbClient } from "@/db/index";
import { companies, plans } from "@/db/schema";
import { BillingSubscriptionCreatedEmail } from "@/emails/billing-subscription-created";
import { BillingSubscriptionEndedEmail } from "@/emails/billing-subscription-ended";
import { insertBillingAudit } from "@/lib/billing-audit";
import {
  revokeUltimateFeatures,
  updateCompanyStripeSubscriptionFields,
  grantUltimateFeatures,
} from "@/lib/billing-features";
import { getCompanyOwnerEmail } from "@/lib/billing-owner-email";
import { sendEmailWithResult } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { getCompanyByStripeCustomerOrSubscription } from "@/lib/stripe-company-lookup";

function isActiveLikeStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

function extractId(
  ref: string | { id: string } | null | undefined
): string | null {
  if (ref == null) {
    return null;
  }
  return typeof ref === "string" ? ref : ref.id;
}

export async function dispatchStripeWebhookEvent(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(dbConn, event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(dbConn, event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(dbConn, event);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(dbConn, event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(dbConn, event);
      break;
    default:
      break;
  }
}

async function handleCheckoutSessionCompleted(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode !== "subscription") {
    return;
  }

  const companyId = session.metadata?.company_id?.trim();
  if (!companyId) {
    console.error("[stripe webhook] checkout.session.completed missing company_id", {
      stripeEventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  const subId = extractId(session.subscription);
  if (!subId) {
    console.error("[stripe webhook] checkout.session.completed missing subscription", {
      stripeEventId: event.id,
      companyId,
      sessionId: session.id,
    });
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  const isFoundingMember = session.metadata?.is_founding_member === "true";

  let planCode: string;
  try {
    const granted = await grantUltimateFeatures(dbConn, companyId, subscription, {
      isFoundingMember,
    });
    planCode = granted.planCode;
  } catch (e) {
    console.error("[stripe webhook] grantUltimateFeatures failed", {
      companyId,
      stripeSubscriptionId: subId,
      stripeEventId: event.id,
      message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  await insertBillingAudit(dbConn, {
    companyId,
    eventType: "subscription_created",
    fromState: null,
    toState: subscription.status,
    stripeEventId: event.id,
    metadata: {
      plan_code: planCode,
      is_founding_member: isFoundingMember,
    },
  });

  const toEmail = await getCompanyOwnerEmail(companyId);
  const [companyRow] = await dbConn
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (toEmail && companyRow) {
    await sendEmailWithResult({
      to: toEmail,
      subject: "Your Ultimate subscription is active",
      kind: "billing_subscription_created",
      companyId,
      react: createElement(BillingSubscriptionCreatedEmail, {
        companyName: companyRow.name,
        isFoundingMember,
      }),
    });
  }
}

async function handleSubscriptionUpdated(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = extractId(sub.customer);
  const company = await getCompanyByStripeCustomerOrSubscription(
    customerId,
    sub.id
  );

  if (!company) {
    console.error("[stripe webhook] subscription.updated company not found", {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
    });
    return;
  }

  const { prevStatus, planCode } = await updateCompanyStripeSubscriptionFields(
    dbConn,
    company.id,
    sub
  );

  if (isActiveLikeStatus(sub.status)) {
    const [planRow] = await dbConn
      .select({ code: plans.code })
      .from(companies)
      .innerJoin(plans, eq(companies.planId, plans.id))
      .where(eq(companies.id, company.id))
      .limit(1);

    if (planRow?.code !== "ultimate") {
      const isFounding = sub.metadata?.is_founding_member === "true";
      await grantUltimateFeatures(dbConn, company.id, sub, {
        isFoundingMember: isFounding,
      });
    }
  }

  const wasActive = prevStatus != null && isActiveLikeStatus(prevStatus);
  const nowActive = isActiveLikeStatus(sub.status);
  if (wasActive && !nowActive) {
    await insertBillingAudit(dbConn, {
      companyId: company.id,
      eventType: "subscription_status_change",
      fromState: prevStatus,
      toState: sub.status,
      stripeEventId: event.id,
      metadata: {
        cancel_at_period_end: sub.cancel_at_period_end,
        plan_code: planCode,
      },
    });
  }
}

async function handleSubscriptionDeleted(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = extractId(sub.customer);
  const company = await getCompanyByStripeCustomerOrSubscription(
    customerId,
    sub.id
  );

  if (!company) {
    console.error("[stripe webhook] subscription.deleted company not found", {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
    });
    return;
  }

  const prevStatus = company.subscriptionStatus;

  await revokeUltimateFeatures(dbConn, company.id);

  await insertBillingAudit(dbConn, {
    companyId: company.id,
    eventType: "subscription_canceled",
    fromState: prevStatus,
    toState: "canceled",
    stripeEventId: event.id,
    metadata: { stripe_subscription_id: sub.id },
  });

  const toEmail = await getCompanyOwnerEmail(company.id);
  if (toEmail) {
    await sendEmailWithResult({
      to: toEmail,
      subject: "Your Ultimate subscription has ended",
      kind: "billing_subscription_ended",
      companyId: company.id,
      react: createElement(BillingSubscriptionEndedEmail, {
        companyName: company.name,
      }),
    });
  }
}

async function resolveCompanyFromInvoice(
  invoice: Stripe.Invoice
): Promise<typeof companies.$inferSelect | undefined> {
  const customerId = extractId(invoice.customer);
  const subId =
    invoice.parent?.subscription_details != null
      ? extractId(invoice.parent.subscription_details.subscription)
      : null;
  return getCompanyByStripeCustomerOrSubscription(customerId, subId);
}

async function handleInvoicePaymentSucceeded(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const company = await resolveCompanyFromInvoice(invoice);
  if (!company) {
    console.error("[stripe webhook] invoice.payment_succeeded company not found", {
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id,
    });
    return;
  }

  await insertBillingAudit(dbConn, {
    companyId: company.id,
    eventType: "invoice_payment_succeeded",
    fromState: company.subscriptionStatus,
    toState: company.subscriptionStatus,
    stripeEventId: event.id,
    metadata: {
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    },
  });
}

async function handleInvoicePaymentFailed(
  dbConn: AppDbClient,
  event: Stripe.Event
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const company = await resolveCompanyFromInvoice(invoice);
  if (!company) {
    console.error("[stripe webhook] invoice.payment_failed company not found", {
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id,
    });
    return;
  }

  await insertBillingAudit(dbConn, {
    companyId: company.id,
    eventType: "payment_failed",
    fromState: company.subscriptionStatus,
    toState: company.subscriptionStatus,
    stripeEventId: event.id,
    metadata: {
      amount_due: invoice.amount_due,
      currency: invoice.currency,
    },
  });
}
