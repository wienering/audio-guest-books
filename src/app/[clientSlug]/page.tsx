import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RetailFooter } from "@/components/retail/retail-footer";
import { RetailGuestbookClient } from "@/components/retail/retail-guestbook-client";
import {
  RetailPageNotAvailableMessage,
  ReservedSubdomainMessage,
  TenantNotFoundMessage,
} from "@/components/retail/tenant-messages";
import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import {
  buildRetailPublicPayload,
  formatRetailEventDate,
  resolveRetailEventForSlugs,
} from "@/lib/retail-public";
import { analyticsContextFromHeaders } from "@/lib/retail-request-meta";

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
  const companyId = h.get("x-company-id");
  if (tenantStatus !== "ok" || !companySlug || !companyId) {
    notFound();
  }

  const resolved = await resolveRetailEventForSlugs(companySlug, clientSlug);
  if ("error" in resolved) {
    if (resolved.error === "company_not_found") {
      return <TenantNotFoundMessage />;
    }
    return <RetailPageNotAvailableMessage />;
  }

  const { event } = resolved;
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

  const payload = await buildRetailPublicPayload(event);
  const eventDateLabel = formatRetailEventDate(payload.eventDateIso);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            Audio guest book
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            {payload.eventName}
          </h1>
          <p className="text-xl text-neutral-800 sm:text-2xl">
            {payload.retailClientName}
          </p>
          <p className="text-lg text-neutral-600 sm:text-xl">{eventDateLabel}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
        <RetailGuestbookClient
          companySlug={companySlug}
          clientSlug={clientSlug}
          files={payload.files}
        />
      </main>

      <RetailFooter />
    </div>
  );
}
