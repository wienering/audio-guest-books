"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AdminImpersonateButton(props: {
  companyId: string;
  companyName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/impersonate/${encodeURIComponent(props.companyId)}`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Could not start impersonation"
        );
        return;
      }
      if (typeof data.url === "string") {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title={`Open ${props.companyName} dashboard in a new tab`}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? "…" : "Impersonate"}
    </Button>
  );
}
