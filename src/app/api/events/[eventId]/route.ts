import { NextResponse } from "next/server";
import { z } from "zod";

import { companyHasFeatureKey } from "@/lib/company-features";
import { editEvent, type EventEditInput } from "@/lib/event-mutations";
import { requireEventCompanyOwner } from "@/lib/event-route-auth";
import { logImpersonatedDashboardMutation } from "@/lib/impersonation";

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

  const gated = await requireEventCompanyOwner(eventId);
  if ("error" in gated) return gated.error;
  const { membership, event } = gated;

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
      : await companyHasFeatureKey(
          membership.company.id,
          "password_protection"
        );

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

  await logImpersonatedDashboardMutation(membership, "updated event via API", {
    event_id: eventId,
  });

  return NextResponse.json({ ok: true });
}
