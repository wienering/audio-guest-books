import type { CSSProperties } from "react";

import { RetailFooter } from "@/components/retail/retail-footer";
import { RetailMaybeImage } from "@/components/retail/retail-maybe-image";
import { RetailTenantEnterCodeForm } from "@/components/retail/retail-tenant-enter-code-form";
import { buildRetailThemeCssVars } from "@/lib/retail-theme-vars";
import type { RetailTenantLandingCompanyRow } from "@/lib/retail-tenant-landing-data";

function contactWebsiteHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function contactWebsiteLabel(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "") || raw.trim();
}

type Props = {
  company: RetailTenantLandingCompanyRow;
  customBranding: boolean;
  removePoweredByFooter: boolean;
  logoUrl: string | null;
};

export function RetailTenantLanding(props: Props) {
  const { company, customBranding, removePoweredByFooter, logoUrl } = props;

  const useCustomTheme =
    customBranding &&
    !!(
      company.themePrimary ||
      company.themeSecondary ||
      company.themeAccent ||
      company.themeBackground
    );

  const themeStyle = buildRetailThemeCssVars({
    useCustomTheme,
    themePrimary: company.themePrimary,
    themeSecondary: company.themeSecondary,
    themeAccent: company.themeAccent,
    themeBackground: company.themeBackground,
    themeText: company.themeText,
  }) as CSSProperties;

  const hasLogo = !!(customBranding && logoUrl);

  const siteHref =
    company.contactWebsite != null &&
    company.contactWebsite.trim().length > 0
      ? contactWebsiteHref(company.contactWebsite)
      : null;

  const hasContactBody =
    (company.contactEmail != null && company.contactEmail.trim().length > 0) ||
    (company.contactPhone != null && company.contactPhone.trim().length > 0) ||
    siteHref != null;

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--retail-bg)] text-[var(--retail-text)]"
      style={themeStyle}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div
          className="w-full max-w-md rounded-xl border px-6 py-8 shadow-sm sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--retail-border)",
            background:
              "color-mix(in srgb, var(--retail-bg) 96%, var(--retail-muted) 4%)",
          }}
        >
          <div className="flex flex-col items-center text-center">
            {hasLogo ? (
              <RetailMaybeImage
                src={logoUrl!}
                alt={`${company.name} logo`}
                className="mb-4 max-h-20 w-auto max-w-[220px] object-contain"
              />
            ) : null}
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              {company.name}
            </h1>
            <p
              className="mt-2 text-sm font-medium uppercase tracking-wide sm:text-base"
              style={{ color: "var(--retail-primary)" }}
            >
              Audio guest book
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-[var(--retail-muted)] sm:text-lg">
              Enter the event code from your invitation to open that guest book.
              Event codes are not listed here — your host shares them separately.
            </p>
          </div>

          <div className="mt-8">
            <RetailTenantEnterCodeForm />
          </div>

          <section
            className="mt-10 border-t pt-8 text-center"
            style={{ borderColor: "var(--retail-border)" }}
            aria-label="Contact"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--retail-muted)]">
              Contact
            </h2>
            <p className="mt-2 font-medium text-[var(--retail-text)]">
              {company.name}
            </p>
            {hasContactBody ? (
              <ul className="mt-4 space-y-2 text-sm text-[var(--retail-muted)]">
                {company.contactEmail != null &&
                company.contactEmail.trim().length > 0 ? (
                  <li>
                    <a
                      className="underline decoration-current/35 underline-offset-2 hover:opacity-90"
                      href={`mailto:${company.contactEmail.trim()}`}
                      style={{ color: "var(--retail-accent)" }}
                    >
                      {company.contactEmail.trim()}
                    </a>
                  </li>
                ) : null}
                {company.contactPhone != null &&
                company.contactPhone.trim().length > 0 ? (
                  <li>
                    <a
                      className="underline decoration-current/35 underline-offset-2 hover:opacity-90"
                      href={`tel:${company.contactPhone.replace(/\s+/g, "")}`}
                      style={{ color: "var(--retail-accent)" }}
                    >
                      {company.contactPhone.trim()}
                    </a>
                  </li>
                ) : null}
                {siteHref != null && company.contactWebsite ? (
                  <li>
                    <a
                      className="underline decoration-current/35 underline-offset-2 hover:opacity-90"
                      href={siteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--retail-accent)" }}
                    >
                      {contactWebsiteLabel(company.contactWebsite)}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--retail-muted)]">
                For questions about an event, reach out to the host who shared
                your guest book link.
              </p>
            )}
          </section>
        </div>
      </div>

      <RetailFooter visible={!removePoweredByFooter} />
    </div>
  );
}
