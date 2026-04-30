"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type FaqItem = {
  q: string;
  a: ReactNode;
};

export function FaqAccordion({ items }: { items: ReadonlyArray<FaqItem> }) {
  return (
    <Accordion.Root className="divide-y divide-marketing-border overflow-hidden rounded-xl border border-marketing-border bg-marketing-surface">
      {items.map((item, i) => (
        <Accordion.Item key={`${i}-${item.q}`}>
          <Accordion.Header className="m-0">
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-marketing-ink outline-none transition-colors hover:bg-marketing-bg/60 focus-visible:bg-marketing-bg/60">
              <span className="font-medium text-base">{item.q}</span>
              <ChevronDown className="size-4 shrink-0 text-marketing-muted transition-transform duration-200 group-data-[panel-open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden text-marketing-muted text-base leading-relaxed transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div className="px-6 pb-5">{item.a}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
