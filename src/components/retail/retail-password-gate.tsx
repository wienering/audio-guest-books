"use client";

import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  companySlug: string;
  clientSlug: string;
  eventName: string;
};

export function RetailPasswordGate(props: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/retail/${encodeURIComponent(props.companySlug)}/${encodeURIComponent(props.clientSlug)}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "same-origin",
        }
      );
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        setError(j?.error ?? "Something went wrong.");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white px-4 py-16 text-neutral-900 sm:px-8">
      <div className="mx-auto w-full max-w-md space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {props.eventName}
          </h1>
          <p className="text-lg text-neutral-600 sm:text-xl">
            You’re almost there — pop in the password your host shared with you,
            and you can listen to every message.
          </p>
        </header>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="retail-password" className="text-base">
              Password
            </Label>
            <Input
              id="retail-password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              className="min-h-12 text-base"
              disabled={busy}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 min-h-12 w-full text-base"
            )}
          >
            {busy ? "Checking…" : "View guest book"}
          </button>
        </form>
      </div>
    </div>
  );
}
