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
        token?: string;
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
      if (typeof data.token === "string") {
        const consumeUrl = `/impersonate/consume?ticket=${encodeURIComponent(data.token)}`;
        window.open(consumeUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No impersonation ticket returned");
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
      title={`Open ${props.companyName} dashboard in a new tab. For best results use incognito or a separate profile so your super admin session stays signed in.`}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? "…" : "Impersonate"}
    </Button>
  );
}
