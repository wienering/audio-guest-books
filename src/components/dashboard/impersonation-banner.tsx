"use client";

import { Button } from "@/components/ui/button";

export function ImpersonationBanner(props: { companyName: string }) {
  function onExit() {
    window.location.href = "/impersonate/exit";
  }

  return (
    <div
      role="status"
      className="flex w-full flex-wrap items-center justify-center gap-2 border-b border-amber-900/35 bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-amber-950 sm:justify-between sm:text-left dark:border-amber-500/50 dark:bg-amber-500 dark:text-amber-950"
    >
      <span>
        You are impersonating {props.companyName}
        <span className="mx-2 opacity-70" aria-hidden>
          ·
        </span>
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0 border-amber-900/50 bg-amber-950 text-amber-50 hover:bg-amber-900 dark:border-amber-950 dark:bg-amber-950 dark:text-amber-100"
        onClick={onExit}
      >
        Exit
      </Button>
    </div>
  );
}
