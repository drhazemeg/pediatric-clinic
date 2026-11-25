# Code-Fixing Guideline for the Pediatric Clinic Codebase

This guide distills every fix applied across the server functions, middleware, and dashboard component into a reusable playbook. Follow it top-to-bottom when resolving lint errors and TypeScript diagnostics in this project.

---

## 1. Project Ground Rules (never violate these)

- **Stack**: TanStack Start (`createServerFn`), TanStack Query, TanStack Store, Drizzle ORM, Zod v4, better-auth, Tailwind v4 + shadcn/ui, Bun, Vitest.
- **Linter**: Oxlint with `eslint`, `typescript`, `react`, `react-hooks`, `import`, `unicorn`, `oxc`, `shadcn`, `anti-slop` plugins.
- **Formatter**: Oxfmt (whole-file only). Never reformat unrelated code.
- **TSConfig**: `strict: true`. `noUncheckedIndexedAccess` is **on** in this project (all guards use `=== undefined`).
- **Style**: arrow-function consts for module-level functions (`func-style: expression`), single quotes, tabs, semicolons.
- **No new dependencies.** Use `zod`, `drizzle`, `react-query`, `structuredClone`, `AppServerError`, etc.

---

## 2. The Universal Playbook (apply in this order)

For each file, walk this checklist before touching code. It resolves ~95% of diagnostics.

### Step 1 — Fix `consistent-return` first

Every `createServerFn` handler wraps work in `try/catch`. **The `catch` block must return**:

```ts
try {
  // ...
  return result;
} catch (error) {
  return toAppServerError(error, 'Failed to ...');
}
```

Do **not** add an unreachable `throw` after the catch. `toAppServerError(...)` already returns `never`-typed error payloads; the `return` is what satisfies the rule.

### Step 2 — Fix `func-style` (function declarations → arrow consts)

Any `function foo(...)` at module scope becomes:

```ts
const foo = (...): ReturnType => { /* body */ };
```

Applies to helpers, guards, middleware builders, and components. Exception: the **default export** of a route file (TanStack Router expects `Route` to be exported as a const, which is already fine).

### Step 3 — Fix `no-use-before-define`

Move helper `const` declarations **above** the first function that references them. In practice:

- Put `getUserConfig`, `invalidateXCache`, `toJsonValue`, `isUserBanned`, `formatCurrency` etc. at the top of the file.
- Keep type-only imports at the top; keep type definitions near their usage.

### Step 4 — Fix `strict-boolean-expressions`

Replace every bare truthiness check on a nullable value:

| Don't | Do |
| --- | --- |
| `if (!x)` where `x: T \| null` | `if (x === null)` |
| `if (!x)` where `x: T \| undefined` | `if (x === undefined)` |
| `if (x)` where `x: string \| null` | `if (x !== null && x !== '')` |
| `if (x)` where `x: boolean \| null` | `if (x === true)` |
| `if (arr.length)` | `if (arr.length > 0)` |
| `if (obj)` (object type) | remove the check — objects are always truthy |
| `if (user.banned)` | `if (user.banned === true)` |

**Nullish coalescing**: `a || b` → `a ?? b` wherever the left side may be `null`/`undefined` but `''`/`0`/`false` are legitimate values (`prefer-nullish-coalescing`).

### Step 5 — Fix `no-unnecessary-condition`

The linter flags guards that are always true/falsy based on the query type. Two cases:

1. **`if (!row)` after `.returning()` / `findFirst()`** → typed `T | undefined`. The linter may say "always falsy" when the Drizzle row type is non-nullish. Rewrite as `if (row === undefined)` — this is explicit and satisfies both `no-unnecessary-condition` and `strict-boolean-expressions`. Then **check the actual query type**: if the query truly never returns `undefined`, delete the guard entirely.
2. **`account?.apiKey` where `account` is a non-nullish destructured row** → remove the `?.`.

### Step 6 — Fix `no-deprecated` (Zod v4)

