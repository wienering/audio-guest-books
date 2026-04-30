import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type PricingPlan = {
  id: "free" | "pro" | "ultimate";
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: ReadonlyArray<string>;
  cta: { label: string; href: string };
  badge?: string;
  note?: string;
  highlighted?: boolean;
};

export function PricingPlanCards({
  plans,
  className,
}: {
  plans: ReadonlyArray<PricingPlan>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {plans.map((plan) => (
        <div key={plan.id} className="flex flex-col gap-3">
          <div
            className={cn(
              "relative flex flex-1 flex-col rounded-xl border bg-marketing-surface p-7",
              plan.highlighted
                ? "border-marketing-accent/60 shadow-[0_8px_30px_-15px_rgba(13,148,136,0.5)]"
                : "border-marketing-border"
            )}
          >
            {plan.badge ? (
              <span className="absolute -top-3 left-7 rounded-full bg-marketing-accent px-3 py-1 text-marketing-accent-foreground text-[11px] font-medium uppercase tracking-wide">
                {plan.badge}
              </span>
            ) : null}

            <div className="space-y-1">
              <p className="font-serif text-2xl tracking-tight text-marketing-ink">
                {plan.name}
              </p>
              <p className="text-marketing-muted text-sm leading-relaxed">
                {plan.blurb}
              </p>
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-4xl text-marketing-ink">
                {plan.price}
              </span>
              <span className="text-marketing-muted text-sm">{plan.cadence}</span>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-marketing-ink/85"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-marketing-accent" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={plan.cta.href}
              className={cn(
                "mt-8 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-opacity",
                plan.highlighted
                  ? "bg-marketing-accent text-marketing-accent-foreground hover:opacity-90"
                  : "border border-marketing-border bg-marketing-surface text-marketing-ink hover:border-marketing-ink/30"
              )}
            >
              {plan.cta.label}
            </a>
          </div>

          {plan.note ? (
            <p className="px-1 text-marketing-muted text-xs leading-relaxed">
              {plan.note}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
