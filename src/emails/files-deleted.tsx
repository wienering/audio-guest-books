import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type FilesDeletedEmailProps = {
  eventName: string;
  deletedDateLabel: string;
};

export function FilesDeletedEmail(props: FilesDeletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Audio files for {props.eventName} have been deleted</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Audio files removed</Heading>
          <Text style={text}>Hi there,</Text>
          <Text style={text}>
            The audio recordings for <strong>{props.eventName}</strong> have
            been deleted as of <strong>{props.deletedDateLabel}</strong>, based
            on your retention settings.
          </Text>
          <Text style={text}>
            We still keep basic event metadata (for example the event name and
            client-facing page) for 12 months so guests see that files are no
            longer available instead of a broken experience. After that window,
            the event record is permanently removed.
          </Text>
          <Section style={box}>
            <Text style={muted}>
              If this timing looks wrong or you need a hand with archival exports,
              reply to this email and we&apos;ll take a look.
            </Text>
          </Section>
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
  margin: "24px 40px",
};

const muted = {
  color: "#667085",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: 0,
};
