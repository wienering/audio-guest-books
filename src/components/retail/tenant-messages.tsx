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
        borderColor: "var(--brand-body-border)",
        background:
          "color-mix(in srgb, var(--brand-body-card-bg) 96%, var(--brand-body-muted) 4%)",
      }}
    >
      <h2
        className="text-xl font-semibold"
        style={{ color: "var(--brand-body-heading)" }}
      >
        Recordings no longer available
      </h2>
      <p
        className="mx-auto mt-4 max-w-md text-lg leading-relaxed"
        style={{ color: "var(--brand-body-muted)" }}
      >
        The audio files for this guest book have been removed as part of the
        studio&apos;s retention policy. If you need a copy, please reach out to
        the host who shared this page.
      </p>
    </section>
  );
}
