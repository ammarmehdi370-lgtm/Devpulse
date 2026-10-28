"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp, PageType } from "../context/AppContext";
import { getSocket } from "../../src/lib/socket-client";
import { DevpulseLogo } from "../../src/components/DevpulseLogo";
import {
  Code2,
  Activity,
  Rocket,
  Database,
  MessageSquare,
  Search,
  ChevronDown,
  Palette,
  LogOut,
  Terminal,
  Sparkles,
  MonitorPlay,
  CreditCard,
  Radio,
  GitBranch,
  FolderTree,
  Split,
  Columns,
  ArrowLeft,
  Bell,
  CheckCircle,
  X,
  Menu,
  Server,
  Keyboard,
  Settings2,
  type LucideIcon,
} from "lucide-react";

const PLATFORM_PAGES: Array<{
  id: PageType;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  inSidebar: boolean;
}> = [
  { id: "workspaces", label: "Workspaces", icon: Server, shortcut: "Alt+W", inSidebar: true },
  { id: "repositories", label: "Repositories", icon: GitBranch, shortcut: "Alt+R", inSidebar: true },
  { id: "editor", label: "Editor", icon: Code2, shortcut: "Alt+E", inSidebar: true },
  { id: "deployments", label: "Deployments", icon: Rocket, shortcut: "Alt+D", inSidebar: true },
  { id: "chat", label: "Team Chat", icon: MessageSquare, shortcut: "Alt+C", inSidebar: true },
  { id: "ai-studio", label: "AI Studio", icon: Sparkles, shortcut: "Alt+A", inSidebar: true },
  { id: "remote-control", label: "Remote Control", icon: MonitorPlay, inSidebar: true },
  { id: "activity", label: "Activity", icon: Activity, shortcut: "Alt+Y", inSidebar: true },
  { id: "pricing", label: "Plans", icon: CreditCard, shortcut: "Alt+P", inSidebar: true },
  { id: "settings", label: "Settings", icon: Settings2, inSidebar: false },
  { id: "payment-methods", label: "Payment Methods", icon: CreditCard, inSidebar: false },
];

const sidebarItems = PLATFORM_PAGES.filter((item) => item.inSidebar);

function SidebarNavItem({
  item,
  isActive,
  onClick,
}: {
  item: (typeof PLATFORM_PAGES)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${item.label}${item.shortcut ? ` ${item.shortcut}` : ""}`}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
        isActive
          ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 ${
          isActive
            ? "text-[var(--accent-fg)]"
            : "text-[var(--muted)] group-hover:text-[var(--text)]"
        }`}
      />
      <span className="truncate font-medium">{item.label}</span>
      {isActive && (
        <span
          aria-hidden="true"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-fg)] opacity-70"
        />
      )}
    </button>
  );
}

