"use client";

import { usePathname } from "next/navigation";

import { PillNav } from "@/components/ui/pill-nav";

const DASHBOARD_NAV_ITEMS = [
  { label: "Events", value: "events", href: "/dashboard" },
  { label: "Analytics", value: "analytics", href: "/dashboard/analytics" },
  {
    label: "Email templates",
    value: "email-templates",
    href: "/dashboard/settings/email-templates",
  },
  { label: "Branding", value: "branding", href: "/dashboard/settings/branding" },
  {
    label: "Public guest page",
    value: "public-page",
    href: "/dashboard/settings/public-page",
  },
  { label: "Billing", value: "billing", href: "/dashboard/settings/billing" },
  { label: "Account", value: "account", href: "/dashboard/settings/account" },
] as const;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function activeNavValue(pathname: string): string {
  const p = normalizePathname(pathname);
  const sorted = [...DASHBOARD_NAV_ITEMS].sort(
    (a, b) => b.href.length - a.href.length
  );
  for (const item of sorted) {
    if (p === item.href || p.startsWith(`${item.href}/`)) {
      return item.value;
    }
  }
  return DASHBOARD_NAV_ITEMS[0].value;
}

export function DashboardTopPillNav(props: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeValue = activeNavValue(pathname);

  return (
    <PillNav
      className={props.className}
      items={[...DASHBOARD_NAV_ITEMS]}
      activeValue={activeValue}
      ariaLabel="Dashboard"
      size="compact"
    />
  );
}
