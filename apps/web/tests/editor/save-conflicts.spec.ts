import { expect, test, type Page } from "@playwright/test";
import { startEditor } from "./fixtures/editor";

async function createVersionConflict(page: Page, forceSave?: (payload: Record<string, unknown>) => void): Promise<void> {
  await page.route("**/v1/files/**", async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    if (payload.forceOverride) {
      forceSave?.(payload);
      await route.fulfill({ json: { id: payload.fileId ?? "seed-file", version: 4 } });
      return;
    }
    await route.fulfill({
      status: 409,
      json: {
        error: "CONFLICT",
        message: "This file was modified by someone else.",
        currentVersion: 3,
        yourVersion: 1,
        lastEditedBy: "Morgan Lee",
        lastEditedAt: "2026-09-26T10:00:00.000Z",
      },
    });
  });
}

async function editAndSave(page: Page): Promise<void> {
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nexport const mine = true;");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("dialog", { name: "Save Conflict" })).toBeVisible();
}

test("version mismatch opens the conflict dialog with resolution options", async ({ page }) => {
  await startEditor(page, undefined, async () => createVersionConflict(page));
  await editAndSave(page);

  const dialog = page.getByRole("dialog", { name: "Save Conflict" });
  await expect(dialog).toContainText("Morgan Lee");
  await expect(dialog).toContainText("Server version: 3");
  await expect(dialog.getByRole("button", { name: "Keep Mine" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep Theirs" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Compare" })).toBeVisible();
});

test("Keep Mine force-saves and closes the conflict dialog", async ({ page }) => {
  let forcePayload: Record<string, unknown> | undefined;
  await startEditor(page, undefined, async () =>
    createVersionConflict(page, (payload) => { forcePayload = payload; }),
  );
  await editAndSave(page);
  await page.getByRole("button", { name: "Keep Mine" }).click();

  await expect(page.getByRole("dialog", { name: "Save Conflict" })).toHaveCount(0);
  await expect.poll(() => forcePayload?.forceOverride).toBe(true);
  await expect(page.getByText("Saved ✓", { exact: true })).toBeVisible();
});

test("Keep Theirs reloads the server version and closes the dialog", async ({ page }) => {
  await startEditor(page, undefined, async () => {
    await createVersionConflict(page);
    await page.route("**/v1/projects/*/files/*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            id: "server-file",
            path: "src/index.ts",
            name: "index.ts",
            content: "export const serverValue = 'theirs';\n",
            language: "typescript",
            version: 3,
            sizeBytes: 40,
          },
        });
        return;
      }
      await route.continue();
    });
  });
  await editAndSave(page);
  await page.getByRole("button", { name: "Keep Theirs" }).click();

  await expect(page.getByRole("dialog", { name: "Save Conflict" })).toHaveCount(0);
  await expect(page.locator(".monaco-editor")).toContainText("serverValue");
  await expect(page.getByRole("tab", { name: /index\.ts/ }).getByText("unsaved")).toHaveCount(0);
});