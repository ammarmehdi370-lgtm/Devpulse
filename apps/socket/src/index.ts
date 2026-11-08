import cors from "cors";
import { config as loadEnv } from "dotenv";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import { createClient } from "redis";
import { z } from "zod";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  REDIS_URL: z.string().url(),
  SOCKET_PORT: z.coerce.number().int().positive().default(4001),
  APP_URL: z.string().url(),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  const invalidNames = [
    ...new Set(parsedEnv.error.issues.map((issue) => String(issue.path[0]))),
  ];
  console.error("[ENV] Missing or invalid required variables:");
  for (const name of invalidNames) console.error(`  - ${name}`);
  process.exit(1);
}
const env = parsedEnv.data;

const app = express();
const redis = createClient({
  url: env.REDIS_URL,
  socket: { reconnectStrategy: false },
});
redis.on("error", (error) => console.error("Redis error", error));
const redisConnection = redis.connect().catch(() => undefined);
const localSessions = new Map<string, number>();
app.use(cors({ origin: env.APP_URL }));
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "socket" }),
);
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: env.APP_URL },
});

io.on("connection", (socket) => {
  socket.on("workspace:join", async (workspaceId: string) => {
    await redisConnection;
    await socket.join(`workspace:${workspaceId}`);
    const sessionKey = `session:${workspaceId}:startedAt`;
    let startedAt = localSessions.get(workspaceId);
    if (redis.isReady) {
      await redis.set(sessionKey, String(startedAt ?? Date.now()), {
        NX: true,
        EX: 86_400,
      });
      const stored = await redis.get(sessionKey);
      startedAt = stored ? Number(stored) : Date.now();
    } else if (!startedAt) {
      startedAt = Date.now();
      localSessions.set(workspaceId, startedAt);
    }
    socket.emit("session:state", { workspaceId, startedAt });
  });
  socket.on("workspace:leave", async (workspaceId: string) => {
    await redisConnection;
    await socket.leave(`workspace:${workspaceId}`);
  });
  socket.on(
    "presence:update",
    async (payload: { workspaceId: string; status: string }) => {
      await redisConnection;
      if (redis.isReady)
        await redis.set(
          `presence:${payload.workspaceId}:${socket.id}`,
          JSON.stringify(payload),
          { EX: 30 },
        );
      socket
        .to(`workspace:${payload.workspaceId}`)
        .emit("presence:changed", payload);
    },
  );
  socket.on(
    "file:editing",
    (payload: {
      workspaceId: string;
      fileId: string;
      userId: string;
      userName?: string;
    }) => {
      if (!payload.workspaceId || !payload.fileId || !payload.userId) return;
      socket
        .to(`workspace:${payload.workspaceId}`)
        .emit("file:editing", payload);
    },
  );
  socket.on(
    "code:change",
    (payload: { workspaceId: string; code: string; revision: number }) => {
      if (typeof payload.code !== "string" || payload.code.length > 2_000_000)
        return;
      socket
        .to(`workspace:${payload.workspaceId}`)
        .emit("code:changed", { ...payload, userId: socket.id });
    },
  );
  socket.on(
    "cursor:update",
    (payload: { workspaceId: string; start: number; end: number }) => {
      socket
        .to(`workspace:${payload.workspaceId}`)
        .emit("cursor:changed", { ...payload, userId: socket.id });
    },
  );
  socket.on(
    "typing:update",
    (payload: { workspaceId: string; typing: boolean }) => {
      socket
        .to(`workspace:${payload.workspaceId}`)
        .emit("typing:changed", { ...payload, userId: socket.id });
    },
  );
  socket.on("disconnect", async () => {
    await redisConnection;
    if (redis.isReady) {
      const keys = await redis.keys(`presence:*:${socket.id}`);
      if (keys.length > 0) await redis.del(keys);
    }
  });
});

const port = env.SOCKET_PORT;
server.listen(port, () =>
  console.log(`Devpulse Socket server listening on :${port}`),
);
