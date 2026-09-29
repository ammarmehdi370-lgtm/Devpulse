"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "../../lib/apiClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("auth_error");
    if (error) {
      router.replace(`/?auth_error=${encodeURIComponent(error)}`);
      return;
    }

    const token = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
    if (!token) {
      router.replace("/?auth_error=oauth_callback_missing_token");
      return;
    }

    setAccessToken(token);
    window.history.replaceState(null, "", window.location.pathname);
    router.replace("/");
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#09090e] text-sm text-[#8c8ca5">Completing sign in...</main>;
}