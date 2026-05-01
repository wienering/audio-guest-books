import type { CSSProperties } from "react";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RetailFooter } from "@/components/retail/retail-footer";
import { RetailGuestbookClient } from "@/components/retail/retail-guestbook-client";
import { RetailMaybeImage } from "@/components/retail/retail-maybe-image";
import { RetailPasswordGate } from "@/components/retail/retail-password-gate";
import {
  RetailFilesRemovedMessage,
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
import { buildRetailBrandingStyle } from "@/lib/retail-theme-vars";
import { hasValidRetailUnlockSession } from "@/lib/retail-session";
import { cn } from "@/lib/utils";

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

  /**
   * Single source of truth for retail `page_view` analytics (after password unlock).
   * Do not also log from `/api/retail/...` — the client fetches that route and would double-count.
   */
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

  const themeStyle = buildRetailBrandingStyle({
    customBrandingEnabled: customBranding,
    brandingJson: company.branding,
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

  const payload = await buildRetailPublicPayload(event, {
    companySlug,
    clientSlug,
  });
  const eventDateLabel = formatRetailEventDate(payload.eventDateIso);

  const hasCover = !!coverUrl;
  const hasLogo = !!logoUrl;
  const heroOverlap = hasCover && hasLogo;

  const titleBlock = (align: "overlap" | "right") => (
    <div
      className={cn(
        "space-y-1",
        align === "overlap" ? "text-center md:text-right" : "text-right"
      )}
    >
      <p
        className="text-sm font-medium uppercase tracking-wide"
        style={{ color: "var(--brand-header-subtitle)" }}
      >
        Audio guest book
      </p>
      <h1
        className="font-serif text-3xl font-semibold tracking-tight md:text-4xl"
        style={{ color: "var(--brand-header-title)" }}
      >
        {payload.eventName}
      </h1>
      <p
        className="text-base font-normal md:text-lg"
        style={{ color: "var(--brand-header-subtitle)" }}
      >
        {payload.retailClientName}
      </p>
      <p
        className="text-sm md:text-base"
        style={{ color: "var(--brand-body-muted)" }}
      >
        {eventDateLabel}
      </p>
    </div>
  );

  const renderCoverHero = (url: string) => (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg",
        "h-[200px] sm:h-[220px] md:h-[300px] lg:h-[360px]"
      )}
    >
      <RetailMaybeImage
        src={url}
        alt="Event cover"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--brand-body-page-bg)] text-[var(--brand-body-text)]"
      style={themeStyle}
    >
      <header
        className="border-b px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8"
        style={{
          borderColor: "var(--brand-body-border)",
          background: "var(--brand-body-page-bg)",
        }}
      >
        <div className="mx-auto max-w-3xl">
          {!hasCover ? (
            <div
              className="mb-6 w-full overflow-hidden rounded-lg h-[140px] sm:h-[160px] md:h-[180px]"
              style={{ background: "var(--brand-header-cover-fallback-bg)" }}
              aria-hidden
            />
          ) : null}
          {heroOverlap ? (
            <>
              <div className="relative">
                {renderCoverHero(coverUrl!)}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 z-10 translate-y-1/2",
                    "size-16 rounded-lg border-[3px] sm:left-1 md:size-24 md:left-2"
                  )}
                  style={{
                    borderColor: "var(--brand-header-logo-border)",
                    background: "var(--brand-body-card-bg)",
                  }}
                >
                  <RetailMaybeImage
                    src={logoUrl!}
                    alt="Host logo"
                    className="size-full object-contain p-1"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "pt-4 md:grid md:grid-cols-[minmax(7.5rem,9rem)_1fr] md:items-start md:gap-x-6 md:pt-6"
                )}
              >
                <div className="hidden md:block" aria-hidden />
                {titleBlock("overlap")}
              </div>
            </>
          ) : hasCover ? (
            <>
              {renderCoverHero(coverUrl!)}
              <div className="mt-6">{titleBlock("right")}</div>
            </>
          ) : hasLogo ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <RetailMaybeImage
                src={logoUrl!}
                alt="Host logo"
                className="max-h-16 w-auto max-w-full shrink-0 object-contain object-left"
              />
              <div className="min-w-0 flex-1">{titleBlock("right")}</div>
            </div>
          ) : (
            titleBlock("right")
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
        {!payload.recordingFilesAvailable ? (
          <RetailFilesRemovedMessage />
        ) : (
          <Suspense fallback={<div className="min-h-[12rem]" aria-hidden />}>
            <RetailGuestbookClient
              companySlug={companySlug}
              clientSlug={clientSlug}
              files={payload.files}
              bulkZip={payload.bulkZip}
            />
          </Suspense>
        )}
      </main>

      <RetailFooter visible={!removePoweredByFooter} />
    </div>
  );
}
