import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/dashboard-top-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMembershipWithCompany,
  getSoftDeletedMembershipInfo,
} from "@/lib/company";
import { formatDate } from "@/lib/date-format";
import {
  isComplimentarySubscriptionActiveNow,
  isStripePaidSubscriptionActive,
} from "@/lib/comp-subscription-utils";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    redirect("/sign-in");
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    const pending = await getSoftDeletedMembershipInfo(userId);
    if (pending) {
      const path =
        pending.hardDeleteAfter != null
          ? `?purgeDate=${pending.hardDeleteAfter.toISOString().slice(0, 10)}`
          : "";
      redirect(`/account-scheduled-for-deletion${path}`);
    }
    redirect("/onboarding");
  }

  const company = membership.company;
  const planCode = company.plan?.code;
  const billingProblem =
    company.subscriptionStatus === "past_due" ||
    company.subscriptionStatus === "unpaid";
  const subscriptionEnding =
    company.subscriptionCancelAtPeriodEnd === true &&
    company.subscriptionCurrentPeriodEnd != null &&
    planCode === "ultimate";

  const stripePaidLayout = isStripePaidSubscriptionActive(company);
  let compExpiringSoon: { daysLeft: number } | null = null;
  if (
    !stripePaidLayout &&
    company.compSubscriptionExpiresAt &&
    isComplimentarySubscriptionActiveNow({
      compSubscriptionPlanCode: company.compSubscriptionPlanCode,
      compSubscriptionExpiresAt: company.compSubscriptionExpiresAt,
    })
  ) {
    const daysLeft = Math.ceil(
      (company.compSubscriptionExpiresAt.getTime() - Date.now()) / 86400000
    );
    if (daysLeft > 0 && daysLeft <= 14) {
      compExpiringSoon = { daysLeft };
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav companyName={membership.company.name} />
      {billingProblem ? (
        <div className="border-amber-500/30 border-b bg-amber-500/10">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-amber-950 text-sm dark:text-amber-100">
              Your subscription payment needs attention. Update your payment
              method to avoid losing Ultimate access.
            </p>
            <Link
              href="/dashboard/settings/billing"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              Update payment method
            </Link>
          </div>
        </div>
      ) : null}
      {subscriptionEnding && company.subscriptionCurrentPeriodEnd ? (
        <div className="border-b border-border bg-muted/80">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Subscription ending{" "}
              <strong>
                {formatDate(company.subscriptionCurrentPeriodEnd)}
              </strong>
              . You can resume from the Stripe billing portal.
            </p>
            <Link
              href="/dashboard/settings/billing"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              Resume subscription
            </Link>
          </div>
        </div>
      ) : null}
      {compExpiringSoon ? (
        <div className="border-emerald-700/30 border-b bg-emerald-500/10">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-emerald-950 text-sm dark:text-emerald-50">
              Your complimentary {planCode === "pro" ? "Pro" : "Ultimate"} plan
              expires in <strong>{compExpiringSoon.daysLeft}</strong>{" "}
              {compExpiringSoon.daysLeft === 1 ? "day" : "days"}. Contact{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:support@audioguestbooks.ca"
              >
                support@audioguestbooks.ca
              </a>{" "}
              to discuss continuing.
            </p>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-5xl px-4 py-10">{children}</div>
    </div>
  );
}
