import type { CSSProperties } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RetailFooter } from "@/components/retail/retail-footer";
import { RetailGuestbookClient } from "@/components/retail/retail-guestbook-client";
import { RetailMaybeImage } from "@/components/retail/retail-maybe-image";
import { RetailPasswordGate } from "@/components/retail/retail-password-gate";
import {
  RetailPageNotAvailableMessage,
  ReservedSubdomainMessage,
  TenantNotFoundMessage,
} from "@/components/retail/tenant-messages";
import { companyHasFeatureKey } from "@/lib/company-features";
import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import {
  buildRetailPublicPayload,
  formatRetailEventDate,
  resolveRetailEventForSlugs,
} from "@/lib/retail-public";
import { analyticsContextFromHeaders } from "@/lib/retail-request-meta";
import { presignGetUrl } from "@/lib/r2";
import { buildRetailThemeCssVars } from "@/lib/retail-theme-vars";
import { hasValidRetailUnlockSession } from "@/lib/retail-session";

type Props = { params: Promise<{ clientSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientSlug } = await params;
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");
  const companySlug = h.get("x-company-slug");
  if (tenantStatus !== "ok" || !companySlug) {
    return { title: "Audio Guest Book" };
  }

  const resolved = await resolveRetailEventForSlugs(companySlug, clientSlug);
  if ("error" in resolved) {
    return { title: "Audio Guest Book" };
  }

  const { event } = resolved;
  return {
    title: `${event.name} • ${event.retailClientName}`,
    description: `Listen to the audio guest book for ${event.retailClientName}.`,
  };
}

export default async function RetailClientPage({ params }: Props) {
  const { clientSlug } = await params;
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");

  if (tenantStatus === "reserved") {
    return <ReservedSubdomainMessage />;
  }
  if (tenantStatus === "not-found") {
    return <TenantNotFoundMessage />;
  }

  const companySlug = h.get("x-company-slug");
  const headerCompanyId = h.get("x-company-id");
  if (tenantStatus !== "ok" || !companySlug || !headerCompanyId) {
    notFound();
  }

  const resolved = await resolveRetailEventForSlugs(companySlug, clientSlug);
  if ("error" in resolved) {
    if (resolved.error === "company_not_found") {
      return <TenantNotFoundMessage />;
    }
    return <RetailPageNotAvailableMessage />;
  }

  const { company, event } = resolved;

  const unlocked = await hasValidRetailUnlockSession(
    event.id,
    event.passwordHash
  );
  if (!unlocked) {
    return (
      <RetailPasswordGate
        companySlug={companySlug}
        clientSlug={clientSlug}
        eventName={event.name}
      />
    );
  }

  const ac = analyticsContextFromHeaders(h);
  try {
    await logRetailAnalytics({
      eventId: event.id,
      eventType: "page_view",
      ipHash: hashIp(ac.ip),
      userAgent: ac.userAgent,
      referrer: ac.referrer,
    });
  } catch (e) {
    console.error("retail page_view log", e);
  }

  const [customBranding, removePoweredByFooter] = await Promise.all([
    companyHasFeatureKey(company.id, "custom_branding"),
    companyHasFeatureKey(company.id, "remove_powered_by_footer"),
  ]);

  const useCustomTheme =
    customBranding &&
    !!(
      company.themePrimary ||
      company.themeSecondary ||
      company.themeAccent ||
      company.themeBackground
    );

  const themeStyle = buildRetailThemeCssVars({
    useCustomTheme,
    themePrimary: company.themePrimary,
    themeSecondary: company.themeSecondary,
    themeAccent: company.themeAccent,
    themeBackground: company.themeBackground,
    themeText: company.themeText,
  }) as CSSProperties;

  let logoUrl: string | null = null;
  if (customBranding && company.logoStorageKey) {
    try {
      logoUrl = await presignGetUrl({ key: company.logoStorageKey });
    } catch {
      logoUrl = null;
    }
  }

  let coverUrl: string | null = null;
  if (customBranding && event.coverImageStorageKey) {
    try {
      coverUrl = await presignGetUrl({ key: event.coverImageStorageKey });
    } catch {
      coverUrl = null;
    }
  }

  const payload = await buildRetailPublicPayload(event);
  const eventDateLabel = formatRetailEventDate(payload.eventDateIso);

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--retail-bg)] text-[var(--retail-text)]"
      style={themeStyle}
    >
      <header
        className="border-b bg-[var(--retail-bg)] px-4 py-10 sm:px-8"
        style={{ borderColor: "var(--retail-border)" }}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {logoUrl ? (
            <RetailMaybeImage
              src={logoUrl}
              alt="Host logo"
              className="max-h-16 w-auto max-w-full object-contain object-left"
            />
          ) : null}
          {coverUrl ? (
            <RetailMaybeImage
              src={coverUrl}
              alt="Event cover"
              className="max-h-48 w-full rounded-lg object-cover"
            />
          ) : null}
          <div className="space-y-2">
            <p
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--retail-primary)" }}
            >
              Audio guest book
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {payload.eventName}
            </h1>
            <p
              className="text-xl sm:text-2xl"
              style={{ color: "color-mix(in srgb, var(--retail-text) 92%, var(--retail-muted) 8%)" }}
            >
              {payload.retailClientName}
            </p>
            <p
              className="text-lg sm:text-xl"
              style={{ color: "var(--retail-muted)" }}
            >
              {eventDateLabel}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
        <RetailGuestbookClient
          companySlug={companySlug}
          clientSlug={clientSlug}
          files={payload.files}
        />
      </main>

      <RetailFooter visible={!removePoweredByFooter} />
    </div>
  );
}
