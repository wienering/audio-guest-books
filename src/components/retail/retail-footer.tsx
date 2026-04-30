import Link from "next/link";

export function RetailFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white px-4 py-8 sm:px-8">
      <p className="mx-auto max-w-3xl text-center text-base text-neutral-600 sm:text-lg">
        Powered by{" "}
        <Link
          href="https://audioguestbooks.ca"
          className="font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2 hover:text-teal-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          Audio Guest Books
        </Link>
      </p>
    </footer>
  );
}
