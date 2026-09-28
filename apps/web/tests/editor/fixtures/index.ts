import { test as playwrightTest, type Page } from "@playwright/test";
import { loginAsDev } from "./auth";

export { expect } from "@playwright/test";
export { loginAsDev } from "./auth";
export {
  createTestProject,
  navigateToEditor,
  openProjectInEditor,
} from "./project";
export type {
  CreateTestProjectOptions,
  SeedFile,
  TestFile,
  TestProject,
} from "./project";

export interface DevpulseFixtures {
  authenticatedPage: Page;
}

export const test = playwrightTest.extend<DevpulseFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsDev(page);
    await use(page);
  },
});

export type DevpulseTest = typeof test;