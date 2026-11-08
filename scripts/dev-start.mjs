#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const docker = "docker";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const infrastructure = ["postgres", "redis", "minio"];
const healthUrls = [
  ["Web", "http://localhost:3000/"],
  [
    "API",
    "http://localhost:4000/health",
    async (response) => response.ok && (await response.json()).status === "ok",
  ],
  ["Socket", "http://localhost:4001/health"],
  ["AI", "http://localhost:4002/health"],
];

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function runSync(command, args, timeout = 30_000) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout,
    shell: isWindows && command.endsWith(".cmd"),
  });
}

function commandError(result, label) {
  if (result.error) return `${label}: ${result.error.message}`;
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    return `${label} exited with code ${result.status ?? "unknown"}${detail ? `:\n${detail}` : "."}`;
  }
  return undefined;
}

function runRequired(command, args, label, timeout = 300_000) {
  const result = runSync(command, args, timeout);
  const error = commandError(result, label);
  if (error) fail(error);
  if (result.stdout?.trim()) console.log(result.stdout.trim());
}

if (!existsSync(path.join(root, ".env"))) {
  fail(
    "The .env file is missing. Run `pnpm run bootstrap` before starting the stack.",
  );
}

console.log("Checking Docker availability...");
const dockerInfo = runSync(docker, ["info"], 15_000);
if (commandError(dockerInfo, "Could not contact Docker")) {
  fail(
    "Docker is not running. Start Docker Desktop or the Docker service, then retry.",
  );
}

console.log("Starting PostgreSQL, Redis, and MinIO...");
runRequired(
  docker,
  ["compose", "up", "-d", ...infrastructure],
  "docker compose up failed",
);

function getServiceContainer(service) {
  const result = runSync(docker, ["compose", "ps", "-q", service]);
  if (result.error || result.status !== 0) return undefined;
  return result.stdout.trim().split(/\s+/)[0] || undefined;
}

function getHealth(containerId) {
  const result = runSync(docker, [
    "inspect",
    "--format",
    "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
    containerId,
  ]);
  if (result.error || result.status !== 0) return undefined;
  return result.stdout.trim();
}

function getLogs(service) {
  const result = runSync(docker, ["compose", "logs", "--tail", "30", service]);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

console.log("Waiting for infrastructure healthchecks...");
const deadline = Date.now() + 120_000;
const healthyServices = new Set();
while (healthyServices.size < infrastructure.length && Date.now() < deadline) {
  for (const service of infrastructure) {
    if (healthyServices.has(service)) continue;
    const containerId = getServiceContainer(service);
    const status = containerId ? getHealth(containerId) : undefined;
    if (status === "healthy") {
      healthyServices.add(service);
      console.log(`  ${service}: healthy`);
    } else if (
      status === "unhealthy" ||
      status === "exited" ||
      status === "dead"
    ) {
      fail(`${service} container became ${status}.\n${getLogs(service)}`);
    }
  }
  if (healthyServices.size < infrastructure.length) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}
if (healthyServices.size < infrastructure.length) {
  const pending = infrastructure.filter(
    (service) => !healthyServices.has(service),
  );
  fail(
    `Timed out waiting for healthy infrastructure services: ${pending.join(", ")}.\n` +
      pending
        .map((service) => `${service} logs:\n${getLogs(service)}`)
        .join("\n"),
  );
}

console.log("Creating the MinIO bucket...");
runRequired(
  docker,
  ["compose", "run", "--rm", "minio-init"],
  "MinIO bucket initialization failed",
);

console.log("Generating Prisma client...");
runRequired(pnpm, ["generate"], "Prisma client generation failed");

console.log("Applying Prisma migrations...");
runRequired(
  pnpm,
  ["--filter", "@devpulse/database", "exec", "prisma", "migrate", "deploy"],
  "Prisma migrate deploy failed",
);

console.log("Starting web, API, Socket.IO, and AI services...");
const child = spawn(pnpm, ["dev"], {
  cwd: root,
  stdio: "inherit",
  shell: isWindows,
});
let childExit;
child.on("error", (error) => {
  console.error(`Could not start pnpm dev: ${error.message}`);
  childExit = { code: 1 };
});
child.on("exit", (code, signal) => {
  childExit = { code: code ?? (signal ? 1 : 0), signal };
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

console.log("Waiting for API, Socket.IO, and AI health endpoints...");
const appDeadline = Date.now() + 120_000;
const pendingHealth = new Set(healthUrls.map(([name]) => name));
while (pendingHealth.size > 0 && Date.now() < appDeadline) {
  if (childExit) {
    fail(
      `pnpm dev exited before all health endpoints were ready (code ${childExit.code}).`,
    );
  }
  for (const [name, url, isHealthy = (response) => response.ok] of healthUrls) {
    if (!pendingHealth.has(name)) continue;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (await isHealthy(response)) {
        pendingHealth.delete(name);
        console.log(`  ${name}: HTTP ${response.status}`);
      }
    } catch {
      // The service may still be starting; retry until the startup deadline.
    }
  }
  if (pendingHealth.size > 0)
    await new Promise((resolve) => setTimeout(resolve, 1_000));
}

if (pendingHealth.size > 0) {
  child.kill();
  fail(
    `Timed out waiting for healthy endpoints: ${[...pendingHealth].join(", ")}. ` +
      "Check the service output above and retry.",
  );
}

await new Promise((resolve) => {
  if (childExit) return resolve();
  child.once("exit", resolve);
});
process.exitCode = childExit?.code ?? 1;
