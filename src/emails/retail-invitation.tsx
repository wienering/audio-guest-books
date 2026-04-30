import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import {
  segmentLineForUrls,
  splitInvitationBodyParagraphs,
} from "@/lib/invitation-body-segments";

export type RetailInvitationEmailProps = {
  companyName: string;
  /** Final plain-text body after merge; URLs become links. */
  bodyPlain: string;
};

const textStyle = {
  color: "#444",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 12px",
  padding: "0 40px",
};

const companyHeaderStyle = {
  ...textStyle,
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color: "#64748b",
  marginTop: "24px",
};

const footerStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "1.5",
  marginTop: "32px",
  padding: "0 40px",
};

function lineToEmailNodes(line: string, keyPrefix: string): ReactNode[] {
  const segments = segmentLineForUrls(line);
  return segments.map((s, i) => {
    const k = `${keyPrefix}-${i}`;
    if (s.kind === "link") {
      return (
        <Link key={k} href={s.href} style={{ color: "#0f766e" }}>
          {s.href}
        </Link>
      );
    }
    return <span key={k}>{s.text}</span>;
  });
}

function bodyToEmailContent(bodyPlain: string): ReactNode[] {
  const paragraphs = splitInvitationBodyParagraphs(bodyPlain);
  const nodes: ReactNode[] = [];

  paragraphs.forEach((para, pi) => {
    const lines = para.split("\n");
    lines.forEach((line, li) => {
      const isLastLine = li === lines.length - 1;
      nodes.push(
        <Text key={`p${pi}-l${li}`} style={textStyle}>
          {lineToEmailNodes(line, `p${pi}-l${li}`)}
          {!isLastLine ? <br /> : null}
        </Text>
      );
    });
  });

  return nodes;
}

export function RetailInvitationEmail(props: RetailInvitationEmailProps) {
  const preview = `Message from ${props.companyName}`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily:
            '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "0 auto",
            padding: "20px 0 48px",
            marginBottom: "64px",
            maxWidth: "560px",
          }}
        >
          <Heading
            as="h1"
            style={{
              color: "#0f172a",
              fontSize: "22px",
              fontWeight: 600,
              lineHeight: 1.3,
              margin: "16px 0 8px",
              padding: "0 40px",
            }}
          >
            {props.companyName}
          </Heading>
          <Text style={companyHeaderStyle}>Audio guest book</Text>
          <Section style={{ marginTop: 8 }}>{bodyToEmailContent(props.bodyPlain)}</Section>
          <Text style={footerStyle}>
            Sent via Audio Guest Books for {props.companyName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
