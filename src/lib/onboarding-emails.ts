import { createElement } from "react";

import { OnboardingAdminNotificationEmail } from "@/emails/onboarding-admin-notification";
import { OnboardingWelcomeEmail } from "@/emails/onboarding-welcome";
import { getAppBaseUrl } from "@/lib/app-url";
import { getClerkSignupProfile } from "@/lib/clerk-primary-email";
import { sendEmailWithResult } from "@/lib/email";
import { getPlatformAdminEmail } from "@/lib/platform-admin-email";
import { getTenantPublicSiteUrl } from "@/lib/workspace-url";

function formatTorontoTimestamp(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "long",
  }).format(d);
}

export async function sendOnboardingCompletionEmails(opts: {
  clerkUserId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  planTierName: string;
}): Promise<void> {
  const { clerkUserId, companyId, companyName, companySlug, planTierName } =
    opts;
  const workspaceUrl = getTenantPublicSiteUrl(companySlug);
  const torontoTime = formatTorontoTimestamp(new Date());
  const adminDashboardUrl = `${getAppBaseUrl().replace(/\/$/, "")}/admin/companies`;

  let signupEmail: string | null = null;
  let signupName: string | null = null;
  try {
    const profile = await getClerkSignupProfile(clerkUserId);
    signupEmail = profile.email;
    signupName = profile.displayName;
  } catch (e) {
    console.error(
      "[onboarding] failed to load Clerk profile for signup emails",
      e
    );
  }

  const adminTo = getPlatformAdminEmail();
  if (adminTo) {
    try {
      const result = await sendEmailWithResult({
        to: adminTo,
        subject: `New signup: ${companyName}`,
        kind: "onboarding_admin_notification",
        companyId,
        react: createElement(OnboardingAdminNotificationEmail, {
          companyName,
          companySlug,
          signedUpByName: signupName,
          signedUpByEmail: signupEmail,
          planTierName,
          timestampToronto: torontoTime,
          adminDashboardUrl,
        }),
      });
      if (!result.ok) {
        console.error(
          "[onboarding] admin notification email failed:",
          result.error
        );
      }
    } catch (e) {
      console.error("[onboarding] admin notification email error", e);
    }
  }

  if (signupEmail) {
    try {
      const result = await sendEmailWithResult({
        to: signupEmail,
        subject: "Welcome to Audio Guest Books",
        kind: "onboarding_welcome",
        companyId,
        react: createElement(OnboardingWelcomeEmail, {
          greetingName: signupName,
          companyName,
          workspaceUrl,
        }),
      });
      if (!result.ok) {
        console.error("[onboarding] welcome email failed:", result.error);
      }
    } catch (e) {
      console.error("[onboarding] welcome email error", e);
    }
  } else {
    console.warn(
      "[onboarding] no primary email for Clerk user; skipping welcome email"
    );
  }
}
