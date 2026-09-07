import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  PanelLeftClose,
  Lock,
  Box,
  Braces,
} from "lucide-react";

interface FileExplorerProps {
  isOpen?: boolean;
  files?: Record<string, { name: string; path: string; language: string }>;
  activeFile?: string;
  onSelectFile?: (filename: string) => void;
  onNewFile?: (filename: string) => void;
  onOpenLocalFolder?: (files: FileList) => void;
  onOpenLocalFile?: (files: FileList) => void;
  onToggle?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  isOpen = true,
  files = {},
  activeFile = "route.ts",
  onSelectFile,
  onNewFile,
  onOpenLocalFolder,
  onOpenLocalFile,
  onToggle,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<{
    [key: string]: boolean;
  }>({
    src: true,
    api: true,
    components: false,
    utils: false,
    node_modules: false,
  });

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const explorerFolderRef = React.useRef<HTMLInputElement>(null);
  const explorerFileRef = React.useRef<HTMLInputElement>(null);

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder],
    }));
  };

  const handleFileClick = (filename: string) => {
    if (onSelectFile) {
      onSelectFile(filename);
    }
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      if (onNewFile) {
        onNewFile(newFileName.trim());
      }
      setNewFileName("");
      setIsCreatingFile(false);
    }
  };

  if (!isOpen) return null;

  const uploadedFiles = Object.values(files);

  return (
    <div className="file-explorer-column">
      {/* Hidden file / folder pickers */}
      <input
        type="file"
        ref={explorerFolderRef}
        onChange={(e) =>
          e.target.files &&
          onOpenLocalFolder &&
          onOpenLocalFolder(e.target.files)
        }
        style={{ display: "none" }}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
      />
      <input
        type="file"
        ref={explorerFileRef}
        onChange={(e) =>
          e.target.files && onOpenLocalFile && onOpenLocalFile(e.target.files)
        }
        style={{ display: "none" }}
        multiple
      />

      {/* Explorer Workspace Header */}
      <div className="explorer-header">
        <div className="workspace-badge">
          <div className="paper-plane-icon-box">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon
                points="3 11 22 2 13 21 11 13 3 11"
                fill="currentColor"
                fillOpacity="0.2"
              />
            </svg>
          </div>
          <div className="workspace-title-info">
            <span className="workspace-name">Codeplane</span>
            <span className="workspace-subname">main-service</span>
          </div>
        </div>

        <div className="explorer-actions">
          <button
            className="explorer-action-btn"
            title="Open Folder from Computer"
            onClick={() => explorerFolderRef.current?.click()}
          >
            <FolderOpen size={13} />
          </button>
          <button
            className="explorer-action-btn"
            title="New File"
            aria-label="New File"
            onClick={() => setIsCreatingFile(true)}
          >
            <FilePlus size={13} />
          </button>
          <button
            className="explorer-action-btn"
            title="Toggle Split"
            aria-label="Toggle Split"
            onClick={onToggle}
          >
            <PanelLeftClose size={13} />
          </button>
        </div>
      </div>

      {/* Files Section Title Bar */}
      <div className="files-section-bar">
        <span className="files-section-title">FILES</span>
        <span className="files-active-path">
          {uploadedFiles.length ? `${uploadedFiles.length} open` : "workspace"}
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-list" aria-label="Opened files">
          {uploadedFiles.map((file) => {
            const fileId =
              Object.keys(files).find((key) => files[key] === file) ||
              file.name;
            return (
              <button
                key={fileId}
                className={`tree-node file-node ${activeFile === fileId ? "selected" : ""}`}
                onClick={() => handleFileClick(fileId)}
                title={file.path}
              >
                <span className="file-badge ts-badge">
                  {file.language === "python"
                    ? "PY"
                    : file.language.slice(0, 2).toUpperCase()}
                </span>
                <span className="node-text file-name">{file.name}</span>
                {activeFile === fileId && <span className="file-status-dot" />}
              </button>
            );
          })}
        </div>
      )}

      {/* New File Inline Input if clicked */}
      {isCreatingFile && (
        <form
          onSubmit={handleCreateFileSubmit}
          className="new-file-inline-form"
        >
          <input
            type="text"
            placeholder="filename.ts"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            onBlur={() => {
              if (!newFileName.trim()) setIsCreatingFile(false);
            }}
            className="new-file-inline-input"
          />
        </form>
      )}

      {/* Tree Content */}
      <div
        className={`file-tree-container ${uploadedFiles.length ? "has-uploaded-files" : "initial-empty"}`}
      >
        {!uploadedFiles.length && (
          <div className="explorer-empty-state">
            <FolderOpen size={18} />
            <span>Open a file or folder</span>
          </div>
        )}
        {/* node_modules */}
        <div
          className="tree-node folder-node muted-folder"
          onClick={() => toggleFolder("node_modules")}
        >
          <span className="tree-arrow">
            {expandedFolders.node_modules ? (
              <ChevronDown size={11} />
            ) : (
              <ChevronRight size={11} />
            )}
          </span>
          <Folder size={14} className="folder-icon" />
          <span className="node-text">node_modules</span>
        </div>

        {/* src folder (expanded) */}
        <div
          className="tree-node folder-node"
          onClick={() => toggleFolder("src")}
        >
          <span className="tree-arrow">
            {expandedFolders.src ? (
              <ChevronDown size={11} />
            ) : (
              <ChevronRight size={11} />
            )}
          </span>
          {expandedFolders.src ? (
            <FolderOpen size={14} className="folder-icon" />
          ) : (
            <Folder size={14} className="folder-icon" />
          )}
          <span className="node-text">src</span>
        </div>

        {expandedFolders.src && (
          <div className="tree-children-level">
            {/* api subfolder (expanded) */}
            <div
              className="tree-node folder-node api-folder"
              onClick={() => toggleFolder("api")}
            >
              <span className="tree-arrow">
                {expandedFolders.api ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
              </span>
              <FolderOpen size={14} className="folder-icon api-folder-icon" />
              <span className="node-text api-folder-text">api</span>
            </div>

            {expandedFolders.api && (
              <div className="tree-children-level">
                {/* route.ts */}
                <div
                  className={`tree-node file-node ${activeFile === "route.ts" ? "selected" : ""}`}
                  onClick={() => handleFileClick("route.ts")}
                >
                  <span className="file-badge ts-badge">TS</span>
                  <span className="node-text file-name">route.ts</span>
                  {activeFile === "route.ts" && (
                    <span className="file-status-dot"></span>
                  )}
                </div>

                {/* model.py */}
                <div
                  className={`tree-node file-node ${activeFile === "model.py" ? "selected" : ""}`}
                  onClick={() => handleFileClick("model.py")}
                >
                  <span className="file-badge py-badge">PY</span>
                  <span className="node-text file-name">model.py</span>
                  {activeFile === "model.py" && (
                    <span className="file-status-dot"></span>
                  )}
                </div>

                {/* auth.ts */}
                <div
                  className={`tree-node file-node ${activeFile === "auth.ts" ? "selected" : ""}`}
                  onClick={() => handleFileClick("auth.ts")}
                >
                  <span className="file-badge ts-badge">TS</span>
                  <span className="node-text file-name">auth.ts</span>
                  {activeFile === "auth.ts" && (
                    <span className="file-status-dot"></span>
                  )}
                </div>
              </div>
            )}

            {/* components folder (toggleable) */}
            <div
              className="tree-node folder-node muted-folder"
              onClick={() => toggleFolder("components")}
            >
              <span className="tree-arrow">
                {expandedFolders.components ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
              </span>
              {expandedFolders.components ? (
                <FolderOpen size={14} className="folder-icon" />
              ) : (
                <Folder size={14} className="folder-icon" />
              )}
              <span className="node-text">components</span>
            </div>

            {expandedFolders.components && (
              <div className="tree-children-level">
                <div
                  className={`tree-node file-node ${activeFile === "EditorView.tsx" ? "selected" : ""}`}
                  onClick={() => handleFileClick("EditorView.tsx")}
                >
                  <span className="file-badge ts-badge">TS</span>
                  <span className="node-text file-name">EditorView.tsx</span>
                </div>
                <div
                  className={`tree-node file-node ${activeFile === "AiAssistant.tsx" ? "selected" : ""}`}
                  onClick={() => handleFileClick("AiAssistant.tsx")}
                >
                  <span className="file-badge ts-badge">TS</span>
                  <span className="node-text file-name">AiAssistant.tsx</span>
                </div>
              </div>
            )}

            {/* utils folder (toggleable) */}
            <div
              className="tree-node folder-node muted-folder"
              onClick={() => toggleFolder("utils")}
            >
              <span className="tree-arrow">
                {expandedFolders.utils ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
              </span>
              {expandedFolders.utils ? (
                <FolderOpen size={14} className="folder-icon" />
              ) : (
                <Folder size={14} className="folder-icon" />
              )}
              <span className="node-text">utils</span>
            </div>
          </div>
        )}

        {/* Root files */}
        <div
          className={`tree-node file-node ${activeFile === "package.json" ? "selected" : ""}`}
          onClick={() => handleFileClick("package.json")}
        >
          <Braces size={13} className="file-type-icon json-icon" />
          <span className="node-text file-name">package.json</span>
          {activeFile === "package.json" && (
            <span className="file-status-dot"></span>
          )}
        </div>

        <div
          className={`tree-node file-node ${activeFile === "docker-compose.yml" ? "selected" : ""}`}
          onClick={() => handleFileClick("docker-compose.yml")}
        >
          <Box size={13} className="file-type-icon docker-icon" />
          <span className="node-text file-name">docker-compose.yml</span>
          {activeFile === "docker-compose.yml" && (
            <span className="file-status-dot"></span>
          )}
        </div>

        <div
          className={`tree-node file-node ${activeFile === ".env.example" ? "selected" : ""}`}
          onClick={() => handleFileClick(".env.example")}
        >
          <Lock size={13} className="file-type-icon lock-icon" />
          <span className="node-text file-name">.env.example</span>
          {activeFile === ".env.example" && (
            <span className="file-status-dot"></span>
          )}
        </div>
      </div>
    </div>
  );
};
