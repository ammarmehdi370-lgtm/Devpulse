"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { EditorWorkbench } from "../components/EditorWorkbench";

function EditorRoute() {
  const params = useSearchParams();
  return <EditorWorkbench projectId={params.get("project")} />;
}

export default function EditorPage() {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <EditorRoute />
      </Suspense>
    </AppProvider>
  );
}