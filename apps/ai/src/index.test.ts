import { request as httpRequest } from "node:http";
import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const anthropicStream = vi.hoisted(() => ({
  abort: vi.fn(),
  on: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      stream: () => ({
        controller: { abort: anthropicStream.abort },
        on: anthropicStream.on,
      }),
      create: vi.fn(),
    };

    static APIError = class extends Error {};
  },
}));

process.env.NODE_ENV = "test";
process.env.AI_INTERNAL_KEY = "test-ai-internal-key";
const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "your-actual-key-here";

let app: Express;
let server: ReturnType<Express["listen"]>;
let baseUrl: string;

beforeAll(async () => {
  ({ app } = await import("./index.js"));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("AI test server did not bind to a TCP port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  delete process.env.AI_INTERNAL_KEY;
  if (originalAnthropicApiKey === undefined)
    delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey;
});

describe("AI service", () => {
  it("reports missing Anthropic configuration as a healthy HTTP response", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect((await response.json()).configured).toBe(false);
  });

  it("requires the internal key for direct chat calls", async () => {
    const response = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("validates chat input with the request schema", async () => {
    const response = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": "test-ai-internal-key",
      },
      body: JSON.stringify({ messages: [{ role: "system", content: "not allowed" }] }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_REQUEST");
  });

  it("streams a clear configuration error when Anthropic is unavailable", async () => {
    const response = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": "test-ai-internal-key",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const responseText = await response.text();
    expect(responseText).toContain('"type":"error"');
    expect(responseText).toContain('"code":"AI_NOT_CONFIGURED"');
  });

  it("translates provider output into token and done SSE events", async () => {
    const previousKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    anthropicStream.on.mockReset().mockImplementation((...args: unknown[]) => {
      const event = args[0];
      const handler = args[1] as (value: unknown) => void;
      if (event === "text") setTimeout(() => handler("A reply"), 0);
      if (event === "finalMessage")
        setTimeout(() => handler({
          usage: { input_tokens: 3, output_tokens: 4 },
          stop_reason: "end_turn",
        }), 5);
    });
    try {
      const response = await fetch(`${baseUrl}/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": "test-ai-internal-key",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
      });

      expect(response.status).toBe(200);
      const responseText = await response.text();
      expect(responseText).toContain(
        'data: {"type":"token","content":"A reply"}',
      );
      expect(responseText).toContain(
        '"type":"done","tokensUsed":7,"stopReason":"end_turn"',
      );
      expect(anthropicStream.on).toHaveBeenCalledWith(
        "finalMessage",
        expect.any(Function),
      );
    } finally {
      anthropicStream.on.mockReset();
      if (previousKey === undefined)
        process.env.ANTHROPIC_API_KEY = "your-actual-key-here";
      else process.env.ANTHROPIC_API_KEY = previousKey;
    }
  });

  it("aborts the provider stream when the client disconnects", async () => {
    const previousKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    anthropicStream.abort.mockClear();
    try {
      await new Promise<void>((resolve, reject) => {
        const clientRequest = httpRequest(
          `${baseUrl}/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": "test-ai-internal-key",
              Accept: "text/event-stream",
            },
          },
          (clientResponse) => {
            clientResponse.destroy();
            resolve();
          },
        );
        clientRequest.once("error", reject);
        clientRequest.end(
          JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
        );
      });

      await vi.waitFor(() => expect(anthropicStream.abort).toHaveBeenCalledOnce());
    } finally {
      if (previousKey === undefined)
        process.env.ANTHROPIC_API_KEY = "your-actual-key-here";
      else process.env.ANTHROPIC_API_KEY = previousKey;
    }
  });
});
