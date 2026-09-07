import React, { useState, useEffect } from "react";
import {
  TopNavbar,
  WorkbenchPanel,
  FileExplorer,
  EditorView,
  AiAssistant,
  StatusBar,
  LoginPage,
  ThemeSelectionPage,
  WelcomeWorkspacePage,
  RepositoriesPage,
  DeploymentsPage,
  MessagingPage,
  RemoteSessionsPage,
  FullScreenAi,
  PricingPage,
  THEME_PRESETS,
  ThemeConfig,
  EditorFile,
} from "./components";

const INITIAL_FILES: Record<string, EditorFile> = {
  "route.ts": {
    id: "route.ts",
    name: "route.ts",
    path: "src/api/route.ts",
    language: "typescript",
    content: `import { NextRequest, NextResponse } from "next/server";
import { embedEngine } from "@codeplane/ai-embed";
import { redis } from "@/lib/redis";
// Schema configuration for multi-tenant inference
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  const { query, topK = 5 } = await req.json();

  // Compute fast vector hash for query memoization
  const cacheKey = \`v-cache:\${encodeURIComponent(query)}\`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json({ results: cached, source: "redis-cache" });
  }

  // Fallback to Codeplane low-latency neural indexer
  const vectorResult = await embedEngine.search({
    embedding: query,
    limit: topK,
    telemetry: "prod-us-east"
  });

  return NextResponse.json({ vectorResult, duration: performance.now() - startTime });
}`,
  },
  "model.py": {
    id: "model.py",
    name: "model.py",
    path: "src/api/model.py",
    language: "python",
    content: `# Codeplane Neural Vector Model
import torch
from transformers import AutoTokenizer, AutoModel

class VectorIndexer:
    def __init__(self, model_name="codeplane-embed-base"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)

    def encode(self, text: str):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
        return outputs.last_hidden_state.mean(dim=1)`,
  },
  "auth.ts": {
    id: "auth.ts",
    name: "auth.ts",
    path: "src/api/auth.ts",
    language: "typescript",
    content: `import { NextRequest } from "next/server";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: "admin" | "engineer" | "viewer";
}

export async function verifySession(req: NextRequest): Promise<AuthContext | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  
  // Verify mTLS session and JWT signature
  return {
    userId: "usr_94f8e2",
    orgId: "org_codeplane",
    role: "engineer"
  };
}`,
  },
  "package.json": {
    id: "package.json",
    name: "package.json",
    path: "package.json",
    language: "json",
    content: `{
  "name": "codeplane-core",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@codeplane/ai-embed": "^1.2.0",
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`,
  },
  "docker-compose.yml": {
    id: "docker-compose.yml",
    name: "docker-compose.yml",
    path: "docker-compose.yml",
    language: "yaml",
    content: `version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:`,
  },
  ".env.example": {
    id: ".env.example",
    name: ".env.example",
    path: ".env.example",
    language: "shell",
    content: `# Codeplane Production Cluster Config
NODE_ENV=production
CLUSTER_REGION=prod-us-east
REDIS_URL=redis://localhost:6379
TELEMETRY_SAMPLE_RATE=1.0`,
  },
};

