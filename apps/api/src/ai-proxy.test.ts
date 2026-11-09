import type { Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.AI_INTERNAL_KEY = "test-ai-internal-key";

const mocks = vi.hoisted(() => ({
  usageUpsert: vi.fn(),
  usageUpdate: vi.fn(),
}));

vi.mock("@devpulse/database", () => ({
  db: {
    workspaceMember: {
      findFirst: vi.fn(async () => ({ workspaceId: "workspace-a" })),
    },
    workspace: {
      findUnique: vi.fn(async () => ({ plan: "FREE" })),
    },
    aIUsage: {
      upsert: mocks.usageUpsert,
      update: mocks.usageUpdate,
    },
  },
}));

vi.mock("./lib/jwt.js", () => ({
  verifyToken: vi.fn(async (token: string) => {
    if (token !== "test-access-token") throw new Error("Invalid test token");
    return {
      sub: "user-a",
      email: "user-a@example.com",
      name: "User A",
      workspaceId: "workspace-a",
      plan: "free",
    };
  }),
  initKeys: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

import { app } from "./index.js";

const appInstance: Express = app;

function usage(requestCount = 0) {
  return {
    id: "usage-a",
    userId: "user-a",
    requestCount,
    tokenCount: 0,
    month: 11,
    year: 2026,
  };
}

function sse(...events: unknown[]): Response {
  const body = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("AI API proxy", () => {
  beforeAll(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  beforeEach(() => {
    mocks.usageUpsert.mockReset().mockImplementation(async () => usage());
    mocks.usageUpdate.mockReset().mockResolvedValue({});
    vi.mocked(fetch).mockReset();
  });

  it("rejects chat requests without a JWT", async () => {
    const response = await request(appInstance)
      .post("/v1/ai/chat")
      .send({ messages: [{ role: "user", content: "hello" }] });

    expect(response.status).toBe(401);
    expect(mocks.usageUpsert).not.toHaveBeenCalled();
  });

  it("returns 429 when the authenticated user has exhausted their quota", async () => {
    mocks.usageUpsert.mockResolvedValueOnce(usage(100));

    const response = await request(appInstance)
      .post("/v1/ai/chat")
      .set("Authorization", "Bearer test-access-token")
      .send({ messages: [{ role: "user", content: "hello" }] });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ error: "Monthly limit reached", used: 100, limit: 100 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("relays stream errors unchanged without incrementing usage", async () => {
    const errorEvent = {
      type: "error",
      code: "AI_NOT_CONFIGURED",
      message: "Add an Anthropic key.",
    };
    vi.mocked(fetch).mockResolvedValueOnce(sse(errorEvent));

    const response = await request(appInstance)
      .post("/v1/ai/chat")
      .set("Authorization", "Bearer test-access-token")
      .send({ messages: [{ role: "user", content: "hello" }] });

    expect(response.status).toBe(200);
    expect(response.text).toContain(JSON.stringify(errorEvent));
    expect(mocks.usageUpdate).not.toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({
      "X-Internal-Key": "test-ai-internal-key",
    });
  });

  it("increments quota only after a done event", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      sse(
        { type: "token", content: "Hello" },
        { type: "done", tokensUsed: 7 },
      ),
    );

    const response = await request(appInstance)
      .post("/v1/ai/chat")
      .set("Authorization", "Bearer test-access-token")
      .send({ messages: [{ role: "user", content: "hello" }] });

    expect(response.status).toBe(200);
    expect(response.text).toContain('"type":"token","content":"Hello"');
    expect(response.text).toContain('"type":"done","tokensUsed":7');
    expect(mocks.usageUpdate).toHaveBeenCalledWith({
      where: { id: "usage-a" },
      data: {
        requestCount: { increment: 1 },
        tokenCount: { increment: 7 },
      },
    });
  });
});
