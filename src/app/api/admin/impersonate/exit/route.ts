import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getActorSubFromAuth, logAdminAction } from "@/lib/admin-audit";
import { isAdminUser } from "@/lib/admin-auth";
import { getMembershipWithCompany } from "@/lib/company";

export async function POST(): Promise<Response> {
  const session = await auth();
  const actorSub = getActorSubFromAuth(session);
  if (!actorSub || !isAdminUser(actorSub)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json(
      { error: "No active company context" },
      { status: 400 }
    );
  }

  await logAdminAction({
    actionType: "impersonation_session_end",
    description: `Ended impersonation of ${membership.company.name} (${membership.company.slug})`,
    targetCompanyId: membership.company.id,
    targetCompanySlug: membership.company.slug,
    impersonatedCompanyId: membership.company.id,
  });

  const sessionId = session.sessionId;
  if (!sessionId) {
    return NextResponse.json(
      { error: "No active impersonation session" },
      { status: 400 }
    );
  }

  try {
    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);
  } catch (e) {
    console.error("[impersonate exit] revoke session failed", e);
    return NextResponse.json(
      { error: "Could not end impersonation session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
