import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export type SeedFile = {
  path: string;
  content: string;
  language?: string;
};

export type TestProject = {
  id: string;
  name: string;
};

export async function createTestProject(
  page: Page,
  seedFiles: SeedFile[] = [
    {
      path: "src/index.ts",
      content: "export const answer: number = 42;\n",
      language: "typescript",
    },
  ],
): Promise<TestProject> {
  const name = `e2e-test-${randomUUID()}`;
  const projectResponse = await page.request.post(`${apiURL}/v1/projects`, {
    data: { name },
  });
  expect(projectResponse.status()).toBe(201);
  const project = (await projectResponse.json()) as TestProject;

  for (const file of seedFiles) {
    const fileResponse = await page.request.post(
      `${apiURL}/v1/projects/${project.id}/files`,
      {
        data: {
          ...file,
          language: file.language ?? "plaintext",
        },
      },
    );
    expect(fileResponse.status()).toBe(201);
  }

  return project;
}

export async function openProjectInEditor(
  page: Page,
  project: TestProject,
  beforeNavigate?: () => Promise<void>,
): Promise<void> {
  await page.route("**/v1/projects", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      json: { projects: [{ id: project.id, name: project.name }] },
    });
  });

  await beforeNavigate?.();
  await page
    .getByRole("button", { name: "Editor", exact: true })
    .first()
    .click();
  await expect(page.getByRole("tree", { name: "Project files" })).toBeVisible();
  await expect(page.getByText(project.name, { exact: true })).toBeVisible();
}
