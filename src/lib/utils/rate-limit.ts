// src/lib/utils/rate-limit.ts
import IORedis from 'ioredis';

import { AppServerError } from '#/server/fn-errors.ts';
import { logger } from '#/server/logger.ts';
import { env } from '@/env/server';

let redis: IORedis | null = null;

export const getRedis = (): IORedis => {
  redis ??= new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

  return redis;
};

const SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call("ZREMRANGEBYSCORE", key, 0, now - window_ms)
local count = redis.call("ZCARD", key)

if count >= limit then
  return 0
end

redis.call("ZADD", key, now, now .. "-" .. math.random())
redis.call("PEXPIRE", key, window_ms)

return 1
`;

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
  /** When true, throw a 503 if Redis is unavailable instead of silently skipping. */
  strict?: boolean;
}

export const checkRateLimit = async (
  config: RateLimitConfig,
): Promise<void> => {
  const r = getRedis();
  const key = `ratelimit:${config.key}`;
  const now = Date.now();

  try {
    const allowed = await r.eval(
      SCRIPT,
      1,
      key,
      config.limit.toString(),
      config.windowMs.toString(),
      now.toString(),
    );

    if (allowed === 0) {
      throw new AppServerError(
        'TOO_MANY_REQUESTS',
        'Too many requests. Please try again later.',
        429,
      );
    }
  } catch (error) {
    if (error instanceof AppServerError) {
      throw error;
    }

    // SAFETY: only Error instances are meaningful for logging here;
    // anything else is wrapped so `stack` is preserved.
    const err = error instanceof Error ? error : new Error(String(error));

    if (config.strict === true) {
      logger.error(
        '[RATELIMIT] Redis unavailable, rejecting request (strict mode)',
        { error: err },
      );
      throw new AppServerError(
        'INTERNAL_SERVER_ERROR',
        'Service temporarily unavailable. Please try again.',
        503,
      );
    }

    logger.warn('[RATELIMIT] Redis unavailable, rate limit skipped', {
      error: err,
    });
  }
};

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Fails open (returns true) when Redis is unavailable unless `strict` is set.
 */
export const checkRateLimitAllowed = async (
  config: RateLimitConfig,
): Promise<boolean> => {
  const r = getRedis();
  const key = `ratelimit:${config.key}`;
  const now = Date.now();

  try {
    const allowed = await r.eval(
      SCRIPT,
      1,
      key,
      config.limit.toString(),
      config.windowMs.toString(),
      now.toString(),
    );

    return allowed !== 0;
  } catch (error) {
    if (config.strict === true) {
      logger.error('[RATELIMIT] Redis unavailable (strict mode)', {
        error,
      });

      return false;
    }

    logger.warn('[RATELIMIT] Redis unavailable, rate limit skipped', {
      error,
    });

    return true;
  }
};

export const checkDailyBudget = async (
  key: string,
  limit: number,
): Promise<boolean> => {
  const r = getRedis();
  const now = new Date();

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const ttlMs = endOfDay.getTime() - now.getTime();

  try {
    const current = await r.incrby(`budget:daily:${key}`, 0);

    if (current > limit) {
      return false;
    }

    await r.incr(`budget:daily:${key}`);
    await r.pexpire(`budget:daily:${key}`, ttlMs);

    return true;
  } catch {
    // Fail open
    return true;
  }
};

const OTP_BUDGET_MAX = 10;

// 7 days
const OTP_BUDGET_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const checkOtpBudget = async (email: string): Promise<void> => {
  const r = getRedis();
  const key = `otp:budget:${email}`;

  try {
    const count = await r.incr(key);

    if (count === 1) {
      await r.pexpire(key, OTP_BUDGET_TTL_MS);
    }

    if (count > OTP_BUDGET_MAX) {
      throw new AppServerError(
        'TOO_MANY_REQUESTS',
        'Too many verification attempts. Try again later.',
        429,
      );
    }
  } catch (error) {
    if (error instanceof AppServerError) {
      throw error;
    }

    logger.warn('[OTP_BUDGET] Redis unavailable, budget check skipped', {
      error,
    });
  }
};
