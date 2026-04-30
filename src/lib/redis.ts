import Redis, { type RedisOptions } from "ioredis";

function redisOptions(url: string): RedisOptions {
  const tls = url.startsWith("rediss://");
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(tls ? { tls: {} } : {}),
  };
}

export function createRedisFromEnv(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return new Redis(url, redisOptions(url));
}

const g = globalThis as typeof globalThis & { __bullmqRedis?: Redis };

/** Shared Redis connection for BullMQ producers in the Next.js process (dev HMR-safe). */
export function getSharedRedis(): Redis {
  if (!g.__bullmqRedis) {
    g.__bullmqRedis = createRedisFromEnv();
  }
  return g.__bullmqRedis;
}
