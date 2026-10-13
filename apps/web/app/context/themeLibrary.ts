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
  group?: string;
  type?: "dark" | "light";
  ui?: {
    bg?: string;
    panel?: string;
    surface?: string;
    elevated?: string;
    border?: string;
    "border-strong"?: string;
    "border-subtle"?: string;
    text?: string;
    "text-secondary"?: string;
    muted?: string;
    accent?: string;
    danger?: string;
    warning?: string;
    success?: string;
    info?: string;
    hover?: string;
    active?: string;
    selection?: string;
    "focus-ring"?: string;
    "input-bg"?: string;
    "input-border"?: string;
    "statusbar-bg"?: string;
    "statusbar-fg"?: string;
    "sidebar-bg"?: string;
    "editor-bg"?: string;
    overlay?: string;
    "shell-bg"?: string;
    "topbar-bg"?: string;
    "sidebar-surface"?: string;
    "login-bg"?: string;
    "workbench-bg"?: string;
    "terminal-border"?: string;
    "editor-line-highlight"?: string;
    "surface-card"?: string;
    "surface-hover"?: string;
    "skeleton-mid"?: string;
    "skeleton-strong"?: string;
  };
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: "devpulse-night",
    name: "Devpulse Night",
    primary: "#9D6AFF",
    secondary: "#00E5C8",
    tertiary: "#4D9EFF",
    neutral: "#B8B5D8",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
    ui: {
      bg: "#11101A",
      panel: "#16152A",
      surface: "#1D1B35",
      elevated: "#242242",
      border: "#2A2850",
      "border-strong": "#3D3A70",
      "border-subtle": "#1E1C38",
      text: "#F2F0FF",
      "text-secondary": "#B8B5D8",
      muted: "#7A77A8",
      accent: "#9D6AFF",
      danger: "#FF5A7E",
      warning: "#FFB830",
      success: "#00D68F",
      info: "#4D9EFF",
      hover: "#242242",
      active: "#2D2A52",
      selection: "#3D3A70",
      "focus-ring": "#9D6AFF",
      "input-bg": "#16152A",
      "input-border": "#3D3A70",
      "statusbar-bg": "#9D6AFF",
      "statusbar-fg": "#FFFFFF",
      "sidebar-bg": "#11101A",
      "editor-bg": "#0D0B14",
      overlay: "rgba(13, 11, 20, 0.85)",
      "shell-bg": "#0D0B14",
      "topbar-bg": "#11101A",
      "sidebar-surface": "#16152A",
      "login-bg": "#0D0B14",
      "workbench-bg": "#0D0B14",
      "terminal-border": "#1E1C38",
      "editor-line-highlight": "#1D1B35",
      "surface-card": "#1D1B35",
      "surface-hover": "#242242",
      "skeleton-mid": "#1D1B35",
      "skeleton-strong": "#242242",
    },
  },
  {
    id: "devpulse-dawn",
    name: "Devpulse Dawn",
    primary: "#7C3AED",
    secondary: "#0891B2",
    tertiary: "#2563EB",
    neutral: "#3D3A60",
    font: "JetBrains Mono",
    mode: "light",
    roundness: "md",
    group: "Light",
    type: "light",
    ui: {
      bg: "#F8F6FF",
      panel: "#F0EEF8",
      surface: "#E5E3F0",
      elevated: "#DDDAEE",
      border: "#C8C5DE",
      "border-strong": "#9E9BC0",
      "border-subtle": "#E0DDEE",
      text: "#1A1830",
      "text-secondary": "#3D3A60",
      muted: "#6B6890",
      accent: "#7C3AED",
      danger: "#DC2626",
      warning: "#D97706",
      success: "#059669",
      info: "#2563EB",
      hover: "#DDDAEE",
      active: "#D5D1E8",
      selection: "#C8C5DE",
      "focus-ring": "#7C3AED",
      "input-bg": "#F8F6FF",
      "input-border": "#9E9BC0",
      "statusbar-bg": "#7C3AED",
      "statusbar-fg": "#FFFFFF",
      "sidebar-bg": "#F0EEF8",
      "editor-bg": "#F8F6FF",
      overlay: "rgba(248, 246, 255, 0.9)",
      "shell-bg": "#F8F6FF",
      "topbar-bg": "#F8F6FF",
      "sidebar-surface": "#F0EEF8",
      "login-bg": "#F8F6FF",
      "workbench-bg": "#F0EEF8",
      "terminal-border": "#E0DDEE",
      "editor-line-highlight": "#E5E3F0",
      "surface-card": "#E5E3F0",
      "surface-hover": "#DDDAEE",
      "skeleton-mid": "#E5E3F0",
      "skeleton-strong": "#DDDAEE",
    },
  },
  {
    id: "default",
    name: "Cyber Mint",
    primary: "#0DF5C4",
    secondary: "#6C63FF",
    tertiary: "#FFAE33",
    neutral: "#0D1518",
    font: "Inter",
    mode: "dark",
    roundness: "rounded-sm",
    group: "Dark",
    type: "dark",
  },
  {
    id: "dracula",
    name: "Dracula",
    primary: "#BD93F9",
    secondary: "#50FA7B",
    tertiary: "#FFB86C",
    neutral: "#282A36",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    primary: "#C678DD",
    secondary: "#61AFEF",
    tertiary: "#98C379",
    neutral: "#282C34",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    primary: "#2F81F7",
    secondary: "#7EE787",
    tertiary: "#FFB74D",
    neutral: "#0D1117",
    font: "Inter",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "github-light",
    name: "GitHub Light",
    primary: "#0969DA",
    secondary: "#1A7F37",
    tertiary: "#9A6700",
    neutral: "#FFFFFF",
    font: "Inter",
    mode: "light",
    roundness: "md",
    group: "Light",
    type: "light",
  },
  {
    id: "material-palenight",
    name: "Material Palenight",
    primary: "#8A5CF6",
    secondary: "#6BE7E7",
    tertiary: "#FFAB91",
    neutral: "#2F2B4A",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "night-owl",
    name: "Night Owl",
    primary: "#7C3AED",
    secondary: "#2DD4BF",
    tertiary: "#FBBF24",
    neutral: "#011627",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "monokai",
    name: "Monokai",
    primary: "#A6E22E",
    secondary: "#66D9EF",
    tertiary: "#FD971F",
    neutral: "#272822",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    primary: "#7AA2F7",
    secondary: "#9ECE6A",
    tertiary: "#F7768E",
    neutral: "#1A1B26",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "ayu-mirage",
    name: "Ayu Mirage",
    primary: "#FFA759",
    secondary: "#95E6CB",
    tertiary: "#73D0FF",
    neutral: "#1F2430",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
  {
    id: "ayu-light",
    name: "Ayu Light",
    primary: "#FF8F1F",
    secondary: "#00A3A3",
    tertiary: "#55B4D4",
    neutral: "#FAFAFA",
    font: "JetBrains Mono",
    mode: "light",
    roundness: "md",
    group: "Light",
    type: "light",
  },
  {
    id: "cobalt2",
    name: "Cobalt2",
    primary: "#FFC600",
    secondary: "#00E5FF",
    tertiary: "#FF5F87",
    neutral: "#193549",
    font: "JetBrains Mono",
    mode: "dark",
    roundness: "md",
    group: "Dark",
    type: "dark",
  },
];
