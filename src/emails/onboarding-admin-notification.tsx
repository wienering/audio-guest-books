import { Head, Html, Section, Text } from "@react-email/components";

export function OnboardingAdminNotificationEmail(props: { bodyText: string }) {
  return (
    <Html>
      <Head />
      <Section style={{ fontFamily: "ui-monospace, monospace", padding: "16px" }}>
        <Text style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: "1.45" }}>
          {props.bodyText}
        </Text>
      </Section>
    </Html>
  );
}
