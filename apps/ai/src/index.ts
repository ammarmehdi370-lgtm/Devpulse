import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.AI_PORT ?? 4002);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'ai' }));
app.post('/v1/chat', async (request, response) => {
  if (!process.env.ANTHROPIC_API_KEY) return response.status(503).json({ error: 'AI provider is not configured' });
  const result = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest', max_tokens: 1024, messages: request.body.messages ?? [] });
  return response.json(result);
});
app.listen(port, () => console.log(`Devpulse AI service listening on :${port}`));
