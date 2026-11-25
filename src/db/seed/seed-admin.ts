import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';

import { and, eq, schema } from '..';
import { loadDatabaseUrl } from '../database-url';
import { adminAuditLog } from '../schema/admin';

const db = drizzle(loadDatabaseUrl());

export const SEED_ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
export const CLINIC_HURGHADA_ID = '00000000-0000-4000-8000-000000000001';

const ADMIN_CONFIG = {
  id: SEED_ADMIN_ID,
  name: 'DrHazem',
  email: 'clinysmar@gmail.com',
  password: 'HealthF@27',
  role: 'admin' as const,
  clinicId: CLINIC_HURGHADA_ID,
  username: 'drhazem',
  displayUsername: 'DrHazem',
  clinicName: 'Hurghada General Hospital — Pediatric Clinic',
  clinicPhone: '+20 65 344 0000',
  clinicAddress: 'El Nasr St., Hurghada, Red Sea Governorate',
} as const;

type UserRow = typeof schema.user.$inferSelect;

type SeedDB = typeof db;

const SCRYPT_CONFIG = {
  n: 16_384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16_384 * 16 * 2,
} as const;

const derivePasswordKey = async (
  password: string,
  salt: string,
): Promise<string> =>
  // oxlint-disable-next-line promise/avoid-new -- node:crypto scrypt uses callback completion
  await new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      SCRYPT_CONFIG.dkLen,
      {
        N: SCRYPT_CONFIG.n,
        r: SCRYPT_CONFIG.r,
        p: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      },
      (error, key) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(key.toString('hex'));
      },
    );
  });

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');

  return `${salt}:${await derivePasswordKey(password, salt)}`;
};

const verifyPassword = async (
  hash: string,
  password: string,
): Promise<boolean> => {
  const [salt, storedKey] = hash.split(':');

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = await derivePasswordKey(password, salt);
  const derivedBuffer = Buffer.from(derivedKey, 'hex');
  const storedBuffer = Buffer.from(storedKey, 'hex');

  return (
    derivedBuffer.length === storedBuffer.length &&
    timingSafeEqual(derivedBuffer, storedBuffer)
  );
};

// ── Clinic ───────────────────────────────────────────────────────────────

const ensureClinic = async (database: SeedDB) => {
  // Drizzle v1 RC: use explicit select + eq for deterministic single-row lookup
  const existingRows = await database
    .select()
    .from(schema.clinics)
    .where(eq(schema.clinics.id, ADMIN_CONFIG.clinicId))
    .limit(1);

  const existing = existingRows.at(0);

  if (existing !== undefined) {
    return existing;
  }

  const createdRows = await database
    .insert(schema.clinics)
    .values({
      id: ADMIN_CONFIG.clinicId,
      name: ADMIN_CONFIG.clinicName,
      address: ADMIN_CONFIG.clinicAddress,
      phone: ADMIN_CONFIG.clinicPhone,
      email: ADMIN_CONFIG.email,
    })
    .returning();

  const created = createdRows.at(0);

  if (created === undefined) {
    throw new Error('[seed] Failed to create clinic');
  }

  console.info(`[seed] created clinic ${created.id}`);

  return created;
};

// ── Admin ────────────────────────────────────────────────────────────────

type SeedTx = Parameters<Parameters<SeedDB['transaction']>[0]>[0];

