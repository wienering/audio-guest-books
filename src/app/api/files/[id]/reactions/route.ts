import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/index";
import { fileReactions } from "@/db/schema";
import {
  fetchReactionCountsForSingleFile,
  getAudioFileWithEventForReaction,
} from "@/lib/file-reactions-db";
import { FILE_REACTION_TYPES } from "@/lib/file-reaction-types";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import { getClientIpFromRequest } from "@/lib/retail-request-meta";
import { hasValidRetailUnlockSession } from "@/lib/retail-session";

const bodySchema = z.object({
  reaction_type: z.enum(FILE_REACTION_TYPES),
  action: z.enum(["add", "remove"]),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:file-reactions");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const { id: fileId } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { reaction_type: reactionType, action } = parsed.data;

  const target = await getAudioFileWithEventForReaction(fileId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.metadataOnlyAfter != null) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const unlocked = await hasValidRetailUnlockSession(
    target.eventId,
    target.passwordHash
  );
  if (!unlocked) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (action === "add") {
      await db
        .insert(fileReactions)
        .values({
          fileId,
          reactionType,
          count: 1,
        })
        .onConflictDoUpdate({
          target: [fileReactions.fileId, fileReactions.reactionType],
          set: { count: sql`${fileReactions.count} + 1` },
        });
    } else {
      await db
        .update(fileReactions)
        .set({
          count: sql`greatest(0, ${fileReactions.count} - 1)`,
        })
        .where(
          and(
            eq(fileReactions.fileId, fileId),
            eq(fileReactions.reactionType, reactionType)
          )
        );
    }
  } catch (e) {
    console.error("file reaction update", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const reactions = await fetchReactionCountsForSingleFile(fileId);
  return NextResponse.json({ reactions });
}
