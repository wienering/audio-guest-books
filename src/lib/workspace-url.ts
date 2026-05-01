/**
 * Guest-facing tenant URL for emails and share links (uses ROOT_DOMAIN / public env).
 */
function rootHostFromEnv(): string {
  const raw =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN ??
    "audioguestbooks.ca";
  const host =
    raw
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.toLowerCase() ?? "audioguestbooks.ca";
  return host;
}

export function getTenantPublicSiteUrl(companySlug: string): string {
  const slug = companySlug.trim().toLowerCase();
  return `https://${slug}.${rootHostFromEnv()}`;
}
