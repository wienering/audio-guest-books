import "server-only";

import { and, asc, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/index";
import {
  audioFiles,
  billingAuditLog,
  companies,
  eventAnalyticsEvents,
  events,
  plans,
} from "@/db/schema";
import { formatDate, formatDateOnly } from "@/lib/date-format";
import { utcCalendarDate } from "@/lib/retention";

const FOUNDING_CAP = 5;
const ACTIVE_LIKE = ["active", "trialing"] as const;
const ULTIMATE_PRICE_USD = 5;

function startOfTodayUtc(): Date {
  return utcCalendarDate(new Date());
}

function daysAgo(days: number): Date {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export type AdminStatsCounts = {
  totalCompanies: number;
  totalCompaniesActive: number;
  totalCompaniesSoftDeleted: number;
  byPlan: { code: string; name: string; count: number }[];
  totalActiveSubscriptions: number;
  totalTrialingSubscriptions: number;
  mrrUsd: number;
  foundingMembersUsed: number;
  foundingMembersCap: number;
  totalEventsLifetime: number;
  totalEventsLast30Days: number;
  totalFilesLifetime: number;
  totalFilesLast30Days: number;
  totalStorageBytes: number;
  totalPageViewsLifetime: number;
  totalPageViewsLast30Days: number;
  totalDownloadsLifetime: number;
  totalDownloadsLast30Days: number;
};

export async function fetchAdminStatsCounts(): Promise<AdminStatsCounts> {
  const thirtyDaysAgo = daysAgo(30);

  const [
    [totalRow],
    [activeRow],
    [softDeletedRow],
    byPlanRows,
    [activeSubsRow],
    [trialingSubsRow],
    [foundingUsedRow],
    [eventsLifetimeRow],
    [events30Row],
    [filesLifetimeRow],
    [files30Row],
    [storageRow],
    [pvLifetimeRow],
    [pv30Row],
    [dlLifetimeRow],
    [dl30Row],
    [ultimateActiveSubsRow],
  ] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)::int` }).from(companies),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .where(isNull(companies.deletedAt)),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .where(isNotNull(companies.deletedAt)),
    db
      .select({
        code: plans.code,
        name: plans.name,
        n: sql<number>`COUNT(${companies.id})::int`,
      })
      .from(plans)
      .leftJoin(companies, and(eq(companies.planId, plans.id), isNull(companies.deletedAt)))
      .groupBy(plans.code, plans.name, plans.id)
      .orderBy(asc(plans.priceCents)),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .where(eq(companies.subscriptionStatus, "active")),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .where(eq(companies.subscriptionStatus, "trialing")),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .where(
        and(
          eq(companies.isFoundingMember, true),
          inArray(companies.subscriptionStatus, [...ACTIVE_LIKE])
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(events)
      .innerJoin(companies, eq(events.companyId, companies.id))
      .where(isNull(companies.deletedAt)),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(events)
      .innerJoin(companies, eq(events.companyId, companies.id))
      .where(
        and(
          isNull(companies.deletedAt),
          gte(events.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(audioFiles)
      .innerJoin(events, eq(audioFiles.eventId, events.id))
      .innerJoin(companies, eq(events.companyId, companies.id))
      .where(
        and(
          isNull(companies.deletedAt),
          isNull(audioFiles.deletedAt),
          eq(audioFiles.isOriginal, true),
          isNotNull(audioFiles.uploadedAt)
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(audioFiles)
      .innerJoin(events, eq(audioFiles.eventId, events.id))
      .innerJoin(companies, eq(events.companyId, companies.id))
      .where(
        and(
          isNull(companies.deletedAt),
          isNull(audioFiles.deletedAt),
          eq(audioFiles.isOriginal, true),
          isNotNull(audioFiles.uploadedAt),
          gte(audioFiles.uploadedAt, thirtyDaysAgo)
        )
      ),
    db
      .select({
        b: sql<number>`COALESCE(SUM(${audioFiles.sizeBytes})::bigint, 0)`,
      })
      .from(audioFiles)
      .innerJoin(events, eq(audioFiles.eventId, events.id))
      .innerJoin(companies, eq(events.companyId, companies.id))
      .where(
        and(
          isNull(companies.deletedAt),
          isNull(audioFiles.deletedAt)
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(eventAnalyticsEvents)
      .where(eq(eventAnalyticsEvents.eventType, "page_view")),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(eventAnalyticsEvents)
      .where(
        and(
          eq(eventAnalyticsEvents.eventType, "page_view"),
          gte(eventAnalyticsEvents.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(eventAnalyticsEvents)
      .where(
        inArray(eventAnalyticsEvents.eventType, ["file_download", "zip_download"])
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(eventAnalyticsEvents)
      .where(
        and(
          inArray(eventAnalyticsEvents.eventType, ["file_download", "zip_download"]),
          gte(eventAnalyticsEvents.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(companies)
      .innerJoin(plans, eq(companies.planId, plans.id))
      .where(
        and(
          eq(plans.code, "ultimate"),
          inArray(companies.subscriptionStatus, [...ACTIVE_LIKE])
        )
      ),
  ]);

  const ultimateActive = Number(ultimateActiveSubsRow?.n ?? 0);
  const mrrUsd = ultimateActive * ULTIMATE_PRICE_USD;

  return {
    totalCompanies: Number(totalRow?.n ?? 0),
    totalCompaniesActive: Number(activeRow?.n ?? 0),
    totalCompaniesSoftDeleted: Number(softDeletedRow?.n ?? 0),
    byPlan: byPlanRows.map((r) => ({
      code: r.code,
      name: r.name,
      count: Number(r.n ?? 0),
    })),
    totalActiveSubscriptions: Number(activeSubsRow?.n ?? 0),
    totalTrialingSubscriptions: Number(trialingSubsRow?.n ?? 0),
    mrrUsd,
    foundingMembersUsed: Number(foundingUsedRow?.n ?? 0),
    foundingMembersCap: FOUNDING_CAP,
    totalEventsLifetime: Number(eventsLifetimeRow?.n ?? 0),
    totalEventsLast30Days: Number(events30Row?.n ?? 0),
    totalFilesLifetime: Number(filesLifetimeRow?.n ?? 0),
    totalFilesLast30Days: Number(files30Row?.n ?? 0),
    totalStorageBytes: Number(storageRow?.b ?? 0),
    totalPageViewsLifetime: Number(pvLifetimeRow?.n ?? 0),
    totalPageViewsLast30Days: Number(pv30Row?.n ?? 0),
    totalDownloadsLifetime: Number(dlLifetimeRow?.n ?? 0),
    totalDownloadsLast30Days: Number(dl30Row?.n ?? 0),
  };
}

export type AdminStatsDailyRow = {
  day: string;
  signups: number;
  events: number;
  upgrades: number;
};

export async function fetchAdminStatsDailySeries(
  days = 90
): Promise<AdminStatsDailyRow[]> {
  const start = daysAgo(days - 1);

  const dayExpr = (col: ReturnType<typeof sql<unknown>>) =>
    sql<string>`to_char(date_trunc('day', ${col} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

  const [signups, eventsRows, upgrades] = await Promise.all([
    db
      .select({
        day: dayExpr(sql`${companies.createdAt}`),
        n: sql<number>`COUNT(*)::int`,
      })
      .from(companies)
      .where(gte(companies.createdAt, start))
      .groupBy(sql`date_trunc('day', ${companies.createdAt} AT TIME ZONE 'UTC')`),
    db
      .select({
        day: dayExpr(sql`${events.createdAt}`),
        n: sql<number>`COUNT(*)::int`,
      })
      .from(events)
      .where(gte(events.createdAt, start))
      .groupBy(sql`date_trunc('day', ${events.createdAt} AT TIME ZONE 'UTC')`),
    db
      .select({
        day: dayExpr(sql`${billingAuditLog.createdAt}`),
        n: sql<number>`COUNT(*)::int`,
      })
      .from(billingAuditLog)
      .where(
        and(
          gte(billingAuditLog.createdAt, start),
          eq(billingAuditLog.eventType, "subscription_created")
        )
      )
      .groupBy(
        sql`date_trunc('day', ${billingAuditLog.createdAt} AT TIME ZONE 'UTC')`
      ),
  ]);

  const map = new Map<string, AdminStatsDailyRow>();
  const today = startOfTodayUtc();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { day: key, signups: 0, events: 0, upgrades: 0 });
  }

  for (const r of signups) {
    const cur = map.get(r.day);
    if (cur) cur.signups = Number(r.n);
  }
  for (const r of eventsRows) {
    const cur = map.get(r.day);
    if (cur) cur.events = Number(r.n);
  }
  for (const r of upgrades) {
    const cur = map.get(r.day);
    if (cur) cur.upgrades = Number(r.n);
  }

  return [...map.values()];
}

export type AdminStatsAtRiskRow = {
  id: string;
  slug: string;
  name: string;
  reason: string;
  detail: string;
};

export async function fetchAdminStatsAtRisk(): Promise<{
  pastDue: AdminStatsAtRiskRow[];
  hittingLimits: AdminStatsAtRiskRow[];
  inGracePeriod: AdminStatsAtRiskRow[];
}> {
  const today = startOfTodayUtc();

  const pastDueRows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      subscriptionStatus: companies.subscriptionStatus,
      currentPeriodEnd: companies.subscriptionCurrentPeriodEnd,
    })
    .from(companies)
    .where(
      and(
        isNull(companies.deletedAt),
        or(
          eq(companies.subscriptionStatus, "past_due"),
          eq(companies.subscriptionStatus, "unpaid")
        )
      )
    );

  const inGraceRows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      deletedAt: companies.deletedAt,
      hardDeleteAfter: companies.hardDeleteAfter,
    })
    .from(companies)
    .where(
      and(
        isNotNull(companies.deletedAt),
        isNotNull(companies.hardDeleteAfter)
      )
    );

  const limitRows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      planCode: plans.code,
      fileLimitPerEvent: plans.fileLimitPerEvent,
      maxFiles: sql<number>`COALESCE(MAX(file_counts.n)::int, 0)`,
    })
    .from(companies)
    .innerJoin(plans, eq(companies.planId, plans.id))
    .leftJoin(
      sql`(
        SELECT e.company_id AS company_id, COUNT(af.id)::int AS n
        FROM events e
        LEFT JOIN audio_files af
          ON af.event_id = e.id
          AND af.deleted_at IS NULL
          AND af.is_original = true
          AND af.uploaded_at IS NOT NULL
        WHERE e.deleted_at IS NULL
        GROUP BY e.id, e.company_id
      ) AS file_counts`,
      sql`file_counts.company_id = ${companies.id}`
    )
    .where(and(isNull(companies.deletedAt), isNotNull(plans.fileLimitPerEvent)))
    .groupBy(companies.id, plans.code, plans.fileLimitPerEvent);

  const limitsTriggered = limitRows
    .filter((r) => {
      const limit = r.fileLimitPerEvent ?? null;
      if (limit == null) return false;
      const max = Number(r.maxFiles ?? 0);
      return max >= Math.floor(limit * 0.9);
    })
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      reason: "Approaching plan limit",
      detail: `Largest event has ${r.maxFiles}/${r.fileLimitPerEvent} files (${r.planCode})`,
    }));

  return {
    pastDue: pastDueRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      reason: r.subscriptionStatus ?? "past_due",
      detail: r.currentPeriodEnd
        ? `Period ends ${formatDate(r.currentPeriodEnd)}`
        : "No period end on record",
    })),
    hittingLimits: limitsTriggered,
    inGracePeriod: inGraceRows
      .filter((r) => {
        const hda = r.hardDeleteAfter;
        if (!hda) return false;
        const d = hda instanceof Date ? hda : new Date(hda as unknown as string);
        return d.getTime() >= today.getTime();
      })
      .map((r) => {
        const hda = r.hardDeleteAfter;
        const dateLabel =
          hda instanceof Date
            ? formatDateOnly(hda)
            : typeof hda === "string"
              ? formatDateOnly(hda)
              : "—";
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          reason: "Soft-deleted (grace period)",
          detail: `Hard-delete on ${dateLabel}`,
        };
      }),
  };
}
