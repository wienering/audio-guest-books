"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function MarketingHeader({ appUrl }: { appUrl: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-marketing-border/70 bg-marketing-bg/85 backdrop-blur supports-[backdrop-filter]:bg-marketing-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          onClick={() => setOpen(false)}
        >
          <BrandLogo className="h-8 w-auto max-w-[min(100%,240px)] sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-marketing-muted text-sm transition-colors hover:text-marketing-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`${appUrl}/sign-in`}
            className="text-marketing-muted text-sm transition-colors hover:text-marketing-accent"
          >
            Sign In
          </a>
          <a
            href={`${appUrl}/sign-up`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-marketing-ink px-4 text-marketing-bg text-sm font-semibold tracking-tight transition-opacity hover:opacity-90"
          >
            Get Started
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-marketing-ink hover:bg-marketing-border/50 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-marketing-border/70 bg-marketing-bg md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-base text-marketing-ink hover:bg-marketing-border/40"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-marketing-border/60 pt-3">
            <a
              href={`${appUrl}/sign-in`}
              className="rounded-md px-2 py-2 text-base text-marketing-muted hover:bg-marketing-border/40"
            >
              Sign In
            </a>
            <a
              href={`${appUrl}/sign-up`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-marketing-ink px-4 text-marketing-bg text-base font-semibold tracking-tight hover:opacity-90"
            >
              Get Started
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
