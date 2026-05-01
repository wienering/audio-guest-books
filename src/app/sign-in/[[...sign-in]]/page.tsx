import type { Metadata } from "next";

import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in • Audio Guest Books",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
