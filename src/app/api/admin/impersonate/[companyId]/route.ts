import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { isAdminUser } from "@/lib/admin-auth";
import { requireAdminApiAndCompany } from "@/lib/admin-route-auth";
import {
  getOwnerClerkUserIdForCompany,
  IMPERSONATION_TOKEN_TTL_SECONDS,
} from "@/lib/impersonation";

export async function POST(
  _req: Request,
  props: { params: Promise<{ companyId: string }> }
): Promise<Response> {
  const { companyId } = await props.params;

  const gated = await requireAdminApiAndCompany(companyId);
  if ("error" in gated) {
    return gated.error;
  }

  const { adminClerkUserId, company } = gated;

  const ownerClerkId = await getOwnerClerkUserIdForCompany(company.id);
  if (!ownerClerkId) {
    return NextResponse.json(
      { error: "Company has no owner membership" },
      { status: 400 }
    );
  }

  if (isAdminUser(ownerClerkId)) {
    return NextResponse.json(
      { error: "Cannot impersonate another platform administrator account." },
      { status: 403 }
    );
  }

  const clerk = await clerkClient();
  let url: string;
  try {
    const token = await clerk.actorTokens.create({
      userId: ownerClerkId,
      actor: { sub: adminClerkUserId },
      expiresInSeconds: IMPERSONATION_TOKEN_TTL_SECONDS,
    });
    if (!token.url) {
      return NextResponse.json(
        { error: "Impersonation token did not include a URL" },
        { status: 500 }
      );
    }
    url = token.url;
  } catch (e) {
    console.error("[impersonate] actor token failed", e);
    return NextResponse.json(
      { error: "Could not start impersonation" },
      { status: 500 }
    );
  }

  await logAdminAction({
    actionType: "impersonation_started",
    description: `Started impersonation of ${company.name} (${company.slug})`,
    targetCompanyId: company.id,
    targetCompanySlug: company.slug,
    targetUserClerkId: ownerClerkId,
    impersonatedCompanyId: company.id,
    adminClerkUserId,
  });

  return NextResponse.json({ url });
}
