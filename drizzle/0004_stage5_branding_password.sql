ALTER TABLE "companies" ADD COLUMN "logo_storage_key" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "theme_primary" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "theme_secondary" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "theme_accent" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "theme_background" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "theme_text" text;--> statement-breakpoint
ALTER TABLE "events" RENAME COLUMN "cover_image_key" TO "cover_image_storage_key";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "password_set_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "retail_page_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"ip_hash" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retail_page_sessions" ADD CONSTRAINT "retail_page_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "retail_page_sessions_token_uidx" ON "retail_page_sessions" USING btree ("session_token");
