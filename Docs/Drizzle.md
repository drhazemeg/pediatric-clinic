## Changes in v1

This page shows everything that changed from `drizzle-orm@0.x`, `drizzle-kit@0.x`, `drizzle-seed@0.x` to the latest `drizzle-orm@1.0`, `drizzle-kit@1.0`, `drizzle-seed@1.0`

Read more on how to upgrade [here](https://orm.drizzle.team/docs/upgrade-v1)

## Breaking changes[](https://orm.drizzle.team/docs/v0-v1-changes#breaking-changes)

#### Relational filters reject explicit `undefined`[](https://orm.drizzle.team/docs/v0-v1-changes#relational-filters-reject-explicit-undefined)

In Relational Queries v2, omit an optional filter field or use `EmptyFilter` from `drizzle-orm/relations`. Passing `undefined` explicitly throws. An empty relation filter such as `where: { posts: {} }` is skipped. Use `posts: true` to require related rows and `posts: false` to require their absence.

See the [filter migration examples](https://orm.drizzle.team/docs/relations-v1-v2#handle-optional-filters-explicitly), especially if you are upgrading from an earlier v1 release candidate.

#### Read replicas require explicit routing[](https://orm.drizzle.team/docs/v0-v1-changes#read-replicas-require-explicit-routing)

With `withReplicas(primary, replicas)`, queries use the primary database by default. In 0.x, reads such as `select()` and `db.query` were routed to a replica automatically. Use `db.$replica` for reads you want to send to a replica:

```
// After: drizzle-orm@rc, with db created by withReplicas()
await db.select().from(users); // primary
await db.$replica.select().from(users); // replica
```

#### Query errors omit parameters by default[](https://orm.drizzle.team/docs/v0-v1-changes#query-errors-omit-parameters-by-default)

`DrizzleQueryError` no longer includes query parameters by default. Set `paramsInErrors: true` in your `drizzle()` configuration if you need them for debugging. This also includes parameter values in the error message, so consider what your error logs retain.

#### Relational Queries v1 removed[](https://orm.drizzle.team/docs/v0-v1-changes#relational-queries-v1-removed)

RQBv1 has been removed. Use [Relational Queries v2](https://orm.drizzle.team/docs/relations) with the new `defineRelations()` API instead and new features. You can find more details about migrating from rqb v1 to v2 [here](https://orm.drizzle.team/docs/relations-v1-v2)

A new relations system built around `defineRelations()`:

```
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

#### Remove `postgres-js` JSON serialization workarounds[](https://orm.drizzle.team/docs/v0-v1-changes#remove-postgres-js-json-serialization-workarounds)

If you manually added `JSON.stringify()` around JSON values in raw SQL or direct `postgres-js` calls to work around Drizzle’s driver overrides, remove that workaround. The driver serializes JSON parameters itself, so keeping it can double-stringify the value. In a `sql` template, wrap a JSON array in `sql.param(jsonArrayValue)` so it is treated as one parameter rather than a SQL value list.

#### Relational queries use an optimized SQL shape[](https://orm.drizzle.team/docs/v0-v1-changes#relational-queries-use-an-optimized-sql-shape)

Raw SQL that refers directly to generated relation aliases may need updating. Prefer relation filters and ordering, or set `strategy: 'basic'` on the affected query. See [the migration example](https://orm.drizzle.team/docs/relations-v1-v2#check-raw-sql-references-to-relations).

#### New Casing API[](https://orm.drizzle.team/docs/v0-v1-changes#new-casing-api)

The legacy `drizzle({ casing: 'camelCase' })` has been replaced with a table/view/schema-level API:

```
import { snakeCase, camelCase } from 'drizzle-orm/pg-core';

export const users = snakeCase.table('users', {
  id: serial().primaryKey(),
  fullName: text(),        // → full_name in DB
  createdAt: timestamp(),  // → created_at in DB
});

// Available on all entity types:
snakeCase.table / snakeCase.view / snakeCase.materializedView / snakeCase.schema
camelCase.table / camelCase.view / camelCase.materializedView / camelCase.schema
```

#### Validator packages consolidated into `drizzle-orm`[](https://orm.drizzle.team/docs/v0-v1-changes#validator-packages-consolidated-into-drizzle-orm)

IMPORTANT

You can still use drizzle-zod/valibot/typebox/arktype validation packages but all new update will be added to Drizzle ORM directly

- drizzle-zod -> [drizzle-orm/zod](https://orm.drizzle.team/docs/zod)
- drizzle-valibot -> [drizzle-orm/valibot](https://orm.drizzle.team/docs/valibot)
- drizzle-typebox -> [drizzle-orm/typebox-legacy](https://orm.drizzle.team/docs/typebox-legacy) (using @sinclair/typebox)
- drizzle-typebox -> [drizzle-orm/typebox](https://orm.drizzle.team/docs/typebox) (using typebox)
- drizzle-arktype -> [drizzle-orm/arktype](https://orm.drizzle.team/docs/arktype)
- new `drizzle-orm/effect-schema` package added

#### `.array()` is no longer chainable[](https://orm.drizzle.team/docs/v0-v1-changes#array-is-no-longer-chainable)

Use string syntax for multidimensional arrays:

```
// ❌ Before
column.array().array()

// ✅ After
column.array('[][]')
column.array('[][][]')
```

#### `.enableRLS()` deprecated[](https://orm.drizzle.team/docs/v0-v1-changes#enablerls-deprecated)

The `.enableRLS()` method on tables has been deprecated. Use `pgTable.withRLS()` instead:

```
// ❌ Before
const users = pgTable('users', { ... }).enableRLS();

// ✅ After
const users = pgTable.withRLS('users', { ... });
```

#### `.generatedAlwaysAs()` only accepts SQL[](https://orm.drizzle.team/docs/v0-v1-changes#generatedalwaysas-only-accepts-sql)

```
// ❌ Before — accepted raw values
.generatedAlwaysAs('some expression')

// ✅ After — only sql`` or () => sql``
.generatedAlwaysAs(sql`some expression`)
.generatedAlwaysAs(() => sql`some expression`)
```

#### `getTableColumns` deprecation[](https://orm.drizzle.team/docs/v0-v1-changes#gettablecolumns-deprecation)

Use `getColumns` instead

```
// ❌ Before
import { getTableColumns } from 'drizzle-orm';

const columns = getTableColumns(users);

// ✅ After
import { getColumns } from 'drizzle-orm';

const columns = getColumns(users);
```

#### New migration folder structure (v3)[](https://orm.drizzle.team/docs/v0-v1-changes#new-migration-folder-structure-v3)

**Linked discussion**: [#2832](https://github.com/drizzle-team/drizzle-orm/discussions/2832)

- No more `journal.json`
- SQL files and snapshots grouped into separate migration folders
- `drizzle-kit drop` command removed

These changes eliminate potential Git conflicts with the journal file and simplify the process of dropping or fixing conflicted migrations

Read more on how to upgrade [here](https://orm.drizzle.team/docs/upgrade-v1)

#### `schemaFilter` default behavior changed[](https://orm.drizzle.team/docs/v0-v1-changes#schemafilter-default-behavior-changed)

`drizzle-kit push` and `drizzle-kit pull` now manage **all schemas** by default, not just `public`. It also now supports glob patterns.

How it worked in 0.x versions

In 0.x, `drizzle-kit push` and `drizzle-kit pull` managed only tables in the `public` schema by default. You had to explicitly configure `schemaFilter` to manage other schemas.

```
// ❌ Before (0.x) — only `public` by default, explicit list only
export default defineConfig({
  schemaFilter: ['public', 'analytics'],
});

// ✅ After (1.0) — all schemas by default, glob patterns supported
export default defineConfig({
  // no schemaFilter needed if you want all schemas managed
});

// To limit to specific schemas, you can still use schemaFilter:
export default defineConfig({
  schemaFilter: ['public', 'app_*'], // glob patterns supported
});
```

#### `drizzle-kit push --strict` deprecation[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-push---strict-deprecation)

The `--strict` flag has been removed — its behavior is now the default. `drizzle-kit push` always prompts for confirmation for data-loss statements unless the `--force` flag is passed. Use [drizzle-kit push —explain](https://orm.drizzle.team/docs/drizzle-kit-push) to preview the SQL that would be executed before running it.

## Other features[](https://orm.drizzle.team/docs/v0-v1-changes#other-features)

#### Drizzle Kit for scripts and agents[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-for-scripts-and-agents)

If you use a coding agent for the upgrade, Drizzle Kit provides two ways to help it work with your project:

- The [Drizzle skill](https://orm.drizzle.team/docs/drizzle-kit-skills) gives your agent guidance on migration workflows, rename decisions and interpreting command results.
- The [MCP server](https://orm.drizzle.team/docs/drizzle-kit-mcp) lets your agent call your project’s Drizzle Kit to check migration history, generate migrations and read an existing database’s schema.

You can use them together, or use the skill with the CLI. After setup, try:

```
Use the Drizzle skill to check this project's migration history.
Use the Drizzle MCP server if connected. Explain any conflicts or warnings
before changing files or applying anything to the database.
```

Use `--output json` with `generate`, `push`, `pull`, `up`, `export`, or `check` to receive a structured response. JSON mode is non-interactive. When a command needs a rename or data-loss decision, provide it through `--hints` or `--hints-file` and run the command again.

The [programmatic SDK](https://github.com/drizzle-team/drizzle-orm/blob/beta/drizzle-kit/SDK.md) exposes these operations from `drizzle-kit`, with `exportSql()` for `export`.

#### Relational query ordering and caching[](https://orm.drizzle.team/docs/v0-v1-changes#relational-query-ordering-and-caching)

Relational Queries v2 can order by related rows, including aggregates such as `orderBy: { posts: 'desc(count)' }`. Both object and callback forms of `orderBy` are supported. See [ordering by relations](https://orm.drizzle.team/docs/relations-v1-v2#order-by-related-rows).

When a cache is configured with the `all` strategy, relational queries are cached by default. Set `withCache: false` on a query to opt out, or `withCache: true` to opt in with an explicit cache strategy.

#### JIT Mappers (opt-in)[](https://orm.drizzle.team/docs/v0-v1-changes#jit-mappers-opt-in)

Just-in-time compiled row mappers that make mapping as fast as the raw driver. You can find out more [here](https://orm.drizzle.team/docs/jit-mappers)

```
const db = drizzle({ ..., jit: true });
```

#### Codecs[](https://orm.drizzle.team/docs/v0-v1-changes#codecs)

This is a driver-aware transform layer for normalizing requests/responses to/from DB. It resolves data-mapping inconsistencies between regular select, JSON object, and array contexts. You can find out more [here](https://orm.drizzle.team/docs/codecs)

#### New MSSQL dialect[](https://orm.drizzle.team/docs/v0-v1-changes#new-mssql-dialect)

New MSSQL dialect support added. You can read more [here](https://orm.drizzle.team/docs/mssql/get-started-mssql)

#### New CockroachDB dialect[](https://orm.drizzle.team/docs/v0-v1-changes#new-cockroachdb-dialect)

New CockroachDB dialect support added. You can read more [here](https://orm.drizzle.team/docs/cockroach/get-started-cockroach)

#### New NetlifyDB driver[](https://orm.drizzle.team/docs/v0-v1-changes#new-netlifydb-driver)

New NetlifyDB driver support added. You can read more [here](https://orm.drizzle.team/docs/connect-netlify-db)

Note: The Netlify Database driver is developed and maintained by the Netlify team.

#### Effect integration[](https://orm.drizzle.team/docs/v0-v1-changes#effect-integration)

- New **`@effect/sql-pg` driver support**. You can read more [here](https://orm.drizzle.team/docs/connect-effect-postgres)
- **Effect Schema validation** via `drizzle-orm/effect-schema`. You can read more [here](https://orm.drizzle.team/docs/effect-schema)

Add custom tags to queries. Tags are appended as SQL comments at the end of each query. You can read more [here](https://orm.drizzle.team/docs/sql-comments)

```
db.select().from(users).comment("my_first_tag");
// select "id", "name" from "users" /*my_first_tag*/
```

#### Column aliases via `.as()`[](https://orm.drizzle.team/docs/v0-v1-changes#column-aliases-via-as)

You can find out more aliasing info [here](https://orm.drizzle.team/docs/aliases)

```
const query = db
  .select({ age: users.age.as('ageOfUser'), id: users.id.as('userId') })
  .from(users)
  .orderBy(asc(users.id.as('userId')));
```

#### Prepared queries[](https://orm.drizzle.team/docs/v0-v1-changes#prepared-queries)

`.prepare(name)` name is now optional

#### Full `drizzle-kit` rewrite[](https://orm.drizzle.team/docs/v0-v1-changes#full-drizzle-kit-rewrite)

The kit has been architecturally redesigned:

- Migrated from database snapshots to DDL snapshots
- Reworked diff detection and application
- Schema introspection reduced from ~10s to < 1s
- Added query hints and explain support for push

#### `drizzle-kit pull --init`[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-pull---init)

Creates the drizzle migration table and marks the first pulled migration as applied. You can read more [here](https://orm.drizzle.team/docs/drizzle-kit-pull)

#### `drizzle-kit push --explain`[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-push---explain)

Shows the SQL that would be executed without actually running it. You can read more [here](https://orm.drizzle.team/docs/drizzle-kit-push)

#### `drizzle-kit check` — commutativity check[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-check--commutativity-check)

Detects non-commutative migrations across branches — e.g., two branches altering the same column, or one renaming a table that another is altering.

How it works:

- Builds a DAG from snapshot `prevIds` to understand branch structure
- Finds fork points where branches diverged
- Computes the DDL diff from parent snapshot to each branch leaf
- Checks conflicts using a footprint map of which DDL statement types can interfere

If conflicts are found, the report tells you exactly which migrations on which branches are incompatible

#### PostgreSQL snapshots and migration conflicts[](https://orm.drizzle.team/docs/v0-v1-changes#postgresql-snapshots-and-migration-conflicts)

The initial PostgreSQL snapshot contains the full schema. Subsequent snapshots store structured diffs. Keep migration folders and their snapshots together in version control.

Remove `--ignore-conflicts` from your PostgreSQL scripts. If `generate` reports conflicting migration branches, preview the proposed repair:

```
drizzle-kit generate --fix-conflicts --explain
```

This shows the SQL and migration folders the repair would delete, without changing files. Review that output before running without `--explain`: the repair deletes the conflicting migrations and their children, then generates one replacement migration. Any database that ran a deleted migration must be reset.

#### Updates to the migration table[](https://orm.drizzle.team/docs/v0-v1-changes#updates-to-the-migration-table)

The migration table is automatically upgraded when you run `drizzle-kit up`. Two new columns are added:

- **`name`** — the full migration folder name (e.g. `20250220153045_brave_wolverine`)
- **`applied_at`** — timestamp of when the migration was executed (pre-existing rows are backfilled with `NULL`)

| Column       | Type                     | v0  | v1           |
| ------------ | ------------------------ | --- | ------------ |
| `id`         | serial                   | yes | yes          |
| `hash`       | text                     | yes | yes          |
| `created_at` | bigint                   | yes | yes (legacy) |
| `name`       | text                     | —   | new          |
| `applied_at` | timestamp with time zone | —   | new          |

Migrations are now matched by their full folder name instead of timestamps. Even if two migrations are generated within the same second, the name suffix guarantees uniqueness.

During the upgrade, existing rows are backfilled using a multi-step strategy:

1.  **Millis match** — truncate stored millis to seconds, match against local folder timestamps
2.  **Hash tiebreaker** — if multiple migrations share the same second, disambiguate via the SQL hash
3.  **Hash-only fallback** — if millis matching fails entirely, match by hash alone

This means the upgrade handles all edge cases: normal single-developer projects, teams with closely-timed migrations, and even cases where the old journal data doesn’t perfectly align with the new folder names.

#### Migrator applies all missing migrations[](https://orm.drizzle.team/docs/v0-v1-changes#migrator-applies-all-missing-migrations)

Previously the migrator only looked for local migrations with a creation date later than the last applied one. Now it detects and applies **every missing migration**, regardless of timestamp ordering. All migrations are matched against the full folder name (14-digit UTC timestamp + name suffix).

#### Top-level `await` in drizzle config files[](https://orm.drizzle.team/docs/v0-v1-changes#top-level-await-in-drizzle-config-files)

Top-level `await` is now supported in `drizzle.config.ts` and schema files on Node.js.

#### Drizzle-kit: Build system improvements[](https://orm.drizzle.team/docs/v0-v1-changes#drizzle-kit-build-system-improvements)

- Migrated from `esbuild-register` to `tsx` loader — seamless ESM and CJS support
- Native Bun and Deno launch support

#### TS Schema file processing[](https://orm.drizzle.team/docs/v0-v1-changes#ts-schema-file-processing)

Only files with the following extensions are processed: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`. All other file types are ignored.

## Migrating to Relational Queries version 2

This guide migrates Relational Queries v1 from `drizzle-orm@0.x` or early v1 betas to Relational Queries v2 in `drizzle-orm@rc`. Notes about changes from earlier release candidates are marked below.

Legacy relations imports

The before examples below use the 0.x import: `import { relations } from 'drizzle-orm'`. In early v1 betas that kept both relational APIs, the legacy function was available as `import { relations } from 'drizzle-orm/_relations'`. Both are starting points for this migration. The `_relations` module still exists in rc.5, but RQB v1 support has been removed from the database drivers. For rc.5, use `import { defineRelations } from 'drizzle-orm'`.

```
// Before: drizzle-orm@0.x
import { relations } from 'drizzle-orm';
```

```
// Before: early v1 betas with the legacy RQB v1 API
import { relations } from 'drizzle-orm/_relations';
```

```
// After: drizzle-orm@rc (RQB v2)
import { defineRelations } from 'drizzle-orm';
```

```
npm i drizzle-orm@rc
npm i drizzle-kit@rc -D
```

```
yarn add drizzle-orm@rc
yarn add drizzle-kit@rc -D
```

```
pnpm add drizzle-orm@rc
pnpm add drizzle-kit@rc -D
```

```
bun add drizzle-orm@rc
bun add drizzle-kit@rc -D
```

This guide assumes familiarity with:

- **Relations Fundamentals** - [read here](https://orm.drizzle.team/docs/relations-schema-declaration)
- **drizzle-kit pull** - [read here](https://orm.drizzle.team/docs/drizzle-kit-pull)

### API changes[](https://orm.drizzle.team/docs/relations-v1-v2#api-changes)

#### What is working differently from v1[](https://orm.drizzle.team/docs/relations-v1-v2#what-is-working-differently-from-v1)

One of the biggest updates were in **Relations Schema definition**

The first difference is that you no longer need to specify `relations` for each table separately in different objects and then pass them all to `drizzle()` along with your schema. In Relational Queries v2, you now have one dedicated place to specify all the relations for all the tables you need.

The `r` parameter in the callback provides comprehensive autocomplete functionality - including all tables from your schema and functions such as `one`, `many`, and `through` - essentially offering everything you need to specify your relations.

```
// relations.ts
import * as schema from "./schema"
import { defineRelations } from "drizzle-orm"

export const relations = defineRelations(schema, (r) => ({
    ...
}));
```

```
// index.ts
import { relations } from "./relations"
import { drizzle } from "drizzle-orm/..."

const db = drizzle(process.env.DATABASE_URL, { relations })
```

##### What is different?[](https://orm.drizzle.team/docs/relations-v1-v2#what-is-different)

```
import * as p from 'drizzle-orm/pg-core';

export const users = p.pgTable('users', {
id: p.integer().primaryKey(),
name: p.text(),
invitedBy: p.integer('invited_by'),
});

export const posts = p.pgTable('posts', {
id: p.integer().primaryKey(),
content: p.text(),
authorId: p.integer('author_id'),
});
```

**One place for all your relations**

Before: drizzle-orm@0.x (RQB v1)

```
import { relations } from "drizzle-orm";
import { users, posts } from './schema';

export const usersRelation = relations(users, ({ one, many }) => ({
  invitee: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsRelation = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

✅ v2

```
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    invitee: r.one.users({
      from: r.users.invitedBy,
      to: r.users.id,
    }),
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

You can still separate it into different `parts`, and you can make the parts any size you want

```
import { defineRelations, defineRelationsPart } from 'drizzle-orm';
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    invitee: r.one.users({
      from: r.users.invitedBy,
      to: r.users.id,
    }),
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  }
}));

export const part = defineRelationsPart(schema, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  }
}));
```

and then you can provide it to the db instance

```
const db = drizzle(process.env.DB_URL, { relations: { ...relations, ...part } })
```

**Define `many` without `one`**

In v1, if you wanted only the `many` side of a relationship, you had to specify the `one` side on the other end, which made for a poor developer experience.

In v2, you can simply use the `many` side without any additional steps

Before: drizzle-orm@0.x (RQB v1)

```
import { relations } from "drizzle-orm";
import { users, posts } from './schema';

export const usersRelation = relations(users, ({ one, many }) => ({
  posts: many(posts),
}));

export const postsRelation = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

✅ v2

```
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
}));
```

**New `optional` option**

`optional: false` removes `null` from the related value’s inferred type. It does not create a database constraint. Use it only when you are certain that the related row will always exist.

Before: drizzle-orm@0.x (RQB v1)

✅ v2

```
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.one.posts({
      from: r.users.id,
      to: r.posts.authorId,
      optional: false,
    }),
  },
}));
```

**No modes in `drizzle()`**

We found a way to use the same strategy for all MySQL dialects, so there’s no need to specify them

Before: drizzle-orm@0.x (RQB v1)

```
import * as schema from './schema'

