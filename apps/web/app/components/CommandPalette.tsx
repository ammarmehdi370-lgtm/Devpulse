"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Code2,
  CreditCard,
  FilePlus,
  GitBranch,
  Keyboard,
  LogOut,
  MessageSquare,
  MonitorPlay,
  Moon,
  Palette,
  Rocket,
  Save,
  Search,
  Server,
  Settings2,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApp, type PageType } from "../context/AppContext";
import { DevpulseLogo } from "../../src/components/DevpulseLogo";

export type CommandCategory =
  | "navigation"
  | "editor"
  | "theme"
  | "account"
  | "action";

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void | Promise<void>;
  keywords?: string[];
}

type NavigationCommand = Pick<
  Command,
  "id" | "label" | "description" | "icon" | "shortcut" | "keywords"
> & {
  page: PageType;
};

const NAV_COMMANDS: NavigationCommand[] = [
  {
    id: "nav:workspaces",
    label: "Go to Workspaces",
    description: "Cloud Workspaces",
    icon: Server,
    shortcut: "⌥W",
    page: "workspaces",
    keywords: ["workspace", "devbox", "cloud"],
  },
  {
    id: "nav:repositories",
    label: "Go to Repositories",
    description: "Code Projects",
    icon: GitBranch,
    shortcut: "⌥R",
    page: "repositories",
    keywords: ["repo", "git", "code", "project"],
  },
  {
    id: "nav:editor",
    label: "Go to Editor",
    description: "Maestro Code Studio",
    icon: Code2,
    shortcut: "⌥E",
    page: "editor",
    keywords: ["code", "edit", "file", "monaco"],
  },
  {
    id: "nav:deployments",
    label: "Go to Deployments",
    description: "Live Releases & Health",
    icon: Rocket,
    shortcut: "⌥D",
    page: "deployments",
    keywords: ["deploy", "release", "pipeline"],
  },
  {
    id: "nav:chat",
    label: "Go to Team Chat",
    description: "Pulse Chat",
    icon: MessageSquare,
    shortcut: "⌥C",
    page: "chat",
    keywords: ["chat", "message", "team", "channel"],
  },
  {
    id: "nav:ai-studio",
    label: "Open AI Studio",
    description: "Full-screen AI workspace",
    icon: Sparkles,
    shortcut: "⌥A",
    page: "ai-studio",
    keywords: ["ai", "assistant", "claude", "chat"],
  },
  {
    id: "nav:remote-control",
    label: "Go to Remote Control",
    description: "Pulse Pilot",
    icon: MonitorPlay,
    shortcut: "⌥M",
    page: "remote-control",
    keywords: ["remote", "control", "pilot", "huddle", "pair"],
  },
  {
    id: "nav:activity",
    label: "Go to Activity",
    description: "Your Activity",
    icon: Activity,
    shortcut: "⌥Y",
    page: "activity",
    keywords: ["activity", "log", "history", "events", "timeline"],
  },
  {
    id: "nav:pricing",
    label: "View Plans & Pricing",
    description: "Plans & Billing",
    icon: CreditCard,
    shortcut: "⌥P",
    page: "pricing",
    keywords: ["plan", "billing", "price", "upgrade"],
  },
];

const CATEGORY_ORDER: CommandCategory[] = [
  "navigation",
  "editor",
  "theme",
  "account",
  "action",
];

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: "Navigation",
  editor: "Editor",
  theme: "Appearance",
  account: "Account",
  action: "Actions",
};