| Deprecated | Replacement |
| --- | --- |
| `z.string().email()` | `z.email()` |
| `z.string().uuid()` | `z.uuid()` |
| `z.string().url()` | `z.url()` |
| `z.number().finite()` | `z.number()` (v4 rejects non-finite by default) |

### Step 7 — Fix `anti-slop/*` rules

- **`no-runtime-typeof`**: Never `typeof x === 'string'` / `typeof x === 'function'` to narrow a value.
  - At the **I/O boundary** (session, request body, headers): parse with Zod.
  - For **optional module presence**: use a null-check on the imported module (`if (mod !== null)`), not `typeof mod.fn === 'function'`.
  - For **error shape checks**: use `error instanceof AppServerError` instead of `typeof error === 'object' && 'status' in error`.
- **`require-safety-comment-for-type-assertion`**: Every `as` must have a `// SAFETY: ...` comment explaining the checked invariant. Prefer removing the assertion by narrowing first (`if (x.kind === 'a') { ... }`).
- **`no-unsafe-type-assertion`**: `value as never` and `value as SpecificNarrowType` are banned unless a `SAFETY:` comment justifies it. Real fix: branch on the discriminant (`data.mode`, `data.xAxis`) and pass correctly-shaped objects.
- **`no-unknown-parameters`**: Don't type a helper parameter as `unknown`; use a named domain type. If the value comes from outside, Zod-parse it at the boundary, then pass the narrowed type.

### Step 8 — Fix `eslint(no-nested-ternary)`

Refactor **every** nested ternary (even 2-level) into `if`/`else if`/`else` blocks with typed local variables:

```ts
let status: 'attention' | 'watch' | 'healthy';
if (a) { status = 'attention'; }
else if (b) { status = 'watch'; }
else { status = 'healthy'; }
```

For language pairs (En/Ar), declare both `let summaryEn: string` and `let summaryAr: string`, then branch.

### Step 9 — Fix `react/*` rules (components only)

- **`react(purity)`**: Never call impure functions (`new Date()`, `Math.random()`, `crypto.randomUUID()`) during render. Move into `useMemo(() => ..., [])` or `useState(() => ...)`.
- **`react(todo)` (try/finally unsupported)**: Replace `try { ... } finally { cleanup }` with `try { ... } catch (e) { cleanup; throw e; } cleanup;`. React Compiler needs explicit control flow.
- **`react-hooks/*`**: keep hook calls unconditional at the top of the component; never inside loops or conditionals.

### Step 10 — Fix `unicorn/*` rules

- **`prefer-structured-clone`**: `JSON.parse(JSON.stringify(x))` → `structuredClone(x)`.
- **`consistent-function-scoping`**: If a helper inside a component doesn't capture any parent variables, hoist it to module scope (e.g. `formatCurrency`).

### Step 11 — Fix `shadcn/*` rules (dashboard only, but generalizable)

