// NOTE: Intentionally NO `import "server-only"` — this module runs inside the
// BullMQ worker (Node process, not a Next.js runtime). See `docs/notes.md` ›
// "Worker compatibility rule".

import {
  and,
  asc,
  eq,
  isNotNull,
  isNull,
  lte,
  lt,
  or,
  ne,
  gte,
  inArray,
} from "drizzle-orm";
import type { Logger } from "pino";

import type { AppDatabase } from "@/db/index";
import { FilesDeletedEmail } from "@/emails/files-deleted";
import { RetentionNotification60dEmail } from "@/emails/retention-notification-60d";
import { RetentionNotification30dEmail } from "@/emails/retention-notification-30d";
import { RetentionNotification7dEmail } from "@/emails/retention-notification-7d";
import {
  audioFiles,
  companies,
  companyFeatures,
  companyUsers,
  deletedCompaniesLog,
  downloadJobs,
  emailLog,
  emailTemplates,
  eventAnalyticsEvents,
  events,
  plans,
  retailPageSessions,
  uploadJobs,
} from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { getClerkPrimaryEmail } from "@/lib/clerk-primary-email";
import { formatDateOnly } from "@/lib/date-format";
import { sendEmail } from "@/lib/email";
import { addUtcMonths, utcCalendarDate } from "@/lib/retention";
import { formatRetailEventDate } from "@/lib/format-retail-event-date";
import {
  hardDeleteEvent,
  listEventsDueForHardDelete,
} from "@/lib/event-mutations";
import { deleteObject } from "@/lib/r2";

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return utcCalendarDate(x);
}

async function findCompanyOwnerEmail(
  db: AppDatabase,
  companyId: string
): Promise<string | null> {
  const owner = await db.query.companyUsers.findFirst({
    where: and(
      eq(companyUsers.companyId, companyId),
      eq(companyUsers.role, "owner")
    ),
    orderBy: [asc(companyUsers.createdAt)],
  });
  if (!owner) return null;
  return getClerkPrimaryEmail(owner.clerkUserId);
}

export async function runRetentionScheduler(
  db: AppDatabase,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const today = utcCalendarDate(new Date());

  await notifyRetentionWindow(db, today, 60, "60_days", log);
  await notifyRetentionWindow(db, today, 30, "30_days", log);
  await notifyRetentionWindow(db, today, 7, "7_days", log);

  await purgeFilesPastRetention(db, today, log);
  await hardDeleteStaleMetadata(db, today, log);
  await cleanupExpiredDownloadJobs(db, log);
  await hardDeleteSoftDeletedEventsReady(db, today, log);
  await hardDeleteSoftDeletedCompaniesReady(db, today, log);
}

async function hardDeleteSoftDeletedEventsReady(
  db: AppDatabase,
  today: Date,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const due = await listEventsDueForHardDelete(db, today);
  for (const ev of due) {
    try {
      await hardDeleteEvent(db, ev.id, log);
    } catch (err) {
      log.error(
        { err, eventId: ev.id },
        "event hard-delete: scheduled purge failed; will retry on next run"
      );
    }
  }
}

async function notifyRetentionWindow(
  db: AppDatabase,
  today: Date,
  days: 60 | 30 | 7,
  threshold: "60_days" | "30_days" | "7_days",
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const low = addUtcDays(today, days - 1);
  const high = addUtcDays(today, days);

  const rows = await db
    .select({ event: events })
    .from(events)
    .innerJoin(companies, eq(events.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        isNull(events.deletedAt),
        isNull(events.metadataOnlyAfter),
        gte(events.retentionUntil, low),
        lte(events.retentionUntil, high),
        or(
          isNull(events.lastRetentionNotificationThreshold),
          ne(events.lastRetentionNotificationThreshold, threshold)
        )
      )
    );

  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  for (const { event } of rows) {
    const ownerEmail = await findCompanyOwnerEmail(db, event.companyId);
    if (!ownerEmail) {
      log.warn({ eventId: event.id }, "retention notify: no owner email");
      continue;
    }

    const eventDateIso = event.eventDate.toISOString().slice(0, 10);
    const eventDateLabel = formatRetailEventDate(eventDateIso);
    const extendUrl = `${baseUrl}/dashboard/events/${event.id}`;

    const common = {
      eventName: event.name,
      daysRemaining: days,
      eventDateLabel,
      retailClientName: event.retailClientName,
      extendRetentionUrl: extendUrl,
    };

    const subject = `Your audio guest book files for ${event.name} will be deleted in ${days} days`;

    const claimed = await db
      .update(events)
      .set({
        lastRetentionNotificationThreshold: threshold,
        lastRetentionNotificationSentAt: new Date(),
      })
      .where(
        and(
          eq(events.id, event.id),
          or(
            isNull(events.lastRetentionNotificationThreshold),
            ne(events.lastRetentionNotificationThreshold, threshold)
          )
        )
      )
      .returning({ id: events.id });

    if (claimed.length === 0) continue;

    if (days === 60) {
      sendEmail({
        to: ownerEmail,
        subject,
        kind: "retention_notification_60d",
        eventId: event.id,
        companyId: event.companyId,
        react: <RetentionNotification60dEmail {...common} />,
      });
    } else if (days === 30) {
      sendEmail({
        to: ownerEmail,
        subject,
        kind: "retention_notification_30d",
        eventId: event.id,
        companyId: event.companyId,
        react: <RetentionNotification30dEmail {...common} />,
      });
    } else {
      sendEmail({
        to: ownerEmail,
        subject,
        kind: "retention_notification_7d",
        eventId: event.id,
        companyId: event.companyId,
        react: <RetentionNotification7dEmail {...common} />,
      });
    }

    log.info({ eventId: event.id, threshold }, "retention notification queued");
  }
}

