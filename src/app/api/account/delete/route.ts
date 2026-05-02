import { createElement } from "react";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { companies } from "@/db/schema";
import { AccountDeletionRequestedEmail } from "@/emails/account-deletion-requested";
import { getAppBaseUrl } from "@/lib/app-url";
import { getMembershipWithCompany } from "@/lib/company";
import {
  impersonationAccountDeletionBlockResponse,
  isImpersonatedClerkSession,
} from "@/lib/impersonation";
import { getClerkPrimaryEmail } from "@/lib/clerk-primary-email";
import { formatDateOnly } from "@/lib/date-format";
import { sendEmailWithResult } from "@/lib/email";
import { utcCalendarDate } from "@/lib/retention";

function addUtcCalendarDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return utcCalendarDate(x);
}

const RESTORE_EMAIL = "support@audioguestbooks.ca";

export async function POST(): Promise<Response> {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (isImpersonatedClerkSession(session)) {
    return impersonationAccountDeletionBlockResponse();
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return NextResponse.json(
      { ok: false, error: "No active company" },
      { status: 403 }
    );
  }

  const now = new Date();
  const hardDeleteAfter = addUtcCalendarDays(utcCalendarDate(now), 30);

  await db
    .update(companies)
    .set({
      deletedAt: now,
      hardDeleteAfter,
      deletionRequestedByUserId: userId,
      updatedAt: now,
    })
    .where(eq(companies.id, membership.company.id));

  const purgeDateIso = hardDeleteAfter.toISOString().slice(0, 10);
  const hardDeleteAfterLabel = formatDateOnly(hardDeleteAfter);

  const toEmail = await getClerkPrimaryEmail(userId);
  if (toEmail) {
    await sendEmailWithResult({
      to: toEmail,
      subject:
        "Your Audio Guest Books account has been marked for deletion",
      kind: "account_deletion_requested",
      react: createElement(AccountDeletionRequestedEmail, {
        hardDeleteAfterLabel,
        restoreEmail: RESTORE_EMAIL,
      }),
    });
  }

  const redirectUrl = `${getAppBaseUrl().replace(/\/$/, "")}/account-scheduled-for-deletion?purgeDate=${purgeDateIso}`;

  return NextResponse.json({ ok: true, redirectUrl });
}
