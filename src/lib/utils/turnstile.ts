// src/lib/utils/turnstile.ts (or wherever validateTurnstileToken lives)
import { z } from 'zod';

import { env } from '@/env/server';
import { AppServerError } from '@/server/fn-errors';
import { logger } from '@/server/logger';

const turnstileVerifyResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
});

export async function validateTurnstileToken(
  token: string | undefined,
): Promise<void> {
  if (env.TURNSTILE_DISABLED) {
    return;
  }

  const secretKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY ?? '';
  const isDev = env.NODE_ENV !== 'production';

  if (isDev && secretKey.length === 0) {
    return;
  }

  if (secretKey.length === 0) {
    throw new AppServerError(
      'BAD_REQUEST',
      'CAPTCHA is not configured. Set CLOUDFLARE_TURNSTILE_SECRET_KEY.',
      500,
    );
  }

  if (token === undefined || token.length === 0) {
    throw new AppServerError(
      'BAD_REQUEST',
      'CAPTCHA verification is required.',
      400,
    );
  }

  let res: Response;

  try {
    res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v1/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretKey, response: token }),
      },
    );
  } catch (error) {
    logger.error('[TURNSTILE] Network request to Cloudflare failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (isDev) {
      return;
    }

    throw new AppServerError(
      'BAD_REQUEST',
      'CAPTCHA verification service temporarily unavailable.',
      503,
    );
  }

  const text = await res.text();

  const rawJson = (() => {
    try {
      return z.unknown().parse(JSON.parse(text));
    } catch {
      logger.error('[TURNSTILE] Cloudflare returned invalid JSON', {
        status: res.status,
        body: text.slice(0, 500),
      });

      if (isDev) {
        return null;
      }

      throw new AppServerError(
        'BAD_REQUEST',
        'CAPTCHA verification failed. Please try again.',
        400,
      );
    }
  })();

  const parsed = turnstileVerifyResponseSchema.safeParse(rawJson);

  if (!parsed.success) {
    logger.warn(
      '[TURNSTILE] Cloudflare returned unexpected verification payload',
      {
        status: res.status,
      },
    );

    if (isDev) {
      return;
    }

    throw new AppServerError(
      'BAD_REQUEST',
      'CAPTCHA verification failed. Please try again.',
      400,
    );
  }

  if (!parsed.data.success) {
    logger.warn('[TURNSTILE] Token verification failed', {
      errorCodes: parsed.data['error-codes'],
    });
    throw new AppServerError(
      'BAD_REQUEST',
      'CAPTCHA verification failed. Please try again.',
      400,
    );
  }
}
