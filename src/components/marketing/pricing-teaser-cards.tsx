import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type PricingPlanSummary = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: ReadonlyArray<string>;
  cta: { label: string; target: "signup" };
  highlighted?: boolean;
  badge?: string;
};

export function PricingTeaserCards({
  plans,
  signupHref,
  className,
}: {
  plans: ReadonlyArray<PricingPlanSummary>;
  signupHref: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex flex-col rounded-xl border bg-marketing-surface p-7",
            plan.highlighted
              ? "border-marketing-accent/50 shadow-[0_8px_30px_-15px_rgba(201,169,110,0.4)]"
              : "border-marketing-border"
          )}
        >
          {plan.badge ? (
            <span className="absolute -top-3 left-7 rounded-full bg-marketing-accent px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-marketing-accent-foreground uppercase">
              {plan.badge}
            </span>
          ) : null}

          <div className="space-y-1">
            <p className="font-serif text-xl font-light tracking-tight text-marketing-ink">
              {plan.name}
            </p>
            <p className="text-marketing-muted text-sm">{plan.blurb}</p>
          </div>

          <div className="mt-6 flex items-baseline gap-1">
            <span className="font-serif text-4xl font-light text-marketing-ink">
              {plan.price}
            </span>
            <span className="text-marketing-muted text-sm">{plan.cadence}</span>
          </div>

          <ul className="mt-6 space-y-2.5 text-sm">
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
            href={signupHref}
            className={cn(
              "mt-8 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold tracking-tight transition-opacity",
              plan.highlighted
                ? "bg-marketing-ink text-marketing-bg hover:opacity-90"
                : "border border-marketing-border bg-marketing-surface text-marketing-ink hover:border-marketing-ink/30"
            )}
          >
            {plan.cta.label}
          </a>
        </div>
      ))}
    </div>
  );
}
