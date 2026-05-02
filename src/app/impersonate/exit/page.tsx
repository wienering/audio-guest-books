"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Phase = "working" | "done" | "error";

export default function ImpersonationExitPage() {
  const { signOut } = useClerk();
  const [phase, setPhase] = useState<Phase>("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      try {
        const res = await fetch("/api/admin/impersonate/exit", {
          method: "POST",
        });
        if (!res.ok) {
          setPhase("error");
          return;
        }
        await signOut();
        setPhase("done");
      } catch {
        setPhase("error");
      }
    }

    void run();
  }, [signOut]);

  if (phase === "working") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
        Ending impersonation…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center text-sm">
        <p className="font-semibold text-destructive">
          Could not end impersonation cleanly. Try signing out manually.
        </p>
        <Link
          href="/sign-in"
          className="inline-block text-primary underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16 text-center text-sm">
      <p className="text-foreground">
        Impersonation ended. Sign in to your super admin account to continue.
      </p>
      <p className="text-muted-foreground">
        For a smoother workflow next time, use a separate browser profile or
        incognito window when opening an impersonation tab so your admin
        session stays isolated.
      </p>
      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Sign in
      </Link>
    </div>
  );
}
