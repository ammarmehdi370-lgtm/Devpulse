'use client';

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/LoginPage';
import { ThemePalettePage } from './components/ThemePalettePage';
import { RepositoriesPage } from './components/RepositoriesPage';
import { WorkspacesPage } from './components/WorkspacesPage';
import { DeploymentsPage } from './components/DeploymentsPage';
import { TeamChatPage } from './components/TeamChatPage';
import { EditorWorkbench } from './components/EditorWorkbench';
import { RemoteControlPage } from './components/RemoteControlPage';
import { FullScreenAiPage } from './components/FullScreenAiPage';
import { PricingPage } from './components/PricingPage';
import { AppShell } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';

const PLATFORM_PAGES: Record<string, React.ReactNode> = {
  repositories: <RepositoriesPage />,
  workspaces: <WorkspacesPage />,
  deployments: <DeploymentsPage />,
  chat: <TeamChatPage />,
  'remote-control': <RemoteControlPage />,
  'ai-studio': <FullScreenAiPage />,
  pricing: <PricingPage />,
};

export function AppContent() {
  const { page, isDataLoading, user } = useApp();

  if (isDataLoading) {
    return (
      <AppShell minimal>
        <div className="flex h-full min-h-[60vh] flex-1 items-center justify-center bg-[var(--shell-bg)] text-[var(--muted)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-[var(--accent)]/40" />
            <div className="h-3 w-36 animate-pulse rounded-full bg-[var(--border-subtle)]" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (page === 'login') {
    return <LoginPage />;
  }

  if (page === 'theme') {
    return <ThemePalettePage />;
  }

  if (page === 'editor') {
    return (
      <AppShell minimal>
        <EditorWorkbench />
      </AppShell>
    );
  }

  if (page === 'ai-studio') {
    return (
      <AppShell minimal>
        <FullScreenAiPage />
      </AppShell>
    );
  }

  const currentPage = PLATFORM_PAGES[page];

  return (
    <AppShell>
      {currentPage ?? (
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          <p>Page not found: {page}</p>
        </div>
      )}
    </AppShell>
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
