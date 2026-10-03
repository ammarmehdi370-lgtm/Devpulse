import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({
  path: resolve(process.cwd(), "../../.env.test"),
});

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? undefined : 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @devpulse/api dev",
      url: `${apiURL}/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        API_START_SERVER: "true",
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql://devpulse:devpulse@localhost:5433/devpulse?schema=public",
        DIRECT_DATABASE_URL:
          process.env.DIRECT_DATABASE_URL ??
          "postgresql://devpulse:devpulse@localhost:5433/devpulse?schema=public",
        REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
        TEST_CLEANUP_SECRET: process.env.TEST_CLEANUP_SECRET ?? "e2e-secret",
      },
    },
    {
      command: "pnpm --filter @devpulse/web dev",
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
});
