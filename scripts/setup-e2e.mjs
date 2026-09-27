import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const webRequire = createRequire(resolve(root, "apps/web/package.json"));
const dotenv = webRequire("dotenv");
dotenv.config({ path: resolve(root, ".env.test"), override: false });

function run(command, args, { quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: quiet ? "ignore" : "inherit",
    shell: isWindows,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})`);
}

function check(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "ignore",
    shell: isWindows,
  });
  return result.status === 0;
}

function wait(milliseconds) {
  return new Promise((done) => setTimeout(done, milliseconds));
}

async function waitForService(label, probe, attempts, delayMs) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (check("docker", ["compose", "exec", "-T", ...probe])) return;
    console.log(`  ${label} is not ready; waiting...`);
    await wait(delayMs);
  }
  throw new Error(`${label} did not become ready in time`);
}

async function startApiIfNeeded() {
  const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";
  let apiIsListening = false;
  try {
    apiIsListening = (await fetch(`${apiURL}/health`)).ok;
  } catch {
    // Start the API below when no process is listening.
  }
  if (apiIsListening) {
    if ((await fetch(`${apiURL}/health/ready`)).ok) return;
    throw new Error(
      "An API is already listening, but it is not the test API. Stop it and retry.",
    );
  }

  console.log("Starting API service for the E2E environment...");
  const child = spawn(pnpm, ["--filter", "@devpulse/api", "dev"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "test" },
    detached: !isWindows,
    stdio: "ignore",
    shell: isWindows,
  });
  child.unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${apiURL}/health/ready`);
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await wait(2_000);
  }
  throw new Error("API did not become healthy in 60 seconds");
}

try {
  console.log("Setting up Devpulse E2E environment...");

  console.log("Installing Playwright Chromium...");
  run(pnpm, ["--dir", "apps/web", "exec", "playwright", "install", "chromium"]);
  if (process.platform === "linux")
    run(pnpm, [
      "--dir",
      "apps/web",
      "exec",
      "playwright",
      "install-deps",
      "chromium",
    ]);

  const { chromium } = webRequire("@playwright/test");
  const chromiumPath = chromium.executablePath();
  if (!existsSync(chromiumPath))
    throw new Error(`Chromium was not installed at ${chromiumPath}`);
  console.log(`Chromium installed at: ${chromiumPath}`);

  if (!check("docker", ["info"])) {
    throw new Error(
      "Docker is not running. Start Docker Desktop and try again.",
    );
  }
  console.log("Docker is running");

  console.log("Starting PostgreSQL, Redis, and MinIO...");
  run("docker", ["compose", "up", "-d", "postgres", "redis", "minio"]);
  await waitForService(
    "PostgreSQL",
    [
      "postgres",
      "pg_isready",
      "-U",
      process.env.POSTGRES_USER ?? "devpulse",
      "-d",
      process.env.POSTGRES_DB ?? "devpulse",
    ],
    60,
    2_000,
  );
  console.log("PostgreSQL is ready");
  await waitForService("Redis", ["redis", "redis-cli", "ping"], 60, 1_000);
  console.log("Redis is ready");

  console.log("Generating Prisma client and applying database migrations...");
  run(pnpm, ["--filter", "@devpulse/database", "db:generate"]);
  run(pnpm, [
    "--filter",
    "@devpulse/database",
    "exec",
    "prisma",
    "migrate",
    "deploy",
  ]);
  console.log("Seeding database...");
  run(pnpm, ["seed"]);

  await startApiIfNeeded();
  console.log("API is healthy");
  console.log("\nE2E environment ready. Run tests with: pnpm test:e2e:editor");
} catch (error) {
  console.error(
    `E2E setup failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
}
