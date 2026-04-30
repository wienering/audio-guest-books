import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/marketing/legal-page-shell";

const LAST_UPDATED = "April 30, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Audio Guest Books, including acceptable use, billing, cancellation, liability, and termination.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — Audio Guest Books",
    description:
      "The terms governing your use of Audio Guest Books.",
    type: "website",
    url: "/terms",
    siteName: "Audio Guest Books",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service — Audio Guest Books",
    description: "The terms governing your use of Audio Guest Books.",
  },
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong className="text-marketing-ink">v1 boilerplate notice.</strong>{" "}
          These terms were last updated on {LAST_UPDATED}. They are provided as
          a reasonable starting point for a small SaaS product and are not
          legal advice. We recommend consulting with a lawyer to customize
          these terms for your specific situation.
        </>
      }
    >
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an Audio Guest Books account or using the service, you
          agree to these Terms of Service (the &ldquo;Terms&rdquo;) and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you are using the
          service on behalf of a company, you represent that you have authority
          to bind that company to these Terms.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          Audio Guest Books (the &ldquo;Service&rdquo;) is a hosted platform
          that lets photo booth and event companies upload audio recordings,
          customize a branded retail page, and share that page with their
          clients. We may add, change, or remove features over time at our
          discretion.
        </p>
      </section>

      <section>
        <h2>3. Accounts and Account Responsibility</h2>
        <p>
          You are responsible for the accuracy of the information you provide
          and for safeguarding your password. You are responsible for all
          activity that happens under your account. Notify us promptly if you
          suspect unauthorized access. We may suspend accounts to protect the
          Service or other customers.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Upload, store, or distribute illegal content of any kind.</li>
          <li>Infringe the copyright, trademark, or privacy rights of others.</li>
          <li>Distribute malware, viruses, or any code that could harm our infrastructure or other users.</li>
          <li>Attempt to gain unauthorized access to other accounts or to systems we operate.</li>
          <li>Send unsolicited commercial messages or use the Service for spam.</li>
          <li>Resell, sublicense, or rebrand the Service in a way that is misleading about its origin.</li>
        </ul>
        <p>
          We reserve the right to investigate suspected violations and to remove
          content or suspend accounts that violate these Terms.
        </p>
      </section>

      <section>
        <h2>5. Your Content</h2>
        <p>
          You retain ownership of audio files, branding assets, and event
          metadata you upload (&ldquo;Your Content&rdquo;). You grant us a
          limited license to host, process, and display Your Content as needed
          to operate the Service for you and your clients (for example,
          serving the retail page, transcoding audio, generating zip bundles).
        </p>
        <p>
          You are responsible for having the rights necessary to upload and
          share Your Content, including permission from people whose voices
          appear in recordings.
        </p>
      </section>

      <section>
        <h2>6. Subscriptions, Billing, and Cancellation</h2>
        <h3>6.1 Plans and pricing</h3>
        <p>
          The current plans and prices are listed on our{" "}
          <Link href="/pricing">pricing page</Link>. Pricing for paid plans is
          stated in U.S. dollars unless otherwise noted.
        </p>

        <h3>6.2 Billing</h3>
        <p>
          Paid plans are billed monthly through Stripe and renew automatically
          on the same day each period. Founding member pricing, when offered,
          is locked to the rate in effect at the time of upgrade and remains in
          effect for as long as the subscription stays active.
        </p>

        <h3>6.3 Cancellation</h3>
        <p>
          You can cancel a paid subscription at any time from the Stripe
          billing portal accessible in your dashboard. Cancellations take
          effect at the end of the current billing period — you keep paid
          access until then, and we do not charge for the next period.
        </p>

        <h3>6.4 Refunds</h3>
        <p>
          Because cancellations stop the next charge and you keep access
          through the period you have already paid for, we do not generally
          issue mid-period refunds. If you have a billing issue, contact us
          and we will try to make it right.
        </p>

        <h3>6.5 Price changes</h3>
        <p>
          We may change prices for new subscriptions at any time. For existing
          subscriptions, we will give reasonable advance notice before any
          price increase takes effect at your next renewal. Founding member
          pricing, when in effect for your subscription, is exempt from price
          increases.
        </p>
      </section>

      <section>
        <h2>7. Service Availability</h2>
        <p>
          We aim for high availability but do not offer a service-level
          agreement (SLA) at this stage of the Service. The Service is provided
          on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We
          may schedule maintenance, deploy updates, or experience outages from
          time to time.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, we disclaim all warranties,
          express or implied, including warranties of merchantability, fitness
          for a particular purpose, and non-infringement. We do not warrant
          that the Service will be uninterrupted, secure, or error-free, or
          that defects will be corrected.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, our aggregate liability
          arising out of or relating to these Terms or the Service will not
          exceed the greater of (a) the amount you paid us in the twelve months
          before the event giving rise to the claim, or (b) one hundred U.S.
          dollars. We will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of profits,
          revenue, data, or goodwill.
        </p>
      </section>

      <section>
        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify and hold us harmless from any third-party
          claim arising out of Your Content, your violation of these Terms, or
          your misuse of the Service.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          You may stop using the Service at any time and delete your account
          from your dashboard. We may suspend or terminate your account if you
          violate these Terms or if your use of the Service creates a risk to
          us, other users, or third parties. On termination, your data is
          handled as described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>12. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. When we make material
          changes, we will update the &ldquo;Last updated&rdquo; date at the
          top of this page and, where required, notify customers by email. Your
          continued use of the Service after changes take effect means you
          accept the updated Terms.
        </p>
      </section>

      <section>
        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Province of Ontario,
          Canada, and the federal laws of Canada applicable there, without
          regard to conflict-of-laws principles. Any dispute arising out of or
          relating to these Terms or the Service will be brought exclusively in
          the courts located in Ontario, Canada, and you consent to the
          jurisdiction of those courts.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          For questions about these Terms, write to{" "}
          <a href="mailto:legal@audioguestbooks.ca">
            legal@audioguestbooks.ca
          </a>
          . For general support, see our{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
