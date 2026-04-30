ALTER TYPE "public"."email_kind" ADD VALUE 'account_deletion_requested';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "hard_delete_after" date;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "deletion_requested_by_user_id" text;--> statement-breakpoint
CREATE TABLE "deleted_companies_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_company_id" uuid NOT NULL,
	"original_slug" text NOT NULL,
	"original_plan_code" text NOT NULL,
	"total_events_at_deletion" integer NOT NULL,
	"total_files_at_deletion" integer NOT NULL,
	"total_storage_bytes_at_deletion" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
