"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { asc, eq } from "drizzle-orm";
import { authenticatedFetch, setAccessToken } from "../lib/apiClient";
import { getDB } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import { getServices, type BrowserServices } from "../../src/lib/services";
import { connectSocket, disconnectSocket } from "../../src/lib/socket-client";
import { saveEditorPreview } from "../services/editorMocks";
import { THEME_PRESETS, type ThemeConfig } from "./themeLibrary";
import { ToastContainer, type ToastMessage } from "../components/ToastContainer";

export type PageType =
  | "login"
  | "theme"
  | "workspaces"
  | "repositories"
  | "editor"
  | "deployments"
  | "chat"
  | "remote-control"
  | "ai-studio"
  | "pricing"
  | "activity"
  | "settings"
  | "payment-methods"
  | "custom-plan"
  | "cloud-core"
  | "api-sandbox";

export type { ThemeConfig } from "./themeLibrary";
export interface UserProfile {
  name: string;
  email: string;
  handle: string;
  role: string;
  avatar: string;
  isAuthenticated: boolean;
}
export interface Repository {
  id: string;
  name: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  branch: string;
  lastCommit: string;
  updatedAt: string;
  isStarred: boolean;
  deployStatus?: "live" | "building" | "none";
  devboxReady?: boolean;
}
export interface WorkspaceDevbox {
  id: string;
  name: string;
  repo: string;
  branch: string;
  template: string;
  status: "Running" | "Stopped" | "Building";
  uptime: string;
  vCpu: number;
  ram: string;
  storage: string;
  port: number;
  url: string;
}
export interface Deployment {
  id: string;
  target: string;
  domain: string;
  status: "Ready" | "Building" | "Failed";
  branch: string;
  commitHash: string;
  commitMessage: string;
  author: string;
  timestamp: string;
  duration: string;
}
export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  scope: string;
  updatedAt: string;
  isRevealed?: boolean;
}
export interface LogLine {
  id: string;
  time: string;
  tag: string;
  color: string;
  text: string;
}
export interface EditorFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  version: number;
  apiVersion: number;
  iconType:
    | "ts"
    | "js"
    | "py"
    | "json"
    | "yml"
    | "env"
    | "html"
    | "css"
    | "txt"
    | "folder";
  origin: "api" | "local" | "new" | "readonly";
  apiFileId?: string;
  revisionId?: string;
  lastSavedAt?: Date;
  sizeBytes?: number;
  isLargeFile: boolean;
  openedAnyway: boolean;
  modified: boolean;
  isDirty?: boolean;
}

