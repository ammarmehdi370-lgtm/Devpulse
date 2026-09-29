"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "../../lib/apiClient";

type VerificationState = "verifying" | "success" | "error";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const [state, setState] = useState<VerificationState>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setError("No sign-in token was found in this link.");
      setState("error");
      return;
    }

    void fetch(`${API_BASE}/api/auth/magic-link/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json() as { accessToken?: string; message?: string; error?: string };
        if (!response.ok || !body.accessToken) throw new Error(body.message || "This sign-in link is invalid or expired.");
        setAccessToken(body.accessToken);
        setState("success");
        window.setTimeout(() => router.replace("/"), 1200);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Network error. Please try again.");
        setState("error");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090e] px-5 text-[#ededf5]">
      <section className="w-full max-w-sm text-center">
        {state === "verifying" && <><div aria-hidden="true" className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" /><h1 className="text-lg font-semibold">Signing you in</h1><p className="mt-2 text-sm text-[#8c8ca5]">Verifying your sign-in link.</p></>}
        {state === "success" && <><div className="mb-4 text-3xl text-emerald-300" aria-hidden="true">✓</div><h1 className="text-lg font-semibold">Signed in successfully</h1><p className="mt-2 text-sm text-[#8c8ca5]">Opening your workspace...</p></>}
        {state === "error" && <><div className="mb-4 text-3xl text-red-300" aria-hidden="true">×</div><h1 className="text-lg font-semibold">Sign-in link expired</h1><p role="alert" className="mt-2 text-sm text-[#8c8ca5]">{error}</p><a href="/login" className="mt-5 inline-block text-sm font-medium text-[#b5afff] hover:text-white">Back to sign in</a></>}
      </section>
    </main>
  );
}