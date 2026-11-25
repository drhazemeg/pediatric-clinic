// packages/ai/src/errors.ts

/**
 * Thrown when a clinic AI task fails part-way through.
 *
 * Carries enough context for the caller to:
 *  - record consumed tokens (billing / credit deduction)
 *  - log which clinical task failed (audit trail)
 *  - show a partial result if a later step failed after validation passed
 *  - surface Zod validation issues to the developer console
 */
export class GenerationError extends Error {
  /** Tokens consumed before the failure — always set when known. */
  tokensUsed?: number;

  /** Which clinic task failed, e.g. "soap_note" | "pediatric_dosing_safety". */
  taskKind?: string;

  /** How many validation/safety attempts were made before giving up. */
  attempts?: number;

  /**
   * Schema-validated data from an earlier step.
   * Set when e.g. the draft passed Zod but the safety critique failed —
   * allows the UI to show the draft with a "needs review" banner.
   */
  partialData?: unknown;

  /** Raw AI payload that failed schema validation, for debugging only. */
  rawPayload?: unknown;

  /** Zod issue paths, e.g. "icd10Suggestions.0.code: Invalid". */
  validationIssues?: Array<string>;

  constructor(
    message: string,
    opts?: {
      tokensUsed?: number;
      taskKind?: string;
      attempts?: number;
      partialData?: unknown;
      rawPayload?: unknown;
      validationIssues?: Array<string>;
      cause?: unknown;
    },
  ) {
    super(
      message,
      opts?.cause === undefined ? undefined : { cause: opts.cause },
    );
    this.name = 'GenerationError';
    this.tokensUsed = opts?.tokensUsed;
    this.taskKind = opts?.taskKind;
    this.attempts = opts?.attempts;
    this.partialData = opts?.partialData;
    this.rawPayload = opts?.rawPayload;
    this.validationIssues = opts?.validationIssues;
  }
}
