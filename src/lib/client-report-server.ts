import "server-only";

import { createHash } from "crypto";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq, isNotNull, isNull, max, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/index";
import {
  audioFiles,
  companies,
  eventAnalyticsEvents,
  events,
} from "@/db/schema";
import { fetchEventAnalyticsSummary } from "@/lib/analytics-queries";
import { ClientReportDocument } from "@/lib/client-report-document";
import type {
  ClientReportAnalyticsSlice,
  ClientReportPdfInput,
} from "@/lib/client-report-types";
import { mergeCompanyBranding } from "@/lib/company-branding";
import { formatDate, formatDateOnly } from "@/lib/date-format";
import { presignGetUrl } from "@/lib/r2";

type ReportFingerprint = {
  hash: string;
};

async function loadLogoDataUri(
  logoStorageKey: string | null
): Promise<string | null> {
  if (!logoStorageKey?.trim()) return null;
  try {
    const url = await presignGetUrl({
      key: logoStorageKey.trim(),
      expiresInSeconds: 300,
    });
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function computeClientReportFingerprint(
  eventId: string
): Promise<ReportFingerprint | null> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { companyId: true, updatedAt: true },
  });
  if (!event) return null;

  const [company, aggRow, maxAnRow] = await Promise.all([
    db.query.companies.findFirst({
      where: eq(companies.id, event.companyId),
      columns: {
        updatedAt: true,
        logoStorageKey: true,
        branding: true,
      },
    }),
    db
      .select({
        n: sql<number>`count(*)::int`,
        dur: sql<number>`coalesce(sum(coalesce(${audioFiles.durationSeconds}, 0)), 0)::int`,
        uploadedMax: max(audioFiles.uploadedAt),
      })
      .from(audioFiles)
      .where(
        and(
          eq(audioFiles.eventId, eventId),
          isNull(audioFiles.deletedAt),
          eq(audioFiles.isOriginal, true),
          isNotNull(audioFiles.uploadedAt)
        )
      ),
    db
      .select({ m: max(eventAnalyticsEvents.createdAt) })
      .from(eventAnalyticsEvents)
      .where(eq(eventAnalyticsEvents.eventId, eventId)),
  ]);

  if (!company) return null;

  const brandingMerged = mergeCompanyBranding(company.branding);
  const agg = aggRow[0];
  const payload = {
    e: event.updatedAt.toISOString(),
    c: company.updatedAt.toISOString(),
    b: `${company.logoStorageKey ?? ""}:${JSON.stringify(brandingMerged)}`,
    f: `${agg?.n ?? 0}:${agg?.dur ?? 0}:${agg?.uploadedMax?.toISOString() ?? ""}`,
    a: maxAnRow[0]?.m ? maxAnRow[0].m.toISOString() : "",
  };

  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 40);

  return { hash };
}

export async function buildClientReportPdfInput(
  eventId: string
): Promise<ClientReportPdfInput | null> {
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), isNull(events.deletedAt)),
    columns: {
      name: true,
      retailClientName: true,
      eventDate: true,
      companyId: true,
    },
  });
  if (!event) return null;

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, event.companyId),
    columns: {
      name: true,
      logoStorageKey: true,
      branding: true,
      contactEmail: true,
      contactPhone: true,
      contactWebsite: true,
    },
  });
  if (!company) return null;

  const [aggRow] = await db
    .select({
      n: sql<number>`count(*)::int`,
      dur: sql<number>`coalesce(sum(coalesce(${audioFiles.durationSeconds}, 0)), 0)::int`,
    })
    .from(audioFiles)
    .where(
      and(
        eq(audioFiles.eventId, eventId),
        isNull(audioFiles.deletedAt),
        eq(audioFiles.isOriginal, true),
        isNotNull(audioFiles.uploadedAt)
      )
    );

  const recordingCount = Number(aggRow?.n ?? 0);
  const totalDurationSeconds = Number(aggRow?.dur ?? 0);

  let analytics: ClientReportAnalyticsSlice | null = null;
  try {
    const summary = await fetchEventAnalyticsSummary(eventId, {
      rangeKey: "all",
      start: null,
      endExclusive: null,
    });
    analytics = {
      ok: true,
      totalPlays: summary.filePlays,
      uniqueListeners: summary.uniqueVisitors,
    };
  } catch {
    analytics = null;
  }

  const branding = mergeCompanyBranding(company.branding);
  const logoDataUri = await loadLogoDataUri(company.logoStorageKey);

  const generatedAtFormatted = formatDate(new Date(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    companyName: company.name,
    logoDataUri,
    branding,
    eventName: event.name,
    clientName: event.retailClientName,
    eventDateFormatted: formatDateOnly(event.eventDate),
    generatedAtFormatted,
    recordingCount,
    totalDurationSeconds,
    analytics,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    contactWebsite: company.contactWebsite,
  };
}

async function renderClientReportPdfToBase64(eventId: string): Promise<string> {
  const input = await buildClientReportPdfInput(eventId);
  if (!input) {
    throw new Error("client_report_missing_event");
  }
  const buf = await renderToBuffer(
    React.createElement(ClientReportDocument, input) as Parameters<
      typeof renderToBuffer
    >[0]
  );
  return Buffer.from(buf).toString("base64");
}

export async function getCachedClientReportPdf(
  eventId: string,
  contentHash: string
): Promise<Buffer> {
  const b64 = await unstable_cache(
    () => renderClientReportPdfToBase64(eventId),
    ["client-report-pdf", eventId, contentHash],
    { revalidate: false }
  )();
  return Buffer.from(b64, "base64");
}
