"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";

export type PublicContactSaveResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function norm(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

export async function saveCompanyPublicContact(input: {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
}): Promise<PublicContactSaveResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return { ok: false, error: "Unauthorized" };

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return { ok: false, error: "Forbidden" };
  }

  const contactEmail = norm(input.contactEmail);
  const contactPhone = norm(input.contactPhone);
  const contactWebsite = norm(input.contactWebsite);

  if (contactEmail != null) {
    if (contactEmail.length > 320 || !EMAIL_RE.test(contactEmail)) {
      return {
        ok: false,
        error: "Enter a valid contact email or leave it blank.",
      };
    }
  }
  if (contactPhone != null && contactPhone.length > 80) {
    return { ok: false, error: "Phone is too long (max 80 characters)." };
  }
  if (contactWebsite != null) {
    if (contactWebsite.length > 500) {
      return { ok: false, error: "Website is too long." };
    }
    if (/^\s*javascript:/i.test(contactWebsite)) {
      return { ok: false, error: "That website URL is not allowed." };
    }
  }

  await db
    .update(companies)
    .set({
      contactEmail,
      contactPhone,
      contactWebsite,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, membership.company.id));

  revalidatePath("/dashboard/settings/public-page");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
