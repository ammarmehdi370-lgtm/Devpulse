import { readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];

if (mode !== "cache" && mode !== "all") {
  console.error("Usage: node scripts/clean-workspace.mjs <cache|all>");
  process.exit(2);
}

function remove(relativePath) {
  rmSync(join(root, relativePath), { recursive: true, force: true });
}

remove(".turbo");
remove("node_modules/.cache");

if (mode === "all") {
  for (const workspaceRoot of ["apps", "packages"]) {
    const absoluteRoot = join(root, workspaceRoot);
    for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        remove(join(workspaceRoot, entry.name, "node_modules"));
      }
    }
  }
  remove("node_modules");
}
