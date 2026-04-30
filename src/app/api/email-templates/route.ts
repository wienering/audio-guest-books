import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/index";
import { emailTemplates } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  subject_template: z.string().trim().min(1).max(200),
  body_template: z.string().trim().min(1).max(10_000),
  is_default: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(session.userId);
  if (!membership) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const can = await companyHasFeatureKey(
    membership.company.id,
    "custom_email_templates"
  );

  if (!can) {
    return Response.json({ templates: [] });
  }

  const rows = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.companyId, membership.company.id),
        isNull(emailTemplates.deletedAt)
      )
    )
    .orderBy(desc(emailTemplates.updatedAt));

  return Response.json({
    templates: rows.map((r) => ({
      id: r.id,
      name: r.name,
      subject_template: r.subjectTemplate,
      body_template: r.bodyTemplate,
      is_default: r.isDefault,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(session.userId);
  if (!membership) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await companyHasFeatureKey(
    membership.company.id,
    "custom_email_templates"
  );
  if (!allowed) {
    return Response.json(
      { error: "Custom email templates require Ultimate." },
      { status: 403 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Invalid request";
    return Response.json({ error: msg }, { status: 400 });
  }

  const { name, subject_template, body_template, is_default } = parsed.data;

  const inserted = await db.transaction(async (tx) => {
    if (is_default) {
      await tx
        .update(emailTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(emailTemplates.companyId, membership.company.id),
            isNull(emailTemplates.deletedAt)
          )
        );
    }

    const [row] = await tx
      .insert(emailTemplates)
      .values({
        companyId: membership.company.id,
        name,
        subjectTemplate: subject_template,
        bodyTemplate: body_template,
        isDefault: is_default,
      })
      .returning();

    return row;
  });

  if (!inserted) {
    return Response.json({ error: "Could not create template." }, { status: 500 });
  }

  return Response.json({
    template: {
      id: inserted.id,
      name: inserted.name,
      subject_template: inserted.subjectTemplate,
      body_template: inserted.bodyTemplate,
      is_default: inserted.isDefault,
      created_at: inserted.createdAt.toISOString(),
      updated_at: inserted.updatedAt.toISOString(),
    },
  });
}
