export type ShortcutGroup =
  | "General"
  | "Editor"
  | "Navigation"
  | "View"
  | "Terminal"
  | "Theme";

export type ShortcutDefinition = {
  id: string;
  keys: string[];
  label: string;
  group: ShortcutGroup;
  action: string;
  global?: boolean;
  monaco?: boolean;
};

export const SHORTCUTS: ShortcutDefinition[] = [
  { id: "command-palette", keys: ["Alt+Shift+P"], label: "Command palette", group: "General", action: "command-palette", global: true },
  { id: "shortcuts-dialog", keys: ["?", "Alt+H"], label: "Keyboard shortcuts", group: "General", action: "shortcuts-dialog" },
  { id: "close-topmost", keys: ["Escape"], label: "Close topmost dialog or menu", group: "General", action: "close-topmost", global: true },
  { id: "quick-open", keys: ["Mod+P"], label: "Quick Open", group: "Navigation", action: "quick-open" },
  { id: "find-file", keys: ["Mod+F"], label: "Find in file", group: "Editor", action: "find-file" },
  { id: "search-files", keys: ["Mod+Shift+F"], label: "Search in files", group: "Editor", action: "search-files" },
  { id: "save-file", keys: ["Mod+S"], label: "Save file", group: "Editor", action: "save-file" },
  { id: "open-ai", keys: ["Mod+I"], label: "Open AI Assistant", group: "Editor", action: "open-ai" },
  { id: "toggle-explorer", keys: ["Mod+B"], label: "Toggle explorer", group: "View", action: "toggle-explorer" },
  { id: "toggle-terminal", keys: ["Mod+J", "Mod+Backquote"], label: "Toggle terminal", group: "Terminal", action: "toggle-terminal" },
  { id: "focus-explorer", keys: ["Mod+Shift+E"], label: "Focus Explorer", group: "Navigation", action: "focus-explorer" },
  { id: "source-control", keys: ["Mod+Shift+G"], label: "Open Source Control", group: "Navigation", action: "source-control" },
  { id: "split-editor", keys: ["Mod+Backslash"], label: "Split editor", group: "View", action: "split-editor" },
  { id: "toggle-ai-drawer", keys: ["Mod+Shift+A"], label: "Toggle AI assistant drawer", group: "View", action: "toggle-ai-drawer" },
  { id: "open-folder", keys: ["Mod+O"], label: "Open folder", group: "Editor", action: "open-folder" },
  { id: "new-file", keys: ["Alt+N"], label: "New file", group: "Editor", action: "new-file" },
  { id: "new-folder", keys: ["Mod+Alt+N"], label: "New folder", group: "Editor", action: "new-folder" },
  { id: "close-tab", keys: ["Mod+Alt+W"], label: "Close active tab", group: "Editor", action: "close-tab" },
  { id: "previous-tab", keys: ["Alt+PageUp"], label: "Previous tab", group: "Navigation", action: "previous-tab" },
  { id: "next-tab", keys: ["Alt+PageDown"], label: "Next tab", group: "Navigation", action: "next-tab" },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `tab-${index + 1}`,
    keys: [`Alt+${index + 1}`],
    label: `Open tab ${index + 1 === 9 ? "or last tab" : index + 1}`,
    group: "Navigation" as const,
    action: `tab-${index + 1}`,
  })),
  { id: "go-to-symbol", keys: ["Mod+Shift+O"], label: "Go to symbol", group: "Navigation", action: "go-to-symbol" },
  { id: "go-to-line", keys: ["Mod+G"], label: "Go to line", group: "Navigation", action: "go-to-line" },
  { id: "toggle-word-wrap", keys: ["Alt+Z"], label: "Toggle word wrap", group: "View", action: "toggle-word-wrap" },
  { id: "font-size-up", keys: ["Mod+="], label: "Increase editor font size", group: "View", action: "font-size-up" },
  { id: "font-size-down", keys: ["Mod+-"], label: "Decrease editor font size", group: "View", action: "font-size-down" },
  { id: "font-size-reset", keys: ["Mod+0"], label: "Reset editor font size", group: "View", action: "font-size-reset" },
  { id: "run-f5", keys: ["F5"], label: "Run preview", group: "Editor", action: "run", global: true },
  { id: "run-alt-r", keys: ["Mod+Alt+R"], label: "Run preview", group: "Editor", action: "run", global: true },
  { id: "focus-mode", keys: ["Mod+Shift+Z"], label: "Toggle focus mode", group: "View", action: "focus-mode" },
  { id: "settings", keys: ["Mod+,"], label: "Editor settings", group: "View", action: "settings" },
  { id: "theme-page", keys: ["Alt+Shift+T"], label: "Open theme page", group: "Theme", action: "theme-page", global: true },
  { id: "language-picker", keys: ["Mod+K M"], label: "Change language mode", group: "Editor", action: "language-picker", monaco: true },
  { id: "replace-all", keys: ["Mod+Alt+Enter"], label: "Replace all", group: "Editor", action: "replace-all" },
  { id: "monaco-duplicate-selection", keys: ["Mod+D"], label: "Add selection to next match", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-select-all-matches", keys: ["Mod+Shift+L"], label: "Select all matching occurrences", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-move-line-up", keys: ["Alt+Up"], label: "Move line up", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-move-line-down", keys: ["Alt+Down"], label: "Move line down", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-copy-line-up", keys: ["Shift+Alt+Up"], label: "Copy line up", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-copy-line-down", keys: ["Shift+Alt+Down"], label: "Copy line down", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-comment-line", keys: ["Mod+/"], label: "Toggle line comment", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-comment-block", keys: ["Shift+Alt+A"], label: "Toggle block comment", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-delete-line", keys: ["Mod+Shift+K"], label: "Delete line", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-insert-line-below", keys: ["Mod+Enter"], label: "Insert line below", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-insert-line-above", keys: ["Mod+Shift+Enter"], label: "Insert line above", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-indent", keys: ["Mod+]"], label: "Indent line", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-outdent", keys: ["Mod+["], label: "Outdent line", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-replace", keys: ["Mod+H"], label: "Find and replace", group: "Editor", action: "replace-file" },
  { id: "monaco-find-next", keys: ["F3"], label: "Find next", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-find-previous", keys: ["Shift+F3"], label: "Find previous", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-rename", keys: ["F2"], label: "Rename symbol", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-definition", keys: ["F12"], label: "Go to definition", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-suggest", keys: ["Mod+Space"], label: "Trigger suggestions", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-format", keys: ["Shift+Alt+F"], label: "Format document", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-undo", keys: ["Mod+Z"], label: "Undo", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-redo", keys: ["Mod+Y"], label: "Redo", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-fold", keys: ["Mod+Shift+["], label: "Fold region", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-unfold", keys: ["Mod+Shift+]"], label: "Unfold region", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-fold-all", keys: ["Mod+K Mod+0"], label: "Fold all regions", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-unfold-all", keys: ["Mod+K Mod+J"], label: "Unfold all regions", group: "Editor", action: "monaco", monaco: true },
  { id: "monaco-tab-focus", keys: ["Mod+M"], label: "Toggle tab focus mode", group: "Editor", action: "monaco", monaco: true },
];

