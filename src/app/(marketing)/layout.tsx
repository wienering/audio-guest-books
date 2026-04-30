import type { ReactNode } from "react";

import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function MarketingGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MarketingShell>{children}</MarketingShell>;
}
