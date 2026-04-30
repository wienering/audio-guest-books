import "server-only";

import type { AppDbClient } from "@/db/index";
import { billingAuditLog } from "@/db/schema";

export type BillingAuditInsert = {
  companyId: string;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  stripeEventId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function insertBillingAudit(
  dbConn: AppDbClient,
  row: BillingAuditInsert
): Promise<void> {
  await dbConn.insert(billingAuditLog).values({
    companyId: row.companyId,
    eventType: row.eventType,
    fromState: row.fromState ?? null,
    toState: row.toState ?? null,
    stripeEventId: row.stripeEventId ?? null,
    metadata: row.metadata ?? null,
  });
}
