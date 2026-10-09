"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp, Star, Trash2, Upload } from "lucide-react";
import { useApp, type ThemeConfig } from "../context/AppContext";
import { BUILT_IN_THEME_IDS } from "../context/themeModel";
import { convertVscodeThemeToAppTheme } from "../editor/vscodeThemeConverter";

const FAVORITES_KEY = "devpulse_theme_favorites";
const RECENTS_KEY = "devpulse_recent_themes";

const readIds = (key: string): string[] => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch (error) {
    console.error(`Unable to restore ${key}.`, error);
    return [];
  }
};

const writeIds = (key: string, ids: string[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch (error) {
    console.error(`Unable to save ${key}.`, error);
  }
};

export const ThemePreviewCard: React.FC<{
  theme: ThemeConfig;
  compact?: boolean;
  className?: string;
}> = ({ theme, compact = false, className = "" }) => (
  <div
    className={`flex w-full min-w-0 max-w-full flex-col rounded-xl border shadow-[0_0_28px_color-mix(in_srgb,var(--ide-color-accent)_14%,transparent)] transition-shadow duration-200 ${compact ? "text-[85%]" : ""} ${className}`}
    style={{ background: theme.ui.bg, borderColor: theme.ui.border }}
    aria-label={`Live preview of ${theme.name}`}
  >
    <div className={`flex min-w-0 flex-1 ${compact ? "min-h-[104px]" : "min-h-40"}`}>
      <aside
        className="w-1/5 min-w-0 shrink-0 space-y-3 border-r p-3 text-[10px]"
        style={{ background: theme.ui["sidebar-bg"], borderColor: theme.ui.border, color: theme.ui.muted }}
      >
        <div className="h-2 w-2/3 rounded" style={{ background: theme.ui.accent }} />
        <div>src</div>
        <div className="pl-2">app.tsx</div>
        <div className="pl-2">theme.css</div>
      </aside>
      <div className="min-w-0 flex-1">
        <div
          className="border-b px-4 py-2 font-mono text-[10px]"
          style={{ background: theme.ui["tab-active"], borderColor: theme.ui.border, color: theme.ui["text-strong"] }}
        >
          app.tsx
        </div>
        <div className="min-w-0 space-y-1 px-2 py-2 font-mono text-[10px] leading-4 sm:px-4 sm:py-3 sm:text-xs sm:leading-5">
          <div className="whitespace-nowrap"><span style={{ color: theme.syntax.keyword }}>const</span>{" "}
            <span style={{ color: theme.syntax.foreground }}>workspace</span> = {"{"}
          </div>
          <div className="min-w-0 truncate pl-2 sm:pl-4"><span style={{ color: theme.syntax.foreground }}>theme</span>:{" "}
            <span style={{ color: theme.syntax.string }}>&quot;{theme.name}&quot;</span>,
          </div>
          <div className="truncate pl-2 sm:pl-4" style={{ color: theme.syntax.comment }}>{"// ready to build"}</div>
          <div className="whitespace-nowrap">{"}"}</div>
        </div>
      </div>
    </div>
    <div
      className="flex h-6 items-center gap-2 border-t px-3 font-mono text-[9px]"
      style={{
        background: theme.terminal.bg,
        borderColor: theme.ui.border,
        color: theme.terminal.fg,
      }}
    >
      <span style={{ color: theme.terminal.ansi.green }}>›</span>
      pnpm dev
      <span style={{ color: theme.terminal.ansi.brightBlack }}>ready</span>
    </div>
    <div
      className="flex items-center justify-between px-3 py-1.5 text-[10px]"
      style={{ background: theme.ui["statusbar-bg"], color: theme.ui["statusbar-fg"] }}
    >
      <span>main</span><span>TypeScript · Ln 1, Col 1</span><span>Ready</span>
    </div>
  </div>
);

export const ThemeMenu: React.FC<{ showDetails?: boolean }> = ({ showDetails = false }) => {
  const {
    theme,
    setTheme,
    availableThemes,
    importedThemes,
    addImportedTheme,
    deleteImportedTheme,
    isClientStorageHydrated,
  } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [highlightedId, setHighlightedId] = useState(theme.id);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [libraryThemes, setLibraryThemes] = useState<ThemeConfig[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [importName, setImportName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const themes = useMemo(() => {
    const unique = [...availableThemes, ...libraryThemes, ...importedThemes].filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.id === item.id) === index,
    );
    return unique;
  }, [availableThemes, importedThemes, libraryThemes]);
  const groups = [
    { label: "Default", items: themes.filter((item) => item.group === "Default") },
    { label: "Dark", items: themes.filter((item) => item.group === "Dark" || (item.group === "Custom" && item.type !== "light")) },
    { label: "Light", items: themes.filter((item) => item.group === "Light" || (item.group === "Custom" && item.type === "light")) },
  ];

  useEffect(() => {
    let mounted = true;
    import("../context/themeLibrary")
      .then(({ loadThemeLibrary }) => loadThemeLibrary())
      .then((loadedThemes) => {
        if (mounted) setLibraryThemes(loadedThemes);
      })
      .catch((error: unknown) => {
        console.error("Unable to load themes for the theme menu.", error);
        setLibraryError("Built-in themes could not be loaded.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isClientStorageHydrated) return;
    const validIds = new Set([
      ...BUILT_IN_THEME_IDS,
      ...themes.map((item) => item.id),
    ]);
    const normalize = (ids: string[], limit?: number) => {
      const defaultId = availableThemes[0]?.id ?? "default";
      return [...new Set(ids.map((id) => validIds.has(id) ? id : defaultId))]
        .slice(0, limit);
    };
    const normalizedFavorites = normalize(readIds(FAVORITES_KEY));
    const normalizedRecents = normalize(readIds(RECENTS_KEY), 6);
    setFavorites(normalizedFavorites);
    setRecents(normalizedRecents);
    writeIds(FAVORITES_KEY, normalizedFavorites);
    writeIds(RECENTS_KEY, normalizedRecents);
  }, [availableThemes, isClientStorageHydrated, themes]);

  useEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 24;
      const spaceAbove = rect.top - 24;
      const openAbove = spaceBelow < 384 && spaceAbove > spaceBelow;
      setOpensUp(openAbove);
      setPanelPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: openAbove ? rect.top - 8 : rect.bottom + 8,
        width: rect.width,
        maxHeight: Math.max(120, Math.min(384, openAbove ? spaceAbove : spaceBelow)),
      });
    };
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(`[data-theme-option="${theme.id}"]`)
        ?.focus();
    });
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open, theme.id]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  });

  const closeMenu = (returnFocus = false) => {
    setOpen(false);
    setHighlightedId(theme.id);
    if (returnFocus) triggerRef.current?.focus();
  };

  const chooseTheme = (selected: ThemeConfig) => {
    setTheme(selected);
    const next = [selected.id, ...recents.filter((id) => id !== selected.id)].slice(0, 6);
    setRecents(next);
    writeIds(RECENTS_KEY, next);
    closeMenu(true);
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [id, ...favorites];
    setFavorites(next);
    writeIds(FAVORITES_KEY, next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const currentIndex = themes.findIndex((item) => item.id === highlightedId);
      const offset = event.key === "ArrowDown" ? 1 : -1;
      const next = themes[(currentIndex + offset + themes.length) % themes.length];
      if (next) {
        setHighlightedId(next.id);
        rootRef.current
          ?.querySelector<HTMLButtonElement>(`[data-theme-option="${next.id}"]`)
          ?.focus();
      }
      return;
    }
    if (
      event.key === "Enter" &&
      open &&
      (event.target as HTMLElement).getAttribute("role") === "option"
    ) {
      event.preventDefault();
      const selected = themes.find((item) => item.id === highlightedId);
      if (selected) chooseTheme(selected);
    }
  };

  const importTheme = async () => {
    if (!pendingFiles.length) return;
    if (!importName.trim()) {
      setImportError("Enter a name for this theme before saving.");
      return;
    }
    setImportError("");
    setIsImporting(true);
    try {
      const selectedFiles = pendingFiles;
      const mainFile = selectedFiles[0];
      if (!mainFile) throw new Error("Select a VS Code theme JSON file.");
      const fileByPath = new Map<string, File>();
      selectedFiles.forEach((file) => {
        fileByPath.set(file.name.toLowerCase(), file);
        if (file.webkitRelativePath) fileByPath.set(file.webkitRelativePath.toLowerCase(), file);
      });
      const resolveInclude = async (include: string) => {
        const path = include.replace(/\\/g, "/").replace(/^(\.\/)+/, "").toLowerCase();
        const included = fileByPath.get(path) ?? fileByPath.get(path.split("/").pop() ?? "");
        if (!included) {
          throw new Error(`Theme include "${include}" was not selected. Select the main theme file and all included JSON files together.`);
        }
        return included.text();
      };
      const imported = await convertVscodeThemeToAppTheme(await mainFile.text(), {
        id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: importName.trim(),
        resolveInclude,
      });
      addImportedTheme(imported);
      chooseTheme(imported);
      setImportName("");
      setPendingFiles([]);
      setHighlightedId(imported.id);
    } catch (error) {
      console.error("Unable to import the VS Code theme.", error);
      setImportError(error instanceof Error ? error.message : "The selected theme could not be imported.");
    } finally {
      setIsImporting(false);
    }
  };

  const renderTheme = (item: ThemeConfig) => (
    <div
      key={item.id}
      className="flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-ide-surface-hover"
    >
      <button
        id={`theme-option-${item.id}`}
        data-theme-option={item.id}
        type="button"
        role="option"
        aria-selected={theme.id === item.id}
        onFocus={() => setHighlightedId(item.id)}
        onClick={() => chooseTheme(item)}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ide-text-strong outline-none transition-colors hover:bg-ide-surface-hover focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${highlightedId === item.id ? "bg-ide-surface-hover" : ""}`}
      >
        <span className="h-3 w-3 shrink-0 rounded-full border border-ide-border" style={{ background: item.ui.accent }} />
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        {theme.id === item.id && <Check className="h-4 w-4 text-ide-accent" aria-label="Selected" />}
      </button>
      <button
        type="button"
        aria-label={`${favorites.includes(item.id) ? "Remove" : "Add"} ${item.name} ${favorites.includes(item.id) ? "from" : "to"} favorites`}
        aria-pressed={favorites.includes(item.id)}
        onClick={() => toggleFavorite(item.id)}
        className="rounded p-1 text-ide-muted hover:bg-ide-surface-hover hover:text-ide-warning"
      >
        <Star className={`h-3.5 w-3.5 ${favorites.includes(item.id) ? "fill-current text-ide-warning" : ""}`} />
      </button>
      {importedThemes.some((custom) => custom.id === item.id) && (
        <button
          type="button"
          aria-label={`Delete imported theme ${item.name}`}
          onClick={() => {
            try {
              deleteImportedTheme(item.id);
              const defaultTheme = availableThemes[0];
              if (theme.id === item.id && defaultTheme) chooseTheme(defaultTheme);
            } catch (error) {
              console.error("Unable to delete imported theme.", error);
              setImportError(
                error instanceof Error
                  ? error.message
                  : "The imported theme could not be deleted.",
              );
            }
          }}
          className="rounded p-1 text-ide-muted hover:bg-ide-surface-hover hover:text-ide-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const handleFileSelection = (files: FileList | null) => {
    setPendingFiles(files ? Array.from(files) : []);
    setImportError("");
    setImportName("");
  };

  const renderPendingImport = () => (
    <div className="mt-2 space-y-2 rounded-lg border border-ide-border bg-ide-surface p-2">
      <p className="truncate text-xs text-ide-muted" title={pendingFiles.map((file) => file.name).join(", ")}>
        Selected: {pendingFiles.map((file) => file.name).join(", ")}
      </p>
      <input
        aria-label="Imported theme name"
        value={importName}
        onChange={(event) => setImportName(event.target.value)}
        placeholder="Name this theme"
        className="h-9 w-full rounded-lg border border-ide-input-border bg-ide-input-bg px-2.5 text-xs text-ide-text-strong outline-none placeholder:text-ide-muted"
      />
      <button
        type="button"
        disabled={isImporting || !importName.trim()}
        onClick={() => void importTheme()}
        className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-ide-accent px-3 text-xs font-semibold text-ide-accent-fg transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isImporting ? "Saving theme..." : "Save imported theme"}
      </button>
      {importError && <p role="alert" className="text-xs text-ide-danger">{importError}</p>}
    </div>
  );

  return (
    <div ref={rootRef} className="relative w-full" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) closeMenu();
          else {
            setHighlightedId(theme.id);
            setOpen(true);
          }
        }}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-ide-border bg-ide-input-bg px-4 text-left text-base text-ide-text-strong transition-colors hover:bg-ide-surface-hover"
      >
        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-ide-border" style={{ background: theme.ui.accent }} />
        <span className="min-w-0 flex-1 truncate font-medium">{theme.name}</span>
        {open ? <ChevronUp className="h-4 w-4 text-ide-muted" /> : <ChevronDown className="h-4 w-4 text-ide-muted" />}
      </button>
      {showDetails && (
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <span className="text-xs text-ide-muted">
            {theme.type === "light" ? "Light theme" : "Dark theme"}
          </span>
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-right text-xs font-medium text-ide-text-strong transition-colors hover:bg-ide-surface-hover disabled:opacity-80"
          >
            <Upload className="h-3.5 w-3.5 text-ide-accent" aria-hidden="true" />
            {isImporting ? "Importing..." : "Import VS Code theme (.json)"}
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="sr-only"
        onChange={(event) => {
          handleFileSelection(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      {showDetails && pendingFiles.length > 0 && renderPendingImport()}
      {open && panelPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className={`fixed z-[1000] overflow-x-hidden overflow-y-auto rounded-xl border border-ide-border bg-ide-dropdown-bg p-2 text-ide-text-strong shadow-[0_16px_40px_color-mix(in_srgb,var(--ide-color-shadow-color)_45%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${opensUp ? "-translate-y-full" : ""}`}
          style={{
            left: panelPosition.left,
            top: panelPosition.top,
            width: panelPosition.width,
            maxHeight: panelPosition.maxHeight,
          }}
        >
          <div id="theme-listbox" role="listbox" aria-label="Themes" className="min-w-0">
            {libraryError && <p role="alert" className="px-2 py-1 text-xs text-ide-danger">{libraryError}</p>}
            {groups.map((group) => {
              return (
              <section key={group.label} role="group" aria-label={group.label}>
                <h3 className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ide-muted">{group.label}</h3>
                {group.items.map(renderTheme)}
              </section>
              );
            })}
          </div>
          <div className="mt-2 border-t border-ide-border pt-2">
            {pendingFiles.length > 0 && !showDetails && renderPendingImport()}
            {pendingFiles.length === 0 && (
              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-ide-text-strong transition-colors hover:bg-ide-surface-hover disabled:opacity-80"
              >
                <Upload className="h-3.5 w-3.5 text-ide-accent" />
                Import VS Code theme (.json)
              </button>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
};
