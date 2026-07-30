"use client";

export default function TimeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-10">
      <div>
        <h1 className="text-2xl font-medium">Time</h1>
      </div>
      <div className="rounded-lg border border-bad p-4 text-sm">
        <div className="text-bad">Sync failed</div>
        <div className="mt-1 text-muted">{error.message}</div>
      </div>
      <button
        onClick={reset}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:border-gold"
      >
        Try again
      </button>
    </main>
  );
}
