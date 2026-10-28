"use client";

import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { LoginPage } from "./components/LoginPage";
import { ThemePalettePage } from "./components/ThemePalettePage";
import { RepositoriesPage } from "./components/RepositoriesPage";
import { WorkspacesPage } from "./components/WorkspacesPage";
import { DeploymentsPage } from "./components/DeploymentsPage";
import { TeamChatPage } from "./components/TeamChatPage";
import { EditorWorkbench } from "./components/EditorWorkbench";
import { RemoteControlPage } from "./components/RemoteControlPage";
import { FullScreenAiPage } from "./components/FullScreenAiPage";
import { PricingPage } from "./components/PricingPage";
import { ActivityPage } from "./components/ActivityPage";
import { PageHeader } from "./components/PageHeader";
import { AppShell } from "./components/AppShell";
import { CommandPalette } from "./components/CommandPalette";
import { ListSkeleton, PageHeaderSkeleton } from "./components/SkeletonLoaders";
import { DevpulseLogo } from "../src/components/DevpulseLogo";
import type { PageType } from "./context/AppContext";

function UnavailablePage({ page }: { page: PageType }) {
  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-8">
      <PageHeader page={page} />
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 text-sm text-[var(--muted)]">
        This page is not available in this build.
      </p>
    </main>
  );
}

const PAGE_COMPONENTS: Record<
  Exclude<PageType, "login" | "theme" | "editor">,
  React.ReactNode
> = {
  repositories: <RepositoriesPage />,
  workspaces: <WorkspacesPage />,
  deployments: <DeploymentsPage />,
  chat: <TeamChatPage />,
  "remote-control": <RemoteControlPage />,
  "ai-studio": <FullScreenAiPage />,
  pricing: <PricingPage />,
  activity: <ActivityPage />,
  settings: <ThemePalettePage />,
  "payment-methods": <UnavailablePage page="payment-methods" />,
  "custom-plan": <UnavailablePage page="custom-plan" />,
  "cloud-core": <UnavailablePage page="cloud-core" />,
  "api-sandbox": <UnavailablePage page="api-sandbox" />,
};

function AppContent() {
  const { page, isDataLoading, servicesLoading, servicesError, retryServices } =
    useApp();
  const pageOwnsLoadingState =
    page === "repositories" ||
    page === "workspaces" ||
    page === "deployments" ||
    page === "chat";

  let content: React.ReactNode;
  if (isDataLoading && !pageOwnsLoadingState) {
    const loadingView = (
      <main className="min-h-[60vh] p-6 sm:p-8" aria-busy="true">
        <PageHeaderSkeleton />
        <ListSkeleton count={3} />
      </main>
    );
    content =
      page === "login" || page === "theme" ? (
        loadingView
      ) : (
        <AppShell minimal={page === "editor" || page === "ai-studio"}>
          {loadingView}
        </AppShell>
      );
  } else if (page === "login") {
    content = <LoginPage />;
  } else if (page === "theme") {
    content = <ThemePalettePage />;
  } else if (page === "editor") {
    content = (
      <AppShell minimal>
        <EditorWorkbench />
      </AppShell>
    );
  } else if (page === "ai-studio") {
    content = (
      <AppShell minimal>
        <FullScreenAiPage />
      </AppShell>
    );
  } else {
    const currentPage = PAGE_COMPONENTS[page];
    content = (
      <AppShell>
        {currentPage ?? (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <p>Page not found: {page}</p>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <>
      {(servicesLoading || servicesError) && (
        <div
          role={servicesError ? "alert" : "status"}
          aria-live="polite"
          className="flex items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--surface-card)] px-4 py-2 text-sm text-[var(--text-secondary)]"
        >
          {servicesLoading && <DevpulseLogo size="md" variant="mark" theme="dark" />}
          <span>
            {servicesLoading
              ? "Starting the local browser database..."
              : `Local browser services could not start: ${servicesError}`}
          </span>
          {servicesError && (
            <button
              type="button"
              onClick={retryServices}
              className="rounded border border-[var(--border)] px-2 py-1 text-[var(--text)] hover:bg-[var(--hover)]"
            >
              Retry
            </button>
          )}
        </div>
      )}
      <div key={page} className="page-transition">
        {content}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <AppContent />
      <CommandPalette />
    </AppProvider>
  );
}
