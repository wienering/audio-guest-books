CREATE TYPE "public"."retention_notify_threshold" AS ENUM('60_days', '30_days', '7_days');--> statement-breakpoint
CREATE TYPE "public"."download_job_kind" AS ENUM('bulk_zip');--> statement-breakpoint
CREATE TYPE "public"."download_job_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."email_kind" AS ENUM('retention_notification_60d', 'retention_notification_30d', 'retention_notification_7d', 'files_deleted', 'retail_invitation_default', 'retail_invitation_custom');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "default_retention_months" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
UPDATE "plans" SET "default_retention_months" = 18 WHERE "code" = 'pro';--> statement-breakpoint
UPDATE "plans" SET "default_retention_months" = 24 WHERE "code" = 'ultimate';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "retention_extended_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "last_retention_notification_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "last_retention_notification_threshold" "retention_notify_threshold";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "metadata_only_after" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "metadata_purged_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "download_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "download_job_kind" DEFAULT 'bulk_zip' NOT NULL,
	"status" "download_job_status" DEFAULT 'pending' NOT NULL,
	"requested_by_ip_hash" text NOT NULL,
	"result_storage_key" text,
	"result_size_bytes" bigint,
	"expires_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"kind" "email_kind" NOT NULL,
	"event_id" uuid,
	"company_id" uuid,
	"resend_message_id" text,
	"subject" text NOT NULL,
	"status" "email_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
