# DevPulse AI Assistant

The AI integration is implemented in:

- [Express Claude router](../src/server/ai.ts)
- [React chat panel](../src/components/ai/AiAssistantPanel.tsx)
- [Monaco workspace integration](../src/components/editor/CodeWorkspace.tsx)

## Install

```powershell
npm install @anthropic-ai/sdk react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
```

Set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL=claude-sonnet-4-6` in the backend environment. Never expose the key with a `NEXT_PUBLIC_` prefix.

## Mount the Express route

Mount the router from the API server that owns authentication and workspace authorization:

```ts
import express from "express";
import { createAiRouter } from "./server/ai";

const app = express();
app.use(express.json({ limit: "150kb" }));
app.use("/api/ai", requireAuthenticatedUser, createAiRouter());
```

`requireAuthenticatedUser` is intentionally supplied by the host application. The AI router validates payloads and limits AI traffic, but workspace authorization belongs at the API boundary where the authenticated user and workspace membership are available.

## Context sent to Claude

Each chat request sends:

```ts
{
  fileName: string;
  language: string;
  selectedText: string;
  surroundingCode: string;
  fullFile: string;
  cursorLine?: number;
}
```

The client obtains this from Monaco's current model, selection, and cursor. `surroundingCode` contains twenty lines on either side of the cursor. The backend embeds the context in the system prompt and labels it as untrusted editor content.

## Streaming protocol

`POST /api/ai/chat` returns Server-Sent Events:

```text
event: token
data: {"text":"const"}

event: done
data: {"model":"claude-sonnet-4-6"}
```

The React panel reads `response.body` with `ReadableStream.getReader()`, splits events on blank lines, and appends each `token` to the assistant message. This keeps the API key on the server while giving the user progressive output.

## Inline autocomplete

`registerAiAutocomplete` registers Monaco's inline completion provider. It sends the prefix before the cursor and a short suffix to `POST /api/ai/complete`. Monaco handles Tab acceptance and Escape dismissal. The endpoint is deliberately short (`max_tokens: 256`) to control cost.

For production, add client-side debounce and an `AbortController` for requests while the user is typing. The server should also reject requests when the user has no workspace access.

## Commands

The panel exposes these prompts:

```text
/fix       Fix selected code
/explain   Explain selected code
/test      Write unit tests
/comment   Add comments
/refactor  Improve code quality
/docs      Generate documentation
```

They are normal user prompts, which keeps command behavior easy to evolve and gives Claude the same editor context as free-form questions.

## Rate and cost controls

The router applies a per-process limit of 20 AI requests per minute. Production should add:

- User- and workspace-scoped limits in Redis or PostgreSQL.
- A lower completion limit, such as 5 requests per minute per user.
- Maximum file and selection sizes before calling Claude.
- Maximum output tokens per endpoint.
- Request cancellation when the client disconnects.
- Usage logging by user, workspace, model, and token count.
- Monthly workspace budgets with a `402` or `429` response when exhausted.

The current chat limit is a baseline guard, not a substitute for authenticated, distributed quotas.