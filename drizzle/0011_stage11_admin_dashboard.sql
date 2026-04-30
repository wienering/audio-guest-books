CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_clerk_user_id" text NOT NULL,
	"action_type" text NOT NULL,
	"target_company_id" uuid,
	"target_company_slug" text,
	"target_user_clerk_id" text,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_company_id_idx" ON "admin_audit_log" ("target_company_id");--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_company_id_companies_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
