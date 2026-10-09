import type { Monaco } from "@monaco-editor/react";
import {
  createThemeModel,
  type ThemeConfig,
  type ThemeMonacoTokens,
  type ThemeSyntaxTokens,
  type ThemeTerminalTokens,
  type ThemeType,
  type ThemeUiTokens,
} from "../context/themeModel";

export interface MonacoThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export interface MonacoThemeDefinition {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: MonacoThemeRule[];
  colors: Record<string, string>;
}

interface VscodeTokenColor {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

interface VscodeThemeJson {
  type?: string;
  include?: string;
  colors?: Record<string, string>;
  tokenColors?: VscodeTokenColor[];
}

export interface VscodeThemeConversionOptions {
  resolveInclude?: (includePath: string) => string | Promise<string>;
}

const COLOR_MAP: Record<string, string> = {
  "editor.background": "editor.background",
  "editor.foreground": "editor.foreground",
  "editor.selectionBackground": "editor.selectionBackground",
  "editor.inactiveSelectionBackground": "editor.inactiveSelectionBackground",
  "editor.lineHighlightBackground": "editor.lineHighlightBackground",
  "editor.lineHighlightBorder": "editor.lineHighlightBorder",
  "editorCursor.foreground": "editorCursor.foreground",
  "editorLineNumber.foreground": "editorLineNumber.foreground",
  "editorLineNumber.activeForeground": "editorLineNumber.activeForeground",
  "editorGutter.background": "editorGutter.background",
  "editorIndentGuide.background": "editorIndentGuide.background1",
  "editorIndentGuide.background1": "editorIndentGuide.background1",
  "editorIndentGuide.activeBackground": "editorIndentGuide.activeBackground1",
  "editorIndentGuide.activeBackground1": "editorIndentGuide.activeBackground1",
  "editorBracketPairGuide.background1": "editorBracketPairGuide.background1",
  "editorBracketPairGuide.background2": "editorBracketPairGuide.background2",
  "editorBracketPairGuide.background3": "editorBracketPairGuide.background3",
  "editorBracketPairGuide.activeBackground1":
    "editorBracketPairGuide.activeBackground1",
  "editorBracketPairGuide.activeBackground2":
    "editorBracketPairGuide.activeBackground2",
  "editorBracketPairGuide.activeBackground3":
    "editorBracketPairGuide.activeBackground3",
  "editorBracketPairGuide.background4": "editorBracketPairGuide.background4",
  "editorBracketPairGuide.background5": "editorBracketPairGuide.background5",
  "editorBracketPairGuide.background6": "editorBracketPairGuide.background6",
  "editorBracketPairGuide.activeBackground4":
    "editorBracketPairGuide.activeBackground4",
  "editorBracketPairGuide.activeBackground5":
    "editorBracketPairGuide.activeBackground5",
  "editorBracketPairGuide.activeBackground6":
    "editorBracketPairGuide.activeBackground6",
  "editorBracketMatch.background": "editorBracketMatch.background",
  "editorBracketMatch.border": "editorBracketMatch.border",
  "editorBracketHighlight.foreground1": "editorBracketHighlight.foreground1",
  "editorBracketHighlight.foreground2": "editorBracketHighlight.foreground2",
  "editorBracketHighlight.foreground3": "editorBracketHighlight.foreground3",
  "editorBracketHighlight.foreground4": "editorBracketHighlight.foreground4",
  "editorBracketHighlight.foreground5": "editorBracketHighlight.foreground5",
  "editorBracketHighlight.foreground6": "editorBracketHighlight.foreground6",
  "editor.findMatchBackground": "editor.findMatchBackground",
  "editor.findMatchHighlightBackground": "editor.findMatchHighlightBackground",
  "editor.selectionHighlightBackground": "editor.selectionHighlightBackground",
  "editorOverviewRuler.findMatchForeground":
    "editorOverviewRuler.findMatchForeground",
  "editorWidget.background": "editorWidget.background",
  "editorWidget.border": "editorWidget.border",
  "editorWidget.foreground": "editorWidget.foreground",
  "editorHoverWidget.background": "editorHoverWidget.background",
  "editorHoverWidget.border": "editorHoverWidget.border",
  "editorHoverWidget.foreground": "editorHoverWidget.foreground",
  "editorSuggestWidget.background": "editorSuggestWidget.background",
  "editorSuggestWidget.border": "editorSuggestWidget.border",
  "editorSuggestWidget.foreground": "editorSuggestWidget.foreground",
  "editorSuggestWidget.selectedBackground":
    "editorSuggestWidget.selectedBackground",
  "editorSuggestWidget.selectedForeground":
    "editorSuggestWidget.selectedForeground",
  "editorSuggestWidget.highlightForeground":
    "editorSuggestWidget.highlightForeground",
  "editorSuggestWidget.focusHighlightForeground":
    "editorSuggestWidget.focusHighlightForeground",
  "editorSuggestWidgetStatus.foreground": "editorSuggestWidgetStatus.foreground",
};

const SCOPE_TOKEN_MAP: Array<[RegExp, string]> = [
  [/^(?:comment|punctuation\.definition\.comment)/, "comment"],
  [/^(?:string|punctuation\.definition\.string)/, "string"],
  [/^(?:constant\.numeric|number)/, "number"],
  [/^(?:entity\.name\.(?:type|class|namespace)|support\.type|support\.class|storage\.type)/, "type"],
  [/^(?:keyword|storage\.modifier)/, "keyword"],
  [/^(?:entity\.name\.function|support\.function|meta\.function)/, "function"],
  [/^(?:variable|meta\.definition\.variable)/, "variable"],
  [/^(?:entity\.name\.tag|support\.type\.property-name\.html)/, "tag"],
  [/^(?:entity\.other\.attribute-name|meta\.tag\.entity\.attribute-name)/, "attribute"],
  [/^(?:string\.regexp|constant\.character\.escape)/, "regexp"],
  [/^(?:constant\.language|support\.constant|constant\.character)/, "constant"],
  [/^(?:keyword\.operator|punctuation\.separator|punctuation\.terminator)/, "operator"],
  [/^(?:punctuation|meta\.delimiter)/, "delimiter"],
];

const stripJsonComments = (source: string): string => {
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n" || character === "\r") {
        lineComment = false;
        result += character;
      } else {
        result += " ";
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        blockComment = false;
      } else {
        result += character === "\n" || character === "\r" ? character : " ";
      }
      continue;
    }
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === "/" && next === "/") {
      lineComment = true;
      result += "  ";
      index += 1;
    } else if (character === "/" && next === "*") {
      blockComment = true;
      result += "  ";
      index += 1;
    } else {
      result += character;
    }
  }

  return result;
};

