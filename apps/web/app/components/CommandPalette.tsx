"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp, PageType } from "../context/AppContext";
import {
  Search,
  Box,
  GitFork,
  Rocket,
  Palette,
  MessageSquare,
  Plus,
  Terminal,
  Zap,
  Radio,
  ArrowRight,
  Settings2,
  UserRoundPlus,
} from "lucide-react";

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setPage,
    triggerNewRelease,
    spinUpDevbox,
    theme,
  } = useApp();

  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCommandPaletteOpen) setQuery("");
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    searchInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    {
      id: "goto-editor",
      label: "Open Code Editor & Workbench",
      category: "Navigation",
      icon: Box,
      action: () => setPage("editor"),
    },
    {
      id: "goto-sandbox",
      label: "Open Virtual API Sandbox (Devpulse)",
      category: "Navigation",
      icon: Radio,
      action: () => setPage("api-sandbox"),
    },
    {
      id: "goto-remote",
      label: "Join Remote Control Pairing Session",
      category: "Navigation",
      icon: Terminal,
      action: () => setPage("remote-control"),
    },
    {
      id: "goto-ai",
      label: "Open Full-Screen AI Assistant Studio",
      category: "Navigation",
      icon: Zap,
      action: () => setPage("ai-studio"),
    },
    {
      id: "goto-pricing",
      label: "View Pricing & Plans",
      category: "Navigation",
      icon: Palette,
      action: () => setPage("pricing"),
    },
    {
      id: "goto-workspaces",
      label: "Go to Workspaces",
      category: "Navigation",
      icon: Box,
      action: () => setPage("workspaces"),
    },
    {
      id: "goto-repositories",
      label: "Go to Repositories",
      category: "Navigation",
      icon: GitFork,
      action: () => setPage("repositories"),
    },
    {
      id: "goto-deployments",
      label: "Go to Deployments",
      category: "Navigation",
      icon: Rocket,
      action: () => setPage("deployments"),
    },
    {
      id: "goto-theme",
      label: "Open Theme Palette",
      category: "Navigation",
      icon: Palette,
      action: () => setPage("theme"),
    },
    {
      id: "goto-settings",
      label: "Open Site Settings",
      category: "Navigation",
      icon: Settings2,
      action: () => setPage("settings"),
    },
    {
      id: "goto-account-connections",
      label: "Add or Link an Account",
      category: "Account",
      icon: UserRoundPlus,
      action: () => setPage("account-connections"),
    },
    {
      id: "goto-chat",
      label: "Open Team Chat",
      category: "Navigation",
      icon: MessageSquare,
      action: () => setPage("chat"),
    },
    {
      id: "act-release",
      label: "Trigger New Production Release",
      category: "Actions",
      icon: Zap,
      action: () => {
        triggerNewRelease();
        setPage("deployments");
      },
    },
    {
      id: "act-devbox",
      label: "Spin Up Next.js 15 Devbox",
      category: "Actions",
      icon: Plus,
      action: () => {
        spinUpDevbox("nextjs-quick-box", "Next.js 15");
        setPage("workspaces");
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="command-palette-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-8 pt-[12vh] backdrop-blur-md"
      onClick={() => setIsCommandPaletteOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setIsCommandPaletteOpen(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="command-palette-panel relative w-full max-w-xl overflow-hidden rounded-[22px] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-palette-topline" aria-hidden="true" />
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/[0.10] text-[#a9a4ff] shadow-[0_4px_16px_rgba(108,99,255,0.12)]">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Search pages, workspaces, and actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-[#77798d] focus:outline-none"
            aria-label="Search commands"
          />
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(false)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[10px] font-medium text-[#a0a1b1] transition hover:border-white/[0.16] hover:text-white"
            aria-label="Close command palette"
          >
            Esc
          </button>
        </div>

        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77798d]">
            Quick actions
          </span>
          <span className="text-[10px] text-[#66687a]">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </span>
        </div>
        <div className="max-h-[min(60vh,420px)] space-y-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <div className="mx-1 my-2 rounded-xl border border-dashed border-white/[0.09] px-4 py-8 text-center text-xs text-[#85869a]">
              No results for <span className="font-medium text-[#c6c6d2]">{query}</span>
            </div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsCommandPaletteOpen(false);
                  }}
                  className="command-palette-item group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="command-palette-icon flex h-9 w-9 items-center justify-center rounded-xl">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{cmd.label}</div>
                      <div className="mt-1 text-[10px] text-[#77798d]">
                        {cmd.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#686a7c] transition group-hover:translate-x-0.5 group-hover:text-[#0DF5C4]" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
