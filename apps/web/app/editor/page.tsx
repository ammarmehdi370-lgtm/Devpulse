"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { EditorWorkbench } from "../components/EditorWorkbench";

function EditorRoute() {
  const params = useSearchParams();
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