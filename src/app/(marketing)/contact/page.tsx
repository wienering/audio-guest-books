import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Audio Guest Books team. We typically respond within 24 hours on business days.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — Audio Guest Books",
    description:
      "Questions, feedback, or just saying hi? Email us at support@audioguestbooks.ca.",
    type: "website",
    url: "/contact",
    siteName: "Audio Guest Books",
  },
  twitter: {
    card: "summary",
    title: "Contact Us — Audio Guest Books",
    description: "Email us at support@audioguestbooks.ca.",
  },
};

export default function ContactPage() {
  return (
    <div className="bg-marketing-bg">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-marketing-accent-soft/40 to-transparent" />
        <div className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-24">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-marketing-accent">
            Contact
          </p>
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-marketing-ink sm:text-5xl">
            Get in Touch
          </h1>
          <p className="text-marketing-muted text-lg leading-relaxed">
            Questions, feedback, or just saying hi? We&rsquo;d love to hear from
            you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <div className="rounded-xl border border-marketing-border bg-marketing-surface p-7 sm:p-9">
          <div className="flex items-start gap-4">
            <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-marketing-accent-soft text-marketing-accent">
              <Mail className="size-5" />
            </div>
            <div className="space-y-2">
              <p className="font-serif text-xl font-light tracking-tight text-marketing-ink">
                Email Support
              </p>
              <p className="text-marketing-muted text-base leading-relaxed">
                The fastest way to reach us is by email. We typically respond
                within 24 hours on business days.
              </p>
              <a
                href="mailto:support@audioguestbooks.ca"
                className="inline-flex items-center gap-2 pt-1 font-medium text-marketing-accent text-base hover:underline"
              >
                support@audioguestbooks.ca
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 px-2 text-marketing-muted text-sm leading-relaxed">
          For privacy questions, write to{" "}
          <a
            href="mailto:privacy@audioguestbooks.ca"
            className="text-marketing-accent hover:underline"
          >
            privacy@audioguestbooks.ca
          </a>
          . For legal or terms-of-service questions, write to{" "}
          <a
            href="mailto:legal@audioguestbooks.ca"
            className="text-marketing-accent hover:underline"
          >
            legal@audioguestbooks.ca
          </a>
          .
        </p>
      </section>
    </div>
  );
}