export const App: React.FC = () => {
  // Navigation Flow State: 'login' -> 'theme' -> 'welcome' -> 'editor' (or 'repositories', 'deployments', 'chat')
  const [currentScreen, setCurrentScreen] = useState<
    | "login"
    | "theme"
    | "welcome"
    | "repositories"
    | "editor"
    | "deployments"
    | "chat"
    | "remote"
    | "pricing"
  >("login");
  const [userEmail, setUserEmail] = useState<string>("dev@company.com");
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(
    THEME_PRESETS[0],
  );

  // Code Editor State
  const [files, setFiles] = useState<Record<string, EditorFile>>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [diffApplied, setDiffApplied] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({
    line: 12,
    col: 24,
  });
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(true);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(true);
  const [isFullScreenAiOpen, setIsFullScreenAiOpen] = useState(false);

  // Dynamically update CSS custom properties when theme changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent-purple",
      currentTheme.primary,
    );
    document.documentElement.style.setProperty(
      "--accent-green",
      currentTheme.secondary,
    );
    document.documentElement.style.setProperty(
      "--accent-orange",
      currentTheme.tertiary,
    );
  }, [currentTheme]);

  // Auth handler -> Navigate to Theme page
  const handleLoginSuccess = (email?: string) => {
    if (email) setUserEmail(email);
    setCurrentScreen("theme");
  };

  // Theme selection handler -> After Theme page, navigate to Welcome / Open File & Folder page
  const handleThemeSelect = (theme: ThemeConfig) => {
    setCurrentTheme(theme);
  };

  const handleContinueAfterTheme = () => {
    setCurrentScreen("welcome");
  };

  // REAL WORKING LOCAL COMPUTER FILE / FOLDER OPENER
  const handleOpenLocalFiles = async (fileList: FileList) => {
    const newFilesMap: Record<string, EditorFile> = {};
    let firstFileId = "";

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relativePath = (file as any).webkitRelativePath || file.name;
      const fileName = file.name;
      const fileId = relativePath || fileName;

      // Filter out binary or large non-code files if needed
      if (!firstFileId && !fileName.startsWith(".")) {
        firstFileId = fileId;
      }

      try {
        const text = await file.text();
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const lang =
          ext === "py"
            ? "python"
            : ext === "json"
              ? "json"
              : ext === "css"
                ? "css"
                : ext === "html"
                  ? "html"
                  : ext === "yaml" || ext === "yml"
                    ? "yaml"
                    : ext === "md"
                      ? "markdown"
                      : "typescript";

        newFilesMap[fileId] = {
          id: fileId,
          name: fileName,
          path: relativePath,
          language: lang,
          content: text,
        };
      } catch (err) {
        console.error("Error reading local file:", fileName, err);
      }
    }

    if (Object.keys(newFilesMap).length > 0) {
      setFiles((prev) => ({ ...prev, ...newFilesMap }));
      const newTabNames = Object.keys(newFilesMap).slice(0, 6);
      setOpenTabs(newTabNames);
      setActiveTab(firstFileId || Object.keys(newFilesMap)[0]);
      setCurrentScreen("editor");
    }
  };

  // Template launcher
  const handleLaunchTemplate = (templateName: string) => {
    const sampleCode = `// Template: ${templateName}
import React from 'react';

export default function TemplateApp() {
  return (
    <div className="p-8">
      <h1>Welcome to ${templateName} on Codeplane</h1>
      <p>Instant boot container initialized in 1.18s.</p>
    </div>
  );
}`;
    const fileName = "app.tsx";
    setFiles((prev) => ({
      ...prev,
      [fileName]: {
        id: fileName,
        name: fileName,
        path: `templates/${templateName.toLowerCase().replace(/[^a-z0-9]/g, "-")}/${fileName}`,
        language: "typescript",
        content: sampleCode,
      },
    }));
    setOpenTabs((prev) =>
      prev.includes(fileName) ? prev : [fileName, ...prev],
    );
    setActiveTab(fileName);
    setCurrentScreen("editor");
  };

  // Clone repo handler
  const handleCloneRepo = (url: string) => {
    const repoName = url.split("/").pop()?.replace(".git", "") || "cloned-repo";
    const fileName = "index.ts";
    setFiles((prev) => ({
      ...prev,
      [fileName]: {
        id: fileName,
        name: fileName,
        path: `${repoName}/src/${fileName}`,
        language: "typescript",
        content: `// Repository: ${url}\n// Cloned via Codeplane Engine v2.4\n\nexport const config = {\n  telemetry: 'prod-us-east',\n  cluster: 'us-east-nitro-4'\n};\n`,
      },
    }));
    setOpenTabs([fileName]);
    setActiveTab(fileName);
    setCurrentScreen("editor");
  };

  // Repository fleet "Open in Editor"
  const handleOpenRepoInEditor = (repoId: string) => {
    const filename =
      repoId === "inference-api"
        ? "model.py"
        : repoId === "auth-service"
          ? "auth.ts"
          : "route.ts";
    handleSelectFile(filename);
    setCurrentScreen("editor");
  };

  // File explorer & tab operations
  const handleSelectFile = (filename: string) => {
    if (!files[filename]) {
      setFiles((prev) => ({
        ...prev,
        [filename]: {
          id: filename,
          name: filename,
          path: `src/${filename}`,
          language: filename.endsWith(".py")
            ? "python"
            : filename.endsWith(".json")
              ? "json"
              : "typescript",
          content: `// ${filename}\nexport default function Handler() {\n  return null;\n}`,
        },
      }));
    }

    if (!openTabs.includes(filename)) {
      setOpenTabs((prev) => [...prev, filename]);
    }
    setActiveTab(filename);
  };

  const handleCloseTab = (filename: string) => {
    const nextTabs = openTabs.filter((t) => t !== filename);
    setOpenTabs(nextTabs);
    if (activeTab === filename && nextTabs.length > 0) {
      setActiveTab(nextTabs[nextTabs.length - 1]);
    } else if (nextTabs.length === 0) {
      setActiveTab("");
    }
  };

  const handleContentChange = (filename: string, newContent: string) => {
    setFiles((prev) => ({
      ...prev,
      [filename]: {
        ...prev[filename],
        content: newContent,
      },
    }));
  };

  const handleNewFile = (filename: string) => {
    const lang = filename.endsWith(".py")
      ? "python"
      : filename.endsWith(".json")
        ? "json"
        : filename.endsWith(".css")
          ? "css"
          : "typescript";

    setFiles((prev) => ({
      ...prev,
      [filename]: {
        id: filename,
        name: filename,
        path: `src/api/${filename}`,
        language: lang,
        content: `// New file: ${filename}\n`,
      },
    }));

    setOpenTabs((prev) =>
      prev.includes(filename) ? prev : [...prev, filename],
    );
    setActiveTab(filename);
  };

  const handleWorkbenchSelect = (item: string) => {
    if (item === "Workspaces") {
      setCurrentScreen("welcome");
    } else if (item === "Repositories") {
      setCurrentScreen("repositories");
    } else if (item === "Editor") {
      setCurrentScreen("editor");
    } else if (item === "Deployments") {
      setCurrentScreen("deployments");
    } else if (item === "Remote Sessions") {
      setCurrentScreen("remote");
    } else if (item === "Messaging / Chat") {
      setCurrentScreen("chat");
    } else if (item === "Pricing") {
      setCurrentScreen("pricing");
    } else if (item === "Settings") {
      setCurrentScreen("theme");
    }
  };

  return (
    <div className="codeplane-app">
      {/* 1. LOGIN SCREEN */}
      {currentScreen === "login" && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}

      {/* 2. THEME SELECTION SCREEN (WITH AUTO SELECT) */}
      {currentScreen === "theme" && (
        <ThemeSelectionPage
          currentTheme={currentTheme}
          onThemeSelect={handleThemeSelect}
          onContinue={handleContinueAfterTheme}
        />
      )}

      {/* 3. PLATFORM SHELL (FOR WORKSPACES, REPOSITORIES, EDITOR, DEPLOYMENTS, CHAT) */}
      {currentScreen !== "login" && currentScreen !== "theme" && (
        <>
          <TopNavbar
            onNavigateScreen={(scr) => {
              if (scr === "login" || scr === "theme" || scr === "editor") {
                setCurrentScreen(scr);
              }
            }}
            activeFilePath={files[activeTab]?.path || "src/api"}
          />

          <div className="ide-main-workspace">
            {/* Universal Left Workbench Activity Bar */}
            {isWorkbenchOpen && (
              <WorkbenchPanel
                activeItem={
                  currentScreen === "welcome"
                    ? "Workspaces"
                    : currentScreen === "repositories"
                      ? "Repositories"
                      : currentScreen === "deployments"
                        ? "Deployments"
                        : currentScreen === "remote"
                          ? "Remote Sessions"
                          : currentScreen === "chat"
                            ? "Messaging / Chat"
                            : currentScreen === "pricing"
                              ? "Pricing"
                              : "Editor"
                }
                onSelectItem={handleWorkbenchSelect}
                onToggle={() => setIsWorkbenchOpen(false)}
              />
            )}

            {/* SCREEN: WELCOME / OPEN LOCAL FILE & FOLDER */}
            {currentScreen === "welcome" && (
              <WelcomeWorkspacePage
                onOpenLocalFolder={handleOpenLocalFiles}
                onOpenLocalFile={handleOpenLocalFiles}
                onLaunchTemplate={handleLaunchTemplate}
                onCloneRepo={handleCloneRepo}
                onNavigateEditor={() => setCurrentScreen("editor")}
              />
            )}

            {/* SCREEN: WORKSPACES & REPOSITORIES FLEET */}
            {currentScreen === "repositories" && (
              <RepositoriesPage
                onOpenInEditor={handleOpenRepoInEditor}
                onNewWorkspace={() => setCurrentScreen("welcome")}
              />
            )}

            {/* SCREEN: DEPLOYMENTS & PROJECT CONFIGURATION */}
            {currentScreen === "deployments" && <DeploymentsPage />}

            {/* SCREEN: MESSAGING / TEAM CHAT */}
            {currentScreen === "chat" && <MessagingPage />}

            {/* SCREEN: REMOTE CONTROL SESSIONS */}
            {currentScreen === "remote" && <RemoteSessionsPage />}

            {currentScreen === "pricing" && <PricingPage />}

            {/* SCREEN: MAIN VS CODE EDITOR */}
            {currentScreen === "editor" && (
              <>
                {/* File & Folder Explorer with Local File/Folder Pickers */}
                <FileExplorer
                  isOpen={isExplorerOpen}
                  files={files}
                  activeFile={activeTab}
                  onSelectFile={handleSelectFile}
                  onNewFile={handleNewFile}
                  onOpenLocalFolder={handleOpenLocalFiles}
                  onOpenLocalFile={handleOpenLocalFiles}
                  onToggle={() => setIsExplorerOpen(false)}
                />

                {/* Center Editable Code Editor (Monaco) */}
                <EditorView
                  files={files}
                  openTabs={openTabs}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onTabClose={handleCloseTab}
                  onContentChange={handleContentChange}
                  onCursorChange={(line, col) => setCursorPos({ line, col })}
                  diffApplied={diffApplied}
                />

                {/* Right AI Assistant */}
                <AiAssistant
                  onApplyDiff={() => setDiffApplied((prev) => !prev)}
                  diffApplied={diffApplied}
                  isOpen={isAiOpen}
                  onToggle={() => setIsAiOpen((prev) => !prev)}
                  onOpenFullScreen={() => setIsFullScreenAiOpen(true)}
                />
              </>
            )}
          </div>

          {/* Universal Bottom Status Bar */}
          <StatusBar
            cursorPos={cursorPos}
            activeFileName={activeTab}
            activeLanguage={
              files[activeTab]?.language === "python"
                ? "Python 3.12"
                : files[activeTab]?.language === "json"
                  ? "JSON"
                  : "TypeScript / React"
            }
          />

          {!isWorkbenchOpen && (
            <button
              className="shell-reopen-button workbench-reopen-button"
              onClick={() => setIsWorkbenchOpen(true)}
              title="Open workbench"
            >
              Open
            </button>
          )}

          {currentScreen === "editor" && !isExplorerOpen && (
            <button
              className="shell-reopen-button explorer-reopen-button"
              onClick={() => setIsExplorerOpen(true)}
              title="Open explorer"
            >
              Files
            </button>
          )}

          {isFullScreenAiOpen && (
            <FullScreenAi onClose={() => setIsFullScreenAiOpen(false)} />
          )}
        </>
      )}
    </div>
  );
};

export default App;
