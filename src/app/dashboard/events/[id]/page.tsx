import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db/index";
import { audioFiles, events, uploadJobs } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { presignGetUrl } from "@/lib/r2";
import { addUtcMonths, daysUntilUtcCalendarEnd } from "@/lib/retention";

import {
  EventDetailClient,
  type EventDetailClientFile,
  type EventUploadJobSnapshot,
} from "./event-detail-client";

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  corporate: "Corporate",
  anniversary: "Anniversary",
  other: "Other",
};

function eventTypeLabel(
  eventType: string,
  eventTypeOther: string | null
): string {
  if (eventType === "other" && eventTypeOther?.trim()) {
    return eventTypeOther.trim();
  }
  return EVENT_TYPE_LABEL[eventType] ?? eventType;
}

export default async function EventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const eventRow = await db.query.events.findFirst({
    where: and(
      eq(events.id, id),
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
  });

  if (!eventRow) notFound();

  const files = await db.query.audioFiles.findMany({
    where: and(
      eq(audioFiles.eventId, id),
      isNull(audioFiles.deletedAt),
      isNotNull(audioFiles.uploadedAt)
    ),
    orderBy: (t) => [asc(t.displayOrder)],
  });

  const [countRow] = await db
    .select({ n: count() })
    .from(audioFiles)
    .where(and(eq(audioFiles.eventId, id), isNull(audioFiles.deletedAt)));

  const activeFileCount = Number(countRow?.n ?? 0);
  const fileLimit = membership.company.plan?.fileLimitPerEvent ?? null;

  const allowUltimateFormats = await companyHasFeatureKey(
    membership.company.id,
    "audio_transcoding"
  );

  const [customBranding, passwordProtection] = await Promise.all([
    companyHasFeatureKey(membership.company.id, "custom_branding"),
    companyHasFeatureKey(membership.company.id, "password_protection"),
  ]);

  let retailCoverPreviewUrl: string | null = null;
  if (eventRow.coverImageStorageKey) {
    try {
      retailCoverPreviewUrl = await presignGetUrl({
        key: eventRow.coverImageStorageKey,
        expiresInSeconds: 3600,
      });
    } catch {
      retailCoverPreviewUrl = null;
    }
  }

  const retailPasswordActive = !!eventRow.passwordHash?.trim();
  const retailPasswordSetAtLabel =
    retailPasswordActive && eventRow.passwordSetAt
      ? eventRow.passwordSetAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  const clientFiles: EventDetailClientFile[] = files.map((f) => ({
    id: f.id,
    originalFilename: f.originalFilename,
    sizeBytes: f.sizeBytes,
    uploadedAt: f.uploadedAt!.toISOString(),
    displayOrder: f.displayOrder,
  }));

  const zipJobVisibleCutoff = new Date(Date.now() - 10 * 60 * 1000);

  const jobRows = await db.query.uploadJobs.findMany({
    where: and(
      eq(uploadJobs.eventId, id),
      or(
        inArray(uploadJobs.status, ["pending", "processing"]),
        and(
          inArray(uploadJobs.status, ["succeeded", "partial", "failed"]),
          gt(uploadJobs.completedAt, zipJobVisibleCutoff)
        )
      )
    ),
    orderBy: (t) => [desc(t.createdAt)],
    limit: 30,
  });

  const clientUploadJobs: EventUploadJobSnapshot[] = jobRows.map((j) => ({
    id: j.id,
    status: j.status,
    originalFilename: j.originalFilename,
    totalFilesInArchive: j.totalFilesInArchive,
    filesProcessed: j.filesProcessed,
    filesSucceeded: j.filesSucceeded,
    filesFailed: j.filesFailed,
    errorMessage: j.errorMessage,
    errorDetails: j.errorDetails,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
  }));

  const planName = membership.company.plan?.name ?? "your";

  const metadataOnlyAfterLabel = eventRow.metadataOnlyAfter
    ? eventRow.metadataOnlyAfter.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const permanentRemovalDate = eventRow.metadataOnlyAfter
    ? addUtcMonths(eventRow.metadataOnlyAfter, 12)
    : null;
  const permanentRemovalLabel = permanentRemovalDate
    ? permanentRemovalDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const daysUntilRetention = eventRow.metadataOnlyAfter
    ? null
    : daysUntilUtcCalendarEnd(new Date(), eventRow.retentionUntil);
  const showRetentionWarning =
    !eventRow.metadataOnlyAfter &&
    daysUntilRetention !== null &&
    daysUntilRetention > 0 &&
    daysUntilRetention <= 90;

  return (
    <EventDetailClient
      eventId={eventRow.id}
      eventName={eventRow.name}
      eventTypeLabel={eventTypeLabel(
        eventRow.eventType,
        eventRow.eventTypeOther
      )}
      eventDateLabel={eventRow.eventDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      retailClientName={eventRow.retailClientName}
      retailClientEmail={eventRow.retailClientEmail}
      retailClientSlug={eventRow.retailClientSlug}
      retentionUntilLabel={eventRow.retentionUntil.toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )}
      files={clientFiles}
      uploadJobs={clientUploadJobs}
      allowUltimateFormats={allowUltimateFormats}
      fileLimit={fileLimit}
      activeFileCount={activeFileCount}
      retailCustomBranding={customBranding}
      retailPasswordProtection={passwordProtection}
      retailCoverPreviewUrl={retailCoverPreviewUrl}
      retailPasswordActive={retailPasswordActive}
      retailPasswordSetAtLabel={retailPasswordSetAtLabel}
      planName={planName}
      metadataOnlyAfterLabel={metadataOnlyAfterLabel}
      permanentRemovalLabel={permanentRemovalLabel}
      showRetentionWarning={showRetentionWarning}
    />
  );
}
