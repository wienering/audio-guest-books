ALTER TABLE "admin_audit_log" ADD COLUMN "impersonated_company_id" uuid;
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_impersonated_company_id_companies_id_fk" FOREIGN KEY ("impersonated_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "admin_audit_log_impersonated_company_id_idx" ON "admin_audit_log" ("impersonated_company_id");
