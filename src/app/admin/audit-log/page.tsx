import Link from "next/link";

import { AuditLogRow } from "@/app/admin/audit-log/audit-log-row";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAdminAuditEntries } from "@/lib/admin-audit-query";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function getStr(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseDate(s: string | undefined, endOfDay: boolean): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const iso = endOfDay ? `${s}T23:59:59.999Z` : `${s}T00:00:00.000Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildHref(
  base: string,
  params: Record<string, string | number | undefined>
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AdminAuditLogPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const actionType = getStr(sp, "action") ?? "";
  const adminClerkUserId = getStr(sp, "admin") ?? "";
  const targetCompanyQuery = getStr(sp, "company") ?? "";
  const fromStr = getStr(sp, "from") ?? "";
  const toStr = getStr(sp, "to") ?? "";
  const dir = getStr(sp, "dir") === "asc" ? "asc" : "desc";
  const pageRaw = Number.parseInt(getStr(sp, "page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const fromDate = parseDate(fromStr || undefined, false);
  const toDate = parseDate(toStr || undefined, true);

  const result = await listAdminAuditEntries({
    actionType: actionType || undefined,
    adminClerkUserId: adminClerkUserId || undefined,
    targetCompanyQuery: targetCompanyQuery || undefined,
    fromDate,
    toDate,
    page,
    pageSize: PAGE_SIZE,
    dir,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const baseQuery = {
    action: actionType || undefined,
    admin: adminClerkUserId || undefined,
    company: targetCompanyQuery || undefined,
    from: fromStr || undefined,
    to: toStr || undefined,
    dir: dir === "asc" ? "asc" : undefined,
  } as const;

  const hasFilters =
    actionType || adminClerkUserId || targetCompanyQuery || fromStr || toStr;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} {result.total === 1 ? "entry" : "entries"} match the
          current filter.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow down by action type, admin user, company slug, or date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/admin/audit-log"
            method="get"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Action type
              <select
                name="action"
                defaultValue={actionType}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All</option>
                {result.distinctActionTypes.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Admin user (Clerk ID)
              <select
                name="admin"
                defaultValue={adminClerkUserId}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All</option>
                {result.distinctAdminIds.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Target company (slug or ID)
              <input
                name="company"
                defaultValue={targetCompanyQuery}
                placeholder="acme or UUID"
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              From (UTC)
              <input
                type="date"
                name="from"
                defaultValue={fromStr}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              To (UTC, inclusive)
              <input
                type="date"
                name="to"
                defaultValue={toStr}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Order
              <select
                name="dir"
                defaultValue={dir}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
            <div className="col-span-full flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Apply filters
              </button>
              {hasFilters ? (
                <Link
                  href="/admin/audit-log"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Clear all
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">Admin</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No audit entries match.
                </td>
              </tr>
            ) : null}
            {result.rows.map((row) => (
              <AuditLogRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildHref("/admin/audit-log", {
                  ...baseQuery,
                  page: page - 1,
                })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                ← Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildHref("/admin/audit-log", {
                  ...baseQuery,
                  page: page + 1,
                })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
