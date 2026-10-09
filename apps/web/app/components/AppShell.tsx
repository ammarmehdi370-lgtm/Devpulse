"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp, PageType } from "../context/AppContext";
import { ToastContainer } from "./ToastContainer";
import { friendlyAlert } from "./FriendlyHelpers";
import { OnboardingTour } from "./OnboardingTour";
import { LOGO_COLORS } from "../logoColors";
import {
  Box,
  GitFork,
  Code2,
  Rocket,
  Database,
  MessageSquare,
  Settings,
  Search,
  Layers,
  ChevronDown,
  Palette,
  LogOut,
  Terminal,
  Sparkles,
  Monitor,
  CreditCard,
  Cpu,
  Radio,
  Activity,
  GitBranch,
  FolderTree,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Menu,
  X,
  Bell,
  Gauge,
} from "lucide-react";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    page,
    setPage,
    theme,
    user,
    logout,
    setIsCommandPaletteOpen,
    setIsFileTreeOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    isTerminalFocused,
    setIsTerminalFocused,
  } = useApp();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarPreferenceHydrated, setIsSidebarPreferenceHydrated] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accountMenuPosition, setAccountMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const accountMenuTriggerRef = useRef<HTMLDivElement>(null);
  const accountMenuPortalRef = useRef<HTMLDivElement>(null);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const workbenchSidebarContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("devpulse-workbench-sidebar-open");
      if (stored !== null) setIsSidebarOpen(stored === "true");
    } catch (error) {
      console.error("Unable to restore workbench sidebar preference.", error);
    }
    setIsSidebarPreferenceHydrated(true);
  }, []);

  useEffect(() => {
    if (!isSidebarPreferenceHydrated) return;
    try {
      window.localStorage.setItem(
        "devpulse-workbench-sidebar-open",
        String(isSidebarOpen),
      );
    } catch (error) {
      console.error("Unable to save workbench sidebar preference.", error);
    }
  }, [isSidebarOpen, isSidebarPreferenceHydrated]);

  useEffect(() => {
    const handleTerminalShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === "Backquote") {
        event.preventDefault();
        if (page !== "editor") {
          setPage("editor");
          setIsTerminalOpen(true);
        } else {
          setIsTerminalOpen((open) => !open);
        }
      }
    };

    document.addEventListener("keydown", handleTerminalShortcut);
    return () =>
      document.removeEventListener("keydown", handleTerminalShortcut);
  }, [page, setIsTerminalOpen, setPage]);

  const toggleAccountMenu = (trigger: HTMLButtonElement) => {
    if (isAccountMenuOpen) {
      setIsAccountMenuOpen(false);
      return;
    }
    const bounds = trigger.getBoundingClientRect();
    const menuWidth = 288;
    const menuHeight = 276;
    setAccountMenuPosition({
      top: Math.max(
        8,
        Math.min(
          bounds.top - menuHeight + 8,
          window.innerHeight - menuHeight - 8,
        ),
      ),
      left: Math.max(
        8,
        Math.min(bounds.right + 8, window.innerWidth - menuWidth - 8),
      ),
    });
    setIsAccountMenuOpen(true);
  };

  const renderAccountButton = (compact = false) => (
    <div
      className={`relative ${compact ? "flex justify-center" : ""}`}
      ref={accountMenuTriggerRef}
    >
      <button
        type="button"
        onClick={(event) => toggleAccountMenu(event.currentTarget)}
        title={`Account menu for ${user.name}`}
        aria-label={`Account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={isAccountMenuOpen}
        aria-controls="sidebar-account-menu"
        className={`group flex items-center rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
          compact
            ? "h-10 w-10 justify-center border-transparent bg-transparent p-1 hover:border-[color-mix(in_srgb,var(--ide-color-text-strong)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_5%,transparent)]"
            : "w-full gap-2.5 border-[color-mix(in_srgb,var(--ide-color-text-strong)_6%,transparent)] bg-[color-mix(in_srgb,var(--ide-color-text-strong)_2.5%,transparent)] p-2 hover:border-[color-mix(in_srgb,var(--ide-color-text-strong)_11%,transparent)] hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_4.5%,transparent)]"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--ide-color-secondary)_20%,transparent)] bg-[color-mix(in_srgb,var(--ide-color-secondary)_12%,transparent)] text-[11px] font-semibold tracking-[0.04em] text-ide-secondary transition group-hover:border-[color-mix(in_srgb,var(--ide-color-secondary)_35%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--ide-color-secondary)_18%,transparent)]">
          {user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-ide-text-high transition-colors group-hover:text-ide-text-strong">
                {user.name}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-ide-muted">
                {user.email}
              </span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-ide-muted transition-transform ${
                isAccountMenuOpen ? "rotate-180 text-ide-accent" : ""
              }`}
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </div>
  );

  const toggleSettingsMenu = (trigger: HTMLButtonElement) => {
    if (settingsMenuPosition) {
      setSettingsMenuPosition(null);
      return;
    }
    const bounds = trigger.getBoundingClientRect();
    setSettingsMenuPosition({
      top: Math.max(8, Math.min(bounds.top, window.innerHeight - 176)),
      left: Math.max(8, Math.min(bounds.right + 8, window.innerWidth - 264)),
    });
  };

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !accountMenuTriggerRef.current?.contains(event.target) &&
        !accountMenuPortalRef.current?.contains(event.target)
      ) {
        setIsAccountMenuOpen(false);
        setAccountMenuPosition(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setAccountMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!settingsMenuPosition) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !settingsMenuRef.current?.contains(event.target) &&
        !settingsTriggerRef.current?.contains(event.target)
      ) {
        setSettingsMenuPosition(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsMenuPosition(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuPosition]);

  useEffect(() => {
    try {
      const storedPreferences = window.localStorage.getItem(
        "devpulse_ui_preferences",
      );
      if (!storedPreferences) return;

      const parsed: unknown = JSON.parse(storedPreferences);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("density" in parsed) ||
        (parsed.density !== "comfortable" && parsed.density !== "compact") ||
        !("reduceMotion" in parsed) ||
        typeof parsed.reduceMotion !== "boolean"
      ) {
        throw new Error("Saved interface preferences are invalid.");
      }

      document.documentElement.dataset.uiDensity = parsed.density;
      document.documentElement.dataset.reduceMotion = String(
        parsed.reduceMotion,
      );
    } catch (error) {
      console.error("Unable to restore Devpulse interface preferences.", error);
    }
  }, []);

  // Check if current view is Workbench mode (Screenshots 1 & 3)
  const isWorkbenchMode = page === "editor" || page === "api-sandbox";
  const isCompactCloudCore = page === "cloud-core";
  const isAiStudio = page === "ai-studio";

  useEffect(() => {
    if (!isTerminalOpen || page !== "editor") setIsTerminalFocused(false);
  }, [isTerminalOpen, page, setIsTerminalFocused]);
  // Standard platform items
  const platformNavItems: {
    id: PageType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "workspaces", label: "Your Workspaces", icon: Box },
    { id: "activity", label: "Your Activity", icon: Activity },
    { id: "cloud-core", label: "Cloud Core Engine", icon: Gauge },
    { id: "repositories", label: "Your Code Projects", icon: GitFork },
    { id: "editor", label: "Code Editor", icon: Code2 },
    { id: "deployments", label: "Live Releases", icon: Rocket },
    { id: "remote-control", label: "Pulse Pilot", icon: Monitor },
    { id: "ai-studio", label: "AI Assistant", icon: Sparkles },
    { id: "pricing", label: "Plans & Billing", icon: CreditCard },
    { id: "chat", label: "Team Chat", icon: MessageSquare },
  ];

  // Workbench items (Matches Screenshot 1 & 3 exactly)
  const workbenchNavItems = [
    {
      id: "editor",
      label: "Code Editor",
      icon: Code2,
      active: page === "editor",
      action: () => {
        setPage("editor");
        setIsTerminalOpen(false);
        setIsTerminalFocused(false);
      },
    },
    {
      id: "explorer",
      label: "Explorer",
      icon: FolderTree,
      action: () => {
        setPage("editor");
        setIsFileTreeOpen(true);
      },
    },
    {
      id: "source-control",
      label: "Source Control",
      icon: GitBranch,
      action: () => setPage("repositories"),
    },
    {
      id: "terminal",
      label: "Terminal & Runs",
      icon: Terminal,
      action: () => {
        setPage("editor");
        setIsTerminalOpen(true);
        setIsTerminalFocused(true);
      },
    },
    {
      id: "deployments",
      label: "Deployments",
      icon: Rocket,
      action: () => setPage("deployments"),
    },
    {
      id: "databases",
      label: "Databases",
      icon: Database,
      action: () => void friendlyAlert("Postgres Devbox cluster online."),
    },
    {
      id: "api-sandbox",
      label: "API Sandbox",
      icon: Radio,
      action: () => setPage("api-sandbox"),
    },
  ];

  useEffect(() => {
    if (isWorkbenchMode && workbenchSidebarContentRef.current) {
      workbenchSidebarContentRef.current.scrollTop = 0;
    }
  }, [isWorkbenchMode, page]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-ide-shell-bg font-sans text-ide-text-high select-none">
      {/* Floating Top Navigation Bar */}
      <div className="topbar-shell relative z-30 shrink-0">
        <header className="topbar relative grid h-14 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-ide-border bg-ide-topbar-bg px-3 shadow-[0_5px_18px_color-mix(in_srgb,var(--ide-color-shadow-color)_45%,transparent)] sm:px-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-6">
          {/* Left: Brand + Info String matching screenshots */}
          <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            <div
              onClick={() => setPage("workspaces")}
              className="flex shrink-0 cursor-pointer items-center gap-2 group"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: LOGO_COLORS.background,
                  color: LOGO_COLORS.foreground,
                  boxShadow: LOGO_COLORS.shadow,
                }}
              >
                <Layers className="h-4 w-4" />
              </div>
              <span
                className="text-[13px] font-semibold tracking-tight"
                style={{ color: LOGO_COLORS.wordmark }}
              >
                Devpulse
              </span>
            </div>

            <span
              className="hidden h-5 w-px shrink-0 bg-[color-mix(in_srgb,var(--ide-color-text-strong)_10%,transparent)] sm:block"
              aria-hidden="true"
            />

            <div className="topbar-breadcrumbs hidden min-w-0 items-center gap-1 text-[11px] sm:flex">
              <span className="truncate text-ide-muted">Workspace</span>
              <span className="text-[color:color-mix(in_srgb,var(--ide-color-text-strong)_20%,transparent)]">/</span>
              <span className="truncate font-medium text-ide-text">
                {page === "editor"
                  ? "Maestro Code Studio"
                  : page === "ai-studio"
                    ? "AI Studio"
                    : page === "api-sandbox"
                      ? "API Sandbox"
                      : page === "deployments"
                        ? "Releases"
                        : page === "repositories"
                          ? "Projects"
                          : page === "settings"
                            ? "Settings"
                            : page === "payment-methods"
                              ? "Payment methods"
                              : "Overview"}
              </span>
            </div>
          </div>

          {/* Primary navigation */}
          <nav
            className="hidden items-center gap-0.5 rounded-xl border border-ide-border-subtle bg-ide-panel p-1 xl:flex"
            aria-label="Primary navigation"
          >
            {[
              { id: "workspaces", label: "Workspaces", icon: Box },
              { id: "repositories", label: "Projects", icon: GitFork },
              { id: "editor", label: "Editor", icon: Code2 },
              { id: "ai-studio", label: "AI", icon: Sparkles },
              { id: "deployments", label: "Releases", icon: Rocket },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => setPage(link.id as PageType)}
                aria-current={page === link.id ? "page" : undefined}
                className={`topbar-nav-item ${
                  page === link.id ? "topbar-nav-item-active" : ""
                }`}
              >
                <link.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right: Quick Jump, Status, Profile */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:ml-0 xl:flex-1 xl:justify-end xl:gap-2.5">
            {/* Search or jump to... Ctrl+K */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Open command palette"
              className="topbar-pill flex items-center gap-1.5 px-2 sm:px-2.5"
            >
              <Search
                className="w-3.5 h-3.5 text-ide-muted"
                aria-hidden="true"
              />
              <span className="hidden 2xl:inline text-ide-text-soft">Search</span>
              <kbd className="topbar-kbd">
                <span>⌘K</span>
              </kbd>
            </button>

            <button
              onClick={() => setIsMobileNavOpen((open) => !open)}
              aria-label={
                isMobileNavOpen ? "Close navigation" : "Open navigation"
              }
              aria-expanded={isMobileNavOpen}
              className="md:hidden topbar-icon-button"
            >
              {isMobileNavOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

            <button
              className="topbar-icon-button relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-ide-accent"
                aria-label="New notifications"
              />
            </button>

            <div
              className="hidden 2xl:flex items-center gap-2 text-[12px] text-ide-text-soft whitespace-nowrap"
              title="Cluster availability"
            >
              <span className="h-2 w-2 rounded-full bg-ide-accent animate-pulse" />
              <span>Operational</span>
            </div>
          </div>
        </header>
      </div>

      {isMobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40 bg-ide-overlay"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <aside
            className="flex h-full w-72 max-w-[85vw] flex-col overflow-hidden border-r border-ide-border-strong bg-ide-sidebar-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-ide-muted">
              PLATFORM
            </div>
            <nav
              className="min-h-0 flex-1 space-y-1 overflow-y-auto"
              aria-label="Mobile platform navigation"
            >
              {platformNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  page === item.id ||
                  (item.id === "pricing" && page === "custom-plan");
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPage(item.id);
                      setIsMobileNavOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${isActive ? "text-ide-accent-fg font-semibold" : "text-ide-text-secondary hover:bg-ide-surface"}`}
                    style={isActive ? { backgroundColor: theme.primary } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-3 shrink-0 space-y-2 border-t border-ide-border-strong pt-3">
              <div className="px-1 text-[9px] font-mono uppercase tracking-[0.16em] text-ide-muted">
                System · Account
              </div>
              <button
                ref={settingsTriggerRef}
                onClick={(event) => toggleSettingsMenu(event.currentTarget)}
                aria-haspopup="menu"
                aria-expanded={Boolean(settingsMenuPosition)}
                aria-label="Open settings menu"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-ide-muted transition-colors hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_4.5%,transparent)] hover:text-ide-text-strong"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings &amp; Theme</span>
              </button>
              {renderAccountButton()}
            </div>
          </aside>
        </div>
      )}

      {settingsMenuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={settingsMenuRef}
            role="menu"
            aria-label="Settings and theme"
            className="settings-shortcut-menu"
            style={{
              position: "fixed",
              top: settingsMenuPosition.top,
              left: settingsMenuPosition.left,
              zIndex: 100,
            }}
          >
            <div className="settings-shortcut-heading">Preferences</div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSettingsMenuPosition(null);
                setPage("settings");
              }}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>Site settings</strong>
                <small>Appearance and interface</small>
              </span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 opacity-50" />
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSettingsMenuPosition(null);
                setPage("theme");
              }}
            >
              <Palette className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>Theme palette</strong>
                <small>Choose your color palette</small>
              </span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 opacity-50" />
            </button>
          </div>,
          document.body,
        )}

      {isAccountMenuOpen &&
        accountMenuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={accountMenuPortalRef}
            id="sidebar-account-menu"
            role="menu"
            aria-label="Account menu"
            className="w-72 overflow-hidden rounded-2xl border border-ide-border bg-gradient-to-br from-ide-surface-hover via-ide-surface-overlay to-ide-panel p-2 shadow-[0_28px_80px_var(--ide-color-shadow-strong),0_10px_34px_color-mix(in_srgb,var(--ide-color-secondary)_16%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_7%,transparent)] ring-1 ring-ide-shadow-color"
            style={{
              position: "fixed",
              top: accountMenuPosition.top,
              left: accountMenuPosition.left,
              zIndex: 110,
            }}
          >
            <div className="h-px rounded-full bg-gradient-to-r from-ide-accent via-ide-secondary to-ide-tertiary" />
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--ide-color-secondary)_20%,transparent)] bg-[color-mix(in_srgb,var(--ide-color-secondary)_12%,transparent)] text-sm font-semibold tracking-[0.04em] text-ide-secondary">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ide-text-strong">
                  {user.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ide-text-soft">
                  {user.email}
                </span>
              </span>
            </div>
            <div className="mx-2 my-1 border-t border-ide-border" />
            <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ide-muted">
              {user.role}
              {user.handle ? ` · @${user.handle}` : ""}
            </div>
            <div className="mx-2 my-1 border-t border-ide-border" />{" "}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsAccountMenuOpen(false);
                setAccountMenuPosition(null);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ide-danger transition hover:bg-[color-mix(in_srgb,var(--ide-color-danger)_10%,transparent)] hover:text-ide-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>,
          document.body,
        )}

      {/* Body with Sidebar and Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* DUAL MODE SIDEBAR */}

        {/* 1. WORKBENCH MODE SIDEBAR (Matches Screenshot 1 & Screenshot 3 Left Sidebar) */}
        {isWorkbenchMode ? (
          <aside
            className={`${isSidebarOpen ? "w-60" : "w-14"} min-h-0 overflow-hidden border-r border-ide-border-subtle bg-ide-sidebar-surface shadow-[8px_0_28px_color-mix(in_srgb,var(--ide-color-shadow-color)_30%,transparent)] flex flex-col shrink-0 hidden md:flex font-sans transition-[width] duration-200`}
          >
            <div
              ref={workbenchSidebarContentRef}
              className="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-5"
            >
              {/* Top Header */}
              <div className="min-w-0">
                <div
                  className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ide-muted`}
                >
                  {isSidebarOpen && <span>WORKBENCH</span>}
                  <button
                    onClick={() => setIsSidebarOpen((open) => !open)}
                    aria-label={
                      isSidebarOpen
                        ? "Close workbench sidebar"
                        : "Open workbench sidebar"
                    }
                    aria-expanded={isSidebarOpen}
                    title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    className="topbar-icon-button"
                  >
                    {isSidebarOpen ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isSidebarOpen && (
                  <nav className="space-y-1" aria-label="Workbench navigation">
                    {workbenchNavItems.map((item) => {
                      const Icon = item.icon;
                      const isSelected =
                        (item.id === "editor" &&
                          page === "editor" &&
                          !isTerminalFocused) ||
                        (item.id === "terminal" &&
                          page === "editor" &&
                          isTerminalFocused) ||
                        (item.id === "api-sandbox" && page === "api-sandbox");
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) item.action();
                            else setPage(item.id as PageType);
                          }}
                          className={`group relative w-full flex items-center rounded-lg px-2.5 py-2.5 text-[12px] font-medium transition-all duration-150 ${
                            isSelected
                              ? "bg-ide-hover text-ide-text-strong shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_4%,transparent)]"
                              : "text-ide-muted hover:bg-ide-input-bg hover:text-ide-text"
                          }`}
                          aria-current={isSelected ? "page" : undefined}
                        >
                          {isSelected && (
                            <span
                              className="absolute inset-y-2 left-0 w-[2px] rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            />
                          )}
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                                isSelected
                                  ? "bg-[color-mix(in_srgb,var(--ide-color-accent)_10%,transparent)] text-ide-accent"
                                  : "text-ide-muted group-hover:text-ide-text-secondary"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>

              {/* Return to Platform Link */}
              {isSidebarOpen && (
                <button
                  onClick={() => setPage("workspaces")}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-ide-muted transition-colors hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_3.5%,transparent)] hover:text-ide-text-secondary"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit Workbench</span>
                </button>
              )}
            </div>

            <div
              className={`shrink-0 border-t border-ide-surface-hover p-2 ${isSidebarOpen ? "px-3" : "flex justify-center"}`}
            >
              {renderAccountButton(!isSidebarOpen)}
            </div>
          </aside>
        ) : (
          /* 2. PLATFORM MODE SIDEBAR (Screenshots 3, 4, 5) */
          <aside
            className={`${isSidebarOpen ? (isCompactCloudCore ? "flex w-[68px] md:w-60" : "hidden w-60 md:flex") : "hidden w-14 md:flex"} min-h-0 overflow-hidden border-r border-ide-border-subtle bg-ide-sidebar-surface shadow-[8px_0_28px_color-mix(in_srgb,var(--ide-color-shadow-color)_30%,transparent)] flex-col shrink-0 font-sans transition-[width] duration-200`}
          >
            <div
              className={`min-h-0 flex-1 overflow-y-auto space-y-6 ${isSidebarOpen && isCompactCloudCore ? "p-1.5 md:p-3.5" : "p-3.5"}`}
            >
              {/* Platform Section */}
              <div>
                <div
                  className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ide-muted ${isSidebarOpen && isCompactCloudCore ? "hidden md:flex" : ""}`}
                >
                  {isSidebarOpen && <span>PLATFORM</span>}
                  <button
                    onClick={() => setIsSidebarOpen((open) => !open)}
                    aria-label={
                      isSidebarOpen
                        ? "Close platform sidebar"
                        : "Open platform sidebar"
                    }
                    aria-expanded={isSidebarOpen}
                    title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    className="topbar-icon-button"
                  >
                    {isSidebarOpen ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {isSidebarOpen && (
                  <nav className="space-y-1" aria-label="Platform navigation">
                    {platformNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        page === item.id ||
                        (item.id === "pricing" && page === "custom-plan");
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setPage(item.id);
                          }}
                          aria-label={
                            isCompactCloudCore ? item.label : undefined
                          }
                          className={`group relative w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-ide-hover text-ide-text-strong shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_4%,transparent)]"
                              : "text-ide-muted hover:bg-ide-input-bg hover:text-ide-text"
                          } ${isCompactCloudCore ? "justify-center gap-0 px-1.5 md:justify-start md:gap-2.5 md:px-2.5" : ""}`}
                          title={isCompactCloudCore ? item.label : undefined}
                        >
                          {isActive && (
                            <span
                              className="absolute inset-y-2 left-0 w-[2px] rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            />
                          )}
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                              isActive
                                ? "bg-[color-mix(in_srgb,var(--ide-color-accent)_10%,transparent)] text-ide-accent"
                                : "text-ide-muted group-hover:text-ide-text-secondary"
                            } ${isCompactCloudCore ? "md:h-7 md:w-7" : ""}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`truncate ${isCompactCloudCore ? "hidden md:inline" : ""}`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>

              {/* System Section */}
              {isSidebarOpen && (
                <div>
                  <div
                    className={`mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ide-muted ${isCompactCloudCore ? "hidden md:block" : ""}`}
                  >
                    System
                  </div>
                  <div className="space-y-1">
                    <button
                      ref={settingsTriggerRef}
                      onClick={(event) =>
                        toggleSettingsMenu(event.currentTarget)
                      }
                      aria-haspopup="menu"
                      aria-expanded={Boolean(settingsMenuPosition)}
                      aria-label="Open settings menu"
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-ide-muted transition-colors hover:bg-ide-input-bg hover:text-ide-text ${isCompactCloudCore ? "justify-center gap-0 px-1.5 md:justify-start md:gap-2.5 md:px-2.5" : ""}`}
                      title={
                        isCompactCloudCore ? "Settings & Theme" : undefined
                      }
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ide-muted transition group-hover:text-ide-text-secondary">
                        <Settings className="h-4 w-4" />
                      </span>
                      <span
                        className={isCompactCloudCore ? "hidden md:inline" : ""}
                      >
                        Settings & Theme
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`relative z-10 shrink-0 border-t border-ide-border-subtle bg-ide-sidebar-bg p-2 ${isSidebarOpen ? "space-y-2 p-3.5" : "flex justify-center"}`}
            >
              {isSidebarOpen && (
                <div
                  className={`px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ide-muted ${isCompactCloudCore ? "hidden md:block" : ""}`}
                >
                  Account
                </div>
              )}
              {renderAccountButton(!isSidebarOpen)}
              {isSidebarOpen && (
                <div
                  className={`px-1 pt-0.5 text-[9px] text-ide-subtle ${isCompactCloudCore ? "hidden md:block" : ""}`}
                >
                  v2.4.18-edge
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Pane */}
        <main
          className={`${page === "editor" ? "flex flex-col overflow-hidden" : isAiStudio ? "overflow-hidden" : "overflow-y-auto"} min-h-0 flex-1 bg-ide-app-content-bg`}
        >
          <div
            className={
              page === "editor"
                ? "min-h-0 flex-1 overflow-hidden"
                : "min-h-full"
            }
          >
            {children}
          </div>
        </main>
      </div>
      {/* Global Notifications */}
      <ToastContainer />
      {/* First-run Onboarding Tour */}
      {page !== "login" &&
        page !== "editor" &&
        page !== "settings" &&
        page !== "payment-methods" &&
        !isAiStudio && <OnboardingTour />}
    </div>
  );
};
