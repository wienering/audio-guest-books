import Link from "next/link";
import { headers } from "next/headers";

import { buttonVariants } from "@/components/ui/button";
import {
  TenantRootPlaceholder,
  ReservedSubdomainMessage,
  TenantNotFoundMessage,
} from "@/components/retail/tenant-messages";
import { resolveAppBaseUrl } from "@/lib/app-url";

export default async function Home() {
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");

  if (tenantStatus === "reserved") {
    return <ReservedSubdomainMessage />;
  }
  if (tenantStatus === "not-found") {
    return <TenantNotFoundMessage />;
  }

  const companySlug = h.get("x-company-slug");
  const companyId = h.get("x-company-id");
  const appUrl = resolveAppBaseUrl(h.get("host"));
  if (tenantStatus === "ok" && companyId && companySlug) {
    return (
      <TenantRootPlaceholder companySlug={companySlug} appUrl={appUrl} />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen flex-col px-6 py-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          Audio Guest Books • Stage&nbsp;1
        </p>
        <div className="space-y-4">
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
            Deliver audio guest books the professional&nbsp;way
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Provision tenant subdomains for your boutique, upload recordings via
            R2-presigned uploads in later stages, and give couples a branded
            listen page — all from one dashboard backed by Drizzle&nbsp;+
            Neon&nbsp;PostgreSQL.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${appUrl}/sign-up`}
            className={buttonVariants({ size: "lg" })}
          >
            Get started
          </Link>
          <Link
            href={`${appUrl}/sign-in`}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign in to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
