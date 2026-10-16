"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-ide-bg text-ide-text-strong flex items-center justify-center p-6">
      <section className="max-w-md space-y-4 rounded-2xl border border-ide-danger/40 bg-ide-surface-overlay p-6 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-[#fca5a5]">
          Runtime error
        </p>
        <h1 className="text-xl font-bold">That screen could not load</h1>
        <p className="text-sm text-ide-text-body">
          The service may be unreachable. Try the screen again.
        </p>
        <button
          className="rounded-xl bg-ide-accent px-4 py-2 text-sm font-semibold text-ide-accent-fg"
          onClick={() => reset()}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
