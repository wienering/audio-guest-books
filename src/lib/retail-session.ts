import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db/index";
import { retailPageSessions } from "@/db/schema";

export function retailUnlockCookieName(eventId: string) {
  return `rgb_retail_${eventId}`;
}

export function retailCookieSecurityOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
}

/** When no password is configured, retail content is always allowed. */
export async function hasValidRetailUnlockSession(
  eventId: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  if (!passwordHash?.trim()) return true;
  const jar = await cookies();
  const token = jar.get(retailUnlockCookieName(eventId))?.value;
  if (!token?.trim()) return false;

  const row = await db.query.retailPageSessions.findFirst({
    where: and(
      eq(retailPageSessions.eventId, eventId),
      eq(retailPageSessions.sessionToken, token),
      gt(retailPageSessions.expiresAt, new Date())
    ),
  });
  return !!row;
}
