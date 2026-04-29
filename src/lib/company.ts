import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { companyUsers } from "@/db/schema";

export async function getMembershipWithCompany(clerkUserId: string) {
  const row = await db.query.companyUsers.findFirst({
    where: eq(companyUsers.clerkUserId, clerkUserId),
    with: {
      company: true,
    },
  });
  return row;
}
