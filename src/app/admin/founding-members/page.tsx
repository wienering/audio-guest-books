import Link from "next/link";

import { FoundingToggleButton } from "@/app/admin/founding-members/founding-toggle-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listFoundingMembers } from "@/lib/admin-company-detail";
import { formatDate } from "@/lib/date-format";

const FOUNDING_CAP = 5;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const label = formatDate(iso, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return label || "—";
}

export default async function AdminFoundingMembersPage() {
  const members = await listFoundingMembers();
  const used = members.filter(
    (m) =>
      m.subscriptionStatus === "active" ||
      m.subscriptionStatus === "trialing"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Founding members
        </h1>
        <p className="text-sm text-muted-foreground">
          Workspaces flagged with <code>is_founding_member = true</code>.
          Toggling the flag does <strong>not</strong> change Stripe pricing —
          migrate the price separately if needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available slots</CardTitle>
          <CardDescription>
            Counts active / trialing subscriptions only. Lifetime cap is{" "}
            {FOUNDING_CAP}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums">
              {used} / {FOUNDING_CAP}
            </span>
            <span className="text-sm text-muted-foreground">used</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {Math.max(0, FOUNDING_CAP - used)} remaining
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            All companies currently flagged as founding members, regardless of
            their Stripe subscription state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No founding members yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Slug</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Sub plan code</th>
                    <th className="py-2 pr-4 font-medium">Period end</th>
                    <th className="py-2 pr-4 font-medium">Founding since</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        <Link
                          href={`/admin/companies/${encodeURIComponent(m.slug)}`}
                          className="text-primary hover:underline"
                        >
                          {m.slug}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {m.name}
                        </div>
                      </td>
                      <td className="py-2 pr-4 capitalize">
                        {m.subscriptionStatus ?? "—"}
                        {m.subscriptionCancelAtPeriodEnd ? (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                            ENDING
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {m.subscriptionPlanCode ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {fmtDate(m.subscriptionCurrentPeriodEnd)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {fmtDate(m.foundingMemberSince)}
                      </td>
                      <td className="py-2 text-right">
                        <FoundingToggleButton
                          companyId={m.id}
                          companySlug={m.slug}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
