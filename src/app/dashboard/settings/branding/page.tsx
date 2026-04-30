import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignGetUrl } from "@/lib/r2";

import { BrandingClient } from "./branding-client";

export default async function BrandingSettingsPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const company = membership.company;

  const customBranding = await companyHasFeatureKey(
    company.id,
    "custom_branding"
  );

  let logoPreviewUrl: string | null = null;
  if (company.logoStorageKey) {
    try {
      logoPreviewUrl = await presignGetUrl({
        key: company.logoStorageKey,
        expiresInSeconds: 3600,
      });
    } catch {
      logoPreviewUrl = null;
    }
  }

  return (
    <BrandingClient
      locked={!customBranding}
      logoPreviewUrl={logoPreviewUrl}
      initialPrimary={company.themePrimary}
      initialSecondary={company.themeSecondary}
      initialAccent={company.themeAccent}
      initialBackground={company.themeBackground}
    />
  );
}
