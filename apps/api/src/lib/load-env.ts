import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

function findWorkspaceRoot(startDirectory: string): string {
  let directory = path.resolve(startDirectory);
  while (!existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
    const parentDirectory = path.dirname(directory);
    if (parentDirectory === directory) return path.resolve(startDirectory);
    directory = parentDirectory;
  }
  return directory;
}

const workspaceRoot = findWorkspaceRoot(process.cwd());
const localEnvPath = path.resolve(process.cwd(), ".env");
const workspaceEnvPath = path.join(workspaceRoot, ".env");

dotenv.config({ path: localEnvPath });
if (workspaceEnvPath !== localEnvPath) {
  dotenv.config({ path: workspaceEnvPath });
}