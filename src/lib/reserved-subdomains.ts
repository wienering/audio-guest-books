/**
 * Subdomains that cannot be used as company slugs.
 */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "email",
  "blog",
  "help",
  "support",
  "docs",
  "status",
  "dashboard",
  "auth",
  "login",
  "signup",
  "static",
  "assets",
  "cdn",
  "media",
  "files",
]);

export function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.has(sub.toLowerCase());
}
