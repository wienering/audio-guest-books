import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-marketing-border bg-marketing-bg">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-3">
            <BrandLogo className="h-8 w-auto max-w-[220px]" />
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
      <p className="font-mono text-[10px] font-medium text-marketing-muted uppercase tracking-[0.14em]">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-marketing-muted text-sm transition-colors hover:text-marketing-accent"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
