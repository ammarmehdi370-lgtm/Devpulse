"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "./context/AppContext";
import { LoginPage } from "./components/LoginPage";
import { ThemePalettePage } from "./components/ThemePalettePage";
import { RepositoriesPage } from "./components/RepositoriesPage";
import { WorkspacesPage } from "./components/WorkspacesPage";
import { DeploymentsPage } from "./components/DeploymentsPage";
import { TeamChatPage } from "./components/TeamChatPage";
import { PricingPage } from "./components/PricingPage";
import { CustomPlanPage } from "./components/CustomPlanPage";
import { AppShell } from "./components/AppShell";
import { CloudCoreDashboard } from "./components/CloudCoreDashboard";
import { ActivityPage } from "./components/ActivityPage";
import { CommandPalette } from "./components/CommandPalette";
import { ModalHost } from "./components/FriendlyHelpers";
import { ApiSandboxPage } from "./components/ApiSandboxPage";
import { SiteSettingsPage } from "./components/SiteSettingsPage";
import { PaymentMethodsPage } from "./components/PaymentMethodsPage";

const PanelLoading = () => (
  <div
    className="min-h-[40vh] animate-pulse bg-ide-bg"
    aria-label="Loading workspace panel"
  />
);
const EditorWorkbench = dynamic(
  () =>
    import("./components/EditorWorkbench").then(
      (module) => module.EditorWorkbench,
    ),
  { ssr: false, loading: PanelLoading },
);
const RemoteControlPage = dynamic(
  () =>
    import("./components/RemoteControlPage").then(
      (module) => module.RemoteControlPage,
    ),
  { ssr: false, loading: PanelLoading },
);
const FullScreenAiPage = dynamic(
  () =>
    import("./components/FullScreenAiPage").then(
      (module) => module.FullScreenAiPage,
    ),
  { ssr: false, loading: PanelLoading },
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-ide-bg text-ide-text-strong flex items-center justify-center p-6">
          <section className="max-w-md space-y-4 rounded-2xl border border-ide-danger/40 bg-ide-surface-overlay p-6 text-center">
            <h1 className="text-xl font-bold">Devpulse needs a refresh</h1>
            <p className="text-sm text-ide-text-body">
              This screen failed to render. Your local work is still safe.
            </p>
            <button
              className="rounded-xl bg-ide-accent px-4 py-2 text-sm font-semibold text-ide-accent-fg"
              onClick={() => window.location.reload()}
            >
              Reload workspace
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function MainAppContent() {
  const { page, isClientStorageHydrated } = useApp();

  if (!isClientStorageHydrated) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-ide-shell-bg text-sm text-ide-text-soft"
        aria-busy="true"
        aria-live="polite"
      >
        Loading workspace...
      </main>
    );
  }

  // 1. Initial State: Login Page
  if (page === "login") {
    return <LoginPage />;
  }

  // 2. Step 2: Theme Palette
  if (page === "theme") {
    return <ThemePalettePage />;
  }

  // 3. Platform & Workbench Pages
  return (
    <AppShell>
      {page === "repositories" && <RepositoriesPage />}
      {page === "workspaces" && <WorkspacesPage />}
      {page === "activity" && <ActivityPage />}
      {page === "deployments" && <DeploymentsPage />}
      {page === "chat" && <TeamChatPage />}
      {page === "editor" && <EditorWorkbench />}
      {page === "remote-control" && <RemoteControlPage />}
      {page === "ai-studio" && <FullScreenAiPage />}
      {page === "pricing" && <PricingPage />}
      {page === "custom-plan" && <CustomPlanPage />}
      {page === "cloud-core" && <CloudCoreDashboard />}
      {page === "api-sandbox" && <ApiSandboxPage />}
      {page === "settings" && <SiteSettingsPage />}
      {page === "payment-methods" && <PaymentMethodsPage />}
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <AppErrorBoundary>
        <MainAppContent />
        <CommandPalette />
        <ModalHost />
      </AppErrorBoundary>
    </AppProvider>
  );
}
