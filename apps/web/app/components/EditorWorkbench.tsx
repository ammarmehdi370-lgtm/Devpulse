"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Braces, Check, ChevronDown, ChevronRight, CircleAlert, CircleDot,
  CircleX, Copy, File, FileCode, FilePlus, FileText, Folder,
  FolderOpen, FolderPlus, Globe, GitBranch, Play, RefreshCw, Search,
  Palette, Send, Settings2, Sparkles, Terminal, Trash2, X, Zap, AlertTriangle,
  AlertCircle, LoaderCircle,
} from "lucide-react";
import { EditorFile, useApp } from "../context/AppContext";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type SelectionSnapshot = { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; selectedText: string };
type AiCommand = "/fix" | "/explain" | "/test" | "/comment" | "/refactor" | "/optimize";
type AiMessage = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean; command?: AiCommand; fileId?: string; selection?: SelectionSnapshot };
type OutputTab = "terminal" | "output" | "problems";
type ContextMenu = { x: number; y: number; file: EditorFile } | null;
type CursorPosition = { lineNumber: number; column: number };
type EditorHandle = { trigger: (source: string, action: string, payload: unknown) => void; getSelection: () => SelectionSnapshot | null };
type ApplyTarget = "selection" | "cursor" | "file";
type AiUsage = { used: number; limit: number; plan?: string };
type AiApplyRequest = { fileId: string; code: string; language: string; range?: { startLine: number; endLine: number }; aiMessageId?: string; expectedVersion: number; skipCheck?: boolean };
type AiApplyResponse = { file: { id: string; version: number; sizeBytes: number | null; updatedAt: string }; revisionId: string; linesReplaced: number; appliedFromAI: true };
type AiApplyError = { error?: string; message?: string; currentVersion?: number };
type ImagePreview = { name: string; sizeBytes: number; url: string; width?: number; height?: number };
const AI_COMMANDS: Array<{ value: AiCommand; label: string; description: string; requiresSelection: boolean }> = [
  { value: "/fix", label: "/fix", description: "Fix bugs in selection", requiresSelection: true },
  { value: "/explain", label: "/explain", description: "Explain this code", requiresSelection: true },
  { value: "/test", label: "/test", description: "Write unit tests", requiresSelection: false },
  { value: "/comment", label: "/comment", description: "Add JSDoc comments", requiresSelection: true },
  { value: "/refactor", label: "/refactor", description: "Improve code quality", requiresSelection: true },
  { value: "/optimize", label: "/optimize", description: "Improve performance", requiresSelection: true },
];
const LARGE_FILE_LIMIT = 500 * 1024;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const BINARY_MIME_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/ico", "image/x-icon",
  "application/pdf", "application/zip", "application/x-zip-compressed", "application/x-tar", "application/gzip",
  "application/x-7z-compressed", "application/x-rar-compressed", "application/octet-stream", "application/wasm",
  "audio/mpeg", "audio/wav", "audio/ogg", "video/mp4", "video/webm", "video/ogg", "font/ttf", "font/otf", "font/woff", "font/woff2",
]);
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "pdf", "zip", "tar", "gz", "tgz", "7z", "rar", "wasm", "exe", "dll",
  "so", "dylib", "bin", "dat", "db", "sqlite", "sqlite3", "ttf", "otf", "woff", "woff2", "eot", "mp3", "mp4", "wav", "ogg", "webm",
  "avi", "mov", "mkv", "class", "pyc", "pyo", "lock",
]);

export function isBinaryFile(file: File): boolean {
  if (BINARY_MIME_TYPES.has(file.type.toLowerCase())) return true;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(extension);
}

const isImageFileName = (name: string, mimeType = "") => mimeType.toLowerCase().startsWith("image/") || new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"]).has(name.split(".").pop()?.toLowerCase() ?? "");

export async function hasBinaryContent(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  if (!bytes.length) return false;
  if (bytes.some((byte) => byte === 0)) return true;
  let nonPrintable = 0;
  for (const byte of bytes) if (byte < 9 || (byte > 13 && byte < 32) || byte === 127) nonPrintable += 1;
  return nonPrintable / bytes.length > 0.3;
}

export type UnreadableFile = { name: string; path: string; reason: "binary" | "too_large" | "encoding_error"; sizeBytes?: number; mimeType?: string };

const formatFileSize = (sizeBytes: number) => sizeBytes >= 1024 * 1024 ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;

const ImagePreviewTab: React.FC<{ name: string; sizeBytes: number; url: string; width?: number; height?: number; onClose: () => void }> = ({ name, sizeBytes, url, width, height, onClose }) => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-slate-300"><img src={url} alt={name} className="max-h-[60%] max-w-full object-contain" /><div><h2 className="text-sm font-bold text-white">{name}</h2><p className="mt-1 text-[11px] text-slate-500">{formatFileSize(sizeBytes)}{width && height ? ` • ${width} × ${height}` : ""}</p><p className="mt-2 text-xs text-slate-400">This file cannot be edited here</p></div><div className="flex gap-2"><a href={url} download={name} className="bg-cyan-400/15 px-3 py-1.5 text-xs text-cyan-300">Download</a><button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400">Close</button></div></div>
);

const UnreadableFileRow: React.FC<{ file: UnreadableFile; onPreview?: () => void }> = ({ file, onPreview }) => {
  const description = file.reason === "too_large" ? `File too large (${formatFileSize(file.sizeBytes || 0)}) — maximum is 10 MB` : file.reason === "encoding_error" ? `Could not read ${file.name} — unsupported encoding` : `Binary file — cannot be edited in Devpulse\nType: ${file.mimeType || "unknown"}  •  Size: ${formatFileSize(file.sizeBytes || 0)}`;
  return <button type="button" role="treeitem" title={description} onClick={onPreview} className="flex w-full items-center gap-2 px-3 py-1 text-left text-red-400/60 line-through"><span aria-hidden="true">🚫</span><span className="truncate">{file.name}</span></button>;
};

const useAnnounce = () => {
  const [message, setMessage] = useState("");
  const announce = useCallback((nextMessage: string) => setMessage(nextMessage), []);
  const liveRegion = <div className="sr-only" aria-live="assertive" aria-atomic="true">{message}</div>;
  return { announce, liveRegion };
};

const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, enabled: boolean, initialFocusRef?: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const container = containerRef.current;
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>("button, [href], input, textarea, select, [tabindex]"));
    (initialFocusRef?.current || getFocusable()[0])?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, enabled, initialFocusRef]);
};

export enum FileOrigin {
  API = "api",
  LOCAL = "local",
  NEW = "new",
  READONLY = "readonly",
}

const OriginBadge: React.FC<{ origin: EditorFile["origin"] }> = ({ origin }) => {
  if (origin === FileOrigin.LOCAL) return <span title="This file is not saved to Devpulse. Save it to persist across sessions." className="shrink-0 text-[9px] text-amber-300">local</span>;
  if (origin === FileOrigin.NEW) return <span title="New file — save to add to your project" className="shrink-0 text-[9px] text-purple-300">unsaved</span>;
  return null;
};

const LocalSaveDialog: React.FC<{ onSave: () => void; onKeep: () => void; onCancel: () => void }> = ({ onSave, onKeep, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true">
    <div className="w-full max-w-md border border-[#44346d] bg-[#161624] p-5 shadow-2xl">
      <h2 className="text-sm font-bold text-white">Save local file</h2>
      <p className="mt-3 text-xs leading-5 text-slate-300">This file is from your local machine.<br />Save it to your Devpulse project to<br />persist it across sessions.</p>
      <div className="mt-5 flex justify-end gap-2 text-xs"><button onClick={onCancel} className="px-3 py-2 text-slate-400">Cancel</button><button onClick={onKeep} className="border border-[#332b50] px-3 py-2 text-slate-300">Keep Local Only</button><button onClick={onSave} className="bg-[#7C3AED] px-3 py-2 font-bold text-white">Save to Project</button></div>
    </div>
  </div>
);

const NewFilePrompt: React.FC<{ name: string; folder: string; setName: (value: string) => void; setFolder: (value: string) => void; onSave: () => void; onCancel: () => void }> = ({ name, folder, setName, setFolder, onSave, onCancel }) => (
  <div className="border-b border-purple-400/30 bg-purple-950/30 px-4 py-2"><div className="mb-2 text-[11px] text-purple-200">Give this file a name and path to save it</div><div className="flex flex-wrap items-center gap-2"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="filename.ts" className="w-36 border border-[#44346d] bg-[#0d0d16] px-2 py-1.5 text-[11px] text-white" /><span className="text-slate-500">in</span><input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="/src/" className="w-28 border border-[#44346d] bg-[#0d0d16] px-2 py-1.5 text-[11px] text-white" /><button onClick={onSave} className="bg-[#7C3AED] px-3 py-1.5 text-[11px] font-bold text-white">Save to Project</button><button onClick={onCancel} className="px-2 py-1.5 text-[11px] text-slate-400">Cancel</button></div></div>
);

const ShimmerLines: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>{Array.from({ length: count }, (_, index) => <div key={index} className="h-3 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-[var(--dp-surface)] via-[var(--dp-surface2)] to-[var(--dp-surface)] bg-[length:200%_100%]" />)}</div>
);

