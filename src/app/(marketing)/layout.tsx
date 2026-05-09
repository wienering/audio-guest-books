import type { ReactNode } from "react";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/schema";

export default function MarketingGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd data={[getOrganizationSchema(), getWebSiteSchema()]} />
      <MarketingShell>{children}</MarketingShell>
    </>
  );
}
