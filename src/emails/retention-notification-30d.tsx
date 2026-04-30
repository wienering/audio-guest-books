import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { RetentionNotificationEmailProps } from "./retention-notification-60d";

export function RetentionNotification30dEmail(
  props: RetentionNotificationEmailProps
) {
  return (
    <Html>
      <Head />
      <Preview>
        Your audio guest book files for {props.eventName} will be deleted in 30
        days
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>30 days until files are removed</Heading>
          <Text style={text}>Hi there,</Text>
          <Text style={text}>
            A quick reminder: audio for <strong>{props.eventName}</strong> will
            be deleted in <strong>30 days</strong>. After that, guests will see
            that files are no longer available, while we keep basic event
            details for up to 12 more months.
          </Text>
          <Section style={box}>
            <Text style={label}>Event</Text>
            <Text style={value}>{props.eventName}</Text>
            <Text style={label}>Date</Text>
            <Text style={value}>{props.eventDateLabel}</Text>
            <Text style={label}>Client</Text>
            <Text style={value}>{props.retailClientName}</Text>
          </Section>
          <Text style={text}>
            If you&apos;d like more time, extend retention from your dashboard
            before the deadline.
          </Text>
          <Section style={{ textAlign: "left" as const, marginTop: 24 }}>
            <Button href={props.extendRetentionUrl} style={button}>
              Extend retention by 12 months
            </Button>
          </Section>
          <Text style={footer}>
            Questions? Just reply — we&apos;re happy to help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "560px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "16px 0",
  padding: "0 40px",
};

const text = {
  color: "#444",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "12px 0",
  padding: "0 40px",
};

const box = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "16px 20px",
};

const label = {
  color: "#666",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "8px 0 0",
};

const value = {
  color: "#111",
  fontSize: "15px",
  margin: "4px 0 12px",
};

const button = {
  backgroundColor: "#b91c1c",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "1.5",
  marginTop: "32px",
  padding: "0 40px",
};
