import type { Page } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export interface TestFile {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface TestProject {
  id: string;
  name: string;
  files: TestFile[];
}

export type SeedFile = {
  name?: string;
  path: string;
  content: string;
  language?: string;
};

export interface CreateTestProjectOptions {
  name?: string;
  files?: SeedFile[];
}

export async function createTestProject(
  page: Page,
  options: CreateTestProjectOptions | SeedFile[] = {},
): Promise<TestProject> {
  const projectOptions = Array.isArray(options) ? { files: options } : options;
  const name = projectOptions.name ?? `e2e-test-${Date.now()}`;
  const projectResponse = await page.request.post(`${apiURL}/v1/projects`, {
    data: { name, template: "blank" },
  });
  const projectBody = (await projectResponse.json()) as {
    id?: string;
    project?: { id: string };
  };
  const projectId = projectBody.project?.id ?? projectBody.id;
  if (!projectResponse.ok() || !projectId)
    throw new Error(`Project creation failed: ${projectResponse.status()}`);

  const filesToCreate = projectOptions.files ?? [
    {
      name: "index.ts",
      path: "index.ts",
      content: 'console.log("Hello from Devpulse")',
    },
    {
      name: "utils.ts",
      path: "utils.ts",
      content: "export const add = (a: number, b: number) => a + b",
    },
  ];
  const files: TestFile[] = [];

  for (const file of filesToCreate) {
    const path = file.path.replace(/^\/+/, "");
    const fileResponse = await page.request.post(
      `${apiURL}/v1/projects/${projectId}/files`,
      {
        data: { ...file, path },
      },
    );
    const fileBody = (await fileResponse.json()) as {
      id?: string;
      file?: { id: string };
    };
    const fileId = fileBody.file?.id ?? fileBody.id;
    if (!fileResponse.ok() || !fileId)
      throw new Error(`File creation failed: ${fileResponse.status()}`);
    files.push({
      id: fileId,
      name: file.name ?? path.split("/").pop() ?? path,
      path,
      content: file.content,
    });
  }

  return { id: projectId, name, files };
}

export async function navigateToEditor(
  page: Page,
  projectId: string,
): Promise<void> {
  await page.goto(`/editor?project=${encodeURIComponent(projectId)}`);
  await page.waitForFunction(
    () => {
      const monacoReady = Boolean(document.querySelector(".monaco-editor"));
      const emptyStateVisible = Array.from(document.querySelectorAll("h1, h2, h3")).some((heading) =>
        heading.textContent?.includes("No files yet"),
      );
      const projectShellReady = Boolean(
        document.querySelector('[role="tree"][aria-label="Project files"]') ||
          document.body.textContent?.includes("EXPLORER"),
      );
      return monacoReady || emptyStateVisible || projectShellReady;
    },
    undefined,
    { timeout: 20_000 },
  );
}

export async function openProjectInEditor(
  page: Page,
  project: TestProject,
  beforeNavigate?: () => Promise<void>,
): Promise<void> {
  await beforeNavigate?.();
  await navigateToEditor(page, project.id);
}
