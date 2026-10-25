import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let redis: Redis;
let minuteLimit: Ratelimit;
let dailyLimit: Ratelimit;

function getRateLimiters() {
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  if (!minuteLimit) {
    minuteLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "bookcompass:minute",
      analytics: true,
    });
  }

  if (!dailyLimit) {
    dailyLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
      prefix: "bookcompass:daily",
      analytics: true,
    });
  }

  return { minuteLimit, dailyLimit };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Check both minute and daily rate limits for an IP.
 * Returns whether the request is allowed and when to retry.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // If Upstash credentials are not configured or are placeholders, fail open immediately
  if (
    !env.UPSTASH_REDIS_REST_URL ||
    env.UPSTASH_REDIS_REST_URL.includes("placeholder") ||
    !env.UPSTASH_REDIS_REST_TOKEN ||
    env.UPSTASH_REDIS_REST_TOKEN.includes("placeholder")
  ) {
    return { allowed: true, remaining: 100 };
  }

  try {
    const { minuteLimit, dailyLimit } = getRateLimiters();

    // Check minute limit first
    const minuteResult = await minuteLimit.limit(ip);
    if (!minuteResult.success) {
      return {
        allowed: false,
        retryAfter: Math.ceil((minuteResult.reset - Date.now()) / 1000),
        remaining: 0,
      };
    }

    // Check daily limit
    const dailyResult = await dailyLimit.limit(ip);
    if (!dailyResult.success) {
      return {
        allowed: false,
        retryAfter: Math.ceil((dailyResult.reset - Date.now()) / 1000),
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(minuteResult.remaining, dailyResult.remaining),
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open: allow the request if rate limiting is broken
    return { allowed: true };
  }
}
