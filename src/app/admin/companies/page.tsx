import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  type AdminCompaniesFilter,
  type AdminCompanyListSort,
  listAdminCompanies,
} from "@/lib/admin-companies";
import { formatDate } from "@/lib/date-format";
import { cn, formatBytes } from "@/lib/utils";

const PAGE_SIZE = 50;

const FILTER_CHIPS: { id: AdminCompaniesFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "soft_deleted", label: "Soft-deleted" },
  { id: "free", label: "Plan: Free" },
  { id: "pro", label: "Plan: Pro" },
  { id: "ultimate", label: "Plan: Ultimate" },
];

const SORTABLE: { key: AdminCompanyListSort; label: string }[] = [
  { key: "slug", label: "Slug" },
  { key: "name", label: "Name" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "total_events", label: "Events" },
  { key: "total_files", label: "Files" },
  { key: "total_storage", label: "Storage" },
  { key: "created_at", label: "Created" },
  { key: "last_activity", label: "Last activity" },
];

function parseSearchParams(sp: Record<string, string | string[] | undefined>) {
  const get = (key: string): string | undefined => {
    const v = sp[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const filterRaw = get("f") ?? "all";
  const filter: AdminCompaniesFilter = (
    [
      "all",
      "active",
      "soft_deleted",
      "free",
      "pro",
      "ultimate",
    ] as AdminCompaniesFilter[]
  ).includes(filterRaw as AdminCompaniesFilter)
    ? (filterRaw as AdminCompaniesFilter)
    : "all";

  const sortRaw = get("sort") ?? "created_at";
  const sortKeys: AdminCompanyListSort[] = SORTABLE.map((s) => s.key);
  const sort: AdminCompanyListSort = sortKeys.includes(
    sortRaw as AdminCompanyListSort
  )
    ? (sortRaw as AdminCompanyListSort)
    : "created_at";

  const dir: "asc" | "desc" = get("dir") === "asc" ? "asc" : "desc";

  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const search = get("q")?.trim() ?? "";

  return { filter, sort, dir, page, search };
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

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const label = formatDate(iso, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return label || "—";
}

export default async function AdminCompaniesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const { filter, sort, dir, page, search } = parseSearchParams(sp);

  const { rows, total } = await listAdminCompanies({
    filter,
    sort,
    dir,
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseQuery = {
    q: search || undefined,
    f: filter !== "all" ? filter : undefined,
    sort,
    dir,
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "company" : "companies"} match the current
          filter.
        </p>
      </div>

      <form
        action="/admin/companies"
        method="get"
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by slug or name…"
          className="h-9 w-72 rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {filter !== "all" ? (
          <input type="hidden" name="f" value={filter} />
        ) : null}
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button
          type="submit"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Search
        </button>
        {search ? (
          <Link
            href={buildHref("/admin/companies", {
              ...baseQuery,
              q: undefined,
            })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = chip.id === filter;
          return (
            <Link
              key={chip.id}
              href={buildHref("/admin/companies", {
                ...baseQuery,
                f: chip.id !== "all" ? chip.id : undefined,
                page: undefined,
              })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              {SORTABLE.map((col) => {
                const active = col.key === sort;
                const nextDir = active && dir === "desc" ? "asc" : "desc";
                return (
                  <th
                    key={col.key}
                    className="border-b px-3 py-2 font-medium"
                  >
                    <Link
                      href={buildHref("/admin/companies", {
                        ...baseQuery,
                        sort: col.key,
                        dir: nextDir,
                        page: undefined,
                      })}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      {active ? (
                        <span aria-hidden className="text-foreground/70">
                          {dir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={SORTABLE.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No companies match.
                </td>
              </tr>
            ) : null}
            {rows.map((c) => {
              const isDeleted = c.deletedAt != null;
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b hover:bg-muted/30",
                    isDeleted && "bg-amber-50/40 dark:bg-amber-950/20"
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/admin/companies/${encodeURIComponent(c.slug)}`}
                      className="text-primary hover:underline"
                    >
                      {c.slug}
                    </Link>
                    {isDeleted ? (
                      <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        SOFT-DELETED
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/companies/${encodeURIComponent(c.slug)}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {c.planName ?? "—"}
                    {c.isFoundingMember ? (
                      <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-900 dark:bg-purple-900/40 dark:text-purple-200">
                        FOUNDING
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.subscriptionStatus ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.totalEvents}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.totalFiles}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatBytes(c.totalStorageBytes)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatRelative(c.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatRelative(c.lastActivityAt)}
                  </td>
                </tr>
              );
            })}
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
                href={buildHref("/admin/companies", {
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
                href={buildHref("/admin/companies", {
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
