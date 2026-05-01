"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function UpgradeTooltipLock(props: {
  locked: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}) {
  const { locked, children, message, className } = props;

  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex cursor-not-allowed rounded-xl border border-transparent bg-transparent text-left outline-none",
            className
          )}
        >
          <span className="pointer-events-none block opacity-60">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex max-w-xs flex-col gap-2 py-3">
          <p>{message ?? "Upgrade to Pro to unlock this feature."}</p>
          <Link
            href="/dashboard/account#billing"
            className="font-medium text-background underline underline-offset-2"
          >
            Upgrade
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
