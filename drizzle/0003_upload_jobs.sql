CREATE TYPE "public"."upload_job_kind" AS ENUM('zip_extraction');--> statement-breakpoint
CREATE TYPE "public"."upload_job_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'partial');--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" "upload_job_kind" DEFAULT 'zip_extraction' NOT NULL,
	"status" "upload_job_status" DEFAULT 'pending' NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"total_files_in_archive" integer,
	"files_processed" integer DEFAULT 0 NOT NULL,
	"files_succeeded" integer DEFAULT 0 NOT NULL,
	"files_failed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;