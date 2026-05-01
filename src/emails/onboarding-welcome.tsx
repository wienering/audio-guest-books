import {
  Button,
  Column,
  Heading,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import type { CSSProperties } from "react";

import {
  OnboardingEmailChrome,
  onboardingEmailColors,
} from "./onboarding-email-chrome";

export function OnboardingWelcomeEmail(props: {
  greetingName: string | null;
  companyName: string;
  workspaceUrl: string;
}) {
  const hi =
    props.greetingName && props.greetingName.trim().length > 0
      ? `Hi ${props.greetingName.trim()},`
      : "Hi there,";

  const { primaryText, secondaryText, pageBg, border } = onboardingEmailColors;

  const bodyText: CSSProperties = {
    color: primaryText,
    fontSize: "16px",
    lineHeight: "1.65",
    margin: "0 0 20px",
  };

  const finePrint: CSSProperties = {
    color: secondaryText,
    fontSize: "12px",
    lineHeight: "1.6",
    margin: "0 0 10px",
  };

  return (
    <OnboardingEmailChrome
      footer={
        <React.Fragment>
          <Text style={finePrint}>
            <Link
              href="https://audioguestbooks.ca"
              style={{ color: secondaryText, textDecoration: "underline" }}
            >
              audioguestbooks.ca
            </Link>
          </Text>
          <Text style={{ ...finePrint, margin: "0 0 10px" }}>
            You&apos;re receiving this because you signed up for Audio Guest
            Books.
          </Text>
          <Text style={{ ...finePrint, margin: 0 }}>
            This isn&apos;t a marketing list. There&apos;s nothing to
            unsubscribe from here, but you can always reach us at{" "}
            <Link
              href="mailto:support@audioguestbooks.ca"
              style={{ color: secondaryText, textDecoration: "underline" }}
            >
              support@audioguestbooks.ca
            </Link>
            .
          </Text>
        </React.Fragment>
      }
      preview="Welcome to Audio Guest Books"
    >
      <Heading
        as="h1"
        style={{
          color: primaryText,
          fontSize: "22px",
          fontWeight: "600",
          lineHeight: "1.35",
          margin: "0 0 24px",
          padding: 0,
        }}
      >
        Welcome to Audio Guest Books
      </Heading>
      <Text style={bodyText}>{hi}</Text>
      <Text style={bodyText}>
        Thanks for joining Audio Guest Books. Your workspace for{" "}
        {props.companyName} is live and ready.
      </Text>
      <Text
        style={{
          color: secondaryText,
          fontSize: "14px",
          lineHeight: "1.55",
          margin: "0 0 8px",
          fontWeight: "500",
        }}
      >
        Your guest-facing site:
      </Text>
      <Section
        style={{
          backgroundColor: pageBg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          padding: "16px 18px",
          margin: "0 0 28px",
          boxSizing: "border-box" as const,
        }}
      >
        <Link
          href={props.workspaceUrl}
          style={{
            color: primaryText,
            fontSize: "15px",
            lineHeight: "1.55",
            textDecoration: "none",
            fontWeight: "500",
            wordBreak: "break-all" as const,
          }}
        >
          {props.workspaceUrl}
        </Link>
      </Section>
      <Section style={{ textAlign: "center" as const, margin: "0 0 28px" }}>
        <Button
          href={props.workspaceUrl}
          style={{
            backgroundColor: onboardingEmailColors.accent,
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "600",
            textDecoration: "none",
            textAlign: "center" as const,
            display: "block",
            width: "100%",
            lineHeight: "1.25",
            padding: "14px 20px",
            boxSizing: "border-box" as const,
          }}
        >
          Open your dashboard
        </Button>
      </Section>
      <Text
        style={{
          ...bodyText,
          fontWeight: "600",
          margin: "0 0 16px",
        }}
      >
        Three quick steps to get rolling:
      </Text>
      <Row style={{ marginBottom: "14px" }}>
        <Column style={{ width: "28px", verticalAlign: "top" as const }}>
          <Text
            style={{
              ...bodyText,
              margin: 0,
              fontWeight: "600",
              color: secondaryText,
            }}
          >
            1.
          </Text>
        </Column>
        <Column style={{ paddingRight: "8px" }}>
          <Text style={{ ...bodyText, margin: 0 }}>
            Create your first event from your dashboard
          </Text>
        </Column>
      </Row>
      <Row style={{ marginBottom: "14px" }}>
        <Column style={{ width: "28px", verticalAlign: "top" as const }}>
          <Text
            style={{
              ...bodyText,
              margin: 0,
              fontWeight: "600",
              color: secondaryText,
            }}
          >
            2.
          </Text>
        </Column>
        <Column style={{ paddingRight: "8px" }}>
          <Text style={{ ...bodyText, margin: 0 }}>
            Upload audio files to that event
          </Text>
        </Column>
      </Row>
      <Row style={{ marginBottom: "28px" }}>
        <Column style={{ width: "28px", verticalAlign: "top" as const }}>
          <Text
            style={{
              ...bodyText,
              margin: 0,
              fontWeight: "600",
              color: secondaryText,
            }}
          >
            3.
          </Text>
        </Column>
        <Column style={{ paddingRight: "8px" }}>
          <Text style={{ ...bodyText, margin: 0 }}>
            Share the client link with your client when they&apos;re ready to
            listen
          </Text>
        </Column>
      </Row>
      <Text style={bodyText}>
        Got questions or hit a snag? Just reply to this email and we&apos;ll
        help you out.
      </Text>
      <Text style={{ ...bodyText, margin: "28px 0 0" }}>Cheers,</Text>
      <Text style={{ ...bodyText, margin: "4px 0 0", fontWeight: "500" }}>
        The Audio Guest Books Team
      </Text>
    </OnboardingEmailChrome>
  );
}
