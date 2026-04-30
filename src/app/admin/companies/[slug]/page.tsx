import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCompanyActions } from "@/app/admin/companies/[slug]/admin-company-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminCompanyDetailBySlug } from "@/lib/admin-company-detail";
import { cn, formatBytes } from "@/lib/utils";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso ?? "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stripeCustomerLink(id: string | null): string | null {
  if (!id) return null;
  return `https://dashboard.stripe.com/customers/${id}`;
}

function clerkUserLink(clerkUserId: string): string {
  return `https://dashboard.clerk.com/last-active?path=users/${clerkUserId}`;
}

export default async function AdminCompanyDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const detail = await getAdminCompanyDetailBySlug(slug);
  if (!detail) {
    notFound();
  }

  const isDeleted = detail.deletedAt != null;
  const stripeCustUrl = stripeCustomerLink(detail.stripeCustomerId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/companies"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All companies
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {detail.name}
          {isDeleted ? (
            <span className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              SOFT-DELETED
            </span>
          ) : null}
          {detail.isFoundingMember ? (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-900 dark:bg-purple-900/40 dark:text-purple-200">
              FOUNDING MEMBER
            </span>
          ) : null}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          {detail.slug}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Workspace and lifecycle state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV label="Slug" value={detail.slug} mono />
            <KV label="Name" value={detail.name} />
            <KV
              label="Plan"
              value={`${detail.planName ?? "—"} (${
                detail.planCode ?? "—"
              })`}
            />
            <KV
              label="Subscription"
              value={detail.subscriptionStatus ?? "—"}
            />
            <KV
              label="Sub. plan code"
              value={detail.subscriptionPlanCode ?? "—"}
            />
            <KV
              label="Cancel at period end"
              value={detail.subscriptionCancelAtPeriodEnd ? "yes" : "no"}
            />
            <KV
              label="Period end"
              value={fmtDate(detail.subscriptionCurrentPeriodEnd)}
            />
            <KV label="Created" value={fmt(detail.createdAt)} />
            <KV label="Updated" value={fmt(detail.updatedAt)} />
            {isDeleted ? (
              <>
                <KV label="Deleted at" value={fmt(detail.deletedAt)} />
                <KV
                  label="Hard-delete after"
                  value={fmtDate(detail.hardDeleteAfter)}
                />
                <KV
                  label="Deletion requested by"
                  value={detail.deletionRequestedByUserId ?? "—"}
                  mono
                />
              </>
            ) : null}
            <KV
              label="Stripe customer"
              value={
                stripeCustUrl ? (
                  <a
                    className="text-primary hover:underline"
                    href={stripeCustUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {detail.stripeCustomerId}
                  </a>
                ) : (
                  "—"
                )
              }
              mono
            />
            <KV
              label="Stripe subscription"
              value={detail.stripeSubscriptionId ?? "—"}
              mono
            />
            <KV
              label="Founding member"
              value={detail.isFoundingMember ? "yes" : "no"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Owner</CardTitle>
            <CardDescription>Primary admin for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.owner ? (
              <>
                <KV
                  label="Clerk user ID"
                  value={
                    <a
                      href={clerkUserLink(detail.owner.clerkUserId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {detail.owner.clerkUserId}
                    </a>
                  }
                  mono
                />
                <KV label="Email" value={detail.owner.email ?? "—"} />
              </>
            ) : (
              <p className="text-muted-foreground">No owner row found.</p>
            )}
            <div className="grid grid-cols-3 gap-2 pt-3 text-center text-xs">
              <Stat label="Events" value={detail.totalEvents} />
              <Stat label="Files" value={detail.totalFiles} />
              <Stat
                label="Storage"
                value={formatBytes(detail.totalStorageBytes)}
              />
            </div>
            <KV label="Last activity" value={fmt(detail.lastActivityAt)} />
          </CardContent>
        </Card>
      </div>

      <AdminCompanyActions
        companyId={detail.id}
        companySlug={detail.slug}
        companyName={detail.name}
        isDeleted={isDeleted}
        hardDeleteAfter={detail.hardDeleteAfter}
        isFoundingMember={detail.isFoundingMember}
        hasActiveSubscription={
          detail.stripeSubscriptionId != null &&
          (detail.subscriptionStatus === "active" ||
            detail.subscriptionStatus === "trialing" ||
            detail.subscriptionStatus === "past_due")
        }
        planCode={detail.planCode}
        featuresGranted={detail.featuresGranted}
        featuresCatalog={detail.featuresCatalog}
      />

      <Card>
        <CardHeader>
          <CardTitle>Events ({detail.totalEvents} total)</CardTitle>
          <CardDescription>Most recent 10.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Event</th>
                    <th className="py-2 pr-4 font-medium">Retail client</th>
                    <th className="py-2 pr-4 font-medium">Files</th>
                    <th className="py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{ev.name}</td>
                      <td className="py-2 pr-4">
                        {ev.retailClientName}
                        <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                          /{ev.retailClientSlug}
                        </span>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {ev.fileCount}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {fmt(ev.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe billing activity</CardTitle>
          <CardDescription>
            Most recent 10 events from the company billing audit log.
            {detail.stripeCustomerId ? (
              <>
                {" "}
                <a
                  className="text-primary hover:underline"
                  href={`https://dashboard.stripe.com/customers/${detail.stripeCustomerId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Stripe →
                </a>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.billingAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing events.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.billingAudit.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">{row.eventType}</span>
                    {row.fromState || row.toState ? (
                      <span className="ml-2 text-muted-foreground">
                        ({row.fromState ?? "—"} → {row.toState ?? "—"})
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(row.createdAt)}
                    {row.stripeEventId ? ` · ${row.stripeEventId}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin actions on this company</CardTitle>
          <CardDescription>Most recent 20.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.adminAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.adminAudit.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 border-b pb-2 last:border-0"
                >
                  <span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      {row.actionType}
                    </span>
                    <span className="ml-2">{row.description}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(row.createdAt)} · admin{" "}
                    <span className="font-mono">{row.adminClerkUserId}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KV(props: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3">
      <span className="text-muted-foreground">{props.label}</span>
      <span
        className={cn(
          "min-w-0 break-words",
          props.mono ? "font-mono text-xs" : ""
        )}
      >
        {props.value}
      </span>
    </div>
  );
}

function Stat(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{props.value}</div>
    </div>
  );
}
