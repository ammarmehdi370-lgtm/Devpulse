import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import helmet from "helmet";

const app = express();
const port = Number(process.env.AI_PORT ?? 4002);
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "ai" }),
);
app.post("/v1/chat", async (request, response) => {
  if (!anthropic)
    return response
      .status(503)
      .json({ error: "AI provider is not configured" });
  if (!Array.isArray(request.body.messages))
    return response.status(400).json({ error: "messages must be an array" });
  try {
    if (request.body.stream === true) {
      response.status(200);
      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Connection", "keep-alive");
      const stream = anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        messages: request.body.messages,
      });
      for await (const event of stream) {
        if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
        response.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
      response.write("data: [DONE]\n\n");
      return response.end();
    }
    const result = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      messages: request.body.messages,
    });
    return response.json(result);
  } catch (error) {
    console.error(error);
    return response.status(502).json({ error: "AI provider request failed" });
  }
});
app.listen(port, () =>
  console.log(`Devpulse AI service listening on :${port}`),
);
