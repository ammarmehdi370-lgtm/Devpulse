import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  socket: { reconnectStrategy: false },
});

redis.on("error", (error) => console.error("Redis error", error));

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) await redis.connect();
  await redis.ping();
}
