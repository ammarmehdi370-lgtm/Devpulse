import { expect, test } from "@playwright/test";
import { loginAsDev } from "./fixtures/auth";
import { createTestProject } from "./fixtures/project";
import { startEditor } from "./fixtures/editor";

test("project loading skeleton remains visible while the API is delayed", async ({ page }) => {
  await loginAsDev(page);
  const project = await createTestProject(page);
  await page.route("**/v1/projects", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await page.waitForTimeout(2_000);
    await route.fulfill({ json: { projects: [{ id: project.id, name: project.name }] } });
  });
  const editorButton = page.getByRole("button", { name: "Editor", exact: true }).first();
  await editorButton.click();

  await expect(page.getByLabel("Loading project files")).toBeVisible();
  await expect(page.getByText("Loading your project...")).toBeVisible();
  await expect(page.getByRole("tree", { name: "Project files" })).toBeVisible({ timeout: 10_000 });
});

test("empty project offers file creation, upload, and folder actions", async ({ page }) => {
  await startEditor(page, []);
  await expect(page.getByRole("heading", { name: "No files yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New File" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload Files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Folder" })).toBeVisible();
});

test("closing the last tab shows recent files and allows reopening one", async ({ page }) => {
  const names = Array.from({ length: 6 }, (_, index) => `recent-${index + 1}.ts`);
  await startEditor(page, names.map((name) => ({
    path: name,
    content: `export const ${name.replace(/[^a-z\d]/gi, "_")} = true;`,
    language: "typescript",
  })));
  for (const name of names) {
    await page.getByRole("treeitem", { name, exact: true }).click();
  }
  while (await page.getByRole("tab").count()) {
    const tab = page.getByRole("tab").first();
    await tab.hover();
    await tab.locator("span").last().click();
  }

  await expect(page.getByRole("heading", { name: "Recent files" })).toBeVisible();
  for (const name of names.slice(1).reverse()) {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /recent-1\.ts/ })).toHaveCount(0);
  const recentFile = page.getByRole("button", { name: /recent-6\.ts/ });
  await expect(recentFile).toBeVisible();
  await recentFile.click();
  await expect(page.getByRole("tab", { name: "recent-6.ts" })).toBeVisible();
});

test("project load error offers retry and offline mode", async ({ page }) => {
  await loginAsDev(page);
  const project = await createTestProject(page);
  await page.route("**/v1/projects", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 500, json: { error: "Service unavailable" } });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Editor", exact: true }).first().click();

  await expect(page.getByRole("heading", { name: "Could not load project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.getByRole("button", { name: "Work Offline" }).click();
  await expect(page.getByRole("button", { name: "Open Folder" })).toBeVisible();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open Folder" }).click();
  await (await chooserPromise).setFiles([{
    name: "offline.ts",
    mimeType: "text/plain",
    buffer: Buffer.from("export const offline = true;"),
  }]);
  await expect(page.getByRole("treeitem", { name: /offline\.ts/ })).toBeVisible();
  expect(project.id).toBeTruthy();
});

test("large local file shows a warning and can be opened", async ({ page }) => {
  await startEditor(page, []);
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Files" }).click();
  await (await chooserPromise).setFiles({
    name: "large-sample.ts",
    mimeType: "text/plain",
    buffer: Buffer.from("x".repeat(520 * 1024)),
  });

  const warning = page.getByRole("alert");
  await expect(warning).toContainText("Large file");
  await expect(warning.getByRole("button", { name: "Open anyway" })).toBeVisible();
  await expect(warning.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(page.getByText("plaintext", { exact: true })).toBeVisible();
  await warning.getByRole("button", { name: "Open anyway" }).click();
  await expect(page.getByRole("tab", { name: /large-sample\.ts/ })).toBeVisible();
  const aiInput = page.getByRole("textbox", { name: /Ask Devpulse AI/ });
  await expect(aiInput).toHaveAttribute("aria-disabled", "true");
  await expect(aiInput.locator("xpath=..").getByRole("button")).toBeDisabled();
});