import { eq } from 'drizzle-orm';

import { logger } from '#/server/logger.ts';
import { db, user } from '@/db';

import { getRedis } from './rate-limit';

const BOUNCE_THRESHOLD = 3;
const BOUNCE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function recordBounce(
  email: string,
  reason?: string,
): Promise<void> {
  logger.warn('[BOUNCE] Email bounce recorded', { email, reason });

  const r = getRedis();
  const countKey = `bounce:count:${email}`;

  try {
    const count = await r.incr(countKey);
    await r.pexpire(countKey, BOUNCE_COOLDOWN_MS);

    if (count >= BOUNCE_THRESHOLD) {
      logger.warn('[BOUNCE] Auto-suspending users with bouncing email', {
        email,
        bounceCount: count,
      });

      const users = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email));

      await Promise.all(
        users.map(
          async (u) =>
            await db
              .update(user)
              .set({ banned: true })
              .where(eq(user.id, u.id)),
        ),
      );

      await r.setex(`bounce:block:${email}`, BOUNCE_COOLDOWN_MS / 1000, '1');
    }
  } catch (error) {
    logger.error('[BOUNCE] Redis unavailable', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function isEmailBounceBlocked(email: string): Promise<boolean> {
  const r = getRedis();

  try {
    const blocked = await r.get(`bounce:block:${email}`);

    return blocked === '1';
  } catch {
    return false;
  }
}
