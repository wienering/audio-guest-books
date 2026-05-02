import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { AppDbClient } from "@/db/index";
import { db } from "@/db/index";
import { adminAuditLog } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";

export type AdminActionType =
  | "feature_granted"
  | "feature_revoked"
  | "company_soft_deleted"
  | "company_undeleted"
  | "company_hard_delete_now"
  | "subscription_canceled"
  | "plan_changed"
  | "founding_member_toggled"
  | "retention_scheduler_run"
  | "subscriptions_synced"
  | "event_edited"
  | "event_soft_deleted"
  | "event_restored"
  | "event_hard_deleted"
  | "comp_subscription_granted"
  | "comp_subscription_revoked"
  | "comp_subscription_extended"
  | "comp_subscription_auto_expired"
  | "impersonation_started"
  | "impersonation_session_end"
  | "impersonation_dashboard_mutation";

export type LogAdminActionInput = {
  actionType: AdminActionType;
  description: string;
  targetCompanyId?: string | null;
  targetCompanySlug?: string | null;
  targetUserClerkId?: string | null;
  /** Company context when a platform admin is using the product as the owner. */
  impersonatedCompanyId?: string | null;
  metadata?: Record<string, unknown> | null;
  /**
   * Optional override (e.g. inside a transaction). When omitted, falls back to
   * the singleton `db` and resolves the admin id via Clerk auth().
   */
  dbConn?: AppDbClient;
  adminClerkUserId?: string;
};

export function getActorSubFromAuth(session: {
  actor?: unknown;
}): string | undefined {
  const a = session.actor;
  if (!a || typeof a !== "object" || !("sub" in a)) return undefined;
  const sub = (a as { sub?: unknown }).sub;
  return typeof sub === "string" ? sub : undefined;
}

/**
 * Writes a row to admin_audit_log. Resolves the actor from Clerk when not
 * provided, and rejects if the actor isn't actually an admin (defense in
 * depth — every admin mutation API also calls requireAdminAccess()).
 *
 * When the session is an impersonation (Clerk actor token), `userId` is the
 * subject and `actor.sub` is the real platform admin — we attribute the row to
 * the latter.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  const session = await auth();
  const actorSub = getActorSubFromAuth(session);

  let adminId = input.adminClerkUserId;
  if (!adminId) {
    if (actorSub && isAdminUser(actorSub)) {
      adminId = actorSub;
    } else {
      adminId = session.userId ?? undefined;
    }
  }

  if (!adminId || !isAdminUser(adminId)) {
    throw new Error("admin_audit_no_admin_actor");
  }

  const conn: AppDbClient = input.dbConn ?? db;

  await conn.insert(adminAuditLog).values({
    adminClerkUserId: adminId,
    actionType: input.actionType,
    targetCompanyId: input.targetCompanyId ?? null,
    targetCompanySlug: input.targetCompanySlug ?? null,
    targetUserClerkId: input.targetUserClerkId ?? null,
    impersonatedCompanyId: input.impersonatedCompanyId ?? null,
    description: input.description,
    metadata: input.metadata ?? null,
  });
}
