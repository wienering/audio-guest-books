import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
} from "@react-email/components";
import type { ReactNode } from "react";

/** Hosted logo for dark header strip (matches `public/brand/lockup-horizontal-dark.svg` when deployed). */
export const ONBOARDING_EMAIL_LOGO_URL =
  "https://audioguestbooks.ca/brand/lockup-horizontal-dark.svg";

export const onboardingEmailColors = {
  pageBg: "#FAFAF9",
  cardBg: "#FFFFFF",
  primaryText: "#1A1A1A",
  secondaryText: "#525252",
  accent: "#243042",
  border: "#E5E5E5",
} as const;

export const onboardingEmailFontFamily =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type OnboardingEmailChromeProps = {
  preview?: string;
  children: ReactNode;
  /** Fine print below the card (outside white card). */
  footer: ReactNode;
};

/** Shared shell: soft page background, bordered card, accent header with logo. */
export function OnboardingEmailChrome({
  preview,
  children,
  footer,
}: OnboardingEmailChromeProps) {
  const { pageBg, cardBg, accent, border } = onboardingEmailColors;

  return (
    <Html>
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: pageBg,
          fontFamily: onboardingEmailFontFamily,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "32px 20px 48px",
            width: "100%",
            boxSizing: "border-box" as const,
          }}
        >
          <Section
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Section
              style={{
                backgroundColor: accent,
                padding: "26px 24px",
                textAlign: "center" as const,
              }}
            >
              <Img
                src={ONBOARDING_EMAIL_LOGO_URL}
                width={280}
                alt="Audio Guest Books"
                style={{
                  margin: "0 auto",
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                }}
              />
            </Section>
            <Section
              style={{
                padding: "36px 28px 40px",
                boxSizing: "border-box" as const,
              }}
            >
              {children}
            </Section>
          </Section>
          <Section style={{ padding: "28px 12px 0", textAlign: "center" as const }}>
            {footer}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
