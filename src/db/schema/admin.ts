import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const userCredit = pgTable(
  'user_credit',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    tokenBalance: integer('token_balance').default(0).notNull(),
    lifetimeTokensUsed: integer('lifetime_tokens_used').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('user_credit_user_id_idx').on(t.userId),
    check(
      'user_credit_lifetime_tokens_nonneg_check',
      sql`${t.lifetimeTokensUsed} >= 0`,
    ),
  ],
);

export const creditTransaction = pgTable(
  'credit_transaction',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('credit_transaction_user_id_idx').on(t.userId),
    index('credit_transaction_user_created_idx').on(t.userId, t.createdAt),
    check(
      'credit_transaction_tokens_used_nonneg_check',
      sql`${t.tokensUsed} IS NULL OR ${t.tokensUsed} >= 0`,
    ),
  ],
);

type AuditDetailsValue =
  | null
  | boolean
  | number
  | string
  | Array<AuditDetailsValue>
  | { [key: string]: AuditDetailsValue };

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    targetUserId: text('target_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    details: jsonb('details').$type<{
      [key: string]: AuditDetailsValue;
    } | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('admin_audit_log_admin_user_id_idx').on(t.adminUserId),
    index('admin_audit_log_target_user_id_idx').on(t.targetUserId),
    index('admin_audit_log_action_idx').on(t.action),
  ],
);

export const platformConfig = pgTable('platform_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const backgroundJob = pgTable(
  'background_job',
  {
    // use crypto.randomUUID()
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    progressMessage: text('progress_message'),
    errorMessage: text('error_message'),
    inputJson: jsonb('input_json').notNull(),
    resultJson: jsonb('result_json'),
    logs: jsonb('logs').default([]).notNull(),
    tokensUsed: integer('tokens_used'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('background_job_user_idx').on(t.userId),
    index('background_job_status_idx').on(t.status),
    index('background_job_kind_idx').on(t.kind),
  ],
);
