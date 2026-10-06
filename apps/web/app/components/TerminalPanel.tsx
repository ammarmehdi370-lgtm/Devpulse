"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { Maximize2, Minimize2, Plus, RefreshCw, X } from "lucide-react";
import { reconnectTerminalPreview } from "../services/editorMocks";

interface TerminalPanelProps {
  colorMode: "dark" | "light";
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  projectName: string;
}

interface TerminalTab {
  id: number;
  title: string;
}

const createTerminalTheme = (
  colorMode: "dark" | "light",
  primaryColor: string,
) => ({
  background: colorMode === "dark" ? "#0b0c11" : "#ffffff",
  foreground: colorMode === "dark" ? "#d7d9e2" : "#242938",
  cursor: primaryColor,
  cursorAccent: colorMode === "dark" ? "#0b0c11" : "#ffffff",
  selectionBackground:
    colorMode === "dark"
      ? "rgba(108, 99, 255, 0.35)"
      : "rgba(108, 99, 255, 0.22)",
  black: colorMode === "dark" ? "#171923" : "#242938",
  red: "#f07178",
  green: "#a1cf73",
  yellow: "#ffcb6b",
  blue: "#82aaff",
  magenta: "#c792ea",
  cyan: "#89ddff",
  white: colorMode === "dark" ? "#d7d9e2" : "#242938",
  brightBlack: "#676e95",
  brightRed: "#f07178",
  brightGreen: "#a1cf73",
  brightYellow: "#ffcb6b",
  brightBlue: "#82aaff",
  brightMagenta: "#c792ea",
  brightCyan: "#89ddff",
  brightWhite: colorMode === "dark" ? "#ffffff" : "#111827",
});

