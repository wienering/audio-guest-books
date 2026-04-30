"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type SyncResult = {
  attempted?: number;
  successes?: { slug: string; status: string }[];
  failures?: { slug: string; error: string }[];
  error?: string;
};

export function StatsQuickActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function runRetention() {
    if (
      !confirm(
        "Run the retention scheduler now? This processes notifications, file purges, and any pending hard-deletes."
      )
    ) {
      return;
    }
    setBusy("retention");
    try {
      const res = await fetch("/api/admin/run-retention-scheduler", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Retention scheduler failed.");
        return;
      }
      toast.success("Retention scheduler completed.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function syncSubscriptions() {
    if (
      !confirm(
        "Sync every company with a Stripe subscription against Stripe's source of truth? Only use when state has drifted."
      )
    ) {
      return;
    }
    setBusy("sync");
    try {
      const res = await fetch("/api/admin/sync-subscriptions", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as SyncResult;
      if (!res.ok) {
        toast.error(data.error ?? "Subscription sync failed.");
        return;
      }
      const ok = data.successes?.length ?? 0;
      const failed = data.failures?.length ?? 0;
      toast.success(
        `Synced ${ok} subscription${ok === 1 ? "" : "s"}${
          failed > 0 ? ` (${failed} failed — see audit log)` : ""
        }.`
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={runRetention}
        disabled={busy !== null}
      >
        {busy === "retention" ? "Running…" : "Run retention scheduler now"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={syncSubscriptions}
        disabled={busy !== null}
      >
        {busy === "sync" ? "Syncing…" : "Sync all subscriptions with Stripe"}
      </Button>
    </div>
  );
}
