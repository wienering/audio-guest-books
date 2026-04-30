import "server-only";

import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { companies, companyUsers, plans } from "@/db/schema";

type CompanyPlanRow = InferSelectModel<typeof plans>;
type CompanyRow = InferSelectModel<typeof companies> & {
  plan: CompanyPlanRow | null;
};

export type MembershipWithCompany = InferSelectModel<typeof companyUsers> & {
  company: CompanyRow;
};

export async function getMembershipWithCompany(
  clerkUserId: string
): Promise<MembershipWithCompany | undefined> {
  const row = await db.query.companyUsers.findFirst({
    where: eq(companyUsers.clerkUserId, clerkUserId),
    with: {
      company: {
        with: {
          plan: true,
        },
      },
    },
  });
  if (!row?.company) return undefined;
  if (row.company.deletedAt != null) return undefined;
  return row as MembershipWithCompany;
}

/** User still maps to a company that has been marked for deletion (grace period). */
export async function getSoftDeletedMembershipInfo(clerkUserId: string) {
  const row = await db.query.companyUsers.findFirst({
    where: eq(companyUsers.clerkUserId, clerkUserId),
    with: { company: true },
  });
  const c = row?.company as InferSelectModel<typeof companies> | undefined;
  if (!c?.deletedAt) return null;
  return { hardDeleteAfter: c.hardDeleteAfter ?? null };
}

/** Returns true when any row exists for this slug, including soft-deleted companies still in grace. */
export async function isCompanySlugTaken(slug: string): Promise<boolean> {
  const [hit] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  return Boolean(hit);
}
