import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { getMiddlewareDb } from "@/db/middleware";
import { companies } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";
import {
  buildAppOriginFromHostHeader,
  parseHostContext,
  splitHostAndPort,
} from "@/lib/host";

const rootEnv = () => process.env.ROOT_DOMAIN ?? "audioguestbooks.ca";

const isPublicAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const hostHeader = request.headers.get("host") ?? "";
  const { hostname: hostnameOnly } = splitHostAndPort(hostHeader);
  const pathname = request.nextUrl.pathname;
  const root = rootEnv();
  const hostCtx = parseHostContext(hostnameOnly, root);

  /** Marketing apex — send app-auth routes and dashboard to app subdomain */
  if (!hostCtx.isLocalDev && hostCtx.isMarketingHost) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up")
    ) {
      const origin = buildAppOriginFromHostHeader(hostHeader, root);
      const dest = new URL(
        `${pathname}${request.nextUrl.search}`,
        origin
      );
      return NextResponse.redirect(dest);
    }
  }

  const requestHeaders = new Headers(request.headers);

  /** App subdomain — "/" → dashboard (skip localhost/127 dual marketing home) */
  if (
    hostCtx.isAppHost &&
    !(hostCtx.isLocalDev && hostCtx.isMarketingHost) &&
    pathname === "/"
  ) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/dashboard";
    return NextResponse.redirect(dest);
  }

  /** Tenant subdomain */
  if (hostCtx.isTenantHost) {
    if (hostCtx.isReservedTenant || !hostCtx.tenantSubdomain) {
      requestHeaders.set("x-tenant-status", "reserved");
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const mdb = getMiddlewareDb();
    const slug = hostCtx.tenantSubdomain.toLowerCase();

    let companyRow: { id: string; slug: string } | undefined;

    if (mdb && slug) {
      const full = await mdb
        .select()
        .from(companies)
        .where(
          and(eq(companies.slug, slug), isNull(companies.deletedAt))
        )
        .limit(1);

      const company = full[0];
      if (company) {
        companyRow = { id: company.id, slug: company.slug };
      }
    }

    if (!companyRow) {
      requestHeaders.set("x-tenant-status", "not-found");
    } else {
      requestHeaders.set("x-tenant-status", "ok");
      requestHeaders.set("x-company-id", companyRow.id);
      requestHeaders.set("x-company-slug", companyRow.slug);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  /** Clerk protection for dashboard surface (localhost + app host) */
  const appSurface =
    hostCtx.isAppHost || hostCtx.isLocalDev;
  const needsClerkProtection =
    appSurface &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      isAdminRoute(request));

  if (needsClerkProtection && !isPublicAuthRoute(request)) {
    await auth.protect();
  }

  /**
   * /admin/* (and /api/admin/*) are admin-only. Non-admins are redirected to
   * /dashboard rather than 404'd so we don't leak the existence of admin
   * routes. API requests get a 403 instead of a redirect.
   */
  if (appSurface && isAdminRoute(request)) {
    const { userId } = await auth();
    if (!isAdminUser(userId)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      const dest = request.nextUrl.clone();
      dest.pathname = "/dashboard";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
