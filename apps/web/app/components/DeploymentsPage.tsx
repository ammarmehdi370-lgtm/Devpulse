"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  Rocket,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Terminal,
  ShieldCheck,
  GitBranch,
  Share2,
  Activity,
  Cpu,
  Zap,
  Globe,
  Loader2,
} from "lucide-react";
import {
  FriendlyHint,
  HelpfulInfo,
  friendlyAlert,
  friendlyConfirm,
} from "./FriendlyHelpers";
import { PageHeader } from "./PageHeader";
import { DeploymentCardSkeleton } from "./SkeletonLoaders";
import { z } from "zod";

function deploymentStatusClasses(status: string) {
  if (["Ready", "Live", "Running"].includes(status)) {
    return {
      badge: "bg-ide-success/15 text-[var(--ide-color-success-readable)] border-ide-success/30",
      dot: "bg-ide-success",
    };
  }
  if (["Building", "Pending"].includes(status)) {
    return {
      badge: "bg-ide-warning/15 text-[var(--ide-color-warning-readable)] border-ide-warning/30",
      dot: "bg-ide-warning animate-spin",
    };
  }
  if (["Failed", "Error", "Stopped"].includes(status)) {
    return {
      badge: "bg-ide-danger/15 text-[var(--ide-color-danger-readable)] border-ide-danger/30",
      dot: "bg-ide-danger",
    };
  }
  return {
    badge: "bg-ide-info/15 text-[var(--ide-color-info-readable)] border-ide-info/30",
    dot: "bg-ide-info",
  };
}

const envVarSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      /^[A-Z][A-Z0-9_]{1,63}$/,
      "Use uppercase letters, numbers, and underscores.",
    ),
  value: z.string().trim().min(1, "A value is required."),
  scope: z.string().trim().min(1, "Choose a scope."),
});

