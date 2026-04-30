import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, Check, Minus } from "lucide-react";

import {
  PricingPlanCards,
  type PricingPlan,
} from "@/components/marketing/pricing-plan-cards";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { getFoundingMemberSpotsRemaining } from "@/lib/billing-founding";
import { resolveAppBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Audio Guest Books. Start free, upgrade when you're ready, and lock in $5/month forever as a founding member.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — Audio Guest Books",
    description:
      "Simple, transparent pricing. Start free, upgrade when you're ready.",
    type: "website",
    url: "/pricing",
    siteName: "Audio Guest Books",
  },
  twitter: {
    card: "summary",
    title: "Pricing — Audio Guest Books",
    description:
      "Simple, transparent pricing. Start free, upgrade when you're ready.",
  },
};

export default async function PricingPage() {
  const h = await headers();
  const appUrl = resolveAppBaseUrl(h.get("host"));
  const signupHref = `${appUrl}/sign-up`;
  const foundingSpotsRemaining = await getFoundingMemberSpotsRemaining();
  const showFoundingBadge = foundingSpotsRemaining > 0;

  const plans: ReadonlyArray<PricingPlan> = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      cadence: "/ month",
      blurb: "Perfect for your very first event.",
      features: [
        "1 active event",
        "10 files per event",
        "6 months file retention",
        "“Powered by Audio Guest Books” footer on retail pages",
      ],
      cta: { label: "Start Free", href: signupHref },
    },
    {
      id: "pro",
      name: "Pro",
      price: "Free",
      cadence: "during early launch",
      blurb: "For growing photo and event studios.",
      features: [
        "10 active events at a time",
        "100 files per event",
        "18 months file retention",
        "Custom branding (colors, logo, cover images)",
        "Password-protected retail pages",
        "Retail page analytics",
        "Audit log",
      ],
      cta: { label: "Get Pro Free During Launch", href: signupHref },
      highlighted: true,
      note: "Pro tier is currently invitation-only. Sign up free and we'll grant Pro access during launch.",
    },
    {
      id: "ultimate",
      name: "Ultimate",
      price: "$5",
      cadence: "/ month",
      blurb: "Unlimited everything for full-time studios.",
      features: [
        "Unlimited events",
        "Unlimited files per event",
        "24 months file retention",
        "Audio transcoding (WAV → MP3, automatic)",
        "Drag-and-drop file reordering",
        "Custom email templates",
        "“Powered by” footer removed",
        "Priority support",
      ],
      cta: { label: "Upgrade to Ultimate", href: signupHref },
      badge: showFoundingBadge ? "Founding Member" : undefined,
      note: showFoundingBadge
        ? `Founding member pricing: $5/month forever for the first 5 customers — ${foundingSpotsRemaining} of 5 spots remaining. Upgrade from your dashboard billing settings after signup.`
        : "Upgrade to Ultimate from your dashboard billing settings after signup.",
    },
  ];

  return (
    <div className="bg-marketing-bg">
      <Hero />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <PricingPlanCards plans={plans} />
        {showFoundingBadge ? (
          <p className="mt-10 text-center text-marketing-accent text-sm font-medium">
            {foundingSpotsRemaining} of 5 founding spots remaining
          </p>
        ) : null}
      </section>

      <ComparisonTable />

      <PricingFaq />

      <section className="border-t border-marketing-border bg-marketing-bg">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
          <h2 className="font-serif text-2xl tracking-tight text-marketing-ink sm:text-3xl">
            More Questions?
          </h2>
          <Link
            href="/faq"
            className="inline-flex items-center gap-1 text-marketing-accent text-sm font-medium hover:underline"
          >
            See our full FAQ
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-24">
        <p className="text-marketing-accent text-sm font-medium uppercase tracking-[0.18em]">
          Pricing
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-marketing-ink sm:text-5xl">
          Simple Pricing That Scales With You
        </h1>
        <p className="text-marketing-muted text-lg leading-relaxed">
          Start free. Upgrade when you&rsquo;re ready.
        </p>
      </div>
    </section>
  );
}

type FeatureRow = {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  ultimate: boolean | string;
};