The shadcn plugin enforces **primitive-owned styling**. Each shadcn primitive (`Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `MaterialIcon`, `Skeleton`, ...) has full authority over its typography, color, spacing, and motion. You may only pass `variant`, `size`, `asChild`, and layout classes to wrappers you own.

**Banned on shadcn primitives**:
- `text-*`, `font-*`, `tracking-*`, `uppercase` (typography is owned)
- `bg-*`, `text-*`, `border-*`, `hover:bg-*` (colors are owned — use `variant`)
- `transition-*`, `shadow-*`, `hover:shadow-*` (effects are owned — add a variant if you need one)
- `gap-*`, `pb-*`, `p-*`, `px-*`, `py-*` (spacing is owned — use `margin` here or `gap` on the wrapper)
- Any `[var(--x)]` arbitrary value (raw CSS var is off-token — use a Tailwind token)

**Mapping table for raw → token**:

| Raw | Token |
| --- | --- |
| `rounded-[var(--radius-xl)]` | `rounded-xl` |
| `border-[var(--oat-border)]` | `border-border` |
| `bg-[var(--pure-white)]` | `bg-background` |
| `bg-[var(--matcha-100)]`, `bg-[var(--oat-light)]` | `bg-muted` |
| `text-[var(--clay-black)]` | `text-foreground` |
| `text-[var(--warm-charcoal)]` | `text-muted-foreground` |
| `text-[var(--warm-charcoal)]/80` | `text-muted-foreground` (or `/70` if truly lighter) |
| `bg-blue-50` / `text-blue-600` | `bg-muted` / (drop icon color; MaterialIcon owns it) |
| `bg-emerald-50` / `text-emerald-600` | `bg-muted` / `text-chart-2` |
| `bg-amber-100 text-amber-800` | `bg-secondary text-secondary-foreground` |
| `bg-blue-100 text-blue-800` | `bg-muted text-muted-foreground` |
| `bg-emerald-100 text-emerald-800` | `bg-accent text-accent-foreground` |
| `bg-gray-100 text-gray-800` | `bg-background text-foreground` |
| `font-headline` | `font-heading` (the token that actually exists) |

**`no-unknown-classes`**: Only use Tailwind classes your `src/styles.css` `@theme` block defines. `font-headline` is not defined — use `font-heading`.

**`no-raw-colors`**: No `bg-<color>-<shade>` unless `--color-<name>` is declared in `src/styles.css`. If a semantic role is missing (warning, danger, success), either add a `--color-warning` etc. token, or reuse `bg-muted` / `bg-secondary` / `bg-accent`.

**`asChild` is your friend**: Instead of styling a `<Button>` inside a `<Link>`, put `<Link>` *inside* `<Button asChild>`. The button owns its styling, the link owns navigation.

### Step 12 — Fix `import(namespace)`

Errors like `"id" not found in imported namespace "./prescriptions"` mean a **stale diagnostic** — the code being flagged references a namespace export that no longer exists. Either:
- Re-paste the file to double-check; the diagnostic may reference a prior version.
- Or if the namespace import is real, verify every property accessed (`ns.id`, `ns.visitId`, ...) is actually exported from the module.

### Step 13 — Fix `typescript(2322)` / type-coercion issues

When `.at(-1)` returns `T | undefined` and the destination type is `T`:
- Use `USER_ROLES[USER_ROLES.length - 1]!` with a `SAFETY:` comment if the array is guaranteed non-empty, OR
- Use a literal fallback: `?? 'staff'` (with the role union in mind).

### Step 14 — Catch-block hygiene (universal across every server fn)

Every handler must end in:

```ts
} catch (error) {
  return toAppServerError(error, 'Failed to <action>');
}
```

**Never** `throw new Error(...)` inside a handler — use `throw new AppServerError('NOT_FOUND', 'X not found', 404)` so the catch block returns a properly-typed server error and downstream handlers see a consistent error contract.

**Never** let a `catch` fall through without returning/rethrowing — that's the `consistent-return` violation.

---

## 3. Server-Function-Specific Tips

### 3.1 Middleware composition

```ts
export const getPatientFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.id);
      const patient = await getPatientById(data.id);
      if (!patient) throw new AppServerError('NOT_FOUND', 'Patient not found', 404);
      return patient;
    } catch (error) {
      return toAppServerError(error, 'Failed to load patient');
    }
  });
```

**Rules**:
- Middleware runs before the validator? No — middleware runs in listed order; the validator runs on the raw input, then the handler sees `data` typed by Zod.
- `context.guard` is available after `clinicalStaffMiddleware` / `patientAccessMiddleware` chains (they add it via `createScopedGuard`).
- `context.guard.assertXAccess(id, options)` returns the fetched row — **use the returned row**, don't re-fetch.

### 3.2 `assertXAccess` returns the row

```ts
// Bad: two queries
await context.guard.assertAppointmentAccess(id);
const apt = await getAppointmentById(id);

