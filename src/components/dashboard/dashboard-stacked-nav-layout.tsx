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

function scrollSectionIntoView(id: string, behavior: ScrollBehavior) {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  el?.scrollIntoView({ behavior, block: "start" });
}

function scrollBehaviorForInitialLanding(): ScrollBehavior {
  /** `instant` Safari support is incomplete; auto == jump without animation */
  return "auto";
}

const OBSERVER_DEBOUNCE_MS = 80;
const PROGRAMMATIC_SCROLL_GUARD_MS = 650;

/** Stacked sidebar + viewport-synced hash UX; `@/lib/stacked-nav-utils` exports section classname helpers safe for Server Components. */
export function DashboardStackedNavLayout(props: {
  sections: readonly DashboardStackedNavSection[];
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState(() => props.sections[0]?.id ?? "");
  const suppressObserverUntilMs = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  /** Cancels stale scroll guards (listener + fallback timeout); does not invoke onSettled. */
  const programmaticCancelRef = useRef<(() => void) | null>(null);

  const intersectionByIdRef = useRef<Map<string, boolean>>(new Map());
  const observerDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cancelProgrammaticScrollGuardsOnly = useCallback(() => {
    programmaticCancelRef.current?.();
    programmaticCancelRef.current = null;
    isProgrammaticScrollRef.current = false;
  }, []);

  const beginProgrammaticScroll = useCallback(
    (onSettled?: () => void) => {
      if (typeof window === "undefined" || typeof document === "undefined") return;

      cancelProgrammaticScrollGuardsOnly();

      const root = document.documentElement;

      let settled = false;
      /** Browser timer id; avoids Node/browser `Timeout`/`number` mismatch in TS. */
      let tid: number | undefined;

      function onScrollEndHandler() {
        finish();
      }

      function cleanupListeners() {
        root.removeEventListener("scrollend", onScrollEndHandler);
        if (tid != null) {
          window.clearTimeout(tid);
          tid = undefined;
        }
      }

      function finish() {
        if (settled) return;
        settled = true;
        cleanupListeners();
        programmaticCancelRef.current = null;
        isProgrammaticScrollRef.current = false;
        onSettled?.();
      }

      programmaticCancelRef.current = () => {
        if (settled) return;
        settled = true;
        cleanupListeners();
        programmaticCancelRef.current = null;
        isProgrammaticScrollRef.current = false;
      };

      isProgrammaticScrollRef.current = true;

      tid = window.setTimeout(finish, PROGRAMMATIC_SCROLL_GUARD_MS);

      root.addEventListener("scrollend", onScrollEndHandler, { passive: true });
    },
    [cancelProgrammaticScrollGuardsOnly]
  );

  useEffect(() => {
    return () => {
      programmaticCancelRef.current?.();
      programmaticCancelRef.current = null;
    };
  }, []);

  /** Initial `_nav`, hash, scroll position */
  useEffect(() => {
    const ids = new Set(props.sections.map((s) => s.id));
    const nav = searchParams.get("_nav");

    if (nav && ids.has(nav)) {
      suppressObserverUntilMs.current = Date.now() + 600;
      setActiveId(nav);
      beginProgrammaticScroll();
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
  }, [pathname, props.sections, searchParams, setHashSilent, beginProgrammaticScroll]);

  /** IntersectionObserver: active sidebar from viewport */
  useEffect(() => {
    const ids = props.sections.map((s) => s.id);
    intersectionByIdRef.current = new Map(ids.map((id) => [id, false]));

    const applyObserverUpdate = () => {
      if (typeof document === "undefined") return;
      if (isProgrammaticScrollRef.current || Date.now() < suppressObserverUntilMs.current)
        return;

      const intersectingIds = ids.filter((id) => intersectionByIdRef.current.get(id) === true);
      if (!intersectingIds.length) return;

      let bestId = intersectingIds[0]!;
      let bestTop = document.getElementById(bestId)?.getBoundingClientRect().top ?? 0;
      for (let i = 1; i < intersectingIds.length; i++) {
        const cid = intersectingIds[i]!;
        const node = document.getElementById(cid);
        const top = node?.getBoundingClientRect().top ?? 0;
        if (top < bestTop) {
          bestTop = top;
          bestId = cid;
        }
      }

      setActiveId((curr) => (curr === bestId ? curr : bestId));
      setHashSilent(bestId, new URLSearchParams(window.location.search));
    };

    let raf = 0;

    const scheduleApply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (observerDebounceTimerRef.current != null) clearTimeout(observerDebounceTimerRef.current);
        observerDebounceTimerRef.current = setTimeout(() => {
          observerDebounceTimerRef.current = null;
          applyObserverUpdate();
        }, OBSERVER_DEBOUNCE_MS);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (id && ids.includes(id)) {
            intersectionByIdRef.current.set(id, entry.isIntersecting);
          }
        }
        scheduleApply();
      },
      {
        root: null,
        rootMargin: "-20% 0px -75% 0px",
        threshold: 0,
      }
    );

    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observerDebounceTimerRef.current != null) {
        clearTimeout(observerDebounceTimerRef.current);
        observerDebounceTimerRef.current = null;
      }
      observer.disconnect();
    };
  }, [pathname, props.sections, setHashSilent]);

  useEffect(() => {
    function onHash() {
      const raw = window.location.hash.replace(/^#/, "");
      const id = raw ? decodeURIComponent(raw) : "";
      if (id && props.sections.some((s) => s.id === id)) {
        suppressObserverUntilMs.current = Date.now() + PROGRAMMATIC_SCROLL_GUARD_MS;
        beginProgrammaticScroll();
        setActiveId(id);
        scrollSectionIntoView(id, "smooth");
      }
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [props.sections, beginProgrammaticScroll]);

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
      suppressObserverUntilMs.current = Date.now() + PROGRAMMATIC_SCROLL_GUARD_MS;
      beginProgrammaticScroll(() => {
        setHashSilent(id, new URLSearchParams(searchParams.toString()));
      });
      setActiveId(id);
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
