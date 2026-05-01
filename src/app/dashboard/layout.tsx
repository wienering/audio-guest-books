import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { DashboardTopPillNav } from "@/components/dashboard/dashboard-top-pill-nav";
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:h-14 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
          <div className="flex items-center justify-between md:contents">
            <Link href="/dashboard" className="flex shrink-0 items-center">
              <BrandLogo className="h-7 w-auto max-w-[200px]" />
            </Link>
            <div className="flex items-center gap-3 md:hidden">
              <UserButton />
            </div>
          </div>

          <div className="flex w-full justify-center md:w-auto md:min-w-0 md:flex-1 md:justify-end md:px-2">
            <DashboardTopPillNav />
          </div>

          <div className="hidden items-center gap-3 md:flex shrink-0">
            <span className="max-w-[12rem] truncate text-muted-foreground text-sm">
              {membership.company.name}
            </span>
            <UserButton />
          </div>
        </div>
      </header>
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
