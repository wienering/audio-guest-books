import { Head, Heading, Html, Section, Text } from "@react-email/components";

export function BillingSubscriptionCreatedEmail(props: {
  companyName: string;
  isFoundingMember: boolean;
}) {
  return (
    <Html>
      <Head />
      <Section style={{ fontFamily: "sans-serif", padding: "24px" }}>
        <Heading as="h1" style={{ fontSize: "20px" }}>
          You&apos;re on Ultimate
        </Heading>
        <Text>
          Thanks for upgrading <strong>{props.companyName}</strong> to Ultimate on Audio Guest
          Books. Your subscription is active.
        </Text>
        {props.isFoundingMember ? (
          <Text>
            You have <strong>founding member</strong> pricing at $5/month for the life of your
            subscription.
          </Text>
        ) : null}
        <Text>
          Manage billing anytime from your dashboard under Settings → Billing.
        </Text>
      </Section>
    </Html>
  );
}