// Good: use the returned row
const apt = await context.guard.assertAppointmentAccess(id);
```

### 3.3 Cache invalidation

Centralize the invalidation:

```ts
const invalidateAppointmentCache = (clinicId: string, patientId?: string) => {
  queryCache.invalidateTag(`appointments:clinic:${clinicId}`);
  if (patientId !== undefined) {
    queryCache.invalidateTag(`appointments:patient:${patientId}`);
  }
};
```

Notes:
- Use `!== undefined`, not `if (patientId)`.
- Put the helper **above** any function that calls it.
- Mutate-then-invalidate: invalidate only after the write succeeds.

### 3.4 Discriminated unions (Zod v4)

```ts
.validator(
  z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('by-age'), ... }),
    z.object({ mode: z.literal('by-length'), ... }),
    z.object({ mode: z.literal('grid'), ... }),
  ]),
)
```

The handler must narrow with `if (data.mode === 'by-age') { ... }` before accessing branch-specific fields. **Never** `data.indicator as Indicator` unless a `SAFETY:` comment is present.

### 3.5 Structured type narrowing for `getGrowthChartCurves`

```ts
if (range.xAxis === 'length') {
  return await getGrowthChartCurves(indicator, sex, {
    xAxis: 'length',
    min: range.min,
    max: range.max,
  });
}
return await getGrowthChartCurves(indicator, sex, {
  xAxis: 'age',
  min: range.min,
  max: range.max,
});
```

This replaces `range as never` and satisfies `no-unsafe-type-assertion`.

### 3.6 Optional/dynamic module imports

```ts
const mod = await import('@/db/queries/search.queries').catch(() => null);

if (mod !== null) {
  return await mod.searchClinicRecords(data);
}
// fallback
```

Not `typeof mod.searchClinicRecords === 'function'`. If the fallback should NOT swallow module-load errors, drop the `.catch(() => null)` — the outer `try/catch` still catches the rejected import.

---

## 4. Middleware Specifics (`fn-middleware.ts`)

### 4.1 `strict-boolean-expressions` on `clinicId`

`user.clinicId: string | null`. Every guard:

```ts
if (user.clinicId === null || user.clinicId === '') {
  throw new AppServerError('FORBIDDEN', 'User is not assigned to a clinic', 403);
}
```

Apply the same pattern to `targetClinicId`, `requestedClinicId`, `rawUser.clinicId`, etc.

### 4.2 `no-unnecessary-condition` on destructured rows

`const [row] = await db.select(...).limit(1);` returns `T | undefined`. The linter flags `if (!row)` when it thinks `row: T`; rewrite as `if (row === undefined)`.

If the guard is genuinely needed but the linter says it's always falsy (because `T` is non-nullish), **delete** the guard and trust the query.

### 4.3 `as` assertions at the auth boundary

```ts
// SAFETY: better-auth session user shape is a superset of the fields we read here.
const rawUser = sessionResult.user as { id: string; email?: string | null; ... };
```

The safety comment is mandatory. If you can instead do:

```ts
const rawUser = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  ...
}).parse(sessionResult.user);
```

That's better — Zod at the boundary satisfies `anti-slop/no-runtime-typeof` and `require-safety-comment-for-type-assertion` simultaneously.

### 4.4 Banned-boolean checks (metadata)

- `if (!user.banned)` → `if (user.banned !== true)`
- `if (!user.banExpires)` → `if (user.banExpires === undefined || user.banExpires === null)`
- `if (!target) { throw NOT_FOUND }` → `if (target === undefined) { ... }` (or delete, per 4.2)

---

## 5. Component Specifics (`dashboard.tsx` and beyond)

### 5.1 File shape for a route component

```tsx
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
// ...other imports

// 1. Module-level helpers (formatCurrency, formatDate, static lookups)
const formatCurrency = (cents: number) => /* ... */;

