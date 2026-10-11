#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const envFiles = [
  {
    file: path.join(root, ".env"),
    example: path.join(root, ".env.example"),
  },
  {
    file: path.join(root, "apps/web/.env.local"),
    example: path.join(root, "apps/web/.env.local.example"),
  },
];
const [nodeMajor, nodeMinor] = process.versions.node
  .split(".")
  .map((part) => Number.parseInt(part, 10));

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

console.log("\n=== Devpulse Browser Setup ===\n");

if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 10)) {
  fail(`Node.js 20.10+ is required (found ${process.version}).`);
}
console.log(`Node.js ${process.version}`);

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmVersion = spawnSync(pnpm, ["--version"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (pnpmVersion.error || pnpmVersion.status !== 0) {
  fail("pnpm is required. Enable it with Corepack or install pnpm 9+.");
}
const pnpmMajor = Number.parseInt(pnpmVersion.stdout.trim().split(".")[0], 10);
if (pnpmMajor < 9) {
  fail(`pnpm 9+ is required (found ${pnpmVersion.stdout.trim()}).`);
}
console.log(`pnpm ${pnpmVersion.stdout.trim()}`);

for (const { file, example } of envFiles) {
  if (fs.existsSync(file)) {
    console.log(`${path.relative(root, file)} already exists; preserving it.`);
    continue;
  }
  if (!fs.existsSync(example)) fail(`${path.relative(root, example)} was not found.`);
  fs.copyFileSync(example, file, fs.constants.COPYFILE_EXCL);
  console.log(`Created ${path.relative(root, file)} from ${path.relative(root, example)}.`);
}

const requiredFiles = [
  "apps/web/node_modules/next/dist/bin/next",
  "apps/web/node_modules/typescript/bin/tsc",
  "apps/web/node_modules/socket.io-client/package.json",
];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missingFiles.length > 0) {
  console.log(`Workspace dependencies are incomplete (${missingFiles.join(", ")}).`);
  console.log("Installing workspace dependencies...");
  const install = spawnSync(pnpm, ["install"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (install.error) fail(`Could not run pnpm install: ${install.error.message}`);
  if (install.status !== 0) fail(`pnpm install failed with exit code ${install.status ?? "unknown"}.`);
} else {
  console.log("Workspace node_modules exists; skipping dependency installation.");
}

console.log("\nSetup complete.");
console.log("Start the browser app with: pnpm dev");
console.log("Open http://localhost:3000");
console.log("PGlite and file storage run in browser storage.");
console.log("The AI Worker is a separate service; configure its secrets outside the browser app.\n");