const ProjectLoadingSkeleton: React.FC = () => (
  <div className="flex h-full min-h-0 flex-col bg-[#0A0A0F] text-slate-300" aria-busy="true" aria-label="Loading project files">
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#28243c] bg-[#11111a] px-3"><div className="h-5 w-[120px] animate-pulse bg-[#28243c]" /><div className="h-5 w-[80px] animate-pulse bg-[#28243c]" /></div>
    <div className="flex min-h-0 flex-1"><aside className="w-[208px] shrink-0 border-r border-[#28243c] bg-[#11111a] p-3"><div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-2"><div className="h-3 w-3/4 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-[var(--dp-surface)] via-[var(--dp-surface2)] to-[var(--dp-surface)] bg-[length:200%_100%]" /><div className="ml-3 space-y-2"><ShimmerLines count={2} /></div></div>)}</div></aside><main className="flex min-w-0 flex-1 items-center justify-center"><div className="flex flex-col items-center gap-3"><Zap className="h-8 w-8 animate-pulse text-purple-400" /><span className="text-sm text-slate-500">Loading your project...</span></div></main></div>
  </div>
);

const EmptyProjectState: React.FC<{ onNewFile: () => void; onUpload: () => void; onOpenFolder: () => void }> = ({ onNewFile, onUpload, onOpenFolder }) => (
  <div className="flex h-full flex-col items-center justify-center px-6 text-center"><FolderOpen className="h-12 w-12 text-slate-600" /><h2 className="mt-4 text-lg text-slate-200">No files yet</h2><p className="mt-1 text-sm text-slate-500">Create your first file to start coding</p><div className="mt-5 flex gap-2"><button onClick={onNewFile} className="flex items-center gap-1 bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white"><FilePlus className="h-3.5 w-3.5" />New File</button><button onClick={onUpload} className="flex items-center gap-1 border border-[#44346d] px-3 py-2 text-xs text-slate-200"><File className="h-3.5 w-3.5" />Upload Files</button></div><div className="my-5 flex w-full max-w-xs items-center gap-3 text-[10px] text-slate-600"><span className="h-px flex-1 bg-[#28243c]" />OR<span className="h-px flex-1 bg-[#28243c]" /></div><p className="text-xs text-slate-500">Or load a local folder</p><button onClick={onOpenFolder} className="mt-3 flex items-center gap-1 border border-[#332b50] px-3 py-2 text-xs text-slate-300"><FolderOpen className="h-3.5 w-3.5" />Open Folder</button></div>
);

const NoActiveFileState: React.FC<{ recentFiles: EditorFile[]; onOpen: (file: EditorFile) => void; onNewFile: () => void; onSearch: () => void; onOpenFile: () => void; onAskAi: () => void }> = ({ recentFiles, onOpen, onNewFile, onSearch, onOpenFile, onAskAi }) => (
  <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-8"><h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent files</h2><div className="mt-3 space-y-1">{recentFiles.length ? recentFiles.slice(0, 5).map((file) => <button key={file.id} onClick={() => onOpen(file)} className="flex w-full items-center gap-3 border border-transparent px-3 py-2 text-left hover:border-[#332b50] hover:bg-[#11111a]"><FileTypeIcon file={file} /><span className="text-xs text-slate-200">{file.name}</span><span className="ml-auto truncate text-[10px] text-slate-600">{file.path}</span></button>) : <p className="py-3 text-xs text-slate-600">No recently opened files</p>}</div><h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-slate-500">Quick actions</h2><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={onSearch} className="border border-[#28243c] bg-[#11111a] p-3 text-left text-xs text-slate-300">Ctrl+P <span className="block text-[10px] text-slate-600">Search files</span></button><button onClick={onNewFile} className="border border-[#28243c] bg-[#11111a] p-3 text-left text-xs text-slate-300">Ctrl+N <span className="block text-[10px] text-slate-600">New file</span></button><button onClick={onOpenFile} className="border border-[#28243c] bg-[#11111a] p-3 text-left text-xs text-slate-300">Ctrl+O <span className="block text-[10px] text-slate-600">Open local file</span></button><button onClick={onAskAi} className="border border-[#28243c] bg-[#11111a] p-3 text-left text-xs text-slate-300">Ctrl+I <span className="block text-[10px] text-slate-600">Ask AI</span></button></div></div>
);

const APIErrorState: React.FC<{ message: string; onRetry: () => void; onWorkOffline: () => void }> = ({ message, onRetry, onWorkOffline }) => (
  <div className="flex h-full flex-col items-center justify-center px-6 text-center"><AlertCircle className="h-12 w-12 text-red-400" /><h2 className="mt-4 text-lg text-slate-200">Could not load project</h2><p className="mt-2 max-w-md text-sm text-slate-500">{message}</p><div className="mt-5 flex gap-2"><button onClick={onRetry} className="bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white">Retry</button><button onClick={onWorkOffline} className="border border-[#44346d] px-4 py-2 text-xs text-slate-300">Work Offline</button></div></div>
);

const LargeFileWarning: React.FC<{ fileName: string; sizeBytes: number; onOpen: () => void; onClose: () => void }> = ({ fileName, sizeBytes, onOpen, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { announce, liveRegion } = useAnnounce();
  const size = `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  useEffect(() => { closeRef.current?.focus(); announce(`Warning: Large file detected. ${fileName} is ${size}. Opening may affect performance. Open anyway or Close.`); }, [fileName, size, announce]);
  return <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-amber-400/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-100"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" /><span className="min-w-0 flex-1">Large file ({size}) — syntax highlighting and AI features are disabled</span><button onClick={onOpen} tabIndex={0} className="shrink-0 border border-amber-300/30 px-2 py-1">Open anyway</button><button ref={closeRef} onClick={onClose} tabIndex={0} className="shrink-0 text-amber-300">Close</button>{liveRegion}</div>;
};

const useRecentFiles = (projectId: string, activeFile?: EditorFile) => {
  const storageKey = projectId ? `devpulse:recent-files:${projectId}` : "";
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  useEffect(() => {
    if (!storageKey) return;
    try { setRecentPaths(JSON.parse(localStorage.getItem(storageKey) || "[]") as string[]); } catch { setRecentPaths([]); }
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || !activeFile) return;
    setRecentPaths((previous) => {
      const next = [activeFile.path, ...previous.filter((path) => path !== activeFile.path)].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [activeFile?.path, storageKey]);
  return recentPaths;
};

const useAiUsage = (enabled: boolean) => {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => { try { const response = await fetch(`${API_BASE}/v1/ai/usage`, { credentials: "include" }); if (!response.ok) return; const next = await response.json() as AiUsage; if (!cancelled) setUsage(next); } catch { /* usage is optional UI */ } };
    void load();
    const timer = window.setInterval(() => void load(), 300000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [enabled]);
  return usage;
};

export const DEVPULSE_MONACO_THEME = {
  base: "vs-dark", inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" }, { token: "keyword", foreground: "569CD6" },
    { token: "string", foreground: "CE9178" }, { token: "identifier", foreground: "9CDCFE" },
    { token: "number", foreground: "B5CEA8" }, { token: "type", foreground: "4EC9B0" },
    { token: "function", foreground: "DCDCAA" },
  ],
  colors: {
    "editor.background": "#0A0A0F", "editor.lineHighlightBackground": "#1a1a2e",
    "editor.selectionBackground": "#7C3AED33", "editorCursor.foreground": "#7C3AED",
    "editorLineNumber.foreground": "#4b4b63", "editorLineNumber.activeForeground": "#c4b5fd",
    "editorIndentGuide.background1": "#1c1c2b", "editorIndentGuide.activeBackground1": "#3b2d63",
  },
} as const;

const languageForFile = (file?: EditorFile) => {
  const extension = file?.name.split(".").pop()?.toLowerCase();
  if (extension === "py") return "python";
  if (extension === "rs") return "rust";
  if (extension === "go") return "go";
  return "javascript";
};

const monacoLanguageForFile = (file?: EditorFile, forcePlaintext = false) => {
  if (forcePlaintext) return "plaintext";
  const extension = file?.name.split(".").pop()?.toLowerCase();
  if (extension === "ts" || extension === "tsx") return "typescript";
  if (extension === "js" || extension === "jsx") return "javascript";
  if (extension === "json") return "json";
  if (extension === "css" || extension === "scss") return "scss";
  if (extension === "md") return "markdown";
  if (extension === "html") return "html";
  return extension || "plaintext";
};

const extractCode = (text: string) =>
  text.match(/```(?:[\w#+-]+)?\s*([\s\S]*?)```/)?.[1]?.trim() || text;
const extractCodeLanguage = (text: string) =>
  text.match(/```([\w#+-]+)?\s*[\s\S]*?```/)?.[1] || "text";

const parseSseLine = (line: string) => {
  if (!line.startsWith("data:")) return "";
  const payload = line.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const parsed = JSON.parse(payload) as { type?: string; content?: string; text?: string; delta?: string };
    return parsed.type === "chunk" ? parsed.content || "" : parsed.text || parsed.delta || "";
  } catch {
    return payload;
  }
};

const FileTypeIcon: React.FC<{ file: EditorFile; className?: string }> = ({ file, className = "h-4 w-4" }) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (["tsx", "jsx", "ts", "js"].includes(extension || "")) return <FileCode className={`${className} text-cyan-400`} />;
  if (["css", "scss"].includes(extension || "")) return <Palette className={`${className} text-blue-400`} />;
  if (extension === "json") return <Braces className={`${className} text-amber-400`} />;
  if (extension === "md") return <FileText className={`${className} text-slate-400`} />;
  if (extension === "py") return <FileCode className={`${className} text-green-400`} />;
  if (extension === "html") return <Globe className={`${className} text-orange-400`} />;
  return <File className={`${className} text-slate-500`} />;
};

const FileRow: React.FC<{ file: EditorFile; active: boolean; onOpen: () => void; onMenu: (event: React.MouseEvent<HTMLButtonElement>) => void }> = ({ file, active, onOpen, onMenu }) => (
  <button role="treeitem" aria-selected={active} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOpen(); } if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const items = Array.from(event.currentTarget.closest("[role=tree]")?.querySelectorAll<HTMLElement>("[role=treeitem]") || []); const nextIndex = items.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1); items[(nextIndex + items.length) % items.length]?.focus(); } }} onClick={onOpen} onContextMenu={onMenu} className={`group flex w-full items-center gap-2 border-l-2 px-3 py-1 text-left ${active ? "border-l-[#7C3AED] bg-[#1a1a2e] text-white" : "border-l-transparent text-slate-400 hover:bg-[#1a1a2e]"}`}>
    {file.origin === FileOrigin.NEW && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />}<FileTypeIcon file={file} /> <span className={`truncate ${file.origin === FileOrigin.LOCAL ? "italic text-amber-300" : ""}`}>{file.name}</span>{file.origin === FileOrigin.LOCAL && <span className="shrink-0 text-[9px] text-slate-500">(local)</span>}
    {file.isDirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
  </button>
);