const TerminalTabView: React.FC<{
  active: boolean;
  colorMode: "dark" | "light";
  onClipboardError: (message: string | null) => void;
  primaryColor: string;
}> = ({ active, colorMode, onClipboardError, primaryColor }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputRef = useRef("");
  const clipboardErrorRef = useRef(onClipboardError);
  const terminalThemeRef = useRef({ colorMode, primaryColor });
  clipboardErrorRef.current = onClipboardError;
  terminalThemeRef.current = { colorMode, primaryColor };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      fontSize: 12,
      scrollback: 2000,
      theme: createTerminalTheme(
        terminalThemeRef.current.colorMode,
        terminalThemeRef.current.primaryColor,
      ),
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(
      new WebLinksAddon((_event, uri) => {
        window.open(uri, "_blank", "noopener,noreferrer");
      }),
    );
    terminal.open(host);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const writePrompt = () => {
      terminal.write(
        `\x1b[38;2;${Number.parseInt(terminalThemeRef.current.primaryColor.slice(1, 3), 16)};${Number.parseInt(terminalThemeRef.current.primaryColor.slice(3, 5), 16)};${Number.parseInt(terminalThemeRef.current.primaryColor.slice(5, 7), 16)}m$ \x1b[0m`,
      );
    };
    writePrompt();

    terminal.onData((data) => {
      let skipNextLineFeed = false;
      for (const character of data) {
        if (skipNextLineFeed) {
          skipNextLineFeed = false;
          if (character === "\n") continue;
        }
        if (character === "\r" || character === "\n") {
          skipNextLineFeed = character === "\r";
          terminal.write("\r\n");
          const command = inputRef.current.trim();
          inputRef.current = "";
          if (command) {
            terminal.write(
              "\x1b[90mCommands are not executed in this UI-only terminal.\x1b[0m\r\n",
            );
          }
          writePrompt();
          continue;
        }
        if (character === "\x03") {
          inputRef.current = "";
          terminal.write("^C\r\n");
          writePrompt();
          continue;
        }
        if (character === "\x7f" || character === "\b") {
          const inputCharacters = Array.from(inputRef.current);
          if (inputCharacters.length > 0) {
            inputCharacters.pop();
            inputRef.current = inputCharacters.join("");
            terminal.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          inputRef.current += character;
          terminal.write(character);
        }
      }
    });

    terminal.attachCustomKeyEventHandler((event) => {
      if (
        event.type !== "keydown" ||
        !event.ctrlKey ||
        !event.shiftKey ||
        (event.code !== "KeyC" && event.code !== "KeyV")
      ) {
        return true;
      }

      event.preventDefault();
      const clipboard = navigator.clipboard;
      if (!clipboard) {
        clipboardErrorRef.current(
          "Clipboard access is unavailable in this browser context.",
        );
        return false;
      }
      if (event.code === "KeyC") {
        const selection = terminal.getSelection();
        if (!selection) return false;
        void clipboard
          .writeText(selection)
          .then(() => clipboardErrorRef.current(null))
          .catch((error: unknown) => {
            clipboardErrorRef.current(
              error instanceof Error
                ? `Copy failed: ${error.message}`
                : "Copy failed: clipboard access is unavailable.",
            );
          });
      } else {
        void clipboard
          .readText()
          .then((text) => {
            terminal.paste(text);
            clipboardErrorRef.current(null);
          })
          .catch((error: unknown) => {
            clipboardErrorRef.current(
              error instanceof Error
                ? `Paste failed: ${error.message}`
                : "Paste failed: clipboard access is unavailable.",
            );
          });
      }
      return false;
    });

    const resizeObserver = new ResizeObserver(() => {
      if (host.clientWidth > 0 && host.clientHeight > 0) fitAddon.fit();
    });
    resizeObserver.observe(host);
    const resizeOnWindow = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) fitAddon.fit();
    };
    window.addEventListener("resize", resizeOnWindow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeOnWindow);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      inputRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = createTerminalTheme(
        colorMode,
        primaryColor,
      );
    }
    if (!active) return;

    const frame = window.requestAnimationFrame(() => {
      const host = hostRef.current;
      if (host && host.clientWidth > 0 && host.clientHeight > 0) {
        fitAddonRef.current?.fit();
        terminalRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, colorMode, primaryColor]);

  return (
    <div
      ref={hostRef}
      className="terminal-xterm-host"
      aria-label="Terminal input and output"
      hidden={!active}
    />
  );
};

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  colorMode,
  isOpen,
  onClose,
  primaryColor,
  projectName,
}) => {
  const nextTabId = useRef(2);
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 1, title: "Terminal 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [height, setHeight] = useState(260);
  const [hasCustomHeight, setHasCustomHeight] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isPreferencesRestored, setIsPreferencesRestored] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState(
    "Shell service is not connected.",
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ pointerY: number; height: number } | null>(
    null,
  );
  const previousHeightRef = useRef(260);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !isOpen;
  }, [isOpen]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("devpulse-terminal-layout");
      if (stored) {
        const preferences = JSON.parse(stored) as {
          tabs?: TerminalTab[];
          activeTabId?: number;
          height?: number;
        };
        if (preferences.tabs?.length) {
          setTabs(preferences.tabs);
          nextTabId.current = Math.max(...preferences.tabs.map((tab) => tab.id)) + 1;
          if (preferences.tabs.some((tab) => tab.id === preferences.activeTabId)) {
            setActiveTabId(preferences.activeTabId!);
          } else {
            setActiveTabId(preferences.tabs[0]!.id);
          }
        }
        if (typeof preferences.height === "number" && preferences.height >= 140) {
          setHeight(preferences.height);
          setHasCustomHeight(true);
        }
      }
    } catch (error) {
      console.error("Unable to restore terminal layout.", error);
    }
    setIsPreferencesRestored(true);
  }, []);

  useEffect(() => {
    if (!isPreferencesRestored) return;
    try {
      window.localStorage.setItem(
        "devpulse-terminal-layout",
        JSON.stringify({ tabs, activeTabId, height }),
      );
    } catch (error) {
      console.error("Unable to persist terminal layout.", error);
    }
  }, [activeTabId, height, isPreferencesRestored, tabs]);

  const getMaxHeight = useCallback(() => {
    const parentHeight =
      panelRef.current?.parentElement?.clientHeight ??
      (typeof window === "undefined" ? 0 : window.innerHeight);
    return Math.max(140, parentHeight - 60);
  }, []);

  useEffect(() => {
    const parent = panelRef.current?.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => {
      const maxHeight = getMaxHeight();
      if (!hasCustomHeight && !isMaximized) {
        setHeight(Math.min(maxHeight, Math.max(140, parent.clientHeight * 0.3)));
      } else if (!isMaximized) {
        setHeight((current) => Math.min(current, maxHeight));
      }
    });
    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [getMaxHeight, hasCustomHeight, isMaximized]);

  const addTab = () => {
    const id = nextTabId.current++;
    setTabs((current) => [...current, { id, title: `Terminal ${id}` }]);
    setActiveTabId(id);
    setClipboardError(null);
  };

  const closeTab = (id: number) => {
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining[remaining.length - 1]!.id);
  };

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const start = resizeStartRef.current;
    if (!start) return;
    const parentHeight =
      panelRef.current?.parentElement?.clientHeight ??
      (typeof window === "undefined" ? 0 : window.innerHeight);
    const maxHeight = Math.max(140, parentHeight - 240);
    setHeight(
      Math.max(
        140,
        Math.min(maxHeight, start.height + start.pointerY - event.clientY),
      ),
    );
    setHasCustomHeight(true);
    setIsMaximized(false);
  }, []);

  const handlePointerUp = useCallback(() => {
    resizeStartRef.current = null;
    setIsResizing(false);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const parentHeight =
    panelRef.current?.parentElement?.clientHeight ??
    (typeof window === "undefined" ? 0 : window.innerHeight);
  const maxResizableHeight = Math.max(140, parentHeight - 240);
  const panelHeight = isMaximized ? getMaxHeight() : height;

  return (
    <section
      ref={panelRef}
      className={`terminal-panel shrink-0 ${isOpen ? "terminal-panel-open" : ""} ${isResizing ? "terminal-panel-resizing" : ""}`}
      style={{ height: isOpen ? panelHeight : 0 }}
      aria-label="Integrated terminal"
      aria-hidden={!isOpen}
    >
      <div
        className="terminal-resize-handle"
        role="separator"
        tabIndex={0}
        aria-label="Resize terminal panel"
        aria-orientation="horizontal"
        aria-valuenow={panelHeight}
        aria-valuemin={140}
        aria-valuemax={isMaximized ? getMaxHeight() : maxResizableHeight}
        onPointerDown={(event) => {
          event.preventDefault();
          resizeStartRef.current = { pointerY: event.clientY, height: panelHeight };
          setIsResizing(true);
        }}
        onDoubleClick={() => {
          const parentHeight =
            panelRef.current?.parentElement?.clientHeight ?? window.innerHeight;
          setHeight(Math.max(140, Math.min(parentHeight - 240, parentHeight * 0.3)));
          setHasCustomHeight(false);
          setIsMaximized(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          const adjustment = event.key === "ArrowUp" ? 12 : -12;
          setHeight((current) =>
            Math.max(
              140,
              Math.min(maxResizableHeight, current + adjustment),
            ),
          );
          setHasCustomHeight(true);
          setIsMaximized(false);
        }}
      />
      <header className="terminal-panel-header">
        <div
          className="terminal-tabs"
          role="tablist"
          aria-label="Terminal tabs"
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`terminal-tab ${activeTabId === tab.id ? "terminal-tab-active" : ""}`}
            >
              <button
                type="button"
                className="terminal-tab-select"
                role="tab"
                aria-label={tab.title}
                aria-selected={activeTabId === tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setClipboardError(null);
                }}
              >
                {tab.title}
              </button>
              <button
                type="button"
                className="terminal-tab-close"
                aria-label={`Close ${tab.title}`}
                title={`Close ${tab.title}`}
                onClick={() => closeTab(tab.id)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="terminal-toolbar-button"
            aria-label="Create new terminal tab"
            title="New terminal"
            onClick={addTab}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="terminal-panel-actions">
          <span className="terminal-project-label" title={projectName}>
            {projectName || "Workspace"}
          </span>
          <span
            className="terminal-connection-status"
            title="This panel is a UI preview; shell commands are not executed."
            role="status"
          >
            <span className="terminal-connection-indicator" aria-hidden="true" />
            Shell unavailable
          </span>
          <button
            type="button"
            className="terminal-reconnect-button"
            aria-label="Reconnect terminal shell"
            title="Reconnect shell service"
            disabled={isReconnecting}
            onClick={() => {
              setIsReconnecting(true);
              void reconnectTerminalPreview()
                .then((result) => setConnectionMessage(result.message))
                .catch((error: unknown) => {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not reconnect to shell service.";
                  setConnectionMessage(message);
                })
                .finally(() => setIsReconnecting(false));
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${isReconnecting ? "animate-spin" : ""}`}
            />
            <span>{isReconnecting ? "Retrying" : "Reconnect"}</span>
          </button>
          <button
            type="button"
            className="terminal-toolbar-button"
            aria-label={isMaximized ? "Restore terminal size" : "Maximize terminal"}
            title={isMaximized ? "Restore terminal" : "Maximize terminal"}
            aria-pressed={isMaximized}
            onClick={() => {
              if (isMaximized) {
                setHeight(Math.min(previousHeightRef.current, getMaxHeight()));
                setIsMaximized(false);
                return;
              }
              previousHeightRef.current = height;
              setIsMaximized(true);
            }}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="terminal-toolbar-button"
            aria-label="Close terminal panel"
            title="Close panel (Ctrl+`)"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="terminal-panel-content">
        {tabs.map((tab) => (
          <TerminalTabView
            key={tab.id}
            active={isOpen && tab.id === activeTabId}
            colorMode={colorMode}
            onClipboardError={setClipboardError}
            primaryColor={primaryColor}
          />
        ))}
      </div>
      <div className="terminal-panel-status" aria-live="polite">
        {clipboardError ??
          `Terminal preview · ${connectionMessage} Editor project: ${projectName || "Local workspace"}.`}
      </div>
    </section>
  );
};
