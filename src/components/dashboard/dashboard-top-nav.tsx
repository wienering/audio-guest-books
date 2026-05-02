"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Events", value: "events", href: "/dashboard" },
  { label: "Analytics", value: "analytics", href: "/dashboard/analytics" },
  { label: "Branding", value: "branding", href: "/dashboard/branding" },
  { label: "Account", value: "account", href: "/dashboard/account" },
] as const;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function activeNavValue(pathname: string): string {
  const p = normalizePathname(pathname);
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (p === item.href || p.startsWith(`${item.href}/`)) {
      return item.value;
    }
  }
  return NAV_ITEMS[0].value;
}

export function DashboardTopNav(props: { companyName: string }) {
  const pathname = usePathname() ?? "";
  const activeValue = activeNavValue(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const desktopLinkClass = (active: boolean) =>
    cn(
      "inline-block border-b py-4 text-sm font-medium transition-colors",
      active
        ? "border-foreground/40 text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground/90"
    );

  return (
    <header className="relative z-40 border-border border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="flex shrink-0 items-center">
            <BrandLogo className="h-[calc(1.75rem*1.15)] w-auto max-w-[calc(200px*1.15)]" />
          </Link>
          <nav
            aria-label="Dashboard"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.value}
                href={item.href}
                className={desktopLinkClass(item.value === activeValue)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="hidden max-w-[12rem] truncate text-muted-foreground text-sm md:inline">
            {props.companyName}
          </span>
          <UserButton />
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="dashboard-mobile-nav"
          className="border-border border-t bg-card shadow-sm md:hidden"
        >
          <nav aria-label="Dashboard" className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const active = item.value === activeValue;
              return (
                <Link
                  key={item.value}
                  href={item.href}
                  className={cn(
                    "block w-full border-border border-b px-4 py-3 text-sm font-medium transition-colors last:border-b-0",
                    active
                      ? "bg-muted/60 text-foreground"
                      : "text-muted-foreground hover:text-foreground/90 active:bg-muted/40"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
