import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allWorkspaces = process.argv.includes("--all");

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
    ...options,
  });
}

const docker = run("docker", ["info"]);
if (docker.error || docker.status !== 0) {
  fail(
    "Docker is not running. Start Docker Desktop (or the Docker service on Linux), then run `make dev` or `powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1`.",
  );
}

if (!existsSync(path.join(root, ".env"))) {
  fail("`.env` was not found. Create it with `bash scripts/setup-env.sh` or `powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1`.");
}

const infrastructureChecks = [
  {
    service: "PostgreSQL",
    args: [
      "compose",
      "exec",
      "-T",
      "postgres",
      "sh",
      "-c",
      'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ],
  },
  {
    service: "Redis",
    args: ["compose", "exec", "-T", "redis", "redis-cli", "ping"],
    expectedOutput: "PONG",
  },
];

for (const check of infrastructureChecks) {
  const result = run("docker", check.args);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const isReady =
    !result.error &&
    result.status === 0 &&
    (!check.expectedOutput || output.includes(check.expectedOutput));
  if (!isReady) {
    fail(
      `${check.service} is not ready. Run \`make dev\` or \`powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1\` to start infrastructure and retry.`,
    );
  }
}

try {
  const response = await fetch("http://localhost:9000/minio/health/live", {
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch {
  fail("MinIO is not ready on localhost:9000. Run `make dev` or `powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1` to start infrastructure and retry.");
}

const generatedClient = path.join(
  root,
  "packages",
  "database",
  "node_modules",
  ".prisma",
  "client",
  "index.js",
);
if (!existsSync(generatedClient)) {
  fail("The Prisma client has not been generated. Run `pnpm generate` or the full startup command (`make dev` or the PowerShell startup script) before starting the app.");
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const turboArgs = allWorkspaces
  ? ["exec", "turbo", "run", "dev"]
  : [
      "exec",
      "turbo",
      "run",
      "dev",
      "--filter=@devpulse/web",
      "--filter=@devpulse/api",
      "--filter=@devpulse/socket",
      "--filter=@devpulse/ai",
    ];

const child = spawn(pnpm, turboArgs, {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(`ERROR: Could not start the development services: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