// 2. Small sub-components (KpiCard, QueueRow, EmptyState, SafetyNote, ...)

// 3. The page component
const DashboardComponent = () => { /* ... */ };

// 4. Route export LAST
export const Route = createFileRoute('/_app/dashboard')({
  staticData: routeShell.app,
  component: DashboardComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // oxlint-disable-next-line typescript(only-throw-error -- TanStack Router redirect control flow
      throw redirect({ to: '/login' });
    }
    return { session };
  },
});
```

Notes:
- Component defined **before** `Route` → resolves `no-use-before-define`.
- The `redirect()` disable comment is required because TanStack Router uses thrown objects, not `Error` instances; `only-throw-error` can't be satisfied without the disable.

### 5.2 Complexity control (`eslint(complexity)`)

If a component exceeds the complexity threshold (~20), extract:
- KPI card grid → `<KpiCard>` list
- Queue list → `<WaitingRoomCard>` + `<QueueRow>` + `<EmptyQueue>`
- Schedule list → `<TodayScheduleCard>`
- Tools list → `<ClinicalToolsCard>` + `<ClinicalToolLink>`
- Warning banner → `<SafetyNote>`

Each extraction has a single responsibility and zero cross-references. Use typed props objects (`type XProps = { ... }` above the component).

### 5.3 Hooks ordering

Never put `useMemo`/`useState` below early returns. All hooks go at the top of the component body:

```tsx
const DashboardComponent = () => {
  const { user, clinicId } = useActiveClinic();
  const [activeQueueActionId, setActiveQueueActionId] = useState<string | null>(null);
  const { data: queueData, isLoading: isQueueLoading } = useSyncQueueToStore(clinicId);
  const counts = useQueueCounts();
  const { data: todayAppointments, isLoading: isAppointmentsLoading } = useTodayAppointments(clinicId);
  // ...more hooks
  const todayDateString = useMemo(() => /* ... */, []);
  // derived values + handlers
  return ( /* JSX */ );
};
```

### 5.4 Async handler with cleanup (no `finally`)

```ts
const handleQueueStatusUpdate = async (
  id: string,
  status: 'IN_VITALS' | 'WITH_DOCTOR',
) => {
  setActiveQueueActionId(id);
  try {
    await updateStatusMutation.mutateAsync({ id, status });
  } catch (error) {
    setActiveQueueActionId(null);
    throw error;
  }
  setActiveQueueActionId(null);
};
```

React Compiler rejects `try/finally` — use explicit catch-and-rethrow.

### 5.5 Purity: `new Date()` at mount

```ts
const todayDateString = useMemo(
  () => new Intl.DateTimeFormat('en-US', { ... }).format(new Date()),
  [],
);
```

Even though `useMemo` can technically re-run, with `[]` deps the date is captured once. For higher safety, use `useState(() => format(new Date()))[0]`.

### 5.6 `Link` + `Button` composition (shadcn)

```tsx
<Button asChild>
  <Link to="/queue">
    <MaterialIcon name="person_check" />
    <span>Live Waiting Room</span>
  </Link>
</Button>
```

The Button owns its color/size/spacing/typography; the Link provides navigation. This satisfies `no-restyle` on `<Button>`.

### 5.7 Typed routes for sub-components

If you extract a link into a component that accepts a `to` prop, TanStack Router can't validate the literal at compile time. Two options:

1. **Preferred**: don't extract; write four separate `<Link to="...">` in the parent.
2. **Fallback**: `to={to as never}` with `// SAFETY:` or `// eslint-disable-next-line` explaining the dynamic route.

---

## 6. Common Pitfalls and Fixes (Cheat Sheet)

