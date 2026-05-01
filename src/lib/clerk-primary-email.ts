import { createClerkClient } from "@clerk/backend";

async function getClerkUserOrNull(clerkUserId: string) {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    return null;
  }
  try {
    const clerk = createClerkClient({ secretKey: secret });
    return await clerk.users.getUser(clerkUserId);
  } catch {
    return null;
  }
}

export async function getClerkPrimaryEmail(
  clerkUserId: string
): Promise<string | null> {
  const user = await getClerkUserOrNull(clerkUserId);
  if (!user) return null;
  const primaryId = user.primaryEmailAddressId;
  const primary =
    user.emailAddresses?.find((e) => e.id === primaryId) ??
    user.emailAddresses?.[0];
  return primary?.emailAddress?.trim() || null;
}

/** Primary email and a short display name for transactional copy. */
export async function getClerkSignupProfile(clerkUserId: string): Promise<{
  email: string | null;
  displayName: string | null;
}> {
  const user = await getClerkUserOrNull(clerkUserId);
  if (!user) {
    return { email: null, displayName: null };
  }
  const primaryId = user.primaryEmailAddressId;
  const primary =
    user.emailAddresses?.find((e) => e.id === primaryId) ??
    user.emailAddresses?.[0];
  const email = primary?.emailAddress?.trim() || null;
  const parts = [user.firstName, user.lastName].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0
  );
  const full = parts.join(" ").trim();
  const displayName =
    full ||
    (typeof user.username === "string" && user.username.trim()
      ? user.username.trim()
      : null);
  return { email, displayName };
}
