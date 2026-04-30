import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  BillingSettingsClient,
  type BillingAuditRow,
} from "@/app/dashboard/settings/billing/billing-settings-client";
import { db } from "@/db/index";
import { billingAuditLog } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { getFoundingMemberSpotsRemaining } from "@/lib/billing-founding";

export default async function BillingSettingsPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  if (membership.role !== "owner") {
    return (
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Only the workspace owner can manage billing and subscriptions.
        </p>
      </div>
    );
  }

  const company = membership.company;
  const plan = company.plan;

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

  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <BillingSettingsClient
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
        auditRows={auditRows}
      />
    </Suspense>
  );
}