| Symptom | Root Cause | Fix |
| --- | --- | --- |
| `Async function expected a return value` | Catch block missing `return` | `return toAppServerError(...)` |
| `'X' was used before it was defined` | Helper defined below call site | Move helper `const` above |
| `Expected a function expression` | `function foo() {}` at module scope | `const foo = () => {}` |
| `Unexpected nullable string value in conditional` | `if (str)` where `str: string \| null` | `if (str !== null && str !== '')` |
| `Unnecessary conditional, value is always falsy` | Guard on a non-nullish query result | Delete or use `=== undefined` |
| `Prefer nullish coalescing` | `a \|\| b` on nullable string | `a ?? b` |
| `z.string().email() is deprecated` | Zod v4 rename | `z.email()` / `z.uuid()` / `z.url()` |
| `Unsafe assertion from 'never'` | `x as never` | Branch and pass typed object |
| `A typeof check narrows a representation` | `typeof x === 'string'` | Zod-parse at boundary; use module null-check for dynamic imports |
| `Do not nest ternary expressions` | `a ? b : c ? d : e` | Refactor to `if`/`else` |
| `Expected an error object to be thrown` | `throw redirect(...)` | `// oxlint-disable-next-line typescript(only-throw-error -- TanStack Router redirect control flow` |
| `Cannot call impure function during render` | `new Date()` inline | Wrap in `useMemo(() => ..., [])` or `useState(() => ...)` |
| `try/finally is not supported` | React Compiler | Replace `finally` with catch-and-rethrow |
| `rounded-[var(--radius-xl)] hardcodes off-token` | Arbitrary value | `rounded-xl` |
| `bg-blue-50 uses raw palette` | Raw Tailwind color | `bg-muted` |
| `font-headline is not a known class` | Token doesn't exist | `font-heading` |
| `text-2xl is not allowed on <MaterialIcon>` | Restyling shadcn primitive | Remove the class; use a `variant` if truly needed |
| `"id" not found in imported namespace` | Stale diagnostic or stale code | Re-paste; verify export |
| `Type 'T \| undefined' not assignable to 'T'` | `.at(-1)` or optional lookup | `!` with `SAFETY:` or literal fallback |

---

## 7. Fixing Strategy (workflow)

1. **Read the diagnostic list top-to-bottom.** Note which rules repeat.
2. **Fix structural rules first**: `func-style`, `no-use-before-define`, `consistent-return`. These are mechanical and create clean scaffolding.
3. **Fix safety rules next**: `strict-boolean-expressions`, `no-unnecessary-condition`, `prefer-nullish-coalescing`. These change the semantics of conditionals and make the rest easier to reason about.
4. **Fix boundary rules**: `no-deprecated` (Zod renames), `anti-slop/no-runtime-typeof` (Zod at I/O), `anti-slop/require-safety-comment-for-type-assertion` (comment or remove assertion).
5. **Fix formatting rules**: `no-nested-ternary`, `require-unicode-regexp` (`u` flag).
6. **Fix UI rules** (components only): `shadcn/no-raw-colors`, `no-arbitrary-values`, `no-restyle`, `no-unknown-classes`. Use the mapping table.
7. **Fix React-specific rules**: `react/purity` (memoize impure calls), `react/todo` (replace `finally`), `unicorn/consistent-function-scoping` (hoist).
8. **Re-run and confirm.** Any "unfixable" diagnostic that legitimately cannot be changed without altering the public contract gets a targeted `// oxlint-disable-next-line <rule> -- <reason>`.

### Rules for disable comments