export const AppShell: React.FC<{ children?: React.ReactNode; minimal?: boolean }> = ({
  children,
  minimal = false,
}) => {
  const {
    page,
    setPage,
    theme,
    user,
    logout,
    setIsCommandPaletteOpen,
    setIsEditorProjectOpen,
    setIsFileTreeOpen,
    loadedProjectName,
    workspaces,
  } = useApp();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setIsSocketConnected(false);
      return;
    }

    const updateConnectionStatus = () =>
      setIsSocketConnected(socket.connected);
    socket.on("connect", updateConnectionStatus);
    socket.on("disconnect", updateConnectionStatus);
    updateConnectionStatus();

    return () => {
      socket.off("connect", updateConnectionStatus);
      socket.off("disconnect", updateConnectionStatus);
    };
  }, []);

  if (minimal) {
    return (
      <div className="flex h-screen flex-col bg-[var(--workbench-bg)] text-[var(--text)]">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--topbar-bg)] px-3">
          <button
            type="button"
            onClick={() => setPage("repositories")}
            aria-label="Go to repositories"
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <DevpulseLogo size="sm" variant="full" theme="dark" />
          </button>

          <span className="text-xs text-[var(--muted)]">
            {page === "editor" ? loadedProjectName || "Editor" : "AI Studio"}
          </span>

          <button
            type="button"
            onClick={() => setPage("repositories")}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit to platform
          </button>
        </header>

        {children}
      </div>
    );
  }

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const navigate = (target: PageType) => {
    if (target === "editor") setIsEditorProjectOpen(false);
    setPage(target);
    setMobileNavOpen(false);
    setAccountMenuOpen(false);
    setNotifOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAccountMenuOpen(false);
      setNotifOpen(false);
      setMobileNavOpen(false);
      setIsShortcutsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const showShortcuts = () => setIsShortcutsOpen(true);
    window.addEventListener("devpulse:show-shortcuts", showShortcuts);
    return () => window.removeEventListener("devpulse:show-shortcuts", showShortcuts);
  }, []);

  useEffect(() => {
    const shortcuts: Record<string, PageType> = {
      w: "workspaces",
      r: "repositories",
      e: "editor",
      d: "deployments",
      c: "chat",
      a: "ai-studio",
      p: "pricing",
      y: "activity",
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const pageTarget = shortcuts[event.key.toLowerCase()];
        if (pageTarget) {
          event.preventDefault();
          if (pageTarget === "editor") setIsEditorProjectOpen(false);
          setPage(pageTarget);
          setMobileNavOpen(false);
          setAccountMenuOpen(false);
          setNotifOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsEditorProjectOpen, setPage]);

  // Check if current view is Workbench mode (Screenshots 1 & 3)
  const isWorkbenchMode = page === "editor" || page === "ai-studio";

  // Workbench items (Matches Screenshot 1 & 3 exactly)
  const workbenchNavItems = [
    {
      id: "editor",
      label: "<> Editor",
      icon: Code2,
      badge: "<3",
      active: page === "editor",
    },
    {
      id: "explorer",
      label: "Explorer",
      icon: FolderTree,
      badge: "~2",
      action: () => {
        setPage("editor");
        setIsFileTreeOpen(true);
      },
    },
    {
      id: "source-control",
      label: "Source Control",
      icon: GitBranch,
      badge: "main",
      badgeColor: "bg-[var(--secondary)]/15 text-[var(--secondary)] border-[var(--secondary)]/30",
      action: () => setPage("repositories"),
    },
    {
      id: "terminal",
      label: "Terminal & Runs",
      icon: Terminal,
      action: () => setPage("editor"),
    },
    {
      id: "deployments",
      label: "Deployments",
      icon: Rocket,
      dot: true,
      action: () => setPage("deployments"),
    },
    {
      id: "databases",
      label: "Databases",
      icon: Database,
      action: () => alert("Postgres Devbox cluster online."),
    },
    {
      id: "api-sandbox",
      label: "API Sandbox",
      icon: Radio,
      action: () => setPage("editor"),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--text)] flex flex-col font-sans select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--topbar-bg)] px-4 flex items-center justify-between z-30 sticky top-0 font-sans">
        {/* Left: Brand + Info String matching screenshots */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("workspaces")}
            aria-label="Go to workspaces"
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <DevpulseLogo size="sm" variant="full" theme="dark" />
          </button>

          {/* Token String displayed in header (Screenshots 3 & 4) */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-toolbar)] border border-[var(--border)] text-[11px] font-mono text-[var(--muted)]">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: theme.primary }}
            />
            <span>
              Primary color:{" "}
              <strong className="text-[var(--text)]">{theme.primary}</strong>
            </span>
            <span>
              - Font: <strong className="text-[var(--text)]">{theme.font}</strong>
            </span>
            <span>
              - Mode: <strong className="text-[var(--text)]">{theme.mode}</strong>
            </span>
            <span>
              - Roundness:{" "}
              <strong className="text-[var(--text)]">{theme.roundness}</strong>
            </span>
          </div>

          {/* Active workspace or editor repository context */}
          <div className="hidden lg:flex items-center gap-2 border-l border-[var(--border-subtle)] pl-3">
            {page === "editor" && loadedProjectName ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("repositories")}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
                  title="Open repositories"
                >
                  <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="max-w-36 truncate font-mono text-xs">
                    {loadedProjectName}
                  </span>
                </button>
                <span aria-hidden="true" className="text-[var(--subtle)]">/</span>
                <span className="text-xs font-mono text-[var(--muted)]">
                  main
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate("workspaces")}
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
                title="Open workspaces"
              >
                <Server aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="max-w-40 truncate">
                  {workspaces[0]?.name ?? "No workspace"}
                </span>
              </button>
            )}
          </div>

          {/* Header action shortcuts */}
          <nav aria-label="Quick navigation" className="hidden xl:flex items-center gap-1 pl-1">
            {[
              { id: "editor" as const, label: "Editor", icon: Code2 },
              { id: "ai-studio" as const, label: "AI Studio", icon: Sparkles },
              { id: "pricing" as const, label: "Plans", icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                aria-current={page === id ? "page" : undefined}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Quick Jump, Status, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            className="rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] md:hidden"
          >
            <Menu aria-hidden="true" className="h-4 w-4" />
          </button>

          {/* Quick jump to palette */}
          <button
            onClick={() => setPage("theme")}
            title="Theme Palette"
            className="p-1.5 rounded-lg bg-[var(--surface-control)] hover:bg-[var(--surface-control-hover)] border border-[var(--border-control)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: theme.primary }} />
            <span className="hidden md:inline">Theme</span>
          </button>

          {/* Search or jump to... Ctrl+K */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-toolbar)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--muted)] transition-colors font-mono"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search or jump to...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] text-[10px] text-[var(--text-secondary)] border border-[var(--border-control)]">
              Ctrl+K
            </kbd>
          </button>

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((open) => !open)}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              className="relative rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <Bell aria-hidden="true" className="h-4 w-4" />
            </button>
            {notifOpen && (
              <section
                aria-label="Notifications"
                className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
                  <span className="text-sm font-medium text-[var(--text)]">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                    className="text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="px-3 py-8 text-center">
                  <CheckCircle aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-[var(--muted)]" />
                  <p className="text-sm text-[var(--muted)]">No new notifications.</p>
                  <p className="mt-1 text-xs text-[var(--subtle)]">Workspace status is clear.</p>
                </div>
              </section>
            )}
          </div>

          {/* Account menu */}
          <div ref={accountRef} className="relative border-l border-[var(--border-subtle)] pl-2">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label={`Account menu for ${user.name}`}
              aria-expanded={accountMenuOpen}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--hover)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-fg)]">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
                <span className="max-w-[120px] truncate text-xs font-semibold text-[var(--text)]">{user.name}</span>
                <span className="max-w-[120px] truncate text-[10px] text-[var(--muted)]">{user.email}</span>
              </span>
              <ChevronDown aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-[var(--muted)]" />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-xl">
                <div className="border-b border-[var(--border-subtle)] px-3 py-2">
                  <p className="text-xs font-medium text-[var(--text)]">{user.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">{user.role}</p>
                </div>
                {[
                  { label: "Settings", icon: Settings2, action: () => navigate("settings") },
                  { label: "Theme", icon: Palette, action: () => navigate("theme") },
                  {
                    label: "Keyboard shortcuts",
                    icon: Keyboard,
                    action: () => {
                      setIsShortcutsOpen(true);
                      setAccountMenuOpen(false);
                    },
                  },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[var(--muted)]" />
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-[var(--border-subtle)]" />
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--hover)]"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isShortcutsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsShortcutsOpen(false);
          }}
        >
          <section
            aria-labelledby="keyboard-shortcuts-title"
            aria-modal="true"
            role="dialog"
            className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="keyboard-shortcuts-title" className="text-sm font-semibold text-[var(--text)]">Keyboard shortcuts</h2>
              <button type="button" onClick={() => setIsShortcutsOpen(false)} aria-label="Close keyboard shortcuts">
                <X aria-hidden="true" className="h-4 w-4 text-[var(--muted)]" />
              </button>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              {PLATFORM_PAGES.filter((item) => item.shortcut).map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.label}</span><kbd className="font-mono">{item.shortcut}</kbd>
                </li>
              ))}
              <li className="flex justify-between"><span>Command palette</span><kbd className="font-mono">Ctrl/⌘+K</kbd></li>
            </ul>
          </section>
        </div>
      )}

      {/* Body with Sidebar and Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* DUAL MODE SIDEBAR */}

        {/* 1. WORKBENCH MODE SIDEBAR (Matches Screenshot 1 & Screenshot 3 Left Sidebar) */}
        {isWorkbenchMode ? (
          <aside className="w-56 bg-[var(--sidebar-bg)] border-r border-[var(--border-subtle)] flex flex-col justify-between shrink-0 hidden md:flex font-sans">
            <div className="p-3 space-y-5">
              {/* Top Header */}
              <div>
                <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--subtle)]">
                  <span>WORKBENCH</span>
                  <span className="cursor-pointer hover:text-[var(--text)]">•••</span>
                </div>

                <nav className="space-y-1">
                  {workbenchNavItems.map((item) => {
                    const Icon = item.icon;
                    const isSelected =
                      item.id === "editor" && page === "editor";
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.action) item.action();
                          else setPage(item.id as PageType);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "text-[var(--accent-fg)] font-bold shadow-md"
                            : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                        }`}
                        style={
                          isSelected ? { backgroundColor: theme.primary } : {}
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${item.badgeColor || (isSelected ? "bg-[var(--surface-hover)] text-[var(--text)]" : "bg-[var(--surface-card-alt)] text-[var(--muted)]")}`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {item.dot && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Return to Platform Link */}
              <button
                onClick={() => setPage("workspaces")}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Workbench</span>
              </button>
            </div>

            {/* Bottom Telemetry Gauges (Pixel-Perfect to Screenshot 1 & 3) */}
            <div className="p-3 border-t border-[var(--border-subtle)] space-y-3 font-mono text-xs">
              <div className="text-[10px] text-[var(--subtle)] uppercase tracking-wider">
                TELEMETRY
              </div>

              {/* CPU gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>CPU (8 Cores)</span>
                  <span className="text-[var(--success)] font-bold">18.4%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-control)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--success)] rounded-full w-[18.4%]" />
                </div>
              </div>

              {/* Memory gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Memory</span>
                  <span className="text-[var(--text)] font-bold">1.42 / 4 GB</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-control)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full w-[35.5%]" />
                </div>
              </div>

              {/* Settings Footer */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[var(--muted)]">
                <button
                  onClick={() => setPage("theme")}
                  className="hover:text-[var(--text)] flex items-center gap-1.5 text-xs"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme</span>
                </button>
                <div className="flex items-center gap-2">
                  <Split className="w-3.5 h-3.5 hover:text-[var(--text)] cursor-pointer" />
                  <Columns className="w-3.5 h-3.5 hover:text-[var(--text)] cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--border-subtle)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isSocketConnected ? "bg-[var(--success)]" : "animate-pulse bg-[var(--warning)]"}`} />
                <span className="text-xs text-[var(--muted)]">
                  {isSocketConnected ? "Connected" : "Browser mode — local only"}
                </span>
              </div>
            </div>
          </aside>
        ) : (
          /* 2. PLATFORM MODE SIDEBAR (Screenshots 3, 4, 5) */
          <aside className="w-56 bg-[var(--sidebar-bg)] border-r border-[var(--border-subtle)] flex flex-col justify-between shrink-0 hidden md:flex font-sans">
            <div className="p-3 space-y-6">
              {/* Platform Section */}
              <div>
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--subtle)]">
                  PLATFORM
                </div>
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      isActive={page === item.id}
                      onClick={() => navigate(item.id)}
                    />
                  ))}
                </nav>
              </div>

              {/* System Section */}
              <div>
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--subtle)]">
                  SYSTEM
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setPage("theme")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Theme</span>
                  </button>
                </div>

                {/* Memory usage bar */}
                <div className="mt-4 px-3 py-2 rounded-xl bg-[var(--sidebar-surface)] border border-[var(--border)] text-[11px] font-mono">
                  <div className="flex justify-between text-[var(--muted)] mb-1.5">
                    <span>Memory usage</span>
                    <span className="text-[var(--text)] font-bold">64%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-control)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] rounded-full w-[64%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isSocketConnected ? "bg-[var(--success)]" : "animate-pulse bg-[var(--warning)]"}`} />
                <span className="text-xs text-[var(--muted)]">
                  {isSocketConnected ? "Connected" : "Browser mode — local only"}
                </span>
              </div>
            </div>
          </aside>
        )}

        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-[var(--overlay)] md:hidden"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileNavOpen(false);
            }}
          >
            <aside
              aria-label="Platform navigation"
              className="flex h-full w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--text)]">Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <nav aria-label="Platform" className="flex-1 space-y-1 overflow-y-auto p-3">
                {sidebarItems.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    isActive={page === item.id}
                    onClick={() => navigate(item.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => navigate("theme")}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
                >
                  <Palette aria-hidden="true" className="h-4 w-4 text-[var(--muted)]" />
                  Theme
                </button>
              </nav>
              <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-3 py-3">
                <span className={`h-2 w-2 rounded-full ${isSocketConnected ? "bg-[var(--success)]" : "animate-pulse bg-[var(--warning)]"}`} />
                <span className="text-xs text-[var(--muted)]">
                  {isSocketConnected ? "Connected" : "Browser mode — local only"}
                </span>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-[var(--app-content-bg)]">{children}</main>
      </div>
    </div>
  );
};
