import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/index";
import {
  adminAuditLog,
  audioFiles,
  billingAuditLog,
  companies,
  companyFeatures,
  companyUsers,
  eventAnalyticsEvents,
  events,
  features,
  plans,
} from "@/db/schema";
import { getClerkPrimaryEmail } from "@/lib/clerk-primary-email";

export type AdminCompanyDetailFeatureRow = {
  featureId: string;
  featureKey: string;
  featureName: string;
  featureDescription: string | null;
  source: "plan" | "admin_grant" | "founding_member";
  grantedAt: string;
  expiresAt: string | null;
};

export type AdminCompanyDetailEventRow = {
  id: string;
  name: string;
  retailClientName: string;
  retailClientSlug: string;
  fileCount: number;
  createdAt: string;
};

export type AdminCompanyDetailBillingAuditRow = {
  id: string;
  eventType: string;
  fromState: string | null;
  toState: string | null;
  stripeEventId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminCompanyDetailAdminAuditRow = {
  id: string;
  adminClerkUserId: string;
  actionType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminCompanyDetailFeatureCatalogRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

export type AdminCompanyDetail = {
  id: string;
  slug: string;
  name: string;
  planId: string;
  planCode: string | null;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanCode: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  isFoundingMember: boolean;
  deletedAt: string | null;
  hardDeleteAfter: string | null;
  deletionRequestedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  totalEvents: number;
  totalFiles: number;
  totalStorageBytes: number;
  lastActivityAt: string | null;
  owner: {
    clerkUserId: string;
    email: string | null;
  } | null;
  featuresGranted: AdminCompanyDetailFeatureRow[];
  featuresCatalog: AdminCompanyDetailFeatureCatalogRow[];
  recentEvents: AdminCompanyDetailEventRow[];
  billingAudit: AdminCompanyDetailBillingAuditRow[];
  adminAudit: AdminCompanyDetailAdminAuditRow[];
};

export async function getAdminCompanyDetailBySlug(
  slug: string
): Promise<AdminCompanyDetail | null> {
  const [companyRow] = await db
    .select({
      company: companies,
      plan: plans,
    })
    .from(companies)
    .leftJoin(plans, eq(companies.planId, plans.id))
    .where(eq(companies.slug, slug))
    .limit(1);

  if (!companyRow) return null;
  const c = companyRow.company;

  const [
    [aggregates],
    featuresGrantedRows,
    featuresCatalog,
    eventCountRow,
    recentEventRows,
    billingAuditRows,
    adminAuditRows,
    ownerRow,
  ] = await Promise.all([
    db
      .select({
        files: sql<number>`COALESCE(SUM(CASE WHEN ${audioFiles.isOriginal} = true AND ${audioFiles.uploadedAt} IS NOT NULL AND ${audioFiles.deletedAt} IS NULL THEN 1 ELSE 0 END)::int, 0)`,
        storage: sql<number>`COALESCE(SUM(CASE WHEN ${audioFiles.deletedAt} IS NULL THEN ${audioFiles.sizeBytes} ELSE 0 END)::bigint, 0)`,
      })
      .from(audioFiles)
      .innerJoin(events, eq(audioFiles.eventId, events.id))
      .where(
        and(eq(events.companyId, c.id), isNull(events.deletedAt))
      ),
    db
      .select({
        featureId: companyFeatures.featureId,
        source: companyFeatures.source,
        grantedAt: companyFeatures.grantedAt,
        expiresAt: companyFeatures.expiresAt,
        featureKey: features.key,
        featureName: features.name,
        featureDescription: features.description,
      })
      .from(companyFeatures)
      .innerJoin(features, eq(companyFeatures.featureId, features.id))
      .where(eq(companyFeatures.companyId, c.id))
      .orderBy(asc(features.name)),
    db
      .select({
        id: features.id,
        key: features.key,
        name: features.name,
        description: features.description,
      })
      .from(features)
      .orderBy(asc(features.name)),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(events)
      .where(
        and(eq(events.companyId, c.id), isNull(events.deletedAt))
      ),
    db
      .select({
        id: events.id,
        name: events.name,
        retailClientName: events.retailClientName,
        retailClientSlug: events.retailClientSlug,
        createdAt: events.createdAt,
        fileCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int
          FROM "audio_files" "af"
          WHERE "af"."event_id" = ${events.id}
            AND "af"."deleted_at" IS NULL
            AND "af"."is_original" = true
            AND "af"."uploaded_at" IS NOT NULL
        ), 0)`,
      })
      .from(events)
      .where(eq(events.companyId, c.id))
      .orderBy(desc(events.createdAt))
      .limit(10),
    db
      .select()
      .from(billingAuditLog)
      .where(eq(billingAuditLog.companyId, c.id))
      .orderBy(desc(billingAuditLog.createdAt))
      .limit(10),
    db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.targetCompanyId, c.id))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(20),
    db
      .select({ clerkUserId: companyUsers.clerkUserId })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, c.id),
          eq(companyUsers.role, "owner")
        )
      )
      .orderBy(asc(companyUsers.createdAt))
      .limit(1),
  ]);

  const lastActivityRow = await db
    .select({
      max: sql<Date | string | null>`MAX(${eventAnalyticsEvents.createdAt})`,
    })
    .from(eventAnalyticsEvents)
    .innerJoin(events, eq(eventAnalyticsEvents.eventId, events.id))
    .where(eq(events.companyId, c.id));

  const lastActivityRaw = lastActivityRow[0]?.max ?? null;
  const lastActivityAt = lastActivityRaw
    ? new Date(
        lastActivityRaw instanceof Date
          ? lastActivityRaw.getTime()
          : (lastActivityRaw as string)
      ).toISOString()
    : null;

  const ownerClerkId = ownerRow[0]?.clerkUserId ?? null;
  const ownerEmail = ownerClerkId
    ? await getClerkPrimaryEmail(ownerClerkId)
    : null;

  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    planId: c.planId,
    planCode: companyRow.plan?.code ?? null,
    planName: companyRow.plan?.name ?? null,
    stripeCustomerId: c.stripeCustomerId,
    stripeSubscriptionId: c.stripeSubscriptionId,
    subscriptionStatus: c.subscriptionStatus,
    subscriptionPlanCode: c.subscriptionPlanCode,
    subscriptionCurrentPeriodEnd:
      c.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
    subscriptionCancelAtPeriodEnd: c.subscriptionCancelAtPeriodEnd,
    isFoundingMember: c.isFoundingMember,
    deletedAt: c.deletedAt?.toISOString() ?? null,
    hardDeleteAfter:
      c.hardDeleteAfter instanceof Date
        ? c.hardDeleteAfter.toISOString().slice(0, 10)
        : c.hardDeleteAfter ?? null,
    deletionRequestedByUserId: c.deletionRequestedByUserId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    totalEvents: Number(eventCountRow[0]?.n ?? 0),
    totalFiles: Number(aggregates?.files ?? 0),
    totalStorageBytes: Number(aggregates?.storage ?? 0),
    lastActivityAt,
    owner: ownerClerkId
      ? { clerkUserId: ownerClerkId, email: ownerEmail }
      : null,
    featuresGranted: featuresGrantedRows.map((f) => ({
      featureId: f.featureId,
      featureKey: f.featureKey,
      featureName: f.featureName,
      featureDescription: f.featureDescription,
      source: f.source,
      grantedAt: f.grantedAt.toISOString(),
      expiresAt: f.expiresAt?.toISOString() ?? null,
    })),
    featuresCatalog: featuresCatalog.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
    })),
    recentEvents: recentEventRows.map((e) => ({
      id: e.id,
      name: e.name,
      retailClientName: e.retailClientName,
      retailClientSlug: e.retailClientSlug,
      fileCount: Number(e.fileCount ?? 0),
      createdAt: e.createdAt.toISOString(),
    })),
    billingAudit: billingAuditRows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      fromState: r.fromState,
      toState: r.toState,
      stripeEventId: r.stripeEventId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
    adminAudit: adminAuditRows.map((r) => ({
      id: r.id,
      adminClerkUserId: r.adminClerkUserId,
      actionType: r.actionType,
      description: r.description,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getCompanyByIdForAdmin(
  companyId: string
): Promise<typeof companies.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return row ?? null;
}

export async function findFeatureByKey(
  featureKey: string
): Promise<typeof features.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(features)
    .where(eq(features.key, featureKey))
    .limit(1);
  return row ?? null;
}

/** Used by /admin/founding-members to enumerate flagged accounts. */
export type AdminFoundingMemberRow = {
  id: string;
  slug: string;
  name: string;
  subscriptionStatus: string | null;
  subscriptionPlanCode: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  foundingMemberSince: string | null;
  createdAt: string;
};

export async function listFoundingMembers(): Promise<
  AdminFoundingMemberRow[]
> {
  const rows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      subscriptionStatus: companies.subscriptionStatus,
      subscriptionPlanCode: companies.subscriptionPlanCode,
      subscriptionCurrentPeriodEnd: companies.subscriptionCurrentPeriodEnd,
      subscriptionCancelAtPeriodEnd: companies.subscriptionCancelAtPeriodEnd,
      createdAt: companies.createdAt,
      foundingFeatureGrantedAt: sql<
        Date | string | null
      >`(SELECT "cf"."granted_at" FROM "company_features" "cf" WHERE "cf"."company_id" = ${companies.id} AND "cf"."source" = 'founding_member' ORDER BY "cf"."granted_at" ASC LIMIT 1)`,
    })
    .from(companies)
    .where(
      and(
        eq(companies.isFoundingMember, true),
        isNull(companies.deletedAt)
      )
    )
    .orderBy(asc(companies.createdAt));

  return rows.map((r) => {
    const fgAt = r.foundingFeatureGrantedAt;
    let foundingMemberSince: string | null = null;
    if (fgAt) {
      const d = fgAt instanceof Date ? fgAt : new Date(fgAt as string);
      foundingMemberSince = Number.isNaN(d.getTime())
        ? null
        : d.toISOString();
    } else {
      foundingMemberSince = r.createdAt.toISOString();
    }

    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      subscriptionStatus: r.subscriptionStatus,
      subscriptionPlanCode: r.subscriptionPlanCode,
      subscriptionCurrentPeriodEnd:
        r.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
      subscriptionCancelAtPeriodEnd: r.subscriptionCancelAtPeriodEnd,
      foundingMemberSince,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
