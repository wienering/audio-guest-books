"use client";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col justify-center px-6 py-16">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground text-sm">{error.message}</p>
      <button
        type="button"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
