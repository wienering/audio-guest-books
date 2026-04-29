import { RESERVED_SUBDOMAINS } from "@/lib/reserved-subdomains";

/**
 * Host-based routing for audioguestbooks.ca.
 * - Apex + www: marketing
 * - app: company dashboard (Clerk)
 * - other non-reserved subdomain: retail tenant (slug)
 */
export type HostContext = {
  hostname: string;
  isLocalDev: boolean;
  isAppHost: boolean;
  isMarketingHost: boolean;
  isTenantHost: boolean;
  tenantSubdomain: string | null;
  isReservedTenant: boolean;
};

/**
 * Split the Host header into hostname and optional port (handles `[::1]:3000`).
 */
export function splitHostAndPort(hostHeader: string): {
  hostname: string;
  port?: string;
} {
  const raw = hostHeader.trim();
  if (!raw) {
    return { hostname: "" };
  }
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end === -1) {
      return { hostname: raw.toLowerCase() };
    }
    const host = raw.slice(0, end + 1);
    if (raw[end + 1] === ":") {
      const port = raw.slice(end + 2);
      if (/^\d+$/.test(port)) {
        return { hostname: host.toLowerCase(), port };
      }
    }
    return { hostname: host.toLowerCase() };
  }
  const colon = raw.lastIndexOf(":");
  if (colon !== -1) {
    const possiblePort = raw.slice(colon + 1);
    if (/^\d+$/.test(possiblePort)) {
      return {
        hostname: raw.slice(0, colon).toLowerCase(),
        port: possiblePort,
      };
    }
  }
  return { hostname: raw.toLowerCase() };
}

/**
 * Clerk app origin for redirects and links: http://app.localhost:PORT in local dev
 * (port from Host when present), https://app.{rootDomain} in production.
 */
export function buildAppOriginFromHostHeader(
  hostHeader: string | null | undefined,
  rootDomain: string
): string {
  const root = rootDomain.toLowerCase();
  const header = hostHeader?.trim() ?? "";
  if (!header) {
    return `https://app.${root}`;
  }

  const { hostname, port } = splitHostAndPort(header);
  const hostCtx = parseHostContext(hostname, root);
  const portSuffix = port ? `:${port}` : "";

  if (hostCtx.isLocalDev) {
    return `http://app.localhost${portSuffix}`;
  }

  if (port && port !== "443") {
    return `https://app.${root}${portSuffix}`;
  }
  return `https://app.${root}`;
}

function stripPort(host: string): string {
  return splitHostAndPort(host).hostname;
}

export function parseHostContext(
  hostname: string,
  rootDomain: string
): HostContext {
  const clean = stripPort(hostname);
  const root = rootDomain.toLowerCase();

  if (clean === "localhost" || clean === "127.0.0.1") {
    return {
      hostname: clean,
      isLocalDev: true,
      isAppHost: true,
      isMarketingHost: true,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  if (clean === "app.localhost") {
    return {
      hostname: clean,
      isLocalDev: true,
      isAppHost: true,
      isMarketingHost: false,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  if (clean.endsWith(".localhost")) {
    const sub = clean.slice(0, -".localhost".length);
    if (!sub) {
      return {
        hostname: clean,
        isLocalDev: true,
        isAppHost: false,
        isMarketingHost: true,
        isTenantHost: false,
        tenantSubdomain: null,
        isReservedTenant: false,
      };
    }
    if (sub === "app") {
      return {
        hostname: clean,
        isLocalDev: true,
        isAppHost: true,
        isMarketingHost: false,
        isTenantHost: false,
        tenantSubdomain: null,
        isReservedTenant: false,
      };
    }
    const reservedLoc = RESERVED_SUBDOMAINS.has(sub.toLowerCase());
    if (reservedLoc) {
      return {
        hostname: clean,
        isLocalDev: true,
        isAppHost: false,
        isMarketingHost: false,
        isTenantHost: true,
        tenantSubdomain: sub,
        isReservedTenant: true,
      };
    }
    return {
      hostname: clean,
      isLocalDev: true,
      isAppHost: false,
      isMarketingHost: false,
      isTenantHost: true,
      tenantSubdomain: sub,
      isReservedTenant: false,
    };
  }

  if (clean === root || clean === `www.${root}`) {
    return {
      hostname: clean,
      isLocalDev: false,
      isAppHost: false,
      isMarketingHost: true,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  const suffix = `.${root}`;
  if (!clean.endsWith(suffix)) {
    return {
      hostname: clean,
      isLocalDev: false,
      isAppHost: false,
      isMarketingHost: false,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  const sub = clean.slice(0, -suffix.length);
  if (!sub) {
    return {
      hostname: clean,
      isLocalDev: false,
      isAppHost: false,
      isMarketingHost: true,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  if (sub === "app") {
    return {
      hostname: clean,
      isLocalDev: false,
      isAppHost: true,
      isMarketingHost: false,
      isTenantHost: false,
      tenantSubdomain: null,
      isReservedTenant: false,
    };
  }

  const reserved = RESERVED_SUBDOMAINS.has(sub.toLowerCase());

  if (reserved) {
    return {
      hostname: clean,
      isLocalDev: false,
      isAppHost: false,
      isMarketingHost: false,
      isTenantHost: true,
      tenantSubdomain: sub,
      isReservedTenant: true,
    };
  }

  return {
    hostname: clean,
    isLocalDev: false,
    isAppHost: false,
    isMarketingHost: false,
    isTenantHost: true,
    tenantSubdomain: sub,
    isReservedTenant: false,
  };
}
