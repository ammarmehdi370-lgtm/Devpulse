import React, { useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Play,
  Columns,
  Maximize2,
  MoreHorizontal,
  X,
  FolderOpen,
  FileCode,
  FileText,
  ChevronRight,
} from 'lucide-react';

export interface EditorFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

interface EditorViewProps {
  files: Record<string, EditorFile>;
  openTabs: string[];
  activeTab: string;
  onTabChange: (filename: string) => void;
  onTabClose: (filename: string) => void;
  onContentChange: (filename: string, newContent: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  onOpenLocalFolder?: (files: FileList) => void;
  onOpenLocalFile?: (files: FileList) => void;
  diffApplied?: boolean;
}

export const EditorView: React.FC<EditorViewProps> = ({
  files,
  openTabs,
  activeTab,
  onTabChange,
  onTabClose,
  onContentChange,
  onCursorChange,
  onOpenLocalFolder,
  onOpenLocalFile,
  diffApplied = false,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFile = openTabs.length > 0 ? files[activeTab] : null;
  const hasFiles = openTabs.length > 0;

  const handleRun = () => {
    if (!currentFile) return;
    setIsRunning(true);
    setRunMessage(`Executing ${currentFile.name}...`);
    setTimeout(() => {
      setIsRunning(false);
      setRunMessage(`✓ ${currentFile.name} executed (3.4ms)`);
      setTimeout(() => setRunMessage(null), 3500);
    }, 700);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme('codeplane-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C084FC', fontStyle: 'bold' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'FB923C' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'function', foreground: '67E8F9' },
        { token: 'variable', foreground: 'E2E8F0' },
        { token: 'delimiter', foreground: 'CBD5E1' },
      ],
      colors: {
        'editor.background': '#13141F',
        'editor.foreground': '#E2E8F0',
        'editor.lineHighlightBackground': '#1A1C2C',
        'editorCursor.foreground': '#FFFFFF',
        'editorWhitespace.foreground': '#23263B',
        'editorIndentGuide.background': '#1D2033',
        'editorIndentGuide.activeBackground': '#373B5C',
        'editorLineNumber.foreground': '#42475E',
        'editorLineNumber.activeForeground': '#9DA2B8',
        'editor.selectionBackground': '#2A2D4A',
      },
    });
    monaco.editor.setTheme('codeplane-dark');
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });
  };

  const getBadgeType = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      return <span className="file-badge ts-badge">TS</span>;
    }
    if (filename.endsWith('.py')) {
      return <span className="file-badge py-badge">PY</span>;
    }
    if (filename.endsWith('.json')) {
      return <span className="file-badge" style={{ backgroundColor: '#eab308', color: '#111' }}>JSON</span>;
    }
    if (filename.endsWith('.css')) {
      return <span className="file-badge" style={{ backgroundColor: '#38bdf8', color: '#111' }}>CSS</span>;
    }
    if (filename.endsWith('.html')) {
      return <span className="file-badge" style={{ backgroundColor: '#fb923c', color: '#111' }}>HTML</span>;
    }
    if (filename.endsWith('.md')) {
      return <span className="file-badge" style={{ backgroundColor: '#a78bfa', color: '#111' }}>MD</span>;
    }
    return <span className="file-badge" style={{ backgroundColor: '#6366f1', color: '#fff' }}>FILE</span>;
  };

  const RECENT_SHORTCUTS = [
    { icon: '⌘', key: 'O', label: 'Open File' },
    { icon: '⌘', key: '⇧O', label: 'Open Folder' },
    { icon: '⌘', key: 'P', label: 'Jump to File' },
    { icon: '⌘', key: 'K', label: 'Command Palette' },
  ];

  return (
    <div className="editor-main-panel">
      {/* Hidden file/folder inputs at editor level */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => e.target.files && onOpenLocalFolder && onOpenLocalFolder(e.target.files)}
        style={{ display: 'none' }}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && onOpenLocalFile && onOpenLocalFile(e.target.files)}
        style={{ display: 'none' }}
        multiple
      />

      {/* TOP TABS BAR - always shown */}
      <div className="editor-tabs-bar">
        <div className="tabs-list">
          {openTabs.map((fileName) => {
            const isActive = fileName === activeTab;
            return (
              <div
                key={fileName}
                className={`editor-tab ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(fileName)}
              >
                {getBadgeType(fileName)}
                <span className="tab-title">{fileName}</span>
                {isActive && <span className="tab-status-dot" />}
                <button
                  className="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(fileName);
                  }}
                  aria-label={`Close ${fileName}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {/* Add file tab-like button */}
          <button
            className="editor-add-tab-btn"
            title="Open file"
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
        </div>

        <div className="tab-right-controls">
          <span className="tab-count-pill">{openTabs.length}</span>

          {hasFiles && (
            <button
              className={`run-button ${isRunning ? 'running' : ''}`}
              onClick={handleRun}
              title="Execute current file"
            >
              <Play size={11} fill="#00e599" strokeWidth={0} />
              <span>Run</span>
            </button>
          )}

          <button
            className="editor-tool-btn"
            title="Open Folder"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpen size={13} />
          </button>
          <button className="editor-tool-btn" title="Split Editor Right">
            <Columns size={13} />
          </button>
          <button className="editor-tool-btn" title="Toggle Layout">
            <Maximize2 size={13} />
          </button>
          <button className="editor-tool-btn" title="More Editor Actions">
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* BREADCRUMBS - only when a file is open */}
      {hasFiles && currentFile && (
        <div className="editor-breadcrumbs">
          {currentFile.path.split('/').map((part, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              {i === arr.length - 1 ? (
                <>
                  <span className="breadcrumb-code-icon">&lt;&gt;</span>
                  <span className="breadcrumb-file">{part}</span>
                </>
              ) : (
                <span className="breadcrumb-item">{part}</span>
              )}
            </React.Fragment>
          ))}
          {runMessage && (
            <span className="execution-toast animate-fade-in">{runMessage}</span>
          )}
        </div>
      )}

      {/* EDITOR BODY */}
      <div
        className="code-content-wrapper"
        style={{ height: hasFiles ? 'calc(100% - 61px)' : 'calc(100% - 37px)', width: '100%' }}
      >
        {hasFiles && currentFile ? (
          <Editor
            height="100%"
            width="100%"
            language={currentFile.language}
            value={
              diffApplied && activeTab === 'route.ts'
                ? currentFile.content +
                  '\n  // Cache result with 1 hour expiration\n  await redis.set(\n    cacheKey,\n    JSON.stringify(vectorResult),\n    { ex: 3600 }\n  );'
                : currentFile.content
            }
            theme="codeplane-dark"
            onChange={(val: string | undefined) => {
              onContentChange(activeTab, val || '');
            }}
            onMount={handleEditorMount}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: true, side: 'right' },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 20 },
              lineNumbersMinChars: 3,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              renderLineHighlight: 'all',
              tabSize: 2,
              wordWrap: 'off',
              bracketPairColorization: { enabled: true },
              guides: { indentation: true },
            }}
          />
        ) : (
          /* VS Code-style empty state */
          <div className="editor-empty-state">
            <div className="editor-empty-logo">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="14" fill="#1a1c2e" />
                <path d="M14 20L28 14L42 20V36L28 42L14 36V20Z" stroke="#5856d6" strokeWidth="1.5" fill="none" />
                <path d="M28 14V42M14 20L42 36M42 20L14 36" stroke="#5856d633" strokeWidth="1" />
                <circle cx="28" cy="28" r="4" fill="#5856d6" />
              </svg>
            </div>

            <h2 className="editor-empty-title">Codeplane Editor</h2>
            <p className="editor-empty-subtitle">Open a file or folder to start coding</p>

            <div className="editor-empty-actions">
              <button
                className="editor-empty-btn primary"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen size={14} />
                <span>Open Folder</span>
              </button>
              <button
                className="editor-empty-btn secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileCode size={14} />
                <span>Open File</span>
              </button>
            </div>

            <div className="editor-empty-shortcuts">
              <div className="shortcuts-label">KEYBOARD SHORTCUTS</div>
              <div className="shortcuts-grid">
                {RECENT_SHORTCUTS.map((s) => (
                  <div key={s.key} className="shortcut-row">
                    <kbd className="kbd-combo">{s.icon}{s.key}</kbd>
                    <span className="kbd-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="editor-empty-recents">
              <div className="recents-label">
                <FileText size={11} />
                <span>No recent files</span>
              </div>
              <p className="recents-hint">Files you open will appear here for quick access</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
