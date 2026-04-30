import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReservedSubdomainMessage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-xl tracking-tight text-neutral-900">
        Unavailable
      </h1>
      <p className="mt-3 text-neutral-600 leading-relaxed">
        This subdomain is reserved and cannot host a company gallery.
      </p>
    </main>
  );
}

export function TenantNotFoundMessage() {
  return <RetailPageNotAvailableMessage />;
}

export function RetailPageNotAvailableMessage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-xl tracking-tight text-neutral-900">
        This page is not available
      </h1>
      <p className="mt-3 text-neutral-600 leading-relaxed">
        The guest book link may be incorrect, or this event may have been removed.
      </p>
    </main>
  );
}

export function RetailFilesRemovedMessage() {
  return (
    <section
      aria-label="Recordings unavailable"
      className="rounded-xl border px-6 py-12 text-center"
      style={{
        borderColor: "var(--retail-border)",
        background:
          "color-mix(in srgb, var(--retail-bg) 96%, var(--retail-muted) 4%)",
      }}
    >
      <h2 className="text-xl font-semibold text-[var(--retail-text)]">
        Recordings no longer available
      </h2>
      <p
        className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-[var(--retail-muted)]"
      >
        The audio files for this guest book have been removed as part of the
        studio&apos;s retention policy. If you need a copy, please reach out to
        the host who shared this page.
      </p>
    </section>
  );
}

export function TenantRootPlaceholder({
  companySlug,
  appUrl,
}: {
  companySlug: string;
  appUrl: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-2xl tracking-tight text-neutral-900">
        {companySlug}
      </h1>
      <p className="mt-4 text-neutral-600 leading-relaxed">
        Open your personal guest book link — it includes the event path after the
        site address (for example:&nbsp;
        <span className="font-medium text-neutral-800">
          {companySlug}.localhost…
        </span>
        ). If you need the link, contact the studio that recorded your messages.
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
