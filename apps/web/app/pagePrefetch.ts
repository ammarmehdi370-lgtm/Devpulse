import type { PageType } from "./context/AppContext";

const pageImports: Partial<Record<PageType, () => Promise<unknown>>> = {
  login: () => import("./components/LoginPage"),
  theme: () => import("./components/ThemePalettePage"),
  repositories: () => import("./components/RepositoriesPage"),
  workspaces: () => import("./components/WorkspacesPage"),
  deployments: () => import("./components/DeploymentsPage"),
  activity: () => import("./components/ActivityPage"),
  chat: () => import("./components/TeamChatPage"),
  "remote-control": () => import("./components/TeamChatPage"),
  "ai-studio": () => import("./components/FullScreenAiPage"),
  pricing: () => import("./components/PricingPage"),
  "custom-plan": () => import("./components/CustomPlanPage"),
  "cloud-core": () => import("./components/CloudCoreDashboard"),
  "api-sandbox": () => import("./components/ApiSandboxPage"),
  settings: () => import("./components/SiteSettingsPage"),
  "payment-methods": () => import("./components/PaymentMethodsPage"),
  editor: () => import("./components/EditorWorkbench"),
};

const likelyNextPages: Partial<Record<PageType, PageType[]>> = {
  login: ["theme"],
  theme: ["workspaces", "editor"],
  workspaces: ["editor", "repositories"],
  repositories: ["editor", "workspaces"],
  editor: ["repositories", "workspaces"],
  deployments: ["activity", "editor"],
  activity: ["editor", "deployments"],
  chat: ["workspaces", "editor"],
  "remote-control": ["chat"],
  "ai-studio": ["editor", "repositories"],
  pricing: ["custom-plan", "payment-methods"],
  "custom-plan": ["payment-methods", "pricing"],
  "cloud-core": ["workspaces", "settings"],
  "api-sandbox": ["editor", "repositories"],
  settings: ["theme", "payment-methods"],
  "payment-methods": ["pricing", "settings"],
};

export const prefetchPage = (page: PageType) => {
  const load = pageImports[page];
  if (load) void load();
};

export const prefetchLikelyNextPages = (page: PageType) => {
  const pages = likelyNextPages[page] ?? [];
  const prefetch = () => pages.forEach(prefetchPage);
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
  };
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(prefetch);
  } else {
    window.setTimeout(prefetch, 1);
  }
};
