import type { AppDbClient } from "@/db/index";
import { db } from "@/db/index";
import { adminAuditLog } from "@/db/schema";

export const SYSTEM_RETENTION_SCHEDULER_ADMIN_ID =
  "__system_retention_scheduler__";

export async function insertAdminAuditLogRow(input: {
  dbConn?: AppDbClient;
  adminClerkUserId: string;
  actionType: string;
  description: string;
  targetCompanyId?: string | null;
  targetCompanySlug?: string | null;
  impersonatedCompanyId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const conn = input.dbConn ?? db;
  await conn.insert(adminAuditLog).values({
    adminClerkUserId: input.adminClerkUserId,
    actionType: input.actionType,
    targetCompanyId: input.targetCompanyId ?? null,
    targetCompanySlug: input.targetCompanySlug ?? null,
    targetUserClerkId: null,
    impersonatedCompanyId: input.impersonatedCompanyId ?? null,
    description: input.description,
    metadata: input.metadata ?? null,
  });
}
