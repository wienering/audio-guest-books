import type { Metadata } from "next";
import { headers } from "next/headers";

import { MarketingHome } from "@/components/marketing/home-page";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { RetailTenantLanding } from "@/components/retail/retail-tenant-landing";
import {
  ReservedSubdomainMessage,
  TenantNotFoundMessage,
} from "@/components/retail/tenant-messages";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignGetUrl } from "@/lib/r2";
import {
  marketingCanonical,
  marketingOpenGraphExtras,
  marketingTwitterExtras,
} from "@/lib/marketing-seo-defaults";
import { getRetailTenantLandingCompany } from "@/lib/retail-tenant-landing-data";
import {
  getBreadcrumbSchema,
  getDeliverAudioGuestBookHowToSchema,
  getMarketingHomeWebPageSchema,
  getOrganizationSchema,
  getSoftwareApplicationSchema,
  getWebSiteSchema,
  SCHEMA_BASE_URL,
} from "@/lib/schema";

/** Shared with homepage JSON-LD WebPage `name` / `description`. ~155 chars for OG/meta. */
const MARKETING_HOME_PAGE_TITLE =
  "Audio Guest Books — Deliver Audio Guest Books Professionally";
const MARKETING_HOME_META_DESCRIPTION =
  "Professional audio guest book delivery for photo booth and event companies: branded client pages, automatic processing, WAV-to-MP3 transcoding, client analytics, and optional password-protected client pages.";

const MARKETING_HOME_METADATA: Metadata = {
  title: {
    absolute: MARKETING_HOME_PAGE_TITLE,
  },
  description: MARKETING_HOME_META_DESCRIPTION,
  alternates: { canonical: marketingCanonical("/") },
  openGraph: {
    ...marketingOpenGraphExtras({
      title: MARKETING_HOME_PAGE_TITLE,
      description: MARKETING_HOME_META_DESCRIPTION,
      pathname: "/",
    }),
  },
  twitter: marketingTwitterExtras({
    title: MARKETING_HOME_PAGE_TITLE,
    description: MARKETING_HOME_META_DESCRIPTION,
  }),
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");
  const companyId = h.get("x-company-id");

  if (tenantStatus === "reserved" || tenantStatus === "not-found") {
    return {
      title: { absolute: "Audio Guest Book" },
      robots: { index: false, follow: false },
    };
  }

  if (tenantStatus === "ok" && companyId) {
    const row = await getRetailTenantLandingCompany(companyId);
    if (row) {
      return {
        title: { absolute: `${row.name} • Audio Guest Book` },
        description: `Hosted by ${row.name}. Enter your event code to open a guest book.`,
      };
    }
  }

  return MARKETING_HOME_METADATA;
}

export default async function Home() {
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");

  if (tenantStatus === "reserved") {
    return <ReservedSubdomainMessage />;
  }
  if (tenantStatus === "not-found") {
    return <TenantNotFoundMessage />;
  }

  const companyId = h.get("x-company-id");
  const appUrl = resolveAppBaseUrl(h.get("host"));

  if (tenantStatus === "ok" && companyId) {
    const company = await getRetailTenantLandingCompany(companyId);
    if (!company) {
      return <TenantNotFoundMessage />;
    }
    const [customBranding, removePoweredByFooter] = await Promise.all([
      companyHasFeatureKey(company.id, "custom_branding"),
      companyHasFeatureKey(company.id, "remove_powered_by_footer"),
    ]);

    let logoUrl: string | null = null;
    if (customBranding && company.logoStorageKey) {
      try {
        logoUrl = await presignGetUrl({
          key: company.logoStorageKey,
          expiresInSeconds: 3600,
        });
      } catch {
        logoUrl = null;
      }
    }

    return (
      <RetailTenantLanding
        company={company}
        customBranding={customBranding}
        removePoweredByFooter={removePoweredByFooter}
        logoUrl={logoUrl}
      />
    );
  }

  return (
    <>
      <JsonLd
        data={[
          getOrganizationSchema(),
          getWebSiteSchema(),
          getSoftwareApplicationSchema(),
          getMarketingHomeWebPageSchema({
            name: MARKETING_HOME_PAGE_TITLE,
            description: MARKETING_HOME_META_DESCRIPTION,
          }),
          getBreadcrumbSchema([{ name: "Home", url: `${SCHEMA_BASE_URL}/` }]),
          getDeliverAudioGuestBookHowToSchema(),
        ]}
      />
      <MarketingShell>
        <MarketingHome appUrl={appUrl} />
      </MarketingShell>
    </>
  );
}
