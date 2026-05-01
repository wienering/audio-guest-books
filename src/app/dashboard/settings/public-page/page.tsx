import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMembershipWithCompany } from "@/lib/company";

import { PublicPageSettingsClient } from "./public-page-settings-client";

export default async function PublicPageSettingsRoute() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const c = membership.company;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Public guest page</h1>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          Your company&apos;s subdomain home (for example{" "}
          <span className="font-mono">
            {c.slug}.audioguestbooks.ca
          </span>
          ) shows your branding and an event code entry form. Guests cannot browse
          events from this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact details</CardTitle>
          <CardDescription>
            Name and logo come from your workspace and branding settings. Add public
            contact information for guests who land on your subdomain home.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublicPageSettingsClient
            initialContactEmail={c.contactEmail}
            initialContactPhone={c.contactPhone}
            initialContactWebsite={c.contactWebsite}
          />
        </CardContent>
      </Card>
    </div>
  );
}
