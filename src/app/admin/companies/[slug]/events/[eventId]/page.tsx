import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminEventDetail } from "@/lib/admin-event-detail";
import { companyHasFeatureKey } from "@/lib/company-features";
import { formatDate, formatDateOnly, formatDateTime } from "@/lib/date-format";
import { cn, formatBytes } from "@/lib/utils";

import { AdminEventActions } from "./admin-event-actions";

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  corporate: "Corporate",
  anniversary: "Anniversary",
  other: "Other",
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDateTime(iso) || "—";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDateOnly(iso);
}

export default async function AdminEventDetailPage(props: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await props.params;
  const detail = await getAdminEventDetail(slug, eventId);
  if (!detail) notFound();

  const passwordProtectionAllowed = await companyHasFeatureKey(
    detail.company.id,
    "password_protection"
  );

  const isDeleted = detail.event.deletedAt != null;
  const eventTypeLabel =
    detail.event.eventType === "other" && detail.event.eventTypeOther?.trim()
      ? detail.event.eventTypeOther.trim()
      : EVENT_TYPE_LABEL[detail.event.eventType] ?? detail.event.eventType;

  return (
    <div className="space-y-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link
          href="/admin/companies"
          className="hover:text-foreground hover:underline"
        >
          All companies
        </Link>
        <span>›</span>
        <Link
          href={`/admin/companies/${encodeURIComponent(detail.company.slug)}`}
          className="font-mono hover:text-foreground hover:underline"
        >
          {detail.company.slug}
        </Link>
        <span>›</span>
        <span className="text-foreground">Events</span>
        <span>›</span>
        <span className="text-foreground">{detail.event.name}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {detail.event.name}
          {isDeleted ? (
            <span className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              SOFT-DELETED
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">{eventTypeLabel}</span>
          {" · "}
          {formatDateOnly(detail.event.eventDate)}
          {" · "}Client {detail.event.retailClientName} (
          {detail.event.retailClientEmail})
          {" · "}Slug{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {detail.event.retailClientSlug}
          </code>
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
            <CardDescription>Read-only metadata snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV label="ID" value={detail.event.id} mono />
            <KV label="Name" value={detail.event.name} />
            <KV
              label="Type"
              value={
                detail.event.eventType === "other"
                  ? `${detail.event.eventType} (${
                      detail.event.eventTypeOther ?? "—"
                    })`
                  : detail.event.eventType
              }
            />
            <KV
              label="Event date"
              value={formatDateOnly(detail.event.eventDate)}
            />
            <KV
              label="Client name"
              value={detail.event.retailClientName}
            />
            <KV
              label="Client email"
              value={detail.event.retailClientEmail}
            />
            <KV
              label="Client slug"
              value={detail.event.retailClientSlug}
              mono
            />
            <KV
              label="Password"
              value={
                detail.event.passwordActive
                  ? `set (${formatDate(detail.event.passwordSetAt ?? "")})`
                  : "none"
              }
            />
            <KV label="Created" value={fmt(detail.event.createdAt)} />
            <KV label="Updated" value={fmt(detail.event.updatedAt)} />
            <KV
              label="Retention until"
              value={fmtDate(detail.event.retentionUntil)}
            />
            <KV
              label="Metadata-only after"
              value={fmtDate(detail.event.metadataOnlyAfter)}
            />
            {isDeleted ? (
              <>
                <KV
                  label="Soft-deleted at"
                  value={fmt(detail.event.deletedAt)}
                />
                <KV
                  label="Hard-delete after"
                  value={fmtDate(detail.event.hardDeleteAfter)}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              All-time analytics + storage summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV
              label="Files"
              value={`${detail.totalFiles} (${formatBytes(detail.totalStorageBytes)})`}
            />
            <KV
              label="Page views"
              value={detail.analytics.pageViews.toLocaleString()}
            />
            <KV
              label="File plays"
              value={detail.analytics.filePlays.toLocaleString()}
            />
            <KV
              label="File downloads"
              value={detail.analytics.fileDownloads.toLocaleString()}
            />
            <KV
              label="Zip downloads"
              value={detail.analytics.zipDownloads.toLocaleString()}
            />
            <KV
              label="Unique visitors"
              value={detail.analytics.uniqueIps.toLocaleString()}
            />
            <KV label="Last seen" value={fmt(detail.analytics.lastSeenAt)} />
          </CardContent>
        </Card>
      </div>

      <AdminEventActions
        eventId={detail.event.id}
        companySlug={detail.company.slug}
        isDeleted={isDeleted}
        passwordProtectionAllowed={passwordProtectionAllowed}
        initial={{
          name: detail.event.name,
          eventType: detail.event.eventType,
          eventTypeOther: detail.event.eventTypeOther,
          eventDate: detail.event.eventDate,
          retailClientName: detail.event.retailClientName,
          retailClientEmail: detail.event.retailClientEmail,
          retailClientSlug: detail.event.retailClientSlug,
          passwordActive: detail.event.passwordActive,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Files ({detail.files.length})</CardTitle>
          <CardDescription>
            Includes deleted (tombstoned) audio rows. Original recordings only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audio files for this event.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Filename</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Size</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.files.map((f) => (
                    <tr
                      key={f.id}
                      className={cn(
                        "border-b last:border-0",
                        f.deletedAt && "text-muted-foreground line-through"
                      )}
                    >
                      <td className="py-2 pr-4 break-words">
                        {f.originalFilename}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {f.mimeType}
                        {!f.isOriginal ? (
                          <span className="ml-1 rounded-md bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            transcoded
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {formatBytes(f.sizeBytes)}
                      </td>
                      <td className="py-2 pr-4">
                        {f.deletedAt ? "deleted" : f.transcodingStatus}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {fmt(f.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin actions on this event</CardTitle>
          <CardDescription>Most recent 20.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.adminAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No admin actions on this event.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.adminAudit.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                      {row.actionType}
                    </span>
                    <span className="ml-2">{row.description}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(row.createdAt)} · admin{" "}
                    <span className="font-mono">{row.adminClerkUserId}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KV(props: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3">
      <span className="text-muted-foreground">{props.label}</span>
      <span
        className={cn(
          "min-w-0 break-words",
          props.mono ? "font-mono text-xs" : ""
        )}
      >
        {props.value}
      </span>
    </div>
  );
}
