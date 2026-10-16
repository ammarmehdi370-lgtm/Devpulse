"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp, PageType } from "../context/AppContext";
import { ToastContainer } from "./ToastContainer";
import { friendlyAlert } from "./FriendlyHelpers";
import { OnboardingTour } from "./OnboardingTour";
import { LOGO_COLORS } from "../logoColors";
import { prefetchPage } from "../pagePrefetch";
import { formatShortcut, getShortcut } from "../editor/shortcuts";
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
  CheckCheck,
  MessageCircle,
  GitPullRequest,
  CircleCheck,
  ArrowUpRight,
} from "lucide-react";

type NotificationItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  page: PageType;
};

const notifications: NotificationItem[] = [
  {
    id: "release-live",
    category: "Deployment",
    title: "Your release is live",
    description:
      "devpulse-core is now running in production. All systems are operational.",
    time: "12 min ago",
    icon: CircleCheck,
    tone: "text-ide-success bg-ide-success/10 ring-ide-success/20",
    page: "deployments",
  },
  {
    id: "review-request",
    category: "Code review",
    title: "Sarah Lin requested your review",
    description:
      "Optimistic updates for the cloud terminal are ready for a final look.",
    time: "38 min ago",
    icon: GitPullRequest,
    tone: "text-ide-info bg-ide-info/10 ring-ide-info/20",
    page: "repositories",
  },
  {
    id: "team-message",
    category: "Team chat",
    title: "A new message in #frontend",
    description:
      "Marcus Vance shared the latest edge cache benchmark results.",
    time: "1 hour ago",
    icon: MessageCircle,
    tone: "text-ide-secondary bg-ide-secondary/10 ring-ide-secondary/20",
    page: "chat",
  },
  {
    id: "workspace-insight",
    category: "Workspace",
    title: "Your workspace is looking good",
    description:
      "All 14 team members have access and your project checks are passing.",
    time: "Yesterday",
    icon: Sparkles,
    tone: "text-ide-warning bg-ide-warning/10 ring-ide-warning/20",
    page: "workspaces",
  },
];

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
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread"
  >("all");
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<
    string[]
  >([]);
  const [areNotificationsHydrated, setAreNotificationsHydrated] =
    useState(false);
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
  const notificationStorageKey = `devpulse-notifications:${user.email.toLowerCase()}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(notificationStorageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("read" in parsed) ||
          !Array.isArray(parsed.read) ||
          !parsed.read.every((id) => typeof id === "string") ||
          !("dismissed" in parsed) ||
          !Array.isArray(parsed.dismissed) ||
          !parsed.dismissed.every((id) => typeof id === "string")
        ) {
          throw new Error("Saved notification preferences are invalid.");
        }
        setReadNotificationIds(parsed.read);
        setDismissedNotificationIds(parsed.dismissed);
      }
    } catch (error) {
      console.error("Unable to restore notification preferences.", error);
    }
    setAreNotificationsHydrated(true);
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!areNotificationsHydrated) return;
    try {
      window.localStorage.setItem(
        notificationStorageKey,
        JSON.stringify({
          read: readNotificationIds,
          dismissed: dismissedNotificationIds,
        }),
      );
    } catch (error) {
      console.error("Unable to save notification preferences.", error);
    }
  }, [
    areNotificationsHydrated,
    dismissedNotificationIds,
    notificationStorageKey,
    readNotificationIds,
  ]);

  useEffect(() => {
    if (!isNotificationCenterOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNotificationCenterOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isNotificationCenterOpen]);

  const visibleNotifications = notifications.filter((notification) => {
    if (dismissedNotificationIds.includes(notification.id)) return false;
    return (
      notificationFilter === "all" ||
      !readNotificationIds.includes(notification.id)
    );
  });
  const unreadNotificationCount = notifications.filter(
    (notification) =>
      !dismissedNotificationIds.includes(notification.id) &&
      !readNotificationIds.includes(notification.id),
  ).length;

  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) => [
      ...new Set([
        ...current,
        ...notifications
          .filter(
            (notification) =>
              !dismissedNotificationIds.includes(notification.id),
          )
          .map((notification) => notification.id),
      ]),
    ]);
  };

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
  useEffect(() => {
    const closeMenus = (event: Event) => {
      const owner = (event as CustomEvent<string>).detail;
      if (owner === "shell-account" && isAccountMenuOpen) {
        setIsAccountMenuOpen(false);
        setAccountMenuPosition(null);
      } else if (owner === "shell-settings" && settingsMenuPosition) {
        setSettingsMenuPosition(null);
      } else if (owner === "shell-mobile" && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener("devpulse:close-topmost", closeMenus);
    return () =>
      window.removeEventListener("devpulse:close-topmost", closeMenus);
  }, [isAccountMenuOpen, isMobileNavOpen, settingsMenuPosition]);
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
                onMouseEnter={() => prefetchPage(link.id as PageType)}
                onFocus={() => prefetchPage(link.id as PageType)}
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
            {/* Search or jump to... */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Open command palette"
              title={`Open command palette · ${formatShortcut(getShortcut("command-palette")!.keys)}`}
              className="topbar-pill flex items-center gap-1.5 px-2 sm:px-2.5"
            >
              <Search
                className="w-3.5 h-3.5 text-ide-muted"
                aria-hidden="true"
              />
              <span className="hidden 2xl:inline text-ide-text-soft">Search</span>
              <kbd className="topbar-kbd">
                <span>{formatShortcut(getShortcut("command-palette")!.keys)}</span>
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
              type="button"
              onClick={() => setIsNotificationCenterOpen(true)}
              className="topbar-icon-button relative"
              aria-label="Notifications"
              title="Notifications"
              aria-haspopup="dialog"
              aria-expanded={isNotificationCenterOpen}
              aria-controls="notification-center"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ide-topbar-bg bg-ide-accent px-0.5 text-[8px] font-bold leading-none text-ide-accent-fg">
                  {unreadNotificationCount}
                </span>
              )}
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

      {isNotificationCenterOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsNotificationCenterOpen(false);
            }
          }}
        >
          <section
            id="notification-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-center-title"
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ide-border-strong bg-ide-workbench-bg shadow-[0_32px_100px_color-mix(in_srgb,var(--ide-color-shadow-color)_72%,transparent)] ring-1 ring-ide-border-subtle sm:max-h-[min(760px,calc(100dvh-3rem))]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ide-accent/70 to-transparent" />
            <header className="relative shrink-0 border-b border-ide-border-strong bg-gradient-to-b from-ide-panel/70 to-ide-workbench-bg px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
              <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-ide-accent/[0.06] blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ide-accent/20 bg-ide-accent/[0.08] text-ide-accent shadow-[0_8px_24px_color-mix(in_srgb,var(--ide-color-accent)_10%,transparent)]">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="notification-center-title"
                      className="text-[17px] font-semibold tracking-tight text-ide-text-strong sm:text-lg"
                    >
                      Notification center
                    </h2>
                    <p className="mt-1.5 max-w-md text-[11px] leading-5 text-ide-text-soft sm:text-xs">
                      Important updates from your workspace, all in one place.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(false)}
                  aria-label="Close notifications"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ide-border-subtle bg-ide-panel/60 text-ide-text-soft transition hover:border-ide-border-strong hover:bg-ide-panel hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-ide-border-subtle/70 pt-4">
                <div className="flex items-center gap-1 rounded-xl border border-ide-border-subtle bg-ide-panel/80 p-1">
                  {(["all", "unread"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setNotificationFilter(filter)}
                      aria-pressed={notificationFilter === filter}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition ${
                        notificationFilter === filter
                          ? "bg-ide-surface-toolbar text-ide-text-strong shadow-sm ring-1 ring-inset ring-ide-border-subtle"
                          : "text-ide-text-soft hover:text-ide-text-strong"
                      }`}
                    >
                      {filter}
                      {filter === "unread" && unreadNotificationCount > 0 && (
                        <span className="ml-1.5 font-mono text-[9px] text-ide-accent">
                          {unreadNotificationCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  disabled={unreadNotificationCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-medium text-ide-text-soft transition hover:bg-ide-panel hover:text-ide-accent disabled:cursor-default disabled:opacity-40 sm:text-[11px]"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {visibleNotifications.length > 0 ? (
                <div className="space-y-2.5">
                  {visibleNotifications.map((notification) => {
                    const isRead = readNotificationIds.includes(
                      notification.id,
                    );
                    return (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => {
                          setReadNotificationIds((current) =>
                            current.includes(notification.id)
                              ? current
                              : [...current, notification.id],
                          );
                          setIsNotificationCenterOpen(false);
                          setPage(notification.page);
                        }}
                        className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring sm:gap-4 sm:p-4 ${
                          isRead
                            ? "border-ide-border-subtle bg-ide-panel/45 hover:border-ide-border-strong hover:bg-ide-panel/80"
                            : "border-ide-accent/20 bg-gradient-to-r from-ide-accent/[0.07] via-ide-panel/75 to-ide-panel/45 hover:border-ide-accent/35 hover:from-ide-accent/[0.1]"
                        }`}
                      >
                        <span
                          className={`relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${notification.tone}`}
                        >
                          <notification.icon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          {!isRead && (
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ide-workbench-bg bg-ide-accent" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="rounded-md border border-ide-border-subtle bg-ide-workbench-bg/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-ide-text-soft">
                              {notification.category}
                            </span>
                            <span className="text-[10px] font-medium text-ide-muted">
                              {notification.time}
                            </span>
                          </span>
                          <span className="mt-2 block text-[13px] font-semibold leading-5 text-ide-text-strong">
                            {notification.title}
                          </span>
                          <span className="mt-1 block text-[11px] leading-[1.65] text-ide-text-soft">
                            {notification.description}
                          </span>
                        </span>
                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ide-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ide-text-soft group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ide-border-strong bg-ide-panel text-ide-text-soft shadow-inner">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-ide-text-strong">
                    {notificationFilter === "unread"
                      ? "You’re all caught up"
                      : "No notifications"}
                  </h3>
                  <p className="mt-1.5 max-w-xs text-xs leading-5 text-ide-text-soft">
                    {notificationFilter === "unread"
                      ? "There are no unread updates right now. We’ll let you know when something needs your attention."
                      : "Your workspace updates will appear here as they arrive."}
                  </p>
                </div>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-ide-border-strong bg-ide-panel/50 px-5 py-3.5 sm:px-7">
              <span className="text-[10px] font-medium text-ide-muted">
                {visibleNotifications.length}{" "}
                {visibleNotifications.length === 1
                  ? "notification"
                  : "notifications"}
                {unreadNotificationCount > 0 &&
                  ` · ${unreadNotificationCount} unread`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setDismissedNotificationIds((current) => [
                    ...new Set([
                      ...current,
                      ...notifications.map((notification) => notification.id),
                    ]),
                  ])
                }
                disabled={dismissedNotificationIds.length >= notifications.length}
                className="text-[10px] font-medium text-ide-text-soft transition hover:text-ide-danger disabled:cursor-default disabled:opacity-40"
              >
                Clear all
              </button>
            </footer>
          </section>
        </div>
      )}

      {isMobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40 bg-ide-overlay"
          data-shortcut-close-owner="shell-mobile"
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
                    onMouseEnter={() => prefetchPage(item.id)}
                    onFocus={() => prefetchPage(item.id)}
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
              onMouseEnter={() => prefetchPage("settings")}
              onFocus={() => prefetchPage("settings")}
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
              onMouseEnter={() => prefetchPage("theme")}
              onFocus={() => prefetchPage("theme")}
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
                          onMouseEnter={() =>
                            prefetchPage(
                              item.id === "source-control"
                                ? "repositories"
                                : item.id === "terminal" || item.id === "explorer"
                                  ? "editor"
                                  : (item.id as PageType),
                            )
                          }
                          onFocus={() =>
                            prefetchPage(
                              item.id === "source-control"
                                ? "repositories"
                                : item.id === "terminal" || item.id === "explorer"
                                  ? "editor"
                                  : (item.id as PageType),
                            )
                          }
                          className={`group relative w-full flex items-center rounded-lg px-2.5 py-2.5 text-[12px] font-medium transition-all duration-150 ${
                            isSelected
                              ? "bg-ide-hover text-ide-text-strong shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_4%,transparent)]"
                              : "text-ide-muted hover:bg-ide-input-bg hover:text-ide-text"
                          }`}
                          aria-current={isSelected ? "page" : undefined}
                          title={
                            item.id === "explorer"
                              ? `Explorer · ${formatShortcut(getShortcut("toggle-explorer")!.keys)}`
                              : item.id === "terminal"
                                ? `Terminal · ${formatShortcut(getShortcut("toggle-terminal")!.keys)}`
                                : item.id === "source-control"
                                  ? `Source Control · ${formatShortcut(getShortcut("source-control")!.keys)}`
                                  : undefined
                          }
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
                          onMouseEnter={() => prefetchPage(item.id)}
                          onFocus={() => prefetchPage(item.id)}
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
