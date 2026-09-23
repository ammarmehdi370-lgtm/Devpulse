import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const shimDirectory = join(scriptDirectory, "bin");
const pathSeparator = process.platform === "win32" ? ";" : ":";
const env = {
  ...process.env,
  PATH: `${shimDirectory}${pathSeparator}${process.env.PATH ?? ""}`,
};

const turboArgs = process.argv
  .slice(2)
  .map((argument) =>
    argument === "--filter=web" ? "--filter=@devpulse/web" : argument,
  );

const turboPath = join(
  scriptDirectory,
  "..",
  "node_modules",
  "turbo",
  "bin",
  "turbo",
);
const child = spawn(process.execPath, [turboPath, ...turboArgs], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
