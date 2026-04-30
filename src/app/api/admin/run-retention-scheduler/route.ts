import { auth } from "@clerk/nextjs/server";
import pino from "pino";

import { db } from "@/db/index";
import { runRetentionScheduler } from "@/lib/retention-scheduler";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export async function POST() {
  const { userId } = await auth();
  const allowed =
    process.env.ADMIN_CLERK_USER_IDS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (!userId || allowed.length === 0 || !allowed.includes(userId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await runRetentionScheduler(db, log);
  return Response.json({ ok: true });
}
