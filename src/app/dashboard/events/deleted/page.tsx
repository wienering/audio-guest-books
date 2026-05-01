import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMembershipWithCompany } from "@/lib/company";
import { formatDate, formatDateOnly } from "@/lib/date-format";
import { listDeletedEventsForCompany } from "@/lib/event-mutations";

import { DeletedEventRowActions } from "./deleted-event-row-actions";

export const metadata = {
  title: "Deleted events",
};

export default async function DeletedEventsPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) redirect("/sign-in");

  const membership = await getMembershipWithCompany(userId);
  if (!membership) redirect("/onboarding");

  const rows = await listDeletedEventsForCompany(membership.company.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Deleted events
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Events you&apos;ve deleted within the last 30 days. After the
          permanent removal date, they&apos;re wiped from storage and cannot be
          restored.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} deleted event{rows.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>
            Restoring an event makes it visible again on your dashboard and
            re-enables the client page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deleted events.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Event</th>
                    <th className="py-2 pr-4 font-medium">Client</th>
                    <th className="py-2 pr-4 font-medium">Deleted</th>
                    <th className="py-2 pr-4 font-medium">
                      Permanent removal
                    </th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          /{r.retailClientSlug}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{r.retailClientName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(r.deletedAt, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {r.hardDeleteAfter
                          ? formatDateOnly(r.hardDeleteAfter)
                          : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <DeletedEventRowActions
                          eventId={r.id}
                          eventName={r.name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
