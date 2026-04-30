"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  companyId: string;
  companySlug: string;
};

export function FoundingToggleButton({ companyId, companySlug }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (
      !confirm(
        `Remove founding-member flag from ${companySlug}? They will keep their subscription but lose the founding status.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/toggle-founding-member`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not toggle.");
        return;
      }
      toast.success(`Founding flag toggled for ${companySlug}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={busy}>
      {busy ? "Working…" : "Toggle off"}
    </Button>
  );
}
