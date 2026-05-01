/**
 * Destination for internal alerts (e.g. new signup).
 * Lookup order: optional PLATFORM_ADMIN_EMAIL override, then RESEND_REPLY_TO
 * (the monitored reply inbox).
 */
export function getPlatformAdminEmail(): string | null {
  const override = process.env.PLATFORM_ADMIN_EMAIL?.trim();
  if (override) return override;

  const replyTo = process.env.RESEND_REPLY_TO?.trim();
  if (replyTo) return replyTo;

  console.warn(
    "[platform-admin-email] PLATFORM_ADMIN_EMAIL and RESEND_REPLY_TO are unset; skipping admin notification recipient"
  );
  return null;
}
