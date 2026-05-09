import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getMarketingFaqSchemaItems,
  MARKETING_FAQ_PAGE_DESCRIPTION,
  MARKETING_FAQ_PAGE_SCHEMA_NAME,
  MARKETING_FAQ_PAGE_TITLE,
  MARKETING_FAQ_SECTIONS,
  marketingFaqSectionsToAccordionItems,
} from "@/lib/marketing-faq-data";
import {
  marketingCanonical,
  marketingOpenGraphExtras,
  marketingTwitterExtras,
} from "@/lib/marketing-seo-defaults";
import {
  getBreadcrumbSchema,
  getFAQPageSchema,
  getMarketingFaqWebPageSchema,
  SCHEMA_BASE_URL,
  SCHEMA_FAQ_FAQPAGE_ID,
} from "@/lib/schema";

const FAQ_OG_TWITTER_TITLE = "Frequently Asked Questions — Audio Guest Books";

export const metadata: Metadata = {
  title: MARKETING_FAQ_PAGE_TITLE,
  description: MARKETING_FAQ_PAGE_DESCRIPTION,
  alternates: { canonical: marketingCanonical("/faq") },
  openGraph: marketingOpenGraphExtras({
    title: FAQ_OG_TWITTER_TITLE,
    description: MARKETING_FAQ_PAGE_DESCRIPTION,
    pathname: "/faq",
  }),
  twitter: marketingTwitterExtras({
    title: FAQ_OG_TWITTER_TITLE,
    description: MARKETING_FAQ_PAGE_DESCRIPTION,
  }),
};

const FAQ_ACCORDION_SECTIONS = marketingFaqSectionsToAccordionItems(
  MARKETING_FAQ_SECTIONS,
);

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          getBreadcrumbSchema([
            { name: "Home", url: `${SCHEMA_BASE_URL}/` },
            { name: "FAQ", url: `${SCHEMA_BASE_URL}/faq` },
          ]),
          getMarketingFaqWebPageSchema({
            name: MARKETING_FAQ_PAGE_SCHEMA_NAME,
            description: MARKETING_FAQ_PAGE_DESCRIPTION,
          }),
          getFAQPageSchema(getMarketingFaqSchemaItems(), {
            id: SCHEMA_FAQ_FAQPAGE_ID,
          }),
        ]}
      />
      <div className="bg-marketing-bg">
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
          <div className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-10 text-center sm:px-6 sm:pt-24">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
              Frequently Asked Questions
            </p>
            <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-marketing-ink sm:text-5xl">
              Everything You Might Be Wondering
            </h1>
            <p className="text-marketing-muted text-lg leading-relaxed">
              Can&rsquo;t find what you&rsquo;re looking for?{" "}
              <Link
                href="/contact"
                className="text-marketing-accent hover:underline"
              >
                Get in touch
              </Link>
              .
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-12 px-4 pb-24 sm:px-6">
          {FAQ_ACCORDION_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="font-serif text-2xl font-light tracking-tight text-marketing-ink">
                {section.title}
              </h2>
              <FaqAccordion items={section.items} />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
