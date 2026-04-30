import { auth } from "@clerk/nextjs/server";

import {
  sendRetailInvitationBodySchema,
  sendRetailInvitationForUser,
} from "@/lib/send-retail-invitation";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const session = await auth();
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = sendRetailInvitationBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid request";
    return Response.json({ error: msg }, { status: 400 });
  }

  const result = await sendRetailInvitationForUser({
    clerkUserId: session.userId,
    eventId,
    payload: parsed.data,
  });

  if (!result.ok) {
    const status =
      result.error === "Unauthorized"
        ? 401
        : result.error === "Event not found."
          ? 404
          : 400;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ ok: true });
}
