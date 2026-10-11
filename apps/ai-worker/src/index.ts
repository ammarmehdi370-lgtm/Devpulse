import { importSPKI, jwtVerify } from "jose";

interface Env {
  ANTHROPIC_API_KEY: string;
  JWT_PUBLIC_KEY: string;
  ALLOWED_ORIGIN: string;
}

interface ChatBody {
  model?: string;
  context?: {
    fileName?: string;
    language?: string;
    selectedCode?: string;
    command?: string;
  };
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const MAX_BODY_BYTES = 1_000_000;
const MAX_MESSAGES = 100;
const COMMAND_INSTRUCTIONS: Record<string, string> = {
  "/fix": "Fix the reported bugs. Explain the important changes.",
  "/explain": "Explain clearly using concise bullet points.",
  "/test": "Write useful unit tests for the provided code.",
  "/comment": "Add concise documentation comments where useful.",
  "/refactor": "Refactor for clarity while preserving behavior.",
  "/optimize": "Suggest and implement meaningful performance improvements.",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return preflight(origin, env);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin, env);

    try {
      if (!env.ANTHROPIC_API_KEY || !env.JWT_PUBLIC_KEY || !env.ALLOWED_ORIGIN) {
        return json({ error: "AI proxy is not configured." }, 500, origin, env);
      }
      if (origin !== env.ALLOWED_ORIGIN) {
        return json({ error: "Origin is not allowed." }, 403, origin, env);
      }

      const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Unauthorized." }, 401, origin, env);

      let publicKey: Awaited<ReturnType<typeof importSPKI>>;
      try {
        publicKey = await importSPKI(env.JWT_PUBLIC_KEY, "RS256");
      } catch {
        return json({ error: "AI proxy JWT verification is misconfigured." }, 500, origin, env);
      }

      let payload;
      try {
        ({ payload } = await jwtVerify(token, publicKey, {
          algorithms: ["RS256"],
          issuer: "devpulse",
        }));
      } catch {
        return json({ error: "Invalid token." }, 401, origin, env);
      }
      if (payload.type !== "access" || typeof payload.sub !== "string" || payload.sub.length === 0) {
        return json({ error: "Invalid token." }, 401, origin, env);
      }

      const contentLength = Number(request.headers.get("Content-Length") ?? 0);
      if (contentLength > MAX_BODY_BYTES) {
        return json({ error: "Request body is too large." }, 413, origin, env);
      }

      const rawBody = await readBoundedBody(request, MAX_BODY_BYTES);
      const body = JSON.parse(rawBody) as Partial<ChatBody>;
      if (!isChatBody(body)) {
        return json({ error: "Invalid chat request." }, 400, origin, env);
      }

      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: body.model ?? "claude-sonnet-4-6",
          max_tokens: 4096,
          stream: true,
          system: buildSystemPrompt(body.context),
          messages: body.messages,
        }),
      });

      if (!upstream.ok) {
        if (upstream.status === 401 || upstream.status === 403) {
          return json({ error: "AI_KEY_INVALID", message: "The AI provider credentials are invalid." }, 503, origin, env);
        }
        if (upstream.status === 429) {
          return json({ error: "AI_RATE_LIMITED", message: "The AI provider is rate limiting requests." }, 429, origin, env);
        }
        return json({ error: "AI_ERROR", message: "The AI provider rejected the request." }, 502, origin, env);
      }
      if (!upstream.body) {
        return json({ error: "The AI provider returned no response stream." }, 502, origin, env);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: corsHeaders(origin, env, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "x-content-type-options": "nosniff",
        }),
      });
    } catch (error) {
      if (error instanceof SyntaxError) return json({ error: "Invalid JSON body." }, 400, origin, env);
      if (error instanceof RangeError) return json({ error: error.message }, 413, origin, env);
      return json({ error: "AI request could not be completed." }, 502, origin, env);
    }
  },
};

async function readBoundedBody(request: Request, limit: number): Promise<string> {
  if (!request.body) throw new SyntaxError("Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limit) {
      await reader.cancel();
      throw new RangeError("Request body is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function isChatBody(value: unknown): value is ChatBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Partial<ChatBody>;
  return Array.isArray(body.messages)
    && body.messages.length > 0
    && body.messages.length <= MAX_MESSAGES
    && body.messages.every((message) =>
      (message.role === "user" || message.role === "assistant")
      && typeof message.content === "string"
      && message.content.length > 0
      && message.content.length <= 200_000,
    )
    && isChatContext(body.context)
    && (body.model === undefined || body.model === "claude-sonnet-4-6");
}

function isChatContext(value: unknown): value is ChatBody["context"] {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const validKeys = new Set(["fileName", "language", "selectedCode", "command"]);
  return Object.entries(value).every(([key, entry]) =>
    validKeys.has(key) && typeof entry === "string" && entry.length <= 100_000,
  );
}

function buildSystemPrompt(context?: ChatBody["context"]): string {
  const parts = [
    "You are Devpulse AI, an expert developer assistant.",
    "Be concise, practical, and direct. Use fenced code blocks with a language identifier.",
  ];
  if (context?.fileName) {
    parts.push(`Active file: ${context.fileName}${context.language ? ` (${context.language})` : ""}`);
  }
  if (context?.selectedCode) {
    parts.push(`Selected code:\n\`\`\`${context.language ?? ""}\n${context.selectedCode}\n\`\`\``);
  }
  const instruction = context?.command ? COMMAND_INSTRUCTIONS[context.command] : undefined;
  if (instruction) parts.push(`Task: ${instruction}`);
  return parts.join("\n\n");
}

function corsHeaders(
  origin: string | null,
  env: Env,
  additional: Record<string, string> = {},
): HeadersInit {
  return {
    ...additional,
    "access-control-allow-origin": origin === env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN : "null",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "Authorization, Content-Type, Accept",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "Origin",
  };
}

function json(value: unknown, status: number, origin: string | null, env: Env): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: corsHeaders(origin, env, { "content-type": "application/json; charset=utf-8" }),
  });
}

function preflight(origin: string | null, env: Env): Response {
  if (origin !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
}
