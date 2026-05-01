import type { ReactNode } from "react";

export function LegalPageShell({
  eyebrow,
  title,
  lastUpdated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-marketing-bg">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -top-32 -z-10 h-64 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pt-20 pb-8 text-center sm:px-6 sm:pt-24">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            {eyebrow}
          </p>
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-marketing-ink sm:text-5xl">
            {title}
          </h1>
          <p className="text-marketing-muted text-sm">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl space-y-8 px-4 pb-24 sm:px-6">
        {intro ? (
          <div className="rounded-xl border border-marketing-border bg-marketing-surface p-5 text-marketing-muted text-sm leading-relaxed sm:p-6">
            {intro}
          </div>
        ) : null}

        <div className="space-y-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-light [&_h2]:tracking-tight [&_h2]:text-marketing-ink [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-light [&_h3]:tracking-tight [&_h3]:text-marketing-ink [&_p]:text-marketing-ink/85 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ul]:text-marketing-ink/85 [&_a]:text-marketing-accent [&_a]:hover:underline [&_section]:space-y-3">
          {children}
        </div>
      </article>
    </div>
  );
}
