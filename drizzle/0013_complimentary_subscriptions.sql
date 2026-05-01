ALTER TABLE "companies" ADD COLUMN "comp_subscription_plan_code" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "comp_subscription_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "comp_subscription_granted_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "comp_subscription_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "comp_subscription_notes" text;--> statement-breakpoint
ALTER TYPE "company_feature_source" ADD VALUE 'comp_subscription';
