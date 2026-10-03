import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import helmet from "helmet";

const app = express();
const port = Number(process.env.AI_PORT ?? 4002);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "ai" }),
);
app.post("/v1/chat", async (request, response) => {
  if (!process.env.ANTHROPIC_API_KEY)
    return response
      .status(503)
      .json({ error: "AI provider is not configured" });
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const emit = (event: { type: string; [key: string]: unknown }) => {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  emit({
    type: "activity",
    phase: "thinking",
    detail: "Reviewing your request",
  });

  try {
    const stream = anthropic.messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      messages: request.body.messages ?? [],
    });
    let hasStartedWriting = false;

    for await (const event of stream) {
      if (
        event.type !== "content_block_delta" ||
        event.delta.type !== "text_delta"
      ) {
        continue;
      }

      if (!hasStartedWriting) {
        hasStartedWriting = true;
        emit({
          type: "activity",
          phase: "writing",
          detail: "Composing response",
        });
      }
      emit({ type: "token", text: event.delta.text });
    }

    emit({ type: "done" });
  } catch (error) {
    emit({
      type: "error",
      error: error instanceof Error ? error.message : "AI request failed",
    });
  }

  response.end();
});
app.listen(port, () =>
  console.log(`Devpulse AI service listening on :${port}`),
);
