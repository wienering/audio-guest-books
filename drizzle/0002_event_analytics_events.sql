CREATE TYPE "public"."retail_analytics_event_type" AS ENUM('page_view', 'file_play', 'file_download', 'zip_download');--> statement-breakpoint
CREATE TABLE "event_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"audio_file_id" uuid,
	"event_type" "retail_analytics_event_type" NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_analytics_events" ADD CONSTRAINT "event_analytics_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_analytics_events" ADD CONSTRAINT "event_analytics_events_audio_file_id_audio_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_files"("id") ON DELETE set null ON UPDATE no action;