"use server";

import { auth } from "@clerk/nextjs/server";

import {
  sendRetailInvitationBodySchema,
  sendRetailInvitationForUser,
} from "@/lib/send-retail-invitation";

export async function sendRetailInvitation(
  eventId: string,
  input: unknown
): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session.userId) {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = sendRetailInvitationBodySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
        "Invalid request",
    };
  }
  return sendRetailInvitationForUser({
    clerkUserId: session.userId,
    eventId,
    payload: parsed.data,
  });
}
