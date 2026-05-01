/**
 * Internal alerts (e.g. new signup). Set in production so ops get notified.
 */
export function getPlatformAdminEmail(): string | null {
  const raw =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() ||
    process.env.SUPER_ADMIN_EMAIL?.trim();
  return raw || null;
}
