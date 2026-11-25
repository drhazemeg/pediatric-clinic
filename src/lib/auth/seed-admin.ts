import type { DB } from '@/db';

import { eq } from 'drizzle-orm';

import { closeDb, db, schema } from '@/db';

import { auth } from '.';

export const CLINIC_HURGHADA_ID = '00000000-0000-4000-8000-000000000001';

export const SEED_ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
export const SEED_ADMIN_PASSWORD = 'HealthF27';

const ADMIN_CONFIG = {
  id: SEED_ADMIN_ID,
  name: 'DrHazem',
  email: 'clinysmar@gmail.com',
  role: 'admin' as const,
  clinicId: CLINIC_HURGHADA_ID,
  username: 'drhazem',
  displayUsername: 'DrHazem',
  clinicName: 'Hurghada General Hospital — Pediatric Clinic',
  clinicPhone: '+20 65 344 0000',
  clinicAddress: 'El Nasr St., Hurghada, Red Sea Governorate',
} as const;

type UserRow = typeof schema.user.$inferSelect;

// ── Clinic ───────────────────────────────────────────────────────────────

const ensureClinic = async (database: DB) => {
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

type AuthContext = Awaited<typeof auth.$context>;

const findExistingAdmin = async (
  database: DB,
  email: string,
): Promise<UserRow | null> => {
  const byEmailRows = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  const byEmail = byEmailRows.at(0);

  if (byEmail !== undefined) {
    return byEmail;
  }

  const byIdRows = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, ADMIN_CONFIG.id))
    .limit(1);

  return byIdRows.at(0) ?? null;
};

const ensureCredentialAccount = async (
  database: DB,
  userId: string,
  email: string,
  hashedPassword: string,
  ctx: AuthContext,
): Promise<void> => {
  const existingAccountRows = await database
    .select()
    .from(schema.account)
    .where(eq(schema.account.userId, userId))
    .limit(1);

  const existingAccount = existingAccountRows.at(0);

  // Better Auth stores providerId as "credential" for email/password
  const credentialAccount =
    existingAccount?.providerId === 'credential' ? existingAccount : null;

  if (credentialAccount === null) {
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: 'credential',
      accountId: userId,
      password: hashedPassword,
    });

    console.info(`[seed] linked credential account for ${email}`);

    return;
  }

  const matches =
    credentialAccount.password !== null &&
    credentialAccount.password !== '' &&
    (await ctx.password.verify({
      hash: credentialAccount.password,
      password: SEED_ADMIN_PASSWORD,
    }));

  if (!matches) {
    await database
      .update(schema.account)
      .set({ password: hashedPassword })
      .where(eq(schema.account.id, credentialAccount.id));

    console.warn(`[seed] rotated admin password for ${email} (drift detected)`);
  }
};

export async function ensureAdminUser(database: DB): Promise<UserRow> {
  const ctx = await auth.$context;
  const email = ADMIN_CONFIG.email.toLowerCase();
  const password = SEED_ADMIN_PASSWORD;
  const clinic = await ensureClinic(database);

  // Drizzle v1 RC: avoid relational query filters for conditional lookups
  // Use explicit select with eq; chain OR logic in code
  let userRow = await findExistingAdmin(database, email);
  const hashedPassword = await ctx.password.hash(password);

  // ── Create or heal ────────────────────────────────────────────────
  if (userRow === null) {
    await auth.api.createUser({
      body: {
        email,
        name: ADMIN_CONFIG.name,
        password,
        role: ADMIN_CONFIG.role,
      },
    });

    const createdRows = await database
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    const created = createdRows.at(0);

    if (created === undefined) {
      throw new Error('[seed] auth.api.createUser did not persist a row');
    }

    const updatedRows = await database
      .update(schema.user)
      .set({
        clinicId: clinic.id,
        emailVerified: true,
      })
      .where(eq(schema.user.id, created.id))
      .returning();

    const updated = updatedRows.at(0);

    if (updated === undefined) {
      throw new Error('[seed] Failed to update user after creation');
    }

    userRow = updated;
    console.info(`[seed] created admin ${email}`);
  } else {
    const needsUpdate =
      userRow.email !== email ||
      userRow.role !== ADMIN_CONFIG.role ||
      userRow.clinicId !== clinic.id ||
      !userRow.emailVerified;

    if (needsUpdate) {
      const updatedRows = await database
        .update(schema.user)
        .set({
          email,
          role: ADMIN_CONFIG.role,
          clinicId: clinic.id,
          emailVerified: true,
        })
        .where(eq(schema.user.id, userRow.id))
        .returning();

      const updated = updatedRows.at(0);

      if (updated === undefined) {
        throw new Error('[seed] Failed to update existing admin fields');
      }

      userRow = updated;
      console.info(`[seed] healed admin fields for ${email}`);
    }
  }

  await ensureCredentialAccount(
    database,
    userRow.id,
    email,
    hashedPassword,
    ctx,
  );

  // ── Fail-loud verification ────────────────────────────────────────
  const storedRows = await database
    .select({ password: schema.account.password })
    .from(schema.account)
    .where(eq(schema.account.userId, userRow.id))
    .limit(1);

  const stored = storedRows.at(0);

  const verified =
    stored?.password !== undefined &&
    stored.password !== null &&
    stored.password !== '' &&
    (await ctx.password.verify({
      hash: stored.password,
      password,
    }));

  if (!verified) {
    throw new Error(
      `[seed] credential verification failed for ${email}. ` +
        "The auth instance's password hasher likely changed — " +
        'check lib/auth/index.ts emailAndPassword.password.',
    );
  }

  return userRow;
}

/**
 * CLI entrypoint.
 *
 * Only runs when this file is executed directly:
 *   bun src/db/seed/seed-admin.ts
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
    await closeDb();
  }
}
