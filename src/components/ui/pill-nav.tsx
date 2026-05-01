"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type PillNavItem = {
  label: string;
  value: string;
  href?: string;
};

export type PillNavProps = {
  items: PillNavItem[];
  activeValue: string;
  onChange?: (value: string) => void;
  ariaLabel: string;
  size?: "default" | "compact";
  className?: string;
};

const pillSurface = "bg-[#EAEAE5]";

export function PillNav({
  items,
  activeValue,
  onChange,
  ariaLabel,
  size = "default",
  className,
}: PillNavProps) {
  const itemPad =
    size === "compact" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  const itemBase =
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap justify-center gap-1 rounded-full p-1",
        pillSurface,
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === activeValue;
        const stateCls = active
          ? "bg-card text-foreground shadow-sm"
          : "cursor-pointer border-0 bg-transparent text-muted-foreground hover:bg-white/55 hover:text-foreground/90";

        const cls = cn(itemBase, itemPad, stateCls, "focus-visible:ring-offset-[#EAEAE5]");

        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              role="tab"
              aria-current={active ? "page" : undefined}
              className={cls}
              scroll={false}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cls}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
