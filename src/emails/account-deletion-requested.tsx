import { Head, Heading, Html, Section, Text } from "@react-email/components";

export function AccountDeletionRequestedEmail(props: {
  hardDeleteAfterLabel: string;
  restoreEmail: string;
}) {
  return (
    <Html>
      <Head />
      <Section style={{ fontFamily: "sans-serif", padding: "24px" }}>
        <Heading as="h1" style={{ fontSize: "20px" }}>
          Account marked for deletion
        </Heading>
        <Text>
          Your company account has been scheduled for permanent deletion after{" "}
          <strong>{props.hardDeleteAfterLabel}</strong>.
        </Text>
        <Text>
          If you change your mind before that date, email{" "}
          <a href={`mailto:${props.restoreEmail}`}>{props.restoreEmail}</a>{" "}
          with your company name and we&apos;ll restore your workspace.
        </Text>
      </Section>
    </Html>
  );
}
