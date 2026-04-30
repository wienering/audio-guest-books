import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountDeletionClient } from "@/app/dashboard/settings/account/account-deletion-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadAccountDeletionPreview } from "@/lib/account-deletion-preview";
import { getMembershipWithCompany } from "@/lib/company";

export default async function AccountSettingsPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const preview = await loadAccountDeletionPreview(membership.company.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Account</h1>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          Manage deletion and lifecycle for workspace{" "}
          <strong>{membership.company.name}</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>
            Company slug:{" "}
            <span className="font-mono">{membership.company.slug}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <AccountDeletionClient
        companyName={membership.company.name}
        preview={preview}
      />
    </div>
  );
}
