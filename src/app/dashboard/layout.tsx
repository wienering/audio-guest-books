import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  getMembershipWithCompany,
  getSoftDeletedMembershipInfo,
} from "@/lib/company";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    redirect("/sign-in");
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    const pending = await getSoftDeletedMembershipInfo(userId);
    if (pending) {
      const q =
        pending.hardDeleteAfter != null
          ? `?purgeDate=${pending.hardDeleteAfter.toISOString().slice(0, 10)}`
          : "";
      redirect(`/account-scheduled-for-deletion${q}`);
    }
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-semibold tracking-tight"
            >
              Audio Guest Books
            </Link>
            <nav className="hidden gap-4 text-muted-foreground text-sm md:flex">
              <Link href="/dashboard" className="hover:text-foreground">
                Events
              </Link>
              <Link
                href="/dashboard/analytics"
                className="hover:text-foreground"
              >
                Analytics
              </Link>
              <Link
                href="/dashboard/settings/email-templates"
                className="hover:text-foreground"
              >
                Email templates
              </Link>
              <Link
                href="/dashboard/settings/branding"
                className="hover:text-foreground"
              >
                Branding
              </Link>
              <Link
                href="/dashboard/settings/account"
                className="hover:text-foreground"
              >
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-muted-foreground text-sm md:inline">
              {membership.company.name}
            </span>
            <UserButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-10">{children}</div>
      <aside className="fixed bottom-4 right-4 hidden md:block">
        <Button variant="outline" size="sm" disabled>
          Billing <span className="text-muted-foreground">(Stage&nbsp;9)</span>
        </Button>
      </aside>
    </div>
  );
}
