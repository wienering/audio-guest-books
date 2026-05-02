import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { companyUsers } from "@/db/schema";
import { getActorSubFromAuth, logAdminAction } from "@/lib/admin-audit";
import { isAdminUser } from "@/lib/admin-auth";
import type { MembershipWithCompany } from "@/lib/company";

/** Clerk actor token lifetime (seconds). */
export const IMPERSONATION_TOKEN_TTL_SECONDS = 3600;

export function isImpersonatedClerkSession(
  session: Awaited<ReturnType<typeof auth>>
): boolean {
  const sub = getActorSubFromAuth(session);
  return Boolean(sub && isAdminUser(sub));
}

export function impersonationBillingBlockResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Billing changes are disabled while impersonating. Exit impersonation to manage plans or subscriptions.",
    },
    { status: 403 }
  );
}

export function impersonationAccountDeletionBlockResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Account deletion is disabled while impersonating. Exit impersonation first.",
    },
    { status: 403 }
  );
}

export async function getOwnerClerkUserIdForCompany(
  companyId: string
): Promise<string | null> {
  const row = await db.query.companyUsers.findFirst({
    where: and(
      eq(companyUsers.companyId, companyId),
      eq(companyUsers.role, "owner")
    ),
    columns: { clerkUserId: true },
  });
  return row?.clerkUserId ?? null;
}

async function clerkUserDisplayName(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return full || u.username || u.primaryEmailAddress?.emailAddress || userId;
  } catch {
    return userId;
  }
}

/** Audits a dashboard mutation when the Clerk session is an impersonation. No-op otherwise. */
export async function logImpersonatedDashboardMutation(
  membership: MembershipWithCompany,
  actionLabel: string,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  const session = await auth();
  if (!isImpersonatedClerkSession(session)) return;
  const actorSub = getActorSubFromAuth(session);
  if (!actorSub) return;
  const name = await clerkUserDisplayName(actorSub);
  const companyName = membership.company.name;
  try {
    await logAdminAction({
      actionType: "impersonation_dashboard_mutation",
      description: `Super admin ${name} performed ${actionLabel} while impersonating ${companyName}`,
      targetCompanyId: membership.company.id,
      targetCompanySlug: membership.company.slug,
      impersonatedCompanyId: membership.company.id,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error("[impersonation audit] log failed", e);
  }
}
