import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getMembershipWithCompany, type MembershipWithCompany } from "@/lib/company";

export type OwnerBillingOk = { membership: MembershipWithCompany };

export async function requireOwnerBilling(): Promise<
  OwnerBillingOk | { error: NextResponse }
> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return {
      error: NextResponse.json({ error: "No active company" }, { status: 403 }),
    };
  }

  if (membership.role !== "owner") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { membership };
}
