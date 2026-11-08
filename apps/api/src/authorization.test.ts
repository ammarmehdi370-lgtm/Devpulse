import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("@devpulse/database", () => {
  const project = {
    id: "project-a",
    workspaceId: "workspace-a",
    name: "Project A",
  };
  const file = {
    id: "cmf1234567890123456789012",
    projectId: project.id,
    path: "main.js",
    content: "console.log('hello')",
    language: "javascript",
    sizeBytes: 20,
    version: 1,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastEditedBy: null,
    lastEditedAt: null,
    project,
  };

  return {
    db: {
      project: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === project.id ? project : null,
        ),
        findMany: vi.fn(async () => []),
      },
      file: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === file.id ? file : null,
        ),
        findMany: vi.fn(async () => []),
      },
      workspaceMember: {
        findUnique: vi.fn(
          async ({
            where,
          }: {
            where: { workspaceId_userId: { userId: string; workspaceId: string } };
          }) =>
            where.workspaceId_userId.userId === "user-a" &&
            where.workspaceId_userId.workspaceId === project.workspaceId
              ? { role: "OWNER" }
              : null,
        ),
      },
      codeExecution: {
        create: vi.fn(async () => ({ id: "execution-a" })),
      },
    },
  };
});

vi.mock("./lib/jwt.js", () => ({
  verifyToken: vi.fn(async (token: string) => {
    if (token !== "user-a-token" && token !== "user-b-token")
      throw new Error("Invalid test token");
    const userId = token === "user-a-token" ? "user-a" : "user-b";
    return {
      sub: userId,
      email: `${userId}@example.com`,
      name: userId,
      workspaceId: "workspace-a",
      plan: "free",
    };
  }),
  initKeys: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn((...args: unknown[]) => {
    const callback = args[3] as (
      error: Error | null,
      stdout: string,
      stderr: string,
    ) => void;
    const stdin = {
      on: () => stdin,
      end: () => undefined,
    };
    queueMicrotask(() => callback(null, "execution output", ""));
    return { stdin };
  }),
}));

import { app } from "./index.js";
import {
  isPublicV1Route,
  loadFileForUser,
  loadProjectForUser,
  requireAuth,
} from "./middleware/auth.js";

interface RouteLayer {
  handle?: unknown;
  route?: {
    path?: string | string[];
    stack: Array<{ handle: unknown }>;
  };
}

interface ExpressAppStack {
  _router?: { stack: RouteLayer[] };
}

const ownerToken = "Bearer user-a-token";
const otherUserToken = "Bearer user-b-token";
const projectPath = "/v1/projects/project-a/files";
const fileId = "cmf1234567890123456789012";

describe("v1 authorization", () => {
  it("applies the default-deny auth gate to every v1 route", () => {
    const stack = (app as unknown as ExpressAppStack)._router?.stack ?? [];
    const authIndex = stack.findIndex((layer) => layer.handle === requireAuth);
    const routes = stack.flatMap((layer, index) => {
      if (!layer.route) return [];
      const paths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      return paths
        .filter((path): path is string => path?.startsWith("/v1") === true)
        .map((path) => ({ index, path, handlers: layer.route!.stack }));
    });

    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(
        isPublicV1Route(route.path) || authIndex < route.index,
        `${route.path} must be public by explicit allow-list or protected`,
      ).toBe(true);
      expect(authIndex).toBeLessThan(route.index);

      if (route.path.includes(":projectId"))
        expect(route.handlers.some((layer) => layer.handle === loadProjectForUser)).toBe(true);
      if (route.path.includes(":fileId"))
        expect(route.handlers.some((layer) => layer.handle === loadFileForUser)).toBe(true);
    }
  });

  it("rejects requests without a bearer token", async () => {
    const response = await request(app).get(projectPath);
    const executeResponse = await request(app)
      .post("/v1/execute")
      .send({ language: "javascript", code: "1 + 1", fileId });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "UNAUTHORIZED" });
    expect(executeResponse.status).toBe(401);
    expect(executeResponse.body).toEqual({ error: "UNAUTHORIZED" });
  });

  it("hides another workspace member's project and file", async () => {
    const projectResponse = await request(app)
      .get(projectPath)
      .set("Authorization", otherUserToken);
    const fileResponse = await request(app)
      .get(`/v1/files/${fileId}/revisions`)
      .set("Authorization", otherUserToken);
    const executeResponse = await request(app)
      .post("/v1/execute")
      .set("Authorization", otherUserToken)
      .send({ language: "javascript", code: "1 + 1", fileId });

    expect(projectResponse.status).toBe(404);
    expect(fileResponse.status).toBe(404);
    expect(executeResponse.status).toBe(404);
  });

  it("allows the project owner to read and execute an authorized file", async () => {
    const projectResponse = await request(app)
      .get(projectPath)
      .set("Authorization", ownerToken);
    const fileResponse = await request(app)
      .get(`/v1/projects/project-a/files/${fileId}`)
      .set("Authorization", ownerToken);
    const executeResponse = await request(app)
      .post("/v1/execute")
      .set("Authorization", ownerToken)
      .send({ language: "javascript", code: "1 + 1", fileId });

    expect(projectResponse.status).toBe(200);
    expect(fileResponse.status).toBe(200);
    expect(executeResponse.status).toBe(200);
    expect(executeResponse.body).toMatchObject({
      stdout: "execution output",
      executionId: "execution-a",
    });
  });

  it("validates execution requests after authentication", async () => {
    const response = await request(app)
      .post("/v1/execute")
      .set("Authorization", ownerToken)
      .send({ language: "ruby", code: 42, fileId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });
});
