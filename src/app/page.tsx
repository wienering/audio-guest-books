import type { Metadata } from "next";
import { headers } from "next/headers";

import { MarketingHome } from "@/components/marketing/home-page";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  ReservedSubdomainMessage,
  TenantNotFoundMessage,
  TenantRootPlaceholder,
} from "@/components/retail/tenant-messages";
import { resolveAppBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: {
    absolute: "Audio Guest Books — Deliver Audio Guest Books Professionally",
  },
  description:
    "Branded delivery pages, automatic file processing, and analytics for wedding and event audio guest books. Built for photo booth and event companies.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Audio Guest Books — Deliver Audio Guest Books Professionally",
    description:
      "Branded delivery pages, automatic file processing, and analytics for wedding and event audio guest books.",
    type: "website",
    url: "/",
    siteName: "Audio Guest Books",
  },
  twitter: {
    card: "summary_large_image",
    title: "Audio Guest Books — Deliver Audio Guest Books Professionally",
    description:
      "Branded delivery pages, automatic file processing, and analytics for wedding and event audio guest books.",
  },
};

export default async function Home() {
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");

  if (tenantStatus === "reserved") {
    return <ReservedSubdomainMessage />;
  }
  if (tenantStatus === "not-found") {
    return <TenantNotFoundMessage />;
  }

  const companySlug = h.get("x-company-slug");
  const companyId = h.get("x-company-id");
  const appUrl = resolveAppBaseUrl(h.get("host"));

  if (tenantStatus === "ok" && companyId && companySlug) {
    return (
      <TenantRootPlaceholder companySlug={companySlug} appUrl={appUrl} />
    );
  }

  return (
    <MarketingShell>
      <MarketingHome appUrl={appUrl} />
    </MarketingShell>
  );
}
