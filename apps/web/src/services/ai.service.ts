import { and, eq, sql } from "drizzle-orm";
import { getDB } from "../lib/db";
import { authenticatedFetch } from "../lib/auth-store";
import { aiUsage } from "../lib/db/schema";

export interface AIContext {
  fileName?: string;
  language?: string;
  selectedCode?: string;
  command?: string;
}

export interface AIChatParams {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: "claude-sonnet-4-6";
  context?: AIContext;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onDone: (tokens: number) => void;
  onError: (code: string, message: string) => void;
}

export interface AIUsage {
  used: number;
  limit: number;
  tokens: number;
  month: number;
  year: number;
}

interface AnthropicEvent {
  type?: string;
  delta?: { type?: string; text?: string };
  usage?: { output_tokens?: number };
  error?: { type?: string; message?: string };
}

const MONTHLY_REQUEST_LIMIT = 100;

export class AIService {
  constructor(
    private readonly endpoint: string,
    private readonly getAccessToken: () => string | null,
    private readonly getUserId: () => string | null,
  ) {}

  async chat(params: AIChatParams): Promise<void> {
    const token = this.getAccessToken();
    const userId = this.getUserId();
    if (!token || !userId) {
      params.onError("UNAUTHORIZED", "An authenticated session is required to use AI.");
      return;
    }
    if (!this.endpoint) {
      params.onError("AI_NOT_CONFIGURED", "Configure NEXT_PUBLIC_AI_PROXY_URL with the deployed AI Worker URL.");
      return;
    }
    if (params.messages.length === 0) {
      params.onError("INVALID_REQUEST", "At least one chat message is required.");
      return;
    }
    try {
      const currentUsage = await this.getUsage(userId);
      if (currentUsage.used >= currentUsage.limit) {
        params.onError("AI_USAGE_LIMIT", "The local monthly AI request limit has been reached.");
        return;
      }
    } catch (error) {
      params.onError("AI_USAGE_UNAVAILABLE", error instanceof Error ? error.message : "Could not read local AI usage.");
      return;
    }

    let response: Response;
    try {
      response = await authenticatedFetch(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: params.messages,
          model: params.model,
          context: params.context,
        }),
        signal: params.signal,
      });
    } catch (error) {
      if (params.signal?.aborted) return;
      params.onError("AI_PROXY_ERROR", error instanceof Error ? error.message : "Could not reach the AI service.");
      return;
    }

    if (!response.ok) {
      const responseText = await response.text();
      let code = "AI_PROXY_ERROR";
      let message = responseText || `AI request failed (${response.status}).`;
      try {
        const body = JSON.parse(responseText) as { error?: string; message?: string };
        code = body.error ?? code;
        message = body.message ?? message;
      } catch {
        // Keep the provider response text for non-JSON proxy errors.
      }
      params.onError(code, message);
      return;
    }
    if (!response.body) {
      params.onError("NO_STREAM", "The AI service returned no response stream.");
      return;
    }

    try {
      const outputTokens = await this.consumeStream(response.body, params);
      await this.recordUsage(userId, outputTokens);
      params.onDone(outputTokens);
    } catch (error) {
      if (params.signal?.aborted) return;
      params.onError("AI_STREAM_ERROR", error instanceof Error ? error.message : "The AI stream failed.");
    }
  }

  async getUsage(userId = this.getUserId()): Promise<AIUsage> {
    if (!userId) throw new Error("An authenticated user is required to read AI usage.");
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const db = await getDB();
    const [usage] = await db.select().from(aiUsage).where(and(
      eq(aiUsage.userId, userId),
      eq(aiUsage.month, month),
      eq(aiUsage.year, year),
    )).limit(1);
    return {
      used: usage?.requestCount ?? 0,
      limit: MONTHLY_REQUEST_LIMIT,
      tokens: usage?.tokenCount ?? 0,
      month,
      year,
    };
  }

  private async consumeStream(stream: ReadableStream<Uint8Array>, params: AIChatParams): Promise<number> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let outputTokens = 0;
    let streamError: Error | undefined;

    const processEvent = (raw: string) => {
      const data = raw.split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") return;
      let event: AnthropicEvent;
      try {
        event = JSON.parse(data) as AnthropicEvent;
      } catch {
        throw new Error("The AI service sent a malformed stream event.");
      }

      if (event.type === "content_block_delta" && typeof event.delta?.text === "string") {
        params.onChunk(event.delta.text);
      } else if (event.type === "message_delta" && Number.isInteger(event.usage?.output_tokens)) {
        outputTokens = event.usage?.output_tokens ?? outputTokens;
      } else if (event.type === "error") {
        streamError = new Error(event.error?.message ?? "The AI provider reported a stream error.");
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) processEvent(event);
        if (done) break;
      }
      if (buffer.trim()) processEvent(buffer);
      if (streamError) throw streamError;
      return outputTokens;
    } finally {
      reader.releaseLock();
    }
  }

  private async recordUsage(userId: string, tokens: number): Promise<void> {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const db = await getDB();
    await db.insert(aiUsage).values({
      id: crypto.randomUUID(),
      userId,
      month,
      year,
      requestCount: 1,
      tokenCount: tokens,
    }).onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.month, aiUsage.year],
      set: {
        requestCount: sql`${aiUsage.requestCount} + 1`,
        tokenCount: sql`${aiUsage.tokenCount} + ${tokens}`,
        updatedAt: now,
      },
    });
  }
}
