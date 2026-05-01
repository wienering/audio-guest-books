import { and, isNotNull, isNull, lte } from "drizzle-orm";

import type { AppDbClient } from "@/db/index";
import {
  SYSTEM_RETENTION_SCHEDULER_ADMIN_ID,
  insertAdminAuditLogRow,
} from "@/lib/admin-audit-write";
import { clearComplimentarySubscriptionState } from "@/lib/comp-subscription-revoke-core";
import { companies } from "@/db/schema";

/**
 * Runs in the BullMQ retention worker — must not pull in `server-only` modules.
 */
export async function expireComplimentarySubscriptionsDue(
  dbConn: AppDbClient,
  now = new Date()
): Promise<number> {
  const due = await dbConn
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        isNotNull(companies.compSubscriptionPlanCode),
        isNotNull(companies.compSubscriptionExpiresAt),
        lte(companies.compSubscriptionExpiresAt, now),
        isNull(companies.deletedAt)
      )
    );

  let n = 0;
  for (const row of due) {
    await dbConn.transaction(async (tx) => {
      const res = await clearComplimentarySubscriptionState(tx, row.id);
      if (res.kind === "noop") {
        return;
      }
      await insertAdminAuditLogRow({
        dbConn: tx,
        adminClerkUserId: SYSTEM_RETENTION_SCHEDULER_ADMIN_ID,
        actionType: "comp_subscription_auto_expired",
        description:
          "Complimentary subscription auto-expired: auto_expired_by_scheduler",
        targetCompanyId: res.company.id,
        targetCompanySlug: res.company.slug,
        metadata: {
          previous_plan_code: res.previousPlanCode,
          previous_expires_at: res.previousExpiresAt?.toISOString() ?? null,
          reason: "auto_expired_by_scheduler",
        },
      });
      n += 1;
    });
  }
  return n;
}
