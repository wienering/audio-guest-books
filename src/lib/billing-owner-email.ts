import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/index";
import { companyUsers } from "@/db/schema";
import { getClerkPrimaryEmail } from "@/lib/clerk-primary-email";

export async function getCompanyOwnerEmail(
  companyId: string
): Promise<string | null> {
  const [owner] = await db
    .select({ clerkUserId: companyUsers.clerkUserId })
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.role, "owner")
      )
    )
    .limit(1);
  if (!owner) {
    return null;
  }
  return getClerkPrimaryEmail(owner.clerkUserId);
}
