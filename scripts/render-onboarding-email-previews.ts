import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@react-email/render";
import { createElement } from "react";

import { OnboardingAdminNotificationEmail } from "../src/emails/onboarding-admin-notification";
import { OnboardingWelcomeEmail } from "../src/emails/onboarding-welcome";

const outDir = join(process.cwd(), ".email-previews");
mkdirSync(outDir, { recursive: true });

async function main() {
  const welcomeHtml = await render(
    createElement(OnboardingWelcomeEmail, {
      greetingName: "Sarah",
      companyName: "Maple Lane Photography",
      workspaceUrl: "https://maple-lane.audioguestbooks.ca",
    })
  );

  const adminHtml = await render(
    createElement(OnboardingAdminNotificationEmail, {
      companyName: "Maple Lane Photography",
      companySlug: "maple-lane",
      signedUpByName: "Sarah Chen",
      signedUpByEmail: "sarah@example.com",
      planTierName: "Studio",
      timestampToronto: "May 1, 2026, 9:30:00 a.m. EDT",
      adminDashboardUrl: "https://app.audioguestbooks.ca/admin/companies",
    })
  );

  writeFileSync(join(outDir, "onboarding-welcome.html"), welcomeHtml);
  writeFileSync(
    join(outDir, "onboarding-admin-notification.html"),
    adminHtml
  );

  console.log("Wrote:", join(outDir, "onboarding-welcome.html"));
  console.log("Wrote:", join(outDir, "onboarding-admin-notification.html"));
}

void main();
