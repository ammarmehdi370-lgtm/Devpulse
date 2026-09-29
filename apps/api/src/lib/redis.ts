import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  socket: { reconnectStrategy: false },
});

redis.on("error", (error) => console.error("Redis error", error));

export const redisConnection: Promise<unknown> = process.env.NODE_ENV === "test"
  ? Promise.resolve()
  : redis.connect().catch(() => undefined);