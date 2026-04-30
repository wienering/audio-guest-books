import "server-only";

function rootDomain(): string {
  return (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN ??
    "audioguestbooks.ca"
  );
}

/**
 * Public retail gallery URL for an event (`https://{company}.{root}/{client}`).
 * In development, uses `{company}.localhost` so host routing matches middleware.
 */
export function buildRetailEventPublicUrl(
  companySlug: string,
  retailClientSlug: string
): string {
  const company = encodeURIComponent(companySlug);
  const client = encodeURIComponent(retailClientSlug);
  const root = rootDomain();
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    const port =
      process.env.PORT ??
      process.env.NEXT_PUBLIC_DEV_PORT ??
      "3000";
    return `http://${company}.localhost:${port}/${client}`;
  }

  return `https://${company}.${root}/${client}`;
}
