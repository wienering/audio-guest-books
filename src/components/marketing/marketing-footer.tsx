import Link from "next/link";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-marketing-border bg-marketing-bg">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-3">
            <p className="font-serif text-lg tracking-tight text-marketing-ink">
              Audio Guest Books
            </p>
            <p className="max-w-xs text-marketing-muted text-sm leading-relaxed">
              The professional way to deliver wedding and event audio guest
              books to your clients.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Home", href: "/" },
              { label: "Pricing", href: "/pricing" },
              { label: "FAQ", href: "/faq" },
            ]}
          />

          <FooterColumn
            title="Company"
            links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Contact", href: "/contact" },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-marketing-border pt-6 text-center text-marketing-muted text-xs">
          © {year} Audio Guest Books
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-marketing-ink text-sm uppercase tracking-wide">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-marketing-muted text-sm transition-colors hover:text-marketing-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
