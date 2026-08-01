import { TRPCError } from "@trpc/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

/**
 * Sliding window rate limiter. Throws TRPCError TOO_MANY_REQUESTS if exceeded.
 * key: e.g. "ai:improve", limit: max requests per hour.
 */
export async function checkRateLimit(
  userId: string,
  key: string,
  limit: number,
): Promise<void> {
  const redisKey = `ratelimit:${key}:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(redisKey, 0, now - windowMs);
  pipe.zadd(redisKey, { score: now, member: now.toString() });
  pipe.zcard(redisKey);
  pipe.expire(redisKey, 3600);

  const results = await pipe.exec();
  const count = results[2] as number;

  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Batas permintaan AI tercapai. Coba lagi dalam 1 jam.",
    });
  }
}