async function purgeFilesPastRetention(
  db: AppDatabase,
  today: Date,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const due = await db
    .select({ event: events })
    .from(events)
    .innerJoin(companies, eq(events.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        isNull(events.deletedAt),
        isNull(events.metadataOnlyAfter),
        lt(events.retentionUntil, today)
      )
    );

  for (const { event } of due) {
    const files = await db.query.audioFiles.findMany({
      where: and(
        eq(audioFiles.eventId, event.id),
        isNull(audioFiles.deletedAt)
      ),
    });

    for (const f of files) {
      try {
        await deleteObject(f.storageKey);
      } catch (err) {
        log.warn({ err, key: f.storageKey }, "r2 delete audio failed");
      }
    }

    await db
      .update(audioFiles)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(audioFiles.eventId, event.id), isNull(audioFiles.deletedAt))
      );

    if (event.coverImageStorageKey) {
      try {
        await deleteObject(event.coverImageStorageKey);
      } catch (err) {
        log.warn(
          { err, key: event.coverImageStorageKey },
          "r2 delete cover failed"
        );
      }
    }

    const jobs = await db.query.downloadJobs.findMany({
      where: eq(downloadJobs.eventId, event.id),
    });
    for (const j of jobs) {
      if (j.resultStorageKey) {
        try {
          await deleteObject(j.resultStorageKey);
        } catch (err) {
          log.warn({ err, key: j.resultStorageKey }, "r2 delete zip failed");
        }
      }
    }
    await db.delete(downloadJobs).where(eq(downloadJobs.eventId, event.id));

    const deletedDay = today;
    await db
      .update(events)
      .set({
        metadataOnlyAfter: deletedDay,
        coverImageStorageKey: null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, event.id));

    const ownerEmail = await findCompanyOwnerEmail(db, event.companyId);
    if (ownerEmail) {
      const deletedDateLabel = formatDateOnly(deletedDay);
      sendEmail({
        to: ownerEmail,
        subject: `Audio files for ${event.name} have been deleted`,
        kind: "files_deleted",
        eventId: event.id,
        companyId: event.companyId,
        react: (
          <FilesDeletedEmail
            eventName={event.name}
            deletedDateLabel={deletedDateLabel}
          />
        ),
      });
    }

    log.info({ eventId: event.id }, "retention: files purged, metadata-only");
  }
}

async function hardDeleteStaleMetadata(
  db: AppDatabase,
  today: Date,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const cutoff = addUtcMonths(today, -12);

  const stale = await db
    .select({ event: events })
    .from(events)
    .innerJoin(companies, eq(events.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        isNull(events.deletedAt),
        isNotNull(events.metadataOnlyAfter),
        lt(events.metadataOnlyAfter, cutoff)
      )
    );

  for (const { event } of stale) {
    await db
      .update(events)
      .set({ metadataPurgedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, event.id));
    await db.delete(events).where(eq(events.id, event.id));
    log.info({ eventId: event.id }, "retention: event hard-deleted");
  }
}

async function cleanupExpiredDownloadJobs(
  db: AppDatabase,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const now = new Date();
  const expired = await db.query.downloadJobs.findMany({
    where: and(isNotNull(downloadJobs.expiresAt), lte(downloadJobs.expiresAt, now)),
  });

  for (const job of expired) {
    if (job.resultStorageKey) {
      try {
        await deleteObject(job.resultStorageKey);
      } catch (err) {
        log.warn(
          { err, key: job.resultStorageKey },
          "expired zip delete failed"
        );
      }
    }
    await db.delete(downloadJobs).where(eq(downloadJobs.id, job.id));
  }
}

