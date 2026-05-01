import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brush,
  Clock,
  EyeOff,
  Send,
  Share2,
} from "lucide-react";

import {
  PricingTeaserCards,
  type PricingPlanSummary,
} from "@/components/marketing/pricing-teaser-cards";

const HOME_PRICING_TEASER: ReadonlyArray<PricingPlanSummary> = [
  {
    name: "Free",
    price: "$0",
    cadence: "/ month",
    blurb: "For your very first event.",
    features: [
      "1 active event",
      "10 files per event",
      "6 months retention",
    ],
    cta: { label: "Start Free", target: "signup" },
  },
  {
    name: "Pro",
    price: "Free",
    cadence: "during launch",
    blurb: "For growing photo and event studios.",
    features: [
      "10 active events",
      "100 files per event",
      "Custom branding",
      "Client page analytics",
    ],
    cta: { label: "Get Pro Free", target: "signup" },
    highlighted: true,
  },
  {
    name: "Ultimate",
    price: "$5",
    cadence: "/ month",
    blurb: "Everything, unlimited.",
    features: [
      "Unlimited events and files",
      "WAV → MP3 transcoding",
      "Drag-to-reorder, custom emails",
      "“Powered by” footer removed",
    ],
    cta: { label: "Upgrade to Ultimate", target: "signup" },
  },
];

export function MarketingHome({ appUrl }: { appUrl: string }) {
  const signupHref = `${appUrl}/sign-up`;

  return (
    <>
      <Hero signupHref={signupHref} />
      <Problem />
      <Solution />
      <HowItWorks />
      <PricingTeaser signupHref={signupHref} />
      <FinalCta signupHref={signupHref} />
    </>
  );
}

function Hero({ signupHref }: { signupHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 -top-40 -z-10 h-96 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
      <div className="mx-auto max-w-5xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 sm:pb-32">
        <div className="space-y-6 text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            Audio Guest Books
          </p>
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-marketing-ink sm:text-5xl md:text-6xl">
            Deliver Audio Guest Books the Professional Way
          </h1>
          <p className="mx-auto max-w-2xl text-marketing-muted text-lg leading-relaxed sm:text-xl">
            Turn recordings into a polished client experience your couples
            will love. Branded delivery pages, automatic file processing, and
            analytics that show you exactly how your work lands.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <a
              href={signupHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-marketing-ink px-7 text-base font-semibold tracking-tight text-marketing-bg transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start Your Free Trial
              <ArrowRight className="size-4" />
            </a>
            <Link
              href="/pricing"
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-marketing-border bg-marketing-surface px-7 text-base font-medium text-marketing-ink transition-colors hover:border-marketing-ink/30 sm:w-auto"
            >
              See Pricing
            </Link>
          </div>
          <p className="text-marketing-muted text-xs">
            No credit card required. Free forever for your first event.
          </p>
        </div>
      </div>
    </section>
  );
}

const PAIN_POINTS = [
  {
    icon: Share2,
    title: "Sending Dropbox Links That Look Unprofessional",
    body: "Generic file-share URLs feel cheap. Your couples paid for a premium experience — the delivery should match.",
  },
  {
    icon: Clock,
    title: "Spending Hours on Manual File Delivery",
    body: "Renaming files, zipping folders, writing emails. Time you'd rather spend on your craft, not on logistics.",
  },
  {
    icon: EyeOff,
    title: "No Idea If Clients Actually Got the Recordings",
    body: "Did they download? Did they share with family? Without analytics you're flying blind after handoff.",
  },
] as const;

function Problem() {
  return (
    <section className="border-y border-marketing-border bg-marketing-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            The Problem
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-marketing-ink sm:text-4xl">
            Tired of Patching Together File Delivery After Every Event?
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {PAIN_POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <div className="inline-flex size-11 items-center justify-center rounded-md bg-marketing-accent-soft text-marketing-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="font-serif text-xl font-light tracking-tight text-marketing-ink">
                {title}
              </h3>
              <p className="text-marketing-muted text-base leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOLUTIONS = [
  {
    icon: Brush,
    title: "Branded Delivery Pages",
    body: "Custom colors, logo, and cover image. Your brand stays front and center on every guest book your clients see.",
  },
  {
    icon: Send,
    title: "One-Click File Delivery",
    body: "Upload, hit send. Clients get a professional, polished page in seconds — playable from any device, anywhere.",
  },
  {
    icon: BarChart3,
    title: "Real Analytics",
    body: "See plays, downloads, and page views. Know exactly when clients engage with the work you delivered.",
  },
] as const;

function Solution() {
  return (
    <section className="bg-marketing-bg">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            The Solution
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-marketing-ink sm:text-4xl">
            Audio Guest Books Does This for You
          </h2>
          <p className="text-marketing-muted text-base leading-relaxed">
            One workspace for uploading, branding, sending, and tracking every
            event you deliver.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {SOLUTIONS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-marketing-border bg-marketing-surface p-7 shadow-[0_1px_0_rgba(26,26,26,0.05)]"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-md bg-marketing-accent-soft text-marketing-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-light tracking-tight text-marketing-ink">
                {title}
              </h3>
              <p className="mt-2 text-marketing-muted text-base leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Upload Your Recordings",
    body: "Drag and drop audio files or zip archives. We handle the unpacking, organizing, and conversion automatically.",
  },
  {
    title: "Customize the Experience",
    body: "Add your branding, set a retention period, and optionally protect the page with a password.",
  },
  {
    title: "Send the Link",
    body: "Your client gets a beautiful, branded page they can play and download from any device.",
  },
] as const;

function HowItWorks() {
  return (
    <section className="border-y border-marketing-border bg-marketing-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            How It Works
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-marketing-ink sm:text-4xl">
            Three Steps From Raw Files to Finished Delivery
          </h2>
        </div>
        <ol className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-marketing-accent/30 bg-marketing-accent-soft font-serif text-base text-marketing-accent">
                {i + 1}
              </span>
              <h3 className="font-serif text-xl font-light tracking-tight text-marketing-ink">
                {step.title}
              </h3>
              <p className="text-marketing-muted text-base leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PricingTeaser({ signupHref }: { signupHref: string }) {
  return (
    <section className="bg-marketing-bg">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            Pricing
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-marketing-ink sm:text-4xl">
            Start Free. Upgrade When You&rsquo;re Ready.
          </h2>
        </div>
        <PricingTeaserCards
          plans={HOME_PRICING_TEASER}
          signupHref={signupHref}
          className="mt-12"
        />
        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-marketing-accent text-sm font-medium hover:underline"
          >
            See full pricing details
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ signupHref }: { signupHref: string }) {
  return (
    <section className="bg-marketing-surface">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="font-serif text-3xl font-light tracking-tight text-marketing-ink sm:text-4xl">
          Ready to Deliver Audio Guest Books the Right Way?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-marketing-muted text-lg leading-relaxed">
          Join photo booth and event companies already using Audio Guest Books
          to deliver a professional client experience.
        </p>
        <a
          href={signupHref}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-marketing-ink px-8 text-base font-semibold tracking-tight text-marketing-bg transition-opacity hover:opacity-90"
        >
          Start Your Free Trial
          <ArrowRight className="size-4" />
        </a>
      </div>
    </section>
  );
}
