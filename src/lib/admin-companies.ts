import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db/index";
import { companies, plans } from "@/db/schema";

export type AdminCompaniesFilter =
  | "all"
  | "active"
  | "soft_deleted"
  | "free"
  | "pro"
  | "ultimate";

export type AdminCompanyListSort =
  | "slug"
  | "name"
  | "plan"
  | "status"
  | "total_events"
  | "total_files"
  | "total_storage"
  | "created_at"
  | "last_activity";

export type AdminCompanyListRow = {
  id: string;
  slug: string;
  name: string;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanCode: string | null;
  isFoundingMember: boolean;
  totalEvents: number;
  totalFiles: number;
  totalStorageBytes: number;
  createdAt: string;
  lastActivityAt: string | null;
  deletedAt: string | null;
  hardDeleteAfter: string | null;
};

export type AdminCompanyListResult = {
  rows: AdminCompanyListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminCompanyListOptions = {
  search?: string;
  filter?: AdminCompaniesFilter;
  sort?: AdminCompanyListSort;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const totalEventsExpr = sql<number>`COALESCE((SELECT COUNT(*)::int FROM "events" "e" WHERE "e"."company_id" = ${companies.id} AND "e"."deleted_at" IS NULL), 0)`;

const totalFilesExpr = sql<number>`COALESCE((
  SELECT COUNT(*)::int
  FROM "audio_files" "af"
  INNER JOIN "events" "e" ON "af"."event_id" = "e"."id"
  WHERE "e"."company_id" = ${companies.id}
    AND "e"."deleted_at" IS NULL
    AND "af"."deleted_at" IS NULL
    AND "af"."is_original" = true
    AND "af"."uploaded_at" IS NOT NULL
), 0)`;

const totalStorageExpr = sql<number>`COALESCE((
  SELECT SUM("af"."size_bytes")::bigint
  FROM "audio_files" "af"
  INNER JOIN "events" "e" ON "af"."event_id" = "e"."id"
  WHERE "e"."company_id" = ${companies.id}
    AND "e"."deleted_at" IS NULL
    AND "af"."deleted_at" IS NULL
), 0)`;

const lastActivityExpr = sql<Date | string | null>`(
  SELECT MAX("eae"."created_at")
  FROM "event_analytics_events" "eae"
  INNER JOIN "events" "e" ON "eae"."event_id" = "e"."id"
  WHERE "e"."company_id" = ${companies.id}
)`;

function maybeDateToIso(v: unknown): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function maybeDateToYyyyMmDd(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v);
  return s.slice(0, 10);
}

export async function listAdminCompanies(
  opts: AdminCompanyListOptions
): Promise<AdminCompanyListResult> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.max(1, Math.min(200, Math.floor(opts.pageSize ?? 50)));
  const dir = opts.dir ?? "desc";
  const sortKey: AdminCompanyListSort = opts.sort ?? "created_at";
  const filter: AdminCompaniesFilter = opts.filter ?? "all";
  const search = opts.search?.trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(ilike(companies.slug, pattern), ilike(companies.name, pattern))
    );
  }

  if (filter === "active") {
    conditions.push(isNull(companies.deletedAt));
  } else if (filter === "soft_deleted") {
    conditions.push(isNotNull(companies.deletedAt));
  } else if (filter === "free" || filter === "pro" || filter === "ultimate") {
    conditions.push(eq(plans.code, filter));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderExpr = (() => {
    const dirFn = dir === "asc" ? asc : desc;
    switch (sortKey) {
      case "slug":
        return dirFn(companies.slug);
      case "name":
        return dirFn(companies.name);
      case "plan":
        return dirFn(plans.code);
      case "status":
        return dirFn(companies.subscriptionStatus);
      case "total_events":
        return dirFn(totalEventsExpr);
      case "total_files":
        return dirFn(totalFilesExpr);
      case "total_storage":
        return dirFn(totalStorageExpr);
      case "last_activity":
        return dirFn(lastActivityExpr);
      case "created_at":
      default:
        return dirFn(companies.createdAt);
    }
  })();

  const totalRows = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(companies)
    .leftJoin(plans, eq(companies.planId, plans.id))
    .where(where);

  const total = Number(totalRows[0]?.n ?? 0);

  const rows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      planCode: plans.code,
      planName: plans.name,
      subscriptionStatus: companies.subscriptionStatus,
      subscriptionPlanCode: companies.subscriptionPlanCode,
      isFoundingMember: companies.isFoundingMember,
      createdAt: companies.createdAt,
      deletedAt: companies.deletedAt,
      hardDeleteAfter: companies.hardDeleteAfter,
      totalEvents: totalEventsExpr,
      totalFiles: totalFilesExpr,
      totalStorage: totalStorageExpr,
      lastActivity: lastActivityExpr,
    })
    .from(companies)
    .leftJoin(plans, eq(companies.planId, plans.id))
    .where(where)
    .orderBy(orderExpr, desc(companies.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      planCode: r.planCode,
      planName: r.planName,
      subscriptionStatus: r.subscriptionStatus,
      subscriptionPlanCode: r.subscriptionPlanCode,
      isFoundingMember: r.isFoundingMember,
      totalEvents: Number(r.totalEvents ?? 0),
      totalFiles: Number(r.totalFiles ?? 0),
      totalStorageBytes: Number(r.totalStorage ?? 0),
      createdAt: r.createdAt.toISOString(),
      lastActivityAt: maybeDateToIso(r.lastActivity),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      hardDeleteAfter: maybeDateToYyyyMmDd(r.hardDeleteAfter),
    })),
    total,
    page,
    pageSize,
  };
}
