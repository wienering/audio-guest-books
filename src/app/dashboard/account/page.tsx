import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  BillingSettingsClient,
  type BillingAuditRow,
} from "@/app/dashboard/settings/billing/billing-settings-client";
import { AccountDeletionClient } from "@/app/dashboard/settings/account/account-deletion-client";
import { DashboardStackedNavLayout } from "@/components/dashboard/dashboard-stacked-nav-layout";
import {
  stackedSectionClassnames,
  stackedSectionHeadingClassnames,
  type DashboardStackedNavSection,
} from "@/lib/stacked-nav-utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db/index";
import { billingAuditLog } from "@/db/schema";
import { loadAccountDeletionPreview } from "@/lib/account-deletion-preview";
import { getFoundingMemberSpotsRemaining } from "@/lib/billing-founding";
import { getMembershipWithCompany } from "@/lib/company";
import {
  isComplimentarySubscriptionActiveNow,
  isStripePaidSubscriptionActive,
} from "@/lib/comp-subscription-utils";

const SECTIONS_NAV: DashboardStackedNavSection[] = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
];

function LoadingNav() {
  return (
    <div className="text-muted-foreground text-sm md:flex md:flex-row md:gap-10">
      <aside className="hidden w-[220px] shrink-0 md:block" />
      <div className="min-w-0 flex-1 animate-pulse space-y-4">
        <div className="h-8 rounded-md bg-muted" />
        <div className="h-24 rounded-md bg-muted/80" />
      </div>
    </div>
  );
}

export default async function DashboardAccountPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const preview = await loadAccountDeletionPreview(membership.company.id);
  const owner = membership.role === "owner";
  const company = membership.company;
  const plan = company.plan;

  let billingContent;

  if (!owner) {
    billingContent = (
      <div className="mt-8">
        <p className="text-muted-foreground text-sm">
          Only the workspace owner can manage billing and subscriptions.
        </p>
      </div>
    );
  } else {
    const stripePaidForBilling = isStripePaidSubscriptionActive(company);
    const complimentarySubscriptionActive =
      !stripePaidForBilling &&
      isComplimentarySubscriptionActiveNow({
        compSubscriptionPlanCode: company.compSubscriptionPlanCode,
        compSubscriptionExpiresAt: company.compSubscriptionExpiresAt,
      });

    const auditDb = await db
      .select({
        id: billingAuditLog.id,
        event_type: billingAuditLog.eventType,
        from_state: billingAuditLog.fromState,
        to_state: billingAuditLog.toState,
        created_at: billingAuditLog.createdAt,
      })
      .from(billingAuditLog)
      .where(eq(billingAuditLog.companyId, company.id))
      .orderBy(desc(billingAuditLog.createdAt))
      .limit(5);

    const auditRows: BillingAuditRow[] = auditDb.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      from_state: r.from_state,
      to_state: r.to_state,
      created_at: r.created_at.toISOString(),
    }));

    const foundingSpotsRemaining = await getFoundingMemberSpotsRemaining();

    billingContent = (
      <>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
          Subscription and payments for{" "}
          <strong>{company.name}</strong>.
        </p>
        <div className="mt-8">
          <BillingSettingsClient
            embedded
            companyName={company.name}
            planCode={plan?.code ?? "unknown"}
            planDisplayName={plan?.name ?? "Unknown"}
            foundingSpotsRemaining={foundingSpotsRemaining}
            subscriptionStatus={company.subscriptionStatus}
            subscriptionCurrentPeriodEnd={
              company.subscriptionCurrentPeriodEnd?.toISOString() ?? null
            }
            subscriptionCancelAtPeriodEnd={company.subscriptionCancelAtPeriodEnd}
            isFoundingMember={company.isFoundingMember}
            subscriptionPlanCode={company.subscriptionPlanCode}
            stripeSubscriptionId={company.stripeSubscriptionId}
            hasStripePaidSubscription={stripePaidForBilling}
            complimentarySubscriptionActive={complimentarySubscriptionActive}
            compSubscriptionExpiresAt={
              company.compSubscriptionExpiresAt?.toISOString() ?? null
            }
            auditRows={auditRows}
          />
        </div>
      </>
    );
  }

  return (
    <Suspense fallback={<LoadingNav />}>
      <DashboardStackedNavLayout sections={SECTIONS_NAV}>
        <section
          id="profile"
          className={stackedSectionClassnames(true)}
          aria-labelledby="dash-section-profile"
        >
          <h2 id="dash-section-profile" className={stackedSectionHeadingClassnames()}>
            Profile
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Manage deletion and lifecycle for workspace{" "}
            <strong>{membership.company.name}</strong>.
          </p>

          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workspace</CardTitle>
                <CardDescription>
                  Company slug:{" "}
                  <span className="font-mono">{membership.company.slug}</span>
                </CardDescription>
              </CardHeader>
            </Card>

            <AccountDeletionClient
              companyName={membership.company.name}
              preview={preview}
            />
          </div>
        </section>

        <section
          id="billing"
          className={stackedSectionClassnames(false)}
          aria-labelledby="dash-section-billing"
        >
          <h2 id="dash-section-billing" className={stackedSectionHeadingClassnames()}>
            Billing
          </h2>
          {billingContent}
        </section>
      </DashboardStackedNavLayout>
    </Suspense>
  );
}
