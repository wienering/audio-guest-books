import { headers } from "next/headers";
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { resolveAppBaseUrl } from "@/lib/app-url";

export async function MarketingShell({ children }: { children: ReactNode }) {
  const h = await headers();
  const appUrl = resolveAppBaseUrl(h.get("host"));

  return (
    <div className="flex min-h-screen flex-col bg-marketing-bg text-marketing-ink">
      <MarketingHeader appUrl={appUrl} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
