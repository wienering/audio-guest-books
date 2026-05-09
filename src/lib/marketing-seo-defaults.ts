import type { Metadata } from "next";

import { SCHEMA_BASE_URL } from "@/lib/schema";

export const MARKETING_SITE_NAME = "Audio Guest Books";

/** Shorthand absolute URLs for marketing `alternates.canonical` and Open Graph. */
export const marketingCanonical = (pathname: string) =>
  `${SCHEMA_BASE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

const OG_DIMENSIONS = { width: 1200, height: 630 } as const;

export const MARKETING_DEFAULT_OG_IMAGE: NonNullable<
  Metadata["openGraph"]
>["images"] = [
  {
    url: "/opengraph-image",
    ...OG_DIMENSIONS,
    alt: "Audio Guest Books — Deliver Audio Guest Books the Professional Way",
  },
];

export const MARKETING_DEFAULT_TWITTER_IMAGE: NonNullable<
  Metadata["twitter"]
>["images"] = ["/twitter-image"];

/** Shared Open Graph fields for marketing routes (per-page title/description still required). */
export function marketingOpenGraphExtras(args: {
  title: string;
  description: string;
  pathname: string;
}): NonNullable<Metadata["openGraph"]> {
  return {
    title: args.title,
    description: args.description,
    url: marketingCanonical(args.pathname),
    siteName: MARKETING_SITE_NAME,
    locale: "en_CA",
    type: "website",
    images: MARKETING_DEFAULT_OG_IMAGE,
  };
}

export function marketingTwitterExtras(args: {
  title: string;
  description: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: args.title,
    description: args.description,
    images: MARKETING_DEFAULT_TWITTER_IMAGE,
  };
}
