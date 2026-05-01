import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/db/index";
import { audioFiles, events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { formatDate } from "@/lib/date-format";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const eventRows = await db.query.events.findMany({
    where: and(
      eq(events.companyId, membership.company.id),
      isNull(events.deletedAt)
    ),
    orderBy: (e) => [desc(e.createdAt)],
    with: {
      audioFiles: {
        where: and(
          isNull(audioFiles.deletedAt),
          isNotNull(audioFiles.uploadedAt)
        ),
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hello, {membership.company.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your events and audio uploads.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className={cn(buttonVariants({ size: "default" }))}
        >
          New event
        </Link>
      </div>

      {eventRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              Create your first event to start collecting guest book audio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No events yet. You can add wedding, birthday, corporate, and
                more — per your plan limits.
              </p>
              <Link
                href="/dashboard/events/new"
                className={cn(buttonVariants({ size: "default" }))}
              >
                New event
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>Recent guest book workspaces</CardDescription>
            </div>
            <Link
              href="/dashboard/events/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-full justify-center sm:w-auto"
              )}
            >
              New event
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Files</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {eventRows.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/dashboard/events/${ev.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {ev.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{ev.retailClientName}</td>
                    <td className="py-3 pr-4">{ev.audioFiles.length}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatDate(ev.createdAt, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
