import type { Page } from "@playwright/test";
import { loginAsDev } from "./auth";
import {
  createTestProject,
  openProjectInEditor,
  type SeedFile,
  type TestProject,
} from "./project";

export async function startEditor(
  page: Page,
  files?: SeedFile[],
  beforeOpen?: (project: TestProject) => Promise<void>,
): Promise<TestProject> {
  await loginAsDev(page);
  const project = await createTestProject(page, files);
  await openProjectInEditor(page, project, () => beforeOpen?.(project) ?? Promise.resolve());
  return project;
}