const removeTrailingCommas = (source: string): string => {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ",") {
      let lookahead = index + 1;
      while (/\s/.test(source[lookahead] ?? "")) lookahead += 1;
      if (source[lookahead] === "}" || source[lookahead] === "]") continue;
    }
    result += character;
  }

  return result;
};

const parseThemeJson = (source: string): VscodeThemeJson => {
  const parsed: unknown = JSON.parse(
    removeTrailingCommas(stripJsonComments(source)),
  );
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("VS Code theme JSON must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  if (
    record.type !== undefined &&
    record.type !== "dark" &&
    record.type !== "light" &&
    record.type !== "hc"
  ) {
    throw new Error('VS Code theme "type" must be dark, light, or hc.');
  }
  if (record.include !== undefined && typeof record.include !== "string") {
    throw new Error('VS Code theme "include" must be a path string.');
  }
  if (
    record.colors !== undefined &&
    (!record.colors ||
      typeof record.colors !== "object" ||
      Array.isArray(record.colors) ||
      Object.values(record.colors).some((color) => typeof color !== "string"))
  ) {
    throw new Error('VS Code theme "colors" must contain string values.');
  }
  if (record.tokenColors !== undefined && !Array.isArray(record.tokenColors)) {
    throw new Error('VS Code theme "tokenColors" must be an array.');
  }
  for (const [index, entry] of (
    (record.tokenColors as unknown[] | undefined) ?? []
  ).entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`VS Code tokenColors entry ${index} must be an object.`);
    }
    const token = entry as Record<string, unknown>;
    if (
      token.scope !== undefined &&
      typeof token.scope !== "string" &&
      (!Array.isArray(token.scope) ||
        token.scope.some((scope) => typeof scope !== "string"))
    ) {
      throw new Error(`VS Code tokenColors entry ${index} has an invalid scope.`);
    }
    if (
      token.settings !== undefined &&
      (!token.settings ||
        typeof token.settings !== "object" ||
        Array.isArray(token.settings) ||
        Object.values(token.settings).some(
          (value) => typeof value !== "string",
        ))
    ) {
      throw new Error(`VS Code tokenColors entry ${index} has invalid settings.`);
    }
  }
  return record as VscodeThemeJson;
};

