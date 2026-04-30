"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import { normalizeHex } from "@/lib/branding-colors";
import { getMembershipWithCompany } from "@/lib/company";
import { companyHasFeatureKey } from "@/lib/company-features";

export type BrandingThemeSaveResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizeNullableHex(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const n = normalizeHex(raw);
  return n;
}

export async function saveCompanyTheme(input: {
  themePrimary: string | null;
  themeSecondary: string | null;
  themeAccent: string | null;
  themeBackground: string | null;
}): Promise<BrandingThemeSaveResult> {
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

  const tp = normalizeNullableHex(input.themePrimary);
  const ts = normalizeNullableHex(input.themeSecondary);
  const ta = normalizeNullableHex(input.themeAccent);
  const tb = normalizeNullableHex(input.themeBackground);

  if (input.themePrimary && !tp) return { ok: false, error: "Primary color must be valid hex." };
  if (input.themeSecondary && !ts)
    return { ok: false, error: "Secondary color must be valid hex." };
  if (input.themeAccent && !ta)
    return { ok: false, error: "Accent color must be valid hex." };
  if (input.themeBackground && !tb)
    return { ok: false, error: "Background color must be valid hex." };

  await db
    .update(companies)
    .set({
      themePrimary: tp,
      themeSecondary: ts,
      themeAccent: ta,
      themeBackground: tb,
      themeText: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, membership.company.id));

  revalidatePath("/dashboard/settings/branding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function resetCompanyTheme(): Promise<BrandingThemeSaveResult> {
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
      themePrimary: null,
      themeSecondary: null,
      themeAccent: null,
      themeBackground: null,
      themeText: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, membership.company.id));

  revalidatePath("/dashboard/settings/branding");
  revalidatePath("/dashboard");
  return { ok: true };
}
