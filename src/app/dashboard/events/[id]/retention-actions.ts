"use server";

import { revalidatePath } from "next/cache";

import {
  extendEventRetentionForUser,
  type ExtendRetentionResult,
} from "@/lib/extend-retention";

export async function extendRetentionAction(
  eventId: string
): Promise<ExtendRetentionResult> {
  const result = await extendEventRetentionForUser(eventId);
  if (result.ok) {
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard");
  }
  return result;
}
