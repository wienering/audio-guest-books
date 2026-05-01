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
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import {
  getMembershipWithCompany,
  getSoftDeletedMembershipInfo,
} from "@/lib/company";

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

  const pendingDeletion = await getSoftDeletedMembershipInfo(userId);
  if (pendingDeletion) {
    const q =
      pendingDeletion.hardDeleteAfter != null
        ? `?purgeDate=${pendingDeletion.hardDeleteAfter.toISOString().slice(0, 10)}`
        : "";
    redirect(`/account-scheduled-for-deletion${q}`);
  }

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN ??
    "audioguestbooks.ca";

  return (
    <main className="mx-auto flex min-h-screen flex-col items-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:max-w-md">
        <BrandLogo className="h-10 w-auto" />
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
