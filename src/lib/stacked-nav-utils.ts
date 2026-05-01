import { cn } from "@/lib/utils";

/** Section anchor targets for consolidated dashboard stacked nav layouts */
export type DashboardStackedNavSection = {
  id: string;
  label: string;
};

const STACKED_SECTION_SCROLL_MARGIN_CLASS = "scroll-mt-28";

/** Class string for consolidated page section headings (shared by server sections + layouts). */
export function stackedSectionHeadingClassnames(): string {
  return "text-xl font-semibold tracking-tight text-foreground";
}

/** Wrapper class for each stacked `<section>`; matches dashboard header offset for scroll-margin. */
export function stackedSectionClassnames(isFirst: boolean): string {
  return cn(
    STACKED_SECTION_SCROLL_MARGIN_CLASS,
    !isFirst && "border-border border-t",
    !isFirst && "mt-14 pt-14",
    isFirst && "pt-1"
  );
}
