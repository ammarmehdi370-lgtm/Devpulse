import {
  createThemeModel,
  type ThemeConfig,
  type ThemeGroup,
  type ThemeSyntaxTokens,
  type ThemeTerminalTokens,
  type ThemeType,
  type ThemeUiTokens,
} from "./themeModel";

interface ThemePalette {
  id: string;
  name: string;
  group: Exclude<ThemeGroup, "Default" | "Custom">;
  type: ThemeType;
  accent: string;
  secondary: string;
  tertiary: string;
  background: string;
  panel: string;
  surface: string;
  elevated: string;
  foreground: string;
  muted: string;
  keyword: string;
  string: string;
  number: string;
}

const palettes: ThemePalette[] = [
  { id: "one-dark-pro", name: "One Dark Pro", group: "Dark", type: "dark", accent: "#61afef", secondary: "#c678dd", tertiary: "#e5c07b", background: "#282c34", panel: "#21252b", surface: "#2c313a", elevated: "#3a3f4b", foreground: "#abb2bf", muted: "#5c6370", keyword: "#c678dd", string: "#98c379", number: "#d19a66" },
  { id: "dracula", name: "Dracula", group: "Dark", type: "dark", accent: "#bd93f9", secondary: "#ff79c6", tertiary: "#ffb86c", background: "#282a36", panel: "#21222c", surface: "#343746", elevated: "#44475a", foreground: "#f8f8f2", muted: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9" },
  { id: "github-dark", name: "GitHub Dark", group: "Dark", type: "dark", accent: "#2f81f7", secondary: "#a371f7", tertiary: "#d29922", background: "#0d1117", panel: "#161b22", surface: "#21262d", elevated: "#30363d", foreground: "#e6edf3", muted: "#8b949e", keyword: "#ff7b72", string: "#a5d6ff", number: "#79c0ff" },
  { id: "github-light", name: "GitHub Light", group: "Light", type: "light", accent: "#0969da", secondary: "#8250df", tertiary: "#9a6700", background: "#ffffff", panel: "#f6f8fa", surface: "#eff2f5", elevated: "#d8dee4", foreground: "#1f2328", muted: "#656d76", keyword: "#cf222e", string: "#0a3069", number: "#0550ae" },
  { id: "material-palenight", name: "Material Palenight", group: "Dark", type: "dark", accent: "#c792ea", secondary: "#82aaff", tertiary: "#ffcb6b", background: "#292d3e", panel: "#232635", surface: "#32374d", elevated: "#3c425b", foreground: "#a6accd", muted: "#676e95", keyword: "#c792ea", string: "#c3e88d", number: "#f78c6c" },
  { id: "night-owl", name: "Night Owl", group: "Dark", type: "dark", accent: "#82aaff", secondary: "#c792ea", tertiary: "#ecc48d", background: "#011627", panel: "#010e1a", surface: "#08243a", elevated: "#10344c", foreground: "#d6deeb", muted: "#637777", keyword: "#c792ea", string: "#ecc48d", number: "#f78c6c" },
  { id: "vscode-monokai", name: "Monokai", group: "Dark", type: "dark", accent: "#a6e22e", secondary: "#66d9ef", tertiary: "#fd971f", background: "#272822", panel: "#1e1f1c", surface: "#34352f", elevated: "#41423a", foreground: "#f8f8f2", muted: "#90908a", keyword: "#f92672", string: "#e6db74", number: "#ae81ff" },
  { id: "tokyo-night", name: "Tokyo Night", group: "Dark", type: "dark", accent: "#7aa2f7", secondary: "#bb9af7", tertiary: "#e0af68", background: "#1a1b26", panel: "#16161e", surface: "#20212e", elevated: "#292e42", foreground: "#c0caf5", muted: "#565f89", keyword: "#bb9af7", string: "#9ece6a", number: "#ff9e64" },
  { id: "ayu-mirage", name: "Ayu Mirage", group: "Dark", type: "dark", accent: "#ffcc66", secondary: "#73d0ff", tertiary: "#d4bfff", background: "#1f2430", panel: "#191e2a", surface: "#242b38", elevated: "#2d3543", foreground: "#cbccc6", muted: "#707a8c", keyword: "#ffa759", string: "#bae67e", number: "#d4bfff" },
  { id: "ayu-light", name: "Ayu Light", group: "Light", type: "light", accent: "#ff9940", secondary: "#399ee6", tertiary: "#a37acc", background: "#fafafa", panel: "#f3f3f3", surface: "#ffffff", elevated: "#e7e7e7", foreground: "#5c6166", muted: "#8a9199", keyword: "#fa8d3e", string: "#86b300", number: "#a37acc" },
  { id: "cobalt2", name: "Cobalt2", group: "Dark", type: "dark", accent: "#ffc600", secondary: "#0088ff", tertiary: "#ff9d00", background: "#193549", panel: "#15232d", surface: "#21445b", elevated: "#2b536b", foreground: "#ffffff", muted: "#8098a8", keyword: "#ff9d00", string: "#a5ff90", number: "#ff628c" },
];

const terminalAnsi = (
  palette: ThemePalette,
): ThemeTerminalTokens["ansi"] => ({
  black: palette.background,
  red: "#e06c75",
  green: palette.string,
  yellow: palette.tertiary,
  blue: palette.secondary,
  magenta: palette.accent,
  cyan: "#56b6c2",
  white: palette.foreground,
  brightBlack: palette.muted,
  brightRed: "#ff7b72",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#ffffff",
});

const createLibraryTheme = (palette: ThemePalette): ThemeConfig => {
  const light = palette.type === "light";
  const uiOverrides: Partial<ThemeUiTokens> = {
    bg: palette.background,
    panel: palette.panel,
    surface: palette.surface,
    elevated: palette.elevated,
    "text-strong": palette.foreground,
    "text-high": palette.foreground,
    "body-text": palette.foreground,
    text: palette.foreground,
    "text-secondary": palette.foreground,
    "text-body": palette.foreground,
    muted: palette.muted,
    subtle: palette.muted,
    "app-content-bg": palette.background,
    "workbench-bg": palette.background,
    "welcome-action-bg": palette.surface,
    "welcome-secondary-bg-start": palette.surface,
    "welcome-secondary-bg-end": palette.panel,
    "shell-bg": palette.background,
    "topbar-bg": palette.panel,
    "sidebar-surface": palette.panel,
    "sidebar-bg": palette.panel,
    "sidebar-footer-bg": palette.panel,
    "surface-overlay": palette.panel,
    "surface-raised": palette.panel,
    "surface-hover": palette.elevated,
    "surface-hover-strong": palette.elevated,
    "dropdown-bg": palette.panel,
    "tab-active": palette.background,
    "tab-inactive": palette.panel,
    "statusbar-bg": palette.panel,
    "statusbar-fg": palette.muted,
    "editor-bg": palette.background,
    "gutter-fg": palette.muted,
    "editor-line-highlight": palette.surface,
    "surface-card": palette.panel,
    "surface-card-alt": palette.surface,
    "surface-toolbar": palette.panel,
    "surface-control": palette.surface,
    "surface-control-hover": palette.elevated,
    "surface-empty": palette.elevated,
    "surface-danger": light ? "#fef2f2" : `color-mix(in srgb, ${palette.background} 88%, #e06c75)`,
    "border-control": `color-mix(in srgb, ${palette.foreground} 18%, transparent)`,
    "border-danger": `color-mix(in srgb, #e06c75 42%, transparent)`,
    "text-tertiary": palette.foreground,
    "text-quiet": palette.muted,
    "text-faint": palette.muted,
    "text-placeholder": palette.muted,
    "text-danger-soft": light ? "#b42318" : "#fca5a5",
    "login-bg": palette.background,
    "login-panel": palette.panel,
    "login-aside": palette.panel,
    "login-code-bg": palette.background,
    "login-border": `color-mix(in srgb, ${palette.foreground} 18%, ${palette.background})`,
    "login-input-bg": palette.surface,
    "login-input-border": `color-mix(in srgb, ${palette.foreground} 25%, transparent)`,
    "login-muted": palette.muted,
    "login-code-muted": palette.muted,
    "login-code-keyword": palette.keyword,
    "login-code-string": palette.string,
    "login-code-number": palette.number,
    "login-border-soft": `color-mix(in srgb, ${palette.foreground} 18%, ${palette.background})`,
    "login-border-strong": `color-mix(in srgb, ${palette.foreground} 26%, ${palette.background})`,
    "login-text-subtle": palette.muted,
    "login-text-secondary": palette.foreground,
    "login-code-comment": palette.muted,
    "login-code-line": palette.muted,
    "login-code-function": palette.tertiary,
    "login-code-return": palette.foreground,
    "login-code-foreground": palette.foreground,
    "login-divider": `color-mix(in srgb, ${palette.foreground} 15%, ${palette.background})`,
    "login-accent-hover": palette.secondary,
    "login-error": light ? "#b42318" : "#fca5a5",
    "repository-toolbar": palette.panel,
    "repository-border": `color-mix(in srgb, ${palette.foreground} 15%, ${palette.background})`,
    "repository-focus": palette.accent,
    "workspace-diagram-bg": palette.background,
    "workspace-surface": palette.panel,
    "workspace-border": `color-mix(in srgb, ${palette.foreground} 14%, ${palette.background})`,
    "workspace-border-inner": `color-mix(in srgb, ${palette.foreground} 12%, ${palette.background})`,
    "input-bg": light ? palette.background : `rgba(255,255,255,0.04)`,
    "input-border": `color-mix(in srgb, ${palette.foreground} 16%, transparent)`,
    "border-strong": `color-mix(in srgb, ${palette.foreground} 22%, ${palette.background})`,
    "border-subtle": `color-mix(in srgb, ${palette.foreground} 10%, transparent)`,
    border: `color-mix(in srgb, ${palette.foreground} 14%, transparent)`,
    "modal-border": `color-mix(in srgb, ${palette.foreground} 24%, ${palette.background})`,
    accent: palette.accent,
    secondary: palette.secondary,
    tertiary: palette.tertiary,
    "accent-hover": palette.secondary,
    "accent-fg": light ? "#ffffff" : "#111318",
    "accent-soft": `color-mix(in srgb, ${palette.accent} 14%, transparent)`,
    hover: `color-mix(in srgb, ${palette.foreground} 7%, transparent)`,
    active: `color-mix(in srgb, ${palette.accent} 18%, transparent)`,
    "focus-ring": palette.accent,
    success: palette.string,
    warning: palette.tertiary,
    danger: "#e06c75",
    info: palette.secondary,
    selection: `color-mix(in srgb, ${palette.secondary} 32%, transparent)`,
    scrollbar: `color-mix(in srgb, ${palette.foreground} 24%, transparent)`,
    "scrollbar-hover": `color-mix(in srgb, ${palette.foreground} 38%, transparent)`,
    overlay: light ? "rgba(15, 23, 42, 0.45)" : "rgba(0, 0, 0, 0.7)",
    "shadow-color": light ? "rgba(15, 23, 42, 0.16)" : "rgba(0, 0, 0, 0.4)",
    "shadow-strong": light ? "rgba(15, 23, 42, 0.28)" : "rgba(0, 0, 0, 0.62)",
  };
  const theme = createThemeModel(
    {
      id: palette.id,
      name: palette.name,
      primary: palette.accent,
      secondary: palette.secondary,
      tertiary: palette.tertiary,
      neutral: palette.background,
      font: "Inter",
      mode: palette.type,
      roundness: "rounded-lg",
    },
    palette.group,
    palette.type,
    uiOverrides,
  );
  const syntax: ThemeSyntaxTokens = {
    background: palette.background,
    foreground: palette.foreground,
    comment: palette.muted,
    keyword: palette.keyword,
    string: palette.string,
    number: palette.number,
    cursor: palette.accent,
    selection: `color-mix(in srgb, ${palette.secondary} 38%, transparent)`,
  };
  const terminal: ThemeTerminalTokens = {
    ansi: terminalAnsi(palette),
    fg: palette.foreground,
    bg: palette.background,
    cursor: palette.accent,
    selection: `color-mix(in srgb, ${palette.secondary} 38%, transparent)`,
  };
  return { ...theme, syntax, terminal };
};

export const loadThemeLibrary = async () => palettes.map(createLibraryTheme);