const resolveThemeIncludes = async (
  source: string,
  options: VscodeThemeConversionOptions,
  includeChain: string[] = [],
): Promise<VscodeThemeJson> => {
  const theme = parseThemeJson(source);
  if (!theme.include) return theme;
  if (!options.resolveInclude) {
    throw new Error(
      `Theme includes "${theme.include}" but no include resolver was supplied.`,
    );
  }
  if (includeChain.includes(theme.include)) {
    throw new Error(
      `Circular VS Code theme include: ${[...includeChain, theme.include].join(" -> ")}`,
    );
  }
  if (includeChain.length >= 16) {
    throw new Error("VS Code theme includes exceed the maximum nesting depth.");
  }

  const includedSource = await options.resolveInclude(theme.include);
  const included = await resolveThemeIncludes(includedSource, options, [
    ...includeChain,
    theme.include,
  ]);
  return {
    ...included,
    ...theme,
    colors: { ...included.colors, ...theme.colors },
    tokenColors: [...(included.tokenColors ?? []), ...(theme.tokenColors ?? [])],
  };
};

const normalizeMonacoColor = (color: string) =>
  color.startsWith("#") ? color.slice(1) : color;

const getMappedToken = (scope: string): string | undefined => {
  const normalizedScope = scope.trim().split(/\s+/)[0]?.toLowerCase();
  if (!normalizedScope) return undefined;
  return SCOPE_TOKEN_MAP.find(([pattern]) => pattern.test(normalizedScope))?.[1];
};

const convertTokenColors = (
  tokenColors: VscodeTokenColor[],
): MonacoThemeRule[] => {
  const rules: MonacoThemeRule[] = [];
  for (const entry of tokenColors) {
    const scopes = Array.isArray(entry.scope)
      ? entry.scope
      : entry.scope
        ? [entry.scope]
        : [""];
    if (!entry.settings) continue;
    for (const scope of scopes) {
      const token = scope ? getMappedToken(scope) : "";
      if (!token) continue;
      rules.push({
        token,
        ...(entry.settings.foreground
          ? { foreground: normalizeMonacoColor(entry.settings.foreground) }
          : {}),
        ...(entry.settings.background
          ? { background: normalizeMonacoColor(entry.settings.background) }
          : {}),
        ...(entry.settings.fontStyle
          ? { fontStyle: entry.settings.fontStyle }
          : {}),
      });
    }
  }
  return rules;
};

export const convertVscodeThemeJson = async (
  source: string,
  options: VscodeThemeConversionOptions = {},
): Promise<MonacoThemeDefinition> => {
  const theme = await resolveThemeIncludes(source, options);
  const base =
    theme.type === "light"
      ? "vs"
      : theme.type === "hc"
        ? "hc-black"
        : "vs-dark";
  const colors: Record<string, string> = {};
  for (const [vscodeColor, monacoColor] of Object.entries(COLOR_MAP)) {
    const color = theme.colors?.[vscodeColor];
    if (color) colors[monacoColor] = color;
  }

  return {
    base,
    inherit: true,
    rules: convertTokenColors(theme.tokenColors ?? []),
    colors,
  };
};

export const registerVscodeTheme = async (
  monaco: Monaco,
  themeName: string,
  source: string,
  options: VscodeThemeConversionOptions = {},
): Promise<MonacoThemeDefinition> => {
  const converted = await convertVscodeThemeJson(source, options);
  monaco.editor.defineTheme(themeName, converted);
  return converted;
};

const getRuleForeground = (
  definition: MonacoThemeDefinition,
  tokens: string[],
  fallback: string,
) => {
  const foreground = definition.rules.find(
    (rule) => tokens.includes(rule.token) && rule.foreground,
  )?.foreground;
  return foreground ? `#${foreground}` : fallback;
};

