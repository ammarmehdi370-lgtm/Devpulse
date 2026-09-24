"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Braces, Check, ChevronDown, ChevronRight, CircleAlert, CircleDot,
  CircleX, Copy, File, FileCode, FilePlus, FileText, Folder,
  FolderOpen, FolderPlus, Globe, GitBranch, Play, RefreshCw, Search,
  Palette, Send, Settings2, Sparkles, Terminal, Trash2, X, Zap,
} from "lucide-react";
import { EditorFile, useApp } from "../context/AppContext";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AiMessage = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };
type OutputTab = "terminal" | "output" | "problems";
type ContextMenu = { x: number; y: number; file: EditorFile } | null;
type CursorPosition = { lineNumber: number; column: number };
type EditorHandle = { trigger: (source: string, action: string, payload: unknown) => void };

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

const monacoLanguageForFile = (file?: EditorFile) => {
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
  <button onClick={onOpen} onContextMenu={onMenu} className={`group flex w-full items-center gap-2 border-l-2 px-3 py-1 text-left ${active ? "border-l-[#7C3AED] bg-[#1a1a2e] text-white" : "border-l-transparent text-slate-400 hover:bg-[#1a1a2e]"}`}>
    <FileTypeIcon file={file} /> <span className="truncate">{file.name}</span>
    {file.isDirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
  </button>
);

const AiPanel: React.FC<{
  messages: AiMessage[]; input: string; setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void; onClose: () => void;
  onCopy: (message: AiMessage) => void; copiedId: string | null;
  onApply: (message: AiMessage) => void; activeFile?: EditorFile; isStreaming: boolean;
}> = ({ messages, input, setInput, onSubmit, onClose, onCopy, copiedId, onApply, activeFile, isStreaming }) => (
  <aside className="flex w-[320px] shrink-0 flex-col border-l border-[#28243c] bg-[#11111a]">
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#28243c] px-3">
      <Zap className={`h-4 w-4 text-purple-400 ${isStreaming ? "animate-pulse" : ""}`} />
      <span className="font-bold text-white">Devpulse AI</span>
      <span className="ml-auto border border-purple-400/30 bg-purple-400/10 px-1.5 py-0.5 text-[9px] text-purple-200">claude-sonnet-4-6</span>
      <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {messages.map((message) => (
        <div key={message.id} className={message.role === "user" ? "ml-6" : "mr-2 border-l-2 border-purple-500 pl-2"}>
          <div className={message.role === "user" ? "bg-[#5B21B6] p-2 text-white" : "bg-[#191923] p-2 text-slate-300"}>
            <div className="whitespace-pre-wrap text-[11px] leading-5">{message.text || (message.streaming ? "Thinking..." : "")}{message.streaming && <span className="ml-1 animate-pulse text-purple-300">▌</span>}</div>
            {message.role === "assistant" && message.text && !message.streaming && (
              <div className="mt-2 border border-[#28243c] bg-[#0d0d16] p-2">
                <div className="mb-1 flex items-center justify-between text-[9px] text-slate-500"><span>{extractCodeLanguage(message.text).toUpperCase()}</span><button onClick={() => onCopy(message)}>{copiedId === message.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}</button></div>
                <button onClick={() => onApply(message)} className="mt-2 w-full bg-cyan-400/15 px-2 py-1.5 text-[10px] font-bold text-cyan-300">Apply to editor</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    <div className="border-t border-[#28243c] p-3">
      <div className="mb-2 text-[10px] text-slate-500">Analyzing: <span className="text-cyan-300">{activeFile?.name || "no file"}</span></div>
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="Ask Devpulse AI... /fix" className="min-w-0 flex-1 resize-none border border-[#332b50] bg-[#0d0d16] p-2 text-[11px] text-white outline-none" />
        <button disabled={isStreaming} className="bg-[#7C3AED] p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
      <div className="mt-2 text-[9px] text-slate-600">/fix /explain /test /comment /refactor</div>
    </div>
  </aside>
);

const OutputPanel: React.FC<{
  outputTab: OutputTab; setOutputTab: (tab: OutputTab) => void; runOutput: string;
  runExitCode: number | null; isRunning: boolean; onRun: () => void; onClear: () => void;
}> = ({ outputTab, setOutputTab, runOutput, runExitCode, isRunning, onRun, onClear }) => (
  <section className="flex h-[176px] shrink-0 flex-col border-t border-[#28243c] bg-[#0d0d16]">
    <div className="flex h-9 shrink-0 items-center border-b border-[#28243c] px-3">
      <div className="flex h-full items-center gap-4">{(["terminal", "output", "problems"] as OutputTab[]).map((tab) => <button key={tab} onClick={() => setOutputTab(tab)} className={`h-full text-[10px] font-bold tracking-wider ${outputTab === tab ? "border-b-2 border-purple-400 text-white" : "text-slate-500"}`}>{tab.toUpperCase()}</button>)}</div>
      <div className="ml-auto flex items-center gap-3"><button onClick={onRun} className="flex items-center gap-1 text-[10px] text-cyan-300"><Play className="h-3 w-3" />{isRunning ? "Running" : "Run"}</button><button onClick={onClear} className="text-[10px] text-slate-500">Clear</button></div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-3 text-[11px] leading-5">
      {outputTab === "problems" ? <div className="flex items-center gap-2 text-slate-600"><CircleDot className="h-3.5 w-3.5" />No problems detected</div> : outputTab === "output" ? <div className="text-slate-500">Build and diagnostic output will appear here.</div> : <div className={runExitCode !== null && runExitCode !== 0 ? "text-red-300" : "text-green-300"}><div className="mb-1 flex items-center gap-2 text-[10px]">{runExitCode === null ? <CircleDot className="h-3 w-3 text-slate-500" /> : runExitCode === 0 ? <Check className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}<span>Exit code: {runExitCode ?? "running"}</span></div><pre className="whitespace-pre-wrap"><span className="text-purple-400">$</span> <span className="text-cyan-300">devpulse terminal</span>{"\n"}{runOutput}{isRunning && <span className="animate-pulse text-cyan-300"> ▌</span>}</pre></div>}
    </div>
  </section>
);

export const EditorWorkbench: React.FC = () => {
  const { isEditorProjectOpen, editorProjectId, isEditorLoading, editorError, loadEditorProject, loadedProjectName, treeFiles, openFiles, activeFileId, setActiveFileId, fileContents, updateFileContent, saveFileContent, openFileInEditor, closeFileFromEditor, createNewFile, deleteFile, loadUserLocalFiles, loadSingleLocalFile, isAiDrawerOpen, setIsAiDrawerOpen, applyDiffToActiveFile, setIsCommandPaletteOpen } = useApp();
  const editorRef = useRef<EditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  const [outputTab, setOutputTab] = useState<OutputTab>("terminal");
  const [runOutput, setRunOutput] = useState("Ready. Run the active file to see output.");
  const [runExitCode, setRunExitCode] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cursor, setCursor] = useState<CursorPosition>({ lineNumber: 1, column: 1 });
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const activeFile = openFiles.find((file) => file.id === activeFileId) || openFiles[0];
  const activeContent = activeFile ? fileContents[activeFile.id] || "" : "";
  const filteredFiles = treeFiles.filter((file) => `${file.name} ${file.path}`.toLowerCase().includes(fileSearch.toLowerCase()));

  useEffect(() => { if (!editorProjectId) void loadEditorProject(); }, [editorProjectId, loadEditorProject]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); setIsCommandPaletteOpen(true); return; }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); if (activeFile?.isDirty) void saveActiveFile(); }
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
    if (!activeFile?.isDirty) return;
    try { await saveFileContent(activeFile.id); setRunOutput(`Saved ${activeFile.path} and created a new file revision.`); }
    catch (error) { setRunOutput(error instanceof Error ? error.message : "Unable to save file"); }
  };
  const handleRun = async () => {
    if (!activeFile) return;
    setIsRunning(true); setOutputTab("terminal"); setIsOutputOpen(true); setRunOutput(`$ devpulse run ${activeFile.name}\n\nRunning...`); setRunExitCode(null);
    try {
      const response = await fetch(`${API_BASE}/v1/execute`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: activeFile.id, language: languageForFile(activeFile), code: activeContent }) });
      const result = await response.json() as { exitCode?: number; stdout?: string; stderr?: string; error?: string; executionId?: string };
      const exitCode = result.exitCode ?? (response.ok ? 0 : 1); setRunExitCode(exitCode); setRunOutput(`$ devpulse run ${activeFile.name}\n\n${result.stdout || result.stderr || result.error || "Process completed with no output."}`);
    } catch (error) { setRunExitCode(1); setRunOutput(error instanceof Error ? error.message : "Execution service unavailable"); }
    finally { setIsRunning(false); }
  };
  const handleNativeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => void loadSingleLocalFile(file.name, String(reader.result || "")); reader.readAsText(file); event.target.value = ""; };
  const handleNativeFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 30); if (!files.length) return; const folderName = files[0]?.webkitRelativePath.split("/")[0] || "Local folder";
    Promise.all(files.map((file) => new Promise<{ name: string; path: string; content: string }>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, path: file.webkitRelativePath || file.name, content: String(reader.result || "") }); reader.readAsText(file); }))).then((loaded) => void loadUserLocalFiles(folderName, loaded)); event.target.value = "";
  };
  const streamAiResponse = async (prompt: string) => {
    aiAbortRef.current?.abort(); const controller = new AbortController(); aiAbortRef.current = controller; const assistantId = `assistant-${Date.now()}`;
    setMessages((previous) => [...previous, { id: assistantId, role: "assistant", text: "", streaming: true }]); setIsStreaming(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ai/chat`, { method: "POST", credentials: "include", signal: controller.signal, headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ projectId: editorProjectId, fileId: activeFile?.id, context: { projectName: loadedProjectName, fileName: activeFile?.path, language: activeFile?.language }, messages: [{ role: "user", content: prompt }] }) });
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
  const sendAi = (event: React.FormEvent) => { event.preventDefault(); const prompt = aiInput.trim(); if (!prompt || isStreaming) return; setMessages((previous) => [...previous, { id: `user-${Date.now()}`, role: "user", text: prompt }]); setAiInput(""); void streamAiResponse(prompt); };
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

  if (!isEditorProjectOpen) return <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#08080d] p-6 text-[#d6d6e6]"><div className="w-full max-w-xl border border-[#28243c] bg-[#101017] p-8 shadow-2xl"><div className="mb-7 flex items-center gap-4 border-b border-[#252238] pb-6"><div className="flex h-12 w-12 items-center justify-center bg-[#7C3AED] text-white"><Sparkles /></div><div><h1 className="text-2xl font-bold text-white">Devpulse Editor</h1><p className="mt-1 text-xs text-slate-400">Open a project, local file, or folder to begin.</p></div></div>{editorError && <p className="mb-4 text-xs text-red-400">{editorError}</p>}{isEditorLoading && <p className="mb-4 text-xs text-cyan-400">Loading project...</p>}<div className="grid gap-2 sm:grid-cols-3"><button onClick={() => folderInputRef.current?.click()} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><FolderOpen className="text-cyan-400" />Folder</button><button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><File className="text-purple-400" />File</button><button onClick={() => setIsCreatingFile(true)} className="flex flex-col items-center gap-2 border border-[#2b2940] bg-[#171522] p-4 text-xs"><FilePlus className="text-amber-400" />New file</button></div>{isCreatingFile && <form onSubmit={createFile} className="mt-5 flex gap-2"><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="src/index.ts" className="min-w-0 flex-1 border border-[#332b50] bg-[#0d0d16] px-3 py-2 text-xs text-white" /><button className="bg-[#7C3AED] px-4 text-xs font-bold text-white">Create</button></form>}<input ref={fileInputRef} type="file" className="hidden" onChange={handleNativeFileSelect} /><input ref={folderInputRef} type="file" className="hidden" multiple onChange={handleNativeFolderSelect} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} /></div></div>;

  return <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden bg-[#0A0A0F] font-mono text-xs text-slate-300">
    <input ref={fileInputRef} type="file" className="hidden" onChange={handleNativeFileSelect} /><input ref={folderInputRef} type="file" className="hidden" multiple onChange={handleNativeFolderSelect} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} />
    <div className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-[#28243c] bg-[#11111a]">{openFiles.length === 0 ? <div className="flex items-center px-4 text-slate-600">No files open</div> : openFiles.map((file) => <button key={file.id} onClick={() => setActiveFileId(file.id)} onMouseDown={(event) => { if (event.button === 1) { event.preventDefault(); closeFileFromEditor(file.id); } }} className={`group flex min-w-[128px] max-w-[220px] items-center gap-2 border-r border-[#28243c] px-3 text-left ${file.id === activeFileId ? "border-t-2 border-t-[#7C3AED] bg-[#0A0A0F] text-white" : "text-slate-500 hover:bg-[#1a1a2e]"}`}><FileTypeIcon file={file} className="h-3.5 w-3.5 shrink-0" />{file.isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a78bfa]" />}<span className="truncate">{file.name}</span><span onClick={(event) => { event.stopPropagation(); closeFileFromEditor(file.id); }} className="ml-auto hidden group-hover:block"><X className="h-3.5 w-3.5" /></span></button>)}</div>
    <div className="flex min-h-0 flex-1"><aside className="flex w-[208px] shrink-0 flex-col border-r border-[#28243c] bg-[#11111a]"><div className="flex h-9 items-center justify-between border-b border-[#28243c] px-3 text-[10px] font-bold tracking-widest text-slate-400"><span>EXPLORER</span><div className="flex gap-1"><button title="New file" onClick={() => setIsCreatingFile(true)}><FilePlus className="h-3.5 w-3.5" /></button><button title="New folder"><FolderPlus className="h-3.5 w-3.5" /></button><button title="Refresh" onClick={() => void loadEditorProject()}><RefreshCw className="h-3.5 w-3.5" /></button></div></div><div className="flex items-center gap-2 border-b border-[#28243c] px-3 py-2 text-[11px] font-bold text-white"><ChevronDown className="h-3 w-3" /><FolderOpen className="h-3.5 w-3.5 text-cyan-400" /><span className="truncate">{loadedProjectName || "PROJECT"}</span></div><div className="flex-1 overflow-y-auto py-1">{fileTree.map((item) => item.kind === "folder" ? <div key={item.path}><button onClick={() => setExpandedFolders((previous) => ({ ...previous, [item.path]: !previous[item.path] }))} className="flex w-full items-center gap-1 px-2 py-1 text-left text-slate-400">{expandedFolders[item.path] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}<Folder className="h-4 w-4 text-amber-300" /><span>{item.label}</span></button>{expandedFolders[item.path] && item.children?.map((file) => <FileRow key={file.id} file={file} active={file.id === activeFileId} onOpen={() => openFileInEditor(file)} onMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, file }); }} />)}</div> : item.file ? <FileRow key={item.file.id} file={item.file} active={item.file.id === activeFileId} onOpen={() => openFileInEditor(item.file!)} onMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, file: item.file! }); }} /> : null)}{!treeFiles.length && <div className="px-3 py-6 text-center text-[10px] text-slate-600">No files in project</div>}</div></aside>
      <main className="flex min-w-0 flex-1 flex-col"><div className="flex min-h-0 flex-1 flex-col"><div className="flex min-h-0 flex-1"><div className="min-w-0 flex-1">{activeFile ? <MonacoEditor height="100%" language={monacoLanguageForFile(activeFile)} theme="devpulse-dark" value={activeContent} onMount={(editor, monaco) => { editorRef.current = editor; monaco.editor.defineTheme("devpulse-dark", DEVPULSE_MONACO_THEME); monaco.editor.setTheme("devpulse-dark"); editor.onDidChangeCursorPosition((event) => setCursor(event.position)); }} onChange={(value) => updateFileContent(activeFile.id, value || "")} options={{ minimap: { enabled: true }, lineNumbers: "on", wordWrap: "off", tabSize: 2, bracketPairColorization: { enabled: true }, smoothScrolling: true, cursorSmoothCaretAnimation: "on", fontFamily: "JetBrains Mono", fontSize: 13, fontLigatures: true, padding: { top: 12, bottom: 12 }, automaticLayout: true }} /> : <div className="flex h-full items-center justify-center text-slate-600">Select a file from the explorer to begin.</div>}</div>{isAiDrawerOpen && <AiPanel messages={messages} input={aiInput} setInput={setAiInput} onSubmit={sendAi} onClose={() => setIsAiDrawerOpen(false)} onCopy={copyMessage} copiedId={copiedId} onApply={(message) => void applyDiffToActiveFile(extractCode(message.text))} activeFile={activeFile} isStreaming={isStreaming} />}</div>{isOutputOpen && <OutputPanel outputTab={outputTab} setOutputTab={setOutputTab} runOutput={runOutput} runExitCode={runExitCode} isRunning={isRunning} onRun={() => void handleRun()} onClear={() => { setRunOutput("Ready. Run the active file to see output."); setRunExitCode(null); }} />}</div></main></div>
    <div className="flex h-7 shrink-0 items-center justify-between bg-[#4C1D95] px-3 text-[10px] text-white"><div className="flex items-center gap-4"><span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />main</span><span className="flex items-center gap-1 text-red-300"><CircleX className="h-3 w-3" />0</span><span className="flex items-center gap-1 text-amber-200"><CircleAlert className="h-3 w-3" />0</span></div><div className="flex items-center gap-4"><span>{activeFile ? monacoLanguageForFile(activeFile) : "Plain Text"}</span><span>UTF-8</span><span>Ln {cursor.lineNumber}, Col {cursor.column}</span><span>Spaces: 2</span><button onClick={() => setIsAiDrawerOpen((open) => !open)} className="text-cyan-300"><Zap className="mr-1 inline h-3 w-3" />Devpulse AI</button><button onClick={() => setIsOutputOpen((open) => !open)}><Terminal className="mr-1 inline h-3 w-3" />Terminal</button></div></div>
    {contextMenu && <div style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()} className="fixed z-50 w-44 border border-[#332b50] bg-[#161624] py-1 text-[11px] shadow-2xl"><button onClick={() => void handleContextAction("new", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><FilePlus className="h-3.5 w-3.5" />New File</button><button onClick={() => void handleContextAction("rename", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><Settings2 className="h-3.5 w-3.5" />Rename</button><button onClick={() => void handleContextAction("copy", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left"><Copy className="h-3.5 w-3.5" />Copy Path</button><button onClick={() => void handleContextAction("delete", contextMenu.file)} className="flex w-full gap-2 px-3 py-2 text-left text-red-300"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}
    {isFileSearchOpen && <div className="fixed inset-0 z-40 bg-black/60 p-20" onClick={() => setIsFileSearchOpen(false)}><div className="mx-auto max-w-lg border border-[#44346d] bg-[#161624]" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-[#332b50] px-3 py-3"><Search className="h-4 w-4 text-purple-300" /><input autoFocus value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Search files..." className="flex-1 bg-transparent text-sm text-white outline-none" /></div><div className="max-h-72 overflow-y-auto p-1">{filteredFiles.map((file) => <button key={file.id} onClick={() => { openFileInEditor(file); setIsFileSearchOpen(false); setFileSearch(""); }} className="flex w-full gap-2 px-3 py-2 text-left"><FileTypeIcon file={file} /><span className="text-white">{file.name}</span><span className="ml-auto text-[10px] text-slate-500">{file.path}</span></button>)}</div></div></div>}
    {isCreatingFile && <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 p-24"><form onSubmit={createFile} className="w-full max-w-md border border-[#44346d] bg-[#161624] p-4"><div className="mb-3 text-sm font-bold text-white">Create file</div><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="src/index.ts" className="mb-3 w-full border border-[#332b50] bg-[#0d0d16] px-3 py-2 text-xs text-white" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCreatingFile(false)} className="px-3 py-2 text-xs text-slate-400">Cancel</button><button className="bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white">Create</button></div></form></div>}
  </div>;
};
