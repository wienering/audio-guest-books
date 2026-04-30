import "server-only";

import { createHash } from "crypto";

import { db } from "@/db/index";
import { eventAnalyticsEvents } from "@/db/schema";

export type RetailAnalyticsEventType =
  | "page_view"
  | "file_play"
  | "file_download"
  | "zip_download";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const t = ip.trim();
  if (!t) return null;
  return createHash("sha256").update(t).digest("hex");
}

export async function logRetailAnalytics(row: {
  eventId: string;
  audioFileId?: string | null;
  eventType: RetailAnalyticsEventType;
  ipHash: string | null;
  userAgent: string | null;
  referrer: string | null;
}): Promise<void> {
  await db.insert(eventAnalyticsEvents).values({
    eventId: row.eventId,
    audioFileId: row.audioFileId ?? null,
    eventType: row.eventType,
    ipHash: row.ipHash,
    userAgent: row.userAgent,
    referrer: row.referrer,
  });
}
