import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const webDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "app/**/*.spec.ts",
      "app/**/*.spec.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
    ],
    exclude: [
      "**/node_modules/**",
      "**/tests/**",
      "**/*.e2e.spec.ts",
      "**/*.e2e.spec.tsx",
      "**/playwright/**",
      "**/.next/**",
    ],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      "@": resolve(webDirectory, "src"),
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*", "src/**/*.spec.*", "src/test/**"],
    },
  },
});