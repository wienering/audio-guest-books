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

export type RetentionNotificationEmailProps = {
  eventName: string;
  daysRemaining: 60 | 30 | 7;
  eventDateLabel: string;
  retailClientName: string;
  extendRetentionUrl: string;
};

export function RetentionNotification60dEmail(
  props: RetentionNotificationEmailProps
) {
  return (
    <Html>
      <Head />
      <Preview>
        Your audio guest book files for {props.eventName} will be deleted in 60
        days
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your recordings won&apos;t stay forever</Heading>
          <Text style={text}>Hi there,</Text>
          <Text style={text}>
            This is a friendly heads-up from Audio Guest Books. The audio files
            for your event <strong>{props.eventName}</strong> are scheduled to be
            deleted in <strong>60 days</strong>, per your retention settings.
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
            Want to keep them longer? You can extend retention by 12 months from
            your dashboard (within your plan limits).
          </Text>
          <Section style={{ textAlign: "left" as const, marginTop: 24 }}>
            <Button href={props.extendRetentionUrl} style={button}>
              Extend retention by 12 months
            </Button>
          </Section>
          <Text style={footer}>
            If you have questions, reply to this email — we read every message.
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
  backgroundColor: "#111827",
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