interface AppContextType {
  page: PageType;
  setPage: (page: PageType) => void;
  user: UserProfile;
  login: (email?: string, name?: string) => Promise<void>;
  loginAndLoad: (email?: string, name?: string) => Promise<void>;
  isDataLoading: boolean;
  dataErrors: AppDataErrors;
  retryDataLoad: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  logout: () => void;
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  availableThemes: ThemeConfig[];
  repositories: Repository[];
  searchRepoQuery: string;
  setSearchRepoQuery: (query: string) => void;
  repoFilter: string;
  setRepoFilter: (filter: string) => void;
  addRepository: (
    repo: Omit<
      Repository,
      "id" | "stars" | "forks" | "updatedAt" | "isStarred"
    >,
  ) => Promise<void>;
  deleteRepository: (id: string) => Promise<void>;
  toggleStarRepo: (id: string) => Promise<void>;
  workspaces: WorkspaceDevbox[];
  spinUpDevbox: (
    name: string,
    template: string,
    repoUrl?: string,
    specs?: { vCpu?: number; ram?: string; storage?: string },
  ) => Promise<void>;
  toggleWorkspaceStatus: (id: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  deployments: Deployment[];
  triggerNewRelease: (customMessage?: string) => Promise<void>;
  rerunPipeline: (id?: string) => Promise<void>;
  envVars: EnvVariable[];
  addEnvVar: (key: string, value: string, scope: string) => Promise<void>;
  deleteEnvVar: (id: string) => Promise<void>;
  toggleRevealEnvVar: (id: string) => void;
  revealAllEnvVars: boolean;
  toggleRevealAllEnvVars: () => void;
  deployOnPush: boolean;
  setDeployOnPush: React.Dispatch<React.SetStateAction<boolean>>;
  ephemeralPr: boolean;
  setEphemeralPr: React.Dispatch<React.SetStateAction<boolean>>;
  logs: LogLine[];
  clearLogs: () => void;
  addLog: (tag: string, color: string, text: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isEditorProjectOpen: boolean;
  setIsEditorProjectOpen: (open: boolean) => void;
  editorProjectId: string;
  isEditorLoading: boolean;
  editorError: string;
  loadEditorProject: (projectId?: string) => Promise<void>;
  loadedProjectName: string;
  setLoadedProjectName: (name: string) => void;
  treeFiles: EditorFile[];
  openFiles: EditorFile[];
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  fileContents: Record<string, string>;
  updateFileContent: (fileId: string, content: string) => void;
  updateOpenFileMetadata: (fileId: string, metadata: Partial<Pick<EditorFile, "isLargeFile" | "openedAnyway" | "language" | "origin">>) => void;
  saveFileContent: (fileId: string, contentOverride?: string, forceOverride?: boolean) => Promise<void>;
  saveLocalFileToProject: (fileId: string, path?: string) => Promise<void>;
  openFileInEditor: (file: EditorFile) => void;
  closeFileFromEditor: (fileId: string) => void;
  createNewFile: (
    name: string,
    path?: string,
    initialContent?: string,
  ) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  loadUserLocalFiles: (
    folderName: string,
    files: { name: string; path: string; content: string }[],
  ) => Promise<void>;
  loadSingleLocalFile: (name: string, content: string) => Promise<void>;
  isFileTreeOpen: boolean;
  setIsFileTreeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applyDiffToActiveFile: (snippet: string) => Promise<void>;
  remoteCode: string;
  updateRemoteCode: (code: string) => void;
  isRemoteControlling: boolean;
  setIsRemoteControlling: React.Dispatch<React.SetStateAction<boolean>>;
  isRemoteMuted: boolean;
  setIsRemoteMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isRemoteCameraOn: boolean;
  setIsRemoteCameraOn: React.Dispatch<React.SetStateAction<boolean>>;
  billingCycle: "monthly" | "annual";
  setBillingCycle: React.Dispatch<React.SetStateAction<"monthly" | "annual">>;
}

const EMPTY_REPOSITORIES: Repository[] = [];
const EMPTY_WORKSPACES: WorkspaceDevbox[] = [];
const EMPTY_DEPLOYMENTS: Deployment[] = [];
const EMPTY_ENV_VARS: EnvVariable[] = [];
const EMPTY_LOGS: LogLine[] = [];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const LARGE_FILE_LIMIT_BYTES = 500 * 1024;

const getLanguageColor = (language?: string | null) => {
  const normalized = (language ?? "TypeScript").toLowerCase();
  if (normalized.includes("typescript") || normalized.includes("ts")) return "#3178c6";
  if (normalized.includes("javascript") || normalized.includes("js")) return "#f1e05a";
  if (normalized.includes("python")) return "#3572A5";
  if (normalized.includes("go")) return "#00ADD8";
  if (normalized.includes("rust")) return "#dea584";
  if (normalized.includes("css")) return "#563d7c";
  if (normalized.includes("html")) return "#e34c26";
  if (normalized.includes("sql")) return "#dad8d8";
  return "#8b5cf6";
};

const isLargeEditorContent = (content: string) => new TextEncoder().encode(content).length > LARGE_FILE_LIMIT_BYTES;

export class ApiRequestError extends Error {
  status: number;
  details: Record<string, unknown>;
  constructor(status: number, message: string, details: Record<string, unknown> = {}) { super(message); this.name = "ApiRequestError"; this.status = status; this.details = details; }
}

type AppDataErrors = {
  repositories: string;
  workspaces: string;
  deployments: string;
};

const EMPTY_DATA_ERRORS: AppDataErrors = {
  repositories: "",
  workspaces: "",
  deployments: "",
};

const INITIAL_REPOSITORIES: Repository[] = [
  {
    id: "repo-1",
    name: "devpulse-core",
    description:
      "Hyper-optimized microVM runtime, ephemeral orchestration layer, and LSP bridge.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 124,
    forks: 38,
    branch: "staging",
    lastCommit: "feat: add auto branch detection",
    updatedAt: "12m ago",
    isStarred: true,
    deployStatus: "live",
    devboxReady: true,
  },
  {
    id: "repo-2",
    name: "neural-coder-daemon",
    description:
      "Autonomous multi-modal coding subagent with real-time AST mutation validation.",
    language: "Python",
    languageColor: "#3572A5",
    stars: 89,
    forks: 14,
    branch: "main",
    lastCommit: "optimize: KV cache compression for CUDA 12.4",
    updatedAt: "2h ago",
    isStarred: true,
    deployStatus: "building",
    devboxReady: true,
  },
  {
    id: "repo-3",
    name: "wireguard-mesh-router",
    description:
      "Zero-config tunnel fabric connecting developer laptops with cloud devbox clusters.",
    language: "Go",
    languageColor: "#00ADD8",
    stars: 45,
    forks: 9,
    branch: "v1.4-stable",
    lastCommit: "fix(tunnel): mtu handshake negotiation",
    updatedAt: "1d ago",
    isStarred: false,
    deployStatus: "live",
    devboxReady: false,
  },
  {
    id: "repo-4",
    name: "microkernel-hypervisor",
    description:
      "Firecracker-based sub-350ms warm boot snapshot manager with NVMe direct-IO.",
    language: "Rust",
    languageColor: "#dea584",
    stars: 210,
    forks: 42,
    branch: "master",
    lastCommit: "perf: direct page table remapping on resume",
    updatedAt: "3d ago",
    isStarred: true,
    deployStatus: "none",
    devboxReady: true,
  },
];

const REPO_SEED_DATA: Record<string, Partial<Repository>> = Object.fromEntries(
  INITIAL_REPOSITORIES.map((repository) => [repository.name, repository]),
);

const INITIAL_WORKSPACES: WorkspaceDevbox[] = [
  {
    id: "ws-1",
    name: "devpulse-core-staging",
    repo: "devpulse-core",
    branch: "staging",
    template: "Next.js 15 (Turbopack)",
    status: "Running",
    uptime: "4h 12m",
    vCpu: 8,
    ram: "32 GB ECC",
    storage: "100 GB NVMe",
    port: 3000,
    url: "https://ws-alpha-71.devpulse.dev",
  },
  {
    id: "ws-2",
    name: "fastapi-neural-agent",
    repo: "neural-coder-daemon",
    branch: "main",
    template: "FastAPI Python (Uvicorn)",
    status: "Running",
    uptime: "1h 05m",
    vCpu: 8,
    ram: "32 GB ECC",
    storage: "100 GB NVMe",
    port: 8000,
    url: "https://ws-agent-04.devpulse.dev",
  },
];

const INITIAL_DEPLOYMENTS: Deployment[] = [
  {
    id: "dep-1",
    target: "devpulse-core-preview-pr162.cpnv.app",
    domain: "staging-edge-v4-vector",
    status: "Ready",
    branch: "feat:hooks",
    commitHash: "c8ff3e8",
    commitMessage: "feat: add vector embedding cache",
    author: "alex",
    timestamp: "20s ago",
    duration: "24s",
  },
  {
    id: "dep-2",
    target: "devpulse-core-production.edge",
    domain: "global-sub10ms-ingress",
    status: "Ready",
    branch: "main",
    commitHash: "a5df141",
    commitMessage: "bump dashboard deps & telemetry",
    author: "alex",
    timestamp: "52m ago",
    duration: "31s",
  },
  {
    id: "dep-3",
    target: "devpulse-core-qa-pr164.app",
    domain: "ephemeral-mesh-network-3",
    status: "Building",
    branch: "fix(auth)-tokens",
    commitHash: "1e523f2",
    commitMessage: "fix(auth): rotate session secret",
    author: "alex",
    timestamp: "1m ago",
    duration: "18s",
  },
];

const INITIAL_ENV_VARS: EnvVariable[] = [
  {
    id: "env-1",
    key: "DATABASE_CLUSTER_URL",
    value: "postgres://admin:REDACTED@db-us-east.internal:5432/devpulse",
    scope: "Production, Staging",
    updatedAt: "2d ago",
    isRevealed: false,
  },
  {
    id: "env-2",
    key: "OPENAI_API_KEY",
    value: "sk-proj-783bfFq1982xLl409zAA91kmNp399812401",
    scope: "Production, Preview",
    updatedAt: "5d ago",
    isRevealed: false,
  },
  {
    id: "env-3",
    key: "JWT_SECRET_KEY",
    value: "c8f76d41a99823f6e1003ba4128f77aa91bca772",
    scope: "Global All Workspaces",
    updatedAt: "1w ago",
    isRevealed: false,
  },
  {
    id: "env-4",
    key: "VECTOR_EMBEDDING_MODEL",
    value: "text-embedding-3-small",
    scope: "Preview / Staging",
    updatedAt: "3h ago",
    isRevealed: true,
  },
];

const INITIAL_LOGS: LogLine[] = [
  {
    id: "1",
    time: "[11:42:01]",
    tag: "[PIPELINE]",
    color: "text-violet-400",
    text: "Initializing automated edge manifest for repository: devpulse-core",
  },
  {
    id: "2",
    time: "[11:42:04]",
    tag: "[GIT]",
    color: "text-cyan-400",
    text: 'Fetching ref "root/tree" (c8ff3e8b4a) from upstream git origin...',
  },
  {
    id: "3",
    time: "[11:42:08]",
    tag: "[BUILD]",
    color: "text-amber-400",
    text: "Restored 486MB layers from Devpulse Turbo Layer Cache [cache key: pnpm-modules-v2]",
  },
  {
    id: "4",
    time: "[11:42:18]",
    tag: "[STEP 1/5]",
    color: "text-blue-400",
    text: "pnpm run build:core --workspace packages/server",
  },
  {
    id: "5",
    time: "[11:42:26]",
    tag: "[STEP 2/5]",
    color: "text-blue-400",
    text: "Emitting optimized WASM artifacts for vector indexing... (14ms)",
  },
  {
    id: "6",
    time: "[11:42:32]",
    tag: "[CONTAINER]",
    color: "text-emerald-400",
    text: "Devbox container built in 11.2s",
  },
  {
    id: "7",
    time: "[11:42:34]",
    tag: "[NETWORK]",
    color: "text-pink-400",
    text: "Provisioning mesh proxy listener on unix:/var/run/devpulse.sock",
  },
  {
    id: "8",
    time: "[11:42:35]",
    tag: "[HEALTH]",
    color: "text-emerald-400",
    text: "Healthcheck passed on port 3000 (HTTP 200)",
  },
  {
    id: "9",
    time: "[11:42:36]",
    tag: "[PROPAGATE]",
    color: "text-emerald-400",
    text: "Edge routing propagation complete across 32 points of presence.",
  },
  {
    id: "10",
    time: "[11:42:37]",
    tag: "[SUCCESS]",
    color: "text-emerald-300 font-bold",
    text: "✓ Deployment available at https://devpulse-core-preview-pr162.cpnv.app",
  },
];

const INITIAL_REMOTE_INDEX_JS = `import { createServer } from 'http';
import { redisClient } from './lib/redis.js';
import { processQueue } from './workers/telemetry.js';

const PORT = process.env.PORT || 8080;

export async function handleConnection(req, res) {
  const sessionToken = req.headers['x-devpulse-auth'];

  if (!sessionToken) {
    return res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
  }

  // Fetch session context from distributed cache
  const session = await redisClient.get(\`session:\${sessionToken}\`);
  const payload = JSON.parse(session);

  console.log(\`[AUTH] Peer connection validated: \${payload.userId}\`);

  const workerStream = await processQueue(payload.clusterId);
}`;

const AppContext = createContext<AppContextType | null>(null);

const getCurrentUserId = () =>
  sessionStorage.getItem("auth:current-user-id") ??
  sessionStorage.getItem("dp_user_id");

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [services, setServices] = useState<BrowserServices | null>(null);
  const [page, setPageState] = useState<PageType>("login");
  const setPage = (newPage: PageType) => {
    setPageState(newPage);
    if (newPage !== "login" && newPage !== "theme") {
      localStorage.setItem("devpulse_active_page", newPage);
    }
  };
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isClientStorageHydrated, setIsClientStorageHydrated] = useState(false);
  const [dataErrors, setDataErrors] =
    useState<AppDataErrors>(EMPTY_DATA_ERRORS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setThemeState] = useState<ThemeConfig>(THEME_PRESETS[0]!);
  const [user, setUser] = useState<UserProfile>({
    name: "Alex",
    email: "alex@devpulse.dev",
    handle: "alex",
    role: "Staff Platform Engineer",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    isAuthenticated: false,
  });

