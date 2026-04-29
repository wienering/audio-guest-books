CREATE TYPE "public"."event_type" AS ENUM('wedding', 'birthday', 'corporate', 'anniversary', 'other');--> statement-breakpoint
CREATE TABLE "audio_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_seconds" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"uploaded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"event_type" "event_type" NOT NULL,
	"event_type_other" text,
	"event_date" date NOT NULL,
	"retail_client_name" text NOT NULL,
	"retail_client_email" text NOT NULL,
	"retail_client_slug" text NOT NULL,
	"password_hash" text,
	"cover_image_key" text,
	"retention_until" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "file_limit_per_event" integer;--> statement-breakpoint
UPDATE "plans" SET "file_limit_per_event" = 10 WHERE "code" = 'free';--> statement-breakpoint
UPDATE "plans" SET "file_limit_per_event" = 100 WHERE "code" = 'pro';--> statement-breakpoint
UPDATE "plans" SET "file_limit_per_event" = NULL WHERE "code" = 'ultimate';--> statement-breakpoint
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audio_files_storage_key_uidx" ON "audio_files" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "events_company_retail_slug_active_uidx" ON "events" USING btree ("company_id","retail_client_slug") WHERE "events"."deleted_at" is null;