async function hardDeleteSoftDeletedCompaniesReady(
  db: AppDatabase,
  today: Date,
  log: Pick<Logger, "info" | "warn" | "error">
): Promise<void> {
  const dueCompanies = await db
    .select({
      company: companies,
      planCode: plans.code,
    })
    .from(companies)
    .innerJoin(plans, eq(companies.planId, plans.id))
    .where(
      and(
        isNotNull(companies.deletedAt),
        isNotNull(companies.hardDeleteAfter),
        lte(companies.hardDeleteAfter, today)
      )
    );

  for (const { company, planCode } of dueCompanies) {
    const eventIdRows = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.companyId, company.id));
    const eventIds = eventIdRows.map((r) => r.id);
    const eventCount = eventIds.length;

    let totalFiles = 0;
    let totalStorageBytes = 0;
    const keysToDelete = new Set<string>();

    if (company.logoStorageKey) {
      keysToDelete.add(company.logoStorageKey);
    }

    if (eventIds.length > 0) {
      const afRows = await db
        .select({
          storageKey: audioFiles.storageKey,
          sizeBytes: audioFiles.sizeBytes,
        })
        .from(audioFiles)
        .where(inArray(audioFiles.eventId, eventIds));
      totalFiles = afRows.length;
      for (const f of afRows) {
        totalStorageBytes += f.sizeBytes;
        keysToDelete.add(f.storageKey);
      }

      const evCovers = await db
        .select({ coverImageStorageKey: events.coverImageStorageKey })
        .from(events)
        .where(inArray(events.id, eventIds));
      for (const e of evCovers) {
        if (e.coverImageStorageKey) keysToDelete.add(e.coverImageStorageKey);
      }

      const djs = await db
        .select({ resultStorageKey: downloadJobs.resultStorageKey })
        .from(downloadJobs)
        .where(inArray(downloadJobs.eventId, eventIds));
      for (const j of djs) {
        if (j.resultStorageKey) keysToDelete.add(j.resultStorageKey);
      }
    }

    const uploadRows = await db
      .select({ storageKey: uploadJobs.storageKey })
      .from(uploadJobs)
      .where(eq(uploadJobs.companyId, company.id));
    for (const u of uploadRows) {
      keysToDelete.add(u.storageKey);
    }

    try {
      await db.transaction(async (tx) => {
        await tx.insert(deletedCompaniesLog).values({
          originalCompanyId: company.id,
          originalSlug: company.slug,
          originalPlanCode: planCode,
          totalEventsAtDeletion: eventCount,
          totalFilesAtDeletion: totalFiles,
          totalStorageBytesAtDeletion: totalStorageBytes,
        });

        if (eventIds.length > 0) {
          await tx
            .delete(retailPageSessions)
            .where(inArray(retailPageSessions.eventId, eventIds));
          await tx
            .delete(eventAnalyticsEvents)
            .where(inArray(eventAnalyticsEvents.eventId, eventIds));
          await tx
            .delete(audioFiles)
            .where(inArray(audioFiles.eventId, eventIds));
          await tx
            .delete(downloadJobs)
            .where(inArray(downloadJobs.eventId, eventIds));
        }

        await tx
          .delete(uploadJobs)
          .where(eq(uploadJobs.companyId, company.id));
        await tx
          .delete(emailTemplates)
          .where(eq(emailTemplates.companyId, company.id));
        await tx.delete(emailLog).where(eq(emailLog.companyId, company.id));

        await tx.delete(events).where(eq(events.companyId, company.id));
        await tx
          .delete(companyFeatures)
          .where(eq(companyFeatures.companyId, company.id));
        await tx
          .delete(companyUsers)
          .where(eq(companyUsers.companyId, company.id));
        await tx.delete(companies).where(eq(companies.id, company.id));
      });
    } catch (err) {
      log.error(
        { err, companyId: company.id, slug: company.slug },
        "account hard-delete: transaction failed; will retry on next run"
      );
      continue;
    }

    for (const key of keysToDelete) {
      try {
        await deleteObject(key);
      } catch (err) {
        log.warn(
          { err, key, companyId: company.id },
          "account hard-delete: r2 delete failed (orphan object may remain)"
        );
      }
    }

    log.info(
      {
        originalCompanyId: company.id,
        originalSlug: company.slug,
        totalEventsAtDeletion: eventCount,
        totalFilesAtDeletion: totalFiles,
      },
      "account hard-delete: company purged"
    );
  }
}
