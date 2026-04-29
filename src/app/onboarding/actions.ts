"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AppDatabase } from "@/db/index";
import { db } from "@/db/index";
import { grantPlanFeaturesFromPlan } from "@/db/grant-features";
import {
  companies,
  companyUsers,
  plans,
} from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { isReservedSubdomain } from "@/lib/reserved-subdomains";

export type OnboardingFormValues = {
  companyName: string;
  companySlug: string;
};

function readOnboardingFormValues(formData: FormData): OnboardingFormValues {
  return {
    companyName: String(formData.get("companyName") ?? ""),
    companySlug: String(formData.get("companySlug") ?? ""),
  };
}

export type OnboardingActionState =
  | {
      ok: false;
      message: string;
      values: OnboardingFormValues;
      fieldErrors?: { companyName?: string; companySlug?: string };
    }
  | { ok: true };

const formSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  companySlug: z.preprocess((raw) => {
    const s =
      raw === undefined || raw === null
        ? ""
        : typeof raw === "string"
          ? raw
          : typeof raw === "number"
            ? String(raw)
            : String(raw as object);
    return s.trim().toLowerCase();
  }, z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message:
          "Use lowercase letters, numbers, and hyphens only (cannot start/end with hyphen).",
      })
  ),
});

export async function completeOnboarding(
  _previousState: OnboardingActionState | undefined,
  formData: FormData
): Promise<OnboardingActionState> {
  const submittedValues = readOnboardingFormValues(formData);

  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return {
      ok: false,
      message: "You must sign in before continuing.",
      values: submittedValues,
    };
  }

  const parsed = formSchema.safeParse({
    companyName: formData.get("companyName"),
    companySlug: formData.get("companySlug"),
  });

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Please fix the fields below.",
      values: submittedValues,
      fieldErrors: {
        companyName: errs.companyName?.[0],
        companySlug: errs.companySlug?.[0],
      },
    };
  }

  const existingUser = await getMembershipWithCompany(userId);
  if (existingUser) {
    redirect("/dashboard");
  }

  if (isReservedSubdomain(parsed.data.companySlug)) {
    return {
      ok: false,
      message:
        "This URL slug is reserved. Choose a different subdomain for your company.",
      values: submittedValues,
      fieldErrors: {
        companySlug: "Reserved slug — pick another.",
      },
    };
  }

  const [slugTaken] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, parsed.data.companySlug))
    .limit(1);

  if (slugTaken) {
    return {
      ok: false,
      message: `The slug "${parsed.data.companySlug}" is already taken.`,
      values: submittedValues,
      fieldErrors: { companySlug: "This slug is already taken." },
    };
  }

  await db.transaction(async (tx) => {
    const [free] = await tx
      .select()
      .from(plans)
      .where(eq(plans.code, "free"))
      .limit(1);

    if (!free?.id) {
      throw new Error("Free plan missing — run database seed.");
    }

    const [company] = await tx
      .insert(companies)
      .values({
        name: parsed.data.companyName,
        slug: parsed.data.companySlug,
        planId: free.id,
      })
      .returning();

    if (!company) throw new Error("Failed to create company.");

    await tx.insert(companyUsers).values({
      companyId: company.id,
      clerkUserId: userId,
      role: "owner",
    });

    await grantPlanFeaturesFromPlan(
      tx as unknown as AppDatabase,
      company.id,
      free.id
    );
  });

  redirect("/dashboard");
}
