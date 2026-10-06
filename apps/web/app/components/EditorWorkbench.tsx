"use client";

import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from "react";
import Editor, {
  loader as monacoLoader,
  type Monaco,
  type OnMount,
} from "@monaco-editor/react";
import { useApp, EditorFile } from "../context/AppContext";
import {
  FolderTree,
  FileCode,
  FileText,
  Play,
  Sparkles,
  Send,
  Copy,
  Check,
  X,
  Bot,
  Terminal,
  GitBranch,
  RefreshCw,
  Split,
  Columns,
  FolderPlus,
  FilePlus,
  Trash2,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  CornerDownLeft,
  Folder,
  File,
  Code2,
  FolderOpen,
  ChevronRight,
  Search,
  SearchCode,
  Command,
  Settings2,
  CircleHelp,
  Pin,
  Bell,
} from "lucide-react";
import {
  FriendlyHint,
  HelpfulInfo,
  friendlyAlert,
  friendlyConfirm,
} from "./FriendlyHelpers";
import { FindController, FindResult } from "./FindController";
import { TerminalPanel } from "./TerminalPanel";
import { runEditorPreview, sendAssistantPreview } from "../services/editorMocks";
import { Button, Dropdown, IconButton, Kbd, Modal, Switch } from "./ide/Primitives";

type NativeEditorHandle =
  | { kind: "directory"; handle: FileSystemDirectoryHandle }
  | { kind: "file"; handle: FileSystemFileHandle };

interface FilePickerWindow extends Window {
  showDirectoryPicker?: (options?: {
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?: () => Promise<FileSystemFileHandle[]>;
}

const NATIVE_HANDLE_DB = "devpulse-editor-handles";
const NATIVE_HANDLE_STORE = "handles";
const NATIVE_HANDLE_KEY = "active-workspace";
monacoLoader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs",
  },
});

const MONACO_THEME = "devpulse-ide";
const getMonacoLanguageId = (language: string) =>
  language === "jsx"
    ? "javascript"
    : language === "tsx"
      ? "typescript"
      : language;
type MonacoDecoration = Parameters<
  Monaco["editor"]["deltaDecorations"]
>[1][number];
const TEXT_FILE_EXTENSIONS = new Set([
  "c",
  "cc",
  "cpp",
  "cs",
  "css",
  "csv",
  "dockerfile",
  "env",
  "go",
  "h",
  "html",
  "java",
  "js",
  "jsx",
  "json",
  "md",
  "mjs",
  "php",
  "ps1",
  "py",
  "rb",
  "rs",
  "scss",
  "sh",
  "sql",
  "svg",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);
const EDITOR_LANGUAGES = [
  { id: "plaintext", name: "Plain Text" },
  { id: "html", name: "HTML" },
  { id: "css", name: "CSS" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "jsx", name: "JSX" },
  { id: "tsx", name: "TSX" },
  { id: "json", name: "JSON" },
  { id: "markdown", name: "Markdown" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
  { id: "go", name: "Go" },
  { id: "php", name: "PHP" },
  { id: "sql", name: "SQL" },
  { id: "yaml", name: "YAML" },
  { id: "shell", name: "Shell" },
];

const isTextEditorFile = (name: string) => {
  const normalizedName = name.toLowerCase();
  if (normalizedName === "dockerfile" || normalizedName === "makefile") {
    return true;
  }
  return TEXT_FILE_EXTENSIONS.has(normalizedName.split(".").pop() || "");
};

type ChangedLineKind = "added" | "modified";
type EditorSearchMode = "file" | "workspace" | "quick-open" | null;

interface WorkspaceSearchMatch {
  file: EditorFile;
  line: number;
  column: number;
  text: string;
}

const getLineChanges = (savedText: string, currentText: string) => {
  const savedLines = savedText ? savedText.split("\n") : [];
  const currentLines = currentText ? currentText.split("\n") : [];
  let prefixLength = 0;

  while (
    prefixLength < savedLines.length &&
    prefixLength < currentLines.length &&
    savedLines[prefixLength] === currentLines[prefixLength]
  ) {
    prefixLength++;
  }

  let suffixLength = 0;
  while (
    suffixLength < savedLines.length - prefixLength &&
    suffixLength < currentLines.length - prefixLength &&
    savedLines[savedLines.length - 1 - suffixLength] ===
      currentLines[currentLines.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  const savedChangeCount = savedLines.length - prefixLength - suffixLength;
  const currentChangeCount = currentLines.length - prefixLength - suffixLength;
  const changedLines = new Map<number, ChangedLineKind>();

  for (let offset = 0; offset < currentChangeCount; offset++) {
    changedLines.set(
      prefixLength + offset,
      offset < savedChangeCount ? "modified" : "added",
    );
  }

  const removedAtLine =
    savedChangeCount > currentChangeCount
      ? Math.min(
          prefixLength + currentChangeCount,
          Math.max(currentLines.length - 1, 0),
        )
      : null;

  return { changedLines, removedAtLine };
};

const openNativeHandleDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(NATIVE_HANDLE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(NATIVE_HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to open browser storage."));
  });

const storeNativeHandle = async (
  nativeHandle: NativeEditorHandle,
): Promise<void> => {
  const db = await openNativeHandleDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(NATIVE_HANDLE_STORE, "readwrite");
    transaction
      .objectStore(NATIVE_HANDLE_STORE)
      .put(nativeHandle, NATIVE_HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Unable to save folder access."));
  });
  db.close();
};

const readNativeHandle = async (): Promise<NativeEditorHandle | undefined> => {
  const db = await openNativeHandleDb();
  const nativeHandle = await new Promise<NativeEditorHandle | undefined>(
    (resolve, reject) => {
      const request = db
        .transaction(NATIVE_HANDLE_STORE, "readonly")
        .objectStore(NATIVE_HANDLE_STORE)
        .get(NATIVE_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result as NativeEditorHandle);
      request.onerror = () =>
        reject(request.error || new Error("Unable to restore folder access."));
    },
  );
  db.close();
  return nativeHandle;
};

const clearNativeHandle = async (): Promise<void> => {
  const db = await openNativeHandleDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(NATIVE_HANDLE_STORE, "readwrite");
    transaction.objectStore(NATIVE_HANDLE_STORE).delete(NATIVE_HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Unable to clear folder access."));
  });
  db.close();
};

const getTextFilesFromDirectory = async (
  directory: FileSystemDirectoryHandle,
  parentPath = "",
): Promise<{ name: string; path: string; content: string }[]> => {
  const files: { name: string; path: string; content: string }[] = [];
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    "build",
    "dist",
    "node_modules",
  ]);
  const directoryEntries = directory as FileSystemDirectoryHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  };
  for await (const [entryName, entry] of directoryEntries.entries()) {
    const path = [parentPath, entryName].filter(Boolean).join("/");
    if (entry.kind === "directory") {
      if (!ignoredDirectories.has(entryName)) {
        files.push(
          ...(await getTextFilesFromDirectory(
            entry as FileSystemDirectoryHandle,
            path,
          )),
        );
      }
      continue;
    }

    if (!isTextEditorFile(entryName)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    files.push({ name: entryName, path, content: await file.text() });
  }

  return files;
};

