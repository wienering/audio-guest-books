import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
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
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center px-6 py-12">
      <div className="mb-8 flex w-full max-w-md flex-col items-center gap-4 text-center">
        <BrandLogo className="h-10 w-auto max-w-full shrink-0" />
        <div className="w-full space-y-2 px-2 text-pretty">
          <h1 className="text-base leading-snug font-medium">
            Finish setting up
          </h1>
          <p className="text-muted-foreground text-sm">
            You&apos;re authenticated with Clerk — now connect your workspace to
            the platform tenant.
          </p>
        </div>
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
