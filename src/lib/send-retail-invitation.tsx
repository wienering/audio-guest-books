import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { RetailInvitationEmail } from "@/emails/retail-invitation";
import { sendEmailWithResult, type SendEmailResult } from "@/lib/email";
import { getMembershipWithCompany } from "@/lib/company";

export const sendRetailInvitationBodySchema = z.object({
  to: z.string().trim().email("Invalid email address"),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(10_000),
  template_source: z.enum(["system", "custom"]),
});

export type SendRetailInvitationBody = z.infer<
  typeof sendRetailInvitationBodySchema
>;

export async function sendRetailInvitationForUser(input: {
  clerkUserId: string;
  eventId: string;
  payload: SendRetailInvitationBody;
}): Promise<SendEmailResult> {
  const parsed = sendRetailInvitationBodySchema.safeParse(input.payload);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ??
      parsed.error.issues[0]?.message ??
      "Invalid request";
    return { ok: false, error: msg };
  }

  const membership = await getMembershipWithCompany(input.clerkUserId);
  if (!membership) {
    return { ok: false, error: "Unauthorized" };
  }

  const eventRow = await db.query.events.findFirst({
    where: and(
      eq(events.id, input.eventId),
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
  });

  if (!eventRow) {
    return { ok: false, error: "Event not found." };
  }

  const kind =
    parsed.data.template_source === "custom"
      ? "retail_invitation_custom"
      : "retail_invitation_default";

  const sendResult = await sendEmailWithResult({
    to: parsed.data.to,
    subject: parsed.data.subject,
    react: (
      <RetailInvitationEmail
        companyName={membership.company.name}
        bodyPlain={parsed.data.body}
      />
    ),
    kind,
    eventId: eventRow.id,
    companyId: membership.company.id,
  });

  if (!sendResult.ok) {
    return sendResult;
  }

  await db
    .update(events)
    .set({
      retailLinkLastSentAt: new Date(),
      retailLinkSendCount: (eventRow.retailLinkSendCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventRow.id));

  return { ok: true };
}
