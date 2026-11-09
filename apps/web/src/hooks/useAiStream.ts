"use client";

import { useCallback, useState } from "react";
import { authenticatedFetch } from "../lib/auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AiStreamErrorCode =
  | "AI_NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN";

export class AiStreamError extends Error {
  constructor(
    message: string,
    readonly code: AiStreamErrorCode,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiStreamError";
  }
}

export interface AiChatPayload {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: "claude-sonnet-4-6";
  command?: "/fix" | "/explain" | "/test" | "/comment" | "/refactor" | "/optimize";
  context?: {
    fileName?: string;
    language?: string;
    selectedCode?: string;
    surroundingCode?: string;
    projectName?: string;
    recentErrors?: string[];
  };
  fileId?: string;
  projectId?: string;
  conversationId?: string;
}

interface AiStreamEvent {
  type?: string;
  content?: string;
  tokensUsed?: number;
  code?: string;
  message?: string;
}

function errorCode(value: unknown, status: number): AiStreamErrorCode {
  if (value === "AI_NOT_CONFIGURED") return "AI_NOT_CONFIGURED";
  if (value === "RATE_LIMITED" || status === 429) return "RATE_LIMITED";
  if (value === "UNAUTHORIZED" || status === 401) return "UNAUTHORIZED";
  if (status >= 500) return "SERVICE_UNAVAILABLE";
  return "UNKNOWN";
}

function parseEvent(raw: string): AiStreamEvent | null {
  const data = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    return JSON.parse(data) as AiStreamEvent;
  } catch {
    throw new AiStreamError("The AI service sent an invalid stream event.", "UNKNOWN");
  }
}

export function useAiStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AiStreamError | null>(null);

  const streamChat = useCallback(
    async (
      payload: AiChatPayload,
      options: {
        signal?: AbortSignal;
        onToken?: (token: string) => void;
      } = {},
    ): Promise<{ text: string; tokensUsed: number }> => {
      setIsStreaming(true);
      setError(null);
      try {
        const response = await authenticatedFetch(`${API_BASE}/v1/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: options.signal,
        });

        if (!response.ok) {
          const responseText = await response.text();
          let details: { error?: string; code?: string; message?: string } = {};
          try {
            details = JSON.parse(responseText) as typeof details;
          } catch {
            // Use the raw response when the API does not return JSON.
          }
          throw new AiStreamError(
            details.message ?? details.error ?? responseText ?? `AI request failed (${response.status}).`,
            errorCode(details.code ?? details.error, response.status),
            response.status,
          );
        }
        if (!response.body) {
          throw new AiStreamError("The AI service returned no response stream.", "SERVICE_UNAVAILABLE");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let tokensUsed = 0;
        let completed = false;
        let streamError: AiStreamError | null = null;

        const processEvent = (raw: string) => {
          const event = parseEvent(raw);
          if (!event) return;
          if (event.type === "token") {
            const token = event.content ?? "";
            text += token;
            options.onToken?.(token);
          } else if (event.type === "done") {
            completed = true;
            if (Number.isFinite(event.tokensUsed)) tokensUsed = event.tokensUsed ?? 0;
          } else if (event.type === "error") {
            streamError = new AiStreamError(
              event.message ?? "The AI service reported an error.",
              errorCode(event.code, response.status),
              response.status,
            );
          }
        };

        try {
          while (true) {
            const chunk = await reader.read();
            buffer += chunk.done
              ? decoder.decode()
              : decoder.decode(chunk.value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() ?? "";
            events.forEach(processEvent);
            if (chunk.done) break;
          }
          if (buffer.trim()) processEvent(buffer);
        } finally {
          reader.releaseLock();
        }

        if (streamError) throw streamError;
        if (!completed) {
          throw new AiStreamError("The AI stream ended before it completed.", "SERVICE_UNAVAILABLE");
        }
        return { text, tokensUsed };
      } catch (reason) {
        const nextError =
          reason instanceof AiStreamError
            ? reason
            : reason instanceof Error && reason.name === "AbortError"
              ? null
              : new AiStreamError(
                  reason instanceof Error ? reason.message : "The AI request failed.",
                  "UNKNOWN",
                );
        if (nextError) setError(nextError);
        throw reason;
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  return { streamChat, isStreaming, error };
}
