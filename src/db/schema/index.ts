import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  text,
  uuid,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const companyUserRoleEnum = pgEnum("company_user_role", [
  "owner",
  "member",
]);

export const featureSourceEnum = pgEnum("company_feature_source", [
  "plan",
  "admin_grant",
  "founding_member",
  "comp_subscription",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "wedding",
  "birthday",
  "corporate",
  "anniversary",
  "other",
]);

export const retailAnalyticsEventTypeEnum = pgEnum(
  "retail_analytics_event_type",
  ["page_view", "file_play", "file_download", "zip_download"]
);

export const uploadJobKindEnum = pgEnum("upload_job_kind", ["zip_extraction"]);

export const uploadJobStatusEnum = pgEnum("upload_job_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "partial",
]);

export const audioTranscodingStatusEnum = pgEnum("audio_transcoding_status", [
  "not_needed",
  "pending",
  "processing",
  "succeeded",
  "failed",
]);

export const retentionNotifyThresholdEnum = pgEnum("retention_notify_threshold", [
  "60_days",
  "30_days",
  "7_days",
]);

export const downloadJobKindEnum = pgEnum("download_job_kind", ["bulk_zip"]);

export const downloadJobStatusEnum = pgEnum("download_job_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "expired",
]);

export const emailKindEnum = pgEnum("email_kind", [
  "retention_notification_60d",
  "retention_notification_30d",
  "retention_notification_7d",
  "files_deleted",
  "retail_invitation_default",
  "retail_invitation_custom",
  "account_deletion_requested",
  "billing_subscription_created",
  "billing_subscription_ended",
  "onboarding_admin_notification",
  "onboarding_welcome",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "queued",
  "sent",
  "failed",
]);

export type UploadJobErrorDetail = { filename: string; reason: string };

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    /** Max audio files per event; null means unlimited (Ultimate). */
    fileLimitPerEvent: integer("file_limit_per_event"),
    /** Default retention length for new events (calendar months from creation). */
    defaultRetentionMonths: integer("default_retention_months").notNull().default(6),
    stripePriceId: text("stripe_price_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("plans_code_uidx").on(t.code)]
);

export const features = pgTable(
  "features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("features_key_uidx").on(t.key)]
);

