import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCompanyByIdForAdmin } from "@/lib/admin-company-detail";
import { getActorSubFromAuth } from "@/lib/admin-audit";
import { isAdminUser } from "@/lib/admin-auth";
import type { companies as companiesTable } from "@/db/schema";

export type RequireAdminApiOk = { adminClerkUserId: string };

/**
 * For admin JSON API routes. Returns 403 for non-admins. Distinct from the
 * RSC-level `requireAdminAccess()` which redirects.
 */
export async function requireAdminApi(): Promise<
  RequireAdminApiOk | { error: NextResponse }
> {
  const session = await auth();
  if (getActorSubFromAuth(session)) {
    return {
      error: NextResponse.json(
        {
          error:
            "Platform admin API is unavailable during impersonation. Exit impersonation first.",
        },
        { status: 403 }
      ),
    };
  }
  const userId = session.userId;
  if (!userId || !isAdminUser(userId)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { adminClerkUserId: userId };
}

export type LoadAdminCompanyOk = {
  adminClerkUserId: string;
  company: typeof companiesTable.$inferSelect;
};

/**
 * Combo helper: enforces admin auth + loads the target company by id, returning
 * a single 404 / 403 response when either fails.
 */
export async function requireAdminApiAndCompany(
  companyId: string
): Promise<LoadAdminCompanyOk | { error: NextResponse }> {
  const gated = await requireAdminApi();
  if ("error" in gated) {
    return gated;
  }
  const company = await getCompanyByIdForAdmin(companyId);
  if (!company) {
    return {
      error: NextResponse.json({ error: "Company not found" }, { status: 404 }),
    };
  }
  return {
    adminClerkUserId: gated.adminClerkUserId,
    company,
  };
}