function fuzzyMatch(command: Command, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const candidates = [
    command.label,
    command.description ?? "",
    command.category,
    ...(command.keywords ?? []),
  ].map((candidate) => candidate.toLowerCase());

  return candidates.some((candidate) => {
    if (candidate.includes(needle)) return true;
    let queryIndex = 0;
    for (const character of candidate) {
      if (character === needle[queryIndex]) queryIndex += 1;
      if (queryIndex === needle.length) return true;
    }
    return false;
  });
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return <>{text}</>;

  let queryIndex = 0;
  const highlighted: React.ReactNode[] = [];
  let plain = "";
  for (let index = 0; index < text.length; index += 1) {
    const matches = queryIndex < needle.length
      && text[index]!.toLowerCase() === needle[queryIndex];
    if (matches) {
      if (plain) {
        highlighted.push(plain);
        plain = "";
      }
      highlighted.push(
        <mark
          key={`match-${index}`}
          className="rounded-sm bg-[var(--accent)]/30 text-inherit"
        >
          {text[index]}
        </mark>,
      );
      queryIndex += 1;
    } else {
      plain += text[index];
    }
  }
  if (plain) highlighted.push(plain);
  return <>{highlighted}</>;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setPage,
    availableThemes,
    setTheme,
    isEditorProjectOpen,
    activeFileId,
    saveFileContent,
    createNewFile,
    setIsAiDrawerOpen,
    setIsEditorProjectOpen,
    logout,
    triggerNewRelease,
    spinUpDevbox,
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const closePalette = useCallback(() => setIsCommandPaletteOpen(false), [setIsCommandPaletteOpen]);
  const navigate = useCallback((destination: PageType) => {
    setPage(destination);
    closePalette();
  }, [closePalette, setPage]);

  const commands = useMemo((): Command[] => {
    const navigationCommands: Command[] = NAV_COMMANDS.map(
      ({ page, ...command }) => ({
        ...command,
        category: "navigation",
        action: () => navigate(page),
      }),
    );

    const themeCommands: Command[] = [
      {
        id: "theme:picker",
        label: "Change Theme",
        description: "Open theme library",
        category: "theme",
        icon: Palette,
        keywords: ["theme", "color", "dark", "light"],
        action: () => navigate("theme"),
      },
      ...availableThemes.map((theme) => ({
        id: `theme:${theme.id}`,
        label: `Switch to ${theme.name}`,
        description: `${theme.mode === "light" ? "Light" : "Dark"} theme`,
        category: "theme" as const,
        icon: theme.mode === "light" ? Sun : Moon,
        keywords: [theme.id, theme.mode, theme.name],
        action: () => {
          setTheme(theme);
          closePalette();
        },
      })),
    ];

    const editorCommands: Command[] = isEditorProjectOpen
      ? [
          {
            id: "editor:save",
            label: "Save Current File",
            description: "Save changes to the active file",
            category: "editor",
            icon: Save,
            shortcut: "⌘S",
            keywords: ["save", "file"],
            action: async () => {
              if (activeFileId) await saveFileContent(activeFileId);
              closePalette();
            },
          },
          {
            id: "editor:new-file",
            label: "New File",
            description: "Create an untitled TypeScript file",
            category: "editor",
            icon: FilePlus,
            shortcut: "⌘N",
            keywords: ["new", "file", "create"],
            action: async () => {
              await createNewFile("untitled.ts");
              closePalette();
            },
          },
          {
            id: "editor:toggle-ai",
            label: "Toggle AI Assistant",
            category: "editor",
            icon: Bot,
            shortcut: "⌃I",
            keywords: ["ai", "assistant", "toggle"],
            action: () => {
              setIsAiDrawerOpen((open) => !open);
              closePalette();
            },
          },
          {
            id: "editor:close-project",
            label: "Close Project",
            category: "editor",
            icon: X,
            keywords: ["close", "exit", "project"],
            action: () => {
              setIsEditorProjectOpen(false);
              navigate("repositories");
            },
          },
        ]
      : [];

    const accountCommands: Command[] = [
      {
        id: "account:settings",
        label: "Open Settings",
        description: "Open settings and theme",
        category: "account",
        icon: Settings2,
        keywords: ["settings", "preferences"],
        action: () => navigate("settings"),
      },
      {
        id: "account:shortcuts",
        label: "Keyboard Shortcuts",
        description: "Show navigation shortcuts",
        category: "account",
        icon: Keyboard,
        shortcut: "⌘?",
        keywords: ["keyboard", "shortcut", "hotkey"],
        action: () => {
          closePalette();
          window.dispatchEvent(new CustomEvent("devpulse:show-shortcuts"));
        },
      },
      {
        id: "account:logout",
        label: "Sign Out",
        category: "account",
        icon: LogOut,
        keywords: ["logout", "sign out", "exit"],
        action: () => {
          logout();
          closePalette();
        },
      },
    ];

    const actionCommands: Command[] = [
      {
        id: "action:release",
        label: "Trigger New Production Release",
        description: "Start a deployment release",
        category: "action",
        icon: Rocket,
        keywords: ["deploy", "release", "production"],
        action: async () => {
          await triggerNewRelease();
          navigate("deployments");
        },
      },
      {
        id: "action:devbox",
        label: "Spin Up a Next.js Devbox",
        description: "Create a browser-local development workspace",
        category: "action",
        icon: Server,
        keywords: ["workspace", "devbox", "nextjs", "create"],
        action: async () => {
          await spinUpDevbox("nextjs-quick-box", "Next.js");
          navigate("workspaces");
        },
      },
    ];

    return [
      ...navigationCommands,
      ...editorCommands,
      ...themeCommands,
      ...accountCommands,
      ...actionCommands,
    ];
  }, [
    activeFileId,
    availableThemes,
    createNewFile,
    isEditorProjectOpen,
    logout,
    navigate,
    saveFileContent,
    setIsAiDrawerOpen,
    setIsEditorProjectOpen,
    setPage,
    setTheme,
    spinUpDevbox,
    triggerNewRelease,
  ]);

  const filteredCommands = useMemo(
    () => commands.filter((command) => fuzzyMatch(command, query)),
    [commands, query],
  );
  const groupedCommands = useMemo(() => {
    const groups = new Map<CommandCategory, Command[]>();
    for (const category of CATEGORY_ORDER) groups.set(category, []);
    for (const command of filteredCommands) {
      groups.get(command.category)?.push(command);
    }
    return CATEGORY_ORDER
      .map((category) => [category, groups.get(category) ?? []] as const)
      .filter(([, groupCommands]) => groupCommands.length > 0);
  }, [filteredCommands]);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selected = resultsRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${selectedIndex}"]`,
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) =>
        Math.min(index + 1, filteredCommands.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = filteredCommands[selectedIndex];
      if (command) {
        void Promise.resolve(command.action()).catch((error: unknown) => {
          console.error(`[CommandPalette] Command "${command.id}" failed.`, error);
        });
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  };

  let commandIndex = -1;

  return (
    <>
      <button
        type="button"
        aria-label="Close command palette"
        className="fixed inset-0 z-40 cursor-default bg-[var(--overlay)]"
        onClick={closePalette}
      />
      <section
        aria-label="Command palette"
        aria-modal="true"
        role="dialog"
        className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <DevpulseLogo size="sm" variant="mark" theme="dark" className="shrink-0" />
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            aria-label="Search commands"
            aria-controls="command-palette-results"
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--subtle)]"
          />
          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted)]">
            ESC
          </kbd>
        </div>

        <div
          id="command-palette-results"
          ref={resultsRef}
          className="max-h-80 overflow-y-auto py-1"
          role="listbox"
          aria-label="Commands"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                No commands found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            groupedCommands.map(([category, categoryCommands]) => (
              <div key={category}>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {CATEGORY_LABELS[category]}
                </p>
                {categoryCommands.map((command) => {
                  commandIndex += 1;
                  const index = commandIndex;
                  const selected = index === selectedIndex;
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-command-index={index}
                      onClick={() => {
                        void Promise.resolve(command.action()).catch((error: unknown) => {
                          console.error(`[CommandPalette] Command "${command.id}" failed.`, error);
                        });
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 ${
                        selected
                          ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "text-[var(--text)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 ${
                          selected ? "text-[var(--accent-fg)]" : "text-[var(--muted)]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          <HighlightedText text={command.label} query={query} />
                        </span>
                        {command.description && (
                          <span
                            className={`block truncate text-xs ${
                              selected ? "text-[var(--accent-fg)]/70" : "text-[var(--muted)]"
                            }`}
                          >
                            <HighlightedText text={command.description} query={query} />
                          </span>
                        )}
                      </span>
                      {command.shortcut && (
                        <kbd
                          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs ${
                            selected
                              ? "border-[var(--accent-fg)]/30 text-[var(--accent-fg)]/70"
                              : "border-[var(--border)] text-[var(--subtle)]"
                          }`}
                        >
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-2">
          <span className="flex items-center gap-1 text-xs text-[var(--subtle)]">
            <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--subtle)]">
            <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono">↵</kbd>
            select
          </span>
          <span className="ml-auto text-xs text-[var(--subtle)]">
            {filteredCommands.length} command{filteredCommands.length === 1 ? "" : "s"}
          </span>
        </footer>
      </section>
    </>
  );
};
