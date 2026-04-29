import { buildAppOriginFromHostHeader, splitHostAndPort } from "@/lib/host";

function rootFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN ??
    "audioguestbooks.ca"
  );
}

/**
 * Canonical base URL for the company app (dashboard, onboarding, Clerk).
 * Uses NEXT_PUBLIC_APP_URL when set; otherwise derives from the Host header
 * so local dev keeps the port (e.g. http://app.localhost:3000).
 */
export function resolveAppBaseUrl(
  hostHeader: string | null | undefined
): string {
  const direct =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (direct) {
    let base = direct.replace(/\/$/, "");
    const { port } = splitHostAndPort(hostHeader ?? "");
    if (port && /^https?:\/\/app\.localhost$/i.test(base)) {
      base = `${base}:${port}`;
    }
    return base;
  }
  return buildAppOriginFromHostHeader(hostHeader, rootFromEnv());
}

/**
 * Fallback when no request Host is available (e.g. static context).
 */
export function getAppBaseUrl(): string {
  return resolveAppBaseUrl(null);
}
