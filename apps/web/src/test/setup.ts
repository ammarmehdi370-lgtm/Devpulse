import "@testing-library/jest-dom/vitest";
import { File as NodeFile } from "node:buffer";
import { afterAll, beforeAll, vi } from "vitest";

Object.defineProperty(globalThis, "File", {
  configurable: true,
  value: NodeFile,
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: (props: Record<string, unknown>) => React.createElement("img", props),
  };
});

const originalError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning:")) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});