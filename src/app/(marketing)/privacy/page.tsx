import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/marketing/legal-page-shell";
import {
  marketingCanonical,
  marketingOpenGraphExtras,
  marketingTwitterExtras,
} from "@/lib/marketing-seo-defaults";

const LAST_UPDATED = "April 30, 2026";

const PRIVACY_PAGE_TITLE = "Privacy Policy";
const PRIVACY_OG_TITLE = "Privacy Policy — Audio Guest Books";
/** ~152 chars */
const PRIVACY_PAGE_DESCRIPTION =
  "How Audio Guest Books collects, uses, stores, and protects your data — including audio files in encrypted object storage, account security, analytics, retention, and your privacy rights.";

export const metadata: Metadata = {
  title: PRIVACY_PAGE_TITLE,
  description: PRIVACY_PAGE_DESCRIPTION,
  alternates: { canonical: marketingCanonical("/privacy") },
  openGraph: marketingOpenGraphExtras({
    title: PRIVACY_OG_TITLE,
    description: PRIVACY_PAGE_DESCRIPTION,
    pathname: "/privacy",
  }),
  twitter: marketingTwitterExtras({
    title: PRIVACY_OG_TITLE,
    description: PRIVACY_PAGE_DESCRIPTION,
  }),
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong className="text-marketing-ink">v1 boilerplate notice.</strong>{" "}
          This privacy policy was last updated on {LAST_UPDATED}. It is provided
          as a reasonable starting point for a small SaaS product and is not
          legal advice. We recommend consulting with a lawyer to customize this
          policy for your specific situation.
        </>
      }
    >
      <section>
        <h2>1. Who We Are</h2>
        <p>
          Audio Guest Books (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
          is a hosted platform that helps photo booth and event companies
          (&ldquo;customers&rdquo;) deliver audio guest book recordings to their
          clients. This privacy policy describes how we handle personal data for
          customers, their team members, and the visitors of client pages they
          publish.
        </p>
        <p>
          Audio Guest Books is operated from Ontario, Canada. You can reach us
          at{" "}
          <a href="mailto:privacy@audioguestbooks.ca">
            privacy@audioguestbooks.ca
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>

        <h3>2.1 Account information</h3>
        <p>
          When you sign up, we collect your name, email address, and the company
          information you choose to provide (company name, slug used as a
          subdomain). Authentication is handled through Clerk, which may also
          process information needed to verify your identity (such as a hashed
          password or a one-time code).
        </p>

        <h3>2.2 Audio files and event content</h3>
        <p>
          You upload audio files (and optionally branding assets like a logo and
          cover image) to events you create. These files are stored in
          encrypted object storage and treated as your content. Client page
          metadata such as event names, client names, and event dates is stored
          alongside the files.
        </p>

        <h3>2.3 Analytics and diagnostic data</h3>
        <p>
          When a guest visits a client page you publish, we record minimal
          analytics events such as page view, audio play, audio download, and
          bulk-zip download. We collect a hashed IP, a coarse user-agent string,
          and the referrer for these events to help you understand engagement.
          We do not place third-party tracking pixels and we do not sell or
          share these analytics with advertisers.
        </p>

        <h3>2.4 Billing information</h3>
        <p>
          Paid subscriptions are processed by Stripe. When you upgrade, Stripe
          collects your payment information directly. We never see or store
          full credit card numbers; we only receive a customer ID, a
          subscription ID, the current plan and status, and the period end
          date.
        </p>

        <h3>2.5 Support and email correspondence</h3>
        <p>
          When you email us or receive transactional emails (such as billing
          receipts or retention reminders), we keep a record of the
          correspondence so we can support you and audit our communications.
        </p>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <ul>
          <li>To provide the service: storing your files, serving client pages, processing uploads and downloads.</li>
          <li>To send transactional emails: account events, billing notifications, retention reminders, and replies to support requests.</li>
          <li>To prevent abuse: investigating suspected violations of our Terms of Service and securing the platform.</li>
          <li>To improve the product: understanding aggregate usage patterns so we can make better features.</li>
        </ul>
      </section>

      <section>
        <h2>4. Service Providers We Share Data With</h2>
        <p>
          We use a small number of trusted vendors to operate Audio Guest Books.
          We share only the information each vendor needs to perform its role:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing and subscription
            management.
          </li>
          <li>
            <strong>Clerk</strong> — user authentication and session
            management.
          </li>
          <li>
            <strong>Resend</strong> — sending transactional emails.
          </li>
          <li>
            <strong>Cloudflare R2</strong> — encrypted object storage for audio
            files and branding assets.
          </li>
          <li>
            <strong>Neon</strong> — managed PostgreSQL database for application
            data.
          </li>
          <li>
            <strong>Railway</strong> — application hosting.
          </li>
        </ul>
        <p>
          We do not sell personal data to third parties. We do not share your
          data with advertisers.
        </p>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          Audio files follow the retention period configured by the event owner
          based on their plan (6 months on Free, 18 months on Pro, 24 months on
          Ultimate by default). Owners can extend retention or delete files
          earlier from their dashboard.
        </p>
        <p>
          When a customer cancels and downgrades, existing files keep their
          retention windows; new events follow the new plan&rsquo;s limits.
        </p>
        <p>
          When an account is deleted, we soft-delete it for 30 days to allow
          recovery, then permanently purge the company, its events, files,
          uploaded branding assets, and identifying audit log entries on or
          after the scheduled hard-delete date.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>
          You can access most of your data directly from your dashboard:
          uploaded files, event details, branding assets, billing status, and
          recent billing audit history. You can export files by downloading them
          (individually or as zip bundles).
        </p>
        <p>
          You can delete files, events, or your entire workspace at any time. If
          you would like a copy of your account data in a portable format, or
          if you would like us to delete data on your behalf, write to{" "}
          <a href="mailto:privacy@audioguestbooks.ca">
            privacy@audioguestbooks.ca
          </a>{" "}
          and we will respond as quickly as we reasonably can.
        </p>
      </section>

      <section>
        <h2>7. Cookies and Local Storage</h2>
        <p>
          We use cookies only for what the product needs to function:
        </p>
        <ul>
          <li>
            <strong>Authentication.</strong> Clerk sets a session cookie when
            you sign in to the dashboard.
          </li>
          <li>
            <strong>Client page unlock sessions.</strong> When a guest unlocks a
            password-protected client page, we set a cookie scoped to that event
            so they don&rsquo;t have to re-enter the password for up to 7 days.
          </li>
        </ul>
        <p>
          We do not use third-party advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Audio files are stored in encrypted object storage and served via
          signed, time-limited URLs. Access to your dashboard is protected by
          Clerk authentication. We follow reasonable technical and
          organizational measures to protect personal data, but no system is
          perfectly secure — please use a strong, unique password and email us
          right away if you suspect your account has been compromised.
        </p>
      </section>

      <section>
        <h2>9. International Transfers</h2>
        <p>
          Our infrastructure is operated by service providers based primarily in
          Canada and the United States. By using Audio Guest Books, you
          understand that your information may be processed in jurisdictions
          outside your country of residence.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          Audio Guest Books is intended for business use by adults. We do not
          knowingly collect personal information from children under 13. If you
          believe a child has provided us with personal information, contact us
          and we will delete it.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. When we make material
          changes, we will update the &ldquo;Last updated&rdquo; date at the top
          of this page and, where required, notify customers by email.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          For privacy-related questions or requests, write to{" "}
          <a href="mailto:privacy@audioguestbooks.ca">
            privacy@audioguestbooks.ca
          </a>
          . For general support, see our{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
