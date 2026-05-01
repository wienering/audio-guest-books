import Link from "next/link";

export function RetailFooter({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <footer
      className="mt-auto border-t px-4 py-8 sm:px-8"
      style={{
        borderColor: "var(--retail-border)",
        background: "var(--retail-bg)",
        color: "var(--retail-muted)",
      }}
    >
      <p className="mx-auto max-w-3xl text-center text-base sm:text-lg">
        Powered by{" "}
        <Link
          href="https://audioguestbooks.ca"
          className="font-medium underline decoration-current/40 underline-offset-2 hover:opacity-90"
          style={{ color: "var(--retail-accent)" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Audio Guest Books
        </Link>
      </p>
    </footer>
  );
}