const languageLabel = (language: string) => language.toLowerCase().replace("typescript", "TypeScript").replace("javascript", "JavaScript").replace("python", "Python");

const lineOffset = (content: string, line: number, column: number) => {
  const lines = content.split("\n");
  return lines.slice(0, Math.max(0, line - 1)).reduce((total, current) => total + current.length + 1, 0) + Math.max(0, column - 1);
};

const buildAppliedContent = (content: string, replacement: string, target: ApplyTarget, selection: SelectionSnapshot | null, cursor: CursorPosition) => {
  if (target === "selection" && selection) {
    const start = lineOffset(content, selection.startLineNumber, selection.startColumn);
    const end = lineOffset(content, selection.endLineNumber, selection.endColumn);
    return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
  }
  if (target === "cursor") {
    const offset = lineOffset(content, cursor.lineNumber, cursor.column);
    return `${content.slice(0, offset)}${replacement}${content.slice(offset)}`;
  }
  return replacement;
};

const ApplyPreview: React.FC<{ message: AiMessage; activeFile?: EditorFile; content: string; cursor: CursorPosition; onApply: (content: string) => void }> = ({ message, activeFile, content, cursor, onApply }) => {
  const selection = message.selection || null;
  const hasSelection = Boolean(selection?.selectedText);
  const [target, setTarget] = useState<ApplyTarget>(hasSelection ? "selection" : "file");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const replacement = extractCode(message.text);
  const nextContent = activeFile ? buildAppliedContent(content, replacement, target, selection, cursor) : content;
  const aiLanguage = extractCodeLanguage(message.text).toLowerCase();
  const fileLanguage = activeFile?.language?.toLowerCase() || "plaintext";
  const mismatch = aiLanguage && aiLanguage !== "text" && !fileLanguage.includes(aiLanguage) && !(aiLanguage === "js" && fileLanguage.includes("javascript")) && !(aiLanguage === "ts" && fileLanguage.includes("typescript"));
  const removedText = target === "selection" ? selection?.selectedText || "" : target === "file" ? content : "";
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const { announce, liveRegion } = useAnnounce();
  useFocusTrap(dialogRef, previewOpen, firstButtonRef);
  useEffect(() => { if (previewOpen) announce(mismatch && !mismatchConfirmed ? `Warning: AI returned ${languageLabel(aiLanguage)} but your file is ${languageLabel(fileLanguage)}.` : `Diff preview dialog. ${replacement.split("\n").length} lines will be changed. Review the changes and confirm.`); }, [previewOpen, replacement, mismatch, mismatchConfirmed, aiLanguage, fileLanguage, announce]);
  const showDiff = () => { setPreviewOpen(true); setMismatchConfirmed(false); };
  const targetOptions: Array<{ value: ApplyTarget; label: string }> = [{ value: "selection", label: "Replace selection" }, { value: "cursor", label: "Insert at cursor" }, { value: "file", label: "Replace whole file" }];
  const targetKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => { if (!event.key.startsWith("Arrow")) return; event.preventDefault(); const enabled = targetOptions.filter((option) => option.value !== "selection" || hasSelection); const index = enabled.findIndex((option) => option.value === target); const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (index + 1) % enabled.length : (index - 1 + enabled.length) % enabled.length; const nextTarget = enabled[next]; if (nextTarget) setTarget(nextTarget.value); };
  return <div ref={dialogRef} role={previewOpen ? "dialog" : undefined} aria-modal={previewOpen ? "true" : undefined} aria-labelledby={previewOpen ? "diff-preview-title" : undefined} aria-describedby={previewOpen ? "diff-preview-description" : undefined} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setPreviewOpen(false); } }} className="mt-2 border border-[#28243c] bg-[#0d0d16] p-2">
    {(!hasSelection || previewOpen) && <div className="mb-2 text-[10px] text-slate-400"><span id="apply-target-label">Apply code to:</span><div role="radiogroup" aria-labelledby="apply-target-label" onKeyDown={(event) => { targetKeyDown(event); if (event.key === " ") { event.preventDefault(); const focused = event.currentTarget.querySelector<HTMLElement>("[aria-checked=\"true\"]"); focused?.click(); } }} className="mt-1 space-y-1">{targetOptions.map((option) => <label key={option.value} id={`target-${option.value}`} role="radio" aria-checked={target === option.value} tabIndex={option.value === "selection" && !hasSelection ? -1 : target === option.value ? 0 : -1} className="flex items-center gap-1"><input type="radio" checked={target === option.value} disabled={option.value === "selection" && !hasSelection} onChange={() => setTarget(option.value)} />{option.label}</label>)}</div></div>}
    {!previewOpen ? <button onClick={showDiff} className="mt-2 w-full bg-cyan-400/15 px-2 py-1.5 text-[10px] font-bold text-cyan-300">Apply to editor</button> : <><h2 id="diff-preview-title" className="sr-only">Diff preview</h2><p id="diff-preview-description" className="sr-only">Review the changes and confirm.</p><div className="max-h-[200px] overflow-auto border border-[#28243c] p-2 font-mono text-[10px]">{removedText && removedText.split("\n").map((line, index) => <div key={`old-${index}`} className="bg-red-950/40 px-1 text-red-300">- {line}</div>)}{removedText && <div className="my-1 border-t border-[#28243c]" />}{replacement.split("\n").map((line, index) => <div key={`new-${index}`} className="bg-green-950/40 px-1 text-green-300">+ {line}</div>)}</div>{mismatch && !mismatchConfirmed ? <div role="alertdialog" aria-modal="true" aria-labelledby="mismatch-title" className="mt-2 text-[10px] text-amber-300"><span id="mismatch-title">AI returned {languageLabel(aiLanguage)} but your file is {languageLabel(fileLanguage)}. Apply anyway?</span><div className="mt-2 flex gap-2"><button ref={firstButtonRef} onClick={() => setMismatchConfirmed(true)} className="bg-amber-500/20 px-2 py-1">Apply anyway</button><button onClick={() => setPreviewOpen(false)} className="px-2 py-1 text-slate-500">Cancel</button></div></div> : <div className="mt-2 flex justify-end gap-2"><button ref={firstButtonRef} onClick={() => onApply(nextContent)} className="bg-green-500/20 px-2 py-1 text-[10px] text-green-300">Apply</button><button aria-label="Close diff preview" onClick={() => setPreviewOpen(false)} className="px-2 py-1 text-[10px] text-slate-500">Cancel</button></div>}</>}
    {liveRegion}
  </div>;
};

const ContextIndicator: React.FC<{ file?: EditorFile; cursor: CursorPosition; selection: SelectionSnapshot | null; onClear: () => void; enabled: boolean }> = ({ file, cursor, selection, onClear, enabled }) => !enabled ? <div className="mb-2 text-[10px] text-slate-600">Context cleared</div> : <div className="mb-2 border border-[#28243c] bg-[#0d0d16] p-2 text-[10px] text-slate-400"><div className="mb-1 flex items-center justify-between uppercase tracking-wider text-slate-500"><span>Context</span><button onClick={onClear} aria-label="Clear context"><X className="h-3 w-3" /></button></div><div className="text-cyan-300">📄 {file?.name || "No file"} ({languageLabel(file?.language || "plaintext")})</div><div>📍 Line {cursor.lineNumber}, Col {cursor.column}</div>{selection?.selectedText && <div>🔲 {selection.selectedText.split("\n").length} lines selected</div>}<div>🌿 main branch</div></div>;