export const planFeatures = pgTable(
  "plan_features",
  {
    planId: uuid("plan_id")
      .references(() => plans.id, { onDelete: "cascade" })
      .notNull(),
    featureId: uuid("feature_id")
      .references(() => features.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.featureId] })]
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    planId: uuid("plan_id")
      .references(() => plans.id)
      .notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    /** When true, the subscription remains active until subscriptionCurrentPeriodEnd. */
    subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end")
      .notNull()
      .default(false),
    subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", {
      withTimezone: true,
    }),
    subscriptionPlanCode: text("subscription_plan_code"),
    /** Complimentary admin-granted subscription: pro_comp / ultimate_comp when active. */
    compSubscriptionPlanCode: text("comp_subscription_plan_code"),
    compSubscriptionGrantedAt: timestamp("comp_subscription_granted_at", {
      withTimezone: true,
    }),
    compSubscriptionGrantedByAdminId: text(
      "comp_subscription_granted_by_admin_id"
    ),
    compSubscriptionExpiresAt: timestamp("comp_subscription_expires_at", {
      withTimezone: true,
    }),
    compSubscriptionNotes: text("comp_subscription_notes"),
    isFoundingMember: boolean("is_founding_member").notNull().default(false),
    logoStorageKey: text("logo_storage_key"),
    themePrimary: text("theme_primary"),
    themeSecondary: text("theme_secondary"),
    themeAccent: text("theme_accent"),
    themeBackground: text("theme_background"),
    /** Optional explicit text color; when null, derived from background for contrast */
    themeText: text("theme_text"),
    /** Granular retail page colors (validated as `CompanyBranding` in app code). Legacy theme_* columns retained. */
    branding: jsonb("branding"),
    /** Public guest landing (company subdomain root). */
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    contactWebsite: text("contact_website"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** UTC calendar date when the daily job will purge the company permanently. */
    hardDeleteAfter: date("hard_delete_after", { mode: "date" }),
    /** Clerk user id who requested deletion (nullable after row is gone). */
    deletionRequestedByUserId: text("deletion_requested_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("companies_slug_uidx").on(t.slug)]
);

export const stripeEventsProcessed = pgTable("stripe_events_processed", {
  id: uuid("id").defaultRandom().primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingAuditLog = pgTable(
  "billing_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    eventType: text("event_type").notNull(),
    fromState: text("from_state"),
    toState: text("to_state"),
    stripeEventId: text("stripe_event_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("billing_audit_log_company_id_idx").on(t.companyId)]
);

/**
 * Admin actions performed against the platform (Stage 11 dashboard).
 * Slug captured at action time so it persists if the company is later deleted.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminClerkUserId: text("admin_clerk_user_id").notNull(),
    actionType: text("action_type").notNull(),
    targetCompanyId: uuid("target_company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    targetCompanySlug: text("target_company_slug"),
    targetUserClerkId: text("target_user_clerk_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("admin_audit_log_created_at_idx").on(t.createdAt.desc()),
    index("admin_audit_log_target_company_id_idx").on(t.targetCompanyId),
  ]
);

/** Anonymized audit row kept after account hard-delete (no PII). */
export const deletedCompaniesLog = pgTable("deleted_companies_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  originalCompanyId: uuid("original_company_id").notNull(),
  originalSlug: text("original_slug").notNull(),
  originalPlanCode: text("original_plan_code").notNull(),
  totalEventsAtDeletion: integer("total_events_at_deletion").notNull(),
  totalFilesAtDeletion: integer("total_files_at_deletion").notNull(),
  totalStorageBytesAtDeletion: bigint("total_storage_bytes_at_deletion", {
    mode: "number",
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companyUsers = pgTable(
  "company_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    role: companyUserRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("company_users_clerk_uidx").on(t.clerkUserId)]
);

export const companyFeatures = pgTable(
  "company_features",
  {
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    featureId: uuid("feature_id")
      .references(() => features.id, { onDelete: "cascade" })
      .notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: featureSourceEnum("source").notNull().default("plan"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.featureId] })]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    eventTypeOther: text("event_type_other"),
    eventDate: date("event_date", { mode: "date" }).notNull(),
    retailClientName: text("retail_client_name").notNull(),
    retailClientEmail: text("retail_client_email").notNull(),
    retailClientSlug: text("retail_client_slug").notNull(),
    passwordHash: text("password_hash"),
    passwordSetAt: timestamp("password_set_at", { withTimezone: true }),
    coverImageStorageKey: text("cover_image_storage_key"),
    /** Kept until: row creation instant + plan retention months (not `eventDate`). */
    retentionUntil: date("retention_until", { mode: "date" }).notNull(),
    retentionExtendedCount: integer("retention_extended_count")
      .notNull()
      .default(0),
    lastRetentionNotificationSentAt: timestamp(
      "last_retention_notification_sent_at",
      { withTimezone: true }
    ),
    lastRetentionNotificationThreshold: retentionNotifyThresholdEnum(
      "last_retention_notification_threshold"
    ),
    /** After file purge from R2; retail shows "files unavailable". */
    metadataOnlyAfter: date("metadata_only_after", { mode: "date" }),
    /** Set immediately before hard-delete for symmetry with spec (row removed after). */
    metadataPurgedAt: timestamp("metadata_purged_at", { withTimezone: true }),
    retailLinkLastSentAt: timestamp("retail_link_last_sent_at", {
      withTimezone: true,
    }),
    retailLinkSendCount: integer("retail_link_send_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** UTC calendar date when the daily job will purge the event permanently. */
    hardDeleteAfter: date("hard_delete_after", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("events_company_retail_slug_active_uidx")
      .on(t.companyId, t.retailClientSlug)
      .where(sql`${t.deletedAt} is null`),
  ]
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    subjectTemplate: text("subject_template").notNull(),
    bodyTemplate: text("body_template").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  }
);

export const retailPageSessions = pgTable(
  "retail_page_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    sessionToken: text("session_token").notNull(),
    ipHash: text("ip_hash").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("retail_page_sessions_token_uidx").on(t.sessionToken)]
);

export const audioFiles = pgTable(
  "audio_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    durationSeconds: integer("duration_seconds"),
    displayOrder: integer("display_order").notNull().default(0),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** False for FFmpeg-derived copies (Ultimate WAV/FLAC/AIFF → MP3). */
    isOriginal: boolean("is_original").notNull().default(true),
    /** Non-null links a transcoded MP3 row back to its source recording. */
    derivedFromId: uuid("derived_from_id"),
    transcodingStatus:
      audioTranscodingStatusEnum("transcoding_status")
        .notNull()
        .default("not_needed"),
    transcodingError: text("transcoding_error"),
  },
  (t) => [uniqueIndex("audio_files_storage_key_uidx").on(t.storageKey)]
);

export const downloadJobs = pgTable("download_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  kind: downloadJobKindEnum("kind").notNull().default("bulk_zip"),
  status: downloadJobStatusEnum("status").notNull().default("pending"),
  requestedByIpHash: text("requested_by_ip_hash").notNull(),
  resultStorageKey: text("result_storage_key"),
  resultSizeBytes: bigint("result_size_bytes", { mode: "number" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const emailLog = pgTable("email_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  toEmail: text("to_email").notNull(),
  kind: emailKindEnum("kind").notNull(),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  resendMessageId: text("resend_message_id"),
  subject: text("subject").notNull(),
  status: emailStatusEnum("status").notNull().default("queued"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const uploadJobs = pgTable("upload_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  kind: uploadJobKindEnum("kind").notNull().default("zip_extraction"),
  status: uploadJobStatusEnum("status").notNull().default("pending"),
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  totalFilesInArchive: integer("total_files_in_archive"),
  filesProcessed: integer("files_processed").notNull().default(0),
  filesSucceeded: integer("files_succeeded").notNull().default(0),
  filesFailed: integer("files_failed").notNull().default(0),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details").$type<UploadJobErrorDetail[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const eventAnalyticsEvents = pgTable(
  "event_analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    audioFileId: uuid("audio_file_id").references(() => audioFiles.id, {
      onDelete: "set null",
    }),
    eventType: retailAnalyticsEventTypeEnum("event_type").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_event_analytics_events_event_id_created_at").on(
      t.eventId,
      t.createdAt
    ),
    index("idx_event_analytics_events_event_type").on(t.eventType),
  ]
);

export const plansRelations = relations(plans, ({ many }) => ({
  companies: many(companies),
  planFeatures: many(planFeatures),
}));

export const featuresRelations = relations(features, ({ many }) => ({
  planFeatures: many(planFeatures),
  companyFeatures: many(companyFeatures),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(plans, {
    fields: [planFeatures.planId],
    references: [plans.id],
  }),
  feature: one(features, {
    fields: [planFeatures.featureId],
    references: [features.id],
  }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  plan: one(plans, {
    fields: [companies.planId],
    references: [plans.id],
  }),
  companyUsers: many(companyUsers),
  companyFeatures: many(companyFeatures),
  events: many(events),
  uploadJobs: many(uploadJobs),
  emailTemplates: many(emailTemplates),
  billingAuditLogs: many(billingAuditLog),
}));

export const billingAuditLogRelations = relations(billingAuditLog, ({ one }) => ({
  company: one(companies, {
    fields: [billingAuditLog.companyId],
    references: [companies.id],
  }),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
}));

export const companyFeaturesRelations = relations(
  companyFeatures,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyFeatures.companyId],
      references: [companies.id],
    }),
    feature: one(features, {
      fields: [companyFeatures.featureId],
      references: [features.id],
    }),
  })
);

