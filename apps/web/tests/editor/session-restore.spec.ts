import { expect, test, type Page } from "@playwright/test";
import { startEditor } from "./fixtures/editor";
import type { TestProject } from "./fixtures/project";

const files = [
  { path: "src/a.ts", content: "export const a = 1;", language: "typescript" },
  { path: "src/b.ts", content: "export const b = 2;", language: "typescript" },
  { path: "src/c.ts", content: "export const c = 3;", language: "typescript" },
];

async function reenterEditor(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continue to Repositories" }).click();
  await page.getByRole("button", { name: "Editor", exact: true }).first().click();
}

async function mockSession(page: Page, project: TestProject, ids: string[], activeId: string): Promise<void> {
  await page.route(`**/v1/editor/session/${project.id}`, (route) => route.fulfill({
    json: {
      session: { openFileIds: ids, activeFileId: activeId },
      openFileIds: ids,
      activeFileId: activeId,
      scrollPositions: {},
      cursorPositions: {},
    },
  }));
}

test("refresh restores open tabs and the active file", async ({ page }) => {
  let ids: string[] = [];
  let projectId = "";
  await startEditor(page, files, async (project) => {
    projectId = project.id;
    const response = await page.request.get(`http://localhost:4000/v1/projects/${project.id}/files`);
    ids = ((await response.json()) as { files: { id: string }[] }).files.map((file) => file.id);
    await mockSession(page, project, ids, ids[1]!);
  });

  await page.reload();
  await reenterEditor(page);
  for (const name of ["a.ts", "b.ts", "c.ts"]) {
    await expect(page.getByRole("tab", { name })).toBeVisible();
  }
  await expect(page.getByRole("tab", { name: "b.ts" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("status")).toContainText("Restored your last session");
  expect(projectId).toBeTruthy();
});

test("refresh restores API files but not local files", async ({ page }) => {
  let apiFileId = "";
  await startEditor(page, undefined, async (project) => {
    const response = await page.request.get(`http://localhost:4000/v1/projects/${project.id}/files`);
    apiFileId = ((await response.json()) as { files: { id: string }[] }).files[0]!.id;
    await mockSession(page, project, [apiFileId], apiFileId);
  });

  const apiTab = page.getByRole("tab", { name: /index\.ts/ });
  await apiTab.hover();
  await apiTab.locator("span").last().click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Open local file/ }).click();
  await (await chooserPromise).setFiles({
    name: "local-only.ts",
    mimeType: "text/plain",
    buffer: Buffer.from("export const localOnly = true;"),
  });
  await expect(page.getByRole("tab", { name: /local-only\.ts/ })).toBeVisible();
  await page.reload();
  await reenterEditor(page);

  await expect(page.getByRole("tab", { name: /index\.ts/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /local-only\.ts/ })).toHaveCount(0);
  expect(apiFileId).toBeTruthy();
});

test("session restore skips missing file IDs and reports the count", async ({ page }) => {
  let existingIds: string[] = [];
  await startEditor(page, files, async (project) => {
    const response = await page.request.get(`http://localhost:4000/v1/projects/${project.id}/files`);
    existingIds = ((await response.json()) as { files: { id: string }[] }).files.map((file) => file.id);
    await page.route(`**/v1/projects/${project.id}/files`, async (route) => {
      const body = await route.fetch();
      const data = (await body.json()) as { project: unknown; files: unknown[] };
      await route.fulfill({ json: { ...data, files: data.files.slice(0, 2) } });
    });
    await mockSession(page, project, existingIds, existingIds[0]!);
  });
  await page.reload();
  await reenterEditor(page);

  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("1 of 3 files could not be restored");
  expect(existingIds).toHaveLength(3);
});