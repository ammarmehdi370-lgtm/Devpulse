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
    <main className="min-h-screen bg-[#09090e] text-white flex items-center justify-center p-6">
      <section className="max-w-md space-y-4 rounded-2xl border border-[#f87171]/40 bg-[#111118] p-6 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-[#fca5a5]">
          Runtime error
        </p>
        <h1 className="text-xl font-bold">That screen could not load</h1>
        <p className="text-sm text-[#b6b6ca]">
          The service may be unreachable. Try the screen again.
        </p>
        <button
          className="rounded-xl bg-[#0DF5C4] px-4 py-2 text-sm font-semibold text-[#09090e]"
          onClick={() => reset()}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