export const getShortcut = (id: string) =>
  SHORTCUTS.find((shortcut) => shortcut.id === id);

export const isMacPlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const formatShortcut = (keys: string[], isMac = isMacPlatform()) =>
  keys
    .map((key) =>
      key
        .replaceAll("Mod", isMac ? "⌘" : "Ctrl")
        .replaceAll("Backquote", "`")
        .replaceAll("Backslash", "\\")
        .replaceAll("Escape", "Esc")
        .replaceAll("Shift+/", "?"),
    )
    .join(" / ");

type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
>;

const matchesKey = (event: ShortcutKeyEvent, key: string) => {
  if (key === "Backquote") return event.code === "Backquote";
  if (key === "Backslash") return event.code === "Backslash";
  if (key === "PageUp" || key === "PageDown") return event.key === key;
  if (key === "Space") return event.code === "Space";
  return event.key.toLowerCase() === key.toLowerCase();
};

const matchesCombo = (event: ShortcutKeyEvent, combo: string) => {
  if (combo.includes(" ")) return false;
  if (combo === "?") {
    return (
      event.key === "?" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    );
  }
  const parts = combo.split("+");
  const key = parts.pop();
  if (!key) return false;
  const hasMod = parts.includes("Mod");
  const expectedCtrl = parts.includes("Ctrl") || (hasMod && !isMacPlatform());
  const expectedMeta = parts.includes("Meta") || (hasMod && isMacPlatform());
  const hasShift = parts.includes("Shift");
  const hasAlt = parts.includes("Alt");
  if (expectedCtrl !== event.ctrlKey || expectedMeta !== event.metaKey) return false;
  if (hasShift !== event.shiftKey || hasAlt !== event.altKey) return false;
  return matchesKey(event, key);
};

export const matchesShortcut = (
  event: ShortcutKeyEvent,
  shortcut: ShortcutDefinition,
) => shortcut.keys.some((combo) => matchesCombo(event, combo));

export const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(".monaco-editor")) return false;
  return (
    target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
  );
};

export const assertUniqueShortcuts = () => {
  const seen = new Map<string, string>();
  for (const shortcut of SHORTCUTS) {
    for (const key of shortcut.keys) {
      if (seen.has(key)) {
        throw new Error(
          `Shortcut ${key} is assigned to both ${seen.get(key)} and ${shortcut.id}.`,
        );
      }
      seen.set(key, shortcut.id);
    }
  }
};
