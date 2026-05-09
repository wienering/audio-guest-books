import Link from "next/link";
import type { ReactNode } from "react";

import type { FaqSchemaItem } from "@/lib/schema";

export const MARKETING_FAQ_PAGE_TITLE = "Frequently Asked Questions";
/** Matches root layout `title.template` with `%s` = `MARKETING_FAQ_PAGE_TITLE`. */
export const MARKETING_FAQ_PAGE_SCHEMA_NAME =
  "Frequently Asked Questions — Audio Guest Books";
/** ~154 chars — meta, Open Graph, Twitter, and FAQ WebPage JSON-LD. */
export const MARKETING_FAQ_PAGE_DESCRIPTION =
  "Answers about Audio Guest Books: what it is, supported audio and zip uploads, custom branding, password-protected client pages, plans and founding members, retention, and security.";

export type MarketingFaqContentItem = {
  q: string;
  /** Plain text for JSON-LD; must match the meaning of what users see on the page. */
  answer: string;
  /** When set, the accordion renders this instead of `answer` (e.g. inline link). */
  answerRich?: ReactNode;
};

export type MarketingFaqContentSection = {
  title: string;
  items: ReadonlyArray<MarketingFaqContentItem>;
};

export const MARKETING_FAQ_SECTIONS: ReadonlyArray<MarketingFaqContentSection> =
  [
    {
      title: "Getting Started",
      items: [
        {
          q: "What is Audio Guest Books?",
          answer:
            "Audio Guest Books is a hosted platform that helps photo booth and event companies deliver wedding and event audio guest books to their clients. Upload your recordings, customize the branding, and send a single polished link your client can play and download from any device.",
        },
        {
          q: "Who is this for?",
          answer:
            "It's built for photo booth operators, event production companies, and audio engineers who record audio guest books at weddings, parties, and corporate events and want a professional way to hand them off to clients.",
        },
        {
          q: "Do I need an account to listen to a guest book?",
          answer:
            "No. The couple or event host you send the link to does not need an account or login — they just open the link in any browser. Only the operator (you) needs an Audio Guest Books account to upload and manage events.",
        },
        {
          q: "Can I try it free?",
          answer:
            "Yes. The Free plan gives you 1 active event with 10 files and 6 months of retention — no credit card required. You can upgrade later from inside your dashboard.",
        },
      ],
    },
    {
      title: "Files and Uploads",
      items: [
        {
          q: "What audio formats can I upload?",
          answer:
            "We accept common audio formats including MP3, WAV, M4A, AAC, FLAC, and AIFF. You can also upload zip archives that contain audio files — we unpack them automatically.",
        },
        {
          q: "Can I upload zip files?",
          answer:
            "Yes. Drop a zip onto the upload area and we will extract any audio files inside and add them to your event. Folders inside the zip are flattened.",
        },
        {
          q: "What's the max file size?",
          answer:
            "Individual files can be up to 500 MB, which comfortably covers even very long lossless WAV recordings. If you need to upload larger files, get in touch and we'll work it out.",
        },
        {
          q: "What's a “guest visible” file vs. an “original” file?",
          answer:
            "Lossless uploads (WAV, FLAC, AIFF) on the Ultimate plan are automatically transcoded to MP3 for smooth in-browser playback. The MP3 is the “guest visible” file — that's what plays on the client page. The “original” lossless file is preserved and offered as an optional download for guests who want studio quality.",
        },
      ],
    },
    {
      title: "Branding and Customization",
      items: [
        {
          q: "Can I add my logo?",
          answer:
            "Yes, on Pro and Ultimate plans. Upload a logo from your branding settings and it appears at the top of every client page your clients see.",
        },
        {
          q: "Can I customize colors?",
          answer:
            "Yes, on Pro and Ultimate plans. You can set your primary, secondary, accent, and background colors from the branding settings, and we apply them across all of your client pages.",
        },
        {
          q: "Can I password-protect client pages?",
          answer:
            "Yes, on Pro and Ultimate plans. Set an event password from the event settings and your client will be prompted to unlock the page before listening. Unlock sessions last 7 days per browser.",
        },
        {
          q: "Will clients see “Audio Guest Books” branding?",
          answer:
            "On Free and Pro a small “Powered by Audio Guest Books” line appears in the client page footer. The Ultimate plan removes that footer so the page is fully your brand.",
        },
      ],
    },
    {
      title: "Pricing and Billing",
      items: [
        {
          q: "How much does it cost?",
          answer:
            "Free is $0/month forever. Pro is currently free during early launch (invitation-granted after signup). Ultimate is $5/month — and the first 5 customers lock in $5/month forever as founding members. See full pricing on the pricing page.",
          answerRich: (
            <>
              Free is $0/month forever. Pro is currently free during early launch
              (invitation-granted after signup). Ultimate is $5/month — and the
              first 5 customers lock in $5/month forever as founding members. See
              full pricing on the{" "}
              <Link href="/pricing" className="text-marketing-accent hover:underline">
                pricing page
              </Link>
              .
            </>
          ),
        },
        {
          q: "Can I cancel anytime?",
          answer:
            "Yes. Cancellations take effect at the end of your current billing period — you keep Ultimate access until then, and we don't charge for the next period.",
        },
        {
          q: "What's a founding member?",
          answer:
            "The first 5 customers to upgrade to Ultimate become founding members and lock in $5/month for the lifetime of their subscription, even if we raise the regular Ultimate price later.",
        },
        {
          q: "Do you offer refunds?",
          answer:
            "Because cancellations stop the next charge and you keep access through the period you've already paid for, we don't generally issue mid-period refunds. If you have a billing issue, email support and we'll make it right.",
        },
      ],
    },
    {
      title: "Privacy and Retention",
      items: [
        {
          q: "How long are files kept?",
          answer:
            "It depends on your plan: 6 months on Free, 18 months on Pro, and 24 months on Ultimate by default. We send retention reminders before files are deleted so you have time to download or extend.",
        },
        {
          q: "Can I delete files early?",
          answer:
            "Yes. You can delete individual files or entire events from your dashboard at any time. Deleted files are removed from our storage and cannot be recovered.",
        },
        {
          q: "What happens if I cancel my subscription?",
          answer:
            "You drop back to the Free plan. Existing events keep their files until each event's retention period ends, but new events follow the Free plan limits. You can re-upgrade at any time.",
        },
        {
          q: "Is my data secure?",
          answer:
            "All audio files are stored in encrypted object storage (Cloudflare R2) and served only via signed, time-limited URLs. Account access is protected by Clerk authentication. We never share your files or analytics with third parties.",
        },
      ],
    },
  ];

export function marketingFaqSectionsToAccordionItems(
  sections: ReadonlyArray<MarketingFaqContentSection>,
) {
  return sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => ({
      q: item.q,
      a: item.answerRich ?? item.answer,
    })),
  }));
}

/** All FAQ Q&A in page order for `FAQPage` JSON-LD (20 pairs). */
export function getMarketingFaqSchemaItems(): FaqSchemaItem[] {
  return MARKETING_FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      question: item.q,
      answer: item.answer,
    })),
  );
}
