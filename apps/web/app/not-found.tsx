import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#09090e] text-white flex items-center justify-center p-6">
      <section className="max-w-md space-y-4 rounded-2xl border border-[#262638] bg-[#111118] p-6 text-center">
        <p className="text-5xl font-black text-[#0DF5C4]">404</p>
        <h1 className="text-xl font-bold">Route not found</h1>
        <p className="text-sm text-[#b6b6ca]">
          That Devpulse view does not exist or is no longer available.
        </p>
        <Link
          className="inline-flex rounded-xl bg-[#0DF5C4] px-4 py-2 text-sm font-semibold text-[#09090e]"
          href="/"
        >
          Return to Devpulse
        </Link>
      </section>
    </main>
  );
}