const COMPARISON_ROWS: ReadonlyArray<FeatureRow> = [
  { label: "Active events", free: "1", pro: "10", ultimate: "Unlimited" },
  { label: "Files per event", free: "10", pro: "100", ultimate: "Unlimited" },
  {
    label: "File retention",
    free: "6 months",
    pro: "18 months",
    ultimate: "24 months",
  },
  { label: "Custom branding", free: false, pro: true, ultimate: true },
  { label: "Password protection", free: false, pro: true, ultimate: true },
  { label: "Retail page analytics", free: false, pro: true, ultimate: true },
  { label: "Audit log", free: false, pro: true, ultimate: true },
  { label: "WAV → MP3 transcoding", free: false, pro: false, ultimate: true },
  { label: "Drag-to-reorder files", free: false, pro: false, ultimate: true },
  { label: "Custom email templates", free: false, pro: false, ultimate: true },
  {
    label: "“Powered by” footer removed",
    free: false,
    pro: false,
    ultimate: true,
  },
  { label: "Priority support", free: false, pro: false, ultimate: true },
];

function ComparisonTable() {
  return (
    <section className="border-y border-marketing-border bg-marketing-surface">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="text-marketing-accent text-sm font-medium uppercase tracking-[0.18em]">
            Compare Plans
          </p>
          <h2 className="font-serif text-3xl tracking-tight text-marketing-ink sm:text-4xl">
            Everything Side by Side
          </h2>
        </div>
        <div className="mt-10 overflow-x-auto rounded-xl border border-marketing-border bg-marketing-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-marketing-border bg-marketing-bg/60 text-left">
                <th className="px-6 py-4 font-medium text-marketing-muted text-xs uppercase tracking-wide">
                  Feature
                </th>
                <th className="px-6 py-4 font-serif text-base text-marketing-ink">
                  Free
                </th>
                <th className="px-6 py-4 font-serif text-base text-marketing-ink">
                  Pro
                </th>
                <th className="px-6 py-4 font-serif text-base text-marketing-ink">
                  Ultimate
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-marketing-border last:border-0"
                >
                  <td className="px-6 py-4 text-marketing-ink">{row.label}</td>
                  <ComparisonCell value={row.free} />
                  <ComparisonCell value={row.pro} />
                  <ComparisonCell value={row.ultimate} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <td className="px-6 py-4 text-marketing-ink/85">{value}</td>;
  }
  if (value) {
    return (
      <td className="px-6 py-4">
        <Check className="size-4 text-marketing-accent" />
      </td>
    );
  }
  return (
    <td className="px-6 py-4">
      <Minus className="size-4 text-marketing-muted/60" />
    </td>
  );
}

const PRICING_FAQ = [
  {
    q: "Can I change plans anytime?",
    a: "Yes. You can upgrade to Ultimate from your dashboard billing settings whenever you're ready. Cancellations take effect at the end of your current billing period — you keep Ultimate access until then.",
  },
  {
    q: "What happens to my files if I downgrade?",
    a: "Your files stay safe. If you downgrade, existing events keep their files until each event's retention period ends. New events will follow the limits of your new plan (for example, fewer files per event on Free or Pro).",
  },
  {
    q: "Do you offer annual pricing?",
    a: "Not yet. Audio Guest Books is month-to-month for now so you can cancel anytime without commitment. We may introduce annual pricing later.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We use Stripe to process payments and accept all major credit and debit cards. Your card information is handled by Stripe and never touches our servers.",
  },
  {
    q: "Is there a setup fee?",
    a: "No. There is no setup fee on any plan. You pay only the listed monthly price (which is $0 on Free and Pro during early launch).",
  },
] as const;

function PricingFaq() {
  return (
    <section className="bg-marketing-bg">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="space-y-3 text-center">
          <p className="text-marketing-accent text-sm font-medium uppercase tracking-[0.18em]">
            Pricing FAQ
          </p>
          <h2 className="font-serif text-3xl tracking-tight text-marketing-ink sm:text-4xl">
            Common Pricing Questions
          </h2>
        </div>
        <div className="mt-10">
          <FaqAccordion items={[...PRICING_FAQ]} />
        </div>
      </div>
    </section>
  );
}