const UsageMeter: React.FC<{ usage: AiUsage | null }> = ({ usage }) => { if (!usage) return <div className="mt-2 text-[10px] text-slate-600">Loading usage...</div>; const percentage = Math.min(100, Math.round((usage.used / usage.limit) * 100)); const warning = percentage >= 80 && percentage < 100; const exhausted = percentage >= 100; return <div className="mt-2"><div className="flex justify-between text-[10px] text-slate-500"><span>{usage.used.toLocaleString()} / {usage.limit.toLocaleString()} requests this month</span>{exhausted && <span className="text-red-300">Monthly limit reached</span>}</div><div className="mt-1 h-1.5 bg-[#28243c]"><div className={`h-full ${exhausted ? "bg-red-400" : warning ? "bg-amber-400" : "bg-purple-400"}`} style={{ width: `${percentage}%` }} /></div>{warning && <div className="mt-1 text-[10px] text-amber-300">Running low on AI requests</div>}{exhausted && <><div id="ai-limit-message" role="status" className="mt-1 text-[10px] text-red-300">Monthly AI request limit reached. Upgrade to Pro for more requests.</div><button aria-label="Upgrade to Pro to get more AI requests" className="mt-2 text-[10px] text-cyan-300">Upgrade to Pro →</button></>}</div>; };

