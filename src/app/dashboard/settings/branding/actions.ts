"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import type { CompanyBranding } from "@/lib/company-branding";
import { validateBrandingForSave } from "@/lib/company-branding";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";
import { logImpersonatedDashboardMutation } from "@/lib/impersonation";

export type BrandingSaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveCompanyBranding(input: {
  branding: CompanyBranding;
}): Promise<BrandingSaveResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return { ok: false, error: "Unauthorized" };

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return { ok: false, error: "Forbidden" };
  }

  const allowed = await companyHasFeatureKey(
    membership.company.id,
    "custom_branding"
  );
  if (!allowed) return { ok: false, error: "Forbidden" };

  const parsed = validateBrandingForSave(input.branding);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  await db
    .update(companies)
    .set({
      branding: parsed.branding,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, membership.company.id));

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard");
  await logImpersonatedDashboardMutation(membership, "updated company branding");
  return { ok: true };
}

export async function resetCompanyBranding(): Promise<BrandingSaveResult> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) return { ok: false, error: "Unauthorized" };

  const membership = await getMembershipWithCompany(userId);
  if (!membership?.company.plan) {
    return { ok: false, error: "Forbidden" };
  }

  const allowed = await companyHasFeatureKey(
    membership.company.id,
    "custom_branding"
  );
  if (!allowed) return { ok: false, error: "Forbidden" };

  await db
    .update(companies)
    .set({
      branding: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, membership.company.id));

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard");
  await logImpersonatedDashboardMutation(
    membership,
    "reset company branding to defaults"
  );
  return { ok: true };
}
