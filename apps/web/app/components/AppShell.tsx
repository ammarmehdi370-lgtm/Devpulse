"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp, PageType } from "../context/AppContext";
import { ToastContainer } from "./ToastContainer";
import { friendlyAlert } from "./FriendlyHelpers";
import { OnboardingTour } from "./OnboardingTour";
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
  Split,
  Columns,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Menu,
  X,
  Bell,
  Gauge,
  Sun,
  Moon,
  UserRound,
} from "lucide-react";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    page,
    setPage,
    theme,
    colorMode,
    setColorMode,
    user,
    logout,
    setIsCommandPaletteOpen,
    setIsFileTreeOpen,
  } = useApp();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);

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
        !accountMenuRef.current?.contains(event.target)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
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
  const isWorkbenchMode =
    page === "editor" || page === "ai-studio" || page === "api-sandbox";
  const isCompactCloudCore = page === "cloud-core";
  const isAiStudio = page === "ai-studio";
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
      badgeColor: "bg-[#0DF5C4]/15 text-[#0DF5C4] border-[#0DF5C4]/30",
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
      dotLabel: "New deployment available",
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
      badge: "v3.2",
      badgeColor: "bg-[#0369a1]/25 text-[#38bdf8] border-[#0284c7]/40",
      action: () => setPage("api-sandbox"),
    },
  ];

  return (
    <div
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#0a0d0e] font-sans text-[#f5f6f6] select-none"
    >
      {/* Floating Top Navigation Bar */}
      <div className="topbar-shell relative z-30 shrink-0">
      <header className="topbar relative grid h-14 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-white/[0.08] bg-[#101116] px-3 shadow-[0_5px_18px_rgba(0,0,0,0.18)] sm:px-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-6">
        {/* Left: Brand + Info String matching screenshots */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <div
            onClick={() => setPage("workspaces")}
            className="flex shrink-0 cursor-pointer items-center gap-2 group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0DF5C4] text-[#081211] shadow-[0_0_18px_rgba(13,245,196,0.18),inset_0_1px_0_rgba(255,255,255,0.45)] transition-transform group-hover:scale-105">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-[#f5f6f6]">
              Devpulse
            </span>
          </div>

          <span
            className="hidden h-5 w-px shrink-0 bg-white/10 sm:block"
            aria-hidden="true"
          />

          <div className="topbar-breadcrumbs hidden min-w-0 items-center gap-1 text-[11px] sm:flex">
            <span className="truncate text-[#8a8c99]">Workspace</span>
            <span className="text-white/20">/</span>
            <span className="truncate font-medium text-[#d6d8e2]">
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
                        : page === "account-connections"
                          ? "Add account"
                          : page === "payment-methods"
                            ? "Payment methods"
                        : "Overview"}
            </span>
          </div>
        </div>

        {/* Primary navigation */}
        <nav
          className="hidden items-center gap-0.5 rounded-xl border border-white/[0.045] bg-black/25 p-1 xl:flex"
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
          <button
            type="button"
            onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
            className="topbar-icon-button"
          >
            {colorMode === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Search or jump to... Ctrl+K */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command palette"
            className="topbar-pill flex items-center gap-1.5 px-2 sm:px-2.5"
          >
            <Search className="w-3.5 h-3.5 text-[#7d8383]" aria-hidden="true" />
            <span className="hidden 2xl:inline text-[#9aa0a0]">Search</span>
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
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#0DF5C4]"
              aria-label="New notifications"
            />
          </button>

          <div
            className="hidden 2xl:flex items-center gap-2 text-[12px] text-[#9aa0a0] whitespace-nowrap"
            title="Cluster availability"
          >
            <span className="h-2 w-2 rounded-full bg-[#0DF5C4] animate-pulse" />
            <span>Operational</span>
          </div>

          <span
            className="hidden sm:block h-6 w-px bg-[#1c2224] shrink-0"
            aria-hidden="true"
          />

          {/* User Profile and Account Menu */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              className="topbar-account"
              onClick={() => setIsAccountMenuOpen((open) => !open)}
              title="Open account menu"
              aria-label={`Account menu for ${user.name}`}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              aria-controls="topbar-account-menu"
            >
              <span className="topbar-avatar" aria-hidden="true">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="hidden 2xl:inline">{user.name}</span>
              <ChevronDown
                className={`hidden h-3.5 w-3.5 text-[#7d8383] transition-transform sm:block ${isAccountMenuOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {isAccountMenuOpen && (
              <div
                id="topbar-account-menu"
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111219] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_24px_rgba(108,99,255,0.1)] ring-1 ring-black/30"
              >
                <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                  <span className="topbar-avatar h-10 w-10 text-sm" aria-hidden="true">
                    {user.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {user.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#9293a4]">
                      {user.email}
                    </span>
                  </span>
                </div>
                <div className="mx-2 my-1 border-t border-white/[0.08]" />
                <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#77798b]">
                  {user.role}
                  {user.handle ? ` · @${user.handle}` : ""}
                </div>
                <div className="mx-2 my-1 border-t border-white/[0.08]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setPage("account-connections");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#d8d8e4] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]/60"
                >
                  <UserRound className="h-4 w-4 text-[#0DF5C4]" aria-hidden="true" />
                  Add account
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#f2a3a3] transition hover:bg-red-400/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      </div>

      {isMobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40 bg-black/70"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] h-full bg-[#0b0b12] border-r border-[#1e1e2d] p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e]">
              PLATFORM
            </div>
            <nav className="space-y-1" aria-label="Mobile platform navigation">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4] ${isActive ? "text-[#09090e] font-semibold" : "text-[#c4c4dc] hover:bg-[#141420]"}`}
                    style={isActive ? { backgroundColor: theme.primary } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
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

      {/* Body with Sidebar and Main Content */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
      >
        {/* DUAL MODE SIDEBAR */}

        {/* 1. WORKBENCH MODE SIDEBAR (Matches Screenshot 1 & Screenshot 3 Left Sidebar) */}
        {isWorkbenchMode ? (
          <aside
            className={`${isSidebarOpen ? "w-56" : "w-14"} min-h-0 overflow-y-auto bg-[#0c0c14] border-r border-[#1e1e2d] flex flex-col justify-between shrink-0 hidden md:flex font-sans transition-[width] duration-150`}
          >
            <div className="p-3 space-y-5">
              {/* Top Header */}
              <div className="min-w-0">
                <div
                  className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} px-1 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e]`}
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
                  <nav className="space-y-1">
                    {workbenchNavItems.map((item) => {
                      const Icon = item.icon;
                      const isSelected =
                        (item.id === "editor" && page === "editor") ||
                        (item.id === "api-sandbox" && page === "api-sandbox");
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) item.action();
                            else setPage(item.id as PageType);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "text-[#09090e] font-bold shadow-md"
                              : "text-[#8e8ea6] hover:text-[#d0d0e2] hover:bg-[#141422]"
                          }`}
                          aria-current={isSelected ? "page" : undefined}
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
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${item.badgeColor || (isSelected ? "bg-black/20 text-[#09090e]" : "bg-[#181826] text-[#71718c]")}`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {item.dot && (
                            <span
                              title="New deployment available"
                              aria-label="New deployment available"
                              className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse"
                            />
                          )}
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
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono text-[#787896] hover:text-white hover:bg-[#151522] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit Workbench</span>
                </button>
              )}
            </div>

            {/* Bottom Telemetry Gauges (Pixel-Perfect to Screenshot 1 & 3) */}
            {isSidebarOpen && (
              <div className="p-3 border-t border-[#1a1a28] space-y-3 font-mono text-xs">
                <div className="text-[10px] text-[#63637e] uppercase tracking-wider">
                  TELEMETRY
                </div>

                {/* CPU gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8e8ea6]">
                    <span>CPU (8 Cores)</span>
                    <span className="text-[#0DF5C4] font-bold">18.4%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#161624] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0DF5C4] rounded-full w-[18.4%]" />
                  </div>
                </div>

                {/* Memory gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8e8ea6]">
                    <span>Memory</span>
                    <span className="text-white font-bold">1.42 / 4 GB</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#161624] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#8b82ff] rounded-full w-[35.5%]" />
                  </div>
                </div>

                {/* Settings Footer */}
                <div className="pt-2 border-t border-[#1a1a28] flex items-center justify-between text-[#787896]">
                  <button
                    ref={settingsTriggerRef}
                    onClick={(event) => toggleSettingsMenu(event.currentTarget)}
                    aria-haspopup="menu"
                    aria-expanded={Boolean(settingsMenuPosition)}
                    aria-label="Open settings menu"
                    className="hover:text-white flex items-center gap-1.5 text-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings & Theme</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Split className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                    <Columns className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </aside>
        ) : (
          /* 2. PLATFORM MODE SIDEBAR (Screenshots 3, 4, 5) */
          <aside
            className={`${isSidebarOpen ? (isCompactCloudCore ? "flex w-[68px] md:w-56" : "hidden w-56 md:flex") : "hidden w-14 md:flex"} min-h-0 overflow-y-auto bg-[#0b0b12] border-r border-[#1e1e2d] flex-col justify-between shrink-0 font-sans transition-[width] duration-150`}
          >
            <div
              className={`space-y-6 ${isSidebarOpen && isCompactCloudCore ? "p-1.5 md:p-3" : "p-3"}`}
            >
              {/* Platform Section */}
              <div>
                <div
                  className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} px-1 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e] ${isSidebarOpen && isCompactCloudCore ? "hidden md:flex" : ""}`}
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
                  <nav className="space-y-1">
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
                          title={isCompactCloudCore ? item.label : undefined}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? "text-white font-semibold shadow-sm"
                              : "text-[#8c8ca5] hover:text-[#d0d0e2] hover:bg-[#141420]"
                          } ${isCompactCloudCore ? "justify-center gap-0 px-1.5 md:justify-start md:gap-2.5 md:px-3" : ""}`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: theme.primary,
                                  color: "#0b0b12",
                                }
                              : {}
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span
                            className={
                              isCompactCloudCore ? "hidden md:inline" : ""
                            }
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
                    className={`px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e] ${isCompactCloudCore ? "hidden md:block" : ""}`}
                  >
                    SYSTEM
                  </div>
                  <div className="space-y-1">
                    <button
                      ref={settingsTriggerRef}
                      onClick={(event) => toggleSettingsMenu(event.currentTarget)}
                      aria-haspopup="menu"
                      aria-expanded={Boolean(settingsMenuPosition)}
                      aria-label="Open settings menu"
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#8c8ca5] hover:text-[#d0d0e2] hover:bg-[#141420] transition-colors ${isCompactCloudCore ? "justify-center gap-0 px-1.5 md:justify-start md:gap-2.5 md:px-3" : ""}`}
                      title={
                        isCompactCloudCore ? "Settings & Theme" : undefined
                      }
                    >
                      <Settings className="w-4 h-4" />
                      <span
                        className={isCompactCloudCore ? "hidden md:inline" : ""}
                      >
                        Settings & Theme
                      </span>
                    </button>
                  </div>

                  {/* Memory usage bar */}
                  <div
                    className={`mt-4 px-3 py-2 rounded-xl bg-[#12121d] border border-[#202030] text-[11px] font-mono ${isCompactCloudCore ? "hidden md:block" : ""}`}
                  >
                    <div className="flex justify-between text-[#8b8ba8] mb-1.5">
                      <span>Memory usage</span>
                      <span className="text-white font-bold">64%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#1b1b2a] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#0DF5C4] to-[#6C63FF] rounded-full w-[64%]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Version Tag */}
            {isSidebarOpen && (
              <div
                className={`p-3 border-t border-[#1a1a28] flex items-center justify-between text-[11px] font-mono text-[#5b5b75] ${isCompactCloudCore ? "justify-center md:justify-between" : ""}`}
              >
                <span className={isCompactCloudCore ? "hidden md:inline" : ""}>
                  v2.4.18-edge
                </span>
                <button
                  onClick={() => logout()}
                  title="Sign out"
                  aria-label="Sign out"
                  className="hover:text-[#e0e0f0] transition-colors flex items-center gap-1 text-[10px]"
                >
                  <LogOut className="w-3 h-3" />
                  <span
                    className={isCompactCloudCore ? "hidden md:inline" : ""}
                  >
                    Logout
                  </span>
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Main Content Pane */}
        <main
          className={`${isAiStudio ? "overflow-hidden" : "overflow-y-auto"} min-h-0 flex-1 bg-[#08080d]`}
        >
          {children}
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
