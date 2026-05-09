import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://audioguestbooks.ca";

/**
 * Paths that should not be indexed (app, auth, APIs). Repeated for listed AI
 * crawlers so a bot-specific rule does not imply “allow everything” without
 * these disallows.
 *
 * To restrict training-only crawlers later, change this file.
 */
const DISALLOW_PRIVATE = [
  "/api/",
  "/dashboard",
  "/dashboard/",
  "/admin",
  "/admin/",
  "/onboarding",
  "/onboarding/",
  "/sign-in",
  "/sign-in/",
  "/sign-up",
  "/sign-up/",
  "/account-scheduled-for-deletion",
  "/impersonate",
  "/impersonate/",
] as const;

const PUBLIC_RULE = {
  userAgent: "*",
  allow: ["/"],
  disallow: [...DISALLOW_PRIVATE],
};

const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Bytespider",
  "Applebot",
  "Applebot-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  const aiRules = AI_CRAWLER_AGENTS.map((userAgent) => ({
    userAgent,
    allow: ["/"],
    disallow: [...DISALLOW_PRIVATE],
  }));

  return {
    rules: [PUBLIC_RULE, ...aiRules],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
