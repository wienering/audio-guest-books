import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMembershipWithCompany } from "@/lib/company";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    redirect("/sign-in");
  }

  const existing = await getMembershipWithCompany(userId);
  if (existing) {
    redirect("/dashboard");
  }

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN ??
    "audioguestbooks.ca";

  return (
    <main className="mx-auto flex min-h-screen flex-col items-center px-6 py-12">
      <div className="mb-8 flex flex-col gap-4 text-center sm:max-w-md">
        <h1 className="text-xl font-semibold tracking-tight">Audio Guest Books</h1>
        <Card className="border-none bg-transparent py-4 shadow-none">
          <CardHeader className="px-2">
            <CardTitle className="text-base">Finish setting up</CardTitle>
            <CardDescription>
              You&apos;re authenticated with Clerk — now connect your workspace to
              the platform tenant.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      <OnboardingForm rootDomain={rootDomain} />
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "link" }), "mt-8")}
      >
        Already completed setup?
      </Link>
    </main>
  );
}