const db = drizzle(process.env.DATABASE_URL, { mode: "planetscale", schema });
// or
const db = drizzle(process.env.DATABASE_URL, { mode: "default", schema });
```

✅ v2

```
import { relations } from './relations'

const db = drizzle(process.env.DATABASE_URL, { relations });
```

**`from` and `to` upgrades**

We’ve renamed `fields` to `from` and `references` to `to`, and we made both accept either a single value or an array

Before: drizzle-orm@0.x (RQB v1)

```
...
author: one(users, {
  fields: [posts.authorId],
  references: [users.id],
}),
...
```

✅ v2

```
...
author: r.one.users({
  from: r.posts.authorId,
  to: r.users.id,
}),
...
```

```
...
author: r.one.users({
  from: [r.posts.authorId],
  to: [r.users.id],
}),
...
```

**`relationName` -> `alias`**

Before: drizzle-orm@0.x (RQB v1)

```
import { relations } from "drizzle-orm";
import { users, posts } from './schema';

export const postsRelation = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  relationName: "author_post",
  }),
}));
```

✅ v2

```
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
      alias: "author_post",
    }),
  },
}));
```

**`custom types` new function**

There is a new [codec](https://orm.drizzle.team/docs/codecs) function was added to custom types, so you can control how data is mapped

You can find out more [here](https://orm.drizzle.team/docs/custom-types#ts-doc-for-type-definitions)

✅ v2

```
const customBytes = customType<{
  data: Buffer;
  driverData: Buffer;
  jsonData: string;
}>({
  dataType: () => "bytea",
  codec: "bytea",
});
```

##### What is new?[](https://orm.drizzle.team/docs/relations-v1-v2#what-is-new)

**`through` for many-to-many relations**

Previously, you would need to query through a junction table and then map it out for every response

You don’t need to do it now!

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.integer().primaryKey(),
  name: p.text(),
  verified: p.boolean().notNull(),
});

export const groups = p.pgTable("groups", {
  id: p.integer().primaryKey(),
  name: p.text(),
});

export const usersToGroups = p.pgTable(
  "users_to_groups",
  {
    userId: p
      .integer("user_id")
      .notNull()
      .references(() => users.id),
    groupId: p
      .integer("group_id")
      .notNull()
      .references(() => groups.id),
  },
  (t) => [p.primaryKey({ columns: [t.userId, t.groupId] })]
);
```