const resolveOrCreateAdminUser = async (
  tx: SeedTx,
  email: string,
  clinicId: string,
  now: Date,
): Promise<UserRow> => {
  const byEmailRows = await tx
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  let userRow = byEmailRows.at(0) ?? null;

  if (userRow === null) {
    const byIdRows = await tx
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, ADMIN_CONFIG.id))
      .limit(1);

    userRow = byIdRows.at(0) ?? null;
  }

  if (userRow === null) {
    const createdRows = await tx
      .insert(schema.user)
      .values({
        id: ADMIN_CONFIG.id,
        name: ADMIN_CONFIG.name,
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        role: ADMIN_CONFIG.role,
        clinicId,
        address: ADMIN_CONFIG.clinicAddress,
        phone: ADMIN_CONFIG.clinicPhone,
      })
      .returning();

    const created = createdRows.at(0);

    if (created === undefined) {
      throw new Error('[seed] Failed to create admin user');
    }

    console.info(`[seed] created admin ${email}`);

    return created;
  }

  const needsUpdate =
    userRow.email !== email ||
    userRow.name !== ADMIN_CONFIG.name ||
    userRow.role !== ADMIN_CONFIG.role ||
    userRow.clinicId !== clinicId ||
    !userRow.emailVerified;

  if (!needsUpdate) {
    return userRow;
  }

  const updatedRows = await tx
    .update(schema.user)
    .set({
      name: ADMIN_CONFIG.name,
      email,
      role: ADMIN_CONFIG.role,
      clinicId,
      emailVerified: true,
    })
    .where(eq(schema.user.id, userRow.id))
    .returning();

  const updated = updatedRows.at(0);

  if (updated === undefined) {
    throw new Error('[seed] Failed to update existing admin fields');
  }

  console.info(`[seed] healed admin fields for ${email}`);

  return updated;
};

export async function ensureAdminUser(database: SeedDB): Promise<UserRow> {
  const email = ADMIN_CONFIG.email.toLowerCase();
  const clinic = await ensureClinic(database);

  return await database.transaction(async (tx) => {
    const now = new Date();
    const userRow = await resolveOrCreateAdminUser(tx, email, clinic.id, now);

    const credentialRows = await tx
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, userRow.id),
          eq(schema.account.providerId, 'credential'),
        ),
      )
      .limit(1);

    const existingCredential = credentialRows.at(0) ?? null;
    const hashedPassword = await hashPassword(ADMIN_CONFIG.password);

    if (existingCredential === null) {
      await tx.insert(schema.account).values({
        id: `${userRow.id}-credential`,
        accountId: userRow.id,
        providerId: 'credential',
        userId: userRow.id,
        createdAt: now,
        updatedAt: now,
        password: hashedPassword,
      });
      console.info(`[seed] created credential account for ${email}`);
    } else if (
      existingCredential.password === null ||
      existingCredential.password === '' ||
      !(await verifyPassword(
        existingCredential.password,
        ADMIN_CONFIG.password,
      ))
    ) {
      await tx
        .update(schema.account)
        .set({ password: hashedPassword })
        .where(
          and(
            eq(schema.account.userId, userRow.id),
            eq(schema.account.providerId, 'credential'),
          ),
        );
      console.warn(
        `[seed] rotated admin password for ${email} (drift detected)`,
      );
    }

    const storedRows = await tx
      .select({ password: schema.account.password })
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, userRow.id),
          eq(schema.account.providerId, 'credential'),
        ),
      )
      .limit(1);

    const storedCredential = storedRows.at(0);

    if (
      storedCredential?.password === undefined ||
      storedCredential.password === null ||
      storedCredential.password === '' ||
      !(await verifyPassword(storedCredential.password, ADMIN_CONFIG.password))
    ) {
      throw new Error(`[seed] credential verification failed for ${email}`);
    }

    await tx.insert(adminAuditLog).values({
      adminUserId: userRow.id,
      action: 'seed.admin.ensure',
      details: {
        email,
        clinicId: clinic.id,
      },
    });

    return userRow;
  });
}

/**
 * CLI entrypoint.
 *
 * Only runs when this file is executed directly:
 *   bun src/db/seed-admin.ts
 *
 * Importing this module is side-effect free.
 */
if (import.meta.main) {
  try {
    console.info('🌱 Ensuring admin user...');
    const admin = await ensureAdminUser(db);
    console.info(`✅ Admin ready: ${admin.email} (${admin.id})`);
  } catch (error) {
    console.error('❌ Admin seed failed:', error);
    process.exitCode = 1;
  } finally {
    await db.$client.end();
  }
}
