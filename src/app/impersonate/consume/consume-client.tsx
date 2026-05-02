"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Survives React Strict Mode remount so we only run the Clerk flow once per page load. */
let impersonationConsumeStarted = false;

export function ConsumeImpersonationClient() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useClerk();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || impersonationConsumeStarted) return;
    const ticketRaw = params.get("ticket");
    if (!ticketRaw) {
      setError("Missing ticket");
      return;
    }
    const ticket = ticketRaw;

    impersonationConsumeStarted = true;

    async function consume() {
      try {
        console.log("[Impersonation] Got ticket");

        await signOut();
        console.log("[Impersonation] Signed out existing session");

        if (!signIn) {
          impersonationConsumeStarted = false;
          setError("Sign-in is not ready.");
          return;
        }

        const result = await signIn.create({
          strategy: "ticket",
          ticket,
        });

        const { createdSessionId, status } = result;
        console.log(
          `[Impersonation] Created sign-in, status: ${status ?? "(none)"}`
        );

        if (!createdSessionId) {
          impersonationConsumeStarted = false;
          setError(
            status
              ? `Sign in incomplete: ${status}`
              : "Sign in did not return a session"
          );
          return;
        }

        await setActive({ session: createdSessionId });
        console.log(
          `[Impersonation] Set active session: ${createdSessionId}`
        );

        console.log("[Impersonation] Redirecting to dashboard");
        router.push("/dashboard");
      } catch (err) {
        impersonationConsumeStarted = false;
        console.error("[Impersonation] consume error", err);
        setError(
          err instanceof Error ? err.message : "Failed to consume ticket"
        );
      }
    }

    void consume();
  }, [isLoaded, params, router, setActive, signIn, signOut]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm">
        <p className="font-semibold text-destructive">
          Impersonation failed: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
      Starting impersonation session…
    </div>
  );
}