const safeHex = (color: string, fallback: string) => {
  const match = color.match(/^#([\da-f]{6})(?:[\da-f]{2})?$/i);
  return match ? `#${match[1]}` : fallback;
};

export const convertVscodeThemeToAppTheme = async (
  source: string,
  options: VscodeThemeConversionOptions & {
    id: string;
    name: string;
  },
): Promise<ThemeConfig> => {
  const [parsed, monaco] = await Promise.all([
    resolveThemeIncludes(source, options),
    convertVscodeThemeJson(source, options),
  ]);
  const type: ThemeType =
    parsed.type === "light"
      ? "light"
      : parsed.type === "hc"
        ? "hc"
        : "dark";
  const fallbackBackground = type === "light" ? "#ffffff" : "#09090e";
  const fallbackForeground = type === "light" ? "#242938" : "#d6d6e6";
  const background = safeHex(
    monaco.colors["editor.background"] ?? fallbackBackground,
    fallbackBackground,
  );
  const foreground = safeHex(
    monaco.colors["editor.foreground"] ?? fallbackForeground,
    fallbackForeground,
  );
  const accent = safeHex(
    monaco.colors["editorCursor.foreground"] ??
      getRuleForeground(monaco, ["keyword", "function", "type"], "#0df5c4"),
    "#0df5c4",
  );
  const secondary = safeHex(
    monaco.colors["editor.findMatchBackground"] ??
      getRuleForeground(monaco, ["type", "function", "constant"], "#6c63ff"),
    "#6c63ff",
  );
  const tertiary = safeHex(
    getRuleForeground(monaco, ["number", "string"], "#ffae33"),
    "#ffae33",
  );
  const surface = safeHex(
    monaco.colors["editor.lineHighlightBackground"] ??
      monaco.colors["editorWidget.background"] ??
      (type === "light" ? "#f1f5f9" : "#141420"),
    type === "light" ? "#f1f5f9" : "#141420",
  );
  const muted = safeHex(
    monaco.colors["editorLineNumber.foreground"] ??
      getRuleForeground(monaco, ["comment"], "#77778f"),
    "#77778f",
  );
  const ui: Partial<ThemeUiTokens> = {
    bg: background,
    panel: safeHex(monaco.colors["editorWidget.background"] ?? surface, surface),
    surface,
    elevated: surface,
    "editor-bg": background,
    "app-content-bg": background,
    "workbench-bg": background,
    "shell-bg": background,
    "topbar-bg": surface,
    "sidebar-surface": surface,
    "sidebar-bg": surface,
    "sidebar-footer-bg": surface,
    "surface-overlay": surface,
    "surface-raised": surface,
    "dropdown-bg": safeHex(
      monaco.colors["editorSuggestWidget.background"] ?? surface,
      surface,
    ),
    "tab-active": background,
    "tab-inactive": surface,
    "statusbar-bg": surface,
    "statusbar-fg": muted,
    "gutter-fg": safeHex(
      monaco.colors["editorLineNumber.foreground"] ?? muted,
      muted,
    ),
    "editor-line-highlight": safeHex(
      monaco.colors["editor.lineHighlightBackground"] ?? surface,
      surface,
    ),
    text: foreground,
    "text-strong": foreground,
    "text-high": foreground,
    "body-text": foreground,
    "text-secondary": foreground,
    "text-body": foreground,
    muted,
    subtle: muted,
    accent,
    secondary,
    tertiary,
    "focus-ring": accent,
    "accent-hover": secondary,
    "accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
    selection: monaco.colors["editor.selectionBackground"] ?? secondary,
  };
  const theme = createThemeModel(
    {
      id: options.id,
      name: options.name,
      primary: accent,
      secondary,
      tertiary,
      neutral: background,
      font: "Inter",
      mode: type,
      roundness: "rounded-lg",
    },
    "Custom",
    type,
    ui,
  );
  const syntax: ThemeSyntaxTokens = {
    background,
    foreground,
    comment: getRuleForeground(monaco, ["comment"], muted),
    keyword: getRuleForeground(monaco, ["keyword"], accent),
    string: getRuleForeground(monaco, ["string"], "#a1cf73"),
    number: getRuleForeground(monaco, ["number"], tertiary),
    cursor: monaco.colors["editorCursor.foreground"] ?? accent,
    selection:
      monaco.colors["editor.selectionBackground"] ??
      `color-mix(in srgb, ${secondary} 38%, transparent)`,
  };
  const terminal: ThemeTerminalTokens = {
    ansi: {
      black: background,
      red: "#e06c75",
      green: syntax.string,
      yellow: tertiary,
      blue: secondary,
      magenta: accent,
      cyan: "#56b6c2",
      white: foreground,
      brightBlack: muted,
      brightRed: "#ff7b72",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#ffffff",
    },
    fg: foreground,
    bg: background,
    cursor: syntax.cursor,
    selection:
      monaco.colors["editor.selectionBackground"] ??
      `color-mix(in srgb, ${secondary} 38%, transparent)`,
  };
  return {
    ...theme,
    syntax,
    terminal,
    monaco: monaco as ThemeMonacoTokens,
  };
};
