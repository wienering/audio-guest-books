"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AnalyticsLockedOverlay(props: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/75 px-6 py-12 text-center backdrop-blur-sm",
        props.className
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted shadow-inner">
          <Lock className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <p className="font-semibold text-lg tracking-tight">
          Upgrade to Pro to see your real analytics
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Track page views, downloads, and engagement for every event.
        </p>
        <Link
          href="/dashboard/account#billing"
          className={cn(buttonVariants({ size: "sm" }), "mt-2")}
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
