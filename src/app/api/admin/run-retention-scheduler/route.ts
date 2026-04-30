import { NextResponse } from "next/server";
import pino from "pino";

import { db } from "@/db/index";
import { getCurrentAdminId } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { runRetentionScheduler } from "@/lib/retention-scheduler";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export async function POST(): Promise<Response> {
  const adminId = await getCurrentAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await runRetentionScheduler(db, log);
  } catch (e) {
    console.error("[admin/run-retention-scheduler] failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Retention scheduler failed" },
      { status: 500 }
    );
  }

  await logAdminAction({
    actionType: "retention_scheduler_run",
    description: "Manually triggered retention scheduler",
    adminClerkUserId: adminId,
  });

  return NextResponse.json({ ok: true });
}
