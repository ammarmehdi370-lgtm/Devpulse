"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { EditorWorkbench } from "../components/EditorWorkbench";
import { authenticatedFetch } from "../lib/apiClient";

function EditorRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    void authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/me`, {
      credentials: "include",
    }).then((response) => {
      if (!active) return;
      if (!response.ok) {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setAuthorized(true);
    }).catch(() => {
      if (active) router.replace("/login?reason=auth-unavailable");
    });
    return () => { active = false; };
  }, [router]);

  if (!authorized) return <EditorLoading />;
  return <EditorWorkbench projectId={params.get("project")} />;
}

function EditorLoading() {
  return (
    <div
      role="status"
      aria-label="Loading editor"
      className="flex h-screen items-center justify-center bg-dp-bg"
    >
      <div
        aria-hidden="true"
        className="dp-spin h-8 w-8 rounded-full border-2 border-dp-purple border-t-transparent"
      />
    </div>
  );
}

export default function EditorPage() {
  return (
    <AppProvider>
      <Suspense fallback={<EditorLoading />}>
        <EditorRoute />
      </Suspense>
    </AppProvider>
  );
}