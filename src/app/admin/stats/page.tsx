import Link from "next/link";

import { StatsChart } from "@/app/admin/stats/stats-chart";
import { StatsQuickActions } from "@/app/admin/stats/stats-quick-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchAdminStatsAtRisk,
  fetchAdminStatsCounts,
  fetchAdminStatsDailySeries,
} from "@/lib/admin-stats";
import { cn, formatBytes } from "@/lib/utils";

function formatUsd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export default async function AdminStatsPage() {
  const [counts, daily, atRisk] = await Promise.all([
    fetchAdminStatsCounts(),
    fetchAdminStatsDailySeries(90),
    fetchAdminStatsAtRisk(),
  ]);

  const totalAtRisk =
    atRisk.pastDue.length +
    atRisk.hittingLimits.length +
    atRisk.inGracePeriod.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform stats
        </h1>
        <p className="text-sm text-muted-foreground">
          High-level metrics across all companies and a 90-day activity chart.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <StatBlock
          label="Companies"
          value={formatNumber(counts.totalCompaniesActive)}
          sub={`${counts.totalCompaniesSoftDeleted} soft-deleted, ${counts.totalCompanies} total`}
        />
        <StatBlock
          label="Active subscriptions"
          value={formatNumber(counts.totalActiveSubscriptions)}
          sub={`${counts.totalTrialingSubscriptions} trialing`}
        />
        <StatBlock
          label="MRR"
          value={formatUsd(counts.mrrUsd)}
          sub={`Active+trialing Ultimate × $5`}
        />
        <StatBlock
          label="Founding members used"
          value={`${counts.foundingMembersUsed} / ${counts.foundingMembersCap}`}
          sub={`${Math.max(0, counts.foundingMembersCap - counts.foundingMembersUsed)} remaining`}
        />
        <StatBlock
          label="Events (lifetime / 30d)"
          value={`${formatNumber(counts.totalEventsLifetime)} / ${formatNumber(counts.totalEventsLast30Days)}`}
        />
        <StatBlock
          label="Files (lifetime / 30d)"
          value={`${formatNumber(counts.totalFilesLifetime)} / ${formatNumber(counts.totalFilesLast30Days)}`}
        />
        <StatBlock
          label="Total storage"
          value={formatBytes(counts.totalStorageBytes)}
        />
        <StatBlock
          label="Page views (lifetime / 30d)"
          value={`${formatNumber(counts.totalPageViewsLifetime)} / ${formatNumber(counts.totalPageViewsLast30Days)}`}
          sub={`Downloads: ${formatNumber(counts.totalDownloadsLifetime)} / ${formatNumber(counts.totalDownloadsLast30Days)}`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Companies by plan</CardTitle>
          <CardDescription>Active workspaces only.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {counts.byPlan.map((p) => (
              <div
                key={p.code}
                className="rounded border bg-muted/30 px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {p.name}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {p.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity (last 90 days)</CardTitle>
          <CardDescription>
            Daily new signups, events created, and upgrades to paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatsChart data={daily} />
        </CardContent>
      </Card>

      <Card
        className={cn(
          totalAtRisk > 0
            ? "border-amber-500/40 ring-1 ring-amber-500/30"
            : ""
        )}
      >
        <CardHeader>
          <CardTitle>At risk ({totalAtRisk})</CardTitle>
          <CardDescription>
            Subscriptions in past_due / unpaid, companies near plan limits, and
            soft-deleted companies still in grace period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AtRiskList
            title={`Past-due / unpaid subscriptions (${atRisk.pastDue.length})`}
            rows={atRisk.pastDue}
            emptyText="No past-due subscriptions."
          />
          <AtRiskList
            title={`Hitting plan limits (${atRisk.hittingLimits.length})`}
            rows={atRisk.hittingLimits}
            emptyText="No companies near plan limits."
          />
          <AtRiskList
            title={`Soft-deleted in grace period (${atRisk.inGracePeriod.length})`}
            rows={atRisk.inGracePeriod}
            emptyText="No soft-deleted companies in grace."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Operational tasks. Each action is recorded in the audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatsQuickActions />
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock(props: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {props.label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {props.value}
        </div>
        {props.sub ? (
          <div className="mt-1 text-xs text-muted-foreground">{props.sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AtRiskList(props: {
  title: string;
  rows: { id: string; slug: string; name: string; reason: string; detail: string }[];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{props.title}</h3>
      {props.rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{props.emptyText}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {props.rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0 border-b pb-1 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
            >
              <Link
                href={`/admin/companies/${encodeURIComponent(r.slug)}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {r.slug}
              </Link>
              <span className="text-xs text-muted-foreground">
                {r.reason} · {r.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
