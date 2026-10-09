"use client";

import React, { useState } from "react";
import { useApp, WorkspaceDevbox } from "../context/AppContext";
import {
  GitBranch,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  Zap,
  Download,
  Cpu,
  HardDrive,
  Server,
  Play,
  Square,
  Trash2,
  ExternalLink,
  BookOpen,
  FolderSearch,
  Sparkles,
  Command,
  CheckCircle2,
  Lock,
  Layers,
  Code2,
  Loader2,
  Plus,
} from "lucide-react";
import {
  FriendlyHint,
  HelpfulInfo,
  friendlyAlert,
  friendlyConfirm,
} from "./FriendlyHelpers";
import { PageHeader } from "./PageHeader";
import { WorkspaceCardSkeleton } from "./SkeletonLoaders";

export const WorkspacesPage: React.FC = () => {
  const {
    workspaces,
    spinUpDevbox,
    toggleWorkspaceStatus,
    deleteWorkspace,
    theme,
    setPage,
    setIsEditorProjectOpen,
    setLoadedProjectName,
    addToast,
    isDataLoading,
  } = useApp();

  const [cloneUrl, setCloneUrl] = useState("https://github.com/org/repo.git");
  const [selectedTemplate, setSelectedTemplate] = useState("Next.js 15");
  const [cliCopied, setCliCopied] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isSpinningUp, setIsSpinningUp] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showQuickGuide, setShowQuickGuide] = useState(true);

  const templates = [
    {
      id: "Next.js 15",
      name: "Next.js 15",
      sub: "Turbopack - SSR",
      icon: "⚡",
    },
    {
      id: "FastAPI Python",
      name: "FastAPI Python",
      sub: "Python 3.12 - Uvicorn",
      icon: "🐍",
    },
    {
      id: "Rust Axum",
      name: "Rust Axum",
      sub: "Tokio - Cargo LLVM",
      icon: "🦀",
    },
    { id: "Go gRPC", name: "Go gRPC", sub: "Go 1.23 - Protobuf", icon: "🔷" },
    {
      id: "PyTorch AI Agent",
      name: "PyTorch AI Agent",
      sub: "CUDA runtime - HuggingFace accelerated",
      icon: "🧠",
    },
  ];

  const handleCloneRepo = () => {
    if (!cloneUrl.trim()) {
      addToast({
        type: "error",
        title: "URL required",
        description: "Please enter a valid repository URL.",
      });
      return;
    }
    setIsCloning(true);
    setTimeout(() => {
      const repoName =
        cloneUrl.split("/").pop()?.replace(".git", "") || "cloned-workspace";
      void spinUpDevbox(
        `${repoName}-devbox`,
        "Git Imported Container",
        cloneUrl,
      );
      setIsCloning(false);
      addToast({
        type: "success",
        title: "Workspace provisioning",
        description: `Cloning ${repoName} into a cloud devbox…`,
      });
    }, 800);
  };

  const handleSpinUpTemplate = async () => {
    setIsSpinningUp(true);
    try {
      await spinUpDevbox(
        `${selectedTemplate.toLowerCase().replace(/[^a-z0-9]/g, "-")}-box`,
        selectedTemplate,
      );
      addToast({
        type: "success",
        title: "Workspace started!",
        description: `${selectedTemplate} devbox is now running.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Could not start workspace",
        description: "Failed to provision the cloud devbox. Please try again.",
      });
    } finally {
      setIsSpinningUp(false);
    }
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(
      "curl -fsSL https://devpulse.dev/install.sh | sh",
    );
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2000);
  };

  const askBeforeWorkspaceAction = async (
    message: string,
    action: () => void,
  ) => {
    if (await friendlyConfirm(message)) action();
  };

  const handleToggleWorkspace = async (ws: WorkspaceDevbox) => {
    setTogglingId(ws.id);
    try {
      await toggleWorkspaceStatus(ws.id);
      const newStatus = ws.status === "Running" ? "Stopped" : "Running";
      addToast({
        type: "success",
        title: `Workspace ${newStatus}`,
        description: `${ws.name} is now ${newStatus.toLowerCase()}.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Action failed",
        description: "Could not toggle workspace status.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteWorkspace = async (ws: WorkspaceDevbox) => {
    if (
      !(await friendlyConfirm(`Delete workspace "${ws.name}"? This cannot be undone.`))
    )
      return;
    setDeletingId(ws.id);
    try {
      await deleteWorkspace(ws.id);
      addToast({
        type: "info",
        title: "Workspace deleted",
        description: `${ws.name} has been removed.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Delete failed",
        description: "Could not remove the workspace. Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-8">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Cloud Workspaces"
        subtitle="Instant Firecracker microVM devboxes — spin up, code, deploy, repeat."
        breadcrumbs={[{ label: "Workspaces" }]}
        badge={{ text: "us-east-nitro-4 · LIVE", variant: "live" }}
        actions={
          <>
            <button
              onClick={() => void handleSpinUpTemplate()}
              disabled={isSpinningUp}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-ide-accent-fg flex items-center gap-1.5 shadow disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSpinningUp ? "Starting..." : "Create Workspace"}</span>
            </button>
            <div className="bg-ide-surface-card border border-ide-surface-control-hover rounded-xl px-3 py-2 text-right font-mono text-xs hidden sm:block">
              <div className="text-[10px] text-ide-text-faint uppercase tracking-wider">
                WARM POOL
              </div>
              <div className="text-[var(--ide-color-success-readable)] font-bold mt-0.5">
                1.18s avg boot
              </div>
            </div>
          </>
        }
      />

      {/* Welcome Hero */}
      <div className="space-y-2">
        {/* Cloud Engine Badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-ide-accent/10 border border-ide-accent/30 text-[var(--ide-color-accent-readable)] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-pulse" />
          <span className="font-semibold text-ide-text-strong">CLOUD ENGINE v2.4</span>
          <span className="text-ide-text-tertiary">· Zero-latency clusters ready</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-ide-text-strong tracking-tight">
          Welcome to your saved work environments.
        </h1>
        <h2 className="text-xl sm:text-2xl font-medium text-ide-text-secondary tracking-tight">
          Let&apos;s create your first cloud workspace.
        </h2>
        <p className="text-xs sm:text-sm text-ide-muted max-w-2xl leading-relaxed">
          A workspace is a ready-to-use cloud computer for your project. You can
          start, stop, and reopen it anytime without losing your progress.
        </p>
      </div>

      {!isDataLoading && workspaces.length === 0 && showQuickGuide && (
        <FriendlyHint
          title="Simple explanation"
          body="This page is your home for project environments. Launching a workspace creates a cloud computer for your code, so you can work without configuring your own machine."
          onDismiss={() => setShowQuickGuide(false)}
        />
      )}

      {/* 3 Main Options Cards Grid (Pixel-Perfect to Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* OPTION 01: Clone a Git Repository */}
        <div className="bg-ide-surface-card border border-ide-border-strong rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-ide-info/15 text-ide-info border border-ide-info/30 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-ide-text-faint uppercase tracking-wider">
                OPTION 01
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ide-text-strong mb-1">
                Clone a Git Repository
              </h3>
              <p className="text-xs text-ide-text-tertiary leading-relaxed">
                Import directly from GitHub, GitLab, or any public/private Git
                URL with automatic environment detection.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-mono text-ide-text-faint uppercase tracking-wider block">
                REPOSITORY REMOTE URL
              </label>
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className="w-full px-3 py-2 bg-ide-surface-control border border-ide-border-control rounded-xl text-xs font-mono text-ide-text-strong placeholder-ide-text-placeholder focus:outline-none focus:border-ide-accent"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-ide-text-quiet pt-1">
                <span className="flex items-center gap-1 text-[var(--ide-color-success-readable)]">
                  <CheckCircle2 className="w-3 h-3" /> SSH Key verified
                </span>
                <span>Auto branch detect</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCloneRepo}
              disabled={isCloning}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-ide-accent-fg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-98"
              style={{ backgroundColor: theme.primary }}
            >
              <span>
                {isCloning ? "Cloning & Provisioning..." : "Import Repository"}
              </span>
              <ArrowRight className="w-4 h-4 text-ide-accent-fg" />
            </button>
          </div>
        </div>

        {/* OPTION 02: Start from a Template */}
        <div className="bg-ide-surface-card border border-ide-border-strong rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-ide-accent/15 text-ide-accent border border-ide-accent/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-ide-accent/10 text-[var(--ide-color-accent-readable)] border border-ide-accent/30">
                  Instant Boot
                </span>
                <span className="text-[11px] font-mono text-ide-text-faint uppercase tracking-wider">
                  OPTION 02
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ide-text-strong mb-1">
                Start from a ready-made setup
              </h3>
              <p className="text-xs text-ide-text-tertiary leading-relaxed">
                Curated, production-ready microarchitectures configured with
                package caching and hot-reload daemon.
              </p>
            </div>

            {/* Template selector chips */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {templates.slice(0, 4).map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    selectedTemplate === tpl.id
                      ? "bg-ide-active border-ide-border-strong text-ide-text-strong"
                      : "bg-ide-surface-control border-ide-border-control text-ide-text-tertiary hover:border-ide-border-strong"
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                  </div>
                  <div className="text-[10px] text-ide-text-faint font-mono truncate">
                    {tpl.sub}
                  </div>
                </button>
              ))}
            </div>

            {/* 5th Template Full Width */}
            <button
              onClick={() => setSelectedTemplate("PyTorch AI Agent")}
              className={`w-full p-2.5 rounded-xl text-left border transition-all ${
                selectedTemplate === "PyTorch AI Agent"
                  ? "bg-ide-active border-ide-border-strong text-ide-text-strong"
                  : "bg-ide-surface-control border-ide-border-control text-ide-text-tertiary hover:border-ide-border-strong"
              }`}
            >
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span>🧠</span>
                <span>PyTorch AI Agent</span>
              </div>
              <div className="text-[10px] text-ide-text-faint font-mono">
                CUDA runtime · HuggingFace accelerated
              </div>
            </button>
          </div>

          <div className="pt-6">
            {isSpinningUp ? (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-ide-accent">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Provisioning devbox…</span>
              </div>
            ) : (
              <button
                onClick={handleSpinUpTemplate}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-ide-surface-control hover:bg-ide-surface-control-hover border border-ide-border-strong text-ide-text-strong flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5 fill-current text-ide-accent" />
                <span>Spin Up {selectedTemplate}</span>
              </button>
            )}
          </div>
        </div>

        {/* OPTION 03: Connect Local Machine */}
        <div className="bg-ide-surface-card border border-ide-border-strong rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-ide-warning/15 text-ide-warning border border-ide-warning/30 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-ide-text-faint uppercase tracking-wider">
                OPTION 03
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ide-text-strong mb-1">
                Connect Local Machine
              </h3>
              <p className="text-xs text-ide-text-tertiary leading-relaxed">
                Bridge your native laptop environment directly to high-spec
                cloud devboxes via our zero-config agent.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px] font-mono text-ide-statusbar-fg uppercase tracking-wider">
                <span>SINGLE LINE CLI COMMAND</span>
                <span className="text-[var(--ide-color-success-readable)]">Wireguard Tunnel</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value="curl -fsSL https://devpulse.dev/i: |"
                  className="w-full pl-3 pr-10 py-2.5 bg-ide-surface-control border border-ide-border-control rounded-xl text-xs font-mono text-ide-success focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyCli}
                  className="absolute right-2 p-1.5 rounded-lg bg-ide-surface-control-hover hover:bg-ide-surface-hover-strong text-ide-text-tertiary hover:text-ide-text-strong"
                  title="Copy command"
                >
                  {cliCopied ? (
                    <Check className="w-3.5 h-3.5 text-ide-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-ide-text-faint font-mono">
                ⓘ Installs binary & prompts OAuth authorization
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCopyCli}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-ide-surface-control hover:bg-ide-surface-control-hover border border-ide-border-strong text-ide-text-strong flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CLI for macOS & Linux</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Workspaces & Starred Repositories (Pixel-Perfect to Screenshot 3) */}
      <div className="bg-ide-workspace-surface border border-ide-workspace-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ide-workspace-border-inner">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-ide-text-tertiary" />
            <h3 className="text-sm font-bold text-ide-text-strong">
              Recent Workspaces & Starred Repositories
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-ide-surface-hover text-ide-text-tertiary border border-ide-border-strong">
              {workspaces.length} Total
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              onClick={() =>
                void friendlyAlert(
                  "Devpulse Cloud Documentation: Hypervisor MicroVM Specs & Architecture",
                )
              }
              className="text-ide-text-tertiary hover:text-ide-text-strong flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read Documentation</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setPage("repositories")}
              className="text-ide-text-tertiary hover:text-ide-text-strong flex items-center gap-1.5 transition-colors"
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>Explore Sample Projects</span>
            </button>
          </div>
        </div>

        {/* Dynamic Devbox Workspace Cards */}
        {isDataLoading ? (
          <WorkspaceCardSkeleton count={4} />
        ) : workspaces.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-ide-surface-empty border border-ide-border-strong flex items-center justify-center">
              <Server className="w-7 h-7 text-ide-text-faint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ide-text-strong mb-1">
                No workspaces yet
              </p>
              <p className="text-xs text-ide-muted max-w-xs">
                Spin up a cloud devbox above to get started. Your environments
                will appear here for fast resumption.
              </p>
            </div>
            <button
              onClick={handleSpinUpTemplate}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-ide-accent-fg flex items-center gap-2 shadow-md"
              style={{ backgroundColor: theme.primary }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch your first workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="bg-ide-surface-card-alt border border-ide-border-strong hover:border-ide-border-control rounded-xl p-4 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ide-text-strong text-sm">
                        {ws.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 ${
                          ws.status === "Running"
                            ? "bg-ide-success/15 text-[var(--ide-color-success-readable)] border border-ide-success/30"
                            : "bg-ide-danger/15 text-[var(--ide-color-danger-readable)] border border-ide-danger/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${ws.status === "Running" ? "bg-ide-success animate-pulse" : "bg-ide-danger"}`}
                        />
                        {ws.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-ide-text-quiet font-mono mt-0.5">
                      {ws.template} · port :{ws.port}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void handleToggleWorkspace(ws)}
                      disabled={togglingId === ws.id}
                      title={
                        ws.status === "Running"
                          ? "Stop Workspace"
                          : "Start Workspace"
                      }
                      aria-label={
                        ws.status === "Running"
                          ? `Stop ${ws.name}`
                          : `Start ${ws.name}`
                      }
                      className="p-1.5 rounded-lg bg-ide-elevated hover:bg-ide-surface-control-hover text-ide-text-secondary hover:text-ide-text-strong transition-colors disabled:opacity-50"
                    >
                      {togglingId === ws.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : ws.status === "Running" ? (
                        <Square className="w-3.5 h-3.5 text-ide-danger" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-ide-success" />
                      )}
                    </button>
                    <button
                      onClick={() => void handleDeleteWorkspace(ws)}
                      disabled={deletingId === ws.id}
                      title="Destroy Workspace"
                      aria-label={`Delete ${ws.name}`}
                      className="p-1.5 rounded-lg bg-ide-elevated hover:bg-ide-surface-control-hover text-ide-text-secondary hover:text-ide-danger transition-colors disabled:opacity-50"
                    >
                      {deletingId === ws.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-ide-muted pt-2 border-t border-ide-border">
                  <div className="flex items-center gap-3">
                    <span>{ws.vCpu} vCPU</span>
                    <span>{ws.ram}</span>
                    <span>{ws.storage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLoadedProjectName(ws.name);
                        setIsEditorProjectOpen(true);
                        setPage("editor");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-ide-accent/15 hover:bg-ide-accent/25 text-ide-accent border border-ide-accent/30 flex items-center gap-1.5 text-xs font-mono font-semibold transition-all hover:scale-105 active:scale-95"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Open in Editor</span>
                    </button>
                    <a
                      href={ws.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ide-text-tertiary hover:text-ide-text-strong hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Web View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hypervisor Architecture Specs & Interactive Topology Diagram (Pixel-Perfect to Screenshot 3) */}
      <div className="bg-ide-workspace-surface border border-ide-workspace-border rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <div className="text-[10px] font-mono text-ide-accent uppercase tracking-wider mb-1">
            HYPERVISOR ARCHITECTURE
          </div>
          <h3 className="text-xl font-bold text-ide-text-strong tracking-tight">
            Every devbox includes standard dedicated microVM specs
          </h3>
          <p className="text-xs text-ide-text-secondary max-w-3xl mt-1 leading-relaxed">
            Shared-nothing microkernels boot with dedicated NVMe write caches,
            zero-trust ephemeral peer rings, and pre-warmed language LSP
            servers.
          </p>

          {/* Specs Chips */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="px-4 py-2 rounded-xl bg-ide-surface border border-ide-border-strong font-mono text-xs">
              <span className="text-ide-statusbar-fg">CPU </span>
              <strong className="text-ide-text-strong ml-1">8 Dedicated vCPU</strong>
            </div>
            <div className="px-4 py-2 rounded-xl bg-ide-surface border border-ide-border-strong font-mono text-xs">
              <span className="text-ide-statusbar-fg">MEMORY </span>
              <strong className="text-ide-text-strong ml-1">32 GB ECC RAM</strong>
            </div>
            <div className="px-4 py-2 rounded-xl bg-ide-surface border border-ide-border-strong font-mono text-xs">
              <span className="text-ide-statusbar-fg">STORAGE </span>
              <strong className="text-ide-text-strong ml-1">100 GB NVMe</strong>
            </div>
          </div>
        </div>

        {/* Visual Architecture Node Flow Diagram (Matching Screenshot 3 right side) */}
        <div className="h-44 bg-[var(--ide-color-workspace-diagram-bg)] border border-ide-workspace-border-inner rounded-xl p-4 flex items-center justify-around relative overflow-hidden font-mono text-xs">
          {/* Node: CLIENT */}
          <div className="z-10 text-center">
            <div className="px-4 py-2 rounded-lg bg-ide-surface-card-alt border border-ide-border-strong text-ide-text-secondary shadow-lg">
              CLIENT
            </div>
          </div>

          {/* Connecting SVG lines with dashed glowing animations */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none stroke-ide-border-strong"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          >
            <line
              x1="20%"
              y1="50%"
              x2="50%"
              y2="25%"
              className="stroke-ide-success/60"
            />
            <line
              x1="20%"
              y1="50%"
              x2="50%"
              y2="75%"
              className="stroke-ide-warning/60"
            />
            <line
              x1="50%"
              y1="25%"
              x2="80%"
              y2="50%"
              className="stroke-ide-success/60"
            />
            <line
              x1="50%"
              y1="75%"
              x2="80%"
              y2="50%"
              className="stroke-ide-warning/60"
            />
          </svg>

          {/* Center Nodes: FlowTracker & LSP Sync */}
          <div className="z-10 flex flex-col justify-between h-full py-2">
            <div className="px-3 py-1.5 rounded-lg bg-ide-success/10 border border-ide-success/40 text-[var(--ide-color-success-readable)] text-[11px] shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-ping" />
              FlowTracker
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-ide-info/10 border border-ide-info/40 text-[var(--ide-color-info-readable)] text-[11px] shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-info" />
              LSP Sync
            </div>
          </div>

          {/* Node: DEVBOX */}
          <div className="z-10 text-center">
            <div
              className="px-4 py-2 rounded-lg text-ide-accent-fg font-bold shadow-lg flex items-center gap-2"
              style={{
                backgroundColor: `${theme.primary}30`,
                borderColor: theme.primary,
                borderWidth: 1,
              }}
            >
              <Server className="w-3.5 h-3.5 text-ide-accent" />
              <span>DEVBOX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Productivity Accelerators Bar (Pixel-Perfect to Screenshot 3) */}
      <div className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-ide-text-faint border-t border-ide-workspace-border-inner">
        <div className="flex items-center gap-2">
          <span className="text-ide-text-tertiary font-semibold">
            PRODUCTIVITY ACCELERATORS:
          </span>
          <span>⚡ Quick command palette</span>
          <span>·</span>
          <span>Jump to file & symbol</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-ide-surface-control border border-ide-border-control text-ide-text-strong">
              Ctrl+`
            </kbd>{" "}
            Open integrated terminal
          </span>
          <span>
            Press{" "}
            <kbd className="px-1 rounded bg-ide-surface-control border border-ide-border-control text-ide-text-strong">
              ?
            </kbd>{" "}
            for keyboard map
          </span>
        </div>
      </div>
    </div>
  );
};
