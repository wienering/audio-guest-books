import { Head, Heading, Html, Section, Text } from "@react-email/components";

export function BillingSubscriptionEndedEmail(props: { companyName: string }) {
  return (
    <Html>
      <Head />
      <Section style={{ fontFamily: "sans-serif", padding: "24px" }}>
        <Heading as="h1" style={{ fontSize: "20px" }}>
          Ultimate subscription ended
        </Heading>
        <Text>
          The Ultimate subscription for <strong>{props.companyName}</strong> has ended. Your
          workspace is now on the Free plan.
        </Text>
        <Text>
          You can resubscribe anytime from Settings → Billing in your dashboard.
        </Text>
      </Section>
    </Html>
  );
}