export const retailPageSessionsRelations = relations(
  retailPageSessions,
  ({ one }) => ({
    event: one(events, {
      fields: [retailPageSessions.eventId],
      references: [events.id],
    }),
  })
);

export const downloadJobsRelations = relations(downloadJobs, ({ one }) => ({
  event: one(events, {
    fields: [downloadJobs.eventId],
    references: [events.id],
  }),
}));

export const emailLogRelations = relations(emailLog, ({ one }) => ({
  event: one(events, {
    fields: [emailLog.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [emailLog.companyId],
    references: [companies.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  company: one(companies, {
    fields: [events.companyId],
    references: [companies.id],
  }),
  audioFiles: many(audioFiles),
  uploadJobs: many(uploadJobs),
  downloadJobs: many(downloadJobs),
  analyticsEvents: many(eventAnalyticsEvents),
  retailPageSessions: many(retailPageSessions),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [emailTemplates.companyId],
    references: [companies.id],
  }),
}));

export const audioFilesRelations = relations(audioFiles, ({ one, many }) => ({
  event: one(events, {
    fields: [audioFiles.eventId],
    references: [events.id],
  }),
  derivedFrom: one(audioFiles, {
    fields: [audioFiles.derivedFromId],
    references: [audioFiles.id],
    relationName: "audio_derivation",
  }),
  derivedCopies: many(audioFiles, { relationName: "audio_derivation" }),
  analyticsEvents: many(eventAnalyticsEvents),
}));

export const uploadJobsRelations = relations(uploadJobs, ({ one }) => ({
  event: one(events, {
    fields: [uploadJobs.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [uploadJobs.companyId],
    references: [companies.id],
  }),
}));

export const eventAnalyticsEventsRelations = relations(
  eventAnalyticsEvents,
  ({ one }) => ({
    event: one(events, {
      fields: [eventAnalyticsEvents.eventId],
      references: [events.id],
    }),
    audioFile: one(audioFiles, {
      fields: [eventAnalyticsEvents.audioFileId],
      references: [audioFiles.id],
    }),
  })
);
