import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { EmailTemplatesSettingsClient } from "./email-templates-client";

import { db } from "@/db/index";
import { emailTemplates } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";

export default async function EmailTemplatesSettingsPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const canEdit = await companyHasFeatureKey(
    membership.company.id,
    "custom_email_templates"
  );

  const rows = canEdit
    ? await db
        .select({
          id: emailTemplates.id,
          name: emailTemplates.name,
          subject_template: emailTemplates.subjectTemplate,
          body_template: emailTemplates.bodyTemplate,
          is_default: emailTemplates.isDefault,
        })
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.companyId, membership.company.id),
            isNull(emailTemplates.deletedAt)
          )
        )
        .orderBy(desc(emailTemplates.updatedAt))
    : [];

  return (
    <EmailTemplatesSettingsClient
      canEdit={canEdit}
      companyName={membership.company.name}
      initialTemplates={rows}
    />
  );
}