  const [repositories, setRepositories] =
    useState<Repository[]>(EMPTY_REPOSITORIES);
  const [searchRepoQuery, setSearchRepoQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState("all");

  const [workspaces, setWorkspaces] =
    useState<WorkspaceDevbox[]>(EMPTY_WORKSPACES);
  const [deployments, setDeployments] =
    useState<Deployment[]>(EMPTY_DEPLOYMENTS);
  const [envVars, setEnvVars] = useState<EnvVariable[]>(EMPTY_ENV_VARS);
  const [revealAllEnvVars, setRevealAllEnvVars] = useState(false);

  const [deployOnPush, setDeployOnPush] = useState(true);
  const [ephemeralPr, setEphemeralPr] = useState(true);

  const [logs, setLogs] = useState<LogLine[]>(EMPTY_LOGS);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Editor State: starts with empty project until user selects file/folder
  const [isEditorProjectOpen, setIsEditorProjectOpen] = useState(false);
  const [editorProjectId, setEditorProjectId] = useState("");
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [loadedProjectName, setLoadedProjectName] = useState("");
  const [treeFiles, setTreeFiles] = useState<EditorFile[]>([]);
  const [openFiles, setOpenFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(true);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // Remote Control Pairing State
  const [remoteCode, setRemoteCode] = useState<string>("");
  const [isRemoteControlling, setIsRemoteControlling] = useState(true);
  const [isRemoteMuted, setIsRemoteMuted] = useState(true);
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);

  // Pricing State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const initializedUserIdRef = React.useRef<string | null>(null);

  // Sync theme to DOM
  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-theme", newTheme.id);
      document.documentElement.style.setProperty("--primary", newTheme.primary);
      document.documentElement.style.setProperty(
        "--secondary",
        newTheme.secondary,
      );
      document.documentElement.style.setProperty(
        "--tertiary",
        newTheme.tertiary,
      );
    }
  };

  useEffect(() => {
    setTheme(THEME_PRESETS[0]!);
  }, []);

  useEffect(() => {
    let active = true;
    void getServices().then((nextServices) => {
      if (!active) return;
      setServices(nextServices);
      const userId = getCurrentUserId();
      if (userId) {
        void getDB()
          .then((db) =>
            db
              .select()
              .from(schema.users)
              .where(eq(schema.users.id, userId))
              .limit(1),
          )
          .then((rows) => {
            const currentUser = rows[0];
            if (!currentUser || !active) return;
            setUser({
              name: currentUser.name ?? "Devpulse User",
              email: currentUser.email,
              handle: currentUser.name?.toLowerCase().replace(/\s+/g, "") ?? "devpulse",
              role: "Staff Platform Engineer",
              avatar: currentUser.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
              isAuthenticated: true,
            });
          })
          .catch((error: unknown) => {
            console.error("[AppContext] Could not restore the local user.", error);
          });
      }
    }).catch((error: unknown) => {
      console.error("[AppContext] Could not initialize browser services.", error);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/v1/me`, {
          credentials: "include",
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data: unknown = await response.json();
          if (
            typeof data === "object"
            && data !== null
            && "email" in data
            && typeof data.email === "string"
          ) {
            const serverUser: UserProfile = {
              name: "name" in data && typeof data.name === "string"
                ? data.name
                : "Demo User",
              email: data.email,
              handle: "handle" in data && typeof data.handle === "string"
                ? data.handle
                : data.email.split("@")[0] ?? "",
              role: "role" in data && typeof data.role === "string"
                ? data.role
                : "Platform Engineer",
              avatar: "avatarUrl" in data && typeof data.avatarUrl === "string"
                ? data.avatarUrl
                : "",
              isAuthenticated: true,
            };
            if (!active) return;
            setUser(serverUser);
            localStorage.setItem(
              "devpulse_user_session",
              JSON.stringify(serverUser),
            );
            return;
          }
          console.warn("[AppContext] The server session response did not contain a valid user.");
        } else {
          console.warn(
            `[AppContext] Server session check failed (${response.status}); trying the local session.`,
          );
        }
      } catch (error: unknown) {
        if (active) {
          console.warn(
            "[AppContext] Server session is unavailable; trying the local session.",
            error,
          );
        }
      }

      if (!active || localStorage.getItem("devpulse_logged_out") === "true") {
        return;
      }

      const saved = localStorage.getItem("devpulse_user_session");
      if (!saved) return;

      try {
        const parsed: unknown = JSON.parse(saved);
        if (
          typeof parsed === "object"
          && parsed !== null
          && "name" in parsed
          && typeof parsed.name === "string"
          && "email" in parsed
          && typeof parsed.email === "string"
          && "handle" in parsed
          && typeof parsed.handle === "string"
          && "role" in parsed
          && typeof parsed.role === "string"
          && "avatar" in parsed
          && typeof parsed.avatar === "string"
          && "isAuthenticated" in parsed
          && parsed.isAuthenticated === true
        ) {
          setUser({
            name: parsed.name,
            email: parsed.email,
            handle: parsed.handle,
            role: parsed.role,
            avatar: parsed.avatar,
            isAuthenticated: true,
          });
        } else {
          console.warn("[AppContext] The saved local user session is invalid.");
        }
      } catch (error: unknown) {
        console.warn("[AppContext] Could not read the saved local user session.", error);
      }
    };

    const initializeApp = async () => {
      try {
        await restoreSession();
      } catch (error: unknown) {
        console.warn("[AppContext] Initialization completed with partial state.", error);
      } finally {
        if (active) setIsClientStorageHydrated(true);
      }
    };

    void initializeApp();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!services || !isClientStorageHydrated || !user.isAuthenticated) return;
    const userId = getCurrentUserId();
    if (!userId) return;

    services.realtime.emit("presence:update", {
      userId,
      status: "online",
      name: user.name,
      at: Date.now(),
    });

    const handleUnload = () => {
      services.realtime.emit("presence:update", {
        userId,
        status: "offline",
        at: Date.now(),
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [services, isClientStorageHydrated, user.isAuthenticated, user.name]);

  // Listen for keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const login = async (email?: string, name?: string) => {
    if (!services) throw new Error("Browser services are still initializing.");
    const db = await getDB();
    const targetEmail = email ?? "demo@devpulse.local";
    const existingRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, targetEmail))
      .limit(1);

    let dbUser = existingRows[0];
    if (!dbUser) {
      const [created] = await db.insert(schema.users).values({
        id: crypto.randomUUID(),
        email: targetEmail,
        name: name ?? "Demo User",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${crypto.randomUUID()}`,
      }).returning();
      dbUser = created;
    }

    if (!dbUser) throw new Error("Could not create or load the local user.");

    const memberships = await db
      .select()
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, dbUser.id))
      .limit(1);
    let workspaceId = memberships[0]?.workspaceId;
    if (memberships.length === 0) {
      workspaceId = crypto.randomUUID();
      const slugBase = dbUser.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
      const [workspace] = await db.insert(schema.workspaces).values({
        id: workspaceId,
        name: `${dbUser.name ?? "Devpulse"}'s Workspace`,
        slug: `${slugBase}-${workspaceId.slice(0, 8)}`,
        ownerId: dbUser.id,
      }).returning();
      if (!workspace) throw new Error("Could not create the user's local workspace.");
      await db.insert(schema.workspaceMembers).values({
        workspaceId,
        userId: dbUser.id,
        role: "OWNER",
      });
      await db.insert(schema.channels).values({
        id: crypto.randomUUID(),
        workspaceId,
        name: "general",
        type: "PUBLIC",
      });
    }

    const profile: UserProfile = {
      name: dbUser.name ?? (name ?? "Demo User"),
      email: dbUser.email,
      handle: (name ?? dbUser.name ?? "demo").toLowerCase().replace(/\s+/g, "") || "demo",
      role: "Staff Platform Engineer",
      avatar: dbUser.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.id}`,
      isAuthenticated: true,
    };

    setUser(profile);
    initializedUserIdRef.current = dbUser.id;
    sessionStorage.setItem("auth:current-user-id", dbUser.id);
    sessionStorage.setItem("dp_user_id", dbUser.id);
    const devToken = btoa(JSON.stringify({
      sub: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }));
    sessionStorage.setItem("dp_access_token", devToken);
    if (workspaceId) connectSocket(workspaceId, dbUser.id);
    services.realtime.setUserId(dbUser.id);
    localStorage.setItem("devpulse_user_session", JSON.stringify(profile));
    localStorage.removeItem("devpulse_logged_out");
  };

  const logout = async () => {
    const userId = getCurrentUserId();
    const workspaceId = workspaces[0]?.id;
    if (workspaceId) disconnectSocket(workspaceId);
    if (services && userId) {
      services.realtime.emit("presence:update", {
        userId,
        status: "offline",
        at: Date.now(),
      });
    }
    services?.realtime.setUserId(null);
    setAccessToken(null);
    void authenticatedFetch(`${API_BASE}/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser({
      name: "Alex",
      email: "alex@devpulse.dev",
      handle: "alex",
      role: "Staff Platform Engineer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      isAuthenticated: false,
    });
    sessionStorage.removeItem("auth:current-user-id");
    sessionStorage.removeItem("dp_user_id");
    sessionStorage.removeItem("dp_access_token");
    localStorage.setItem("devpulse_logged_out", "true");
    setPage("login");
  };

  const loadRepositories = async () => {
    if (!services) return;
    const userId = getCurrentUserId();
    if (!userId) return;

    const db = await getDB();
    const workspaceMemberships = await db
      .select()
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, userId))
      .limit(1);

    if (workspaceMemberships.length === 0) return;

    const rows = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceMemberships[0]!.workspaceId));

    const repos: Repository[] = rows.map((project) => {
      const seed = REPO_SEED_DATA[project.name];
      const language = project.language === "TypeScript" && seed?.language
        ? seed.language
        : project.language ?? "TypeScript";

      return {
        id: project.id,
        name: project.name,
        description: project.description || seed?.description || "Browser-local project",
        language,
        languageColor: getLanguageColor(language),
        stars: project.stars || seed?.stars || 0,
        forks: project.forks || seed?.forks || 0,
        branch: project.defaultBranch === "main" && seed?.branch
          ? seed.branch
          : project.defaultBranch ?? "main",
        lastCommit: seed?.lastCommit ?? "Initial commit",
        updatedAt: seed?.updatedAt ?? project.updatedAt?.toISOString() ?? new Date().toISOString(),
        isStarred: project.isStarred,
        deployStatus: (project.deployStatus === "none" && seed?.deployStatus
          ? seed.deployStatus
          : project.deployStatus as Repository["deployStatus"]) ?? "none",
        devboxReady: project.devboxReady ?? seed?.devboxReady ?? true,
      };
    });

    setRepositories(repos);
  };

  const addRepository = async (
    repoData: Omit<
      Repository,
      "id" | "stars" | "forks" | "updatedAt" | "isStarred"
    >,
  ) => {
    if (services) {
      try {
        const userId = getCurrentUserId();
        if (!userId) throw new Error("Sign in before adding a repository.");
        const db = await getDB();
        const memberships = await db
          .select()
          .from(schema.workspaceMembers)
          .where(eq(schema.workspaceMembers.userId, userId));
        if (memberships.length === 0) throw new Error("No workspace is available.");
        const [created] = await db.insert(schema.projects).values({
          id: crypto.randomUUID(),
          name: repoData.name,
          workspaceId: memberships[0]!.workspaceId,
          language: repoData.language ?? "TypeScript",
          defaultBranch: repoData.branch || "main",
          description: repoData.description ?? "",
        }).returning();
        if (!created) throw new Error("Repository was not saved.");
        const newRepo: Repository = {
          id: created.id,
          name: created.name,
          description: created.description || repoData.description,
          language: created.language ?? "TypeScript",
          languageColor: getLanguageColor(created.language),
          stars: created.stars ?? 0,
          forks: created.forks ?? 0,
          branch: created.defaultBranch ?? "main",
          lastCommit: "Initial commit",
          updatedAt: created.updatedAt?.toISOString() ?? new Date().toISOString(),
          isStarred: created.isStarred ?? false,
          deployStatus: (created.deployStatus as Repository["deployStatus"]) ?? "none",
          devboxReady: created.devboxReady ?? true,
        };
        setRepositories((previous) => [newRepo, ...previous]);
        addToast({
          variant: "warning",
          title: "Saved locally",
          message: "Repository is saved in this browser; connect the API to persist it remotely.",
          duration: 6000,
        });
      } catch (error) {
        addToast({
          variant: "error",
          title: "Repository not saved",
          message: error instanceof Error ? error.message : "Could not save repository.",
          duration: 6000,
        });
      }
      return;
    }

    try {
      const repository = await apiJson<{
        id: string;
        name: string;
        description: string;
        language: string;
        stars: number;
        forks: number;
        isStarred: boolean;
        defaultBranch: string;
        deployStatus: string;
        devboxReady: boolean;
        updatedAt: string;
      }>("/v1/repositories", {
        method: "POST",
        body: JSON.stringify({
          name: repoData.name,
          description: repoData.description,
          language: repoData.language,
          branch: repoData.branch,
        }),
      });
      setRepositories((previous) => [
        {
          ...repoData,
          id: repository.id,
          stars: repository.stars,
          forks: repository.forks,
          updatedAt: repository.updatedAt,
          isStarred: repository.isStarred,
          branch: repository.defaultBranch,
          deployStatus: repository.deployStatus as Repository["deployStatus"],
          devboxReady: repository.devboxReady,
        },
        ...previous,
      ]);
      addToast({ variant: "success", title: "Repository created", message: "Repository was saved." });
      return;
    } catch (apiError) {
      console.warn("[Repos] API unavailable, saving locally.", apiError);
    }
    const newRepo: Repository = {
      ...repoData,
      id: crypto.randomUUID(),
      stars: 0,
      forks: 0,
      updatedAt: "Just now",
      isStarred: false,
      deployStatus: "none",
      devboxReady: false,
    };
    setRepositories((previous) => [newRepo, ...previous]);
    addToast({
      variant: "warning",
      title: "Saved locally",
      message: "Repository saved to this browser. Connect the API to persist.",
      duration: 6000,
    });
  };

  const deleteRepository = async (id: string) => {
    if (services) {
      try {
        const db = await getDB();
        await db.delete(schema.projects).where(eq(schema.projects.id, id));
        setRepositories((prev) => prev.filter((r) => r.id !== id));
      } catch (error) {
        addToast({
          variant: "error",
          title: "Repository not deleted",
          message: error instanceof Error ? error.message : "Could not delete repository.",
          duration: 6000,
        });
      }
      return;
    }
    try {
      await apiJson(`/v1/repositories/${id}`, { method: "DELETE" });
    } catch (error) {
      addToast({
        variant: "error",
        title: "Repository not deleted",
        message: error instanceof Error ? error.message : "Could not delete repository.",
        duration: 6000,
      });
      return;
    }
    setRepositories((prev) => prev.filter((r) => r.id !== id));
    addToast({ variant: "success", title: "Repository deleted", message: "Repository was deleted." });
  };

  const toggleStarRepo = async (id: string) => {
    const current = repositories.find((repository) => repository.id === id);
    if (services) {
      const db = await getDB();
      const nextValue = !(current?.isStarred ?? false);
      await db
        .update(schema.projects)
        .set({
          isStarred: nextValue,
          stars: (current?.stars ?? 0) + (nextValue ? 1 : -1),
        })
        .where(eq(schema.projects.id, id));
      setRepositories((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                isStarred: nextValue,
                stars: r.stars + (nextValue ? 1 : -1),
              }
            : r,
        ),
      );
      return;
    }
    try {
      await apiJson(`/v1/repositories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isStarred: !current?.isStarred }),
      });
    } catch {
      /* local fallback */
    }
    setRepositories((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              isStarred: !r.isStarred,
              stars: r.isStarred ? r.stars - 1 : r.stars + 1,
            }
          : r,
      ),
    );
  };

  const spinUpDevbox = async (
    name: string,
    template: string,
    repoUrl?: string,
    specs?: { vCpu?: number; ram?: string; storage?: string },
  ) => {
    try {
      const response = await apiJson<WorkspaceDevbox>("/v1/devboxes", {
        method: "POST",
        body: JSON.stringify({
          name: name || `devbox-${Math.floor(Math.random() * 900) + 100}`,
          template,
          repo: repoUrl
            ? repoUrl.split("/").pop()?.replace(".git", "")
            : "devpulse-core",
          vCpu: specs?.vCpu || 8,
          ram: specs?.ram || "32 GB ECC",
          storage: specs?.storage || "100 GB NVMe",
        }),
      });
      setWorkspaces((previous) => [response, ...previous]);
      return;
    } catch (apiError) {
      console.warn("[Workspace] API unavailable, saving locally.", apiError);
    }
    const newWs: WorkspaceDevbox = {
      id: `ws-${Date.now()}`,
      name: name || `devbox-${Math.floor(Math.random() * 900) + 100}`,
      repo: repoUrl
        ? repoUrl.split("/").pop()?.replace(".git", "") || "custom-repo"
        : "devpulse-core",
      branch: "main",
      template,
      status: "Running",
      uptime: "1m",
      vCpu: specs?.vCpu || 8,
      ram: specs?.ram || "32 GB ECC",
      storage: specs?.storage || "100 GB NVMe",
      port: 3000 + Math.floor(Math.random() * 5000),
      url: `https://ws-boot-${Math.floor(Math.random() * 9000) + 1000}.devpulse.dev`,
    };
    setWorkspaces((previous) => [newWs, ...previous]);
    addToast({
      variant: "warning",
      title: "Workspace saved locally",
      message: "Workspace is available in this browser only. Connect the API to persist it.",
      duration: 6000,
    });
  };

  const toggleWorkspaceStatus = async (id: string) => {
    const workspace = workspaces.find((item) => item.id === id);
    const status = workspace?.status === "Running" ? "Stopped" : "Running";
    try {
      await apiJson(`/v1/devboxes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      /* local fallback */
    }
    setWorkspaces((prev) =>
      prev.map((ws) =>
        ws.id === id
          ? {
              ...ws,
              status: ws.status === "Running" ? "Stopped" : "Running",
            }
          : ws,
      ),
    );
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await apiJson(`/v1/devboxes/${id}`, { method: "DELETE" });
    } catch (error) {
      addToast({
        variant: "error",
        title: "Workspace not deleted",
        message: error instanceof Error ? error.message : "Could not delete workspace.",
        duration: 6000,
      });
      return;
    }
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
    addToast({ variant: "success", title: "Workspace deleted", message: "Workspace was deleted." });
  };

  const addLog = (tag: string, color: string, text: string) => {
    const now = new Date();
    const timeStr = `[${now.toTimeString().split(" ")[0]}]`;
    const newLog: LogLine = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: timeStr,
      tag,
      color,
      text,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const triggerNewRelease = async (customMessage?: string) => {
    const deployId = crypto.randomUUID();
    const newDeploy: Deployment = {
      id: deployId,
      target: "preview",
      domain: "browser-preview.local",
      status: "Building",
      branch: "main",
      commitHash: deployId.slice(0, 7),
      commitMessage: customMessage ?? "Manual release",
      author: user.handle,
      timestamp: new Date().toISOString(),
      duration: "",
    };

    setDeployments((previous) => [newDeploy, ...previous]);
    addToast({
      variant: "info",
      title: "Simulated deployment",
      message: "No real deployment infrastructure connected. Showing local preview.",
      duration: 5000,
    });

    setTimeout(() => {
      setDeployments((prev) =>
        prev.map((d) =>
          d.id === deployId ? { ...d, status: "Ready", duration: "3s" } : d,
        ),
      );
      addLog("[SIM]", "text-yellow-400", "Simulated deployment complete");
    }, 3000);
  };

  const rerunPipeline = async (id?: string) => {
    if (id) {
      try {
        await apiJson(`/v1/deployments/${id}/rerun`, { method: "POST" });
      } catch {
        /* local fallback */
      }
    }
    addLog(
      "[PIPELINE]",
      "text-violet-400",
      `Re-running pipeline for ${id || "latest deployment"}...`,
    );
    setTimeout(() => {
      addLog(
        "[SUCCESS]",
        "text-emerald-400",
        "✓ Pipeline re-run completed with status HEALTHY.",
      );
    }, 1500);
  };

  const addEnvVar = async (key: string, value: string, scope: string) => {
    try {
      const variable = await apiJson<EnvVariable>("/v1/environment-variables", {
        method: "POST",
        body: JSON.stringify({ key, value, scope }),
      });
      setEnvVars((previous) => [variable, ...previous]);
      addToast({ variant: "success", title: "Variable added", message: "Environment variable was saved." });
      return;
    } catch (apiError) {
      console.warn("[Env] API unavailable, saving locally.", apiError);
    }
    const newVar: EnvVariable = {
      id: `env-${Date.now()}`,
      key: key.toUpperCase().trim(),
      value: value.trim(),
      scope: scope || "Production, Staging",
      updatedAt: "Just now",
      isRevealed: false,
    };
    setEnvVars((previous) => [newVar, ...previous]);
    addToast({
      variant: "warning",
      title: "Variable saved locally",
      message: "Variable is saved in this browser only. Connect the API to persist it.",
      duration: 6000,
    });
  };

  const deleteEnvVar = async (id: string) => {
    try {
      await apiJson(`/v1/environment-variables/${id}`, { method: "DELETE" });
    } catch (error) {
      addToast({
        variant: "error",
        title: "Variable not deleted",
        message: error instanceof Error ? error.message : "Could not delete environment variable.",
        duration: 6000,
      });
      return;
    }
    setEnvVars((prev) => prev.filter((v) => v.id !== id));
    addToast({ variant: "success", title: "Variable deleted", message: "Environment variable was deleted." });
  };

  const toggleRevealEnvVar = (id: string) => {
    setEnvVars((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isRevealed: !v.isRevealed } : v)),
    );
  };

  const toggleRevealAllEnvVars = () => {
    setRevealAllEnvVars((prev) => {
      const next = !prev;
      setEnvVars((vars) => vars.map((v) => ({ ...v, isRevealed: next })));
      return next;
    });
  };

  // Dynamic Editor Functions
  const getIconType = (fileName: string): EditorFile["iconType"] => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "ts" || ext === "tsx") return "ts";
    if (ext === "js" || ext === "jsx") return "js";
    if (ext === "py") return "py";
    if (ext === "json") return "json";
    if (ext === "yml" || ext === "yaml") return "yml";
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext.includes("env")) return "env";
    return "txt";
  };

  const apiJson = async <T,>(
    path: string,
    options?: RequestInit,
  ): Promise<T> => {
    const response = await authenticatedFetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiRequestError(response.status, body.message || body.error || `Request failed with status ${response.status}`, body as Record<string, unknown>);
    }
    return response.status === 204 ? (undefined as T) : response.json();
  };

  const loadInitialAppData = async (): Promise<AppDataErrors> => {
    if (!services) throw new Error("Browser services are still initializing.");
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Cannot load application data without a user.");

    const loadWorkspaces = async () => {
      const response = await apiJson<{ devboxes: WorkspaceDevbox[] }>("/v1/devboxes");
      setWorkspaces(response.devboxes);
    };
    const loadDeployments = async () => {
      const response = await apiJson<{ deployments: Deployment[] }>("/v1/deployments");
      setDeployments(response.deployments);
    };
    const loadEnvironmentVariables = async () => {
      const response = await apiJson<{ variables: EnvVariable[] }>("/v1/environment-variables");
      setEnvVars(response.variables);
    };
    const loadChannels = async () => {
      const db = await getDB();
      const memberships = await db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.userId, userId));
      if (memberships.length === 0) return;
      await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.workspaceId, memberships[0]!.workspaceId));
    };

    const results = await Promise.allSettled([
      loadRepositories(),
      loadWorkspaces(),
      loadDeployments(),
      loadEnvironmentVariables(),
      loadChannels(),
    ]);
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failures.length > 0) {
      console.warn(
        "[AppContext] Some initial application data failed to load.",
        failures.map((failure) => failure.reason),
      );
    }
    const retryMessage = "Could not load this data. Please retry.";
    return {
      repositories:
        results[0]?.status === "rejected" ? retryMessage : "",
      workspaces:
        results[1]?.status === "rejected" ? retryMessage : "",
      deployments:
        results[2]?.status === "rejected" ||
        results[3]?.status === "rejected"
          ? retryMessage
          : "",
    };
  };

  const getPostLoginPage = (): PageType =>
    localStorage.getItem("devpulse_theme_selected") === "true"
      ? "repositories"
      : "theme";

  const loginAndLoad = async (email?: string, name?: string) => {
    setIsDataLoading(true);
    setDataErrors(EMPTY_DATA_ERRORS);
    try {
      await login(email, name);
      initializedUserIdRef.current = getCurrentUserId() ?? null;
      setDataErrors(await loadInitialAppData());
      setPage(getPostLoginPage());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Application data could not be loaded. Please retry.";
      setDataErrors({
        repositories: message,
        workspaces: message,
        deployments: message,
      });
      throw error;
    } finally {
      setIsDataLoading(false);
    }
  };

  const retryDataLoad = async () => {
    setIsDataLoading(true);
    setDataErrors(EMPTY_DATA_ERRORS);
    try {
      setDataErrors(await loadInitialAppData());
    } catch (error) {
      console.error("[AppContext] Could not retry application data loading.", error);
      const message =
        error instanceof Error
          ? error.message
          : "Application data could not be loaded. Please retry.";
      setDataErrors({
        repositories: message,
        workspaces: message,
        deployments: message,
      });
    } finally {
      setIsDataLoading(false);
    }
  };

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 4000;
    setToasts((previous) => [...previous, { ...toast, id, duration }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((current) => current.id !== id));
    }, duration);
  };

  const dismissToast = (id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  };
  useEffect(() => {
    if (!services || !isClientStorageHydrated || !user.isAuthenticated) return;
    const userId = getCurrentUserId();
    if (!userId || initializedUserIdRef.current === userId) return;

    initializedUserIdRef.current = userId;
    setIsDataLoading(true);
    setDataErrors(EMPTY_DATA_ERRORS);
    void loadInitialAppData()
      .then((errors) => {
        setDataErrors(errors);
        if (page === "login") setPage(getPostLoginPage());
      })
      .catch((error: unknown) => {
        console.error("[AppContext] Could not initialize application data.", error);
        const message =
          error instanceof Error
            ? error.message
            : "Application data could not be loaded. Please retry.";
        setDataErrors({
          repositories: message,
          workspaces: message,
          deployments: message,
        });
        if (page === "login") setPage(getPostLoginPage());
      })
      .finally(() => setIsDataLoading(false));
  }, [services, isClientStorageHydrated, user.isAuthenticated, page]);

  const editorFileFromApi = (file: {
    id: string;
    path: string;
    language?: string | null;
    version?: number;
    sizeBytes?: number | null;
    content?: string;
  }): EditorFile => ({
    id: file.id,
    name: file.path.split("/").pop() || file.path,
    path: file.path,
    content: file.content ?? "",
    language: file.language || "plaintext",
    version: file.version ?? 1,
    apiVersion: file.version ?? 1,
    iconType: getIconType(file.path),
    origin: "api",
    apiFileId: file.id,
    sizeBytes: file.sizeBytes ?? undefined,
    isLargeFile: (file.sizeBytes ?? 0) > LARGE_FILE_LIMIT_BYTES || isLargeEditorContent(file.content ?? ""),
    openedAnyway: false,
    modified: false,
  });

  const getLocalProjectContext = async (requestedProjectId?: string) => {
    if (!services) return null;

    const db = await getDB();
    let projectId = requestedProjectId;
    let projectName = "Local project";

    if (!projectId) {
      const userId = getCurrentUserId();
      if (userId) {
        const memberships = await db
          .select()
          .from(schema.workspaceMembers)
          .where(eq(schema.workspaceMembers.userId, userId));

        if (memberships.length > 0) {
          const projectRow = await db
            .select()
            .from(schema.projects)
            .where(eq(schema.projects.workspaceId, memberships[0]!.workspaceId))
            .limit(1);
          if (projectRow[0]) {
            projectId = projectRow[0].id;
            projectName = projectRow[0].name;
          }
        }
      }
    }

    if (!projectId) {
      const projectRow = await db.select().from(schema.projects).limit(1);
      if (projectRow[0]) {
        projectId = projectRow[0].id;
        projectName = projectRow[0].name;
      }
    }

    if (!projectId) return null;

    const projectRow = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1);

    if (!projectRow[0]) return null;

    const fileRows = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.projectId, projectId))
      .orderBy(asc(schema.files.path));

    return {
      projectId,
      projectName: projectRow[0].name,
      files: fileRows.map((file) => ({
        ...editorFileFromApi({
          id: file.id,
          path: file.path,
          language: file.language,
          version: file.version,
          sizeBytes: file.sizeBytes,
          content: file.content,
        }),
      })),
    };
  };

  const loadEditorProject = async (requestedProjectId?: string) => {
    setIsEditorLoading(true);
    setEditorError("");
    try {
      const localProject = await getLocalProjectContext(requestedProjectId);
      if (localProject) {
        const nextFiles = localProject.files;
        const nextContents = Object.fromEntries(
          nextFiles.map((file) => [file.id, file.content]),
        );
        setEditorProjectId(localProject.projectId);
        setLoadedProjectName(localProject.projectName);
        setTreeFiles(nextFiles);
        setFileContents(nextContents);
        const openFileList = nextFiles.slice(0, 1);
        setOpenFiles(openFileList);
        setActiveFileId(openFileList[0]?.id ?? "");
        setIsEditorProjectOpen(true);
        return;
      }

      const projectResponse = requestedProjectId
        ? null
        : await apiJson<{ projects: { id: string; name: string }[] }>(
            "/v1/projects",
          );
      let project = requestedProjectId
        ? { id: requestedProjectId, name: "" }
        : projectResponse?.projects[0];
      if (!project) {
        project = await apiJson<{ id: string; name: string }>("/v1/projects", {
          method: "POST",
          body: JSON.stringify({ name: "Devpulse Workspace" }),
        });
      }
      const fileResponse = await apiJson<{
        project: { id: string; name: string };
        files: { id: string; path: string; language?: string | null; version?: number; sizeBytes?: number | null }[];
      }>(`/v1/projects/${project.id}/files`);
      const filesWithContent = await Promise.all(
        fileResponse.files.map(async (file) => {
          const detail = await apiJson<{ content: string }>(
            `/v1/projects/${project.id}/files/${file.id}`,
          );
          return {
            file: {
              ...editorFileFromApi(file),
              content: detail.content,
              isLargeFile: isLargeEditorContent(detail.content) || (file.sizeBytes ?? 0) > LARGE_FILE_LIMIT_BYTES,
            },
            content: detail.content,
          };
        }),
      );
      const nextFiles = filesWithContent.map(({ file }) => file);
      const nextContents = Object.fromEntries(
        filesWithContent.map(({ file, content }) => [file.id, content]),
      );
      setEditorProjectId(project.id);
      setLoadedProjectName(fileResponse.project.name);
      setTreeFiles(nextFiles);
      setFileContents(nextContents);
      const session = await apiJson<{
        openFileIds: string[];
        activeFileId: string | null;
      }>(`/v1/editor/session/${project.id}`).catch(() => null);
      const restoredOpenFiles = session?.openFileIds
        .map((id) => nextFiles.find((file) => file.id === id))
        .filter((file): file is EditorFile => Boolean(file));
      const openFileList = restoredOpenFiles?.length
        ? restoredOpenFiles
        : nextFiles.slice(0, 1);
      setOpenFiles(openFileList);
      setActiveFileId(
        session?.activeFileId && openFileList.some((file) => file.id === session.activeFileId)
          ? session.activeFileId
          : openFileList[0]?.id ?? "",
      );
      setIsEditorProjectOpen(true);
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : "Unable to load the editor project",
      );
    } finally {
      setIsEditorLoading(false);
    }
  };

  const updateFileContent = (fileId: string, content: string) => {
    setFileContents((prev) => ({ ...prev, [fileId]: content }));
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content, isLargeFile: isLargeEditorContent(content), isDirty: true, modified: true } : f)),
    );
    setTreeFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content, isLargeFile: isLargeEditorContent(content), isDirty: true, modified: true } : f)));
  };

  const updateOpenFileMetadata = (fileId: string, metadata: Partial<Pick<EditorFile, "isLargeFile" | "openedAnyway" | "language" | "origin">>) => {
    setOpenFiles((prev) => prev.map((file) => file.id === fileId ? { ...file, ...metadata } : file));
    setTreeFiles((prev) => prev.map((file) => file.id === fileId ? { ...file, ...metadata } : file));
  };

  const saveFileContent = async (fileId: string, contentOverride?: string, forceOverride = false) => {
    const content = contentOverride ?? fileContents[fileId] ?? "";
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === fileId);
    const savedAt = new Date();

    if (services && currentFile && currentFile.origin !== "new") {
      const saved = await saveEditorPreview({
        path: currentFile.path,
        content,
        projectId: editorProjectId || undefined,
      });
      if (!saved.saved) throw new Error(saved.error ?? "Save failed.");

      const savedVersion = saved.version ?? currentFile.version;
      setOpenFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                content,
                isDirty: false,
                modified: false,
                version: savedVersion,
                apiVersion: savedVersion,
                revisionId: saved.revisionId ?? file.revisionId,
                lastSavedAt: savedAt,
              }
            : file,
        ),
      );
      setTreeFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                content,
                isDirty: false,
                modified: false,
                version: savedVersion,
                apiVersion: savedVersion,
                revisionId: saved.revisionId ?? file.revisionId,
                lastSavedAt: savedAt,
              }
            : file,
        ),
      );
      return;
    }

    const saved = await apiJson<{ id: string; version: number; revisionId?: string }>(`/v1/files/${currentFile?.apiFileId || fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ content, expectedVersion: currentFile?.apiVersion ?? currentFile?.version, forceOverride }),
    });
    setOpenFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, content, isDirty: false, modified: false, version: saved.version, apiVersion: saved.version, revisionId: saved.revisionId, lastSavedAt: savedAt } : file,
      ),
    );
    setTreeFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, content, isDirty: false, modified: false, version: saved.version, apiVersion: saved.version, revisionId: saved.revisionId, lastSavedAt: savedAt } : file,
      ),
    );
  };

  const saveLocalFileToProject = async (fileId: string, path?: string) => {
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === fileId);
    if (!currentFile) throw new Error("File is no longer open");

    const promotedPath = path || currentFile.path;
    const content = fileContents[fileId] ?? currentFile.content;

    if (services) {
      let projectId = editorProjectId;
      if (!projectId) {
        const db = await getDB();
        const firstProject = await db.select().from(schema.projects).limit(1);
        projectId = firstProject[0]?.id ?? "";
      }
      if (!projectId) throw new Error("No editor project is available");

      const created = await services.files.createFile({
        projectId,
        path: promotedPath,
        content,
        language: currentFile.language,
      });

      const promoted = {
        ...currentFile,
        id: created.id,
        name: promotedPath.split("/").pop() || currentFile.name,
        path: promotedPath,
        apiFileId: created.id,
        origin: "api" as const,
        version: created.version,
        revisionId: created.id,
        lastSavedAt: new Date(),
        content,
        modified: false,
        isDirty: false,
      };

      setFileContents((prev) => {
        const next: Record<string, string> = { ...prev, [created.id]: content };
        delete next[fileId];
        return next;
      });
      setOpenFiles((prev) => prev.map((file) => file.id === fileId ? promoted : file));
      setTreeFiles((prev) => prev.map((file) => file.id === fileId ? promoted : file));
      if (activeFileId === fileId) setActiveFileId(created.id);
      return;
    }

    const projectId = editorProjectId || (await apiJson<{ projects: { id: string }[] }>("/v1/projects")).projects[0]?.id;
    if (!projectId) throw new Error("No editor project is available");
    const created = await apiJson<{ id: string; version?: number }>(`/v1/projects/${projectId}/files`, { method: "POST", body: JSON.stringify({ path: promotedPath, content: "", language: currentFile.language }) });
    const saved = await apiJson<{ version: number; revisionId?: string }>(`/v1/files/${created.id}`, { method: "PATCH", body: JSON.stringify({ content, expectedVersion: created.version ?? 1 }) });
    const promoted = { ...currentFile, id: created.id, name: promotedPath.split("/").pop() || currentFile.name, path: promotedPath, apiFileId: created.id, origin: "api" as const, version: saved.version, revisionId: saved.revisionId, lastSavedAt: new Date(), content, modified: false, isDirty: false };
    setFileContents((prev) => { const next: Record<string, string> = { ...prev, [created.id]: content }; delete next[fileId]; return next; });
    setOpenFiles((prev) => prev.map((file) => file.id === fileId ? promoted : file));
    setTreeFiles((prev) => prev.map((file) => file.id === fileId ? promoted : file));
    if (activeFileId === fileId) setActiveFileId(created.id);
  };

  const openFileInEditor = (file: EditorFile) => {
    setIsEditorProjectOpen(true);
    if (!openFiles.some((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFileId(file.id);
  };

  const closeFileFromEditor = (fileId: string) => {
    const remaining = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(remaining);
    if (activeFileId === fileId && remaining.length > 0) {
      setActiveFileId(remaining[remaining.length - 1]!.id);
    }
  };

  const createNewFile = async (
    name: string,
    path?: string,
    initialContent?: string,
  ) => {
    const normalizedPath = path || name;
    const fileLanguage = name.endsWith(".py") ? "python" : name.endsWith(".json") ? "json" : "typescript";

    if (services && editorProjectId) {
      try {
        const created = await services.files.createFile({
          projectId: editorProjectId,
          path: normalizedPath,
          content: initialContent || "",
          language: fileLanguage,
        });
        const newFile: EditorFile = {
          id: created.id,
          name,
          path: normalizedPath,
          content: created.content,
          language: fileLanguage,
          version: created.version,
          apiVersion: created.version,
          iconType: getIconType(name),
          origin: "api",
          apiFileId: created.id,
          revisionId: created.id,
          isLargeFile: isLargeEditorContent(created.content),
          openedAnyway: false,
          modified: false,
          isDirty: false,
        };
        setTreeFiles((prev) => [...prev, newFile]);
        setFileContents((prev) => ({ ...prev, [newFile.id]: created.content }));
        openFileInEditor(newFile);
        return;
      } catch {
        // Fall back to the in-memory/editor-only file if the browser DB is not ready yet.
      }
    }

    const newFile: EditorFile = { id: crypto.randomUUID(), name, path: normalizedPath, content: initialContent || "", language: fileLanguage, version: 1, apiVersion: 1, iconType: getIconType(name), origin: "new", isLargeFile: isLargeEditorContent(initialContent || ""), openedAnyway: false, modified: true, isDirty: true };
    setTreeFiles((prev) => [...prev, newFile]);
    setFileContents((prev) => ({
      ...prev,
      [newFile.id]: initialContent || "",
    }));
    openFileInEditor(newFile);
  };

  const deleteFile = async (fileId: string) => {
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === fileId);
    if (services && currentFile) {
      try {
        const targetId = currentFile.apiFileId || fileId;
        await services.files.deleteFile(targetId);
      } catch {
        // Keep the UI working even if a file was never persisted.
      }
    } else {
      await apiJson<void>(`/v1/files/${fileId}`, { method: "DELETE" }).catch(() => undefined);
    }
    setTreeFiles((prev) => prev.filter((f) => f.id !== fileId));
    closeFileFromEditor(fileId);
    setFileContents((prev) => {
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  };

  const loadSingleLocalFile = async (name: string, content: string) => {
    const newFile: EditorFile = { id: crypto.randomUUID(), name, path: name, content, language: name.endsWith(".py") ? "python" : "typescript", version: 1, apiVersion: 1, iconType: getIconType(name), origin: "local", isLargeFile: isLargeEditorContent(content), openedAnyway: false, modified: false };
    setTreeFiles((prev) => [...prev, newFile]);
    setFileContents((prev) => ({ ...prev, [newFile.id]: content }));
    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setLoadedProjectName(name.split(".")[0] || "local-file");
    setIsEditorProjectOpen(true);
  };

  // Real native local folder loader
  const loadUserLocalFiles = async (
    folderName: string,
    files: { name: string; path: string; content: string }[],
  ) => {
    const newTree = files.map((file): EditorFile => ({ id: crypto.randomUUID(), name: file.name, path: file.path, content: file.content, language: file.name.endsWith(".py") ? "python" : file.name.endsWith(".json") ? "json" : "typescript", version: 1, apiVersion: 1, iconType: getIconType(file.name), origin: "local", isLargeFile: isLargeEditorContent(file.content), openedAnyway: false, modified: false }));
    const newContents = Object.fromEntries(newTree.map((file, index) => [file.id, files[index]?.content || ""]));

    setLoadedProjectName(folderName);
    setTreeFiles(newTree);
    setFileContents(newContents);
    if (newTree.length > 0) {
      setOpenFiles([newTree[0]!]);
      setActiveFileId(newTree[0]!.id);
    }
    setIsEditorProjectOpen(true);
  };

  const applyDiffToActiveFile = async (newSnippet: string) => {
    if (!activeFileId) return;
    const current = fileContents[activeFileId] || "";
    const nextContent = newSnippet
      ? `${current}\n\n// Added by AI Assistant:\n${newSnippet}`
      : current;
    setFileContents((prev) => ({ ...prev, [activeFileId]: nextContent }));
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === activeFileId);

    if (services && currentFile && currentFile.origin !== "new") {
      try {
        const saved = await services.files.saveFile(currentFile.apiFileId || currentFile.id, nextContent, "AI assistant update");
        setOpenFiles((prev) =>
          prev.map((file) =>
            file.id === activeFileId ? { ...file, content: nextContent, isDirty: false, modified: false, version: saved.version, apiVersion: saved.version, revisionId: saved.id } : file,
          ),
        );
        setTreeFiles((prev) =>
          prev.map((file) =>
            file.id === activeFileId ? { ...file, content: nextContent, isDirty: false, modified: false, version: saved.version, apiVersion: saved.version, revisionId: saved.id } : file,
          ),
        );
        return;
      } catch {
        // Fall back to the REST-compatible path if the file is not yet persisted locally.
      }
    }

    const saved = await apiJson<{ version: number; revisionId?: string }>(`/v1/files/${currentFile?.apiFileId || activeFileId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: nextContent, expectedVersion: currentFile?.apiVersion ?? currentFile?.version }),
    });
    setOpenFiles((prev) =>
      prev.map((file) =>
        file.id === activeFileId ? { ...file, content: nextContent, isDirty: false, modified: false, version: saved.version, apiVersion: saved.version, revisionId: saved.revisionId } : file,
      ),
    );
    setTreeFiles((prev) =>
      prev.map((file) =>
        file.id === activeFileId ? { ...file, isDirty: false } : file,
      ),
    );
  };

  const updateRemoteCode = (code: string) => {
    setRemoteCode(code);
  };

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        user,
        login,
        loginAndLoad,
        isDataLoading,
        dataErrors,
        retryDataLoad,
        toasts,
        addToast,
        dismissToast,
        logout,
        theme,
        setTheme,
        availableThemes: THEME_PRESETS,
        repositories,
        searchRepoQuery,
        setSearchRepoQuery,
        repoFilter,
        setRepoFilter,
        addRepository,
        deleteRepository,
        toggleStarRepo,
        workspaces,
        spinUpDevbox,
        toggleWorkspaceStatus,
        deleteWorkspace,
        deployments,
        triggerNewRelease,
        rerunPipeline,
        envVars,
        addEnvVar,
        deleteEnvVar,
        toggleRevealEnvVar,
        revealAllEnvVars,
        toggleRevealAllEnvVars,
        deployOnPush,
        setDeployOnPush,
        ephemeralPr,
        setEphemeralPr,
        logs,
        clearLogs,
        addLog,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isEditorProjectOpen,
        setIsEditorProjectOpen,
        editorProjectId,
        isEditorLoading,
        editorError,
        loadEditorProject,
        loadedProjectName,
        setLoadedProjectName,
        treeFiles,
        openFiles,
        activeFileId,
        setActiveFileId,
        fileContents,
        updateFileContent,
        updateOpenFileMetadata,
        saveFileContent,
        saveLocalFileToProject,
        openFileInEditor,
        closeFileFromEditor,
        createNewFile,
        deleteFile,
        loadUserLocalFiles,
        loadSingleLocalFile,
        isFileTreeOpen,
        setIsFileTreeOpen,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        applyDiffToActiveFile,
        remoteCode,
        updateRemoteCode,
        isRemoteControlling,
        setIsRemoteControlling,
        isRemoteMuted,
        setIsRemoteMuted,
        isRemoteCameraOn,
        setIsRemoteCameraOn,
        billingCycle,
        setBillingCycle,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
