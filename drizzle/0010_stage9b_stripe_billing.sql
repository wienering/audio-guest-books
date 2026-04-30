ALTER TYPE "public"."email_kind" ADD VALUE 'billing_subscription_created';--> statement-breakpoint
ALTER TYPE "public"."email_kind" ADD VALUE 'billing_subscription_ended';--> statement-breakpoint
ALTER TABLE "companies" RENAME COLUMN "current_period_end" TO "subscription_current_period_end";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "cancel_at_period_end";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "subscription_cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "subscription_plan_code" text;--> statement-breakpoint
CREATE TABLE "stripe_events_processed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_processed_stripe_event_id_unique" UNIQUE("stripe_event_id")
);--> statement-breakpoint
CREATE TABLE "billing_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"stripe_event_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "billing_audit_log_company_id_idx" ON "billing_audit_log" ("company_id");--> statement-breakpoint
ALTER TABLE "billing_audit_log" ADD CONSTRAINT "billing_audit_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
