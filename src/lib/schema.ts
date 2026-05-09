/** Central JSON-LD builders for audioguestbooks.ca marketing. Org/site IDs are canonical here. */

export const SCHEMA_BASE_URL = "https://audioguestbooks.ca" as const;

export const SCHEMA_ORGANIZATION_ID = `${SCHEMA_BASE_URL}/#organization` as const;
export const SCHEMA_WEBSITE_ID = `${SCHEMA_BASE_URL}/#website` as const;
export const SCHEMA_SOFTWARE_ID = `${SCHEMA_BASE_URL}/#software` as const;
export const SCHEMA_HOME_WEBPAGE_ID = `${SCHEMA_BASE_URL}/#webpage` as const;
export const SCHEMA_PRICING_WEBPAGE_ID = `${SCHEMA_BASE_URL}/pricing#webpage` as const;
export const SCHEMA_FAQ_WEBPAGE_ID = `${SCHEMA_BASE_URL}/faq#webpage` as const;
export const SCHEMA_FAQ_FAQPAGE_ID = `${SCHEMA_BASE_URL}/faq#faqpage` as const;
export const SCHEMA_CONTACT_PAGE_ID = `${SCHEMA_BASE_URL}/contact#webpage` as const;

export type BreadcrumbSchemaItem = { name: string; url: string };
export type FaqSchemaItem = { question: string; answer: string };

/** Shared SoftwareApplication / Product offers (homepage pricing + pricing page). */
export function getMarketingProductOffers(): Record<string, unknown>[] {
  return [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "CAD",
      description: "1 active event, 10 files per event, 6 months retention",
      url: `${SCHEMA_BASE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "0",
      priceCurrency: "CAD",
      description:
        "Free during launch. 10 active events, 100 files, custom branding, analytics. Invitation only.",
      url: `${SCHEMA_BASE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Ultimate",
      price: "5",
      priceCurrency: "CAD",
      description:
        "Unlimited events and files, WAV to MP3 transcoding, custom email templates, priority support",
      url: `${SCHEMA_BASE_URL}/pricing`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "5",
        priceCurrency: "CAD",
        billingIncrement: 1,
        unitCode: "MON",
      },
    },
  ];
}

export function getOrganizationSchema(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": SCHEMA_ORGANIZATION_ID,
    name: "Audio Guest Books",
    url: SCHEMA_BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SCHEMA_BASE_URL}/brand/lockup-horizontal.svg`,
      width: 600,
      height: 120,
    },
    description:
      "The professional way for photo booth and event companies to deliver wedding and event audio guest book recordings to their clients.",
    founder: { "@type": "Person", name: "Dennis Wienering" },
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "Worldwide" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SCHEMA_BASE_URL}/contact`,
      availableLanguage: ["English"],
    },
    // TODO: Add social profile URLs to `sameAs` when accounts are finalized.
    sameAs: [],
  };
}

export function getWebSiteSchema(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": SCHEMA_WEBSITE_ID,
    url: SCHEMA_BASE_URL,
    name: "Audio Guest Books",
    publisher: { "@id": SCHEMA_ORGANIZATION_ID },
    inLanguage: "en-CA",
  };
}

export function getSoftwareApplicationSchema(): Record<string, unknown> {
  return {
    "@type": "SoftwareApplication",
    "@id": SCHEMA_SOFTWARE_ID,
    name: "Audio Guest Books",
    url: SCHEMA_BASE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Audio File Delivery and Client Portal Software",
    operatingSystem: "Web Browser",
    description:
      "A multi-tenant SaaS platform for photo booth and event companies to deliver branded audio guest book recordings to their clients with custom branding, automatic file processing, password protection, and engagement analytics.",
    featureList: [
      "Branded client delivery pages with custom logo, colors, and cover images",
      "Automatic audio file processing and zip extraction",
      "WAV to MP3 transcoding",
      "Password-protected client pages",
      "Client page analytics with plays, downloads, and views",
      "Drag-and-drop file reordering",
      "Custom email templates",
      "File retention up to 24 months",
      "Audit log",
      "Listener emoji reactions",
      "Client report PDFs",
    ],
    publisher: { "@id": SCHEMA_ORGANIZATION_ID },
    offers: getMarketingProductOffers(),
  };
}

