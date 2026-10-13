import { describe, expect, it } from "vitest";
import {
  SHORTCUTS,
  assertUniqueShortcuts,
  matchesShortcut,
} from "./shortcuts";

describe("keyboard shortcut registry", () => {
  it("assigns each key combination to only one action", () => {
    expect(assertUniqueShortcuts).not.toThrow();
  });

  it("keeps Monaco line insertion separate from Run", () => {
    expect(SHORTCUTS.find((shortcut) => shortcut.id === "monaco-insert-line-below")).toMatchObject({
      keys: ["Mod+Enter"],
      action: "monaco",
    });
    expect(SHORTCUTS.find((shortcut) => shortcut.id === "run-f5")).toMatchObject({
      keys: ["F5"],
      action: "run",
    });
    expect(SHORTCUTS.find((shortcut) => shortcut.id === "run-alt-r")).toMatchObject({
      keys: ["Mod+Alt+R"],
      action: "run",
    });
  });

  it("matches Mod shortcuts using the platform modifier", () => {
    const saveShortcut = SHORTCUTS.find(
      (shortcut) => shortcut.id === "save-file",
    )!;
    expect(
      matchesShortcut(
        {
          key: "s",
          code: "KeyS",
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
        },
        saveShortcut,
      ),
    ).toBe(true);
  });
});
