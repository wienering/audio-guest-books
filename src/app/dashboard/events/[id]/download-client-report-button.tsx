"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import {
  reportFilenameDate,
  sanitizeReportFilenameSegment,
} from "@/lib/client-report-filename";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  retailClientSlug: string;
};

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  return quoted?.[1] ?? null;
}

export function DownloadClientReportButton(props: Props) {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${props.eventId}/report.pdf`);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(j?.error ?? "Could not generate report.", {
          action: {
            label: "Retry",
            onClick: () => void download(),
          },
        });
        return;
      }
      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(
        res.headers.get("Content-Disposition")
      );
      const fallback = `${sanitizeReportFilenameSegment(props.retailClientSlug)}-report-${reportFilenameDate()}.pdf`;
      const filename = fromHeader ?? fallback;

      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      toast.success("Report downloaded");
    } catch {
      toast.error("Network error.", {
        action: {
          label: "Retry",
          onClick: () => void download(),
        },
      });
    } finally {
      setBusy(false);
    }
  }, [props.eventId, props.retailClientSlug]);

  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "inline-flex shrink-0 items-center justify-center gap-2"
      )}
      onClick={() => void download()}
    >
      {busy ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Generating…
        </>
      ) : (
        "Download client report"
      )}
    </button>
  );
}
