"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeletedEventRowActions(props: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"restore" | "hard" | null>(null);
  const [hardOpen, setHardOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function restore() {
    setBusy("restore");
    try {
      const r = await fetch(`/api/events/${props.eventId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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

  async function hardDelete() {
    if (
      confirmName.trim().toLowerCase() !== props.eventName.trim().toLowerCase()
    ) {
      toast.error("Type the event name exactly to confirm.");
      return;
    }
    setBusy("hard");
    try {
      const r = await fetch(
        `/api/events/${props.eventId}/hard-delete-now`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmName: confirmName.trim() }),
        }
      );
      const j = (await r.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not delete event.");
        return;
      }
      toast.success("Event permanently deleted.");
      setHardOpen(false);
      setConfirmName("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => void restore()}
      >
        {busy === "restore" ? "Restoring…" : "Restore"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive"
        disabled={busy !== null}
        onClick={() => setHardOpen((v) => !v)}
      >
        Delete now
      </Button>

      {hardOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setHardOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Permanently delete event?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This wipes the event row, all audio files, analytics, sessions,
              and R2 objects right away. There is no recovery.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Type the event name{" "}
              <strong className="text-foreground">{props.eventName}</strong>{" "}
              to confirm:
            </p>
            <Input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={props.eventName}
              className="mt-2"
              disabled={busy !== null}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => {
                  setHardOpen(false);
                  setConfirmName("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={
                  busy !== null ||
                  confirmName.trim().toLowerCase() !==
                    props.eventName.trim().toLowerCase()
                }
                onClick={() => void hardDelete()}
              >
                {busy === "hard" ? "Deleting…" : "Permanently delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
