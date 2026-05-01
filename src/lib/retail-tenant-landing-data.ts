import "server-only";

import { cache } from "react";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/index";
import { companies } from "@/db/schema";

export type RetailTenantLandingCompanyRow = {
  id: string;
  name: string;
  slug: string;
  logoStorageKey: string | null;
  branding: unknown;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
};

export const getRetailTenantLandingCompany = cache(
  async (
    companyId: string
  ): Promise<RetailTenantLandingCompanyRow | undefined> => {
    const [row] = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logoStorageKey: companies.logoStorageKey,
        branding: companies.branding,
        contactEmail: companies.contactEmail,
        contactPhone: companies.contactPhone,
        contactWebsite: companies.contactWebsite,
      })
      .from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
      .limit(1);

    return row;
  }
);
