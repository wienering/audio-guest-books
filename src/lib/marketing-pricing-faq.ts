/** Source of truth for the pricing page FAQ accordion + FAQPage JSON-LD. */

export type MarketingPricingFaqItem = { q: string; a: string };

export const MARKETING_PRICING_FAQ: ReadonlyArray<MarketingPricingFaqItem> = [
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
];
