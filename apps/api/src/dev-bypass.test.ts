import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { verifyRefreshToken, verifyToken } from "./lib/jwt.js";

vi.mock("@devpulse/database", () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        where.email === "demo@devpulse.local"
          ? {
              id: "demo-user",
              email: "demo@devpulse.local",
              name: "Devpulse Demo",
              memberships: [
                {
                  workspaceId: "demo-workspace",
                  workspace: { plan: "PRO" },
                },
              ],
            }
          : null,
      ),
    },
    project: {
      findMany: vi.fn(async () => [
        {
          id: "demo-project",
          name: "Demo project",
          defaultBranch: "main",
          workspaceId: "demo-workspace",
        },
      ]),
    },
  },
}));

const temporaryDirectory = mkdtempSync(
  path.join(tmpdir(), "devpulse-dev-bypass-test-"),
);
const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
  publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
  apiStartServer: process.env.API_START_SERVER,
};
let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  delete process.env.API_START_SERVER;

  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const privateKeyPath = path.join(temporaryDirectory, "private.pem");
  const publicKeyPath = path.join(temporaryDirectory, "public.pem");
  writeFileSync(privateKeyPath, pair.privateKey);
  writeFileSync(publicKeyPath, pair.publicKey);
  process.env.JWT_PRIVATE_KEY_PATH = privateKeyPath;
  process.env.JWT_PUBLIC_KEY_PATH = publicKeyPath;

  ({ app } = await import("./index.js"));
});

afterAll(() => {
  if (originalEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment.nodeEnv;

  if (originalEnvironment.privateKeyPath === undefined)
    delete process.env.JWT_PRIVATE_KEY_PATH;
  else process.env.JWT_PRIVATE_KEY_PATH = originalEnvironment.privateKeyPath;

  if (originalEnvironment.publicKeyPath === undefined)
    delete process.env.JWT_PUBLIC_KEY_PATH;
  else process.env.JWT_PUBLIC_KEY_PATH = originalEnvironment.publicKeyPath;

  if (originalEnvironment.apiStartServer === undefined)
    delete process.env.API_START_SERVER;
  else process.env.API_START_SERVER = originalEnvironment.apiStartServer;

  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("development login bypass", () => {
  it("returns an RS256 access token and sets a signed refresh cookie", async () => {
    const response = await request(app).get("/api/auth/dev-bypass");

    expect(response.status).toBe(200);
    await expect(verifyToken(response.body.accessToken)).resolves.toMatchObject(
      {
        sub: "demo-user",
        email: "demo@devpulse.local",
        workspaceId: "demo-workspace",
        plan: "pro",
      },
    );

    const cookieHeader = response.headers["set-cookie"];
    const cookies = Array.isArray(cookieHeader)
      ? cookieHeader
      : [cookieHeader ?? ""];
    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refresh_token="),
    );
    expect(refreshCookie).toBeDefined();
    const refreshToken = refreshCookie?.match(/refresh_token=([^;]+)/)?.[1];
    expect(refreshToken).toBeDefined();
    await expect(
      verifyRefreshToken(decodeURIComponent(refreshToken ?? "")),
    ).resolves.toEqual({ sub: "demo-user", type: "refresh" });

    const projectsResponse = await request(app)
      .get("/v1/projects")
      .set("Authorization", `Bearer ${response.body.accessToken}`);

    expect(projectsResponse.status).toBe(200);
    expect(projectsResponse.body.projects).toEqual([
      expect.objectContaining({
        id: "demo-project",
        workspaceId: "demo-workspace",
      }),
    ]);
  });

  it("returns 404 in production", async () => {
    process.env.NODE_ENV = "production";

    try {
      const response = await request(app).get("/api/auth/dev-bypass");
      expect(response.status).toBe(404);
    } finally {
      process.env.NODE_ENV = "test";
    }
  });
});