Before: drizzle-orm@0.x (RQB v1)

```
export const usersRelations = relations(users, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  group: one(groups, {
    fields: [usersToGroups.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [usersToGroups.userId],
    references: [users.id],
  }),
}));
```

```
// Query example
const response = await db.query.users.findMany({
  with: {
    usersToGroups: {
      columns: {},
      with: {
        group: true,
      },
    },
  },
});
```

✅ v2

```
import * as schema from './schema';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations(schema, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    participants: r.many.users(),
  },
}));
```

```
// Query example
const response = await db.query.users.findMany({
  with: {
    groups: true,
  },
});
```

**Predefined filters**

Before: drizzle-orm@0.x (RQB v1)

✅ v2

```
import * as schema from './schema';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations(schema,
  (r) => ({
    groups: {
      verifiedUsers: r.many.users({
        from: r.groups.id.through(r.usersToGroups.groupId),
        to: r.users.id.through(r.usersToGroups.userId),
        where: {
          verified: true,
        },
      }),
    },
  })
);
```

```
// Query example: get groups with all verified users
const response = await db.query.groups.findMany({
  with: {
    verifiedUsers: true,
  },
});
```

##### `where` is now object[](https://orm.drizzle.team/docs/relations-v1-v2#where-is-now-object)

Before: drizzle-orm@0.x (RQB v1)

