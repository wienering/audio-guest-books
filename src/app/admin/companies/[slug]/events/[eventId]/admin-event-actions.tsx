"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  EventDeleteModal,
  EventEditModal,
  type EventEditInitial,
} from "@/app/dashboard/events/[id]/event-edit-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  eventId: string;
  companySlug: string;
  isDeleted: boolean;
  passwordProtectionAllowed: boolean;
  initial: EventEditInitial;
};

export function AdminEventActions(props: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [hardOpen, setHardOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function restore() {
    setBusy("restore");
    try {
      const r = await fetch(
        `/api/admin/events/${props.eventId}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const j = (await r.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not restore event.");
        return;
      }
      toast.success("Event restored.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card className="border-destructive/30 ring-1 ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">
            Admin event controls
          </CardTitle>
          <CardDescription>
            Edits and deletes are recorded in the admin audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ActionRow
            title="Edit event"
            description="Same fields as the company-side edit modal. Slug uniqueness is checked across all active events for this company."
            button={
              <Button
                variant="default"
                size="sm"
                onClick={() => setEditOpen(true)}
                disabled={busy !== null || props.isDeleted}
                title={
                  props.isDeleted
                    ? "Restore the event before editing"
                    : undefined
                }
              >
                Edit
              </Button>
            }
          />

          {!props.isDeleted ? (
            <ActionRow
              title="Soft-delete (30-day grace)"
              description="Hides the event from the company dashboard and returns 'not found' on the client page. They can self-restore within 30 days."
              button={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSoftOpen(true)}
                  disabled={busy !== null}
                >
                  Soft-delete
                </Button>
              }
            />
          ) : (
            <ActionRow
              title="Restore event"
              description="Brings the event back to active state. Fails if another active event is now using the same slug."
              button={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void restore()}
                  disabled={busy !== null}
                >
                  {busy === "restore" ? "Restoring…" : "Restore"}
                </Button>
              }
            />
          )}

          <ActionRow
            title="Hard-delete now (admin override)"
            description="Skips the 30-day grace, wipes R2 + DB rows immediately. Requires typing the event name."
            button={
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setHardOpen(true)}
                disabled={busy !== null}
              >
                Hard-delete now
              </Button>
            }
          />
        </CardContent>
      </Card>

      <EventEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patchUrl={`/api/admin/events/${props.eventId}`}
        initial={props.initial}
        passwordProtectionAllowed={props.passwordProtectionAllowed}
        isAdmin
        hint="You're editing this event as an admin. The change will appear in the audit log."
      />

      {softOpen ? (
        <EventDeleteModal
          open={softOpen}
          onClose={() => setSoftOpen(false)}
          eventName={props.initial.name}
          softDeleteUrl={`/api/admin/events/${props.eventId}/soft-delete`}
          hardDeleteNowUrl={`/api/admin/events/${props.eventId}/hard-delete-now`}
          redirectAfterDelete={`/admin/companies/${encodeURIComponent(
            props.companySlug
          )}`}
        />
      ) : null}

      {hardOpen ? (
        <EventDeleteModal
          open={hardOpen}
          onClose={() => setHardOpen(false)}
          eventName={props.initial.name}
          softDeleteUrl={`/api/admin/events/${props.eventId}/soft-delete`}
          hardDeleteNowUrl={`/api/admin/events/${props.eventId}/hard-delete-now`}
          redirectAfterDelete={`/admin/companies/${encodeURIComponent(
            props.companySlug
          )}`}
          hardOnly
          title="Hard-delete this event NOW"
        />
      ) : null}
    </>
  );
}

function ActionRow(props: {
  title: string;
  description: string;
  button: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      <div className="shrink-0">{props.button}</div>
    </div>
  );
}