const AiPanel: React.FC<{
  messages: AiMessage[]; input: string; setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void; onClose: () => void;
  onCopy: (message: AiMessage) => void; copiedId: string | null;
  onApply: (message: AiMessage) => void; activeFile?: EditorFile; activeContent: string; cursor: CursorPosition; selection: SelectionSnapshot | null; isStreaming: boolean; usage: AiUsage | null; usageExhausted: boolean; onClearHistory: () => void; historyCount: number;
}> = ({ messages, input, setInput, onSubmit, onClose, onCopy, copiedId, onApply, activeFile, activeContent, cursor, selection, isStreaming, usage, usageExhausted, onClearHistory, historyCount }) => {
  const [commandIndex, setCommandIndex] = useState(0);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [contextVisible, setContextVisible] = useState(true);
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false);
  const { announce, liveRegion } = useAnnounce();
  useEffect(() => setContextVisible(true), [activeFile?.id]);
  const commandQuery = input.startsWith("/") ? (input.split(/\s/)[0] || "").toLowerCase() : "";
  const commandMatches = AI_COMMANDS.filter((command) => command.value.startsWith(commandQuery));
  useEffect(() => { setCommandMenuDismissed(false); }, [commandQuery]);
  const visibleMessages = historyExpanded ? messages : messages.slice(Math.min(historyCount, messages.length));
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (commandQuery && commandMatches.length && !commandMenuDismissed) {
      if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((index) => (index + 1) % commandMatches.length); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((index) => (index - 1 + commandMatches.length) % commandMatches.length); return; }
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); const command = commandMatches[commandIndex] || commandMatches[0]; if (command) { setInput(`${command.value} `); setCommandMenuDismissed(true); announce(`${command.label} selected — ${command.description}`); } return; }
      if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); setCommandMenuDismissed(true); return; }
    }
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  };
  return <aside className="flex w-[320px] shrink-0 flex-col border-l border-[#28243c] bg-[#11111a]">
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#28243c] px-3"><Zap className={`h-4 w-4 text-purple-400 ${isStreaming ? "animate-pulse" : ""}`} /><span className="font-bold text-white">Devpulse AI</span><span title="AI conversation history is stored only in this browser session" className="ml-auto border border-purple-400/30 bg-purple-400/10 px-1.5 py-0.5 text-[9px] text-purple-200">claude-sonnet-4-6</span><button onClick={onClearHistory} title="Clear local history" className="text-[10px] text-slate-500">Clear</button><button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>
    <div className="flex-1 space-y-3 overflow-y-auto p-3">{historyCount > 0 && <button onClick={() => setHistoryExpanded((expanded) => !expanded)} className="text-[10px] text-slate-600">[{historyCount} previous messages] {historyExpanded ? "Hide" : "Show"}</button>}{visibleMessages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-6" : "mr-2 border-l-2 border-purple-500 pl-2"}><div className={message.role === "user" ? "bg-[#5B21B6] p-2 text-white" : "bg-[#191923] p-2 text-slate-300"}>{message.role === "user" && message.command && <span className="mb-1 inline-block bg-purple-300/20 px-1.5 py-0.5 text-[9px] text-purple-200">{message.command}</span>}<div className="whitespace-pre-wrap text-[11px] leading-5">{message.text || (message.streaming ? "Thinking..." : "")}{message.streaming && <span className="ml-1 animate-pulse text-purple-300">▌</span>}{message.streaming && !message.text && <ShimmerLines count={3} className="mt-3 w-4/5" />}</div>{message.role === "assistant" && message.text && !message.streaming && <><div className="mt-2 flex items-center justify-between text-[9px] text-slate-500"><span>{extractCodeLanguage(message.text).toUpperCase()}</span><button onClick={() => onCopy(message)}>{copiedId === message.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}</button></div><ApplyPreview message={message} activeFile={activeFile} content={activeContent} cursor={cursor} onApply={(nextContent) => { onApply({ ...message, text: nextContent }); }} /></>}</div></div>)}</div>
    <div className="border-t border-[#28243c] p-3"><ContextIndicator file={activeFile} cursor={cursor} selection={selection} enabled={contextVisible} onClear={() => { setContextVisible(false); window.dispatchEvent(new Event("devpulse-ai-clear-context")); }} />{commandQuery && commandMatches.length > 0 && !commandMenuDismissed && <div id="ai-command-listbox" role="listbox" aria-label="AI commands" className="mb-2 border border-[#44346d] bg-[#161624] p-1">{commandMatches.map((command, index) => <button id={`ai-command-${command.value.slice(1)}`} role="option" aria-selected={index === commandIndex} key={command.value} onClick={() => { setInput(`${command.value} `); setCommandMenuDismissed(true); announce(`${command.label} selected — ${command.description}`); }} className={`flex w-full justify-between px-2 py-1 text-left text-[10px] ${index === commandIndex ? "bg-purple-500/20 text-white" : "text-slate-400"}`}><span>{command.label}</span><span>{command.description}</span></button>)}</div>}<form onSubmit={onSubmit} className="flex items-end gap-2"><textarea disabled={isStreaming || usageExhausted} aria-disabled={usageExhausted ? "true" : undefined} aria-describedby={usageExhausted ? "ai-limit-message" : undefined} aria-expanded={Boolean(commandQuery && commandMatches.length && !commandMenuDismissed)} aria-controls="ai-command-listbox" aria-activedescendant={commandQuery && commandMatches.length && !commandMenuDismissed && (commandMatches[commandIndex] || commandMatches[0]) ? `ai-command-${(commandMatches[commandIndex] || commandMatches[0])!.value.slice(1)}` : undefined} value={input} onChange={(event) => { setInput(event.target.value); setCommandIndex(0); setCommandMenuDismissed(false); }} onKeyDown={handleInputKeyDown} rows={2} placeholder="Ask Devpulse AI... /fix" className="min-w-0 flex-1 resize-none border border-[#332b50] bg-[#0d0d16] p-2 text-[11px] text-white outline-none disabled:opacity-50" /> <button disabled={isStreaming || usageExhausted} className="bg-[#7C3AED] p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form><div className="mt-2 text-[9px] text-slate-600">/fix /explain /test /comment /refactor /optimize</div><UsageMeter usage={usage} />{commandQuery && commandMatches.length > 0 && !commandMenuDismissed && <div className="sr-only" role="status">{commandMatches.length} commands available. Use arrow keys.</div>}{liveRegion}</div>
  </aside>;
};

const OutputPanel: React.FC<{
  outputTab: OutputTab; setOutputTab: (tab: OutputTab) => void; runOutput: string;
  runExitCode: number | null; isRunning: boolean; elapsedMs?: number; onRun: () => void; onClear: () => void;
}> = ({ outputTab, setOutputTab, runOutput, runExitCode, isRunning, elapsedMs = 0, onRun, onClear }) => (
  <section className="flex h-[176px] shrink-0 flex-col border-t border-[#28243c] bg-[#0d0d16]">
    <div className="flex h-9 shrink-0 items-center border-b border-[#28243c] px-3">
      <div className="flex h-full items-center gap-4">{(["terminal", "output", "problems"] as OutputTab[]).map((tab) => <button key={tab} onClick={() => setOutputTab(tab)} className={`h-full text-[10px] font-bold tracking-wider ${outputTab === tab ? "border-b-2 border-purple-400 text-white" : "text-slate-500"}`}>{tab.toUpperCase()}</button>)}</div>
      <div className="ml-auto flex items-center gap-3"><button disabled={isRunning} onClick={onRun} className="flex items-center gap-1 text-[10px] text-cyan-300 disabled:opacity-50">{isRunning ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}{isRunning ? "Running" : "Run"}</button><button onClick={onClear} className="text-[10px] text-slate-500">Clear</button></div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-3 text-[11px] leading-5">
      {outputTab === "problems" ? <div className="flex items-center gap-2 text-slate-600"><CircleDot className="h-3.5 w-3.5" />No problems detected</div> : outputTab === "output" ? <div className="text-slate-500">Build and diagnostic output will appear here.</div> : <div className={runExitCode !== null && runExitCode !== 0 ? "text-red-300" : "text-green-300"}><div className="mb-1 flex items-center gap-2 text-[10px]">{runExitCode === null ? <CircleDot className="h-3 w-3 text-slate-500" /> : runExitCode === 0 ? <Check className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}<span>{isRunning ? `Running... ${ (elapsedMs / 1000).toFixed(1) }s` : runExitCode === null ? "Ready" : `Exited with code ${runExitCode} ${runExitCode === 0 ? "✓" : "✗"}`}</span>{!isRunning && runExitCode !== null && <span>Completed in {(elapsedMs / 1000).toFixed(1)}s</span>}{isRunning && elapsedMs > 10000 && <span>Still running... (timeout in {Math.max(0, 30 - Math.floor(elapsedMs / 1000))}s)</span>}</div><pre className="whitespace-pre-wrap"><span className="text-purple-400">$</span> <span className="text-cyan-300">devpulse terminal</span>{"\n"}{runOutput}{isRunning && <span className="animate-pulse text-cyan-300"> ▌</span>}</pre></div>}
    </div>
  </section>
);

export const EditorWorkbench: React.FC = () => {
  const { isEditorProjectOpen, setIsEditorProjectOpen, editorProjectId, isEditorLoading, editorError, loadEditorProject, loadedProjectName, treeFiles, openFiles, activeFileId, setActiveFileId, fileContents, updateFileContent, saveFileContent, saveLocalFileToProject, openFileInEditor, closeFileFromEditor, createNewFile, deleteFile, loadUserLocalFiles, loadSingleLocalFile, isAiDrawerOpen, setIsAiDrawerOpen, applyDiffToActiveFile: applyDiffToActiveFileRemote, setIsCommandPaletteOpen } = useApp();
  const editorRef = useRef<EditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  const [outputTab, setOutputTab] = useState<OutputTab>("terminal");
  const [runOutput, setRunOutput] = useState("Ready. Run the active file to see output.");
  const [runExitCode, setRunExitCode] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionStartedAt, setExecutionStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cursor, setCursor] = useState<CursorPosition>({ lineNumber: 1, column: 1 });
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const messagesRef = useRef<AiMessage[]>([]);
  const previousFileIdRef = useRef<string>("");
  const [historyCount, setHistoryCount] = useState(0);
  const [contextEnabled, setContextEnabled] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [saveDialogFileId, setSaveDialogFileId] = useState<string | null>(null);
  const [newFilePromptId, setNewFilePromptId] = useState<string | null>(null);
  const [savePromptName, setSavePromptName] = useState("");
  const [savePromptFolder, setSavePromptFolder] = useState("/src/");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [truncatedApply, setTruncatedApply] = useState<{ code: string; language: string } | null>(null);
  const [aiApplyNotice, setAiApplyNotice] = useState<string | null>(null);
  const [unreadableFiles, setUnreadableFiles] = useState<UnreadableFile[]>([]);
  const [unreadableExpanded, setUnreadableExpanded] = useState(false);
  const [unreadableBannerDismissed, setUnreadableBannerDismissed] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [largeFileOverrides, setLargeFileOverrides] = useState<Record<string, boolean>>({});
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const activeFile = openFiles.find((file) => file.id === activeFileId) || openFiles[0];
  const activeContent = activeFile ? fileContents[activeFile.id] || "" : "";
  const filteredFiles = treeFiles.filter((file) => `${file.name} ${file.path}`.toLowerCase().includes(fileSearch.toLowerCase()));
  const recentPaths = useRecentFiles(editorProjectId, activeFile);
  const recentFiles = recentPaths.map((path) => treeFiles.find((file) => file.path === path)).filter((file): file is EditorFile => Boolean(file));
  const isLargeFile = Boolean(activeFile && (activeFile.sizeBytes ?? new TextEncoder().encode(activeContent).length) > LARGE_FILE_LIMIT);
  const isLargeFileBlocked = isLargeFile && !largeFileOverrides[activeFile?.id || ""];
  const usage = useAiUsage(isAiDrawerOpen);
  const usageExhausted = Boolean(usage && usage.used >= usage.limit);
  const { announce: announceProject, liveRegion: projectLiveRegion } = useAnnounce();

  useEffect(() => { if (!editorProjectId && !isOfflineMode) void loadEditorProject(); }, [editorProjectId, isOfflineMode, loadEditorProject]);
  useEffect(() => { if (!isEditorLoading && isEditorProjectOpen) announceProject(`Project loaded. ${treeFiles.length} files available.`); }, [isEditorLoading, isEditorProjectOpen, treeFiles.length, announceProject]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => () => { if (previousFileIdRef.current) localStorage.setItem(`dp-ai-history-${previousFileIdRef.current}`, JSON.stringify(messagesRef.current.slice(-20))); }, []);
  useEffect(() => { const clearContext = () => setContextEnabled(false); window.addEventListener("devpulse-ai-clear-context", clearContext); return () => window.removeEventListener("devpulse-ai-clear-context", clearContext); }, []);
  useEffect(() => {
    const previousFileId = previousFileIdRef.current;
    if (previousFileId && previousFileId !== activeFileId) localStorage.setItem(`dp-ai-history-${previousFileId}`, JSON.stringify(messagesRef.current.slice(-20)));
    previousFileIdRef.current = activeFileId;
    setSelection(editorRef.current?.getSelection() || null); setContextEnabled(true);
    if (!activeFileId) { setMessages([]); setHistoryCount(0); return; }
    try { const stored = JSON.parse(localStorage.getItem(`dp-ai-history-${activeFileId}`) || "[]") as AiMessage[]; setMessages(stored); setHistoryCount(stored.length); } catch { setMessages([]); setHistoryCount(0); }
  }, [activeFileId]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); setIsCommandPaletteOpen(true); return; }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); if (activeFile?.modified) void saveActiveFile(); }
      else if (event.key.toLowerCase() === "p") { event.preventDefault(); setIsFileSearchOpen(true); }
      else if (event.key === "`") { event.preventDefault(); setIsOutputOpen((open) => !open); }
      else if (event.key.toLowerCase() === "i") { event.preventDefault(); setIsAiDrawerOpen((open) => !open); }
      else if (event.key === "/") { event.preventDefault(); editorRef.current?.trigger("keyboard", "editor.action.commentLine", null); }
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  });
  useEffect(() => { const closeMenu = () => setContextMenu(null); window.addEventListener("click", closeMenu); return () => window.removeEventListener("click", closeMenu); }, []);
  useEffect(() => {
    if (!editorProjectId) return;
    const timer = window.setTimeout(() => {
      void fetch(`${API_BASE}/v1/editor/session`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: editorProjectId,
          openFileIds: openFiles.map((file) => file.id),
          activeFileId: activeFileId || undefined,
          cursorPositions: activeFileId ? { [activeFileId]: { line: cursor.lineNumber, col: cursor.column } } : {},
        }),
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [editorProjectId, openFiles, activeFileId, cursor]);

  const saveActiveFile = async () => {
    if (!activeFile?.modified || activeFile.origin === FileOrigin.READONLY) return;
    if (activeFile.origin === FileOrigin.LOCAL) { setSaveDialogFileId(activeFile.id); return; }
    if (activeFile.origin === FileOrigin.NEW) { setSavePromptName(activeFile.name); setSavePromptFolder(activeFile.path.includes("/") ? `${activeFile.path.slice(0, activeFile.path.lastIndexOf("/") + 1)}` : "/"); setNewFilePromptId(activeFile.id); return; }
    setSaveState("saving");
    try { await saveFileContent(activeFile.id); setSaveState("saved"); setRunOutput(`Saved ${activeFile.path} and created a new file revision.`); window.setTimeout(() => setSaveState("idle"), 2000); }
    catch (error) { setSaveState("error"); setRunOutput(error instanceof Error ? error.message : "Save failed"); }
  };
  const promoteFile = async (fileId: string) => { setSaveDialogFileId(null); setSaveState("saving"); try { await saveLocalFileToProject(fileId); setSaveState("saved"); window.setTimeout(() => setSaveState("idle"), 2000); } catch (error) { setSaveState("error"); setRunOutput(error instanceof Error ? error.message : "Save failed"); } };
  const saveNewFile = async () => {
    if (!newFilePromptId || !savePromptName.trim()) return;
    const file = openFiles.find((candidate) => candidate.id === newFilePromptId);
    if (!file) return;
    const nextPath = `${savePromptFolder.replace(/\/$/, "")}/${savePromptName.trim()}`.replace(/^\//, "");
    setNewFilePromptId(null); setSaveState("saving");
    try { await saveLocalFileToProject(file.id, nextPath); setSaveState("saved"); window.setTimeout(() => setSaveState("idle"), 2000); } catch (error) { setSaveState("error"); setRunOutput(error instanceof Error ? error.message : "Save failed"); }
  };
  const setInput = setAiInput;
  const showAiApplyNotice = (message: string) => { setRunOutput(message); setAiApplyNotice(message); window.setTimeout(() => setAiApplyNotice(null), 4000); };
  const applyAiCode = async (message: AiMessage | string, skipCheck = false) => {
    if (!activeFile || activeFile.origin === FileOrigin.READONLY) return;
    const code = typeof message === "string" ? message : message.text;
    const requestBody: AiApplyRequest = { fileId: activeFile.apiFileId || activeFile.id, code, language: activeFile.language || monacoLanguageForFile(activeFile), expectedVersion: activeFile.version, skipCheck };
    setSaveState("saving");
    try {
      const response = await fetch(`${API_BASE}/v1/ai/apply`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
      const body = await response.json() as AiApplyResponse & AiApplyError;
      if (!response.ok) {
        if (response.status === 413 && body.error === "CONTENT_TOO_LARGE") showAiApplyNotice("AI generated too much code to apply safely (>500KB). Try a smaller selection.");
        else if (response.status === 409 && body.error === "VERSION_CONFLICT") { showAiApplyNotice("File changed while AI was responding. Please review and try again."); void loadEditorProject(); }
        else if (response.status === 422 && body.error === "TRUNCATED_CONTENT" && !skipCheck) setTruncatedApply({ code, language: requestBody.language });
        else if (response.status === 422 && body.error === "INVALID_JSON") showAiApplyNotice("AI returned invalid JSON — not applied. Try asking again.");
        else if (response.status === 400 && body.error === "EMPTY_CONTENT") showAiApplyNotice("AI returned empty response — nothing to apply.");
        else showAiApplyNotice(body.message || "AI code could not be applied.");
        setSaveState("error");
        return;
      }
      updateFileContent(activeFile.id, code);
      setTruncatedApply(null);
      setSaveState("saved");
      showAiApplyNotice(`AI code applied and saved ✓ (${body.linesReplaced} lines)`);
      void loadEditorProject();
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch { setSaveState("error"); showAiApplyNotice("AI apply service unavailable — try again"); }
  };
  const applyDiffToActiveFile = applyAiCode;
  useEffect(() => {
    if (!activeFile || activeFile.origin !== FileOrigin.API || !activeFile.modified) return;
    const timer = window.setTimeout(() => void saveActiveFile(), 2000);
    return () => window.clearTimeout(timer);
  }, [activeFile?.id, activeFile?.modified, activeContent]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (openFiles.some((file) => (file.origin === FileOrigin.LOCAL || file.origin === FileOrigin.NEW) && file.modified)) { event.preventDefault(); event.returnValue = "You have unsaved local files. Leave anyway?"; return event.returnValue; } return undefined; };
    window.addEventListener("beforeunload", onBeforeUnload); return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [openFiles]);
  useEffect(() => {
    if (!isRunning || executionStartedAt === null) return;
    const updateElapsed = () => setElapsedMs(Date.now() - executionStartedAt);
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 100);
    return () => window.clearInterval(timer);
  }, [isRunning, executionStartedAt]);
  const handleRun = async () => {
    if (!activeFile || isRunning) return;
    const startedAt = Date.now();
    setExecutionStartedAt(startedAt); setElapsedMs(0); setIsRunning(true); setOutputTab("terminal"); setIsOutputOpen(true); setRunOutput(`$ devpulse run ${activeFile.name}\n\nRunning ${isLargeFileBlocked ? "plaintext" : languageForFile(activeFile)}...`); setRunExitCode(null);
    try {
      const response = await fetch(`${API_BASE}/v1/execute`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: activeFile.id, language: isLargeFileBlocked ? "plaintext" : languageForFile(activeFile), code: activeContent }) });
      const result = await response.json() as { exitCode?: number; stdout?: string; stderr?: string; error?: string; executionId?: string };
      const exitCode = result.exitCode ?? (response.ok ? 0 : 1); setElapsedMs(Date.now() - startedAt); setRunExitCode(exitCode); setRunOutput(`$ devpulse run ${activeFile.name}\n\n${result.stdout || result.stderr || result.error || "Process completed with no output."}`);
    } catch (error) { setElapsedMs(Date.now() - startedAt); setRunExitCode(1); setRunOutput(error instanceof Error ? error.message : "Execution service unavailable"); }
    finally { setIsRunning(false); }
  };
  const recordUnreadableFile = (file: File, path: string, reason: UnreadableFile["reason"]) => { setUnreadableFiles((previous) => [...previous, { name: file.name, path, reason, sizeBytes: file.size, mimeType: file.type || undefined }]); };
  const openImagePreview = (file: File) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setImagePreview({ name: file.name, sizeBytes: file.size, url, width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  };
  const inspectAndReadLocalFile = async (file: File, path: string): Promise<{ name: string; path: string; content: string } | null> => {
    if (file.size > MAX_FILE_SIZE_BYTES) { recordUnreadableFile(file, path, "too_large"); return null; }
    const binary = isBinaryFile(file) || await hasBinaryContent(file);
    if (binary) { recordUnreadableFile(file, path, "binary"); if (isImageFileName(file.name, file.type)) { setImageFiles((previous) => ({ ...previous, [path]: file })); openImagePreview(file); } return null; }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, path, content: String(reader.result || "") });
      reader.onerror = () => { recordUnreadableFile(file, path, "encoding_error"); setAiApplyNotice(`Could not read ${file.name} — unsupported encoding`); resolve(null); };
      reader.onabort = () => { recordUnreadableFile(file, path, "encoding_error"); setAiApplyNotice(`Could not read ${file.name} — unsupported encoding`); resolve(null); };
      try { reader.readAsText(file); } catch { recordUnreadableFile(file, path, "encoding_error"); setAiApplyNotice(`Could not read ${file.name} — unsupported encoding`); resolve(null); }
    });
  };
  const handleNativeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setUnreadableFiles([]); setImageFiles({}); setUnreadableBannerDismissed(false); void inspectAndReadLocalFile(file, file.name).then((loaded) => { if (loaded) void loadSingleLocalFile(loaded.name, loaded.content); }); event.target.value = ""; };
  const handleNativeFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 30); if (!files.length) return; const folderName = files[0]?.webkitRelativePath.split("/")[0] || "Local folder";
    setUnreadableFiles([]); setUnreadableExpanded(false); setUnreadableBannerDismissed(false); setImageFiles({}); setImagePreview(null);
    Promise.all(files.map((file) => inspectAndReadLocalFile(file, file.webkitRelativePath || file.name))).then((loaded) => void loadUserLocalFiles(folderName, loaded.filter((file): file is { name: string; path: string; content: string } => Boolean(file)))); event.target.value = "";
  };
  const clearAiHistory = () => { if (!activeFileId) return; localStorage.removeItem(`dp-ai-history-${activeFileId}`); setMessages([]); setHistoryCount(0); };
  const getSurroundingCode = () => activeContent.split("\n").slice(Math.max(0, cursor.lineNumber - 21), cursor.lineNumber + 20).join("\n");
  const streamAiResponse = async (prompt: string, command?: AiCommand, messageSelection?: SelectionSnapshot | null) => {
    aiAbortRef.current?.abort(); const controller = new AbortController(); aiAbortRef.current = controller; const assistantId = `assistant-${Date.now()}`;
    setMessages((previous) => [...previous, { id: assistantId, role: "assistant", text: "", streaming: true, fileId: activeFile?.id, command, selection: messageSelection || undefined }]); setIsStreaming(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ai/chat`, { method: "POST", credentials: "include", signal: controller.signal, headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ projectId: editorProjectId, fileId: activeFile?.id, command, context: { projectName: loadedProjectName, selectedCode: contextEnabled ? messageSelection?.selectedText || "" : "", fileName: contextEnabled ? activeFile?.name : undefined, language: contextEnabled ? activeFile?.language : undefined, surroundingCode: contextEnabled ? getSurroundingCode() : "" }, messages: [{ role: "user", content: prompt }] }) });
      if (!response.ok) throw new Error((await response.text()) || "AI request failed");
      if ((response.headers.get("content-type") || "").includes("text/event-stream") && response.body) {
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (true) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || ""; const text = lines.map(parseSseLine).join(""); if (text) setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, text: message.text + text } : message)); }
      } else {
        const result = await response.json() as { content?: { type: string; text?: string }[] }; const text = result.content?.filter((item) => item.type === "text").map((item) => item.text || "").join("\n") || "The AI returned no text.";
        setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, text } : message));
      }
    } catch (error) { if ((error as Error).name !== "AbortError") setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, text: error instanceof Error ? `AI error: ${error.message}` : "AI request failed" } : message)); }
    finally { setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, streaming: false } : message)); setIsStreaming(false); }
  };
  const sendAi = (event: React.FormEvent) => { event.preventDefault(); const rawPrompt = aiInput.trim(); if (!rawPrompt || isStreaming || isLargeFileBlocked || usageExhausted) return; const commandMatch = AI_COMMANDS.find((command) => rawPrompt.startsWith(command.value)); const prompt = commandMatch ? rawPrompt.slice(commandMatch.value.length).trim() : rawPrompt; const messageSelection = selection; if (commandMatch?.requiresSelection && !messageSelection?.selectedText) setRunOutput("Tip: Select some code first for more precise results"); const message: AiMessage = { id: `user-${Date.now()}`, role: "user", text: prompt, command: commandMatch?.value, fileId: activeFile?.id, selection: messageSelection || undefined }; setMessages((previous) => [...previous, message]); setAiInput(""); void streamAiResponse(prompt, commandMatch?.value, messageSelection); };
  const copyMessage = async (message: AiMessage) => { await navigator.clipboard.writeText(extractCode(message.text)); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1400); };
  const handleContextAction = async (action: "new" | "rename" | "delete" | "copy", file: EditorFile) => {
    setContextMenu(null);
    if (action === "new") setIsCreatingFile(true);
    else if (action === "copy") await navigator.clipboard.writeText(file.path);
    else if (action === "delete") { if (window.confirm(`Delete ${file.path}?`)) await deleteFile(file.id); }
    else { const nextPath = window.prompt("Rename file", file.path); if (nextPath && nextPath !== file.path) { await fetch(`${API_BASE}/v1/files/${file.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: nextPath }) }); await loadEditorProject(); } }
  };
  const createFile = async (event: React.FormEvent) => { event.preventDefault(); if (!newFileName.trim()) return; await createNewFile(newFileName.trim(), newFileName.trim(), ""); setNewFileName(""); setIsCreatingFile(false); };
  const fileTree = useMemo(() => {
    const roots: Array<{ kind: "folder" | "file"; label: string; path: string; file?: EditorFile; children?: EditorFile[] }> = []; const folders = new Map<string, EditorFile[]>();
    filteredFiles.forEach((file) => { const parts = file.path.split(/[\\/]/); if (parts.length === 1) roots.push({ kind: "file", label: file.name, path: file.path, file }); else { const folder = parts.slice(0, -1).join("/"); folders.set(folder, [...(folders.get(folder) || []), file]); } });
    folders.forEach((children, path) => roots.push({ kind: "folder", label: path.split(/[\\/]/).pop() || path, path, children })); return roots.sort((left, right) => left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label));
  }, [filteredFiles]);
  const closeImagePreview = () => { if (imagePreview) URL.revokeObjectURL(imagePreview.url); setImagePreview(null); };

  if (isEditorLoading || (!isEditorProjectOpen && !editorError && !isOfflineMode)) return <ProjectLoadingSkeleton />;
  if (editorError && !isEditorProjectOpen) return <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#0A0A0F]"><APIErrorState message={editorError} onRetry={() => void loadEditorProject()} onWorkOffline={() => { setIsOfflineMode(true); setIsEditorProjectOpen(true); }} /></div>;

  if (!isEditorProjectOpen) return <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#08080d] p-6 text-[#d6d6e6]"><div className="w-full max-w-xl border border-[#28243c] bg-[#101017] p-8 shadow-2xl"><div className="mb-7 flex items-center gap-4 border-b border-[#252238] pb-6"><div className="flex h-12 w-12 items-center justify-center bg-[#7C3AED] text-white"><Sparkles /></div><div><h1 className="text-2xl font-bold text-white">Devpulse Editor</h1><p className="mt-1 text-xs text-slate-400">Open a project, local file, or folder to begin.</p></div></div>{editorError && <p className="mb-4 text-xs text-red-400">{editorError}</p>}{isEditorLoading && <p className="mb-4 text-xs text-cyan-400">Loading project...</p>}<div className="grid gap-2 sm:grid-cols-3"><button onClick={() => folderInputRef.current?.click()} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><FolderOpen className="text-cyan-400" />Folder</button><button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><File className="text-purple-400" />File</button><button onClick={() => setIsCreatingFile(true)} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><FilePlus className="text-amber-400" />New file</button></div>{isCreatingFile && <form onSubmit={createFile} className="mt-5 flex gap-2"><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="src/index.ts" className="min-w-0 flex-1 border border-[#332b50] bg-[#0d0d16] px-3 py-2 text-xs text-white" /><button className="bg-[#7C3AED] px-4 text-xs font-bold text-white">Create</button></form>}<input ref={fileInputRef} type="file" className="hidden" onChange={handleNativeFileSelect} /><input ref={folderInputRef} type="file" className="hidden" multiple onChange={handleNativeFolderSelect} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} /></div></div>;

  return <div aria-busy="false" className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden bg-[#0A0A0F] font-mono text-xs text-slate-300">
    <input ref={fileInputRef} type="file" className="hidden" onChange={handleNativeFileSelect} /><input ref={folderInputRef} type="file" className="hidden" multiple onChange={handleNativeFolderSelect} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} />
    <div role="tablist" aria-label="Open files" className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-[#28243c] bg-[#11111a]">{openFiles.length === 0 ? <div className="flex items-center px-4 text-slate-600">No files open</div> : openFiles.map((file, index) => <button role="tab" aria-selected={file.id === activeFileId} tabIndex={file.id === activeFileId ? 0 : -1} key={file.id} onKeyDown={(event) => { if (event.ctrlKey && event.key === "Tab") { event.preventDefault(); const direction = event.shiftKey ? -1 : 1; const nextFile = openFiles[(index + direction + openFiles.length) % openFiles.length]; if (nextFile) setActiveFileId(nextFile.id); } }} onClick={() => setActiveFileId(file.id)} onMouseDown={(event) => { if (event.button === 1) { event.preventDefault(); closeFileFromEditor(file.id); } }} className={`group flex min-w-[128px] max-w-[240px] items-center gap-2 border-r border-[#28243c] px-3 text-left ${file.id === activeFileId ? "border-t-2 border-t-[#7C3AED] bg-[#0A0A0F] text-white" : "text-slate-500 hover:bg-[#1a1a2e]"}`}><FileTypeIcon file={file} className="h-3.5 w-3.5 shrink-0" />{file.id === activeFileId && saveState === "saving" ? <LoaderCircle className="h-3 w-3 shrink-0 animate-spin text-purple-300" /> : file.modified && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a78bfa]" />}<span className="truncate">{file.name}</span><OriginBadge origin={file.origin} /><span onClick={(event) => { event.stopPropagation(); closeFileFromEditor(file.id); }} className="ml-auto hidden group-hover:block"><X className="h-3.5 w-3.5" /></span></button>)}</div>
    <div className="flex min-h-0 flex-1"><aside className="flex w-[208px] shrink-0 flex-col border-r border-[#28243c] bg-[#11111a]"><div className="flex h-9 items-center justify-between border-b border-[#28243c] px-3 text-[10px] font-bold tracking-widest text-slate-400"><span>EXPLORER</span><div className="flex gap-1"><button title="New file" onClick={() => setIsCreatingFile(true)}><FilePlus className="h-3.5 w-3.5" /></button><button title="New folder"><FolderPlus className="h-3.5 w-3.5" /></button><button title="Refresh" onClick={() => void loadEditorProject()}><RefreshCw className="h-3.5 w-3.5" /></button></div></div><div className="flex items-center gap-2 border-b border-[#28243c] px-3 py-2 text-[11px] font-bold text-white"><ChevronDown className="h-3 w-3" /><FolderOpen className="h-3.5 w-3.5 text-cyan-400" /><span className="truncate">{loadedProjectName || "PROJECT"}</span></div><div role="tree" aria-label="Project files" className="flex-1 overflow-y-auto py-1">{fileTree.map((item) => item.kind === "folder" ? <div key={item.path}><button role="treeitem" aria-expanded={Boolean(expandedFolders[item.path])} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setExpandedFolders((previous) => ({ ...previous, [item.path]: event.key === "ArrowRight" ? true : event.key === "ArrowLeft" ? false : !previous[item.path] })); } }} onClick={() => setExpandedFolders((previous) => ({ ...previous, [item.path]: !previous[item.path] }))} className="flex w-full items-center gap-1 px-2 py-1 text-left text-slate-400">{expandedFolders[item.path] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}<Folder className="h-4 w-4 text-amber-300" /><span>{item.label}</span></button>{expandedFolders[item.path] && item.children?.map((file) => <FileRow key={file.id} file={file} active={file.id === activeFileId} onOpen={() => openFileInEditor(file)} onMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, file }); }} />)}</div> : item.file ? <FileRow key={item.file.id} file={item.file} active={item.file.id === activeFileId} onOpen={() => openFileInEditor(item.file!)} onMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, file: item.file! }); }} /> : null)}{unreadableFiles.map((file) => { const previewFile = imageFiles[file.path]; return <UnreadableFileRow key={`unreadable-${file.path}`} file={file} onPreview={previewFile ? () => openImagePreview(previewFile) : undefined} />; })}{!treeFiles.length && !unreadableFiles.length && <div className="px-3 py-6 text-center text-[10px] text-slate-600">No files in project</div>}</div></aside>
      <main className="flex min-w-0 flex-1 flex-col"><div className="flex min-h-0 flex-1 flex-col"><div className="flex min-h-0 flex-1"><div className="min-w-0 flex-1">{activeFile ? <MonacoEditor height="100%" language={monacoLanguageForFile(activeFile, isLargeFile)} theme="devpulse-dark" value={activeContent} onMount={(editor, monaco) => { const readSelection = (): SelectionSnapshot | null => { const current = editor.getSelection(); if (!current) return null; return { startLineNumber: current.startLineNumber, startColumn: current.startColumn, endLineNumber: current.endLineNumber, endColumn: current.endColumn, selectedText: editor.getModel()?.getValueInRange(current) || "" }; }; editorRef.current = { trigger: editor.trigger.bind(editor), getSelection: readSelection }; monaco.editor.defineTheme("devpulse-dark", DEVPULSE_MONACO_THEME); monaco.editor.setTheme("devpulse-dark"); editor.onDidChangeCursorPosition((event) => { setCursor(event.position); setSelection(readSelection()); }); editor.onDidChangeCursorSelection(() => setSelection(readSelection())); }} onChange={(value) => { if (activeFile.origin !== FileOrigin.READONLY) updateFileContent(activeFile.id, value || ""); }} options={{ minimap: { enabled: true }, lineNumbers: "on", wordWrap: "off", tabSize: 2, bracketPairColorization: { enabled: true }, smoothScrolling: true, cursorSmoothCaretAnimation: "on", fontFamily: "JetBrains Mono", fontSize: 13, fontLigatures: true, padding: { top: 12, bottom: 12 }, automaticLayout: true, readOnly: activeFile.origin === FileOrigin.READONLY }} /> : <div className="flex h-full items-center justify-center text-slate-600">Select a file from the explorer to begin.</div>}</div>{isAiDrawerOpen && <AiPanel messages={messages} input={aiInput} setInput={setInput} onSubmit={sendAi} onClose={() => setIsAiDrawerOpen(false)} onCopy={copyMessage} copiedId={copiedId} onApply={(message) => void applyDiffToActiveFile(extractCode(message.text))} activeFile={activeFile} activeContent={activeContent} cursor={cursor} selection={selection} isStreaming={isStreaming} usage={usage} usageExhausted={usageExhausted} onClearHistory={clearAiHistory} historyCount={historyCount} />}</div>{isOutputOpen && <OutputPanel outputTab={outputTab} setOutputTab={setOutputTab} runOutput={runOutput} runExitCode={runExitCode} isRunning={isRunning} elapsedMs={elapsedMs} onRun={() => void handleRun()} onClear={() => { setRunOutput("Ready. Run the active file to see output."); setRunExitCode(null); }} />}</div></main></div>
    <div className="flex h-7 shrink-0 items-center justify-between bg-[#4C1D95] px-3 text-[10px] text-white"><div className="flex items-center gap-4"><span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />main</span><span className="flex items-center gap-1 text-red-300"><CircleX className="h-3 w-3" />0</span><span className="flex items-center gap-1 text-amber-200"><CircleAlert className="h-3 w-3" />0</span></div><div className="flex items-center gap-4"><span>{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Save failed" : ""}</span>{activeFile?.origin === FileOrigin.LOCAL && <span className="flex items-center gap-1 text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />local file</span>}{activeFile?.origin === FileOrigin.NEW && <span className="flex items-center gap-1 text-purple-200"><span className="h-1.5 w-1.5 rounded-full bg-purple-300" />not saved to project</span>}<span title={`Current file language: ${activeFile ? languageLabel(monacoLanguageForFile(activeFile)) : "Plain Text"}`}>{activeFile ? monacoLanguageForFile(activeFile) : "Plain Text"}</span><span>UTF-8</span><span>Ln {cursor.lineNumber}, Col {cursor.column}</span><span>Spaces: 2</span><button title="Toggle AI assistant" onClick={() => setIsAiDrawerOpen((open) => !open)} className="text-cyan-300"><Zap className="mr-1 inline h-3 w-3" />Devpulse AI</button><button title="Toggle terminal panel" onClick={() => setIsOutputOpen((open) => !open)}><Terminal className="mr-1 inline h-3 w-3" />Terminal</button></div></div>
    {contextMenu && <div style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()} className="fixed z-50 w-44 border border-[#332b50] bg-[#161624] py-1 text-[11px] shadow-2xl"><button onClick={() => void handleContextAction("new", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><FilePlus className="h-3.5 w-3.5" />New File</button><button onClick={() => void handleContextAction("rename", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><Settings2 className="h-3.5 w-3.5" />Rename</button><button onClick={() => void handleContextAction("copy", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><Copy className="h-3.5 w-3.5" />Copy Path</button><button onClick={() => void handleContextAction("delete", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left text-red-300"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}
    {isFileSearchOpen && <div className="fixed inset-0 z-40 bg-black/60 p-20" onClick={() => setIsFileSearchOpen(false)}><div className="mx-auto max-w-lg border border-[#44346d] bg-[#161624]" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-[#332b50] px-3 py-3"><Search className="h-4 w-4 text-purple-300" /><input autoFocus value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Search files..." className="flex-1 bg-transparent text-sm text-white outline-none" /></div><div className="max-h-72 overflow-y-auto p-1">{filteredFiles.map((file) => <button key={file.id} onClick={() => { openFileInEditor(file); setIsFileSearchOpen(false); setFileSearch(""); }} className="flex w-full gap-2 px-3 py-2 text-left"><FileTypeIcon file={file} /><span className="text-white">{file.name}</span><span className="ml-auto text-[10px] text-slate-500">{file.path}</span></button>)}</div></div></div>}
    {isCreatingFile && <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 p-24"><form onSubmit={createFile} className="w-full max-w-md border border-[#44346d] bg-[#161624] p-4"><div className="mb-3 text-sm font-bold text-white">Create file</div><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="src/index.ts" className="mb-3 w-full border border-[#332b50] bg-[#0d0d16] px-3 py-2 text-xs text-white" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCreatingFile(false)} className="px-3 py-2 text-xs text-slate-400">Cancel</button><button className="bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white">Create</button></div></form></div>}
    {saveDialogFileId && <LocalSaveDialog onSave={() => void promoteFile(saveDialogFileId)} onKeep={() => setSaveDialogFileId(null)} onCancel={() => setSaveDialogFileId(null)} />}
    {newFilePromptId && <div className="fixed inset-x-0 top-16 z-40"><NewFilePrompt name={savePromptName} folder={savePromptFolder} setName={setSavePromptName} setFolder={setSavePromptFolder} onSave={() => void saveNewFile()} onCancel={() => setNewFilePromptId(null)} /></div>}
    {!treeFiles.length && !unreadableFiles.length && <div className="fixed bottom-7 left-[208px] right-0 top-[6.5rem] z-30 bg-[#0A0A0F]"><EmptyProjectState onNewFile={() => setIsCreatingFile(true)} onUpload={() => fileInputRef.current?.click()} onOpenFolder={() => folderInputRef.current?.click()} /></div>}
    {treeFiles.length > 0 && openFiles.length === 0 && <div className="fixed bottom-7 left-[208px] right-0 top-[6.5rem] z-30 bg-[#0A0A0F]"><NoActiveFileState recentFiles={recentFiles} onOpen={openFileInEditor} onNewFile={() => setIsCreatingFile(true)} onSearch={() => setIsFileSearchOpen(true)} onOpenFile={() => fileInputRef.current?.click()} onAskAi={() => setIsAiDrawerOpen(true)} /></div>}
    {isLargeFile && !largeFileOverrides[activeFile?.id || ""] && activeFile && <div className="fixed left-[208px] right-0 top-[6.5rem] z-40"><LargeFileWarning fileName={activeFile.name} sizeBytes={activeFile.sizeBytes ?? new TextEncoder().encode(activeContent).length} onOpen={() => setLargeFileOverrides((previous) => ({ ...previous, [activeFile.id]: true }))} onClose={() => closeFileFromEditor(activeFile.id)} /></div>}
    {truncatedApply && <div role="dialog" aria-modal="true" aria-labelledby="truncated-ai-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"><div className="w-full max-w-md border border-amber-400/40 bg-[#161624] p-5 shadow-2xl"><h2 id="truncated-ai-title" className="text-sm font-bold text-amber-200">AI Response May Be Incomplete</h2><p className="mt-3 text-xs leading-5 text-slate-300">The AI code appears to be cut off (unmatched braces detected).</p><div className="mt-5 flex justify-end gap-2 text-xs"><button onClick={() => setTruncatedApply(null)} className="px-3 py-2 text-slate-400">Cancel</button><button onClick={() => void applyAiCode(truncatedApply.code, true)} className="bg-amber-500/20 px-3 py-2 text-amber-100">Apply Anyway</button></div></div></div>}
    {aiApplyNotice && <div role="alert" className="fixed bottom-10 right-4 z-50 border border-cyan-300/40 bg-[#161624] px-4 py-2 text-xs text-cyan-100 shadow-lg">{aiApplyNotice}</div>}
    {saveState === "error" && <button onClick={() => void saveActiveFile()} className="fixed bottom-7 right-4 z-50 border border-red-300/40 bg-[#4C1D95] px-3 py-1 text-[10px] text-white">Retry save</button>}
    {unreadableFiles.length > 0 && !unreadableBannerDismissed && <div className="fixed left-[208px] right-0 top-10 z-40 border-b border-cyan-400/30 bg-[#11111a] px-4 py-2 text-xs text-slate-300"><div className="flex items-center gap-3"><span>ⓘ {unreadableFiles.length} files skipped (binary or too large)</span><span className="text-[10px] text-slate-500">Images, binaries, and archives cannot be opened in the editor.</span><button onClick={() => setUnreadableExpanded((expanded) => !expanded)} className="ml-auto text-cyan-300">See list {unreadableExpanded ? "▲" : "▼"}</button><button aria-label="Dismiss skipped files banner" onClick={() => setUnreadableBannerDismissed(true)} className="text-slate-500">×</button></div>{unreadableExpanded && <div className="mt-2 space-y-1 border-t border-[#28243c] pt-2">{unreadableFiles.map((file) => <div key={file.path} className="flex justify-between text-[10px] text-slate-400"><span>{file.path}</span><span>{file.reason} • {formatFileSize(file.sizeBytes || 0)}</span></div>)}</div>}</div>}
    {imagePreview && <div className="fixed bottom-7 left-[208px] right-0 top-10 z-[45] bg-[#0A0A0F]"><ImagePreviewTab {...imagePreview} onClose={closeImagePreview} /></div>}
    {saveState === "error" && <div role="alert" className="fixed right-4 top-4 z-50 border border-red-400/40 bg-red-950 px-4 py-2 text-xs text-red-100 shadow-lg">Save failed</div>}{projectLiveRegion}
  </div>;
};
