import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminApiAndEvent } from "@/lib/admin-event-route-auth";
import { companyHasFeatureKey } from "@/lib/company-features";
import { editEvent, type EventEditInput } from "@/lib/event-mutations";

const PatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    eventType: z
      .enum(["wedding", "birthday", "corporate", "anniversary", "other"])
      .optional(),
    eventTypeOther: z.string().trim().max(200).nullable().optional(),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use YYYY-MM-DD" })
      .optional(),
    retailClientName: z.string().trim().min(1).max(200).optional(),
    retailClientEmail: z.string().trim().email().max(320).optional(),
    retailClientSlug: z.string().trim().min(2).max(80).optional(),
    password: z.string().nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireAdminApiAndEvent(eventId);
  if ("error" in gated) return gated.error;
  const { adminClerkUserId, event, company } = gated;

  if (event.deletedAt) {
    return NextResponse.json(
      { error: "Cannot edit a deleted event. Restore it first." },
      { status: 409 }
    );
  }

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: "Please fix the fields below.",
        fieldErrors: {
          name: fe.name?.[0],
          eventType: fe.eventType?.[0],
          eventTypeOther: fe.eventTypeOther?.[0],
          eventDate: fe.eventDate?.[0],
          retailClientName: fe.retailClientName?.[0],
          retailClientEmail: fe.retailClientEmail?.[0],
          retailClientSlug: fe.retailClientSlug?.[0],
          password: fe.password?.[0],
        },
      },
      { status: 400 }
    );
  }

  const passwordEditAllowed =
    parsed.data.password === undefined
      ? true
      : await companyHasFeatureKey(company.id, "password_protection");

  const input: EventEditInput = {
    name: parsed.data.name,
    eventType: parsed.data.eventType,
    eventTypeOther: parsed.data.eventTypeOther,
    eventDate: parsed.data.eventDate,
    retailClientName: parsed.data.retailClientName,
    retailClientEmail: parsed.data.retailClientEmail,
    retailClientSlug: parsed.data.retailClientSlug,
    password: parsed.data.password,
  };

  const result = await editEvent(eventId, input, { passwordEditAllowed });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, fieldErrors: result.fieldErrors },
      { status: result.status }
    );
  }

  // Build a redacted "changed fields" list for the audit metadata. Don't log
  // the new password (or any old hash). Slug is included verbatim because it
  // appears in user-visible URLs anyway.
  const changedKeys = Object.keys(input).filter(
    (k) =>
      input[k as keyof EventEditInput] !== undefined && k !== "password"
  );
  const passwordChanged = parsed.data.password !== undefined;

  await logAdminAction({
    adminClerkUserId,
    actionType: "event_edited",
    description: `Admin edited event "${event.name}" in ${company.slug}`,
    targetCompanyId: company.id,
    targetCompanySlug: company.slug,
    metadata: {
      event_id: eventId,
      event_slug: event.retailClientSlug,
      event_name: event.name,
      changed_fields: changedKeys,
      password_changed: passwordChanged,
    },
  });

  return NextResponse.json({ ok: true });
}
