import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/index";
import { emailTemplates } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";

const patchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    subject_template: z.string().trim().min(1).max(200).optional(),
    body_template: z.string().trim().min(1).max(10_000).optional(),
    is_default: z.boolean().optional(),
  })
  .refine(
    (o) =>
      o.name !== undefined ||
      o.subject_template !== undefined ||
      o.body_template !== undefined ||
      o.is_default !== undefined,
    { message: "No fields to update." }
  );

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
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

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Invalid request";
    return Response.json({ error: msg }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.companyId, membership.company.id),
        isNull(emailTemplates.deletedAt)
      )
    )
    .limit(1);
  const hit = existing[0];
  if (!hit) {
    return Response.json({ error: "Template not found." }, { status: 404 });
  }

  const patch = parsed.data;
  const updates: {
    name?: string;
    subjectTemplate?: string;
    bodyTemplate?: string;
    isDefault?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.subject_template !== undefined) {
    updates.subjectTemplate = patch.subject_template;
  }
  if (patch.body_template !== undefined) {
    updates.bodyTemplate = patch.body_template;
  }
  if (patch.is_default !== undefined) {
    updates.isDefault = patch.is_default;
  }

  const updated = await db.transaction(async (tx) => {
    if (patch.is_default === true) {
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
      .update(emailTemplates)
      .set(updates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.companyId, membership.company.id),
          isNull(emailTemplates.deletedAt)
        )
      )
      .returning();

    return row;
  });

  if (!updated) {
    return Response.json({ error: "Template not found." }, { status: 404 });
  }

  return Response.json({
    template: {
      id: updated.id,
      name: updated.name,
      subject_template: updated.subjectTemplate,
      body_template: updated.bodyTemplate,
      is_default: updated.isDefault,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
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

  const [row] = await db
    .update(emailTemplates)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.companyId, membership.company.id),
        isNull(emailTemplates.deletedAt)
      )
    )
    .returning({ id: emailTemplates.id });

  if (!row) {
    return Response.json({ error: "Template not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