const getDirectoryForPath = async (
  root: FileSystemDirectoryHandle,
  directoryPath: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle> => {
  let current = root;
  for (const segment of directoryPath.split("/").filter(Boolean)) {
    current = await current.getDirectoryHandle(segment, { create });
  }
  return current;
};

export const EditorWorkbench: React.FC = () => {
  const {
    theme,
    colorMode,
    isClientStorageHydrated,
    workspaces,
    setPage,
    isEditorProjectOpen,
    setIsEditorProjectOpen,
    editorProjectId,
    isEditorLoading,
    editorError,
    loadEditorProject,
    loadedProjectName,
    setLoadedProjectName,
    treeFiles,
    treeFolders,
    createNewFolder,
    openFiles,
    activeFileId,
    setActiveFileId,
    updateEditorFileLanguage,
    fileContents,
    savedFileContents,
    updateFileContent,
    saveFileContent,
    openFileInEditor,
    closeFileFromEditor,
    reorderOpenFiles,
    closeOtherFilesFromEditor,
    closeAllFilesFromEditor,
    renameEditorFile,
    createNewFile,
    deleteFile,
    loadUserLocalFiles,
    loadSingleLocalFile,
    closeEditorProject,
    isFileTreeOpen,
    setIsFileTreeOpen,
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    applyDiffToActiveFile,
    addToast,
    toasts,
    removeToast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [aiQuery, setAiQuery] = useState("");
  const aiQueryInputRef = useRef<HTMLTextAreaElement>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<
    Array<{ sender: string; text: string; code?: string }>
  >([]);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [aiPanelWidth, setAiPanelWidth] = useState(360);
  const [explorerWidth, setExplorerWidth] = useState(256);
  const [isResizingAiPanel, setIsResizingAiPanel] = useState(false);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);
  const [explorerFilter, setExplorerFilter] = useState("");
  const [pinnedTabs, setPinnedTabs] = useState<string[]>([]);
  const [tabMenu, setTabMenu] = useState<{
    fileId: string;
    x: number;
    y: number;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [isSplitEditor, setIsSplitEditor] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isBreadcrumbMenuOpen, setIsBreadcrumbMenuOpen] = useState(false);
  const [editorCursor, setEditorCursor] = useState({ line: 1, column: 1 });
  const [editorSelectionCount, setEditorSelectionCount] = useState(0);
  const [editorDocumentStats, setEditorDocumentStats] = useState({
    lines: 1,
    chars: 0,
  });
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 12,
    lineHeight: 20,
    tabSize: 2,
    minimap: false,
    wordWrap: true,
    fontFamily: "JetBrains Mono",
    density: "comfortable" as "comfortable" | "compact",
  });
  const [selectedFolder, setSelectedFolder] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(),
  );
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nativeHandle, setNativeHandle] = useState<NativeEditorHandle | null>(
    null,
  );
  const [isClosePromptOpen, setIsClosePromptOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [isEditorHintDismissed, setIsEditorHintDismissed] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isStatusLanguagePickerOpen, setIsStatusLanguagePickerOpen] = useState(false);
  const [statusLanguageSearch, setStatusLanguageSearch] = useState("");
  const [statusLanguageHighlight, setStatusLanguageHighlight] = useState(0);
  const [statusLanguageMenuPosition, setStatusLanguageMenuPosition] = useState({
    bottom: 0,
    left: 0,
    maxHeight: 320,
  });
  const [searchMode, setSearchMode] = useState<EditorSearchMode>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [findResult, setFindResult] = useState<FindResult>({
    matches: [],
    index: -1,
    error: null,
  });
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findWholeWord, setFindWholeWord] = useState(false);
  const [findUseRegex, setFindUseRegex] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findInSelection, setFindInSelection] = useState(false);
  const [findSelectionRange, setFindSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [findHistoryTick, setFindHistoryTick] = useState(0);
  const [initialFindCursor, setInitialFindCursor] = useState(0);
  const [quickOpenSelection, setQuickOpenSelection] = useState(0);
  const [pendingSearchJump, setPendingSearchJump] = useState<{
    fileId: string;
    line: number;
    column: number;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const languagePickerRef = useRef<HTMLDivElement>(null);
  const statusLanguagePickerRef = useRef<HTMLDivElement>(null);
  const statusLanguageTriggerRef = useRef<HTMLButtonElement>(null);
  const statusLanguageSearchRef = useRef<HTMLInputElement>(null);
  const statusLanguageOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const firstLanguageOptionRef = useRef<HTMLButtonElement>(null);
  const pendingEditorChordRef = useRef(false);
  const editorChordTimerRef = useRef<number | null>(null);
  const aiPanelResizeStartRef = useRef<{ pointerX: number; width: number } | null>(
    null,
  );
  const explorerResizeStartRef = useRef<{ pointerX: number; width: number } | null>(
    null,
  );
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const monacoEditorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const monacoFindDecorationsRef = useRef<string[]>([]);
  const saveFileRef = useRef<() => void>(() => undefined);
  const findControllerRef = useRef<FindController | null>(null);
  const replaceUndoRef = useRef<{
    fileId: string;
    before: string;
    after: string;
  } | null>(null);
  if (!findControllerRef.current) {
    findControllerRef.current = new FindController();
  }

  useEffect(() => {
    try {
      setIsEditorHintDismissed(
        window.localStorage.getItem("devpulse-editor-hint-dismissed") ===
          "true",
      );
    } catch (error) {
      console.error("Unable to restore editor hint preference.", error);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("devpulse-ide-layout");
      if (!stored) return;
      const layout = JSON.parse(stored) as {
        aiPanelWidth?: number;
        explorerWidth?: number;
        editorSettings?: typeof editorSettings;
        pinnedTabs?: string[];
      };
      if (typeof layout.aiPanelWidth === "number") {
        setAiPanelWidth(Math.max(280, Math.min(520, layout.aiPanelWidth)));
      }
      if (typeof layout.explorerWidth === "number") {
        setExplorerWidth(Math.max(180, Math.min(360, layout.explorerWidth)));
      }
      if (layout.editorSettings) {
        setEditorSettings((current) => ({ ...current, ...layout.editorSettings }));
      }
      if (Array.isArray(layout.pinnedTabs)) setPinnedTabs(layout.pinnedTabs);
    } catch (error) {
      console.error("Unable to restore IDE layout preferences.", error);
    }
  }, []);

  useEffect(() => {
    if (!isClientStorageHydrated) return;
    try {
      window.localStorage.setItem(
        "devpulse-ide-layout",
        JSON.stringify({ aiPanelWidth, explorerWidth, editorSettings, pinnedTabs }),
      );
    } catch (error) {
      console.error("Unable to save IDE layout preferences.", error);
    }
  }, [aiPanelWidth, editorSettings, explorerWidth, isClientStorageHydrated, pinnedTabs]);

  useEffect(() => {
    const handleEditorAction = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === "quick-open") {
        setSearchQuery("");
        setQuickOpenSelection(0);
        setSearchMode("quick-open");
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
      } else if (action === "settings") {
        setIsSettingsOpen(true);
      } else if (action === "shortcuts") {
        setIsShortcutsOpen(true);
      } else if (action === "zen") {
        setIsZenMode((current) => !current);
      } else if (action === "terminal") {
        setIsTerminalOpen((current) => !current);
      }
    };
    window.addEventListener("devpulse:editor-action", handleEditorAction);
    return () => window.removeEventListener("devpulse:editor-action", handleEditorAction);
  });

  useEffect(() => {
    const handleIDEKeys = (event: KeyboardEvent) => {
      if (event.key === "?" || ((event.ctrlKey || event.metaKey) && event.key === "/")) {
        if (event.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(event.target.tagName)) return;
        event.preventDefault();
        setIsShortcutsOpen((open) => !open);
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setIsZenMode((mode) => !mode);
      } else if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handleIDEKeys);
    return () => window.removeEventListener("keydown", handleIDEKeys);
  }, []);

  const dismissEditorHint = (permanently = false) => {
    if (permanently) {
      try {
        window.localStorage.setItem("devpulse-editor-hint-dismissed", "true");
      } catch (error) {
        console.error("Unable to save editor hint preference.", error);
      }
    }
    setIsEditorHintDismissed(true);
  };

  useEffect(() => {
    if (!isResizingAiPanel) return;

    const handlePointerMove = (event: PointerEvent) => {
      const start = aiPanelResizeStartRef.current;
      if (!start) return;
      setAiPanelWidth(
        Math.max(
          280,
          Math.min(
            Math.min(520, window.innerWidth * 0.5),
            start.width + start.pointerX - event.clientX,
          ),
        ),
      );
    };
    const handlePointerUp = () => {
      aiPanelResizeStartRef.current = null;
      setIsResizingAiPanel(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingAiPanel]);

  useEffect(() => {
    if (!isResizingExplorer) return;
    const handlePointerMove = (event: PointerEvent) => {
      const start = explorerResizeStartRef.current;
      if (!start) return;
      setExplorerWidth(
        Math.max(180, Math.min(360, start.width + event.clientX - start.pointerX)),
      );
    };
    const handlePointerUp = () => {
      explorerResizeStartRef.current = null;
      setIsResizingExplorer(false);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingExplorer]);

  const selectEditorLanguage = (language: string) => {
    const model = monacoEditorRef.current?.getModel();
    if (model && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(
        model,
        getMonacoLanguageId(language),
      );
    }
    if (activeFile) updateEditorFileLanguage(activeFile.id, language);
    setIsLanguagePickerOpen(false);
    monacoEditorRef.current?.focus();
  };

  useEffect(() => {
    if (!isLanguagePickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !languagePickerRef.current?.contains(event.target)
      ) {
        setIsLanguagePickerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLanguagePickerOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLanguagePickerOpen]);

  const activeFile =
    openFiles.find((f) => f.id === activeFileId) || openFiles[0];
  const filteredStatusLanguages = useMemo(() => {
    const query = statusLanguageSearch.trim().toLowerCase();
    return EDITOR_LANGUAGES.filter((language) =>
      language.name.toLowerCase().includes(query),
    );
  }, [statusLanguageSearch]);
  const openStatusLanguagePicker = () => {
    if (isStatusLanguagePickerOpen) {
      setIsStatusLanguagePickerOpen(false);
      return;
    }
    const triggerRect = statusLanguageTriggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      setStatusLanguageMenuPosition({
        bottom: window.innerHeight - triggerRect.top + 6,
        left: Math.max(
          8,
          Math.min(triggerRect.left, window.innerWidth - 228),
        ),
        maxHeight: Math.max(120, Math.min(320, triggerRect.top - 16)),
      });
    }
    const currentIndex = EDITOR_LANGUAGES.findIndex(
      (language) => language.id === activeFile?.language,
    );
    setStatusLanguageSearch("");
    setStatusLanguageHighlight(Math.max(0, currentIndex));
    setIsStatusLanguagePickerOpen((open) => !open);
  };
  const moveStatusLanguageHighlight = (offset: number) => {
    if (!filteredStatusLanguages.length) return;
    setStatusLanguageHighlight((current) => {
      const next =
        (current + offset + filteredStatusLanguages.length) %
        filteredStatusLanguages.length;
      window.requestAnimationFrame(() =>
        statusLanguageOptionRefs.current[next]?.scrollIntoView({
          block: "nearest",
        }),
      );
      return next;
    });
  };
  const handleStatusLanguageKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveStatusLanguageHighlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const language = filteredStatusLanguages[statusLanguageHighlight];
      if (language && activeFile) {
        selectEditorLanguage(language.id);
        setIsStatusLanguagePickerOpen(false);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsStatusLanguagePickerOpen(false);
    }
  };
  useEffect(() => {
    if (!isStatusLanguagePickerOpen) return;
    statusLanguageSearchRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !statusLanguagePickerRef.current?.contains(event.target)
      ) {
        setIsStatusLanguagePickerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsStatusLanguagePickerOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStatusLanguagePickerOpen]);
  useEffect(() => {
    if (statusLanguageHighlight >= filteredStatusLanguages.length) {
      setStatusLanguageHighlight(Math.max(0, filteredStatusLanguages.length - 1));
    }
  }, [filteredStatusLanguages.length, statusLanguageHighlight]);
  const sortedOpenFiles = useMemo(
    () =>
      [...openFiles].sort(
        (first, second) =>
          Number(pinnedTabs.includes(second.id)) -
          Number(pinnedTabs.includes(first.id)),
      ),
    [openFiles, pinnedTabs],
  );
  const currentCode = activeFile ? fileContents[activeFile.id] || "" : "";
  const activeFileChanges = activeFile
    ? getLineChanges(savedFileContents[activeFile.id] || "", currentCode)
    : { changedLines: new Map<number, ChangedLineKind>(), removedAtLine: null };
  const dirtyFiles = treeFiles.filter((file) => file.isDirty);
  const activeFileMatches = findResult.matches;
  const activeFileMatchIndex = findResult.index;
  const activeFileMatch = activeFileMatches[activeFileMatchIndex] ?? null;
  const workspaceSearchMatches = useMemo<WorkspaceSearchMatch[]>(() => {
    if (searchMode !== "workspace" || !searchQuery.trim()) return [];

    const matches: WorkspaceSearchMatch[] = [];
    const query = searchQuery.trim().toLowerCase();
    for (const file of treeFiles) {
      const content = fileContents[file.id] || "";
      const lines = content.split("\n");
      for (let line = 0; line < lines.length; line++) {
        const text = lines[line] || "";
        const normalizedText = text.toLowerCase();
        let column = normalizedText.indexOf(query);
        while (column !== -1) {
          matches.push({ file, line, column, text });
          column = normalizedText.indexOf(query, column + query.length);
        }
      }
    }
    return matches;
  }, [fileContents, searchMode, searchQuery, treeFiles]);
  const quickOpenItems = useMemo(() => {
    if (searchMode !== "quick-open") return [];
    const query = searchQuery.trim().toLowerCase();
    return [
      ...treeFiles
        .filter((file) => file.path.toLowerCase().includes(query))
        .map((file) => ({ kind: "file" as const, path: file.path, file })),
      ...treeFolders
        .filter((path) => path.toLowerCase().includes(query))
        .map((path) => ({ kind: "folder" as const, path })),
    ].sort((first, second) => first.path.localeCompare(second.path));
  }, [searchMode, searchQuery, treeFiles, treeFolders]);

  useEffect(() => {
    if (searchMode) searchInputRef.current?.focus();
  }, [searchMode]);

  useEffect(() => {
    if (searchMode !== "file") {
      setFindResult({ matches: [], index: -1, error: null });
      return;
    }
    const timer = window.setTimeout(() => {
      const controller = findControllerRef.current!;
      controller.setSelection(findInSelection ? findSelectionRange : null);
      setFindResult(
        controller.search(currentCode, searchQuery, initialFindCursor),
      );
    }, 50);
    return () => window.clearTimeout(timer);
  }, [
    currentCode,
    findHistoryTick,
    findInSelection,
    findSelectionRange,
    findMatchCase,
    findUseRegex,
    findWholeWord,
    initialFindCursor,
    searchMode,
    searchQuery,
  ]);

  useEffect(() => {
    if (
      !pendingSearchJump ||
      pendingSearchJump.fileId !== activeFile?.id ||
      !monacoEditorRef.current
    ) {
      return;
    }
    const editor = monacoEditorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const lineStart =
      currentCode.split("\n").slice(0, pendingSearchJump.line).join("\n")
        .length + (pendingSearchJump.line > 0 ? 1 : 0);
    const selectionStart = lineStart + pendingSearchJump.column;
    const selectionEnd = Math.min(
      selectionStart + searchQuery.length,
      currentCode.length,
    );
    const start = model.getPositionAt(selectionStart);
    const end = model.getPositionAt(selectionEnd);
    editor.focus();
    editor.setSelection({
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    });
    editor.revealPositionInCenter(start);
    setPendingSearchJump(null);
  }, [activeFile?.id, currentCode, pendingSearchJump, searchQuery]);

  useEffect(() => {
    const editor = monacoEditorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const decorations: MonacoDecoration[] = [];
    if (searchMode === "file") {
      activeFileMatches.forEach((match, index) => {
        const start = model.getPositionAt(match.start);
        const end = model.getPositionAt(match.end);
        decorations.push({
          range: {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          options: {
            inlineClassName:
              index === activeFileMatchIndex
                ? "editor-find-match-active"
                : "editor-find-match",
          },
        });
      });
    }
    activeFileChanges.changedLines.forEach((kind, lineIndex) => {
      const lineNumber = lineIndex + 1;
      if (lineNumber > model.getLineCount()) return;
      decorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          glyphMarginClassName:
            kind === "added" ? "editor-glyph-added" : "editor-glyph-modified",
        },
      });
    });
    if (
      activeFileChanges.removedAtLine !== null &&
      activeFileChanges.removedAtLine < model.getLineCount()
    ) {
      const lineNumber = activeFileChanges.removedAtLine + 1;
      decorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: { glyphMarginClassName: "editor-glyph-removed" },
      });
    }
    monacoFindDecorationsRef.current = editor.deltaDecorations(
      monacoFindDecorationsRef.current,
      decorations,
    );
    if (searchMode === "file" && activeFileMatch) {
      const start = model.getPositionAt(activeFileMatch.start);
      const end = model.getPositionAt(activeFileMatch.end);
      editor.setSelection({
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      });
      editor.revealPositionInCenter(start);
    }
  }, [
    activeFileChanges.changedLines,
    activeFileChanges.removedAtLine,
    activeFileMatch,
    activeFileMatchIndex,
    activeFileMatches,
    searchMode,
  ]);

  const openFileFind = useCallback(() => {
    if (searchMode === "file") {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
      return;
    }
    const editor = monacoEditorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    const selectionStart =
      model && selection ? model.getOffsetAt(selection.getStartPosition()) : 0;
    const selectionEnd =
      model && selection ? model.getOffsetAt(selection.getEndPosition()) : 0;
    const selectedText =
      model && selection && selectionEnd > selectionStart
        ? model.getValueInRange(selection)
        : "";
    const selectedRange =
      selectionEnd > selectionStart
        ? { start: selectionStart, end: selectionEnd }
        : null;
    setFindSelectionRange(selectedRange);
    findControllerRef.current!.open(
      selectedText,
      findInSelection ? selectedRange : null,
    );
    setInitialFindCursor(selectionStart);
    setSearchQuery(selectedText);
    setSearchMode("file");
    window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      input?.focus();
      if (selectedText) input?.select();
    });
  }, [findInSelection, searchMode]);

  const closeFileFind = useCallback(() => {
    findControllerRef.current!.close();
    setFindResult({ matches: [], index: -1, error: null });
    setSearchMode(null);
    setIsReplaceOpen(false);
    window.requestAnimationFrame(() => monacoEditorRef.current?.focus());
  }, []);

  const navigateFileSearch = useCallback(
    (direction: -1 | 1) => {
      if (activeFileMatches.length === 0) return;
      setFindResult(
        direction === 1
          ? findControllerRef.current!.next()
          : findControllerRef.current!.prev(),
      );
      searchInputRef.current?.focus();
    },
    [activeFileMatches],
  );

  const replaceCurrentFindMatch = () => {
    if (!activeFile || !activeFileMatch) return;
    const updated = findControllerRef.current!.replace(
      currentCode,
      replaceQuery,
    );
    replaceUndoRef.current = {
      fileId: activeFile.id,
      before: currentCode,
      after: updated,
    };
    updateFileContent(activeFile.id, updated);
    setFindResult(findControllerRef.current!.search(updated, searchQuery));
  };

  const replaceAllFindMatches = useCallback(() => {
    if (!activeFile || !activeFileMatches.length) return;
    const updated = findControllerRef.current!.replaceAll(
      currentCode,
      replaceQuery,
    );
    replaceUndoRef.current = {
      fileId: activeFile.id,
      before: currentCode,
      after: updated,
    };
    updateFileContent(activeFile.id, updated);
    setFindResult(findControllerRef.current!.search(updated, searchQuery));
  }, [
    activeFile,
    activeFileMatches.length,
    currentCode,
    replaceQuery,
    searchQuery,
    updateFileContent,
  ]);

  const toggleFindOption = useCallback((option: "case" | "word" | "regex") => {
    const controller = findControllerRef.current!;
    if (option === "case") {
      controller.toggleCase();
      setFindMatchCase((enabled) => !enabled);
    } else if (option === "word") {
      controller.toggleWord();
      setFindWholeWord((enabled) => !enabled);
    } else {
      controller.toggleRegex();
      setFindUseRegex((enabled) => !enabled);
    }
    setFindHistoryTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    void readNativeHandle()
      .then((handle) => {
        if (isMounted && handle) setNativeHandle(handle);
      })
      .catch((error: unknown) => {
        console.error("Unable to restore native editor access.", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const openNativeFolder = async () => {
    if (dirtyFiles.length > 0) {
      setSaveError(
        "Save or discard the current changes before opening another folder.",
      );
      setIsClosePromptOpen(true);
      return;
    }
    const pickerWindow = window as FilePickerWindow;
    if (!pickerWindow.showDirectoryPicker) {
      folderInputRef.current?.click();
      return;
    }
    try {
      const handle = await pickerWindow.showDirectoryPicker({
        mode: "readwrite",
      });
      const files = await getTextFilesFromDirectory(handle);
      await loadUserLocalFiles(handle.name, files);
      const storedHandle: NativeEditorHandle = { kind: "directory", handle };
      setNativeHandle(storedHandle);
      await storeNativeHandle(storedHandle);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await friendlyAlert(
        error instanceof Error ? error.message : "Unable to open this folder.",
      );
    }
  };

  const openNativeFile = async () => {
    if (dirtyFiles.length > 0) {
      setSaveError(
        "Save or discard the current changes before opening another file.",
      );
      setIsClosePromptOpen(true);
      return;
    }
    const pickerWindow = window as FilePickerWindow;
    if (!pickerWindow.showOpenFilePicker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const [handle] = await pickerWindow.showOpenFilePicker();
      if (!handle) return;
      const file = await handle.getFile();
      await loadSingleLocalFile(file.name, await file.text());
      const storedHandle: NativeEditorHandle = { kind: "file", handle };
      setNativeHandle(storedHandle);
      await storeNativeHandle(storedHandle);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await friendlyAlert(
        error instanceof Error ? error.message : "Unable to open this file.",
      );
    }
  };

  // 1. Native File Selection via Browser File API
  const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      void loadSingleLocalFile(file.name, content).catch((error: unknown) =>
        friendlyAlert(
          error instanceof Error ? error.message : "Unable to open this file.",
        ),
      );
      setNativeHandle(null);
      void clearNativeHandle().catch((error: unknown) =>
        console.error("Unable to clear old file access.", error),
      );
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 2. Native Folder Selection via Browser Directory API
  const handleNativeFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const folderName =
      files[0]?.webkitRelativePath.split("/")[0] || "My-Local-Folder";
    e.target.value = "";
    const loadedList = Promise.all(
      selectedFiles
        .filter((file) => isTextEditorFile(file.name))
        .map(async (file) => ({
          name: file.name,
          path: file.webkitRelativePath || file.name,
          content: await file.text(),
        })),
    );
    void loadedList
      .then(async (loadedFiles) => {
        await loadUserLocalFiles(folderName, loadedFiles);
        setNativeHandle(null);
        await clearNativeHandle().catch((error: unknown) =>
          console.error("Unable to clear old folder access.", error),
        );
      })
      .catch((error: unknown) =>
        friendlyAlert(
          error instanceof Error
            ? error.message
            : "Unable to open this folder.",
        ),
      );
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileNameInput.trim()) return;
    const filePath = [selectedFolder, newFileNameInput.trim()]
      .filter(Boolean)
      .join("/");
    void (async () => {
      if (nativeHandle?.kind === "directory") {
        const parent = await getDirectoryForPath(
          nativeHandle.handle,
          filePath.split("/").slice(0, -1).join("/"),
          true,
        );
        const fileHandle = await parent.getFileHandle(
          filePath.split("/").pop()!,
          { create: true },
        );
        const writer = await fileHandle.createWritable();
        await writer.write("");
        await writer.close();
      }
      await createNewFile(filePath, filePath, "");
    })()
      .then(() => {
        setNewFileNameInput("");
        setIsCreatingFile(false);
      })
      .catch((error: unknown) =>
        setSaveError(
          error instanceof Error ? error.message : "Unable to create file",
        ),
      );
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const folderName = newFolderNameInput.trim();
    if (!folderName) return;
    const folderPath = [selectedFolder, folderName].filter(Boolean).join("/");
    if (nativeHandle?.kind === "directory") {
      void getDirectoryForPath(nativeHandle.handle, folderPath, true)
        .then(() => {
          createNewFolder(folderPath);
          setSelectedFolder(folderPath);
          setNewFolderNameInput("");
          setIsCreatingFolder(false);
        })
        .catch((error: unknown) =>
          setSaveError(
            error instanceof Error ? error.message : "Unable to create folder",
          ),
        );
      return;
    }
    createNewFolder(folderPath);
    setSelectedFolder(folderPath);
    if (!isEditorProjectOpen) {
      setLoadedProjectName("Local workspace");
      setIsEditorProjectOpen(true);
      setIsFileTreeOpen(true);
    }
    setNewFolderNameInput("");
    setIsCreatingFolder(false);
  };

  const renderExplorerContents = (parentPath = "", depth = 0) => {
    if (parentPath && collapsedFolders.has(parentPath)) return null;

    const childFolders = treeFolders.filter((folderPath) => {
      const parent = folderPath.split("/").slice(0, -1).join("/");
      return parent === parentPath;
    });
    const childFiles = treeFiles.filter(
      (file) => file.path.split("/").slice(0, -1).join("/") === parentPath,
    );

    return (
      <>
        {childFolders.map((folderPath) => {
          const isCollapsed = collapsedFolders.has(folderPath);
          const folderName = folderPath.split("/").pop();
          return (
            <React.Fragment key={folderPath}>
              <div
                className={`flex items-center rounded transition-colors ${selectedFolder === folderPath ? "bg-[#1a1a2b] text-white" : "text-[#8b8ba8] hover:bg-[#141420] hover:text-white"}`}
                style={{ paddingLeft: `${depth * 12}px` }}
              >
                <button
                  type="button"
                  aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${folderName}`}
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsedFolders((previous) => {
                      const next = new Set(previous);
                      if (next.has(folderPath)) next.delete(folderPath);
                      else next.add(folderPath);
                      return next;
                    })
                  }
                  className="flex h-7 w-6 shrink-0 items-center justify-center rounded hover:bg-white/5"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFolder(folderPath)}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left"
                  title={folderPath}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-[#FFAE64]" />
                  <span className="truncate">{folderName}</span>
                </button>
              </div>
              {renderExplorerContents(folderPath, depth + 1)}
            </React.Fragment>
          );
        })}
        {childFiles.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center justify-between rounded py-1.5 pr-2 text-left transition-colors cursor-pointer ${activeFile?.id === file.id ? "editor-explorer-active" : "text-[#8b8ba8] hover:bg-[#141420] hover:text-white"}`}
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
            onClick={() => openFileInEditor(file)}
          >
            <div className="flex min-w-0 items-center gap-2 truncate">
              <span
                className={`shrink-0 text-[10px] px-1 rounded font-bold uppercase ${
                  file.iconType === "ts"
                    ? "bg-[#3178c6]/20 text-[#3178c6]"
                    : file.iconType === "py"
                      ? "bg-[#3572A5]/20 text-[#3572A5]"
                      : file.iconType === "json"
                        ? "bg-[#FF9E64]/20 text-[#FF9E64]"
                        : "bg-white/10 text-white"
                }`}
              >
                {file.iconType}
              </span>
              {renamingFileId === file.id ? (
                <input
                  autoFocus
                  aria-label={`Rename ${file.name}`}
                  className="ide-input min-w-0 flex-1 py-0"
                  value={renameValue}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => {
                    const nextName = renameValue.trim();
                    if (nextName && nextName !== file.name) {
                      renameEditorFile(file.id, nextName);
                      addToast({ type: "success", title: "File renamed", description: nextName });
                    }
                    setRenamingFileId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setRenameValue(file.name);
                      setRenamingFileId(null);
                    }
                  }}
                />
              ) : (
                <span className="truncate">{file.name}</span>
              )}
              {file.isDirty && (
                <span
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0DF5C4]"
                />
              )}
            </div>
            <button
              type="button"
              aria-label={`Delete ${file.name}`}
              onClick={(event) => {
                event.stopPropagation();
                void (async () => {
                  if (
                    await friendlyConfirm(
                      `Delete ${file.name}? This cannot be undone.`,
                    )
                  ) {
                    try {
                      if (nativeHandle?.kind === "directory") {
                        const parts = file.path.split("/");
                        const parent = await getDirectoryForPath(
                          nativeHandle.handle,
                          parts.slice(0, -1).join("/"),
                          false,
                        );
                        await parent.removeEntry(parts[parts.length - 1]!);
                      }
                      await deleteFile(file.id);
                    } catch (error) {
                      await friendlyAlert(
                        error instanceof Error
                          ? error.message
                          : "Could not delete the file.",
                      );
                    }
                  }
                })();
              }}
              className="shrink-0 rounded p-0.5 opacity-0 hover:text-[#f87171] group-hover:opacity-100"
              title="Delete file"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </>
    );
  };

  // Run Code Dynamically
  const handleRunCode = async () => {
    setIsRunningCode(true);
    setRunOutput(null);
    try {
      if (!activeFile) return;
      const result = await runEditorPreview({
        path: activeFile.path,
        language: activeFile.language,
        code: currentCode,
      });
      setRunOutput(
        `${result.ok ? "Exit code" : "Execution error"}: ${result.exitCode}\n${result.output}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Preview could not run.";
      setRunOutput(`Preview error: ${message}`);
      addToast({ type: "error", title: "Run preview failed", description: message });
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile || !activeFile.isDirty) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await writeFileToDisk(activeFile, currentCode);
      await saveFileContent(activeFile.id);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save file",
      );
    } finally {
      setIsSaving(false);
    }
  };

  saveFileRef.current = () => {
    void handleSaveFile();
  };

  const handleMonacoBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme(MONACO_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "77778F", fontStyle: "italic" },
        { token: "keyword", foreground: "A5A1FF" },
        { token: "string", foreground: "A1CF73" },
        { token: "number", foreground: "FFCB6B" },
      ],
      colors: {
        "editor.background": "#09090f",
        "editor.foreground": "#dcdceb",
        "editorLineNumber.foreground": "#45455c",
        "editorLineNumber.activeForeground": "#a5a1ff",
        "editorCursor.foreground": "#0DF5C4",
        "editor.selectionBackground": "#8b82ff55",
        "editor.inactiveSelectionBackground": "#8b82ff33",
        "editor.lineHighlightBackground": "#111118",
        "editorIndentGuide.background1": "#ffffff0a",
        "editorIndentGuide.activeBackground1": "#0DF5C455",
        "editorBracketPairGuide.background1": "#ffffff12",
        "editorBracketPairGuide.activeBackground1": "#0DF5C477",
        "editorGutter.background": "#09090f",
        "editorWidget.background": "#11131b",
        "editorWidget.border": "#ffffff14",
        "editor.findMatchBackground": "#6c63ff66",
        "editor.findMatchHighlightBackground": "#6c63ff33",
      },
    });
  };

  const handleMonacoMount: OnMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    monacoRef.current = monaco;

    const syncDocumentStats = () => {
      const model = editor.getModel();
      if (!model) return;
      setEditorDocumentStats({
        lines: model.getLineCount(),
        chars: model.getValueLength(),
      });
    };
    const syncSelectionCount = () => {
      const model = editor.getModel();
      const selections = editor.getSelections();
      setEditorSelectionCount(
        model && selections
          ? selections.reduce(
              (count, selection) =>
                count + model.getValueLengthInRange(selection),
              0,
            )
          : 0,
      );
    };

    syncDocumentStats();
    syncSelectionCount();
    const position = editor.getPosition();
    if (position) {
      setEditorCursor({ line: position.lineNumber, column: position.column });
    }
    editor.onDidChangeCursorPosition(({ position: nextPosition }) => {
      setEditorCursor({
        line: nextPosition.lineNumber,
        column: nextPosition.column,
      });
    });
    editor.onDidChangeCursorSelection(syncSelectionCount);
    editor.onDidChangeModelContent(syncDocumentStats);
    editor.onDidChangeModel(() => {
      syncDocumentStats();
      syncSelectionCount();
      const nextPosition = editor.getPosition();
      if (nextPosition) {
        setEditorCursor({
          line: nextPosition.lineNumber,
          column: nextPosition.column,
        });
      }
    });
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => saveFileRef.current(),
    );
  };

  const writeFileToDisk = async (file: EditorFile, content: string) => {
    if (editorProjectId === "local-workspace") return;
    const isLocalFile =
      editorProjectId === "local-file" || editorProjectId === "local-folder";
    if (!isLocalFile) return;
    if (!nativeHandle) {
      throw new Error(
        "This file was opened without disk write access. Reopen it using Open File or Open Folder in a browser that supports local file access.",
      );
    }
    const permissionHandle =
      nativeHandle.handle as typeof nativeHandle.handle & {
        queryPermission?: (descriptor: {
          mode: "readwrite";
        }) => Promise<PermissionState>;
        requestPermission?: (descriptor: {
          mode: "readwrite";
        }) => Promise<PermissionState>;
      };
    let permission = await permissionHandle.queryPermission?.({
      mode: "readwrite",
    });
    if (permission !== "granted") {
      permission = await permissionHandle.requestPermission?.({
        mode: "readwrite",
      });
    }
    if (permission !== "granted") {
      throw new Error("Permission to save to the original file was denied.");
    }

    if (nativeHandle.kind === "file") {
      if (file.path !== nativeHandle.handle.name) {
        throw new Error(
          "This new file is not the selected disk file. Open a folder to save multiple files.",
        );
      }
      const writer = await nativeHandle.handle.createWritable();
      await writer.write(content);
      await writer.close();
      return;
    }

    const parts = file.path.split("/");
    const parent = await getDirectoryForPath(
      nativeHandle.handle,
      parts.slice(0, -1).join("/"),
      true,
    );
    const fileHandle = await parent.getFileHandle(parts[parts.length - 1]!, {
      create: true,
    });
    const writer = await fileHandle.createWritable();
    await writer.write(content);
    await writer.close();
  };

  const closeProjectNow = async (discardChanges: boolean) => {
    setSaveError(null);
    if (!discardChanges) {
      setIsSaving(true);
      try {
        for (const file of dirtyFiles) {
          await writeFileToDisk(file, fileContents[file.id] || "");
          await saveFileContent(file.id);
        }
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Unable to save project",
        );
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    try {
      await clearNativeHandle();
    } catch (error) {
      console.error("Unable to clear saved file access.", error);
    }
    setNativeHandle(null);
    closeEditorProject();
    setSearchMode(null);
    setPendingSearchJump(null);
    setIsClosePromptOpen(false);
  };

  const requestCloseProject = () => {
    if (dirtyFiles.length > 0) {
      setIsClosePromptOpen(true);
      return;
    }
    void closeProjectNow(true);
  };

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.key === "Escape" && searchMode !== null) {
        event.preventDefault();
        if (searchMode === "file") closeFileFind();
        else setSearchMode(null);
        return;
      }
      if (searchMode === "file" && event.key === "F3") {
        event.preventDefault();
        navigateFileSearch(event.shiftKey ? -1 : 1);
        return;
      }
      if (searchMode === "file" && event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "c") toggleFindOption("case");
        else if (key === "w") toggleFindOption("word");
        else if (key === "r") toggleFindOption("regex");
        else return;
        event.preventDefault();
        return;
      }
      const key = event.key.toLowerCase();
      if (pendingEditorChordRef.current && !event.ctrlKey && !event.metaKey) {
        pendingEditorChordRef.current = false;
        if (editorChordTimerRef.current !== null) {
          window.clearTimeout(editorChordTimerRef.current);
          editorChordTimerRef.current = null;
        }
        if (key === "m") {
          event.preventDefault();
          setIsLanguagePickerOpen(true);
          window.requestAnimationFrame(() =>
            firstLanguageOptionRef.current?.focus(),
          );
          return;
        }
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        key === "k" &&
        !event.shiftKey &&
        isEditorProjectOpen
      ) {
        event.preventDefault();
        pendingEditorChordRef.current = true;
        if (editorChordTimerRef.current !== null) {
          window.clearTimeout(editorChordTimerRef.current);
        }
        editorChordTimerRef.current = window.setTimeout(() => {
          pendingEditorChordRef.current = false;
          editorChordTimerRef.current = null;
        }, 1200);
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || !isEditorProjectOpen) return;

      if (
        key === "z" &&
        replaceUndoRef.current &&
        replaceUndoRef.current.fileId === activeFile?.id &&
        currentCode === replaceUndoRef.current.after
      ) {
        event.preventDefault();
        updateFileContent(
          replaceUndoRef.current.fileId,
          replaceUndoRef.current.before,
        );
        replaceUndoRef.current = null;
      } else if (key === "enter" && event.altKey) {
        if (searchMode === "file") {
          event.preventDefault();
          replaceAllFindMatches();
        }
      } else if (key === "h") {
        event.preventDefault();
        if (searchMode !== "file") openFileFind();
        setIsReplaceOpen((open) => !open);
      } else if (key === "f" && !event.shiftKey) {
        event.preventDefault();
        openFileFind();
      } else if (key === "s") {
        event.preventDefault();
        void handleSaveFile();
      } else if (key === "f" && event.shiftKey) {
        event.preventDefault();
        setSearchQuery("");
        setSearchMode("workspace");
        setIsFileTreeOpen(true);
      } else if (key === "p" && !event.shiftKey) {
        event.preventDefault();
        setSearchQuery("");
        setQuickOpenSelection(0);
        setSearchMode("quick-open");
      } else if (key === "i") {
        event.preventDefault();
        setIsAiDrawerOpen(true);
        window.requestAnimationFrame(() => aiQueryInputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleEditorShortcut);
    return () => {
      window.removeEventListener("keydown", handleEditorShortcut);
      if (editorChordTimerRef.current !== null) {
        window.clearTimeout(editorChordTimerRef.current);
        editorChordTimerRef.current = null;
      }
    };
  }, [
    closeFileFind,
    currentCode,
    handleSaveFile,
    isEditorProjectOpen,
    activeFile?.id,
    navigateFileSearch,
    openFileFind,
    replaceAllFindMatches,
    searchMode,
    setIsAiDrawerOpen,
    setIsFileTreeOpen,
    toggleFindOption,
    updateFileContent,
  ]);

  const openWorkspaceSearchMatch = (match: WorkspaceSearchMatch) => {
    setPendingSearchJump({
      fileId: match.file.id,
      line: match.line,
      column: match.column,
    });
    openFileInEditor(match.file);
    setSearchMode(null);
  };

  const openQuickOpenItem = (
    item: (typeof quickOpenItems)[number] | undefined,
  ) => {
    if (!item) return;
    if (item.kind === "file") {
      openFileInEditor(item.file);
      setSelectedFolder(item.path.split("/").slice(0, -1).join("/"));
      setSearchMode(null);
      return;
    }

    setSelectedFolder(item.path);
    setIsFileTreeOpen(true);
    setCollapsedFolders((previous) => {
      const next = new Set(previous);
      const segments = item.path.split("/");
      for (let index = 1; index <= segments.length; index++) {
        next.delete(segments.slice(0, index).join("/"));
      }
      return next;
    });
    setSearchMode(null);
  };

  const handleSearchInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (searchMode === "file") closeFileFind();
      else setSearchMode(null);
      return;
    }
    if (searchMode === "file" && event.key === "ArrowDown") {
      event.preventDefault();
      setSearchQuery(findControllerRef.current!.historyMove(1));
      setFindHistoryTick((tick) => tick + 1);
      return;
    }
    if (searchMode === "file" && event.key === "ArrowUp") {
      event.preventDefault();
      setSearchQuery(findControllerRef.current!.historyMove(-1));
      setFindHistoryTick((tick) => tick + 1);
      return;
    }
    if (searchMode === "file" && event.key === "F3") {
      event.preventDefault();
      navigateFileSearch(event.shiftKey ? -1 : 1);
      return;
    }
    if (
      searchMode === "file" &&
      event.key === "Enter" &&
      event.altKey &&
      event.ctrlKey
    ) {
      event.preventDefault();
      event.stopPropagation();
      replaceAllFindMatches();
      return;
    }
    if (
      searchMode === "file" &&
      event.key === "Enter" &&
      activeFileMatches.length > 0
    ) {
      event.preventDefault();
      navigateFileSearch(event.shiftKey ? -1 : 1);
      return;
    }
    if (searchMode === "file" && event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "c") toggleFindOption("case");
      else if (key === "w") toggleFindOption("word");
      else if (key === "r") toggleFindOption("regex");
      else return;
      event.preventDefault();
      return;
    }
    if (searchMode !== "quick-open") return;

    if (event.key === "ArrowDown" && quickOpenItems.length > 0) {
      event.preventDefault();
      setQuickOpenSelection((index) => (index + 1) % quickOpenItems.length);
    } else if (event.key === "ArrowUp" && quickOpenItems.length > 0) {
      event.preventDefault();
      setQuickOpenSelection(
        (index) => (index - 1 + quickOpenItems.length) % quickOpenItems.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      openQuickOpenItem(quickOpenItems[quickOpenSelection]);
    }
  };

  // Dynamic AI Chat
  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const userPrompt = aiQuery.trim();
    setAiHistory((prev) => [...prev, { sender: "You", text: userPrompt }]);
    setAiQuery("");
    setIsAiLoading(true);
    try {
      const result = await sendAssistantPreview({
        prompt: userPrompt,
        projectName: loadedProjectName || "Local workspace",
        activePath: activeFile?.path || null,
        code: currentCode,
      });
      setAiHistory((prev) => [
        ...prev,
        {
          sender: "Devpulse AI",
          text: result.text,
          code: result.code,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Assistant preview failed.";
      setAiHistory((prev) => [
        ...prev,
        { sender: "Devpulse AI", text: `Unable to respond: ${message}` },
      ]);
      addToast({ type: "error", title: "Assistant preview failed", description: message });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Editor welcome screen shown before a project is opened.
  if (!isEditorProjectOpen) {
    return (
      <div className="editor-welcome-root relative flex h-full min-h-0 w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-[#08080d] bg-grid-pattern px-3 py-3.5 font-sans text-[#e5e7eb] sm:px-4 sm:py-4 lg:px-8 lg:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_12%,rgba(13,245,196,0.08),transparent_38%),radial-gradient(ellipse_at_82%_72%,rgba(108,99,255,0.1),transparent_44%)]" />
        <div className="pointer-events-none absolute inset-x-[8%] top-[8%] h-40 rounded-full bg-[#6C63FF]/[0.07] blur-3xl" />
        {/* Hidden Native File & Folder Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleNativeFileSelect}
          className="hidden"
        />
        <input
          type="file"
          // @ts-expect-error webkitdirectory is standard in Chromium browsers
          webkitdirectory=""
          directory=""
          multiple
          ref={folderInputRef}
          onChange={handleNativeFolderSelect}
          className="hidden"
        />

        <div className="editor-welcome-card relative z-10 my-auto w-full max-w-5xl shrink-0 rounded-[22px] border border-white/[0.10] bg-gradient-to-br from-[#191922]/[0.99] via-[#111118]/[0.99] to-[#0d0d14]/[0.99] shadow-[0_36px_100px_rgba(0,0,0,0.62),0_14px_42px_rgba(108,99,255,0.11),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-black/30 backdrop-blur-xl sm:rounded-2xl lg:rounded-[28px]">
          <div className="editor-welcome-accent" aria-hidden="true" />
          <div className="editor-welcome-content space-y-4 p-3.5 lg:space-y-8 lg:p-10">
            {isEditorLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-[#0DF5C4]/20 bg-[#0DF5C4]/5 px-3 py-2 text-xs text-[#0DF5C4]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Loading your project…
              </div>
            )}
            {editorError && (
              <div
                role="alert"
                className="rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 px-3 py-2 text-xs text-[#fca5a5]"
              >
                {editorError}
              </div>
            )}
            <header className="editor-welcome-header flex flex-col gap-2 border-b border-white/[0.07] pb-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:pb-7">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_10px_26px_rgba(13,245,196,0.20),inset_0_1px_0_rgba(255,255,255,0.35)] lg:h-14 lg:w-14"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Code2 className="h-7 w-7 text-[#09090e]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h1 className="text-[21px] font-bold tracking-tight lg:text-[28px]">
                      <span className="bg-gradient-to-r from-[#f8fafc] via-[#dbeafe] to-[#a5b4fc] bg-clip-text text-transparent">
                        Maestro
                      </span>{" "}
                      <span className="text-white">Code Studio</span>
                    </h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5ef0ce]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-[#9292a9] lg:mt-1.5 lg:text-sm lg:leading-6">
                    Open a local project or start with a new file.
                  </p>
                </div>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-3 py-2 text-[11px] text-[#b0b0c2] shadow-[0_6px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07)]">
                <Folder className="h-4 w-4 text-[#a5a1ff]" />
                <span>Private to this workspace</span>
              </div>
            </header>

            <div className="editor-welcome-grid grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-10">
              <section
                className="editor-welcome-start space-y-2 lg:space-y-4"
                aria-labelledby="editor-start-title"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2
                      id="editor-start-title"
                      className="text-sm font-semibold text-white"
                    >
                      Start a project
                    </h2>
                    <p className="mt-1 text-xs text-[#777791]">
                      Choose how you’d like to begin.
                    </p>
                  </div>
                  <span className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#66667f]">
                    From your device
                  </span>
                </div>

                <div className="editor-welcome-actions-stack space-y-1.5 lg:space-y-2.5">
                  <button
                    onClick={() => void openNativeFolder()}
                    className="editor-welcome-action group flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-[#0DF5C4]/25 bg-gradient-to-r from-[#0DF5C4]/[0.08] to-[#151522] px-3 py-2 text-left text-white shadow-[0_10px_28px_rgba(13,245,196,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0DF5C4]/55 hover:from-[#0DF5C4]/[0.13] hover:shadow-[0_16px_36px_rgba(13,245,196,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]/70 lg:min-h-[74px] lg:gap-3.5 lg:px-4 lg:py-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0DF5C4]/20 bg-[#0DF5C4]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <FolderOpen className="h-5 w-5 text-[#0DF5C4]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white transition-colors group-hover:text-[#78f5db]">
                        Open a folder
                      </span>
                      <span className="mt-1 block text-xs text-[#85859e]">
                        Best for projects · save edits in place
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#62627a] transition group-hover:translate-x-0.5 group-hover:text-[#0DF5C4]" />
                  </button>

                  <button
                    onClick={() => void openNativeFile()}
                    className="editor-welcome-action group flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#171720] to-[#12121a] px-3 py-2 text-left text-white shadow-[0_8px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#6C63FF]/45 hover:shadow-[0_14px_30px_rgba(108,99,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/70 lg:min-h-[68px] lg:gap-3.5 lg:px-4 lg:py-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <File className="h-5 w-5 text-[#9690ff]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        Open a single file
                      </span>
                      <span className="mt-1 block text-xs text-[#85859e]">
                        Quick edit · open one file
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#62627a] transition group-hover:translate-x-0.5 group-hover:text-[#9690ff]" />
                  </button>

                  <div className="grid grid-cols-2 gap-1.5 pt-0 lg:gap-2.5 lg:pt-1">
                    <button
                      onClick={() => setIsCreatingFile(true)}
                      className="editor-welcome-quick-action group flex min-h-[56px] items-center gap-2.5 rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#15151e] to-[#111117] px-2.5 py-2 text-left shadow-[0_6px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#FF9E64]/40 hover:shadow-[0_12px_24px_rgba(255,158,100,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E64]/60 lg:min-h-[66px] lg:gap-3 lg:px-3 lg:py-2.5"
                    >
                      <FilePlus className="h-4 w-4 shrink-0 text-[#FF9E64]" />
                      <span>
                        <span className="block text-xs font-semibold text-white">
                          New file
                        </span>
                        <span className="mt-1 block text-[10px] text-[#777791]">
                          Create a blank file
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => setIsCreatingFolder(true)}
                      className="editor-welcome-quick-action group flex min-h-[56px] items-center gap-2.5 rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#15151e] to-[#111117] px-2.5 py-2 text-left shadow-[0_6px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#FF9E64]/40 hover:shadow-[0_12px_24px_rgba(255,158,100,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E64]/60 lg:min-h-[66px] lg:gap-3 lg:px-3 lg:py-2.5"
                    >
                      <FolderPlus className="h-4 w-4 shrink-0 text-[#FF9E64]" />
                      <span>
                        <span className="block text-xs font-semibold text-white">
                          New folder
                        </span>
                        <span className="mt-1 block text-[10px] text-[#777791]">
                          Organize your files
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              <section
                className="editor-welcome-workspaces space-y-2 lg:space-y-4"
                aria-labelledby="editor-workspaces-title"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2
                      id="editor-workspaces-title"
                      className="text-sm font-semibold text-white"
                    >
                      Your workspaces
                    </h2>
                    <p className="mt-1 text-xs text-[#777791]">
                      Continue where you left off.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#29283a] bg-[#151520] px-2.5 py-1 text-[10px] font-mono text-[#85859e]">
                    {workspaces.length}
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {workspaces.length === 0 ? (
                    <div className="editor-welcome-empty flex min-h-[116px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-gradient-to-br from-white/[0.025] to-transparent px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] lg:min-h-[220px] lg:px-6 lg:py-8">
                      <span className="editor-welcome-empty-icon flex h-9 w-9 items-center justify-center rounded-xl border border-[#6C63FF]/25 bg-[#6C63FF]/10 shadow-[0_8px_24px_rgba(108,99,255,0.16),inset_0_1px_0_rgba(255,255,255,0.07)] lg:h-12 lg:w-12 lg:rounded-2xl">
                        <FolderTree className="h-4 w-4 text-[#9690ff] lg:h-5 lg:w-5" />
                      </span>
                      <h3 className="mt-2.5 text-sm font-semibold text-white lg:mt-4">
                        No workspaces yet
                      </h3>
                      <p className="mt-1 max-w-xs text-[11px] leading-4 text-[#85859e] lg:mt-1.5 lg:text-xs lg:leading-5">
                        Browse workspaces to launch a cloud environment, or open
                        a local project above.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPage("workspaces")}
                        className="mt-2.5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-[#09090e] shadow-[0_8px_22px_rgba(108,99,255,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(108,99,255,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:mt-5 lg:py-2.5"
                        style={{ backgroundColor: theme.secondary }}
                      >
                        Browse workspaces
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => {
                          void loadEditorProject().then(() =>
                            setLoadedProjectName(workspace.name),
                          );
                        }}
                        className="w-full flex items-center gap-3 rounded-xl border border-[#29283a] bg-[#151520] p-3.5 text-left text-white transition hover:border-[#0DF5C4]/40 hover:bg-[#191927] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]/60"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-[#0DF5C4]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {workspace.name}
                          </span>
                          <span className="mt-1 block truncate font-mono text-[10px] text-[#777791]">
                            {workspace.repo} / {workspace.branch} ·{" "}
                            {workspace.status}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* New File Modal */}
            {isCreatingFile && (
              <form
                onSubmit={handleCreateNewFile}
                className="rounded-2xl border border-[#2a2a3e] bg-[#161624] p-4 shadow-lg space-y-3"
              >
                <div className="text-xs font-bold text-white font-mono">
                  Enter File Name
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. app.ts, main.py, server.js"
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#101018] border border-[#262638] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#6C63FF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e]"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Create & Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(false)}
                    className="px-3 py-2 rounded-xl bg-[#202030] text-xs text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateNewFolder}
                className="rounded-2xl border border-[#2a2a3e] bg-[#161624] p-4 shadow-lg space-y-3"
              >
                <div className="text-xs font-bold text-white font-mono">
                  Create Workspace Folder
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. src, components, tests"
                    value={newFolderNameInput}
                    onChange={(event) =>
                      setNewFolderNameInput(event.target.value)
                    }
                    className="flex-1 px-3 py-2 bg-[#101018] border border-[#262638] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#6C63FF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e]"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Create Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-3 py-2 rounded-xl bg-[#202030] text-xs text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <TerminalPanel
          colorMode={colorMode}
          isOpen={isTerminalOpen}
          onClose={() => setIsTerminalOpen(false)}
          primaryColor={theme.primary}
          projectName={loadedProjectName}
        />
      </div>
    );
  }

  // 2. Full Main Editor Workbench (Matches Screenshot 1 Pixel-Perfect with 100% Dynamic Files & Content)
  return (
    <div
      className={`editor-workbench-root flex h-full min-h-0 flex-col bg-[#0b0b12] text-[#d6d6e6] overflow-hidden font-sans select-none ${isZenMode ? "editor-workbench-zen" : ""} ${editorSettings.density === "compact" ? "editor-density-compact" : ""}`}
      style={
        {
          "--ide-explorer-width": `${explorerWidth}px`,
          "--ide-editor-font-size": `${editorSettings.fontSize}px`,
          "--ide-editor-line-height": `${editorSettings.lineHeight}px`,
          "--ide-editor-tab-size": editorSettings.tabSize,
          "--ide-editor-font-family":
            editorSettings.fontFamily === "JetBrains Mono"
              ? "'JetBrains Mono', monospace"
              : editorSettings.fontFamily,
        } as React.CSSProperties
      }
    >
      {/* Hidden Native File & Folder Inputs for top toolbar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeFileSelect}
        className="hidden"
      />
      <input
        type="file"
        // @ts-expect-error webkitdirectory
        webkitdirectory=""
        directory=""
        multiple
        ref={folderInputRef}
        onChange={handleNativeFolderSelect}
        className="hidden"
      />

      {/* Project navigation and editor actions */}
      <header className="editor-workbench-header z-20 shrink-0 border-b border-[#1c1c2b] bg-gradient-to-b from-[#11111a] to-[#0e0e16] font-sans text-xs">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/[0.035] px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsFileTreeOpen((prev) => !prev)}
              title="Toggle File Explorer"
              aria-label="Toggle File Explorer"
              className="rounded-lg p-1.5 text-[#8e8ea8] transition hover:bg-white/[0.06] hover:text-white"
            >
              {isFileTreeOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 text-[#0DF5C4]" />
              )}
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[#77778f]">
              <button
                type="button"
                className="max-w-[35vw] truncate font-semibold text-[#c8c8d8]"
                title="Navigate to workspace root"
                onClick={() => {
                  setSelectedFolder("");
                  setIsFileTreeOpen(true);
                }}
              >
                {editorProjectId.startsWith("local")
                  ? "Local workspace"
                  : loadedProjectName || "Local workspace"}
              </button>
              <span className="text-[#4e4e65]">/</span>
              <div className="relative min-w-0">
                <button
                  type="button"
                  className="max-w-[35vw] truncate font-semibold text-white"
                  aria-label="Browse file location"
                  aria-expanded={isBreadcrumbMenuOpen}
                  title={activeFile?.path || "No file open"}
                  onClick={() => setIsBreadcrumbMenuOpen((open) => !open)}
                >
                  {activeFile?.path || "No file open"}
                </button>
                {isBreadcrumbMenuOpen && (
                  <div className="editor-breadcrumb-menu" role="menu" aria-label="Workspace folders">
                    {["", ...treeFolders].map((folder) => (
                      <button
                        type="button"
                        key={folder || "workspace-root"}
                        role="menuitem"
                        onClick={() => {
                          setSelectedFolder(folder);
                          setIsFileTreeOpen(true);
                          setIsBreadcrumbMenuOpen(false);
                        }}
                      >
                        {folder || "Workspace root"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {activeFile?.isDirty && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0DF5C4]"
                  title="Unsaved changes"
                />
              )}
            </div>
          </div>
          <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#63637a] xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4] shadow-[0_0_9px_rgba(13,245,196,.6)]" />
            Workspace
          </span>
        </div>
        <div className="editor-toolbar-row relative flex min-h-10 items-center justify-between gap-2 px-3 sm:px-4">
          {searchMode === "quick-open" ? (
            <div className="flex w-full items-center gap-2 rounded-lg border border-[#6C63FF]/35 bg-black/25 px-2.5 py-1.5 shadow-[0_0_20px_rgba(108,99,255,0.08)]">
              <Command className="h-3.5 w-3.5 shrink-0 text-[#0DF5C4]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setQuickOpenSelection(0);
                }}
                onKeyDown={handleSearchInputKeyDown}
                placeholder="Search files and folders by name..."
                aria-label="Quick open files and folders"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#77778f]"
              />
              <span className="hidden text-[9px] text-[#77778f] sm:inline">
                ↑ ↓ select · Enter open
              </span>
              <button
                type="button"
                onClick={() => setSearchMode(null)}
                title="Close (Esc)"
                aria-label="Close Quick Open"
                className="rounded p-1 text-[#8e8ea8] transition hover:bg-white/[0.07] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="absolute left-3 right-3 top-full z-50 mt-2 max-h-[min(56vh,460px)] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#11111b]/[0.99] p-1.5 shadow-[0_22px_65px_rgba(0,0,0,0.65),0_0_30px_rgba(108,99,255,0.1)] backdrop-blur-xl">
                {quickOpenItems.length === 0 ? (
                  <p className="px-3 py-5 text-center text-[11px] text-[#77778f]">
                    {searchQuery.trim()
                      ? "No files or folders match your search."
                      : "This workspace has no files or folders yet."}
                  </p>
                ) : (
                  quickOpenItems.slice(0, 100).map((item, index) => (
                    <button
                      key={`${item.kind}-${item.path}`}
                      type="button"
                      onMouseEnter={() => setQuickOpenSelection(index)}
                      onClick={() => openQuickOpenItem(item)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                        index === quickOpenSelection
                          ? "bg-[#6C63FF]/[0.14] text-white"
                          : "text-[#aaaabd] hover:bg-white/[0.045]"
                      }`}
                    >
                      {item.kind === "file" ? (
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-[#a5a1ff]" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-[#FFAE64]" />
                      )}
                      <span className="truncate font-mono text-[10px]">
                        {item.path}
                      </span>
                      <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-[#66667d]">
                        {item.kind}
                      </span>
                    </button>
                  ))
                )}
                {quickOpenItems.length > 100 && (
                  <p className="px-3 py-2 text-center text-[9px] text-[#66667d]">
                    Showing first 100 results — refine your search.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="editor-toolbar-group flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void openNativeFolder()}
                  className="editor-toolbar-button editor-toolbar-folder inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-[#a2a2b7] transition hover:border-[#0DF5C4]/25 hover:bg-[#0DF5C4]/[0.06] hover:text-white sm:text-[11px]"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-[#0DF5C4]" />
                  <span>Open Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => void openNativeFile()}
                  title="Open File"
                  aria-label="Open File"
                  className="editor-toolbar-button rounded-lg border border-white/[0.07] bg-white/[0.025] p-1.5 text-[#8e8ea8] transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                >
                  <File className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchMode("workspace");
                  }}
                  title="Search in Files (Ctrl+Shift+F)"
                  aria-label="Search in Files"
                  className="editor-toolbar-button rounded-lg border border-white/[0.07] bg-white/[0.025] p-1.5 text-[#8e8ea8] transition hover:border-[#6C63FF]/30 hover:bg-[#6C63FF]/[0.07] hover:text-white"
                >
                  <SearchCode className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="editor-toolbar-group flex items-center gap-1.5 sm:gap-2">
                {dirtyFiles.length > 0 && (
                  <button
                    onClick={() => setIsChangesOpen(true)}
                    className="editor-toolbar-button hidden items-center gap-1 rounded-lg border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.06] px-2.5 py-1.5 text-[10px] text-[#0DF5C4] transition hover:bg-[#0DF5C4]/10 sm:flex"
                  >
                    Show Changes ({dirtyFiles.length})
                  </button>
                )}
                <button
                  onClick={handleSaveFile}
                  disabled={isSaving || !activeFile?.isDirty}
                  title="Save changes (Ctrl+S)"
                  className="editor-toolbar-button inline-flex items-center gap-1.5 rounded-lg border border-[#6C63FF]/30 bg-[#6C63FF]/[0.10] px-2.5 py-1.5 text-[10px] font-semibold text-[#c8c4ff] transition hover:bg-[#6C63FF]/20 disabled:opacity-40 sm:text-[11px]"
                >
                  <span>{isSaving ? "Saving..." : "Save"}</span>
                  <kbd className="hidden text-[9px] text-[#8f89db] lg:inline">
                    Ctrl S
                  </kbd>
                </button>
                <button
                  onClick={handleRunCode}
                  disabled={isRunningCode || !activeFile}
                  className="editor-toolbar-button inline-flex items-center gap-1.5 rounded-lg border border-[#0DF5C4]/35 bg-[#0DF5C4]/[0.10] px-3 py-1.5 text-[10px] font-semibold text-[#0DF5C4] transition hover:bg-[#0DF5C4]/[0.18] active:scale-[.98] disabled:opacity-40 sm:text-[11px]"
                >
                  <Play
                    className={`h-3 w-3 fill-current ${isRunningCode ? "animate-spin" : ""}`}
                  />
                  <span>{isRunningCode ? "Running..." : "Run"}</span>
                </button>
                <button
                  onClick={() => setIsAiDrawerOpen((prev) => !prev)}
                  title="Toggle AI Assistant"
                  aria-label="Toggle AI Assistant"
                  className="editor-toolbar-button flex items-center gap-1 rounded-lg p-1.5 text-[#8e8ea8] transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Bot className="h-4 w-4" style={{ color: theme.primary }} />
                  <span className="hidden text-[11px] md:inline">AI</span>
                  {isAiDrawerOpen ? (
                    <PanelRightClose className="ml-0.5 h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="ml-0.5 h-3.5 w-3.5 text-[#6C63FF]" />
                  )}
                </button>
                <IconButton
                  label="Open editor settings"
                  shortcut="Ctrl+,"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings2 aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Keyboard shortcuts"
                  shortcut="?"
                  onClick={() => setIsShortcutsOpen(true)}
                >
                  <CircleHelp aria-hidden="true" />
                </IconButton>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main 3-Pane Body */}
      <div className="editor-workbench-panes flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left Pane: Files Explorer Drawer (Collapsible) */}
        {isFileTreeOpen && (
          <div
            className="editor-explorer-pane relative bg-[#0d0d15] border-r border-[#1c1c2b] flex flex-col justify-between shrink-0 font-mono text-xs overflow-y-auto"
          >
            {searchMode === "workspace" && (
              <section className="absolute inset-0 z-10 flex flex-col overflow-hidden border-r border-[#a5a1ff]/15 bg-gradient-to-b from-[#171724] via-[#10101a] to-[#0c0c13] shadow-[18px_0_45px_rgba(0,0,0,0.32),inset_-1px_0_0_rgba(165,161,255,0.08)]">
                <div className="border-b border-white/[0.07] bg-gradient-to-r from-[#6C63FF]/[0.10] via-transparent to-[#0DF5C4]/[0.04] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#a5a1ff]/20 bg-gradient-to-br from-[#6C63FF]/20 to-[#0DF5C4]/[0.08] shadow-[0_4px_14px_rgba(108,99,255,0.16)]">
                        <SearchCode className="h-3.5 w-3.5 text-[#b5b1ff]" />
                      </div>
                      <div>
                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6d4f4]">
                          Search
                        </h2>
                        <p className="mt-0.5 text-[9px] text-[#73738e]">
                          Across workspace files
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchMode(null)}
                      title="Close search (Esc)"
                      aria-label="Close workspace search"
                      className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-1.5 text-[#85859e] transition hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#a5a1ff]/25 bg-[#090910]/80 px-2.5 py-2 shadow-[0_6px_22px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.045)] transition focus-within:border-[#a5a1ff]/55 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.12),0_8px_25px_rgba(0,0,0,0.35)]">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#a5a1ff]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={handleSearchInputKeyDown}
                      placeholder="Search in files..."
                      aria-label="Search text across workspace files"
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-[#66667f]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        title="Clear search"
                        aria-label="Clear search"
                        className="rounded p-0.5 text-[#77778f] hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between px-0.5">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-[#686880]">
                      {searchQuery.trim() ? "Results" : "Find text in project"}
                    </span>
                    {searchQuery.trim() && (
                      <span className="rounded-full border border-[#a5a1ff]/15 bg-[#6C63FF]/[0.08] px-2 py-0.5 text-[9px] font-medium text-[#bbb7ff]">
                        {workspaceSearchMatches.length}{" "}
                        {workspaceSearchMatches.length === 1
                          ? "match"
                          : "matches"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {!searchQuery.trim() ? (
                    <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-4 text-center">
                      <SearchCode className="mx-auto h-5 w-5 text-[#77749e]" />
                      <p className="mt-2 text-[10px] text-[#85859e]">
                        Search all files in this workspace
                      </p>
                      <p className="mt-1 text-[9px] text-[#5f5f75]">
                        Press Esc to close
                      </p>
                    </div>
                  ) : workspaceSearchMatches.length === 0 ? (
                    <p className="rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-5 text-center text-[10px] text-[#77778f]">
                      No matches found.
                    </p>
                  ) : (
                    workspaceSearchMatches.map((match, index) => (
                      <button
                        key={`${match.file.id}-${match.line}-${match.column}-${index}`}
                        type="button"
                        onClick={() => openWorkspaceSearchMatch(match)}
                        className="group w-full rounded-xl border border-transparent bg-white/[0.018] px-2.5 py-2 text-left transition hover:border-[#a5a1ff]/20 hover:bg-gradient-to-r hover:from-[#6C63FF]/[0.10] hover:to-[#0DF5C4]/[0.035] hover:shadow-[0_5px_18px_rgba(0,0,0,0.24)]"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <FileCode className="h-3 w-3 shrink-0 text-[#9a95ec] group-hover:text-[#c2bfff]" />
                          <span className="truncate font-mono text-[9px] text-[#c7c5e4] group-hover:text-white">
                            {match.file.path}
                          </span>
                        </span>
                        <span className="mt-1.5 flex min-w-0 items-center gap-2 pl-[18px]">
                          <span className="shrink-0 rounded border border-white/[0.05] bg-black/20 px-1 text-[8px] text-[#70708a]">
                            {match.line + 1}
                          </span>
                          <span className="truncate font-mono text-[9px] text-[#85859a] group-hover:text-[#c4c4d5]">
                            {match.text.trim() || "(empty line)"}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}
            <div className="p-3 space-y-4">
              {/* Header with Project Name + Action Icons */}
              <div className="flex items-center justify-between pb-2 border-b border-[#1a1a28]">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2.5 h-2.5 rounded bg-[#0DF5C4] shrink-0" />
                  <span className="font-bold text-white text-xs truncate">
                    {loadedProjectName || "Local workspace"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsCreatingFolder(true)}
                    title="New Folder"
                    className="p-1 rounded hover:bg-[#1a1a28] text-[#71718c] hover:text-white"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsCreatingFile(true)}
                    title="New File"
                    className="p-1 rounded hover:bg-[#1a1a28] text-[#71718c] hover:text-white"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void openNativeFile()}
                    title="Open Local File"
                    aria-label="Open Local File"
                    className="p-1 rounded hover:bg-[#1a1a28] text-[#71718c] hover:text-white"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic File List */}
              <div className="editor-explorer-tree space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#63637e] uppercase tracking-wider px-1">
                  <span>WORKSPACE FILES ({treeFiles.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    value={explorerFilter}
                    onChange={(event) => setExplorerFilter(event.target.value)}
                    className="ide-input min-w-0 flex-1"
                    placeholder="Filter files"
                    aria-label="Filter workspace files"
                  />
                  <IconButton
                    label="Collapse all folders"
                    onClick={() => setCollapsedFolders(new Set(treeFolders))}
                  >
                    <ChevronRight aria-hidden="true" />
                  </IconButton>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFolder("")}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${selectedFolder === "" ? "bg-[#1a1a2b] text-white" : "text-[#8b8ba8] hover:bg-[#141420] hover:text-white"}`}
                >
                  <Folder className="h-3.5 w-3.5 text-[#0DF5C4]" />
                  <span>Workspace root</span>
                </button>

                {treeFiles.length === 0 && treeFolders.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-[#63637e] space-y-2">
                    <p>No files loaded.</p>
                    <button
                      onClick={() => setIsCreatingFile(true)}
                      className="px-2.5 py-1 rounded bg-[#181826] text-white hover:bg-[#202034] text-[10px]"
                    >
                      + Create First File
                    </button>
                  </div>
                ) : explorerFilter.trim() ? (
                  <div className="space-y-1">
                    {treeFiles
                      .filter((file) =>
                        file.path
                          .toLowerCase()
                          .includes(explorerFilter.trim().toLowerCase()),
                      )
                      .map((file) => (
                        <button
                          type="button"
                          key={file.id}
                          onClick={() => openFileInEditor(file)}
                          className={`flex w-full min-w-0 items-center gap-2 truncate rounded px-2 py-1.5 text-left ${activeFile?.id === file.id ? "editor-explorer-active" : "text-[#8b8ba8] hover:bg-[#141420]"}`}
                          title={file.path}
                        >
                          <span className="editor-file-type">{file.iconType}</span>
                          <span className="truncate">{file.path}</span>
                        </button>
                      ))}
                  </div>
                ) : (
                  renderExplorerContents()
                )}
              </div>

              {isCreatingFolder && (
                <form
                  onSubmit={handleCreateNewFolder}
                  className="p-2 bg-[#161624] border border-[#2b2b3e] rounded-xl space-y-2"
                >
                  <div className="text-[10px] text-[#8b8ba8]">
                    New folder in {selectedFolder || "workspace root"}
                  </div>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="folder-name"
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    className="w-full px-2 py-1 bg-[#101018] border border-[#262638] rounded-lg text-xs font-mono text-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-2 py-0.5 text-[10px] text-[#787896]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[10px] rounded font-semibold text-[#09090e]"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Create Folder
                    </button>
                  </div>
                </form>
              )}

              {/* Inline New File Form if opened */}
              {isCreatingFile && (
                <form
                  onSubmit={handleCreateNewFile}
                  className="p-2 bg-[#161624] border border-[#2b2b3e] rounded-xl space-y-2"
                >
                  <div className="text-[10px] text-[#8b8ba8]">
                    New file in {selectedFolder || "workspace root"}
                  </div>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="filename.ext"
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    className="w-full px-2 py-1 bg-[#101018] border border-[#262638] rounded-lg text-xs font-mono text-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFile(false)}
                      className="px-2 py-0.5 text-[10px] text-[#787896]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[10px] rounded font-semibold text-[#09090e]"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="editor-explorer-footer p-3 border-t border-[#1a1a28] flex items-center justify-between text-[11px] text-[#63637e]">
              <button
                onClick={requestCloseProject}
                className="hover:text-white"
              >
                ← Close Folder
              </button>
              <span>Total: {treeFiles.length} files</span>
            </div>
          </div>
        )}
        {isFileTreeOpen && (
          <div
            className="ide-resizer ide-resizer-vertical editor-explorer-resizer"
            role="separator"
            tabIndex={0}
            aria-label="Resize Explorer panel"
            aria-orientation="vertical"
            aria-valuenow={explorerWidth}
            aria-valuemin={180}
            aria-valuemax={360}
            onPointerDown={(event) => {
              explorerResizeStartRef.current = {
                pointerX: event.clientX,
                width: explorerWidth,
              };
              setIsResizingExplorer(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onDoubleClick={() => setExplorerWidth(256)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              setExplorerWidth((width) =>
                Math.max(180, Math.min(360, width + (event.key === "ArrowRight" ? 12 : -12))),
              );
            }}
          />
        )}

        {/* Center Pane: Active Code Editor */}
        <div className="editor-center-pane flex min-h-0 min-w-0 flex-1 flex-col bg-[#09090f] overflow-hidden">
          {/* Tabs Bar */}
          <div className="editor-tabs-bar h-9 bg-[#0c0c14] border-b border-[#1c1c2b] flex items-center justify-between px-2 shrink-0">
            <div className="editor-tabs-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {openFiles.length === 0 ? (
                <span className="text-[11px] text-[#63637e] font-mono px-2">
                  No files open
                </span>
              ) : (
                sortedOpenFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", file.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const fromFileId = event.dataTransfer.getData("text/plain");
                      if (fromFileId) reorderOpenFiles(fromFileId, file.id);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setTabMenu({ fileId: file.id, x: event.clientX, y: event.clientY });
                    }}
                    onKeyDown={(event) => {
                      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                      event.preventDefault();
                      const nextIndex = sortedOpenFiles.findIndex((tab) => tab.id === file.id) +
                        (event.key === "ArrowRight" ? 1 : -1);
                      const next = sortedOpenFiles[(nextIndex + sortedOpenFiles.length) % sortedOpenFiles.length];
                      if (next) {
                        setActiveFileId(next.id);
                        document.getElementById(`editor-tab-${next.id}`)?.focus();
                      }
                    }}
                    id={`editor-tab-${file.id}`}
                    role="tab"
                    aria-selected={activeFile?.id === file.id}
                    tabIndex={activeFile?.id === file.id ? 0 : -1}
                    aria-label={`${file.name}${pinnedTabs.includes(file.id) ? ", pinned" : ""}`}
                    title={file.path}
                    className={`editor-file-tab group h-8 px-3 rounded-t-lg flex items-center gap-2 text-xs font-mono border-t-2 transition-colors cursor-pointer ${
                      activeFile?.id === file.id
                        ? "bg-[#09090f] text-white font-semibold border-[#6C63FF]"
                        : "bg-[#11111a] text-[#80809c] border-transparent hover:text-white"
                    }`}
                  >
                    <span className="editor-file-type text-[10px] px-1 rounded bg-white/10 font-bold uppercase">
                      {file.iconType}
                    </span>
                    <span className="editor-file-tab-name">{file.name}</span>
                    {pinnedTabs.includes(file.id) && (
                      <Pin className="h-3 w-3 text-[#0DF5C4]" aria-label="Pinned tab" />
                    )}
                    {file.isDirty && (
                      <span
                        title="Unsaved changes"
                        aria-label="Unsaved changes"
                        className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4]"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeFileFromEditor(file.id);
                      }}
                      type="button"
                      title={`Close ${file.name}`}
                      aria-label={`Close ${file.name}`}
                      className="opacity-0 group-hover:opacity-100 hover:text-white text-[#63637e] p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="editor-tabs-actions flex items-center gap-2 text-xs text-[#63637e] pr-2">
              <IconButton
                label={isSplitEditor ? "Close split editor" : "Split editor"}
                onClick={() => setIsSplitEditor((split) => !split)}
                aria-pressed={isSplitEditor}
              >
                <Split aria-hidden="true" />
              </IconButton>
              <IconButton
                label={isZenMode ? "Exit focus mode" : "Focus editor"}
                shortcut="Ctrl+Shift+Z"
                onClick={() => setIsZenMode((mode) => !mode)}
              >
                <Columns aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          {/* Interactive Code Editor Area */}
          <div className={`editor-code-area relative flex min-h-[180px] flex-1 overflow-hidden font-mono text-xs ${isSplitEditor ? "editor-split-view" : ""}`}>
            {searchMode === "file" && (
              <section className="absolute right-4 top-3 z-30 w-[min(390px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-white/[0.13] bg-gradient-to-br from-[#191923]/[0.99] via-[#11111b]/[0.99] to-[#0d0d14]/[0.99] shadow-[0_28px_80px_rgba(0,0,0,0.72),0_10px_34px_rgba(108,99,255,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                <div className="h-px bg-gradient-to-r from-[#0DF5C4]/70 via-[#6C63FF]/60 to-[#FF9E64]/40" />
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-[#0DF5C4]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setQuickOpenSelection(0);
                    }}
                    onKeyDownCapture={(event) => {
                      if (event.key === "F3") {
                        event.preventDefault();
                        event.stopPropagation();
                        navigateFileSearch(event.shiftKey ? -1 : 1);
                      } else if (
                        event.altKey &&
                        ["c", "w", "r"].includes(event.key.toLowerCase())
                      ) {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFindOption(
                          event.key.toLowerCase() === "c"
                            ? "case"
                            : event.key.toLowerCase() === "w"
                              ? "word"
                              : "regex",
                        );
                      }
                    }}
                    onKeyDown={handleSearchInputKeyDown}
                    placeholder="Find in current file..."
                    aria-label="Find in current file"
                    aria-invalid={Boolean(
                      findResult.error ||
                      (searchQuery && activeFileMatches.length === 0),
                    )}
                    autoComplete="off"
                    spellCheck={false}
                    className={`min-w-0 flex-1 rounded-md border px-1 py-1 text-xs text-white outline-none placeholder:text-[#66667c] ${
                      findResult.error ||
                      (searchQuery && activeFileMatches.length === 0)
                        ? "border-[#ff6b7a]/70"
                        : "border-transparent bg-transparent"
                    }`}
                  />
                  {searchMode === "file" && (
                    <>
                      <span
                        aria-live="polite"
                        className={`whitespace-nowrap text-[10px] ${
                          findResult.error ||
                          (searchQuery && activeFileMatches.length === 0)
                            ? "text-[#ff9e9e]"
                            : "text-[#84849b]"
                        }`}
                      >
                        {findResult.error
                          ? "Invalid regex"
                          : activeFileMatches.length === 0
                            ? "No results"
                            : `${activeFileMatchIndex + 1} of ${activeFileMatches.length}`}
                      </span>
                      {[
                        {
                          label: "Match Case",
                          value: findMatchCase,
                          toggle: () => toggleFindOption("case"),
                          text: "Aa",
                        },
                        {
                          label: "Match Whole Word",
                          value: findWholeWord,
                          toggle: () => toggleFindOption("word"),
                          text: "ab",
                        },
                        {
                          label: "Use Regular Expression",
                          value: findUseRegex,
                          toggle: () => toggleFindOption("regex"),
                          text: ".*",
                        },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          title={option.label}
                          aria-label={option.label}
                          aria-pressed={option.value}
                          onClick={option.toggle}
                          className={`rounded-md px-1 py-1 font-mono text-[10px] transition ${
                            option.value
                              ? "bg-[#6C63FF]/25 text-[#c5c0ff]"
                              : "text-[#77778f] hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          {option.text}
                        </button>
                      ))}
                      <button
                        type="button"
                        title="Find in Selection"
                        aria-label="Find in Selection"
                        aria-pressed={findInSelection}
                        onClick={() => {
                          findControllerRef.current!.setSelection(
                            findInSelection ? null : findSelectionRange,
                          );
                          setFindInSelection((enabled) => !enabled);
                          setFindHistoryTick((tick) => tick + 1);
                        }}
                        className={`rounded-md px-1 py-1 text-[10px] ${
                          findInSelection
                            ? "bg-[#6C63FF]/25 text-[#c5c0ff]"
                            : "text-[#77778f] hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        Sel
                      </button>
                      <button
                        type="button"
                        title="Toggle Replace (Ctrl+H)"
                        aria-label="Toggle Replace"
                        aria-expanded={isReplaceOpen}
                        onClick={() => setIsReplaceOpen((open) => !open)}
                        className="rounded-md px-1 py-1 text-[10px] text-[#77778f] transition hover:bg-white/[0.07] hover:text-white"
                      >
                        ▾
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    title="Previous match (Shift+Enter)"
                    aria-label="Previous match"
                    disabled={activeFileMatches.length === 0}
                    onClick={() => navigateFileSearch(-1)}
                    className="rounded-lg px-1.5 py-1 text-[#8e8ea8] transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Next match (Enter)"
                    aria-label="Next match"
                    disabled={activeFileMatches.length === 0}
                    onClick={() => navigateFileSearch(1)}
                    className="rounded-lg px-1.5 py-1 text-[#8e8ea8] transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={closeFileFind}
                    title="Close (Esc)"
                    aria-label="Close search"
                    className="rounded p-1 text-[#77778f] transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2 text-[9px] text-[#696980]">
                  <span>{findResult.error ?? "Current file"}</span>
                  <span>Enter to cycle · Esc to close</span>
                </div>
                {searchMode === "file" && isReplaceOpen && (
                  <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
                    <input
                      ref={replaceInputRef}
                      value={replaceQuery}
                      onChange={(event) => setReplaceQuery(event.target.value)}
                      aria-label="Replace with"
                      placeholder="Replace with..."
                      className="min-w-0 flex-1 rounded-md border border-white/[0.09] bg-black/20 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-[#66667c] focus:border-[#6C63FF]/60"
                    />
                    <button
                      type="button"
                      onClick={replaceCurrentFindMatch}
                      disabled={!activeFileMatch}
                      className="rounded-md border border-white/[0.1] px-2 py-1.5 text-[10px] text-[#aaa9c2] hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={replaceAllFindMatches}
                      disabled={!activeFileMatches.length}
                      title="Replace All (Ctrl+Alt+Enter)"
                      className="rounded-md border border-white/[0.1] px-2 py-1.5 text-[10px] text-[#aaa9c2] hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      Replace All
                    </button>
                  </div>
                )}
              </section>
            )}
            {!activeFile ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#656582] space-y-3">
                <FileCode className="w-10 h-10 text-[#45455c]" />
                <p>No file selected.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCreatingFile(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#151522] border border-[#242436] text-white hover:border-white/30"
                  >
                    + Create File
                  </button>
                  <button
                    onClick={() => void openNativeFile()}
                    className="px-3 py-1.5 rounded-xl bg-[#151522] border border-[#242436] text-white hover:border-white/30"
                  >
                    Open Local File
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative flex-1 overflow-hidden bg-[#09090f]">
                  {currentCode.length === 0 && !isEditorHintDismissed && (
                    <div className="editor-empty-hint" aria-label="Editor tips">
                      <button
                        type="button"
                        className="editor-empty-hint-action"
                        onClick={() => {
                          setIsAiDrawerOpen(true);
                          window.requestAnimationFrame(() =>
                            aiQueryInputRef.current?.focus(),
                          );
                        }}
                      >
                        Generate code
                      </button>
                      <span className="editor-empty-hint-shortcut"> · <Kbd>Ctrl+I</Kbd> · </span>
                      <span className="editor-language-hint" ref={languagePickerRef}>
                        <button
                          type="button"
                          className="editor-empty-hint-action"
                          aria-haspopup="listbox"
                          aria-expanded={isLanguagePickerOpen}
                          onClick={() =>
                            setIsLanguagePickerOpen((open) => !open)
                          }
                        >
                          select a Language
                        </button>
                        {isLanguagePickerOpen && (
                          <span
                            className="editor-language-menu"
                            role="listbox"
                            aria-label="Select editor language"
                          >
                            {EDITOR_LANGUAGES.map((language, index) => (
                              <button
                                key={language.id}
                                ref={
                                  index === 0 ? firstLanguageOptionRef : null
                                }
                                type="button"
                                role="option"
                                aria-selected={
                                  activeFile?.language === language.id
                                }
                                className="editor-language-option"
                                onClick={() =>
                                  selectEditorLanguage(language.id)
                                }
                              >
                                {language.name}
                              </button>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="editor-empty-hint-shortcut"> · <Kbd>Ctrl+K M</Kbd> · </span>
                      <button
                        type="button"
                        className="editor-empty-hint-action"
                        onClick={() => dismissEditorHint(true)}
                      >
                        dismiss
                      </button>
                    </div>
                  )}
                  <Editor
                    path={activeFile.path}
                    language={getMonacoLanguageId(activeFile.language)}
                    value={currentCode}
                    theme={MONACO_THEME}
                    beforeMount={handleMonacoBeforeMount}
                    onMount={handleMonacoMount}
                    onChange={(value) => {
                      replaceUndoRef.current = null;
                      updateFileContent(activeFile.id, value ?? "");
                    }}
                    keepCurrentModel
                    saveViewState
                    width={isSplitEditor ? "50%" : "100%"}
                    height="100%"
                    className="editor-monaco-host"
                    options={{
                      automaticLayout: true,
                      fontFamily: editorSettings.fontFamily,
                      fontSize: editorSettings.fontSize,
                      lineHeight: editorSettings.lineHeight,
                      tabSize: editorSettings.tabSize,
                      minimap: { enabled: editorSettings.minimap },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      bracketPairColorization: { enabled: true },
                      guides: {
                        indentation: true,
                        bracketPairs: true,
                        highlightActiveIndentation: true,
                      },
                      wordWrap: editorSettings.wordWrap ? "on" : "off",
                      glyphMargin: true,
                      renderLineHighlight: "line",
                      padding: { top: 16, bottom: 16 },
                      cursorSmoothCaretAnimation: "on",
                      fontLigatures: true,
                      contextmenu: true,
                    }}
                  />
                  {isSplitEditor && (
                    <pre
                      className="editor-split-preview"
                      aria-label="Split editor preview"
                    >
                      {currentCode}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Execution Output (if run) */}
          {saveError && (
            <div className="bg-[#2a1118] border-t border-[#7f1d1d] px-3 py-2 text-xs font-mono text-[#fca5a5]">
              Save error: {saveError}
            </div>
          )}

          {runOutput && (
            <div className="h-16 bg-[#0a0a12] border-t border-[#1e1e2d] p-3 text-xs font-mono text-[#0DF5C4] flex items-center justify-between">
              <pre className="whitespace-pre-wrap overflow-auto">
                {runOutput}
              </pre>
              <button
                onClick={() => setRunOutput(null)}
                className="text-[#656580] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <TerminalPanel
            colorMode={colorMode}
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            primaryColor={theme.primary}
            projectName={loadedProjectName}
          />

          {/* Bottom Editor Status Bar */}
          <div className="editor-status-bar h-6 bg-[#0c0c14] border-t border-[#181824] px-3 flex items-center justify-between text-[11px] font-mono text-[#6c6c88] shrink-0">
            <div className="editor-status-group editor-status-left">
              <button
                type="button"
                className="editor-status-branch text-[#0DF5C4] flex items-center gap-1"
                title="Current branch (preview)"
                onClick={() => addToast({ type: "info", title: "Local preview branch", description: "Git integration will be connected by the backend." })}
              >
                <GitBranch className="h-3 w-3" />
                local*
              </button>
              <span className="editor-status-position">
                Ln {editorCursor.line}, Col {editorCursor.column}
              </span>
              <span className="editor-status-lines">
                {activeFile ? `${editorDocumentStats.lines} Lines` : "0 Lines"}
              </span>
              {editorSelectionCount > 0 && (
                <span className="editor-status-selection">
                  {editorSelectionCount} Selected
                </span>
              )}
              <span className="editor-status-chars">
                {editorDocumentStats.chars} Chars
              </span>
            </div>

            <div className="editor-status-group editor-status-right">
              <button
                type="button"
                className="editor-status-port"
                title="Open integrated terminal"
                onClick={() => setIsTerminalOpen(true)}
              >
                Port: 3000
              </button>
              <button
                type="button"
                className="editor-status-encoding"
                title="Encoding: UTF-8"
                onClick={() => addToast({ type: "info", title: "UTF-8 encoding", description: "Encoding selection is a UI preview." })}
              >
                UTF-8
              </button>
              <Dropdown
                ref={statusLanguagePickerRef}
                label="Language mode"
                className="editor-status-language-dropdown"
              >
                <button
                  type="button"
                  ref={statusLanguageTriggerRef}
                  className="editor-status-language"
                  aria-label="Change language mode"
                  aria-haspopup="listbox"
                  aria-expanded={isStatusLanguagePickerOpen}
                  title="Change language mode"
                  disabled={!activeFile}
                  onClick={openStatusLanguagePicker}
                >
                  {EDITOR_LANGUAGES.find(
                    (language) => language.id === activeFile?.language,
                  )?.name || "Plain Text"}
                </button>
                {isStatusLanguagePickerOpen && (
                  <div
                    className="editor-status-language-menu"
                    role="listbox"
                    aria-label="Select language"
                    style={{
                      bottom: statusLanguageMenuPosition.bottom,
                      left: statusLanguageMenuPosition.left,
                      maxHeight: statusLanguageMenuPosition.maxHeight,
                    }}
                  >
                    <input
                      ref={statusLanguageSearchRef}
                      className="editor-status-language-search"
                      type="search"
                      aria-label="Search languages"
                      placeholder="Search languages"
                      value={statusLanguageSearch}
                      onChange={(event) => {
                        setStatusLanguageSearch(event.target.value);
                        setStatusLanguageHighlight(0);
                      }}
                      onKeyDown={handleStatusLanguageKeyDown}
                    />
                    <div className="editor-status-language-options">
                      {filteredStatusLanguages.length ? (
                        filteredStatusLanguages.map((language, index) => (
                          <button
                            key={language.id}
                            ref={(element) => {
                              statusLanguageOptionRefs.current[index] = element;
                            }}
                            type="button"
                            role="option"
                            aria-selected={activeFile?.language === language.id}
                            className={`editor-status-language-option ${
                              statusLanguageHighlight === index ? "is-highlighted" : ""
                            }`}
                            onMouseEnter={() => setStatusLanguageHighlight(index)}
                            onClick={() => {
                              if (activeFile) selectEditorLanguage(language.id);
                              setIsStatusLanguagePickerOpen(false);
                            }}
                          >
                            <span>{language.name}</span>
                            {activeFile?.language === language.id && (
                              <Check aria-hidden="true" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="editor-status-language-empty">
                          No languages found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Dropdown>
              <button
                type="button"
                className="editor-status-notifications"
                aria-label={`Open notifications (${toasts.length})`}
                title="Open notifications"
                onClick={() => setIsNotificationCenterOpen(true)}
              >
                <Bell className="h-3 w-3" />
                {toasts.length > 0 && <span>{toasts.length}</span>}
              </button>
              <button
                type="button"
                className="editor-status-settings"
                aria-label="Open editor settings"
                title="Editor settings (Ctrl+,)"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: AI Assistant Drawer (Collapsible) */}
        {isAiDrawerOpen && (
          <div
            className={`editor-ai-drawer-shell ${isResizingAiPanel ? "editor-ai-drawer-resizing" : ""}`}
            style={{ width: aiPanelWidth }}
          >
            <div
              className="editor-ai-resize-handle"
              role="separator"
              tabIndex={0}
              aria-label="Resize AI Assistant panel"
              aria-orientation="vertical"
              aria-valuenow={aiPanelWidth}
              onPointerDown={(event) => {
                event.preventDefault();
                aiPanelResizeStartRef.current = {
                  pointerX: event.clientX,
                  width: aiPanelWidth,
                };
                setIsResizingAiPanel(true);
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                  return;
                event.preventDefault();
                setAiPanelWidth((width) =>
                  Math.max(
                    280,
                    Math.min(520, width + (event.key === "ArrowLeft" ? 12 : -12)),
                  ),
                );
              }}
            />
            <div className="editor-ai-panel bg-[#0c0c14] border-l border-[#1c1c2b] flex flex-col justify-between shrink-0 font-sans text-xs overflow-hidden">
            {/* AI Header */}
            <div className="p-3 border-b border-[#1c1c2b] flex items-center justify-between bg-[#0e0e16]">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Sparkles className="w-3 h-3 text-[#09090e]" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs">
                    AI Assistant
                  </span>
                  <span className="text-[10px] text-[#0DF5C4] font-mono ml-1.5">
                    Interactive Engine
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(false)}
                title="Close AI Assistant"
                aria-label="Close AI Assistant"
                className="editor-ai-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* AI Chat Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
              <div className="editor-ai-context px-2.5 py-1 rounded-lg bg-[#141420] border border-[#232336] text-[11px] font-mono text-[#8b8ba8] flex items-center gap-1.5">
                <FileCode className="w-3 h-3 text-[#0DF5C4]" />
                <span>
                  Context: {activeFile ? activeFile.name : "Workspace"}
                </span>
              </div>

              {aiHistory.length === 0 ? (
                <div className="editor-ai-empty-state p-4 text-center text-xs text-[#71718c] space-y-2">
                  <p>
                    Ask anything about your code or request functions,
                    optimizations, and bug fixes.
                  </p>
                </div>
              ) : (
                aiHistory.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-[11px] font-bold font-mono text-[#a4a4c4]">
                      {item.sender}
                    </div>
                    <div className="p-3 rounded-xl bg-[#141422] border border-[#232338] text-white text-xs leading-relaxed">
                      {item.text}
                    </div>

                    {item.code && (
                      <div className="bg-[#09090f] border border-[#202030] rounded-xl overflow-hidden font-mono text-xs">
                        <pre className="p-3 text-[11px] text-[#d6d6e8] leading-relaxed overflow-x-auto">
                          <code>{item.code}</code>
                        </pre>
                        <div className="p-2 border-t border-[#1a1a28] flex justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard
                                .writeText(item.code || "")
                                .then(() => addToast({ type: "success", title: "Code copied" }))
                                .catch((error: unknown) =>
                                  addToast({
                                    type: "error",
                                    title: "Could not copy code",
                                    description: error instanceof Error ? error.message : "Clipboard access denied.",
                                  }),
                                );
                            }}
                            className="px-3 py-1 rounded-lg text-xs text-[#9a9cac] hover:bg-white/[0.06]"
                          >
                            Copy code
                          </button>
                          <button
                            onClick={() => applyDiffToActiveFile(item.code!)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-[#09090e]"
                            style={{ backgroundColor: theme.primary }}
                          >
                            Apply Diff to Editor
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {isAiLoading && (
                <div className="p-3 text-xs text-[#0DF5C4] font-mono flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    AI generating code for {activeFile?.name || "file"}...
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Prompt Input */}
            <div className="p-3 border-t border-[#1c1c2b] bg-[#0e0e16]">
              <form onSubmit={handleSendAi} className="relative">
                {aiHistory.length === 0 && (
                  <div className="editor-ai-suggestions" aria-label="Suggested prompts">
                    {[
                      "Explain this file",
                      "Find potential bugs",
                      "Suggest a refactor",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setAiQuery(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  ref={aiQueryInputRef}
                  placeholder="Ask AI to write or fix code..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  aria-label="Ask AI to write or fix code"
                  className="editor-ai-input w-full pl-3 pr-10 py-2.5 bg-[#141422] border border-[#242438] rounded-xl text-xs text-white placeholder-[#595975] focus:outline-none focus:border-[#6C63FF]"
                />
                <button
                  type="submit"
                  aria-label="Send prompt to AI"
                  title="Send prompt"
                  className="editor-ai-send absolute right-2 top-2 p-1.5 rounded-lg text-[#09090e]"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Send className="w-3 h-3 text-[#09090e]" />
                </button>
              </form>
            </div>
            </div>
          </div>
        )}
      </div>
      {tabMenu && (
        <div
          className="editor-tab-menu"
          style={{ left: Math.min(tabMenu.x, window.innerWidth - 190), top: Math.min(tabMenu.y, window.innerHeight - 210) }}
          role="menu"
          aria-label="Editor tab actions"
          onMouseLeave={() => setTabMenu(null)}
        >
          {[
            {
              label: pinnedTabs.includes(tabMenu.fileId) ? "Unpin tab" : "Pin tab",
              action: () =>
                setPinnedTabs((previous) =>
                  previous.includes(tabMenu.fileId)
                    ? previous.filter((id) => id !== tabMenu.fileId)
                    : [...previous, tabMenu.fileId],
                ),
            },
            {
              label: "Close",
              action: () => closeFileFromEditor(tabMenu.fileId),
            },
            {
              label: "Close others",
              action: () => closeOtherFilesFromEditor(tabMenu.fileId),
            },
            { label: "Close all", action: closeAllFilesFromEditor },
            {
              label: "Copy path",
              action: () => {
                const file = openFiles.find((item) => item.id === tabMenu.fileId);
                if (!file) return;
                void navigator.clipboard
                  .writeText(file.path)
                  .then(() => addToast({ type: "success", title: "Path copied" }))
                  .catch((error: unknown) =>
                    addToast({
                      type: "error",
                      title: "Could not copy path",
                      description: error instanceof Error ? error.message : "Clipboard access denied.",
                    }),
                  );
              },
            },
            {
              label: "Rename",
              action: () => {
                const file = openFiles.find((item) => item.id === tabMenu.fileId);
                if (file) {
                  setRenamingFileId(file.id);
                  setRenameValue(file.name);
                  setSelectedFolder(file.path.split("/").slice(0, -1).join("/"));
                  setIsFileTreeOpen(true);
                }
              },
            },
            {
              label: "Duplicate",
              action: () => {
                const file = openFiles.find((item) => item.id === tabMenu.fileId);
                if (!file) return;
                const extension = file.name.includes(".")
                  ? `.${file.name.split(".").pop()}`
                  : "";
                const baseName = extension ? file.name.slice(0, -extension.length) : file.name;
                const parent = file.path.split("/").slice(0, -1).join("/");
                void createNewFile(
                  `${baseName}.copy${extension}`,
                  [parent, `${baseName}.copy${extension}`].filter(Boolean).join("/"),
                  fileContents[file.id] || "",
                );
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.action();
                setTabMenu(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {isSettingsOpen && (
        <Modal title="Editor settings" onClose={() => setIsSettingsOpen(false)}>
          <div className="ide-settings-list">
            <label>
              <span>Editor font size <strong>{editorSettings.fontSize}px</strong></span>
              <input
                type="range"
                min="10"
                max="20"
                value={editorSettings.fontSize}
                onChange={(event) =>
                  setEditorSettings((settings) => ({ ...settings, fontSize: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              <span>Line height <strong>{editorSettings.lineHeight}px</strong></span>
              <input
                type="range"
                min="16"
                max="32"
                step="2"
                value={editorSettings.lineHeight}
                onChange={(event) =>
                  setEditorSettings((settings) => ({ ...settings, lineHeight: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              <span>Code font</span>
              <select
                value={editorSettings.fontFamily}
                onChange={(event) =>
                  setEditorSettings((settings) => ({ ...settings, fontFamily: event.target.value }))
                }
              >
                <option>JetBrains Mono</option>
                <option>Consolas</option>
                <option>monospace</option>
              </select>
            </label>
            <label>
              <span>Tab size</span>
              <select
                value={editorSettings.tabSize}
                onChange={(event) =>
                  setEditorSettings((settings) => ({ ...settings, tabSize: Number(event.target.value) }))
                }
              >
                {[2, 4, 8].map((size) => <option key={size} value={size}>{size} spaces</option>)}
              </select>
            </label>
            <div className="ide-setting-switch"><span>Word wrap</span><Switch checked={editorSettings.wordWrap} onChange={(wordWrap) => setEditorSettings((settings) => ({ ...settings, wordWrap }))} label="Word wrap" /></div>
            <div className="ide-setting-switch"><span>Minimap preview</span><Switch checked={editorSettings.minimap} onChange={(minimap) => setEditorSettings((settings) => ({ ...settings, minimap }))} label="Minimap preview" /></div>
            <div className="ide-setting-switch"><span>Compact density</span><Switch checked={editorSettings.density === "compact"} onChange={(compact) => setEditorSettings((settings) => ({ ...settings, density: compact ? "compact" : "comfortable" }))} label="Compact density" /></div>
            <Button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="justify-self-start"
            >
              View keyboard shortcuts <Kbd>?</Kbd>
            </Button>
          </div>
        </Modal>
      )}
      {isShortcutsOpen && (
        <Modal title="Keyboard shortcuts" onClose={() => setIsShortcutsOpen(false)}>
          <div className="ide-shortcuts-list">
            {[
              ["Command palette", "Ctrl/Cmd + K"],
              ["Quick Open", "Ctrl/Cmd + P"],
              ["Search in files", "Ctrl/Cmd + Shift + F"],
              ["Save file", "Ctrl/Cmd + S"],
              ["Open AI Assistant", "Ctrl/Cmd + I"],
              ["Toggle terminal", "Ctrl + `"],
              ["Focus mode", "Ctrl/Cmd + Shift + Z"],
              ["Editor settings", "Ctrl/Cmd + ,"],
              ["This shortcut guide", "Ctrl/Cmd + / or ?"],
            ].map(([label, shortcut]) => (
              <div key={label}><span>{label}</span><Kbd>{shortcut}</Kbd></div>
            ))}
          </div>
        </Modal>
      )}
      {isNotificationCenterOpen && (
        <Modal title="Notifications" onClose={() => setIsNotificationCenterOpen(false)}>
          <div className="ide-notification-list">
            {toasts.length === 0 ? (
              <p>No new notifications. Workspace status is clear.</p>
            ) : (
              toasts.map((toast) => (
                <article key={toast.id}>
                  <div>
                    <strong>{toast.title}</strong>
                    {toast.description && <p>{toast.description}</p>}
                  </div>
                  <IconButton
                    label={`Dismiss ${toast.title}`}
                    onClick={() => removeToast(toast.id)}
                  >
                    <X aria-hidden="true" />
                  </IconButton>
                </article>
              ))
            )}
          </div>
        </Modal>
      )}
      {isClosePromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-folder-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-[#303044] bg-[#11111a] p-5 shadow-2xl"
          >
            <div>
              <h2
                id="close-folder-title"
                className="text-base font-bold text-white"
              >
                Unsaved changes
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#a1a1b7]">
                {dirtyFiles.length} file{dirtyFiles.length === 1 ? "" : "s"} in{" "}
                {loadedProjectName} have unsaved changes. Save them to the
                original files before closing?
              </p>
            </div>
            {saveError && (
              <p className="rounded-lg border border-red-900 bg-red-950/50 p-2 text-xs text-red-300">
                {saveError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsClosePromptOpen(false)}
                className="rounded-lg border border-[#343444] px-3 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void closeProjectNow(true)}
                className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void closeProjectNow(false)}
                className="rounded-lg bg-[#0DF5C4] px-3 py-2 text-xs font-semibold text-[#07110f] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
      {isChangesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-changes-title"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#303044] bg-[#11111a] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#29293a] p-4">
              <div>
                <h2
                  id="editor-changes-title"
                  className="text-sm font-bold text-white"
                >
                  Changes
                </h2>
                <p className="mt-1 text-[11px] text-[#8b8ba8]">
                  Working copy compared with the last saved version
                </p>
              </div>
              <button
                type="button"
                aria-label="Close changes"
                onClick={() => setIsChangesOpen(false)}
                className="rounded p-1 text-[#8b8ba8] hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-4">
              {dirtyFiles.map((file) => (
                <details
                  key={file.id}
                  open={dirtyFiles.length === 1}
                  className="overflow-hidden rounded-xl border border-[#2b2b3d] bg-[#0b0b12]"
                >
                  <summary className="cursor-pointer px-3 py-2 text-xs font-mono text-[#0DF5C4]">
                    {file.path}
                  </summary>
                  <div className="grid min-w-0 gap-px border-t border-[#2b2b3d] bg-[#2b2b3d] md:grid-cols-2">
                    <div className="min-w-0 bg-[#101017]">
                      <div className="border-b border-[#242434] px-3 py-1.5 text-[10px] uppercase tracking-wide text-[#f87171]">
                        Saved
                      </div>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 text-[11px] leading-5 text-[#b7a2a2]">
                        {savedFileContents[file.id] || ""}
                      </pre>
                    </div>
                    <div className="min-w-0 bg-[#101017]">
                      <div className="border-b border-[#242434] px-3 py-1.5 text-[10px] uppercase tracking-wide text-[#0DF5C4]">
                        Current
                      </div>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 text-[11px] leading-5 text-[#c6e8dc]">
                        {fileContents[file.id] || ""}
                      </pre>
                    </div>
                  </div>
                </details>
              ))}
            </div>
            <div className="flex justify-end border-t border-[#29293a] p-3">
              <button
                type="button"
                onClick={() => setIsChangesOpen(false)}
                className="rounded-lg border border-[#343444] px-3 py-2 text-xs text-white hover:bg-white/5"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
