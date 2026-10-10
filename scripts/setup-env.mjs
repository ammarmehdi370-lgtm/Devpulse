import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const command = windows ? "powershell.exe" : "bash";
const args = windows
  ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/setup-env.ps1"]
  : ["scripts/setup-env.sh"];

const result = spawnSync(command, args, {
  cwd: root,
  stdio: "inherit",
  shell: windows,
});

if (result.error) {
  console.error(`ERROR: Could not run the environment setup script: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
