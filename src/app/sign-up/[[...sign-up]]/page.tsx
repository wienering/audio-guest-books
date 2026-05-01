import type { Metadata } from "next";

import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create account • Audio Guest Books",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignUp />
    </main>
  );
}
