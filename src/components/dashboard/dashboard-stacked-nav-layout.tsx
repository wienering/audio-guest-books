"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import type { DashboardStackedNavSection } from "@/lib/stacked-nav-utils";

function replaceHistoryHashPreservingSearch(pathnameLocal: string, hashId: string) {
  const qs = typeof window !== "undefined" ? window.location.search : "";
  const path = pathnameLocal || (typeof window !== "undefined" ? window.location.pathname : "");
  window.history.replaceState(null, "", `${path}${qs}#${encodeURIComponent(hashId)}`);
}

function pathnameFromWindowOrProp(pathProp: string) {
  const p =
    pathProp ||
    (typeof window !== "undefined" ? window.location.pathname : "") ||
    "";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

function scrollSectionIntoView(id: string, behavior: ScrollBehavior) {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  el?.scrollIntoView({ behavior, block: "start" });
}

function scrollBehaviorForInitialLanding(): ScrollBehavior {
  /** `instant` Safari support is incomplete; auto == jump without animation */
  return "auto";
}

/** Stacked sidebar + viewport-synced hash UX; `@/lib/stacked-nav-utils` exports section classname helpers safe for Server Components. */
export function DashboardStackedNavLayout(props: {
  sections: readonly DashboardStackedNavSection[];
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState(() => props.sections[0]?.id ?? "");
  const suppressObserverUntilMs = useRef(0);

  const setHashSilent = useCallback(
    (id: string, searchPreserve: URLSearchParams) => {
      const sp = new URLSearchParams(searchPreserve.toString());
      sp.delete("_nav");
      const q = sp.toString();
      const path = pathname || window.location.pathname;
      const qs = q ? `?${q}` : "";
      window.history.replaceState(null, "", `${path}${qs}#${encodeURIComponent(id)}`);
    },
    [pathname]
  );

  /** Initial `_nav`, hash, scroll position */
  useEffect(() => {
    const ids = new Set(props.sections.map((s) => s.id));
    const nav = searchParams.get("_nav");

    if (nav && ids.has(nav)) {
      suppressObserverUntilMs.current = Date.now() + 600;
      setActiveId(nav);
      requestAnimationFrame(() => {
        scrollSectionIntoView(nav, scrollBehaviorForInitialLanding());
        setHashSilent(nav, new URLSearchParams(searchParams.toString()));
      });
      return;
    }

    const rawHash =
      typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const decodedHash = rawHash ? decodeURIComponent(rawHash) : "";
    if (decodedHash && ids.has(decodedHash)) {
      suppressObserverUntilMs.current = Date.now() + 400;
      setActiveId(decodedHash);
      requestAnimationFrame(() =>
        scrollSectionIntoView(decodedHash, scrollBehaviorForInitialLanding())
      );
    }
  }, [pathname, props.sections, searchParams, setHashSilent]);

  /** IntersectionObserver: active sidebar from viewport */
  useEffect(() => {
    const ids = props.sections.map((s) => s.id);

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (Date.now() < suppressObserverUntilMs.current) return;

          const visible = entries
            .filter((e) => e.isIntersecting)
            .map((e) => ({
              id: (e.target as HTMLElement).id,
              ratio: e.intersectionRatio,
              top: e.boundingClientRect.top,
            }))
            .filter((e) => e.id && ids.includes(e.id));

          if (!visible.length) return;

          visible.sort((a, b) => {
            const aNear = Math.abs(Math.min(a.top, 140));
            const bNear = Math.abs(Math.min(b.top, 140));
            if (Math.abs(aNear - bNear) > 48) return aNear - bNear;
            return b.ratio - a.ratio;
          });

          const nextId = visible[0].id;

          setActiveId((curr) => (curr === nextId ? curr : nextId));

          replaceHistoryHashPreservingSearch(
            pathnameFromWindowOrProp(pathname),
            nextId
          );
        });
      },
      {
        root: null,
        rootMargin: "-72px 0px -45% 0px",
        threshold: [0, 0.04, 0.12, 0.28, 0.52, 0.76, 1],
      }
    );

    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname, props.sections]);

  useEffect(() => {
    function onHash() {
      const raw = window.location.hash.replace(/^#/, "");
      const id = raw ? decodeURIComponent(raw) : "";
      if (id && props.sections.some((s) => s.id === id)) {
        setActiveId(id);
      }
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [props.sections]);

  const sidebarLinkClass = (active: boolean) =>
    cn(
      "block rounded-lg px-3 py-2.5 text-sm transition-colors md:w-full md:text-left",
      active
        ? "border-primary bg-primary/10 border-l-[3px] pl-[9px] font-medium text-primary"
        : "border-transparent border-l-[3px] pl-[10px] text-muted-foreground hover:bg-muted/60"
    );

  function onSidebarClick(id: string) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      suppressObserverUntilMs.current = Date.now() + 800;
      setActiveId(id);
      setHashSilent(id, new URLSearchParams(searchParams.toString()));
      scrollSectionIntoView(id, "smooth");
    };
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row md:gap-10">
      {/* Mobile */}
      <div className="md:hidden">
        <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav
            aria-label="On this page"
            className="flex w-max min-w-full gap-1.5"
          >
            {props.sections.map((s) => (
              <Link
                key={s.id}
                href={`#${s.id}`}
                prefetch={false}
                className={cn(
                  sidebarLinkClass(s.id === activeId),
                  "shrink-0 whitespace-nowrap"
                )}
                onClick={onSidebarClick(s.id)}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 md:block">
        <div className="sticky top-[5.75rem] space-y-0.5 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur-sm md:bg-muted/40 md:backdrop-blur-[2px]">
          <nav aria-label="On this page" className="flex flex-col gap-0.5">
            <p className="px-2 pb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              On this page
            </p>
            {props.sections.map((s) => (
              <Link
                key={s.id}
                href={`#${s.id}`}
                prefetch={false}
                className={sidebarLinkClass(s.id === activeId)}
                onClick={onSidebarClick(s.id)}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{props.children}</div>
    </div>
  );
}
