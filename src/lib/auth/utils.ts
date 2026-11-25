import type { Role } from './role';

// Utils.ts (dev-only branch, keep the warn in prod path)
export const sendPasswordResetEmail = (email: string, url: string): void => {
  if (process.env.NODE_ENV !== 'production') {
    // Dev has no mailer — surface the reset URL so the flow is testable.
    console.warn({
      email,
      level: 'info',
      msg: 'Password reset URL (dev)',
      url,
    });

    return;
  }

  console.warn({
    email,
    level: 'info',
    msg: 'Password reset email dispatched',
  });
};

interface CachedRole {
  role: Role;
  banned: boolean;
  banReason: string | null;
  clinicId: string | null;
  banExpires: Date | null;
  expiresAt: number;
}

const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, CachedRole>();

export const getCachedRole = (userId: string) => {
  const entry = roleCache.get(userId);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    roleCache.delete(userId);

    return null;
  }

  return {
    banExpires: entry.banExpires,
    banReason: entry.banReason,
    banned: entry.banned,
    clinicId: entry.clinicId,
    role: entry.role,
  };
};

export const setCachedRole = (
  userId: string,
  role: Role,
  // Preserves null rather than coercing to string.
  clinicId: string | null,
  banned = false,
  banReason: string | null = null,
  banExpires: Date | null = null,
): void => {
  if (userId === '') {
    return;
  }

  roleCache.set(userId, {
    banExpires,
    banReason,
    banned,
    // Store as-is; don't coerce "" <- null.
    clinicId,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
    role,
  });
};

/** Evict expired entries. Safe to call from a timer or manually. */
export const sweepRoleCache = (): void => {
  const now = Date.now();

  for (const [userId, entry] of roleCache) {
    if (entry.expiresAt <= now) {
      roleCache.delete(userId);
    }
  }
};

/** Invalidate one user (used by role updates, bans, deletes). */
export const invalidateCachedRole = (userId: string): void => {
  roleCache.delete(userId);
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
