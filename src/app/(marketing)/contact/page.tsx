import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import {
  marketingCanonical,
  marketingOpenGraphExtras,
  marketingTwitterExtras,
} from "@/lib/marketing-seo-defaults";
import {
  getBreadcrumbSchema,
  getMarketingContactPageSchema,
  SCHEMA_BASE_URL,
} from "@/lib/schema";

const CONTACT_PAGE_TITLE = "Contact Us";
/** Matches root layout `title.template` with `%s` = `CONTACT_PAGE_TITLE`. */
const CONTACT_PAGE_SCHEMA_NAME = "Contact Us — Audio Guest Books";
const CONTACT_OG_TWITTER_TITLE = CONTACT_PAGE_SCHEMA_NAME;
/** ~148 chars — meta, Open Graph, Twitter, and JSON-LD. */
const CONTACT_PAGE_DESCRIPTION =
  "Contact the Audio Guest Books team for product help, billing, privacy, or legal questions. Email the support, privacy, or legal inboxes — we typically reply within 24 hours on business days.";

export const metadata: Metadata = {
  title: CONTACT_PAGE_TITLE,
  description: CONTACT_PAGE_DESCRIPTION,
  alternates: { canonical: marketingCanonical("/contact") },
  openGraph: marketingOpenGraphExtras({
    title: CONTACT_OG_TWITTER_TITLE,
    description: CONTACT_PAGE_DESCRIPTION,
    pathname: "/contact",
  }),
  twitter: marketingTwitterExtras({
    title: CONTACT_OG_TWITTER_TITLE,
    description: CONTACT_PAGE_DESCRIPTION,
  }),
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          getBreadcrumbSchema([
            { name: "Home", url: `${SCHEMA_BASE_URL}/` },
            { name: "Contact", url: `${SCHEMA_BASE_URL}/contact` },
          ]),
          getMarketingContactPageSchema({
            name: CONTACT_PAGE_SCHEMA_NAME,
            description: CONTACT_PAGE_DESCRIPTION,
          }),
        ]}
      />
      <div className="bg-marketing-bg">
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
          <div className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-24">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
              Contact
            </p>
            <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-marketing-ink sm:text-5xl">
              Get in Touch
            </h1>
            <p className="text-marketing-muted text-lg leading-relaxed">
              Questions, feedback, or just saying hi? We&rsquo;d love to hear from
              you.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
          <div className="rounded-xl border border-marketing-border bg-marketing-surface p-7 sm:p-9">
            <div className="flex items-start gap-4">
              <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-marketing-accent-soft text-marketing-accent">
                <Mail className="size-5" aria-hidden />
              </div>
              <div className="space-y-2">
                <p className="font-serif text-xl font-light tracking-tight text-marketing-ink">
                  Email Support
                </p>
                <p className="text-marketing-muted text-base leading-relaxed">
                  The fastest way to reach us is by email. We typically respond
                  within 24 hours on business days.
                </p>
                <a
                  href="mailto:support@audioguestbooks.ca"
                  className="inline-flex items-center gap-2 pt-1 font-medium text-marketing-accent text-base hover:underline"
                >
                  support@audioguestbooks.ca
                </a>
              </div>
            </div>
          </div>

          <p className="mt-6 px-2 text-marketing-muted text-sm leading-relaxed">
            For privacy questions, write to{" "}
            <a
              href="mailto:privacy@audioguestbooks.ca"
              className="text-marketing-accent hover:underline"
            >
              privacy@audioguestbooks.ca
            </a>
            . For legal or terms-of-service questions, write to{" "}
            <a
              href="mailto:legal@audioguestbooks.ca"
              className="text-marketing-accent hover:underline"
            >
              legal@audioguestbooks.ca
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
