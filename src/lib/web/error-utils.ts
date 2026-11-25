import { z } from 'zod';

const errorMessageSchema = z.object({
  message: z.string(),
});

/** Extract a human-readable message from an unknown error value.
 *  Safe to use in callbacks where caught values have type `unknown`. */
export function getErrorMessage(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Boundary formatter normalizes caught unknown errors via Error/Zod
  err: unknown,
): string {
  if (err instanceof Error) {
    return err.message;
  }

  const stringResult = z.string().safeParse(err);

  if (stringResult.success) {
    return stringResult.data;
  }

  const objectResult = errorMessageSchema.safeParse(err);

  if (objectResult.success) {
    return objectResult.data.message;
  }

  return 'An unexpected error occurred';
}
