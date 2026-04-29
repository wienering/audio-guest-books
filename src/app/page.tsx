import Link from "next/link";
import { headers } from "next/headers";

import { buttonVariants } from "@/components/ui/button";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";

function TenantPlaceholder({
  companySlug,
  appUrl,
}: {
  companySlug: string;
  appUrl: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-2xl tracking-tight">{companySlug}</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Retail guest galleries will render here starting in Stage 3 — play,
        download, branding, and password protection come next.
      </p>
      <Link
        href={`${appUrl}/dashboard`}
        className={cn(buttonVariants({ variant: "outline" }), "mt-8 w-fit")}
      >
        Manage in dashboard →
      </Link>
    </main>
  );
}

function ReservedSubdomain() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-xl tracking-tight">Unavailable</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        This subdomain is reserved and cannot host a company gallery.
      </p>
    </main>
  );
}

function TenantNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-xl tracking-tight">Not found</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        No workspace is configured for this address yet — double-check the link
        you received.
      </p>
    </main>
  );
}

export default async function Home() {
  const h = await headers();
  const tenantStatus = h.get("x-tenant-status");

  if (tenantStatus === "reserved") {
    return <ReservedSubdomain />;
  }
  if (tenantStatus === "not-found") {
    return <TenantNotFound />;
  }

  const companySlug = h.get("x-company-slug");
  const companyId = h.get("x-company-id");
  const appUrl = resolveAppBaseUrl(h.get("host"));
  if (tenantStatus === "ok" && companyId && companySlug) {
    return (
      <TenantPlaceholder companySlug={companySlug} appUrl={appUrl} />
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