```
const response = db.query.users.findMany({
  where: (users, { eq }) => eq(users.id, 1),
});
```

✅ v2

```
const response = db.query.users.findMany({
  where: {
    id: 1,
  },
});
```

For a complete API Reference please check our [Select Filters docs](https://orm.drizzle.team/docs/rqb#select-filters)

Complex filter example using RAW

```
// schema.ts
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text(),
  email: text().notNull(),
  age: integer(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
  subscriptionEnd: timestamp("subscription_end"),
  lastActivity: timestamp("last_activity"),
  preferences: jsonb(),      // JSON column for user settings/preferences
  interests: text().array(),     // Array column for user interests
});
```

```
const response = await db.query.users.findMany({
  where: {
    AND: [
      {
        OR: [
          { RAW: (table) => sql`LOWER(${table.name}) LIKE 'john%'` },
          { name: { ilike: "jane%" } },
        ],
      },
      {
        OR: [
          { RAW: (table) => sql`${table.preferences}->>'theme' = 'dark'` },
          { RAW: (table) => sql`${table.preferences}->>'theme' IS NULL` },
        ],
      },
      { RAW: (table) => sql`${table.age} BETWEEN 25 AND 35` },
    ],
  },
});
```

##### `orderBy` accepts objects and callbacks[](https://orm.drizzle.team/docs/relations-v1-v2#orderby-accepts-objects-and-callbacks)

The v1 callback form still works in v2. The object form is an alternative for column ordering.

0.x and rc.5: supported callback syntax

```
const response = db.query.users.findMany({
  orderBy: (users, { asc }) => [asc(users.id)],
});
```

✅ v2

```
const response = db.query.users.findMany({
  orderBy: { id: "asc" },
});
```

##### Filtering by relations[](https://orm.drizzle.team/docs/relations-v1-v2#filtering-by-relations)

Before: drizzle-orm@0.x (RQB v1)

✅ v2

Example: Get all users whose ID>10 and who have at least one post with content starting with “M”

```
const usersWithPosts = await db.query.usersTable.findMany({
  where: {
    id: {
      gt: 10
    },
    posts: {
      content: {
        like: 'M%'
      }
    }
  },
});
```

Before: drizzle-orm@0.x (RQB v1)

✅ v2

```
await db.query.posts.findMany({
limit: 5,
offset: 2, // correct ✅
with: {
comments: {
offset: 3, // correct ✅
limit: 3,
},
},
});
```

#### How to migrate relations schema definition from v1 to v2[](https://orm.drizzle.team/docs/relations-v1-v2#how-to-migrate-relations-schema-definition-from-v1-to-v2)

##### **Option 1**: Using `drizzle-kit pull`[](https://orm.drizzle.team/docs/relations-v1-v2#option-1-using-drizzle-kit-pull)

In new version `drizzle-kit pull` supports pulling `relations.ts` file in a new syntax:

##### Step 1[](https://orm.drizzle.team/docs/relations-v1-v2#step-1)

```
npx drizzle-kit pull
```

```
yarn drizzle-kit pull
```

```
pnpm drizzle-kit pull
```

```
bunx drizzle-kit pull
```

#### Step 2[](https://orm.drizzle.team/docs/relations-v1-v2#step-2)

Transfer generated relations code from `drizzle/relations.ts` to the file you are using to specify your relations

```
 ├ 📂 drizzle
 │ ├ 📂 meta
 │ ├ 📜 migration.sql
 │ ├ 📜 relations.ts ────────┐
 │ └ 📜 schema.ts            |
 ├ 📂 src                    │
 │ ├ 📂 db                   │
 │ │ ├ 📜 relations.ts <─────┘
 │ │ └ 📜 schema.ts
 │ └ 📜 index.ts
 └ …
```

`drizzle/relations.ts` includes an import of all tables from `drizzle/schema.ts`, which looks like this:

```
import * as schema from './schema'
```

You may need to change this import to a file where ALL your schema tables are located.

If there are multiple schema files, you can do the following:

```
import * as schema1 from './schema1'
import * as schema2 from './schema2'
...
```

#### Step 3[](https://orm.drizzle.team/docs/relations-v1-v2#step-3)

Change drizzle database instance creation and provide `relations` object instead of `schema`

Before: drizzle-orm@0.x (RQB v1)

```
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/...'

const db = drizzle('<url>', { schema })
```

After

```
// should be imported from a file in Step 2
import { relations } from './relations'
import { drizzle } from 'drizzle-orm/...'

const db = drizzle('<url>', { relations })
```

If you had MySQL dialect, you can remove `mode` from `drizzle()` as long as it’s not needed in version 2

##### **Option 2**: Manual migration[](https://orm.drizzle.team/docs/relations-v1-v2#option-2-manual-migration)

If you want to migrate manually, you can check our [Drizzle Relations section](https://orm.drizzle.team/docs/relations) for the complete API reference and examples of one-to-one, one-to-many, and many-to-many relations.

#### How to migrate queries from v1 to v2[](https://orm.drizzle.team/docs/relations-v1-v2#how-to-migrate-queries-from-v1-to-v2)

##### Migrate `where` statements[](https://orm.drizzle.team/docs/relations-v1-v2#migrate-where-statements)

You can check our [Select Filters docs](https://orm.drizzle.team/docs/rqb#select-filters) to see examples and a complete API reference.

With the new syntax, you can use `AND`, `OR`, `NOT`, and `RAW`, plus all the filtering operators that were previously available in Relations v1.

**Examples**

simple eq

using AND

using OR

using NOT

complex example using RAW

```
const response = await db.query.users.findMany({
  where: {
    age: 15,
  },
});
```

```
select
  "d0"."id" as "id",
  "d0"."name" as "name",
  "d0"."age" as "age"
from
  "users" as "d0"
where
  "d0"."age" = 15
```

##### Handle optional filters explicitly[](https://orm.drizzle.team/docs/relations-v1-v2#handle-optional-filters-explicitly)

Starting with `1.0.0-rc.5`, an explicit `undefined` in a relational filter throws instead of silently skipping the condition. Omit the field, or use `EmptyFilter` when skipping it is intentional:

```
import { EmptyFilter } from 'drizzle-orm/relations';

const userId: number | undefined = undefined;

const response = await db.query.users.findMany({
  where: {
    id: userId ?? EmptyFilter,
  },
});
```

Here, an absent `userId` leaves the query unfiltered. Only skip the condition if returning all users is intended. This change concerns `db.query` filters, not conditional filters in the SQL query builder.

##### Check whether a relation exists[](https://orm.drizzle.team/docs/relations-v1-v2#check-whether-a-relation-exists)

Use `true` to require a related row and `false` to require its absence:

```
// Users with at least one post
const usersWithPosts = await db.query.users.findMany({
  where: { posts: true },
});

// Users without posts
const usersWithoutPosts = await db.query.users.findMany({
  where: { posts: false },
});
```

Starting with `1.0.0-rc.5`, `where: { posts: {} }` skips the relation filter. It does not check whether a post exists. The same applies when the object contains only empty conditions.

##### Migrate `orderBy` statements[](https://orm.drizzle.team/docs/relations-v1-v2#migrate-orderby-statements)

You can use an object to specify each column and its sort direction (`asc` or `desc`). The callback form remains supported, so an existing `orderBy: (users, { asc }) => [asc(users.id)]` does not need to change.

0.x and rc.5: supported callback syntax

```
const response = db.query.users.findMany({
  orderBy: (users, { asc }) => [asc(users.id)],
});
```

✅ v2

```
const response = db.query.users.findMany({
  orderBy: { id: "asc" },
});
```

You can order users by the number of related posts:

```
const usersByPostCount = await db.query.users.findMany({
  orderBy: { posts: 'desc(count)' },
});
```

For a field on a `many` relation, specify an aggregate, such as `orderBy: { posts: { id: 'desc(max)' } }`. For a `one` relation, use the field’s direction directly, such as `orderBy: { author: { name: 'asc' } }` when querying posts.

##### Check raw SQL references to relations[](https://orm.drizzle.team/docs/relations-v1-v2#check-raw-sql-references-to-relations)

Starting with `1.0.0-rc.5`, the default `optimized` query strategy can nest relation subqueries differently. Raw SQL in `where` or `orderBy` that refers directly to generated relation aliases may no longer work.

Prefer relation filters and relation ordering, which do not depend on those aliases. If an existing query needs its previous SQL shape, opt out for that root query:

```
const response = await db.query.users.findMany({
  strategy: 'basic',
  with: { posts: true },
});
```

##### Migrate `many-to-many` queries[](https://orm.drizzle.team/docs/relations-v1-v2#migrate-many-to-many-queries)

Relational Queries v1 had a very complex way of managing many-to-many queries. You had to use junction tables to query through them explicitly, and then map those tables out, like this:

```
// Before: drizzle-orm@0.x (RQB v1)
const response = await db.query.users.findMany({
  with: {
    usersToGroups: {
      columns: {},
      with: {
        group: true,
      },
    },
  },
});
```

After upgrading to Relational Queries v2, your many-to-many relation will look like this:

```
import * as schema from './schema';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations(schema, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    participants: r.many.users(),
  },
}));
```

And when you migrate your query, it will become this:

```
// Query example
const response = await db.query.users.findMany({
  with: {
    groups: true,
  },
});
```

### Internal changes[](https://orm.drizzle.team/docs/relations-v1-v2#internal-changes)

1.  Every `drizzle` database, `session`, `migrator` and `transaction` instance updated with new generic arguments for RQB v2 queries

**migrator**

Before: drizzle-orm@0.x (RQB v1)

```
export async function migrate<
  TSchema extends Record<string, unknown>
>(
  db: NodePgDatabase<TSchema>,
  config: MigrationConfig,
) {
  ...
}
```

now

```
export async function migrate<TRelations extends AnyRelations>(
db: NodePgDatabase<TRelations>,
config: MigrationConfig,
) {
  ...
}
```

**session**

Before: drizzle-orm@0.x (RQB v1)

```
export class NodePgSession<
TFullSchema extends Record<string, unknown>,
TSchema extends V1.TablesRelationalConfig,
> extends PgSession<NodePgQueryResultHKT, TFullSchema, TSchema>
```

now

```
export class NodePgSession<
TRelations extends AnyRelations,
> extends PgAsyncSession<NodePgQueryResultHKT, TRelations>
```

**transaction**

Before: drizzle-orm@0.x (RQB v1)

```
export class NodePgTransaction<
TFullSchema extends Record<string, unknown>,
TSchema extends V1.TablesRelationalConfig,
> extends PgTransaction<NodePgQueryResultHKT, TFullSchema, TSchema>
```

now

```
export class NodePgTransaction<
TRelations extends AnyRelations,
> extends PgAsyncTransaction<NodePgQueryResultHKT, TRelations>
```

**driver**

Before: drizzle-orm@0.x (RQB v1)

```
export class NodePgDatabase<
TSchema extends Record<string, unknown> = Record<string, never>,
> extends PgDatabase<NodePgQueryResultHKT, TSchema>
```

now

```
export class NodePgDatabase<
TRelations extends AnyRelations = EmptyRelations,
> extends PgAsyncDatabase<NodePgQueryResultHKT, TRelations>
```

2.  Updated `DrizzleConfig` generic with `TRelations` argument and `relations: TRelations` field

Before: drizzle-orm@0.x (RQB v1)

```
export interface DrizzleConfig<
  TSchema extends Record<string, unknown> = Record<string, never>
> {
  logger?: boolean | Logger;
  schema?: TSchema;
  casing?: Casing;
}
```

now

```
export interface DrizzleConfig<
TRelationConfigs extends AnyRelations = EmptyRelations,
> {
logger?: boolean | Logger | undefined;
relations?: TRelationConfigs | undefined;
cache?: Cache | undefined;
jit?: boolean | undefined;
}
```

3.  The following entities have been removed from `drizzle-orm` and `drizzle-orm/relations`. The original imports now include new types used by Relational Queries v2, so make sure to update your imports if you intend to use the older types:

A list of all removed entities

- `Relations`
- `TableRelationsKeysOnly`
- `ExtractTableRelationsFromSchema`
- `ExtractRelationsFromTableExtraConfigSchema`
- `getOperators`
- `FindTableByDBName`
- `RelationalSchemaConfig`
- `RelationConfig`
- `extractTablesRelationalConfig`
- `relations`
- `createOne`
- `createMany`
- `NormalizedRelation`
- `normalizeRelation`
- `createTableRelationsHelpers`
- `TableRelationsHelpers`

4.  In the same manner, `${dialect}-core/query-builders/query` files were updated with RQB v2’s alternatives

```
import { RelationalQueryBuilder, PgRelationalQuery } from 'drizzle-orm/pg-core/query-builders/query';
```
