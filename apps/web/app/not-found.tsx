import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ide-bg text-ide-text-strong flex items-center justify-center p-6">
      <section className="max-w-md space-y-4 rounded-2xl border border-ide-border bg-ide-surface-overlay p-6 text-center">
        <p className="text-5xl font-black text-ide-accent">404</p>
        <h1 className="text-xl font-bold">Route not found</h1>
        <p className="text-sm text-ide-text-body">
          That Devpulse view does not exist or is no longer available.
        </p>
        <Link
          className="inline-flex rounded-xl bg-ide-accent px-4 py-2 text-sm font-semibold text-ide-accent-fg"
          href="/"
        >
          Return to Devpulse
        </Link>
      </section>
    </main>
  );
}
