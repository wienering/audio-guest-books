import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMembershipWithCompany,
  getSoftDeletedMembershipInfo,
} from "@/lib/company";

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

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-semibold tracking-tight"
            >
              Audio Guest Books
            </Link>
            <nav className="hidden gap-4 text-muted-foreground text-sm md:flex">
              <Link href="/dashboard" className="hover:text-foreground">
                Events
              </Link>
              <Link
                href="/dashboard/analytics"
                className="hover:text-foreground"
              >
                Analytics
              </Link>
              <Link
                href="/dashboard/settings/email-templates"
                className="hover:text-foreground"
              >
                Email templates
              </Link>
              <Link
                href="/dashboard/settings/branding"
                className="hover:text-foreground"
              >
                Branding
              </Link>
              <Link
                href="/dashboard/settings/billing"
                className="hover:text-foreground"
              >
                Billing
              </Link>
              <Link
                href="/dashboard/settings/account"
                className="hover:text-foreground"
              >
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-muted-foreground text-sm md:inline">
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
                {company.subscriptionCurrentPeriodEnd.toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
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
      <div className="mx-auto max-w-5xl px-4 py-10">{children}</div>
    </div>
  );
}
