import { auth } from "@clerk/nextjs/server";

import { extendEventRetentionForUser } from "@/lib/extend-retention";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const session = await auth();
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await extendEventRetentionForUser(eventId);
  if (!result.ok) {
    const status =
      result.message === "Event not found." ? 404 : 400;
    return Response.json({ error: result.message }, { status });
  }
  return Response.json({
    ok: true,
    retention_until: result.retentionUntilIso,
  });
}
