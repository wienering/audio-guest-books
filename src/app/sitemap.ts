import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://audioguestbooks.ca";

/** Marketing site only — no app subdomain, dashboard, or auth routes. */
const MARKETING_PAGES: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
  /** Override when you ship content updates; defaults to route generation time. */
  lastModified?: Date;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.35 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.35 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();
  return MARKETING_PAGES.map(
    ({ path, changeFrequency, priority, lastModified }) => ({
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      lastModified: lastModified ?? generatedAt,
      changeFrequency,
      priority,
    }),
  );
}
