export type ThemeType = "dark" | "light" | "hc";
export type ThemeGroup =
  | "Default"
  | "Dark"
  | "Light"
  | "Custom";

export interface ThemeUiTokens {
  bg: string;
  panel: string;
  surface: string;
  elevated: string;
  border: string;
  "border-strong": string;
  "border-subtle": string;
  "modal-border": string;
  text: string;
  "text-strong": string;
  "text-high": string;
  "body-text": string;
  "text-secondary": string;
  "text-body": string;
  "text-soft": string;
  "text-dim": string;
  muted: string;
  subtle: string;
  accent: string;
  "accent-hover": string;
  "accent-fg": string;
  "secondary-fg": string;
  "accent-soft": string;
  "surface-overlay": string;
  "dropdown-bg": string;
  "shell-bg": string;
  "topbar-bg": string;
  "sidebar-surface": string;
  "app-content-bg": string;
  "workbench-bg": string;
  "welcome-action-bg": string;
  "welcome-secondary-bg-start": string;
  "welcome-secondary-bg-end": string;
  "sidebar-footer-bg": string;
  "terminal-border": string;
  "editor-line-highlight": string;
  "surface-raised": string;
  "surface-hover": string;
  "surface-hover-strong": string;
  "skeleton-mid": string;
  "skeleton-strong": string;
  secondary: string;
  "accent-readable": string;
  "secondary-readable": string;
  "info-readable": string;
  "success-readable": string;
  "warning-readable": string;
  "danger-readable": string;
  tertiary: string;
  "warm-accent": string;
  danger: string;
  warning: string;
  success: string;
  info: string;
  hover: string;
  active: string;
  selection: string;
  "focus-ring": string;
  scrollbar: string;
  "scrollbar-hover": string;
  overlay: string;
  "shadow-color": string;
  "shadow-active": string;
  "shadow-shortcut": string;
  "shadow-panel": string;
  "shadow-account": string;
  "shadow-card": string;
  "shadow-card-hover": string;
  "shadow-strong": string;
  "input-bg": string;
  "input-border": string;
  "tab-active": string;
  "tab-inactive": string;
  "statusbar-bg": string;
  "statusbar-fg": string;
  "sidebar-bg": string;
  "editor-bg": string;
  "gutter-fg": string;
  "surface-card": string;
  "surface-card-alt": string;
  "surface-toolbar": string;
  "surface-control": string;
  "surface-control-hover": string;
  "surface-empty": string;
  "surface-danger": string;
  "border-control": string;
  "border-danger": string;
  "text-tertiary": string;
  "text-quiet": string;
  "text-faint": string;
  "text-placeholder": string;
  "text-danger-soft": string;
  "login-bg": string;
  "login-panel": string;
  "login-aside": string;
  "login-code-bg": string;
  "login-border": string;
  "login-input-bg": string;
  "login-input-border": string;
  "login-muted": string;
  "login-code-muted": string;
  "login-code-keyword": string;
  "login-code-string": string;
  "login-code-number": string;
  "login-border-soft": string;
  "login-border-strong": string;
  "login-text-subtle": string;
  "login-text-secondary": string;
  "login-code-comment": string;
  "login-code-line": string;
  "login-code-function": string;
  "login-code-return": string;
  "login-code-foreground": string;
  "login-divider": string;
  "login-accent-hover": string;
  "login-error": string;
  "repository-toolbar": string;
  "repository-border": string;
  "repository-focus": string;
  "workspace-diagram-bg": string;
  "workspace-surface": string;
  "workspace-border": string;
  "workspace-border-inner": string;
}

export interface ThemeSyntaxTokens {
  background: string;
  foreground: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  cursor: string;
  selection: string;
}

export interface ThemeTerminalTokens {
  ansi: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
  fg: string;
  bg: string;
  cursor: string;
  selection: string;
}

export interface ThemeMonacoTokens {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{
    token: string;
    foreground?: string;
    background?: string;
    fontStyle?: string;
  }>;
  colors: Record<string, string>;
}

