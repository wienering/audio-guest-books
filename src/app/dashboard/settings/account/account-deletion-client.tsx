"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountDeletionPreview } from "@/lib/account-deletion-preview";

type Props = {
  companyName: string;
  preview: AccountDeletionPreview;
};

export function AccountDeletionClient({ companyName, preview }: Props) {
  const { signOut } = useClerk();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const mb =
    preview.storageBytesTotal > 0
      ? preview.storageBytesTotal / (1024 * 1024)
      : 0;
  const mbLabel =
    mb < 0.1 && preview.storageBytesTotal > 0
      ? "<0.1"
      : mb.toFixed(mb >= 10 ? 0 : 1);

  const trimmedMatch =
    typed.trim().toLowerCase() === companyName.trim().toLowerCase();

  async function confirmDelete(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.redirectUrl) {
        throw new Error(data.error ?? "Could not delete account");
      }
      await signOut({ redirectUrl: data.redirectUrl });
    } catch {
      setBusy(false);
      alert(
        "We couldn't finish deletion. Please try again or contact support."
      );
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-destructive/40 bg-background p-6">
        <h2 className="font-semibold text-destructive text-lg">Danger zone</h2>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          Permanently close your workspace. This begins a cooling-off period —
          files stay for thirty days unless you email support to restore.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-6"
          onClick={() => setStep(1)}
          disabled={step !== 0}
        >
          Delete account
        </Button>
      </div>

      {step === 1 ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setStep(0);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-step1-title"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-step1-title"
              className="font-semibold text-lg tracking-tight"
            >
              Delete your account?
            </h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed">
              <li>Company information and branding</li>
              <li>
                All {preview.eventCount}{" "}
                {preview.eventCount === 1 ? "event" : "events"}
              </li>
              <li>
                All {preview.audioFileCount}{" "}
                {preview.audioFileCount === 1 ? "audio file" : "audio files"}{" "}
                ({mbLabel} MB total storage)
              </li>
              <li>All client pages</li>
              <li>
                All custom email templates ({preview.emailTemplateCount}{" "}
                {preview.emailTemplateCount === 1 ? "template" : "templates"})
              </li>
              <li>
                Billing history (anonymized records retained for tax and legal
                compliance)
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(0);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep(2)}
                disabled={busy}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setStep(1);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-step2-title"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-step2-title"
              className="font-semibold text-lg tracking-tight"
            >
              This cannot be undone
            </h3>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Your account will be marked for deletion. Files will be retained
              for 30 days in case you change your mind. To restore your account
              during this period, contact{" "}
              <span className="font-medium text-foreground">
                support@audioguestbooks.ca
              </span>
              . After 30 days, all data will be permanently deleted.
            </p>
            <p className="mt-6 text-muted-foreground text-sm">
              Type your company name <strong>[{companyName}]</strong> to
              confirm:
            </p>
            <Input
              autoFocus
              className="mt-2"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Company name"
              disabled={busy}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={!trimmedMatch || busy}
              >
                {busy ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
