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
} from "lucide-react";

export const WorkspacesPage: React.FC = () => {
  const {
    workspaces,
    spinUpDevbox,
    toggleWorkspaceStatus,
    deleteWorkspace,
    theme,
    setPage,
  } = useApp();

  const [cloneUrl, setCloneUrl] = useState("https://github.com/org/repo.git");
  const [selectedTemplate, setSelectedTemplate] = useState("Next.js 15");
  const [cliCopied, setCliCopied] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

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
    if (!cloneUrl.trim()) return;
    setIsCloning(true);
    setTimeout(() => {
      const repoName =
        cloneUrl.split("/").pop()?.replace(".git", "") || "cloned-workspace";
      spinUpDevbox(`${repoName}-devbox`, "Git Imported Container", cloneUrl);
      setIsCloning(false);
    }, 800);
  };

  const handleSpinUpTemplate = () => {
    spinUpDevbox(
      `${selectedTemplate.toLowerCase().replace(/[^a-z0-9]/g, "-")}-box`,
      selectedTemplate,
    );
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(
      "curl -fsSL https://devpulse.dev/install.sh | sh",
    );
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2000);
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-8">
      {/* Top Welcome Banner (Pixel-Perfect to Screenshot 3) */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2">
          {/* Cloud Engine Badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0DF5C4]/10 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
            <span className="font-semibold text-white">CLOUD ENGINE v2.4</span>
            <span className="text-[#8c8ca5]">
              · Zero-latency clusters ready
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome to Devpulse, Alex.
          </h1>
          <h2 className="text-xl sm:text-2xl font-medium text-[#c0c0d8] tracking-tight">
            Let's create your first cloud devbox.
          </h2>
          <p className="text-xs sm:text-sm text-[#84849e] max-w-2xl leading-relaxed">
            Spin up an isolated containerized environment in under 2 seconds.
            Fully ephemeral, synchronized, and pre-configured.
          </p>
        </div>

        {/* Fleet Region & Boot pool widgets */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#12121b] border border-[#202030] rounded-xl p-3 text-right font-mono text-xs">
            <div className="text-[10px] text-[#6b6b88] uppercase tracking-wider">
              ACTIVE FLEET REGION
            </div>
            <div className="text-[#0DF5C4] font-bold mt-0.5">
              us-east-nitro-4
            </div>
          </div>
          <div className="bg-[#12121b] border border-[#202030] rounded-xl p-3 text-right font-mono text-xs">
            <div className="text-[10px] text-[#6b6b88] uppercase tracking-wider">
              WARM WARMUP POOL
            </div>
            <div className="text-[#0DF5C4] font-bold mt-0.5">
              1.18s avg boot
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Options Cards Grid (Pixel-Perfect to Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* OPTION 01: Clone a Git Repository */}
        <div className="bg-[#12121b] border border-[#222234] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/30 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-[#62627e] uppercase tracking-wider">
                OPTION 01
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Clone a Git Repository
              </h3>
              <p className="text-xs text-[#8c8ca5] leading-relaxed">
                Import directly from GitHub, GitLab, or any public/private Git
                URL with automatic environment detection.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-mono text-[#6c6c88] uppercase tracking-wider block">
                REPOSITORY REMOTE URL
              </label>
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className="w-full px-3 py-2 bg-[#171724] border border-[#28283c] rounded-xl text-xs font-mono text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#6C63FF]"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-[#7e7e98] pt-1">
                <span className="flex items-center gap-1 text-[#0DF5C4]">
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
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#09090e] flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-98"
              style={{ backgroundColor: theme.primary }}
            >
              <span>
                {isCloning ? "Cloning & Provisioning..." : "Import Repository"}
              </span>
              <ArrowRight className="w-4 h-4 text-[#09090e]" />
            </button>
          </div>
        </div>

        {/* OPTION 02: Start from a Template */}
        <div className="bg-[#12121b] border border-[#222234] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#0DF5C4]/15 text-[#0DF5C4] border border-[#0DF5C4]/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0DF5C4]/10 text-[#0DF5C4] border border-[#0DF5C4]/30">
                  Instant Boot
                </span>
                <span className="text-[11px] font-mono text-[#62627e] uppercase tracking-wider">
                  OPTION 02
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Start from a Template
              </h3>
              <p className="text-xs text-[#8c8ca5] leading-relaxed">
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
                      ? "bg-white/10 border-white/40 text-white"
                      : "bg-[#171724] border-[#262638] text-[#8e8ea6] hover:border-white/20"
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                  </div>
                  <div className="text-[10px] text-[#63637e] font-mono truncate">
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
                  ? "bg-white/10 border-white/40 text-white"
                  : "bg-[#171724] border-[#262638] text-[#8e8ea6] hover:border-white/20"
              }`}
            >
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span>🧠</span>
                <span>PyTorch AI Agent</span>
              </div>
              <div className="text-[10px] text-[#63637e] font-mono">
                CUDA runtime · HuggingFace accelerated
              </div>
            </button>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSpinUpTemplate}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#1a1a28] hover:bg-[#222234] border border-[#313146] text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#0DF5C4]" />
              <span>Spin Up {selectedTemplate}</span>
            </button>
          </div>
        </div>

        {/* OPTION 03: Connect Local Machine */}
        <div className="bg-[#12121b] border border-[#222234] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#FF9E64]/15 text-[#FF9E64] border border-[#FF9E64]/30 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-[#62627e] uppercase tracking-wider">
                OPTION 03
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Connect Local Machine
              </h3>
              <p className="text-xs text-[#8c8ca5] leading-relaxed">
                Bridge your native laptop environment directly to high-spec
                cloud devboxes via our zero-config agent.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px] font-mono text-[#6c6c88] uppercase tracking-wider">
                <span>SINGLE LINE CLI COMMAND</span>
                <span className="text-[#0DF5C4]">Wireguard Tunnel</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value="curl -fsSL https://devpulse.dev/i: |"
                  className="w-full pl-3 pr-10 py-2.5 bg-[#171724] border border-[#28283c] rounded-xl text-xs font-mono text-[#0DF5C4] focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyCli}
                  className="absolute right-2 p-1.5 rounded-lg bg-[#202030] hover:bg-[#2a2a3e] text-[#8e8ea8] hover:text-white"
                  title="Copy command"
                >
                  {cliCopied ? (
                    <Check className="w-3.5 h-3.5 text-[#0DF5C4]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-[#6b6b85] font-mono">
                ⓘ Installs binary & prompts OAuth authorization
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCopyCli}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#1a1a28] hover:bg-[#222234] border border-[#313146] text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CLI for macOS & Linux</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Workspaces & Starred Repositories (Pixel-Perfect to Screenshot 3) */}
      <div className="bg-[#101017] border border-[#20202e] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c1c2a]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#8c8ca5]" />
            <h3 className="text-sm font-bold text-white">
              Recent Workspaces & Starred Repositories
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#1b1b28] text-[#8c8ca5] border border-[#28283a]">
              {workspaces.length} Total
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              onClick={() =>
                alert(
                  "Devpulse Cloud Documentation: Hypervisor MicroVM Specs & Architecture",
                )
              }
              className="text-[#8c8ca5] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read Documentation</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setPage("repositories")}
              className="text-[#8c8ca5] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>Explore Sample Projects</span>
            </button>
          </div>
        </div>

        {/* Dynamic Devbox Workspace Cards */}
        {workspaces.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#777792]">
            You don't have any running workspaces yet. Once launched, your
            compute instances, pinned ports, and environment secrets will
            populate here for fast resumption.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="bg-[#141420] border border-[#222232] hover:border-[#2e2e42] rounded-xl p-4 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {ws.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 ${
                          ws.status === "Running"
                            ? "bg-[#0DF5C4]/15 text-[#0DF5C4] border border-[#0DF5C4]/30"
                            : "bg-[#FF9E64]/15 text-[#FF9E64] border border-[#FF9E64]/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${ws.status === "Running" ? "bg-[#0DF5C4] animate-pulse" : "bg-[#FF9E64]"}`}
                        />
                        {ws.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7e7e9a] font-mono mt-0.5">
                      {ws.template} · port :{ws.port}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleWorkspaceStatus(ws.id)}
                      title={
                        ws.status === "Running"
                          ? "Stop Workspace"
                          : "Start Workspace"
                      }
                      className="p-1.5 rounded-lg bg-[#1c1c2b] hover:bg-[#252538] text-[#a0a0be] hover:text-white transition-colors"
                    >
                      {ws.status === "Running" ? (
                        <Square className="w-3.5 h-3.5 text-[#FF9E64]" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#0DF5C4]" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteWorkspace(ws.id)}
                      title="Destroy Workspace"
                      className="p-1.5 rounded-lg bg-[#1c1c2b] hover:bg-[#252538] text-[#a0a0be] hover:text-[#f87171] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#777790] pt-2 border-t border-[#1d1d2b]">
                  <div className="flex items-center gap-3">
                    <span>{ws.vCpu} vCPU</span>
                    <span>{ws.ram}</span>
                    <span>{ws.storage}</span>
                  </div>
                  <a
                    href={ws.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6C63FF] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Connect</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hypervisor Architecture Specs & Interactive Topology Diagram (Pixel-Perfect to Screenshot 3) */}
      <div className="bg-[#101017] border border-[#20202e] rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <div className="text-[10px] font-mono text-[#0DF5C4] uppercase tracking-wider mb-1">
            HYPERVISOR ARCHITECTURE
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Every devbox includes standard dedicated microVM specs
          </h3>
          <p className="text-xs text-[#8888a2] max-w-3xl mt-1 leading-relaxed">
            Shared-nothing microkernels boot with dedicated NVMe write caches,
            zero-trust ephemeral peer rings, and pre-warmed language LSP
            servers.
          </p>

          {/* Specs Chips */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="px-4 py-2 rounded-xl bg-[#151522] border border-[#242436] font-mono text-xs">
              <span className="text-[#6c6c88]">CPU </span>
              <strong className="text-white ml-1">8 Dedicated vCPU</strong>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#151522] border border-[#242436] font-mono text-xs">
              <span className="text-[#6c6c88]">MEMORY </span>
              <strong className="text-white ml-1">32 GB ECC RAM</strong>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#151522] border border-[#242436] font-mono text-xs">
              <span className="text-[#6c6c88]">STORAGE </span>
              <strong className="text-white ml-1">100 GB NVMe</strong>
            </div>
          </div>
        </div>

        {/* Visual Architecture Node Flow Diagram (Matching Screenshot 3 right side) */}
        <div className="h-44 bg-[#0a0a10] border border-[#1d1d2b] rounded-xl p-4 flex items-center justify-around relative overflow-hidden font-mono text-xs">
          {/* Node: CLIENT */}
          <div className="z-10 text-center">
            <div className="px-4 py-2 rounded-lg bg-[#141422] border border-[#282840] text-[#a4a4c6] shadow-lg">
              CLIENT
            </div>
          </div>

          {/* Connecting SVG lines with dashed glowing animations */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none stroke-[#2a2a44]"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          >
            <line
              x1="20%"
              y1="50%"
              x2="50%"
              y2="25%"
              className="stroke-[#0DF5C4]/60"
            />
            <line
              x1="20%"
              y1="50%"
              x2="50%"
              y2="75%"
              className="stroke-[#FF9E64]/60"
            />
            <line
              x1="50%"
              y1="25%"
              x2="80%"
              y2="50%"
              className="stroke-[#0DF5C4]/60"
            />
            <line
              x1="50%"
              y1="75%"
              x2="80%"
              y2="50%"
              className="stroke-[#FF9E64]/60"
            />
          </svg>

          {/* Center Nodes: FlowTracker & LSP Sync */}
          <div className="z-10 flex flex-col justify-between h-full py-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#0DF5C4]/10 border border-[#0DF5C4]/40 text-[#0DF5C4] text-[11px] shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-ping" />
              FlowTracker
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#FF9E64]/10 border border-[#FF9E64]/40 text-[#FF9E64] text-[11px] shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9E64]" />
              LSP Sync
            </div>
          </div>

          {/* Node: DEVBOX */}
          <div className="z-10 text-center">
            <div
              className="px-4 py-2 rounded-lg text-white font-bold shadow-lg flex items-center gap-2"
              style={{
                backgroundColor: `${theme.primary}30`,
                borderColor: theme.primary,
                borderWidth: 1,
              }}
            >
              <Server className="w-3.5 h-3.5 text-[#0DF5C4]" />
              <span>DEVBOX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Productivity Accelerators Bar (Pixel-Perfect to Screenshot 3) */}
      <div className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#6d6d88] border-t border-[#1a1a28]">
        <div className="flex items-center gap-2">
          <span className="text-[#8c8ca5] font-semibold">
            PRODUCTIVITY ACCELERATORS:
          </span>
          <span>⚡ Quick command palette</span>
          <span>·</span>
          <span>Jump to file & symbol</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161624] border border-[#27273a] text-white">
              Ctrl+`
            </kbd>{" "}
            Open integrated terminal
          </span>
          <span>
            Press{" "}
            <kbd className="px-1 rounded bg-[#161624] border border-[#27273a] text-white">
              ?
            </kbd>{" "}
            for keyboard map
          </span>
        </div>
      </div>
    </div>
  );
};
