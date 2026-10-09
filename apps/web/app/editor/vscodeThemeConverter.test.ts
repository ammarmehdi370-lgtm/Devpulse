import { describe, expect, it } from "vitest";
import {
  convertVscodeThemeJson,
  convertVscodeThemeToAppTheme,
} from "./vscodeThemeConverter";

describe("convertVscodeThemeJson", () => {
  it("parses comments and trailing commas, mapping editor colors and token scopes", async () => {
    const result = await convertVscodeThemeJson(`{
      // Theme metadata
      "type": "dark",
      "colors": {
        "editor.background": "#101010",
        "editorLineNumber.activeForeground": "#00ffaa",
        "editorSuggestWidget.background": "#202020",
      },
      "tokenColors": [
        {
          "scope": ["comment.line", "comment.block"],
          "settings": { "foreground": "#777777", "fontStyle": "italic" },
        },
        {
          "scope": "entity.name.function.ts",
          "settings": { "foreground": "#ffcc00" },
        },
      ],
    }`);

    expect(result.base).toBe("vs-dark");
    expect(result.colors).toEqual({
      "editor.background": "#101010",
      "editorLineNumber.activeForeground": "#00ffaa",
      "editorSuggestWidget.background": "#202020",
    });
    expect(result.rules).toEqual([
      { token: "comment", foreground: "777777", fontStyle: "italic" },
      { token: "comment", foreground: "777777", fontStyle: "italic" },
      { token: "function", foreground: "ffcc00" },
    ]);
  });

  it("resolves nested includes and lets the importing theme override colors", async () => {
    const result = await convertVscodeThemeJson(
      `{
        "include": "base.json",
        "type": "light",
        "colors": { "editor.background": "#ffffff" },
        "tokenColors": [
          { "scope": "string", "settings": { "foreground": "#008800" } }
        ]
      }`,
      {
        resolveInclude: (includePath) => {
          if (includePath === "base.json") {
            return `{
              "include": "syntax.json",
              "colors": { "editor.foreground": "#222222" },
            }`;
          }
          expect(includePath).toBe("syntax.json");
          return `{
            "tokenColors": [
              { "scope": "comment", "settings": { "foreground": "#777777" } }
            ]
          }`;
        },
      },
    );

    expect(result.base).toBe("vs");
    expect(result.colors).toEqual({
      "editor.background": "#ffffff",
      "editor.foreground": "#222222",
    });
    expect(result.rules).toEqual([
      { token: "comment", foreground: "777777" },
      { token: "string", foreground: "008800" },
    ]);
  });

  it("reports unresolved and circular includes rather than silently ignoring them", async () => {
    await expect(
      convertVscodeThemeJson(`{"include":"base.json"}`),
    ).rejects.toThrow("no include resolver");

    await expect(
      convertVscodeThemeJson(`{"include":"base.json"}`, {
        resolveInclude: () => `{"include":"base.json"}`,
      }),
    ).rejects.toThrow("Circular VS Code theme include");
  });

  it("builds a complete app theme and retains the Monaco definition", async () => {
    const theme = await convertVscodeThemeToAppTheme(
      `{
        "type": "light",
        "colors": {
          "editor.background": "#ffffff",
          "editor.foreground": "#202020",
          "editorCursor.foreground": "#007acc",
          "editor.selectionBackground": "#add6ff",
        },
        "tokenColors": [
          { "scope": "comment", "settings": { "foreground": "#777777" } },
          { "scope": "string", "settings": { "foreground": "#008000" } },
        ]
      }`,
      { id: "imported-example", name: "Example" },
    );

    expect(theme.group).toBe("Custom");
    expect(theme.type).toBe("light");
    expect(theme.ui.bg).toBe("#ffffff");
    expect(theme.syntax.comment).toBe("#777777");
    expect(theme.terminal.ansi.green).toBe("#008000");
    expect(theme.monaco?.base).toBe("vs");
    expect(theme.monaco?.colors["editor.background"]).toBe("#ffffff");
  });
});
