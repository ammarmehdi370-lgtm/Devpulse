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
import { AppShell } from "./components/AppShell";
import { CommandPalette } from "./components/CommandPalette";
import { ListSkeleton, PageHeaderSkeleton } from "./components/SkeletonLoaders";

const PLATFORM_PAGES: Record<string, React.ReactNode> = {
  repositories: <RepositoriesPage />,
  workspaces: <WorkspacesPage />,
  deployments: <DeploymentsPage />,
  chat: <TeamChatPage />,
  "remote-control": <RemoteControlPage />,
  "ai-studio": <FullScreenAiPage />,
  pricing: <PricingPage />,
};

export function AppContent() {
  const { page, isDataLoading } = useApp();
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
    const currentPage = PLATFORM_PAGES[page];
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
    <div key={page} className="page-transition">
      {content}
    </div>
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