export interface LegacyThemeFields {
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

export interface ThemeConfig extends LegacyThemeFields {
  group: ThemeGroup;
  type: ThemeType;
  ui: ThemeUiTokens;
  syntax: ThemeSyntaxTokens;
  terminal: ThemeTerminalTokens;
  monaco?: ThemeMonacoTokens;
}

export const DEFAULT_THEME_UI: ThemeUiTokens = {
  bg: "#09090e",
  panel: "#0c0c14",
  surface: "#141420",
  elevated: "#1c1c2b",
  border: "rgba(255, 255, 255, 0.08)",
  "border-strong": "#262638",
  "border-subtle": "rgba(255, 255, 255, 0.07)",
  "modal-border": "#303040",
  text: "#d6d6e6",
  "text-strong": "#ffffff",
  "text-high": "#f5f6f6",
  "body-text": "#f1f1f6",
  "text-secondary": "#c4c4dc",
  "text-body": "#b8b8ca",
  "text-soft": "#9ca3af",
  "text-dim": "#71718c",
  muted: "#77778f",
  subtle: "#55556d",
  accent: "#0df5c4",
  "accent-hover": "#5a50f0",
  "accent-fg": "#08110f",
  "secondary-fg": "#ffffff",
  "accent-soft": "rgba(13, 245, 196, 0.12)",
  "surface-overlay": "#111119",
  "dropdown-bg": "#11131b",
  "shell-bg": "#0a0d0e",
  "topbar-bg": "#101116",
  "sidebar-surface": "#0b0c11",
  "app-content-bg": "#08080d",
  "workbench-bg": "#0b0b12",
  "welcome-action-bg": "#151522",
  "welcome-secondary-bg-start": "#171720",
  "welcome-secondary-bg-end": "#12121a",
  "sidebar-footer-bg": "#0a0b10",
  "terminal-border": "#282a34",
  "editor-line-highlight": "#111118",
  "surface-raised": "#171724",
  "surface-hover": "#1b1b28",
  "surface-hover-strong": "#242436",
  "skeleton-mid": "#1d1d2c",
  "skeleton-strong": "#252538",
  secondary: "#6c63ff",
  "accent-readable": "#0df5c4",
  "secondary-readable": "#6c63ff",
  "info-readable": "#6c63ff",
  "success-readable": "#0df5c4",
  "warning-readable": "#ffae33",
  "danger-readable": "#f87171",
  tertiary: "#ffae33",
  "warm-accent": "#ff9e64",
  danger: "#f87171",
  warning: "#ffae33",
  success: "#0df5c4",
  info: "#6c63ff",
  hover: "rgba(255, 255, 255, 0.07)",
  active: "rgba(108, 99, 255, 0.14)",
  selection: "#8b82ff55",
  "focus-ring": "#6c63ff",
  scrollbar: "rgba(255, 255, 255, 0.15)",
  "scrollbar-hover": "rgba(255, 255, 255, 0.25)",
  overlay: "rgba(0, 0, 0, 0.7)",
  "shadow-color": "rgba(0, 0, 0, 0.4)",
  "shadow-active": "rgba(0, 0, 0, 0.2)",
  "shadow-shortcut": "rgba(0, 0, 0, 0.52)",
  "shadow-panel": "rgba(0, 0, 0, 0.22)",
  "shadow-account": "rgba(0, 0, 0, 0.18)",
  "shadow-card": "rgba(0, 0, 0, 0.2)",
  "shadow-card-hover": "rgba(0, 0, 0, 0.28)",
  "shadow-strong": "rgba(0, 0, 0, 0.62)",
  "input-bg": "rgba(255, 255, 255, 0.04)",
  "input-border": "rgba(255, 255, 255, 0.08)",
  "tab-active": "#09090f",
  "tab-inactive": "#11111a",
  "statusbar-bg": "#0c0c14",
  "statusbar-fg": "#6c6c88",
  "sidebar-bg": "#0d0d15",
  "editor-bg": "#09090f",
  "gutter-fg": "#45455c",
  "surface-card": "#12121b",
  "surface-card-alt": "#141420",
  "surface-toolbar": "#11111a",
  "surface-control": "#161622",
  "surface-control-hover": "#202030",
  "surface-empty": "#1b1b2a",
  "surface-danger": "#241719",
  "border-control": "#252536",
  "border-danger": "rgba(107, 48, 56, 0.6)",
  "text-tertiary": "#8c8ca5",
  "text-quiet": "#7e7e98",
  "text-faint": "#62627e",
  "text-placeholder": "#585870",
  "text-danger-soft": "#c08088",
  "login-bg": "#080d0d",
  "login-panel": "#0d1313",
  "login-aside": "#101817",
  "login-code-bg": "#0b1110",
  "login-border": "#263130",
  "login-input-bg": "#0a1010",
  "login-input-border": "#34403e",
  "login-muted": "#9aa9a7",
  "login-code-muted": "#5b6966",
  "login-code-keyword": "#91a7ff",
  "login-code-string": "#a7d9c2",
  "login-code-number": "#f4d58d",
  "login-border-soft": "#2a3836",
  "login-border-strong": "#34403e",
  "login-text-subtle": "#71807d",
  "login-text-secondary": "#b7c5c2",
  "login-code-comment": "#71807d",
  "login-code-line": "#5b6966",
  "login-code-function": "#f4d58d",
  "login-code-return": "#b4c1bf",
  "login-code-foreground": "#d0d9d7",
  "login-divider": "#293331",
  "login-accent-hover": "#39f8d0",
  "login-error": "#fca5a5",
  "repository-toolbar": "#11111a",
  "repository-border": "#1f1f2e",
  "repository-focus": "#6C63FF",
  "workspace-diagram-bg": "#0a0a10",
  "workspace-surface": "#101017",
  "workspace-border": "#20202e",
  "workspace-border-inner": "#1c1c2a",
};

export const getThemeFontStack = (font: string) => {
  if (font === "Inter") return '"Inter", sans-serif';
  if (font === "Space Grotesk") return '"Space Grotesk", sans-serif';
  if (font === "JetBrains Mono") return '"JetBrains Mono", monospace';
  return font;
};

const DARK_TERMINAL_ANSI: ThemeTerminalTokens["ansi"] = {
  black: "#171923",
  red: "#f07178",
  green: "#a1cf73",
  yellow: "#ffcb6b",
  blue: "#82aaff",
  magenta: "#c792ea",
  cyan: "#89ddff",
  white: "#d7d9e2",
  brightBlack: "#676e95",
  brightRed: "#f07178",
  brightGreen: "#a1cf73",
  brightYellow: "#ffcb6b",
  brightBlue: "#82aaff",
  brightMagenta: "#c792ea",
  brightCyan: "#89ddff",
  brightWhite: "#ffffff",
};

export const DEFAULT_THEME_SYNTAX: ThemeSyntaxTokens = {
  background: "#09090f",
  foreground: "#dcdceb",
  comment: "#77778f",
  keyword: "#a5a1ff",
  string: "#a1cf73",
  number: "#ffcb6b",
  cursor: "#0df5c4",
  selection: "#8b82ff55",
};

export const DEFAULT_THEME_TERMINAL: ThemeTerminalTokens = {
  ansi: { ...DARK_TERMINAL_ANSI },
  fg: "#d7d9e2",
  bg: "#0b0c11",
  cursor: "#0df5c4",
  selection: "rgba(108, 99, 255, 0.35)",
};

const colorToRgb = (color: string): [number, number, number] | null => {
  const hex = color.match(/^#([\da-f]{3,8})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length === 3 || hex.length === 4
        ? [...hex].slice(0, 3).map((channel) => channel + channel).join("")
        : hex.slice(0, 6);
    if (expanded.length !== 6) return null;
    return [
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
    ];
  }

  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  return rgb
    ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    : null;
};

const relativeLuminance = ([red, green, blue]: [
  number,
  number,
  number,
]) => {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
};

const contrastRatio = (first: string, second: string) => {
  const firstRgb = colorToRgb(first);
  const secondRgb = colorToRgb(second);
  if (!firstRgb || !secondRgb) return Number.POSITIVE_INFINITY;
  const firstLum = relativeLuminance(firstRgb);
  const secondLum = relativeLuminance(secondRgb);
  return (
    (Math.max(firstLum, secondLum) + 0.05) /
    (Math.min(firstLum, secondLum) + 0.05)
  );
};

export const ensureContrast = (foreground: string, background: string) => {
  if (contrastRatio(foreground, background) >= 4.5) return foreground;
  const backgroundLuminance = colorToRgb(background)
    ? relativeLuminance(colorToRgb(background)!)
    : 0;
  return backgroundLuminance > 0.179 ? "#000000" : "#ffffff";
};

const ensureSurfaceContrast = (foreground: string, surfaces: string[]) => {
  const foregroundContrast = surfaces.map((surface) =>
    contrastRatio(foreground, surface),
  );
  if (foregroundContrast.every((ratio) => ratio >= 4.5)) return foreground;

  const candidates = ["#000000", "#ffffff"];
  return candidates.reduce((best, candidate) => {
    const candidateScore = Math.min(
      ...surfaces.map((surface) => contrastRatio(candidate, surface)),
    );
    const bestScore = Math.min(
      ...surfaces.map((surface) => contrastRatio(best, surface)),
    );
    return candidateScore > bestScore ? candidate : best;
  });
};

const applyReadableSemanticTextTokens = (
  ui: ThemeUiTokens,
  themeId: string,
) => {
  if (themeId === "default") return;
  const surfaces = [ui.bg, ui.panel, ui.surface, ui.elevated];
  ui["accent-readable"] = ensureSurfaceContrast(ui.accent, surfaces);
  ui["secondary-readable"] = ensureSurfaceContrast(ui.secondary, surfaces);
  ui["info-readable"] = ensureSurfaceContrast(ui.info, surfaces);
  ui["success-readable"] = ensureSurfaceContrast(ui.success, surfaces);
  ui["warning-readable"] = ensureSurfaceContrast(ui.warning, surfaces);
  ui["danger-readable"] = ensureSurfaceContrast(ui.danger, surfaces);
};

const ensureFocusContrast = (foreground: string, surfaces: string[]) => {
  if (
    surfaces.every((surface) => contrastRatio(foreground, surface) >= 3)
  ) {
    return foreground;
  }
  return ["#000000", "#ffffff"].reduce((best, candidate) => {
    const candidateScore = Math.min(
      ...surfaces.map((surface) => contrastRatio(candidate, surface)),
    );
    const bestScore = Math.min(
      ...surfaces.map((surface) => contrastRatio(best, surface)),
    );
    return candidateScore > bestScore ? candidate : best;
  });
};

const toRgbString = (color: string) => {
  const rgb = colorToRgb(color);
  return rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : "13, 245, 196";
};

const darkenColor = (color: string, amount: number) => {
  const rgb = colorToRgb(color);
  if (!rgb) return color;
  return `#${rgb
    .map((channel) =>
      Math.round(channel * (1 - amount))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

const getThemeType = (type: string): ThemeType =>
  type === "light" || type === "hc" ? type : "dark";

export const createThemeModel = (
  fields: LegacyThemeFields,
  group: ThemeGroup = "Default",
  type: ThemeType = "dark",
  uiOverrides: Partial<ThemeUiTokens> = {},
): ThemeConfig => {
  const fallbackHover =
    fields.id === "default"
      ? DEFAULT_THEME_UI["accent-hover"]
      : darkenColor(fields.primary, 0.12);
  const ui: ThemeUiTokens = {
    ...DEFAULT_THEME_UI,
    accent: fields.primary,
    "accent-hover": uiOverrides["accent-hover"] || fallbackHover,
    "accent-soft": `rgba(${toRgbString(fields.primary)}, 0.12)`,
    border:
      uiOverrides.border ||
      (type === "light"
        ? "rgba(15, 23, 42, 0.12)"
        : DEFAULT_THEME_UI.border),
    hover:
      uiOverrides.hover ||
      (fields.id === "default"
        ? DEFAULT_THEME_UI.hover
        : `rgba(${toRgbString(fields.primary)}, 0.08)`),
    secondary: fields.secondary,
    tertiary: fields.tertiary,
    ...uiOverrides,
  };
  ui.text = ensureSurfaceContrast(ui.text, [ui.bg, ui.panel]);
  ui["text-strong"] = ensureSurfaceContrast(ui["text-strong"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-high"] = ensureSurfaceContrast(ui["text-high"], [
    ui.bg,
    ui.panel,
  ]);
  ui["body-text"] = ensureSurfaceContrast(ui["body-text"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-secondary"] = ensureSurfaceContrast(ui["text-secondary"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-body"] = ensureSurfaceContrast(ui["text-body"], [
    ui.bg,
    ui.panel,
  ]);
  ui["focus-ring"] = ensureFocusContrast(ui["focus-ring"], [ui.bg, ui.panel]);
  ui["accent-fg"] = ensureContrast(ui["accent-fg"], ui.accent);
  if (fields.id !== "default") {
    ui["secondary-fg"] = ensureContrast(ui["text-strong"], ui.secondary);
    applyReadableSemanticTextTokens(ui, fields.id);
  }

  if (fields.id !== "default") {
    const textSurfaces = [ui.bg, ui.panel, ui.surface, ui.elevated];
    const textTokens = [
      "text",
      "text-strong",
      "text-high",
      "body-text",
      "text-secondary",
      "text-body",
      "muted",
      "subtle",
      "text-soft",
      "text-dim",
      "text-quiet",
      "text-faint",
      "text-placeholder",
      "text-tertiary",
      "statusbar-fg",
      "gutter-fg",
    ] as const;
    textTokens.forEach((token) => {
      ui[token] = ensureSurfaceContrast(ui[token], textSurfaces);
    });
  }

  return {
    ...fields,
    group,
    type,
    ui,
    syntax: { ...DEFAULT_THEME_SYNTAX, cursor: fields.primary },
    terminal: {
      ...DEFAULT_THEME_TERMINAL,
      ansi: { ...DEFAULT_THEME_TERMINAL.ansi },
      cursor: fields.primary,
    },
  };
};

export const resolveThemeModel = (
  theme: ThemeConfig,
  _mode: "dark" | "light",
): ThemeConfig => {
  const type = getThemeType(theme.type);
  const ui: ThemeUiTokens = {
    ...DEFAULT_THEME_UI,
    ...theme.ui,
    accent: theme.primary,
    secondary: theme.secondary,
    tertiary: theme.tertiary,
  };
  ui.text = ensureSurfaceContrast(ui.text, [ui.bg, ui.panel]);
  ui["text-strong"] = ensureSurfaceContrast(ui["text-strong"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-high"] = ensureSurfaceContrast(ui["text-high"], [
    ui.bg,
    ui.panel,
  ]);
  ui["body-text"] = ensureSurfaceContrast(ui["body-text"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-secondary"] = ensureSurfaceContrast(ui["text-secondary"], [
    ui.bg,
    ui.panel,
  ]);
  ui["text-body"] = ensureSurfaceContrast(ui["text-body"], [
    ui.bg,
    ui.panel,
  ]);
  ui["focus-ring"] = ensureFocusContrast(ui["focus-ring"], [ui.bg, ui.panel]);
  ui["accent-fg"] = ensureContrast(ui["accent-fg"], ui.accent);
  if (theme.id !== "default") {
    ui["secondary-fg"] = ensureContrast(ui["text-strong"], ui.secondary);
    applyReadableSemanticTextTokens(ui, theme.id);
  }
  if (theme.id !== "default") {
    const textSurfaces = [ui.bg, ui.panel, ui.surface, ui.elevated];
    const textTokens = [
      "text",
      "text-strong",
      "text-high",
      "body-text",
      "text-secondary",
      "text-body",
      "muted",
      "subtle",
      "text-soft",
      "text-dim",
      "text-quiet",
      "text-faint",
      "text-placeholder",
      "text-tertiary",
      "statusbar-fg",
      "gutter-fg",
    ] as const;
    textTokens.forEach((token) => {
      ui[token] = ensureSurfaceContrast(ui[token], textSurfaces);
    });
  }
  return { ...theme, type, ui };
};

export const THEME_PRESETS: ThemeConfig[] = [
  createThemeModel({
    id: "default",
    name: "Cyber Mint",
    primary: "#0DF5C4",
    secondary: "#6C63FF",
    tertiary: "#FFAE33",
    neutral: "#0D1518",
    font: "Inter",
    mode: "dark",
    roundness: "rounded-lg",
  }),
];

export const DEFAULT_THEME = THEME_PRESETS[0]!;

export const BUILT_IN_THEME_IDS = [
  "default",
  "one-dark-pro",
  "dracula",
  "github-dark",
  "github-light",
  "material-palenight",
  "night-owl",
  "vscode-monokai",
  "tokyo-night",
  "ayu-mirage",
  "ayu-light",
  "cobalt2",
] as const;
