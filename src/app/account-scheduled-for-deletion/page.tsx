import Link from "next/link";

import { formatDateOnly } from "@/lib/date-format";

type Props = { searchParams: Promise<{ purgeDate?: string }> };

export default async function AccountScheduledForDeletionPage({ searchParams }: Props) {
  const { purgeDate } = await searchParams;
  const purgeDateLabel =
    purgeDate && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(purgeDate)
      ? formatDateOnly(purgeDate)
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-semibold text-xl tracking-tight text-neutral-900">
        Account scheduled for deletion
      </h1>
      {purgeDateLabel ? (
        <p className="mt-3 text-neutral-600 leading-relaxed">
          Your workspace is marked for permanent deletion on{" "}
          <strong>{purgeDateLabel}</strong>. Until then your files remain on our
          systems in case you need to undo this change.
        </p>
      ) : (
        <p className="mt-3 text-neutral-600 leading-relaxed">
          This account has been marked for deletion. If you arrived here without
          going through deletion, please contact support.
        </p>
      )}
      <p className="mt-6 text-neutral-600 leading-relaxed">
        To restore access before deletion completes, email{" "}
        <a
          className="text-neutral-900 underline underline-offset-2"
          href="mailto:support@audioguestbooks.ca"
        >
          support@audioguestbooks.ca
        </a>{" "}
        with your company name.
      </p>
      <Link
        href="/sign-in"
        className="mt-10 text-neutral-900 text-sm underline underline-offset-4"
      >
        Return to sign in
      </Link>
    </main>
  );
}
