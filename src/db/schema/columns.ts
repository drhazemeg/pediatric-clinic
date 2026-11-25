import { text, timestamp } from 'drizzle-orm/pg-core';

/** Text primary key generated in the application for offline-first / local-first IDs. */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** Domain table timestamps with Postgres timezone-aware defaults and app-level update bump. */
export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Auth table timestamps: Better Auth sets createdAt/updatedAt; $onUpdate bumps on updates. */
export const authTimestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date()),
});
