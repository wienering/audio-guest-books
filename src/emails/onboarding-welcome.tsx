import { Head, Heading, Html, Link, Section, Text } from "@react-email/components";

export function OnboardingWelcomeEmail(props: {
  greetingName: string | null;
  companyName: string;
  workspaceUrl: string;
}) {
  const hi =
    props.greetingName && props.greetingName.trim().length > 0
      ? `Hi ${props.greetingName.trim()},`
      : "Hi there,";

  return (
    <Html>
      <Head />
      <Section style={{ fontFamily: "sans-serif", padding: "24px", maxWidth: "520px" }}>
        <Heading as="h1" style={{ fontSize: "20px", fontWeight: 600 }}>
          Welcome to Audio Guest Books
        </Heading>
        <Text>{hi}</Text>
        <Text>
          Thanks for joining Audio Guest Books. Your workspace for{" "}
          <strong>{props.companyName}</strong> is set up and ready to use.
        </Text>
        <Text>
          Your guest-facing site is here:{" "}
          <Link href={props.workspaceUrl}>{props.workspaceUrl}</Link>
        </Text>
        <Text>Here are three quick steps:</Text>
        <Text style={{ marginTop: "8px" }}>
          • Create your first event from your dashboard
          <br />
          • Upload audio files to that event
          <br />• Share the client link with your client when you are ready for them to listen
        </Text>
        <Text>
          If you have questions or run into a snag, reply to this email and we will get back to you.
        </Text>
        <Text>Thanks,</Text>
        <Text style={{ marginTop: 0 }}>The Audio Guest Books team</Text>
      </Section>
    </Html>
  );
}
