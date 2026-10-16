import { describe, expect, it } from "vitest";
import { loadThemeLibrary } from "./themeLibrary";
import {
  DEFAULT_THEME_SYNTAX,
  DEFAULT_THEME_TERMINAL,
  DEFAULT_THEME_UI,
  DEFAULT_THEME,
  DEFAULT_THEME_ID,
  resolveThemeModel,
  THEME_PRESETS,
} from "./themeModel";

const luminance = (color: string) => {
  const value = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (!value) return null;
  const channels = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
};

const contrast = (foreground: string, background: string) => {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

describe("theme library", () => {
  it("contains exactly 13 complete themes across the requested groups", async () => {
    const themes = await loadThemeLibrary();

    expect([...THEME_PRESETS, ...themes]).toHaveLength(13);
    expect(new Set([...THEME_PRESETS, ...themes].map((theme) => theme.id)).size).toBe(13);
    expect([...THEME_PRESETS, ...themes].map((theme) => theme.name)).toEqual([
      "Muted Coast",
      "Cyber Mint",
      "One Dark Pro",
      "Dracula",
      "GitHub Dark",
      "GitHub Light",
      "Material Palenight",
      "Night Owl",
      "Monokai",
      "Tokyo Night",
      "Ayu Mirage",
      "Ayu Light",
      "Cobalt2",
    ]);
    expect(new Set([...THEME_PRESETS, ...themes].map((theme) => theme.group))).toEqual(
      new Set(["Default", "Dark", "Light"]),
    );
    expect(
      themes.every(
        (theme) =>
          !!theme.ui &&
          !!theme.syntax &&
          !!theme.terminal &&
          Object.keys(theme.terminal.ansi).length === 16,
      ),
    ).toBe(true);
  });

  it("uses Muted Coast as the default and keeps its requested palette", () => {
    const mutedCoast = THEME_PRESETS.find((theme) => theme.id === DEFAULT_THEME_ID)!;

    expect(DEFAULT_THEME).toBe(mutedCoast);
    expect(mutedCoast).toMatchObject({
      id: "muted-coast",
      name: "Muted Coast",
      type: "dark",
      group: "Default",
      ui: {
        bg: "#022B3A",
        panel: "#022B3A",
        surface: "#0A3A4C",
        elevated: "#12465A",
        "border-strong": "#2E6B7E",
        accent: "#80CBC4",
        "accent-hover": "#9ADAD3",
        "accent-fg": "#022B3A",
        secondary: "#90A4AE",
        tertiary: "#FFE082",
        "surface-hover": "#0A3A4C",
        selection: "#1B5568",
        "focus-ring": "#80CBC4",
        "editor-bg": "#022B3A",
        "editor-line-highlight": "#0A3A4C",
        "statusbar-bg": "#011E29",
        "statusbar-fg": "#B0BEC5",
      },
      syntax: {
        background: "#022B3A",
        foreground: "#CFD8DC",
        keyword: "#90A4AE",
        string: "#A5D6A7",
        function: "#80CBC4",
        variable: "#B0BEC5",
        property: "#B0BEC5",
        number: "#FFE082",
        boolean: "#FFE082",
        comment: "#546E7A",
        type: "#B2DFDB",
        cursor: "#80CBC4",
        selection: "#1B5568",
      },
      terminal: {
        bg: "#022B3A",
        fg: "#CFD8DC",
        cursor: "#80CBC4",
        selection: "#1B5568",
        ansi: {
          black: "#011E29",
          red: "#E57373",
          green: "#A5D6A7",
          yellow: "#FFE082",
          blue: "#90A4AE",
          magenta: "#B39DDB",
          cyan: "#80CBC4",
          white: "#CFD8DC",
          brightBlack: "#546E7A",
          brightRed: "#EF9A9A",
          brightGreen: "#C8E6C9",
          brightYellow: "#FFECB3",
          brightBlue: "#B0BEC5",
          brightMagenta: "#D1C4E9",
          brightCyan: "#B2DFDB",
          brightWhite: "#ECEFF1",
        },
      },
    });
  });

  it("keeps main text and accent labels readable in dark and light modes", async () => {
    const themes = [...THEME_PRESETS, ...(await loadThemeLibrary())];
    const failures: string[] = [];

    for (const theme of themes) {
      for (const mode of ["dark", "light"] as const) {
        const resolved = resolveThemeModel(theme, mode);
        for (const [label, foreground, background] of [
          ["main text", resolved.ui["text-strong"], resolved.ui.bg],
          ["panel text", resolved.ui["text-strong"], resolved.ui.panel],
          ["accent label", resolved.ui["accent-fg"], resolved.ui.accent],
        ] as const) {
          const ratio = contrast(foreground, background);
          if (ratio !== null && ratio < 4.5) {
            failures.push(`${theme.name} (${mode}) ${label}: ${ratio.toFixed(2)}:1`);
          }
        }
        for (const [surfaceName, surface] of [
          ["background", resolved.ui.bg],
          ["panel", resolved.ui.panel],
        ] as const) {
          const ratio = contrast(resolved.ui["focus-ring"], surface);
          if (ratio !== null && ratio < 3) {
            failures.push(
              `${theme.name} (${mode}) focus ring on ${surfaceName}: ${ratio.toFixed(2)}:1`,
            );
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("guards the migrated foreground token values against both surfaces", async () => {
    const themes = [...THEME_PRESETS, ...(await loadThemeLibrary())];
    const failures: string[] = [];

    for (const theme of themes) {
      for (const mode of ["dark", "light"] as const) {
        const resolved = resolveThemeModel(theme, mode);
        for (const token of [
          "text",
          "text-strong",
          "text-high",
          "body-text",
          "text-secondary",
          "text-body",
        ] as const) {
          for (const surface of [resolved.ui.bg, resolved.ui.panel]) {
            const ratio = contrast(resolved.ui[token], surface);
            if (ratio !== null && ratio < 4.5) {
              failures.push(`${theme.name} (${mode}) ${token}: ${ratio.toFixed(2)}:1`);
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps interactive text and secondary-button labels readable in the target themes", async () => {
    const targetNames = new Set([
      "GitHub Light",
      "Ayu Light",
      "Ayu Mirage",
      "Material Palenight",
      "Dracula",
      "Cyber Mint",
    ]);
    const themes = [
      ...THEME_PRESETS,
      ...(await loadThemeLibrary()),
    ].filter((theme) => targetNames.has(theme.name));
    const failures: string[] = [];
    const readableTextTokens = [
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

    for (const theme of themes) {
      const resolved = resolveThemeModel(theme, theme.type === "light" ? "light" : "dark");
      const surfaces = [
        resolved.ui.bg,
        resolved.ui.panel,
        resolved.ui.surface,
        resolved.ui.elevated,
      ];
      if (theme.id === "default") {
        expect(resolved.ui["secondary-fg"]).toBe(DEFAULT_THEME_UI["secondary-fg"]);
      }
      for (const [label, foreground, background] of [
        ["accent button label", resolved.ui["accent-fg"], resolved.ui.accent],
        ...(theme.id === "default"
          ? []
          : [["secondary button label", resolved.ui["secondary-fg"], resolved.ui.secondary] as const]),
      ] as const) {
        const ratio = contrast(foreground, background);
        if (ratio !== null && ratio < 4.5) {
          failures.push(`${theme.name} ${label}: ${ratio.toFixed(2)}:1`);
        }
      }
      if (theme.id !== "default") {
        for (const [token, foreground] of [
          ["accent-readable", resolved.ui["accent-readable"]],
          ["secondary-readable", resolved.ui["secondary-readable"]],
          ["info-readable", resolved.ui["info-readable"]],
          ["success-readable", resolved.ui["success-readable"]],
          ["warning-readable", resolved.ui["warning-readable"]],
          ["danger-readable", resolved.ui["danger-readable"]],
        ] as const) {
          for (const background of surfaces) {
            const ratio = contrast(foreground, background);
            if (ratio !== null && ratio < 4.5) {
              failures.push(`${theme.name} ${token}: ${ratio.toFixed(2)}:1`);
            }
          }
        }
        for (const token of readableTextTokens) {
          for (const background of surfaces) {
            const ratio = contrast(resolved.ui[token], background);
            if (ratio !== null && ratio < 4.5) {
              failures.push(`${theme.name} ${token}: ${ratio.toFixed(2)}:1`);
            }
          }
        }
      }
    }

    expect(themes.map((theme) => theme.name).sort()).toEqual([...targetNames].sort());
    expect(failures).toEqual([]);
  });

  it("preserves the Cyber Mint palette and syntax baseline", () => {
    const cyberMint = THEME_PRESETS.find((theme) => theme.id === "default")!;

    expect(cyberMint).toMatchObject({
      id: "default",
      name: "Cyber Mint",
      group: "Dark",
      primary: "#0DF5C4",
      secondary: "#6C63FF",
      tertiary: "#FFAE33",
      ui: {
        bg: "#09090e",
        panel: "#0c0c14",
        surface: "#141420",
        accent: "#0DF5C4",
        secondary: "#6C63FF",
        tertiary: "#FFAE33",
      },
      syntax: {
        background: "#09090f",
        foreground: "#dcdceb",
        keyword: "#a5a1ff",
        string: "#a1cf73",
      },
    });
    expect(cyberMint.ui).toEqual({
      ...DEFAULT_THEME_UI,
      accent: cyberMint.primary,
      secondary: cyberMint.secondary,
      tertiary: cyberMint.tertiary,
      "accent-soft": "rgba(13, 245, 196, 0.12)",
    });
    expect(cyberMint.syntax).toEqual({
      ...DEFAULT_THEME_SYNTAX,
      cursor: cyberMint.primary,
    });
    expect(cyberMint.terminal).toEqual({
      ...DEFAULT_THEME_TERMINAL,
      ansi: { ...DEFAULT_THEME_TERMINAL.ansi },
      cursor: cyberMint.primary,
    });
  });
});