- **Always include a `-- reason`** after the rule name.
- **Never** disable a rule that has a real fix (e.g. don't disable `consistent-return` — just add the return).
- **Acceptable disables** in this project:
  - `typescript(only-throw-error)` on `throw redirect(...)` — framework API.
  - `typescript(no-unnecessary-condition)` on a defensive guard that the compiler misjudges (rare; prefer deletion).
  - `anti-slop/require-safety-comment-for-type-assertion` is **never** disabled — instead, add the `SAFETY:` comment.
  - `@typescript-eslint/no-explicit-any` on `to as never` when TypeScript can't infer a TanStack Router literal.

---

## 8. Quick Reference: Standardized Catch Block

```ts
// ❌ Before
try {
  await work();
  return result;
} catch (error) {
  toAppServerError(error, 'Failed to do the work');  // no return
}

// ✅ After
try {
  await work();
  return result;
} catch (error) {
  return toAppServerError(error, 'Failed to do the work');
}
```

## Quick Reference: Standardized Guard

```ts
// ❌ Before
if (!row) throw new Error('Not found');

// ✅ After
if (row === undefined) {
  throw new AppServerError('NOT_FOUND', 'Resource not found', 404);
}
```

## Quick Reference: Standardized Optional-Spread

```ts
// ❌ Before
const payload = { ...(cond ? { a } : {}), ...(b ? { c } : {}) };

// ✅ After
const payload = { a: undefined, c: undefined };
if (cond) payload.a = a;
if (b) payload.c = c;
```

## Quick Reference: Standardized Zod at the Boundary

```ts
// ❌ Before
const user = sessionResult.user as { role?: unknown; clinicId?: unknown };

// ✅ After
const user = z.object({
  id: z.string(),
  role: userRoleSchema,
  clinicId: z.string().nullable(),
}).parse(sessionResult.user);
```

---

## 9. Per-File Checklist (paste in PR description)

```
- [ ] consistent-return: every catch block returns
- [ ] func-style: no `function foo()` at module scope
- [ ] no-use-before-define: helpers at top
- [ ] strict-boolean-expressions: no bare truthiness on nullable
- [ ] no-unnecessary-condition: guards match nullability
- [ ] prefer-nullish-coalescing: `??` not `||`
- [ ] no-deprecated: z.email / z.uuid / z.url / no .finite()
- [ ] anti-slop/no-runtime-typeof: Zod at boundary, module-null for dynamic imports
- [ ] anti-slop/require-safety-comment-for-type-assertion: every `as` has SAFETY:
- [ ] anti-slop/no-unsafe-type-assertion: no `as never`, branch on discriminant
- [ ] no-nested-ternary: if/else if/else with typed locals
- [ ] require-unicode-regexp: all regexes have /u
- [ ] shadcn/no-raw-colors: no bg-<color>-<shade>
- [ ] shadcn/no-arbitrary-values: no [var(--...)] in className
- [ ] shadcn/no-restyle: no typography/spacing/color/effect on primitives
- [ ] shadcn/no-unknown-classes: only real @theme tokens (font-heading not font-headline)
- [ ] react/purity: no new Date()/Math.random() in render body
- [ ] react/todo: no try/finally
- [ ] unicorn/prefer-structured-clone: structuredClone not JSON roundtrip
- [ ] unicorn/consistent-function-scoping: hoist non-capturing helpers
- [ ] AppServerError in throws (not `new Error`)
- [ ] Cache invalidate helper at top of file, guarded with !== undefined
```

---

## 10. Testing After Refactor

When you've fixed a file, before committing:

1. `bun run lint` — no new diagnostics.
2. `bun run typecheck` — strict TS passes.
3. For server functions: hit each one through the UI (or via `bun test`) to confirm behavior is unchanged.
4. For components: verify visual parity after the shadcn token mapping (colors should map to theme-consistent values; some subtle shades may shift — if a shade must stay exact, that's a signal to add a real `--color-*` token rather than to disable `no-raw-colors`).

---

## TL;DR — The Five Rules That Fix 90% of Errors

1. **`catch` blocks return `toAppServerError(...)`.**
2. **Every module-level function is `const foo = () => {}` — no `function` keyword.**
3. **Every nullable check is explicit: `=== undefined`, `!== null`, `=== ''`. Never `!x`.**
4. **Every throw is `new AppServerError(...)`.**
5. **Every className on a shadcn primitive uses theme tokens and `variant`, never raw colors, arbitrary `[var(--x)]`, or off-token typography.**

Follow these five and the remaining diagnostics collapse into mechanical edits.S
