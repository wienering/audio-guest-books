import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
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
]);

export const eventTypeEnum = pgEnum("event_type", [
  "wedding",
  "birthday",
  "corporate",
  "anniversary",
  "other",
]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    /** Max audio files per event; null means unlimited (Ultimate). */
    fileLimitPerEvent: integer("file_limit_per_event"),
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
    cancelAtPeriodEnd: timestamp("cancel_at_period_end", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    isFoundingMember: boolean("is_founding_member").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("companies_slug_uidx").on(t.slug)]
);

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
    coverImageKey: text("cover_image_key"),
    /** Kept until: row creation instant + plan retention months (not `eventDate`). */
    retentionUntil: date("retention_until", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("events_company_retail_slug_active_uidx")
      .on(t.companyId, t.retailClientSlug)
      .where(sql`${t.deletedAt} is null`),
  ]
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
  },
  (t) => [uniqueIndex("audio_files_storage_key_uidx").on(t.storageKey)]
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

export const eventsRelations = relations(events, ({ one, many }) => ({
  company: one(companies, {
    fields: [events.companyId],
    references: [companies.id],
  }),
  audioFiles: many(audioFiles),
}));

export const audioFilesRelations = relations(audioFiles, ({ one }) => ({
  event: one(events, {
    fields: [audioFiles.eventId],
    references: [events.id],
  }),
}));
