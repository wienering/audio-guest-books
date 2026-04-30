export function getClientIpFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return null;
}

export function getClientIpFromRequest(req: Request): string {
  return getClientIpFromHeaders(req.headers) ?? "unknown";
}

export function analyticsContextFromHeaders(h: Headers): {
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
} {
  return {
    ip: getClientIpFromHeaders(h),
    userAgent: truncateUserAgent(h.get("user-agent")),
    referrer: truncateReferrer(h.get("referer")),
  };
}

export function analyticsContextFromRequest(req: Request): {
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
} {
  return {
    ip: getClientIpFromHeaders(req.headers),
    userAgent: truncateUserAgent(req.headers.get("user-agent")),
    referrer: truncateReferrer(req.headers.get("referer")),
  };
}

export function truncateUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const t = ua.trim();
  if (t.length <= 500) return t;
  return t.slice(0, 500);
}

export function truncateReferrer(ref: string | null): string | null {
  if (!ref) return null;
  const t = ref.trim();
  if (t.length <= 2000) return t;
  return t.slice(0, 2000);
}
