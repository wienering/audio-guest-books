import "server-only";

import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";

import { db } from "@/db/index";
import { adminAuditLog, companies } from "@/db/schema";

export type AdminAuditQueryOptions = {
  actionType?: string;
  adminClerkUserId?: string;
  targetCompanyQuery?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  pageSize?: number;
  dir?: "asc" | "desc";
};

export type AdminAuditQueryRow = {
  id: string;
  adminClerkUserId: string;
  actionType: string;
  description: string;
  targetCompanyId: string | null;
  targetCompanySlug: string | null;
  targetUserClerkId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAuditQueryResult = {
  rows: AdminAuditQueryRow[];
  total: number;
  page: number;
  pageSize: number;
  distinctActionTypes: string[];
  distinctAdminIds: string[];
};

export async function listAdminAuditEntries(
  opts: AdminAuditQueryOptions
): Promise<AdminAuditQueryResult> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.max(1, Math.min(200, Math.floor(opts.pageSize ?? 50)));
  const dir = opts.dir ?? "desc";

  const conditions = [];
  if (opts.actionType) {
    conditions.push(eq(adminAuditLog.actionType, opts.actionType));
  }
  if (opts.adminClerkUserId) {
    conditions.push(eq(adminAuditLog.adminClerkUserId, opts.adminClerkUserId));
  }
  if (opts.fromDate) {
    conditions.push(gte(adminAuditLog.createdAt, opts.fromDate));
  }
  if (opts.toDate) {
    conditions.push(lt(adminAuditLog.createdAt, opts.toDate));
  }
  if (opts.targetCompanyQuery && opts.targetCompanyQuery.trim()) {
    const q = opts.targetCompanyQuery.trim();
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(adminAuditLog.targetCompanySlug, pattern),
        eq(adminAuditLog.targetCompanyId, q)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(adminAuditLog)
    .where(where);

  const orderBy = dir === "asc" ? asc(adminAuditLog.createdAt) : desc(adminAuditLog.createdAt);

  const rows = await db
    .select({
      id: adminAuditLog.id,
      adminClerkUserId: adminAuditLog.adminClerkUserId,
      actionType: adminAuditLog.actionType,
      description: adminAuditLog.description,
      targetCompanyId: adminAuditLog.targetCompanyId,
      targetCompanySlug: adminAuditLog.targetCompanySlug,
      targetUserClerkId: adminAuditLog.targetUserClerkId,
      metadata: adminAuditLog.metadata,
      createdAt: adminAuditLog.createdAt,
      currentSlug: companies.slug,
    })
    .from(adminAuditLog)
    .leftJoin(companies, eq(adminAuditLog.targetCompanyId, companies.id))
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [actionTypeRows, adminIdRows] = await Promise.all([
    db
      .select({ a: adminAuditLog.actionType })
      .from(adminAuditLog)
      .groupBy(adminAuditLog.actionType)
      .orderBy(asc(adminAuditLog.actionType)),
    db
      .select({ a: adminAuditLog.adminClerkUserId })
      .from(adminAuditLog)
      .groupBy(adminAuditLog.adminClerkUserId)
      .orderBy(asc(adminAuditLog.adminClerkUserId)),
  ]);

  return {
    total: Number(totalRow?.n ?? 0),
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      adminClerkUserId: r.adminClerkUserId,
      actionType: r.actionType,
      description: r.description,
      targetCompanyId: r.targetCompanyId,
      targetCompanySlug: r.targetCompanySlug ?? r.currentSlug ?? null,
      targetUserClerkId: r.targetUserClerkId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
    distinctActionTypes: actionTypeRows.map((r) => r.a),
    distinctAdminIds: adminIdRows.map((r) => r.a),
  };
}