export function getBreadcrumbSchema(
  items: BreadcrumbSchemaItem[],
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type FAQPageSchemaOptions = { id?: string };

export function getFAQPageSchema(
  faqs: FaqSchemaItem[],
  options?: FAQPageSchemaOptions,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  if (options?.id) {
    node["@id"] = options.id;
  }
  return node;
}

export function getProductSchema(): Record<string, unknown> {
  return {
    "@type": "Product",
    name: "Audio Guest Books",
    description:
      "Professional audio guest book delivery platform for photo booth and event companies.",
    brand: { "@id": SCHEMA_ORGANIZATION_ID },
    offers: getMarketingProductOffers(),
  };
}

export function getWebPageSchema(args: {
  url: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "WebPage",
    url: args.url,
    name: args.name,
    description: args.description,
  };
}

/** Canonical marketing homepage WebPage node (references #website and #software). */
export function getMarketingHomeWebPageSchema(args: {
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "WebPage",
    "@id": SCHEMA_HOME_WEBPAGE_ID,
    url: SCHEMA_BASE_URL,
    name: args.name,
    description: args.description,
    isPartOf: { "@id": SCHEMA_WEBSITE_ID },
    about: { "@id": SCHEMA_SOFTWARE_ID },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SCHEMA_BASE_URL}/brand/lockup-horizontal.svg`,
      width: 600,
      height: 120,
    },
  };
}

/** Pricing page WebPage (product context via `about` → #software). */
export function getMarketingPricingWebPageSchema(args: {
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "WebPage",
    "@id": SCHEMA_PRICING_WEBPAGE_ID,
    url: `${SCHEMA_BASE_URL}/pricing`,
    name: args.name,
    description: args.description,
    isPartOf: { "@id": SCHEMA_WEBSITE_ID },
    about: { "@id": SCHEMA_SOFTWARE_ID },
  };
}

/** FAQ index WebPage. */
export function getMarketingFaqWebPageSchema(args: {
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "WebPage",
    "@id": SCHEMA_FAQ_WEBPAGE_ID,
    url: `${SCHEMA_BASE_URL}/faq`,
    name: args.name,
    description: args.description,
    isPartOf: { "@id": SCHEMA_WEBSITE_ID },
    about: { "@id": SCHEMA_SOFTWARE_ID },
  };
}

/**
 * Contact page — `mainEntity` points at the canonical Organization (`#organization`),
 * whose `contactPoint.url` is this page (see `getOrganizationSchema`).
 */
export function getMarketingContactPageSchema(args: {
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "ContactPage",
    "@id": SCHEMA_CONTACT_PAGE_ID,
    url: `${SCHEMA_BASE_URL}/contact`,
    name: args.name,
    description: args.description,
    isPartOf: { "@id": SCHEMA_WEBSITE_ID },
    mainEntity: { "@id": SCHEMA_ORGANIZATION_ID },
  };
}

/** Matches the “Three Steps From Raw Files to Finished Delivery” section on the homepage. */
export function getDeliverAudioGuestBookHowToSchema(): Record<string, unknown> {
  return {
    "@type": "HowTo",
    name: "How to Deliver Audio Guest Book Recordings to Clients",
    description:
      "Three steps from raw audio files to a finished, branded client delivery.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Upload Your Recordings",
        text: "Drag and drop audio files or zip archives. We handle the unpacking, organizing, and conversion automatically.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Customize the Experience",
        text: "Add your branding, set a retention period, and optionally protect the page with a password.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Send the Link",
        text: "Your client gets a beautiful, branded page they can play and download from any device.",
      },
    ],
  };
}
