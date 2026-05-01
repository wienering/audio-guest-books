import { Button, Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import type { CSSProperties } from "react";

import {
  OnboardingEmailChrome,
  onboardingEmailColors,
} from "./onboarding-email-chrome";

export function OnboardingAdminNotificationEmail(props: {
  companyName: string;
  companySlug: string;
  signedUpByName: string | null;
  signedUpByEmail: string | null;
  planTierName: string;
  timestampToronto: string;
  adminDashboardUrl: string;
}) {
  const { primaryText, secondaryText, pageBg, border } = onboardingEmailColors;

  const labelStyle: CSSProperties = {
    color: secondaryText,
    fontSize: "12px",
    lineHeight: "1.4",
    margin: "0 0 4px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };

  const valueStyle: CSSProperties = {
    color: primaryText,
    fontSize: "15px",
    lineHeight: "1.5",
    margin: "0 0 20px",
  };

  const finePrint: CSSProperties = {
    color: secondaryText,
    fontSize: "12px",
    lineHeight: "1.6",
    margin: 0,
  };

  const signedUpBy =
    props.signedUpByName && props.signedUpByName.trim().length > 0
      ? `${props.signedUpByName.trim()} (${props.signedUpByEmail ?? "email unknown"})`
      : (props.signedUpByEmail ?? "Unknown");

  return (
    <OnboardingEmailChrome
      footer={
        <Text style={finePrint}>
          Internal notice from Audio Guest Books. Questions?{" "}
          <Link
            href="mailto:support@audioguestbooks.ca"
            style={{ color: secondaryText, textDecoration: "underline" }}
          >
            support@audioguestbooks.ca
          </Link>
        </Text>
      }
      preview={`New signup: ${props.companyName}`}
    >
      <Heading
        as="h1"
        style={{
          color: primaryText,
          fontSize: "20px",
          fontWeight: "600",
          lineHeight: "1.35",
          margin: "0 0 24px",
          padding: 0,
        }}
      >
        New signup
      </Heading>
      <Section
        style={{
          backgroundColor: pageBg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          padding: "20px 20px 4px",
          margin: "0 0 28px",
          boxSizing: "border-box" as const,
        }}
      >
        <Text style={labelStyle}>Company name</Text>
        <Text style={valueStyle}>{props.companyName}</Text>
        <Text style={labelStyle}>Slug</Text>
        <Text style={valueStyle}>{props.companySlug}</Text>
        <Text style={labelStyle}>Signed up by</Text>
        <Text style={valueStyle}>{signedUpBy}</Text>
        <Text style={labelStyle}>Plan tier</Text>
        <Text style={valueStyle}>{props.planTierName}</Text>
        <Text style={labelStyle}>Timestamp (America/Toronto)</Text>
        <Text style={{ ...valueStyle, margin: "0 0 16px" }}>
          {props.timestampToronto}
        </Text>
      </Section>
      <Section style={{ textAlign: "center" as const, margin: "0 0 8px" }}>
        <Button
          href={props.adminDashboardUrl}
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
          View in admin dashboard
        </Button>
      </Section>
    </OnboardingEmailChrome>
  );
}
