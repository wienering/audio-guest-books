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
  themePrimary: string | null;
  themeSecondary: string | null;
  themeAccent: string | null;
  themeBackground: string | null;
  themeText: string | null;
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
        themePrimary: companies.themePrimary,
        themeSecondary: companies.themeSecondary,
        themeAccent: companies.themeAccent,
        themeBackground: companies.themeBackground,
        themeText: companies.themeText,
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
