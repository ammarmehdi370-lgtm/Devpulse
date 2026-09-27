import { expect, test } from "@playwright/test";
import { startEditor } from "./fixtures/editor";

test("API files have no origin badge and auto-save edits", async ({ page }) => {
  await startEditor(page);
  const tab = page.getByRole("tab", { name: /index\.ts/ });
  await expect(tab).toBeVisible();
  await expect(tab.getByText("local")).toHaveCount(0);
  await expect(tab.getByText("unsaved")).toHaveCount(0);
  await expect(page.getByText("local file", { exact: true })).toHaveCount(0);

  const saveRequest = page.waitForRequest(
    (request) => request.method() === "PATCH" && /\/v1\/files\//.test(request.url()),
  );
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// autosave check");
  await expect(saveRequest).resolves.toBeTruthy();
});

test("LOCAL file is marked and is not auto-saved", async ({ page }) => {
  let patchRequests = 0;
  await startEditor(page, [], async () => {
    await page.route("**/v1/files/**", async (route) => {
      if (route.request().method() === "PATCH") patchRequests += 1;
      await route.continue();
    });
  });
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Files" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "local.ts",
    mimeType: "text/plain",
    buffer: Buffer.from("export const localValue = 1;\n"),
  });

  const tab = page.getByRole("tab", { name: /local\.ts/ });
  await expect(tab.getByText("local", { exact: true })).toBeVisible();
  const treeFile = page.getByRole("treeitem", { name: /local\.ts/ });
  await expect(treeFile).toBeVisible();
  await expect(treeFile.getByText("local.ts")).toHaveClass(/italic/);
  await expect(page.getByText("local file", { exact: true })).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// local edit");
  await page.waitForTimeout(2_200);
  expect(patchRequests).toBe(0);
});

test("NEW file has an unsaved badge and Ctrl+S opens its path prompt", async ({ page }) => {
  await startEditor(page);
  await page.getByTitle("New file").click();
  await page.getByPlaceholder("src/index.ts").fill("draft.ts");
  await page.getByRole("button", { name: "Create", exact: true }).click();

  const tab = page.getByRole("tab", { name: /draft\.ts/ });
  await expect(tab.getByText("unsaved", { exact: true })).toBeVisible();
  const treeFile = page.getByRole("treeitem", { name: /draft\.ts/ });
  await expect(treeFile).toBeVisible();
  await expect(treeFile.locator("span.bg-purple-400")).toBeVisible();
  await page.keyboard.press("Control+s");
  await expect(page.getByText("Give this file a name and path to save it")).toBeVisible();
});

test("modified LOCAL file triggers beforeunload", async ({ page }) => {
  await startEditor(page, []);
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Files" }).click();
  await (await chooserPromise).setFiles({
    name: "modified-local.ts",
    mimeType: "text/plain",
    buffer: Buffer.from("const original = true;\n"),
  });

  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nconst changed = true;");
  const dialogPromise = page.waitForEvent("dialog");
  const closePromise = page.close({ runBeforeUnload: true });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await closePromise;
});