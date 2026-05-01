import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  DashboardStackedNavLayout,
  stackedSectionClassnames,
  stackedSectionHeadingClassnames,
  type DashboardStackedNavSection,
} from "@/components/dashboard/dashboard-stacked-nav-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailTemplatesSettingsClient } from "@/app/dashboard/settings/email-templates/email-templates-client";
import { PublicPageSettingsClient } from "@/app/dashboard/settings/public-page/public-page-settings-client";
import { BrandingClient } from "@/app/dashboard/settings/branding/branding-client";
import { db } from "@/db/index";
import { emailTemplates } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignGetUrl } from "@/lib/r2";

const SECTIONS_NAV: DashboardStackedNavSection[] = [
  { id: "branding", label: "Branding" },
  { id: "public-guest-page", label: "Public guest page" },
  { id: "email-templates", label: "Email templates" },
];

function LoadingNav() {
  return (
    <div className="text-muted-foreground text-sm md:flex md:flex-row md:gap-10">
      <aside className="hidden w-[220px] shrink-0 md:block" />
      <div className="min-w-0 flex-1 animate-pulse space-y-4">
        <div className="h-8 rounded-md bg-muted" />
        <div className="h-40 rounded-md bg-muted/80" />
      </div>
    </div>
  );
}

export default async function DashboardBrandingPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const company = membership.company;

  const [customBranding, canEditTemplates] = await Promise.all([
    companyHasFeatureKey(company.id, "custom_branding"),
    companyHasFeatureKey(company.id, "custom_email_templates"),
  ]);

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

  const templateRows = canEditTemplates
    ? await db
        .select({
          id: emailTemplates.id,
          name: emailTemplates.name,
          subject_template: emailTemplates.subjectTemplate,
          body_template: emailTemplates.bodyTemplate,
          is_default: emailTemplates.isDefault,
        })
        .from(emailTemplates)
        .where(
          and(eq(emailTemplates.companyId, company.id), isNull(emailTemplates.deletedAt))
        )
        .orderBy(desc(emailTemplates.updatedAt))
    : [];

  return (
    <Suspense fallback={<LoadingNav />}>
      <DashboardStackedNavLayout sections={SECTIONS_NAV}>
        <section
          id="branding"
          className={stackedSectionClassnames(true)}
          aria-labelledby="dash-section-branding"
        >
          <h2 id="dash-section-branding" className={stackedSectionHeadingClassnames()}>
            Branding
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Logo and colors appear on client-facing guest book pages when your plan
            includes custom branding.
          </p>
          <div className="mt-8">
            <BrandingClient
              embedded
              locked={!customBranding}
              logoPreviewUrl={logoPreviewUrl}
              brandingFromServer={company.branding ?? null}
              brandingRevision={company.updatedAt?.getTime() ?? 0}
            />
          </div>
        </section>

        <section
          id="public-guest-page"
          className={stackedSectionClassnames(false)}
          aria-labelledby="dash-section-public-page"
        >
          <h2 id="dash-section-public-page" className={stackedSectionHeadingClassnames()}>
            Public guest page
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Your company&apos;s subdomain home (for example{" "}
            <span className="font-mono">
              {company.slug}.audioguestbooks.ca
            </span>
            ) shows your branding and an event code entry form. Guests cannot browse
            events from this page.
          </p>
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact details</CardTitle>
                <CardDescription>
                  Name and logo come from your workspace and branding settings. Add public
                  contact information for guests who land on your subdomain home.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PublicPageSettingsClient
                  initialContactEmail={company.contactEmail}
                  initialContactPhone={company.contactPhone}
                  initialContactWebsite={company.contactWebsite}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          id="email-templates"
          className={stackedSectionClassnames(false)}
          aria-labelledby="dash-section-email-templates"
        >
          <h2 id="dash-section-email-templates" className={stackedSectionHeadingClassnames()}>
            Email templates
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Reusable &quot;send link&quot; messages for client galleries. Ultimate can save
            custom templates with merge fields.
          </p>
          <div className="mt-8">
            <EmailTemplatesSettingsClient
              embedded
              canEdit={canEditTemplates}
              companyName={company.name}
              initialTemplates={templateRows}
            />
          </div>
        </section>
      </DashboardStackedNavLayout>
    </Suspense>
  );
}
