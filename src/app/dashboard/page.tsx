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

export default async function DashboardPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hello, {membership.company.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your events and uploads from here. Uploads will be available in
          stage 2.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            No events yet. Event creation arrives in Stage 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground text-sm">
            Empty state — upcoming: create wedding, birthday, or corporate guest
            book events per plan limits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
