"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type PageType =
  | "login"
  | "theme"
  | "repositories"
  | "workspaces"
  | "deployments"
  | "chat"
  | "editor"
  | "remote-control"
  | "ai-studio"
  | "pricing";

export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  font: string;
  mode: string;
  roundness: string;
}
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
  modified: boolean;
  isDirty?: boolean;
}

interface AppContextType {
  page: PageType;
  setPage: (page: PageType) => void;
  user: UserProfile;
  login: (email?: string, name?: string) => void;
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
  loadEditorProject: () => Promise<void>;
  loadedProjectName: string;
  setLoadedProjectName: (name: string) => void;
  treeFiles: EditorFile[];
  openFiles: EditorFile[];
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  fileContents: Record<string, string>;
  updateFileContent: (fileId: string, content: string) => void;
  saveFileContent: (fileId: string) => Promise<void>;
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

const THEME_PRESETS: ThemeConfig[] = [
  {
    id: "default",
    name: "Default",
    primary: "#0DF5C4",
    secondary: "#6C63FF",
    tertiary: "#FFAE33",
    neutral: "#0D1518",
    font: "Inter",
    mode: "dark",
    roundness: "rounded-sm",
  },
];
const EMPTY_REPOSITORIES: Repository[] = [];
const EMPTY_WORKSPACES: WorkspaceDevbox[] = [];
const EMPTY_DEPLOYMENTS: Deployment[] = [];
const EMPTY_ENV_VARS: EnvVariable[] = [];
const EMPTY_LOGS: LogLine[] = [];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [page, setPage] = useState<PageType>("login");
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
    void fetch(`${API_BASE}/v1/me`, { credentials: "include" })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<{
              email: string;
              name?: string;
              avatarUrl?: string;
            }>)
          : null,
      )
      .then((currentUser) => {
        if (!currentUser) return;
        setUser((previous) => ({
          ...previous,
          email: currentUser.email,
          name: currentUser.name || "Devpulse User",
          avatar: currentUser.avatarUrl || previous.avatar,
          isAuthenticated: true,
        }));
        setPage("theme");
      })
      .catch(() => undefined);
  }, []);

  // Listen for keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const login = (email?: string, name?: string) => {
    setUser((prev) => ({
      ...prev,
      email: email || "alex@devpulse.dev",
      name: name || "Alex",
      isAuthenticated: true,
    }));
    setPage("theme");
  };

  const logout = () => {
    void fetch(`${API_BASE}/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser((prev) => ({ ...prev, isAuthenticated: false }));
    setPage("login");
  };

  const addRepository = async (
    repoData: Omit<
      Repository,
      "id" | "stars" | "forks" | "updatedAt" | "isStarred"
    >,
  ) => {
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
      return;
    } catch {
      // Keep the prototype usable when the API is unavailable.
    }
    const newRepo: Repository = {
      ...repoData,
      id: `repo-${Date.now()}`,
      stars: 0,
      forks: 0,
      updatedAt: "Just now",
      isStarred: false,
      devboxReady: true,
    };
    setRepositories((previous) => [newRepo, ...previous]);
  };

  const deleteRepository = async (id: string) => {
    try {
      await apiJson(`/v1/repositories/${id}`, { method: "DELETE" });
    } catch {
      /* local fallback */
    }
    setRepositories((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleStarRepo = async (id: string) => {
    const current = repositories.find((repository) => repository.id === id);
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
    } catch {
      // Keep the prototype usable when the API is unavailable.
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
    } catch {
      /* local fallback */
    }
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
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
    try {
      const deployment = await apiJson<Deployment>("/v1/deployments", {
        method: "POST",
        body: JSON.stringify({
          commitMessage: customMessage,
          author: user.handle,
        }),
      });
      setDeployments((previous) => [deployment, ...previous]);
      addLog(
        "[PIPELINE]",
        "text-violet-400",
        `Triggered release pipeline for target ${deployment.target}`,
      );
      return;
    } catch {
      // Keep the prototype usable when the API is unavailable.
    }
    const commitHashes = ["7fe32b1", "9c8821a", "e09a32c", "33fa89b"];
    const randomHash =
      commitHashes[Math.floor(Math.random() * commitHashes.length)];
    const newDep: Deployment = {
      id: `dep-${Date.now()}`,
      target: `devpulse-core-prod-release-${Math.floor(Math.random() * 900) + 100}.cpnv.app`,
      domain: "global-sub10ms-ingress",
      status: "Building",
      branch: "main",
      commitHash: randomHash || "c8ff3e8",
      commitMessage:
        customMessage ||
        `release: deploy cluster v2.4.${Math.floor(Math.random() * 90) + 10}`,
      author: user.handle,
      timestamp: "Just now",
      duration: "In progress",
    };

    setDeployments([newDep, ...deployments]);

    addLog(
      "[PIPELINE]",
      "text-violet-400",
      `Triggered release pipeline for target ${newDep.target}`,
    );
    addLog(
      "[GIT]",
      "text-cyan-400",
      `Checking out commit ${newDep.commitHash} on branch ${newDep.branch}...`,
    );

    setTimeout(() => {
      addLog(
        "[BUILD]",
        "text-amber-400",
        "Turbo cache hit: 84% layers reused. Compiling optimized edge binaries...",
      );
    }, 1200);

    setTimeout(() => {
      addLog(
        "[NETWORK]",
        "text-pink-400",
        "Warm container pool allocated. Associating TLS certificates...",
      );
    }, 2400);

    setTimeout(() => {
      addLog(
        "[HEALTH]",
        "text-emerald-400",
        "Passed cluster synthetic probes in 12ms. Zero 5xx errors.",
      );
      addLog(
        "[SUCCESS]",
        "text-emerald-300 font-bold",
        `✓ Release live at https://${newDep.target}`,
      );
      setDeployments((prev) =>
        prev.map((d) =>
          d.id === newDep.id ? { ...d, status: "Ready", duration: "28s" } : d,
        ),
      );
    }, 3800);
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
      return;
    } catch {
      // Keep the prototype usable when the API is unavailable.
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
  };

  const deleteEnvVar = async (id: string) => {
    try {
      await apiJson(`/v1/environment-variables/${id}`, { method: "DELETE" });
    } catch {
      /* local fallback */
    }
    setEnvVars((prev) => prev.filter((v) => v.id !== id));
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
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body.error || `Request failed with status ${response.status}`,
      );
    }
    return response.status === 204 ? (undefined as T) : response.json();
  };

  useEffect(() => {
    void Promise.all([
      apiJson<{
        repositories: Array<{
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
        }>;
      }>("/v1/repositories"),
      apiJson<{ devboxes: WorkspaceDevbox[] }>("/v1/devboxes"),
      apiJson<{ deployments: Deployment[] }>("/v1/deployments"),
      apiJson<{ variables: EnvVariable[] }>("/v1/environment-variables"),
    ])
      .then(
        ([
          repositoryResponse,
          devboxResponse,
          deploymentResponse,
          variableResponse,
        ]) => {
          if (repositoryResponse.repositories.length > 0)
            setRepositories(
              repositoryResponse.repositories.map((repository) => ({
                id: repository.id,
                name: repository.name,
                description: repository.description,
                language: repository.language,
                languageColor: "#3178c6",
                stars: repository.stars,
                forks: repository.forks,
                branch: repository.defaultBranch,
                lastCommit: "Persisted project",
                updatedAt: new Date(repository.updatedAt).toLocaleString(),
                isStarred: repository.isStarred,
                deployStatus:
                  repository.deployStatus as Repository["deployStatus"],
                devboxReady: repository.devboxReady,
              })),
            );
          if (devboxResponse.devboxes.length > 0)
            setWorkspaces(devboxResponse.devboxes);
          if (deploymentResponse.deployments.length > 0)
            setDeployments(deploymentResponse.deployments);
          if (variableResponse.variables.length > 0)
            setEnvVars(variableResponse.variables);
        },
      )
      .catch(() => undefined);
  }, []);

  const editorFileFromApi = (file: {
    id: string;
    path: string;
    language?: string | null;
    version?: number;
    sizeBytes?: number | null;
  }): EditorFile => ({
    id: file.id,
    name: file.path.split("/").pop() || file.path,
    path: file.path,
    content: "",
    language: file.language || "plaintext",
    version: file.version ?? 1,
    iconType: getIconType(file.path),
    origin: "api",
    apiFileId: file.id,
    sizeBytes: file.sizeBytes ?? undefined,
    modified: false,
  });

  const loadEditorProject = async () => {
    setIsEditorLoading(true);
    setEditorError("");
    try {
      const projectResponse = await apiJson<{
        projects: { id: string; name: string }[];
      }>("/v1/projects");
      let project = projectResponse.projects[0];
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
          return { file: { ...editorFileFromApi(file), content: detail.content }, content: detail.content };
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
      prev.map((f) => (f.id === fileId ? { ...f, content, isDirty: true, modified: true } : f)),
    );
    setTreeFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content, isDirty: true, modified: true } : f)));
  };

  const saveFileContent = async (fileId: string) => {
    const content = fileContents[fileId] ?? "";
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === fileId);
    const saved = await apiJson<{ id: string; version: number; revisionId?: string }>(`/v1/files/${currentFile?.apiFileId || fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ content, expectedVersion: currentFile?.version }),
    });
    const savedAt = new Date();
    setOpenFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, content, isDirty: false, modified: false, version: saved.version, revisionId: saved.revisionId, lastSavedAt: savedAt } : file,
      ),
    );
    setTreeFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, content, isDirty: false, modified: false, version: saved.version, revisionId: saved.revisionId, lastSavedAt: savedAt } : file,
      ),
    );
  };

  const saveLocalFileToProject = async (fileId: string, path?: string) => {
    const currentFile = [...openFiles, ...treeFiles].find((file) => file.id === fileId);
    if (!currentFile) throw new Error("File is no longer open");
    const projectId = editorProjectId || (await apiJson<{ projects: { id: string }[] }>("/v1/projects")).projects[0]?.id;
    if (!projectId) throw new Error("No editor project is available");
    const created = await apiJson<{ id: string; version?: number }>(`/v1/projects/${projectId}/files`, { method: "POST", body: JSON.stringify({ path: path || currentFile.path, content: "", language: currentFile.language }) });
    const content = fileContents[fileId] ?? currentFile.content;
    const saved = await apiJson<{ version: number; revisionId?: string }>(`/v1/files/${created.id}`, { method: "PATCH", body: JSON.stringify({ content, expectedVersion: created.version ?? 1 }) });
    const promotedPath = path || currentFile.path;
    const promoted = { ...currentFile, id: created.id, name: promotedPath.split("/").pop() || currentFile.name, path: promotedPath, apiFileId: created.id, origin: "api" as const, version: saved.version, revisionId: saved.revisionId, lastSavedAt: new Date(), content, modified: false, isDirty: false };
    setFileContents((prev) => { const next = { ...prev, [created.id]: content }; delete next[fileId]; return next; });
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
    const newFile: EditorFile = { id: crypto.randomUUID(), name, path: path || name, content: initialContent || "", language: name.endsWith(".py") ? "python" : name.endsWith(".json") ? "json" : "typescript", version: 1, iconType: getIconType(name), origin: "new", modified: true, isDirty: true };
    setTreeFiles((prev) => [...prev, newFile]);
    setFileContents((prev) => ({
      ...prev,
      [newFile.id]: initialContent || "",
    }));
    openFileInEditor(newFile);
  };

  const deleteFile = async (fileId: string) => {
    await apiJson<void>(`/v1/files/${fileId}`, { method: "DELETE" });
    setTreeFiles((prev) => prev.filter((f) => f.id !== fileId));
    closeFileFromEditor(fileId);
    setFileContents((prev) => {
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  };

  const loadSingleLocalFile = async (name: string, content: string) => {
    const newFile: EditorFile = { id: crypto.randomUUID(), name, path: name, content, language: name.endsWith(".py") ? "python" : "typescript", version: 1, iconType: getIconType(name), origin: "local", modified: false };
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
    const newTree = files.map((file): EditorFile => ({ id: crypto.randomUUID(), name: file.name, path: file.path, content: file.content, language: file.name.endsWith(".py") ? "python" : file.name.endsWith(".json") ? "json" : "typescript", version: 1, iconType: getIconType(file.name), origin: "local", modified: false }));
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
    await apiJson(`/v1/files/${activeFileId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: nextContent }),
    });
    setOpenFiles((prev) =>
      prev.map((file) =>
        file.id === activeFileId ? { ...file, isDirty: false } : file,
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
