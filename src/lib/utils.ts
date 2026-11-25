import { z } from 'zod';

export { cn } from 'cn';

/**
 * Clamp a number between min and max values.
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Round a number to a specified precision.
 */
export function round(num: number, precision = 2): number {
  const factor = 10 ** precision;

  return Math.round(num * factor) / factor;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Wrap any of the above to validate server-action input safely. */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Validation wrapper parses unparsed unknown input via the Zod schema.
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new z.ZodError(result.error.issues);
  }

  return result.data;
}

/** Form-action friendly: returns flattened errors instead of throwing. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);

  return result.success
    ? ({ ok: true, data: result.data } as const)
    : ({ ok: false, errors: z.treeifyError(result.error) } as const);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format a name as "First Last".
 */
export function formatName(firstName: string, lastName: string): string {
  return `${capitalize(firstName)} ${capitalize(lastName)}`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  return `${str.slice(0, maxLength - 3)}...`;
}

// ---------------------------------------------------------------------------
// Number utilities
// ---------------------------------------------------------------------------

/**
 * Format a number with a specified number of decimal places.
 */
export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}
