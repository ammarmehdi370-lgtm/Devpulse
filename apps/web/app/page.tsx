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

function MainAppContent() {
  const { page } = useApp();

  // 1. Initial State: Login Page
  if (page === 'login') {
    return <LoginPage />;
  }

  // 2. Step 2: Theme Palette
  if (page === 'theme') {
    return <ThemePalettePage />;
  }

  // 3. Platform & Workbench Pages
  return (
    <AppShell>
      {page === 'repositories' && <RepositoriesPage />}
      {page === 'workspaces' && <WorkspacesPage />}
      {page === 'deployments' && <DeploymentsPage />}
      {page === 'chat' && <TeamChatPage />}
      {page === 'editor' && <EditorWorkbench />}
      {page === 'remote-control' && <RemoteControlPage />}
      {page === 'ai-studio' && <FullScreenAiPage />}
      {page === 'pricing' && <PricingPage />}
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <MainAppContent />
      <CommandPalette />
    </AppProvider>
  );
}