export const DeploymentsPage: React.FC = () => {
  const {
    deployments,
    triggerNewRelease,
    rerunPipeline,
    envVars,
    addEnvVar,
    deleteEnvVar,
    toggleRevealEnvVar,
    revealAllEnvVars,
    toggleRevealAllEnvVars,
    deployOnPush,
    setDeployOnPush,
    ephemeralPr,
    setEphemeralPr,
    logs,
    clearLogs,
    theme,
    addToast,
    isDataLoading,
  } = useApp();

  const [activeTab, setActiveTab] = useState("deployments");
  const [latencyP99, setLatencyP99] = useState(18.4);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newScope, setNewScope] = useState("Production, Staging");
  const [envError, setEnvError] = useState("");
  const [envSearch, setEnvSearch] = useState("");
  const [isRerunning, setIsRerunning] = useState(false);
  const [isTriggeringRelease, setIsTriggeringRelease] = useState(false);
  const [deletingEnvId, setDeletingEnvId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Live latency jitter
  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyP99((prev) => +(prev + (Math.random() * 0.8 - 0.4)).toFixed(1));
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const handleCopyEnv = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    addToast({ type: "info", title: "Value copied to clipboard" });
  };

  const handleCreateEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = envVarSchema.safeParse({
      key: newKey,
      value: newValue,
      scope: newScope,
    });
    if (!parsed.success) {
      setEnvError(
        parsed.error.issues[0]?.message ||
          "Check the environment variable fields.",
      );
      return;
    }
    setEnvError("");
    try {
      await addEnvVar(parsed.data.key, parsed.data.value, parsed.data.scope);
      addToast({
        type: "success",
        title: "Env var added",
        description: `${newKey.toUpperCase()} has been saved.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Failed to add env var",
        description: "Please try again.",
      });
    }
    setNewKey("");
    setNewValue("");
    setIsAddingEnv(false);
  };

  const handleDeleteEnv = async (id: string, key: string) => {
    if (
      !(await friendlyConfirm(
        `Delete environment variable ${key}? This cannot be undone.`,
      ))
    )
      return;
    setDeletingEnvId(id);
    try {
      await deleteEnvVar(id);
      addToast({
        type: "info",
        title: "Env var removed",
        description: `${key} has been deleted.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Delete failed",
        description: "Could not remove the variable.",
      });
    } finally {
      setDeletingEnvId(null);
    }
  };

  const handleRerun = async () => {
    if (
      !(await friendlyConfirm(
        "Run the release pipeline again? This will restart the current build and may briefly update the live deployment status.",
      ))
    ) {
      return;
    }
    setIsRerunning(true);
    try {
      await rerunPipeline();
      addToast({
        type: "success",
        title: "Pipeline re-triggered",
        description: "Build is running. Check logs below.",
      });
    } catch {
      addToast({
        type: "error",
        title: "Re-run failed",
        description: "Could not restart the pipeline.",
      });
    } finally {
      setTimeout(() => setIsRerunning(false), 2000);
    }
  };

  const handleTriggerRelease = async () => {
    setIsTriggeringRelease(true);
    try {
      await triggerNewRelease();
      addToast({
        type: "success",
        title: "Release triggered!",
        description: "Pipeline is building and will go live shortly.",
      });
    } catch {
      addToast({
        type: "error",
        title: "Release failed",
        description: "Could not trigger the deployment pipeline.",
      });
    } finally {
      setIsTriggeringRelease(false);
    }
  };

  const filteredEnvVars = envVars.filter(
    (v) =>
      v.key.toLowerCase().includes(envSearch.toLowerCase()) ||
      v.scope.toLowerCase().includes(envSearch.toLowerCase()),
  );

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Live Releases & Health"
        subtitle="Monitor deployments, environment variables, and real-time pipeline logs."
        breadcrumbs={[{ label: "Deployments" }]}
        badge={{ text: "Live Traffic Routed", variant: "live" }}
        actions={
          <>
            <button
              onClick={() => void handleRerun()}
              disabled={isRerunning}
              className="px-3.5 py-2 rounded-xl bg-ide-panel hover:bg-ide-surface-toolbar border border-ide-border-strong text-xs font-mono text-ide-text-secondary flex items-center gap-2 transition-all disabled:opacity-60"
            >
              {isRerunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-ide-success" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{isRerunning ? "Re-running…" : "Re-run Pipeline"}</span>
            </button>

            <button
              onClick={() => void handleTriggerRelease()}
              disabled={isTriggeringRelease}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ide-accent-fg flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-98 disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
            >
              {isTriggeringRelease ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-ide-accent-fg" />
              ) : (
                <Rocket className="w-3.5 h-3.5 text-ide-accent-fg" />
              )}
              <span>
                {isTriggeringRelease ? "Deploying…" : "New Production Release"}
              </span>
            </button>
          </>
        }
      />

      <FriendlyHint
        title="What this page does"
        body="This is your deployment overview. It shows whether your app is healthy, when the last release happened, and whether the system is currently building or serving live traffic."
      />

      {/* 4 Metric Cards Row (Pixel-Perfect to Screenshot 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-ide-panel border border-ide-border-control rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ide-muted flex items-center gap-1">
            GLOBAL P99 LATENCY
            <HelpfulInfo
              text="P99 latency means how fast the app responds for almost all users. Lower is better."
              className="ml-1"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ide-text-strong font-mono">
              {latencyP99}ms
            </span>
            <span className="text-ide-success text-xs font-mono">/ p99</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-ide-panel border border-ide-border-control rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ide-muted">
            ACTIVE CONTAINERS
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ide-text-strong font-mono">
              24 / 24
            </span>
            <span className="text-ide-success text-xs font-mono">healthy</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-ide-panel border border-ide-border-control rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ide-muted">
            ROLLING SUCCESS RATE
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ide-text-strong font-mono">
              99.98%
            </span>
            <span className="text-ide-success text-xs font-mono">SLA</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-ide-panel border border-ide-border-control rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ide-muted">
            LAST SYNC
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ide-text-strong font-mono">
              4m ago
            </span>
            <span className="text-ide-text-soft text-xs font-mono">container</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar (Pixel-Perfect to Screenshot 4) */}
      <div className="flex flex-col gap-2 border-b border-ide-border-control sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full items-center gap-2 text-xs font-sans sm:gap-4">
              {[
                { id: "overview", label: "Overview" },
                { id: "deployments", label: "Deployments (Active)" },
                { id: "env", label: "Environment Variables" },
                { id: "branches", label: "Preview Branches" },
                { id: "pipelines", label: "Build Pipelines" },
                { id: "audit", label: "Access & Audit" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative h-11 shrink-0 whitespace-nowrap px-3 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ide-focus-ring ${
                    activeTab === tab.id
                      ? "text-ide-text-strong font-semibold"
                      : "text-ide-text-secondary hover:text-ide-text-strong"
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-ide-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-ide-bg to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-ide-bg to-transparent"
          />
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 pb-2 text-[11px] font-sans sm:pl-3">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ide-border-strong bg-ide-panel px-2.5 py-1 text-ide-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-ide-text-secondary" />
            98 commits
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ide-success/30 bg-ide-success/10 px-2.5 py-1 text-[var(--ide-color-success-readable)]">
            <span className="h-1.5 w-1.5 rounded-full bg-ide-success" />
            auto-sync on
          </span>
        </div>
      </div>

      {/* Grid Content: Active Deployments + CI/CD Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Active Deployments List (8 Cols) */}
        <div className="lg:col-span-8 bg-ide-workbench-bg border border-ide-border-control rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-ide-border-control pb-3">
            <div className="flex min-w-0 items-start gap-2">
              <Rocket className="w-4 h-4 text-ide-text-soft" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ide-text-strong">
                  Active Deployments
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-ide-text-secondary">
                  Current production routing and staged ephemeral workloads
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-ide-success">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-pulse" />
              Routing
            </div>
          </div>

          <div className="space-y-3 overflow-x-auto">
            {isDataLoading ? (
              <DeploymentCardSkeleton count={3} />
            ) : deployments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ide-border-strong p-8 text-center text-xs text-ide-text-soft">
                No deployments yet. Trigger a release to see it here.
              </div>
            ) : (
              deployments.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-ide-panel border border-ide-border-control hover:border-ide-border-strong rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-ide-text-strong hover:underline cursor-pointer">
                        {dep.target}
                      </span>
                      <a
                        href={`https://${dep.target}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ide-info hover:text-ide-info"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="text-[11px] text-ide-muted font-mono">
                      Target:{" "}
                      <span className="text-ide-text-soft">{dep.domain}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-ide-muted pt-1">
                      <span className="text-ide-success flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {dep.branch}
                      </span>
                      <span>
                        {dep.commitHash}: {dep.commitMessage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end font-mono text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${deploymentStatusClasses(dep.status).badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${deploymentStatusClasses(dep.status).dot}`}
                      />
                      {dep.status}
                    </span>

                    <div className="text-[11px] text-ide-muted">
                      <span>{dep.timestamp}</span> · <span>{dep.duration}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: CI/CD Automation Card (4 Cols) */}
        <div className="lg:col-span-4 bg-ide-workbench-bg border border-ide-border-control rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex min-w-0 items-start justify-between gap-3 border-b border-ide-border-control pb-3">
            <div className="flex min-w-0 items-start gap-2">
              <Zap className="w-4 h-4 text-ide-success" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ide-text-strong">CI/CD Automation</h3>
                <p className="mt-0.5 text-xs leading-5 text-ide-text-secondary">
                  Trigger build workers on pushes and release milestones.
                </p>
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded border border-ide-success/30 bg-ide-success/10 px-2 py-0.5 text-[10px] font-mono text-[var(--ide-color-success-readable)]">
              AUTO-ENABLED
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-ide-panel border border-ide-border-control">
              <div>
                <div className="text-xs font-semibold text-ide-text-strong">
                  Deploy on Git Push to main
                </div>
                <div className="text-[10px] font-mono text-ide-muted">
                  Trigger: github:refs/heads/main
                </div>
              </div>
              <button
                onClick={() => setDeployOnPush((prev) => !prev)}
                className={`w-10 h-5 rounded-full transition-colors relative ${deployOnPush ? "bg-ide-info" : "bg-ide-surface"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-ide-text-strong transition-transform ${deployOnPush ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-ide-panel border border-ide-border-control">
              <div>
                <div className="text-xs font-semibold text-ide-text-strong">
                  Ephemeral Pull Request Workspaces
                </div>
                <div className="text-[10px] font-mono text-ide-muted">
                  Bootstraps staging and database clones.
                </div>
              </div>
              <button
                onClick={() => setEphemeralPr((prev) => !prev)}
                className={`w-10 h-5 rounded-full transition-colors relative ${ephemeralPr ? "bg-ide-info" : "bg-ide-surface"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-ide-text-strong transition-transform ${ephemeralPr ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>

            {/* Turbo Cache Card */}
            <div className="p-3.5 rounded-xl bg-ide-panel border border-ide-border-strong text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-ide-text-strong font-medium">
                <Zap className="w-3.5 h-3.5 text-ide-warning" />
                <span>Turbo Layer Caches Active</span>
              </div>
              <p className="text-[11px] text-ide-muted leading-relaxed">
                Shared container image caches saved <strong>~$2,411</strong> off
                the latest build cycle.
              </p>
            </div>

            {/* Webhook */}
            <div className="flex items-center justify-between text-[11px] font-mono text-ide-muted pt-1">
              <span>Webhook ID: wh_8c998144</span>
              <button
                onClick={() => void friendlyAlert("Webhook secret re-generated.")}
                className="text-ide-text-soft hover:underline"
              >
                Re-generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Container Deployment Stream (Terminal Box matching Screenshot 4) */}
      <div className="bg-ide-workbench-bg border border-ide-border-strong rounded-2xl p-5 shadow-2xl terminal-card space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-ide-border-control">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ide-danger" />
              <span className="w-2.5 h-2.5 rounded-full bg-ide-warning" />
              <span className="w-2.5 h-2.5 rounded-full bg-ide-success" />
            </div>
            <span className="text-ide-text-strong font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-ide-success" />
              Live Container Deployment Stream
            </span>
            <span className="text-ide-text-soft text-[11px]">Target: c8ff3e8</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={clearLogs}
              className="text-ide-muted hover:text-ide-text-strong transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const streamText = logs
                  .map((l) => `${l.time} ${l.tag} ${l.text}`)
                  .join("\n");
                navigator.clipboard.writeText(streamText);
                void friendlyAlert("Terminal log stream copied to clipboard!");
              }}
              className="text-ide-muted hover:text-ide-text-strong transition-colors"
            >
              Copy Stream
            </button>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-ide-success/10 border border-ide-success/30 text-ide-text-strong text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        {/* Real-Time Terminal Output */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2 select-text">
          {logs.map((log) => (
            <div
              key={log.id}
              className="leading-relaxed flex items-start gap-2"
            >
              <span className="text-ide-info shrink-0">{log.time}</span>
              <span className={`${log.color} shrink-0 font-semibold`}>
                {log.tag}
              </span>
              <span className="text-ide-text-secondary">{log.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Bottom Row: Environment Variables Vault + Edge Topology (Pixel-Perfect to Screenshot 4) */}
      <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        {/* Environment Variables Manager (8 Cols) */}
        <div className="min-w-0 bg-ide-workbench-bg border border-ide-border-control rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-ide-border-control pb-3">
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ide-text-strong">
                <ShieldCheck className="h-4 w-4 shrink-0 text-ide-info" />
                Environment Variables
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-ide-text-secondary">
                Encrypted runtime secrets and build-time arguments.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  if (
                    !revealAllEnvVars &&
                    !(await friendlyConfirm(
                      "Reveal every environment variable value on screen?",
                    ))
                  )
                    return;
                  toggleRevealAllEnvVars();
                }}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-ide-border-strong bg-ide-panel px-3 text-ide-text-strong transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                {revealAllEnvVars ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{revealAllEnvVars ? "Hide All" : "Reveal All"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  void friendlyAlert("Synced latest secret values from HashiCorp Vault.")
                }
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-ide-border-strong bg-ide-panel px-3 text-ide-text-strong transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Sync from Vault
              </button>

              <button
                type="button"
                onClick={() => setIsAddingEnv(true)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ide-accent px-3 font-semibold text-ide-accent-fg shadow transition-colors duration-150 hover:bg-ide-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Variable</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter variables by name, scope, or target environment..."
              value={envSearch}
              onChange={(e) => setEnvSearch(e.target.value)}
              aria-label="Filter environment variables"
              className="w-full rounded-xl border border-ide-border-strong bg-ide-panel px-3 py-2 text-xs font-mono text-ide-text-strong placeholder:text-ide-text-secondary focus:outline-none focus:border-ide-focus-ring focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            />
          </div>

          {/* Variables Table */}
          <div className="space-y-2">
            {filteredEnvVars.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-ide-border-control bg-ide-panel p-3 text-xs font-mono"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div
                    title={item.key}
                    className="truncate font-bold tracking-wide text-ide-text-strong"
                  >
                    {item.key}
                    {item.key === "VECTOR_EMBEDDING_MODEL" && (
                      <span className="ml-2 text-[10px] font-normal text-ide-text-soft">
                        non-secret
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[10px] text-ide-text-secondary" title={`Scope: ${item.scope}`}>
                    Scope: <span className="inline-block max-w-[min(48vw,20rem)] truncate align-bottom">{item.scope}</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div title={item.isRevealed ? item.value : undefined} className="min-w-0 max-w-[min(42vw,200px)] flex-1 truncate rounded-lg border border-ide-border-control bg-ide-workbench-bg px-3 py-1.5 text-right text-ide-text-secondary">
                    {item.isRevealed ? item.value : "••••••••••••••••••••••••"}
                  </div>

                  <button
                    onClick={() => toggleRevealEnvVar(item.id)}
                    aria-label={item.isRevealed ? `Mask ${item.key}` : `Reveal ${item.key}`}
                    className="rounded p-1 text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                    title={item.isRevealed ? "Mask value" : "Reveal value"}
                  >
                    {item.isRevealed ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleCopyEnv(item.id, item.value)}
                    aria-label={`Copy ${item.key}`}
                    className="rounded p-1 text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                    title="Copy value"
                  >
                    {copiedKey === item.id ? (
                      <Check className="w-3.5 h-3.5 text-ide-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => void handleDeleteEnv(item.id, item.key)}
                    disabled={deletingEnvId === item.id}
                    className="rounded p-1 text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover hover:text-ide-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:opacity-50"
                    title="Delete variable"
                    aria-label={`Delete ${item.key}`}
                  >
                    {deletingEnvId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for adding new env var */}
          {isAddingEnv && (
            <div className="p-4 bg-ide-surface-toolbar border border-ide-border-strong rounded-xl space-y-3">
              <div className="text-xs font-bold text-ide-text-strong font-mono">
                Create Environment Variable
              </div>
              {envError && (
                <p className="text-xs text-ide-danger" role="alert">
                  {envError}
                </p>
              )}
              <form
                onSubmit={handleCreateEnv}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  type="text"
                  required
                  placeholder="KEY_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="px-3 py-2 bg-ide-panel border border-ide-border-strong rounded-lg text-xs font-mono text-ide-text-strong focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="secret-value-or-token"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="px-3 py-2 bg-ide-panel border border-ide-border-strong rounded-lg text-xs font-mono text-ide-text-strong focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scope (Production)"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="w-full px-3 py-2 bg-ide-panel border border-ide-border-strong rounded-lg text-xs font-mono text-ide-text-strong focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg font-semibold text-xs text-ide-accent-fg shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingEnv(false)}
                    className="px-2 py-2 rounded-lg bg-ide-surface text-xs text-ide-text-strong"
                  >
                    ✕
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Edge Topology Visualizer (4 Cols matching Screenshot 4) */}
        <div className="min-w-[320px] w-full shrink-0 overflow-visible space-y-4 rounded-2xl border border-ide-border-control bg-ide-workbench-bg p-5 shadow-xl">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-ide-border-control pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-ide-success" />
              <h3 className="whitespace-nowrap text-sm font-semibold text-ide-text-strong">Edge Topology</h3>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded border border-ide-success/30 bg-ide-success/15 px-2 py-0.5 text-[10px] font-mono text-[var(--ide-color-success-readable)]">
              32/32 POPs
            </span>
          </div>

          <p className="w-full break-normal [overflow-wrap:normal] text-xs leading-5 text-ide-text-secondary">
            Active POP edge gateways distributing ingress traffic across primary
            and preview pools.
          </p>

          {/* Topology Node Graph */}
          <div className="relative flex aspect-[2/1] min-h-36 w-full flex-col items-center justify-between rounded-xl border border-ide-border-control bg-ide-workbench-bg p-3">
            {/* Top Root Node */}
            <div className="z-20 rounded border border-ide-border-strong bg-ide-panel px-3 py-1 font-mono text-[10px] text-ide-text-strong">
              INGRESS ROOT
            </div>

            {/* Middle Edge Gateways */}
            <div className="z-20 flex w-full justify-around">
              <div className="rounded border border-ide-success/40 bg-ide-panel px-2 py-0.5 font-mono text-[10px] text-[var(--ide-color-success-readable)]">
                POP_US
              </div>
              <div className="rounded border border-ide-success/40 bg-ide-panel px-2 py-0.5 font-mono text-[10px] text-[var(--ide-color-success-readable)]">
                POP_EU
              </div>
              <div className="rounded border border-ide-success/40 bg-ide-panel px-2 py-0.5 font-mono text-[10px] text-ide-text-strong">
                POP_AP
              </div>
            </div>

            {/* Bottom Target */}
            <div
              className="z-20 rounded bg-ide-accent px-4 py-1 font-mono text-[10px] font-bold text-ide-accent-fg"
            >
              WARM DEVBOX MESH
            </div>

            {/* Connecting lines */}
            <svg
              className="pointer-events-none absolute inset-0 z-0 h-full w-full stroke-ide-border-strong"
              strokeWidth="1"
            >
              <line
                x1="50%"
                y1="20%"
                x2="20%"
                y2="50%"
                className="stroke-ide-success/50"
              />
              <line
                x1="50%"
                y1="20%"
                x2="50%"
                y2="50%"
                className="stroke-ide-success/50"
              />
              <line
                x1="50%"
                y1="20%"
                x2="80%"
                y2="50%"
                className="stroke-ide-success/50"
              />
              <line
                x1="20%"
                y1="50%"
                x2="50%"
                y2="85%"
                className="stroke-ide-info/50"
              />
              <line
                x1="50%"
                y1="50%"
                x2="50%"
                y2="85%"
                className="stroke-ide-info/50"
              />
              <line
                x1="80%"
                y1="50%"
                x2="50%"
                y2="85%"
                className="stroke-ide-info/50"
              />
            </svg>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0 flex-1 text-ide-text-secondary">BGP Routing</span>
              <strong className="max-w-[58%] text-right font-medium leading-5 text-ide-text-strong">Tier 1 Autonomous Sys</strong>
            </div>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0 flex-1 text-ide-text-secondary">SSL/TLS Termination</span>
              <strong className="max-w-[58%] whitespace-nowrap text-right font-mono text-[11px] font-medium text-ide-text-strong">TLS 1.3 - ChaCha20</strong>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 border-t border-ide-border-control pt-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-ide-success">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ide-success" />
                396k Users Active
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-ide-text-secondary">0 Shards / 20k</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
