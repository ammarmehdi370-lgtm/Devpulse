"use client";

import React, { useState } from "react";
import { useApp, PageType } from "../context/AppContext";
import { ToastContainer } from "./ToastContainer";
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
  Check,
  Cpu,
  Radio,
  Activity,
  GitBranch,
  FolderTree,
  Split,
  Columns,
  Maximize2,
  ArrowLeft,
  Menu,
  X,
  Bell,
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
    setIsEditorProjectOpen,
    setIsFileTreeOpen,
  } = useApp();

  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedRepoBranch, setSelectedRepoBranch] = useState(
    "devpulse-core / staging",
  );

  // Check if current view is Workbench mode (Screenshots 1 & 3)
  const isWorkbenchMode = page === "editor" || page === "ai-studio";

  // Standard platform items
  const platformNavItems: {
    id: PageType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "workspaces", label: "Your Workspaces", icon: Box },
    { id: "repositories", label: "Your Code Projects", icon: GitFork },
    { id: "editor", label: "Code Editor", icon: Code2 },
    { id: "deployments", label: "Live Releases", icon: Rocket },
    { id: "remote-control", label: "Remote Help", icon: Monitor },
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
    <div className="min-h-screen bg-[#0a0d0e] text-[#f5f6f6] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="topbar min-h-14 border-b border-[#1c2224] bg-[#0a0d0e] px-6 py-3 flex items-center gap-[22px] flex-nowrap z-30 sticky top-0 overflow-x-auto font-sans">
        {/* Left: Brand + Info String matching screenshots */}
        <div className="flex items-center gap-[22px] shrink-0">
          <div
            onClick={() => setPage("workspaces")}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-transform group-hover:scale-105 text-[#0a0d0e] bg-[#0DF5C4]">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-medium text-[#f5f6f6] text-[15px] tracking-tight">
              Devpulse
            </span>
          </div>

          <span className="h-6 w-px bg-[#1c2224] shrink-0" aria-hidden="true" />

          {/* Primary navigation */}
          <nav
            className="hidden lg:flex items-center gap-1 shrink-0"
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
                <link.icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </button>
            ))}
          </nav>

          {/* Repo / Branch Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRepoMenuOpen(!isRepoMenuOpen)}
              aria-label="Switch repository context"
              className="topbar-pill flex items-center gap-2 shrink-0"
            >
              <span>{selectedRepoBranch}</span>
              <ChevronDown
                className="w-3.5 h-3.5 text-[#7d8383]"
                aria-hidden="true"
              />
            </button>

            {isRepoMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-56 bg-[#12121c] border border-[#26263a] rounded-xl shadow-2xl py-1 z-50 text-xs font-mono">
                <div className="px-3 py-1.5 text-[10px] text-[#6b6b88] uppercase tracking-wider">
                  Switch Context
                </div>
                <button
                  onClick={() => {
                    setSelectedRepoBranch("devpulse-core / staging");
                    setIsRepoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1a1a29] flex items-center justify-between text-[#c4c4dc]"
                >
                  <span>devpulse-core / staging</span>
                  {selectedRepoBranch.includes("staging") && (
                    <Check className="w-3 h-3 text-[#0DF5C4]" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedRepoBranch("devpulse-core / main");
                    setIsRepoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1a1a29] flex items-center justify-between text-[#c4c4dc]"
                >
                  <span>devpulse-core / main</span>
                  {selectedRepoBranch.includes("main") && (
                    <Check className="w-3 h-3 text-[#0DF5C4]" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedRepoBranch("neural-agent / cuda");
                    setIsRepoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1a1a29] flex items-center justify-between text-[#c4c4dc]"
                >
                  <span>neural-agent / cuda</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Jump, Status, Profile */}
        <div className="flex items-center gap-[22px] shrink-0 ml-auto">
          {/* Search or jump to... Ctrl+K */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command palette"
            className="topbar-pill flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5 text-[#7d8383]" aria-hidden="true" />
            <span className="text-[#9aa0a0]">Search</span>
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
            className="flex items-center gap-2 text-[12px] text-[#9aa0a0] whitespace-nowrap"
            title="Cluster availability"
          >
            <span className="h-2 w-2 rounded-full bg-[#0DF5C4] animate-pulse" />
            <span>Operational</span>
          </div>

          <span className="h-6 w-px bg-[#1c2224] shrink-0" aria-hidden="true" />

          {/* User Profile avatar */}
          <button
            className="topbar-account"
            onClick={() => logout()}
            title="Open account menu"
            aria-label={`Account menu for ${user.name}`}
          >
            <span className="topbar-avatar" aria-hidden="true">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="hidden xl:inline">{user.name}</span>
            <ChevronDown
              className="h-3.5 w-3.5 text-[#7d8383]"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

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
                const isActive = page === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "editor") setIsEditorProjectOpen(false);
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

      {/* Body with Sidebar and Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* DUAL MODE SIDEBAR */}

        {/* 1. WORKBENCH MODE SIDEBAR (Matches Screenshot 1 & Screenshot 3 Left Sidebar) */}
        {isWorkbenchMode ? (
          <aside className="w-56 bg-[#0c0c14] border-r border-[#1e1e2d] flex flex-col justify-between shrink-0 hidden md:flex font-sans">
            <div className="p-3 space-y-5">
              {/* Top Header */}
              <div>
                <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e]">
                  <span>WORKBENCH</span>
                  <span className="cursor-pointer hover:text-white">•••</span>
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
              </div>

              {/* Return to Platform Link */}
              <button
                onClick={() => setPage("workspaces")}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono text-[#787896] hover:text-white hover:bg-[#151522] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Workbench</span>
              </button>
            </div>

            {/* Bottom Telemetry Gauges (Pixel-Perfect to Screenshot 1 & 3) */}
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
                  onClick={() => setPage("theme")}
                  className="hover:text-white flex items-center gap-1.5 text-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
                <div className="flex items-center gap-2">
                  <Split className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                  <Columns className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                </div>
              </div>
            </div>
          </aside>
        ) : (
          /* 2. PLATFORM MODE SIDEBAR (Screenshots 3, 4, 5) */
          <aside className="w-56 bg-[#0b0b12] border-r border-[#1e1e2d] flex flex-col justify-between shrink-0 hidden md:flex font-sans">
            <div className="p-3 space-y-6">
              {/* Platform Section */}
              <div>
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e]">
                  PLATFORM
                </div>
                <nav className="space-y-1">
                  {platformNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = page === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === "editor") {
                            setIsEditorProjectOpen(false);
                          }
                          setPage(item.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? "text-white font-semibold shadow-sm"
                            : "text-[#8c8ca5] hover:text-[#d0d0e2] hover:bg-[#141420]"
                        }`}
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
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* System Section */}
              <div>
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#63637e]">
                  SYSTEM
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setPage("theme")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#8c8ca5] hover:text-[#d0d0e2] hover:bg-[#141420] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings & Theme</span>
                  </button>
                </div>

                {/* Memory usage bar */}
                <div className="mt-4 px-3 py-2 rounded-xl bg-[#12121d] border border-[#202030] text-[11px] font-mono">
                  <div className="flex justify-between text-[#8b8ba8] mb-1.5">
                    <span>Memory usage</span>
                    <span className="text-white font-bold">64%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1b1b2a] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0DF5C4] to-[#6C63FF] rounded-full w-[64%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Version Tag */}
            <div className="p-3 border-t border-[#1a1a28] flex items-center justify-between text-[11px] font-mono text-[#5b5b75]">
              <span>v2.4.18-edge</span>
              <button
                onClick={() => logout()}
                title="Sign out"
                className="hover:text-[#e0e0f0] transition-colors flex items-center gap-1 text-[10px]"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-[#08080d]">{children}</main>
      </div>
      {/* Global Notifications */}
      <ToastContainer />
      {/* First-run Onboarding Tour */}
      {page !== "login" && <OnboardingTour />}
    </div>
  );
};
