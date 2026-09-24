import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";
import path from "node:path";
import Redis from "ioredis";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

type ChatMessage = Anthropic.MessageParam;
type ChatContext = { fileName?: string; language?: string; selectedCode?: string; surroundingCode?: string; recentErrors?: string[] };
type ChatRequest = { model?: string; messages: ChatMessage[]; context?: ChatContext; command?: string };
type CompletionRequest = { code: string; language: string; fileName: string; prefix: string };

const app = express();
const port = Number(process.env.AI_PORT ?? 4002);
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = anthropicApiKey && !anthropicApiKey.includes("your-actual-key-here")
  ? new Anthropic({ apiKey: anthropicApiKey, timeout: 30_000 })
  : null;
const defaultModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
redis?.on("error", () => undefined);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "ai" }),
);

function buildSystemPrompt(body: ChatRequest): string {
  const parts: string[] = [];
  parts.push(
    "You are Devpulse AI - an expert developer " +
      "assistant embedded inside a cloud IDE. Be concise, practical, and direct. " +
      "When providing code, always specify the language in the code block.",
  );
  if (body.context?.fileName) {
    parts.push(`\nActive file: ${body.context.fileName}${body.context.language ? ` (${body.context.language})` : ""}`);
  }
  if (body.context?.selectedCode) {
    parts.push(`\nUser has selected this code:\n\`\`\`${body.context.language ?? ""}\n${body.context.selectedCode}\n\`\`\``);
  } else if (body.context?.surroundingCode) {
    parts.push(`\nCode context around cursor:\n\`\`\`${body.context.language ?? ""}\n${body.context.surroundingCode}\n\`\`\``);
  }
  if (body.context?.recentErrors?.length) parts.push(`\nRecent errors:\n${body.context.recentErrors.join("\n")}`);
  const commandInstructions: Record<string, string> = {
    "/fix": "The user wants you to fix bugs. Show the complete fixed code with a brief explanation of what was wrong.",
    "/explain": "Explain this code clearly. Use simple language. Structure with bullet points for key concepts.",
    "/test": "Write comprehensive unit tests. Use the standard testing framework for the language. Include edge cases.",
    "/comment": "Add clear JSDoc or docstring comments to every function and class. Return full code.",
    "/refactor": "Refactor for readability and performance. Explain each significant change briefly.",
    "/optimize": "Optimize for performance. Identify the bottleneck and show the improved version.",
  };
  const instruction = body.command ? commandInstructions[body.command] : undefined;
  if (instruction) parts.push(`\nTask: ${instruction}`);
  return parts.join("\n");
}

function handleAnthropicError(response: express.Response, error: unknown): void {
  if (response.headersSent) return;
  const status = error instanceof Anthropic.APIError ? error.status : undefined;
  const message = error instanceof Error ? error.message : "Unknown AI error";
  if (/credit balance|purchase credits|plans & billing/i.test(message)) {
    return void response.status(402).json({
      error: "Anthropic API credits are exhausted. Add credits in Plans & Billing, then try again.",
      code: "AI_CREDITS_REQUIRED",
    });
  }
  if (status === 529) return void response.status(503).json({ error: "AI service busy. Try again in a moment.", retryAfter: 10 });
  if (status === 429) {
    const retryAfter = error instanceof Anthropic.APIError ? parseInt(error.headers?.["retry-after"] ?? "5", 10) : 5;
    return void response.status(429).json({ error: "Too many AI requests. Please wait.", retryAfter });
  }
  if (status === 400) return void response.status(400).json({ error: "Invalid request to AI service", details: message });
  if (status === 401 || /authentication|api key|unauthorized/i.test(message)) {
    return void response.status(503).json({ error: "AI service not configured. Add ANTHROPIC_API_KEY to .env", code: "AI_NOT_CONFIGURED" });
  }
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return void response.status(504).json({ error: "AI request timed out. Try again.", code: "AI_TIMEOUT" });
  response.status(502).json({ error: "AI provider request failed" });
}

app.post("/v1/chat", async (request, response) => {
  const body = request.body as ChatRequest;
  if (!anthropic)
    return response.status(503).json({ error: "AI service not configured. Add ANTHROPIC_API_KEY to .env", code: "AI_NOT_CONFIGURED" });
  if (!Array.isArray(body.messages))
    return response.status(400).json({ error: "messages must be an array" });

  const acceptHeader = request.get("accept") ?? "";
  const wantsEventStream = acceptHeader
    .split(",")
    .some((value) => value.trim().split(";", 1)[0] === "text/event-stream");
  if (wantsEventStream) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    const stream = anthropic.messages.stream({ model: body.model ?? defaultModel, max_tokens: 4096, system: buildSystemPrompt(body), messages: body.messages });
    stream.on("text", (text) => response.write(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`));
    stream.on("finalMessage", (message) => {
      response.write(`data: ${JSON.stringify({ type: "done", tokensUsed: message.usage.input_tokens + message.usage.output_tokens, stopReason: message.stop_reason })}\n\n`);
      response.end();
    });
    stream.on("error", (error) => {
      const errorMessage = error instanceof Anthropic.APIError && error.status === 401
        ? "AI service not configured. Add ANTHROPIC_API_KEY to .env"
        : error instanceof Error ? error.message : "AI provider request failed";
      response.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
      response.end();
    });
    request.on("close", () => stream.controller.abort());
    return;
  }

  try {
    const result = await anthropic.messages.create({
      model: body.model ?? defaultModel,
      max_tokens: 1024,
      system: buildSystemPrompt(body),
      messages: body.messages,
    });
    const content = result.content.find((item) => item.type === "text");
    return response.json({ content: content?.type === "text" ? content.text : "" });
  } catch (error) {
    console.error(error);
    handleAnthropicError(response, error);
  }
});

app.post("/v1/complete", async (request, response) => {
  const body = request.body as CompletionRequest;
  if (!anthropic) return response.json({ suggestion: "" });
  if (typeof body.prefix !== "string" || typeof body.code !== "string") return response.status(400).json({ error: "code and prefix must be strings" });
  const key = `devpulse:complete:${crypto.createHash("md5").update(`${body.language}${body.prefix}`).digest("hex")}`;
  try {
    const cached = await redis?.get(key);
    if (cached !== null && cached !== undefined) return response.json({ suggestion: cached });
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      system: "Complete the code. Return ONLY the completion text that comes immediately after the cursor. No explanation. No markdown. Just code.",
      messages: [{ role: "user", content: `Language: ${body.language}\nFile: ${body.fileName}\nCode:\n${body.code}\nPrefix:\n${body.prefix}` }],
    });
    const content = result.content.find((item) => item.type === "text");
    const suggestion = content?.type === "text" ? content.text : "";
    try { await redis?.set(key, suggestion, "EX", 300); } catch { /* Cache is optional. */ }
    return response.json({ suggestion });
  } catch (error) {
    console.error(error);
    return response.json({ suggestion: "" });
  }
});

app.get("/v1/models", (_request, response) => response.json({ models: [
  { id: "claude-sonnet-4-6", name: "Devpulse AI", description: "Fast, smart coding assistant", maxTokens: 8192, isDefault: true, plan: "free" },
  { id: "claude-opus-5", name: "Devpulse AI Max", description: "Most capable model", maxTokens: 32768, isDefault: false, plan: "pro" },
] }));
app.listen(port, () =>
  console.log(`Devpulse AI service listening on :${port}`),
);
