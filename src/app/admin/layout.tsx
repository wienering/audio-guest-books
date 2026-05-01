import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { requireAdminAccess } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/founding-members", label: "Founding members" },
  { href: "/admin/stats", label: "Platform stats" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminAccess();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-red-500/40 border-b bg-red-500/10 text-red-900 dark:text-red-200">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium tracking-wide">
          <span className="rounded bg-red-600 px-1.5 py-0.5 font-semibold text-white text-[10px] uppercase">
            Admin
          </span>
          You are operating in administrator mode. Actions taken here affect the
          entire platform and are recorded in the audit log.
        </div>
      </div>

      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/companies"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Admin
              </span>
              <BrandLogo className="h-7 w-auto max-w-[180px]" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              ← Exit admin
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <nav className="mb-6 flex flex-wrap gap-2 text-sm md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded border px-2 py-1 text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
