import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Edge-compatible: only reads ADMIN_CLERK_USER_IDS env var, no DB calls.
 * Safe to import from middleware as well as server components/route handlers.
 */
export function isAdminUser(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  const raw = process.env.ADMIN_CLERK_USER_IDS;
  if (!raw) return false;
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(clerkUserId);
}

/** Returns the current Clerk user id when they're an admin, otherwise null. */
export async function getCurrentAdminId(): Promise<string | null> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return null;
  return isAdminUser(userId) ? userId : null;
}

/**
 * Server-side gate for admin-only RSC pages. Redirects non-admins to /dashboard
 * (don't 404 — that would leak the existence of admin routes). Returns the
 * Clerk user id for downstream use.
 */
export async function requireAdminAccess(): Promise<string> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    redirect("/sign-in");
  }
  if (!isAdminUser(userId)) {
    redirect("/dashboard");
  }
  return userId;
}
