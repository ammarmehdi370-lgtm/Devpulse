"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "./context/AppContext";
import { HuddleProvider } from "./context/HuddleContext";
import { AppShell } from "./components/AppShell";
import { ModalHost } from "./components/FriendlyHelpers";
import { AppPageSkeleton } from "./components/SkeletonLoaders";
import { prefetchLikelyNextPages } from "./pagePrefetch";
import { isTypingTarget, matchesShortcut, SHORTCUTS } from "./editor/shortcuts";

const PanelLoading = () => (
  <div
    className="min-h-[40vh] animate-pulse bg-ide-bg"
    aria-label="Loading workspace panel"
  />
);
const LoginPage = dynamic(
  () => import("./components/LoginPage").then((module) => module.LoginPage),
  { ssr: false, loading: () => <AppPageSkeleton variant="auth" /> },
);
const ThemePalettePage = dynamic(
  () =>
    import("./components/ThemePalettePage").then(
      (module) => module.ThemePalettePage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="theme" /> },
);
const RepositoriesPage = dynamic(
  () =>
    import("./components/RepositoriesPage").then(
      (module) => module.RepositoriesPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="list" /> },
);
const WorkspacesPage = dynamic(
  () =>
    import("./components/WorkspacesPage").then(
      (module) => module.WorkspacesPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const DeploymentsPage = dynamic(
  () =>
    import("./components/DeploymentsPage").then(
      (module) => module.DeploymentsPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="list" /> },
);
const ActivityPage = dynamic(
  () =>
    import("./components/ActivityPage").then((module) => module.ActivityPage),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const TeamChatPage = dynamic(
  () =>
    import("./components/TeamChatPage").then((module) => module.TeamChatPage),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const PricingPage = dynamic(
  () => import("./components/PricingPage").then((module) => module.PricingPage),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const CustomPlanPage = dynamic(
  () =>
    import("./components/CustomPlanPage").then(
      (module) => module.CustomPlanPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const CloudCoreDashboard = dynamic(
  () =>
    import("./components/CloudCoreDashboard").then(
      (module) => module.CloudCoreDashboard,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const ApiSandboxPage = dynamic(
  () =>
    import("./components/ApiSandboxPage").then(
      (module) => module.ApiSandboxPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
);
const SiteSettingsPage = dynamic(
  () =>
    import("./components/SiteSettingsPage").then(
      (module) => module.SiteSettingsPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="list" /> },
);
const PaymentMethodsPage = dynamic(
  () =>
    import("./components/PaymentMethodsPage").then(
      (module) => module.PaymentMethodsPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="list" /> },
);
const CommandPalette = dynamic(
  () =>
    import("./components/CommandPalette").then(
      (module) => module.CommandPalette,
    ),
  { ssr: false },
);
const ShortcutsDialog = dynamic(
  () =>
    import("./components/ShortcutsDialog").then(
      (module) => module.ShortcutsDialog,
    ),
  { ssr: false },
);
const EditorWorkbench = dynamic(
  () =>
    import("./components/EditorWorkbench").then(
      (module) => module.EditorWorkbench,
    ),
  { ssr: false, loading: PanelLoading },
);
const FullScreenAiPage = dynamic(
  () =>
    import("./components/FullScreenAiPage").then(
      (module) => module.FullScreenAiPage,
    ),
  { ssr: false, loading: () => <AppPageSkeleton variant="dashboard" /> },
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
  const {
    page,
    setPage,
    isClientStorageHydrated,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isTerminalOpen,
    setIsTerminalOpen,
  } = useApp();
  const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false);
  const editorReady = React.useRef(false);
  const pendingEditorActions = React.useRef<string[]>([]);
  const [isPageVisible, setIsPageVisible] = React.useState(false);

  React.useEffect(() => {
    prefetchLikelyNextPages(page);
    if (page !== "editor") editorReady.current = false;
  }, [page]);

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const shortcut = SHORTCUTS.find(
        (candidate) =>
          !candidate.monaco &&
          (candidate.global ||
            candidate.id === "shortcuts-dialog" ||
            candidate.action === "toggle-terminal") &&
          matchesShortcut(event, candidate),
      );
      if (!shortcut) return;
      if (
        isTypingTarget(event.target) &&
        !shortcut.global &&
        shortcut.id !== "shortcuts-dialog"
      ) {
        return;
      }
      if (shortcut.id === "shortcuts-dialog" && isTypingTarget(event.target)) {
        return;
      }

      if (shortcut.action === "command-palette") {
        event.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
        event.stopImmediatePropagation();
      } else if (shortcut.action === "theme-page") {
        event.preventDefault();
        setPage("theme");
      } else if (shortcut.action === "shortcuts-dialog") {
        event.preventDefault();
        setIsShortcutsOpen((open) => !open);
        event.stopImmediatePropagation();
      } else if (shortcut.action === "toggle-terminal") {
        event.preventDefault();
        if (page !== "editor") {
          setPage("editor");
          setIsTerminalOpen(true);
        } else {
          setIsTerminalOpen(!isTerminalOpen);
        }
        event.stopImmediatePropagation();
      } else if (shortcut.action === "run") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("devpulse:request-run"));
      } else if (shortcut.action === "close-topmost") {
        const overlays = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="alertdialog"], .ide-modal-backdrop, .command-palette-backdrop, .settings-shortcut-menu, #sidebar-account-menu, .editor-tab-menu, .editor-breadcrumb-menu, [role="listbox"], [data-shortcut-close-owner="shell-mobile"]',
          ),
        );
        const zIndex = (element: HTMLElement) => {
          let current: HTMLElement | null = element;
          while (current) {
            const value = Number.parseInt(
              window.getComputedStyle(current).zIndex,
              10,
            );
            if (Number.isFinite(value)) return value;
            current = current.parentElement;
          }
          return 0;
        };
        const topmost = overlays.reduce<HTMLElement | null>(
          (top, overlay) =>
            !top || zIndex(overlay) >= zIndex(top) ? overlay : top,
          null,
        );
        if (!topmost) return;

        const owner = topmost.closest('[role="alertdialog"]')
          ? "modal-host"
          : topmost.closest("#sidebar-account-menu")
            ? "shell-account"
            : topmost.closest(".settings-shortcut-menu")
              ? "shell-settings"
              : topmost.closest("[data-shortcut-close-owner='shell-mobile']")
                ? "shell-mobile"
                : topmost.closest(".command-palette-backdrop")
                  ? "command-palette"
                  : topmost.closest(".ide-modal-backdrop")?.querySelector(
                        '[aria-label="Keyboard shortcuts"]',
                      )
                    ? "shortcuts"
                    : "editor";
        event.preventDefault();
        if (owner === "command-palette") setIsCommandPaletteOpen(false);
        else if (owner === "shortcuts") setIsShortcutsOpen(false);
        else
          window.dispatchEvent(
            new CustomEvent("devpulse:close-topmost", { detail: owner }),
          );
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    isCommandPaletteOpen,
    isShortcutsOpen,
    isTerminalOpen,
    page,
    setIsCommandPaletteOpen,
    setIsTerminalOpen,
    setPage,
  ]);

  React.useEffect(() => {
    const openShortcuts = () => setIsShortcutsOpen(true);
    const queueEditorAction = (event: Event) => {
      const action =
        (event as CustomEvent<string>).detail ??
        "run";
      if (page === "editor" && editorReady.current) {
        window.dispatchEvent(
          new CustomEvent("devpulse:editor-action", { detail: action }),
        );
      } else {
        pendingEditorActions.current.push(action);
        setPage("editor");
      }
    };
    const queueRun = () =>
      queueEditorAction(new CustomEvent("devpulse:request-editor-action", { detail: "run" }));
    const editorMounted = () => {
      editorReady.current = true;
      for (const action of pendingEditorActions.current.splice(0)) {
        window.dispatchEvent(
          new CustomEvent("devpulse:editor-action", { detail: action }),
        );
      }
    };
    window.addEventListener("devpulse:open-shortcuts", openShortcuts);
    window.addEventListener("devpulse:request-run", queueRun);
    window.addEventListener("devpulse:request-editor-action", queueEditorAction);
    window.addEventListener("devpulse:editor-ready", editorMounted);
    return () => {
      window.removeEventListener("devpulse:open-shortcuts", openShortcuts);
      window.removeEventListener("devpulse:request-run", queueRun);
      window.removeEventListener("devpulse:request-editor-action", queueEditorAction);
      window.removeEventListener("devpulse:editor-ready", editorMounted);
    };
  }, [page, setPage]);

  React.useEffect(() => {
    setIsPageVisible(false);
    const frame = window.requestAnimationFrame(() => setIsPageVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [page]);

  if (!isClientStorageHydrated) {
    return (
      <>
        <main
          className="flex min-h-screen items-center justify-center bg-ide-shell-bg text-sm text-ide-text-soft"
          aria-busy="true"
          aria-live="polite"
        >
          Loading workspace...
        </main>
        {isCommandPaletteOpen && <CommandPalette />}
        {isShortcutsOpen && (
          <ShortcutsDialog open onClose={() => setIsShortcutsOpen(false)} />
        )}
      </>
    );
  }

  // 1. Initial State: Login Page
  if (page === "login") {
    return (
      <>
        <div className={`page-fade-in min-h-screen ${isPageVisible ? "is-visible" : ""}`}>
          <LoginPage />
        </div>
        {isCommandPaletteOpen && <CommandPalette />}
        {isShortcutsOpen && (
          <ShortcutsDialog open onClose={() => setIsShortcutsOpen(false)} />
        )}
      </>
    );
  }

  // 2. Step 2: Theme Palette
  if (page === "theme") {
    return (
      <>
        <div className={`page-fade-in min-h-screen ${isPageVisible ? "is-visible" : ""}`}>
          <ThemePalettePage />
        </div>
        {isCommandPaletteOpen && <CommandPalette />}
        {isShortcutsOpen && (
          <ShortcutsDialog open onClose={() => setIsShortcutsOpen(false)} />
        )}
      </>
    );
  }

  // 3. Platform & Workbench Pages
  return (
    <>
      <AppShell>
        <div className={`page-fade-in ${page === "editor" ? "h-full" : "min-h-full"} ${isPageVisible ? "is-visible" : ""}`}>
          {page === "repositories" && <RepositoriesPage />}
          {page === "workspaces" && <WorkspacesPage />}
          {page === "activity" && <ActivityPage />}
          {page === "deployments" && <DeploymentsPage />}
          {(page === "chat" || page === "remote-control") && <TeamChatPage />}
          {page === "editor" && <EditorWorkbench />}
          {page === "ai-studio" && <FullScreenAiPage />}
          {page === "pricing" && <PricingPage />}
          {page === "custom-plan" && <CustomPlanPage />}
          {page === "cloud-core" && <CloudCoreDashboard />}
          {page === "api-sandbox" && <ApiSandboxPage />}
          {page === "settings" && <SiteSettingsPage />}
          {page === "payment-methods" && <PaymentMethodsPage />}
        </div>
      </AppShell>
      {isCommandPaletteOpen && <CommandPalette />}
      {isShortcutsOpen && (
        <ShortcutsDialog open onClose={() => setIsShortcutsOpen(false)} />
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <AppProvider>
      <HuddleProvider>
        <AppErrorBoundary>
          <MainAppContent />
          <ModalHost />
        </AppErrorBoundary>
      </HuddleProvider>
    </AppProvider>
  );
}
