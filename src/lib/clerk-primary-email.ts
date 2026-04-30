import { createClerkClient } from "@clerk/backend";

export async function getClerkPrimaryEmail(
  clerkUserId: string
): Promise<string | null> {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    return null;
  }
  try {
    const clerk = createClerkClient({ secretKey: secret });
    const user = await clerk.users.getUser(clerkUserId);
    const primaryId = user.primaryEmailAddressId;
    const primary =
      user.emailAddresses?.find((e) => e.id === primaryId) ??
      user.emailAddresses?.[0];
    return primary?.emailAddress?.trim() || null;
  } catch {
    return null;
  }
}
