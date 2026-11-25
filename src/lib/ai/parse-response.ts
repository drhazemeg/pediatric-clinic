import { z } from 'zod';

/**
 * Normalize model output before JSON parsing.
 * Reasoning models (GLM, DeepSeek, etc.) often wrap chain-of-thought in tags
 * that are NOT HTML error pages.
 */

type AiJsonPrimitive = string | number | boolean | null;

export type AiJsonValue =
  | AiJsonPrimitive
  | Array<AiJsonValue>
  | { [key: string]: AiJsonValue };

const aiJsonValueSchema: z.ZodType<AiJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(aiJsonValueSchema),
    z.record(z.string(), aiJsonValueSchema),
  ]),
);

const completionBodySchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const THINK_TAG = 'think';

const REASONING_BLOCK_PATTERNS: Array<RegExp> = [
  /<think>[\s\S]*?<\/redacted_thinking>/giu,
  /<thinking>[\s\S]*?<\/thinking>/giu,
  new RegExp(`<${THINK_TAG}>[\\s\\S]*?</${THINK_TAG}>`, 'giu'),
];

const UNCLOSED_REASONING_PREFIXES = [
  /^<think>[\s\S]*/iu,
  /^<thinking>[\s\S]*/iu,
  new RegExp(`^<${THINK_TAG}>[\\s\\S]*`, 'iu'),
];

export function stripReasoningBlocks(content: string): string {
  let text = content;

  for (const pattern of REASONING_BLOCK_PATTERNS) {
    text = text.replace(pattern, '');
  }

  for (const pattern of UNCLOSED_REASONING_PREFIXES) {
    text = text.replace(pattern, '');
  }

  return text.trim();
}

const TRUNCATED_JSON_ERROR = 'JSON response was truncated';

/** Detect incomplete JSON — valid start but stream/token limit cut off before closing braces. */
export function isLikelyTruncatedJson(content: string): boolean {
  const trimmed = stripReasoningBlocks(content).trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
    try {
      JSON.parse(trimmed);

      return false;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      return /unterminated string|unexpected eof|unexpected end|expected .* at end/iu.test(
        msg,
      );
    }
  }

  try {
    JSON.parse(trimmed);

    return false;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);

    if (
      /unterminated string|unexpected eof|unexpected end|expected .* at end/iu.test(
        msg,
      )
    ) {
      return true;
    }
  }

  return true;
}

const extractJsonCandidate = (content: string): string => {
  const trimmed = content.trim();
  const fenced = /```(?:json)?\s*(?<code>[\s\S]*?)```/iu.exec(trimmed);

  if (fenced?.groups?.code !== undefined && fenced.groups.code !== '') {
    return fenced.groups.code.trim();
  }

  const objIdx = trimmed.indexOf('{');
  const arrIdx = trimmed.indexOf('[');
  let start = -1;

  if (objIdx === -1) {
    start = arrIdx;
  } else if (arrIdx === -1) {
    start = objIdx;
  } else {
    start = Math.min(objIdx, arrIdx);
  }

  if (start < 0) {
    return trimmed;
  }

  const slice = trimmed.slice(start);
  const lastBrace = slice.lastIndexOf('}');
  const lastBracket = slice.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (end === -1) {
    return slice;
  }

  return slice.slice(0, end + 1);
};

export function parseAiJsonResponse(content: string): AiJsonValue {
  const normalized = stripReasoningBlocks(content);

  if (!normalized) {
    throw new Error('Empty response from AI');
  }

  const candidates = [normalized, extractJsonCandidate(normalized)];
  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  let lastError: Error | undefined;

  for (const candidate of uniqueCandidates) {
    try {
      return aiJsonValueSchema.parse(JSON.parse(candidate));
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const markdownCleaned = candidate
        .replace(/^```json\s*/iu, '')
        .replace(/```\s*$/u, '')
        .trim();

      if (markdownCleaned !== candidate) {
        try {
          return aiJsonValueSchema.parse(JSON.parse(markdownCleaned));
        } catch (markdownError: unknown) {
          lastError =
            markdownError instanceof Error
              ? markdownError
              : new Error(String(markdownError));
        }
      }
    }
  }

  if (isLikelyTruncatedJson(normalized)) {
    throw new Error(
      `${TRUNCATED_JSON_ERROR} before completion (usually max_tokens too low). Preview: ${normalized.slice(0, 200)}`,
    );
  }

  throw new Error(
    `Failed to parse AI response as JSON: ${lastError?.message ?? 'unknown error'}. Preview: ${normalized.slice(0, 200)}`,
  );
}

export { TRUNCATED_JSON_ERROR };

export function extractContentFromCompletionBody(body: string): string | null {
  const trimmed = body.trim();

  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = completionBodySchema.safeParse(JSON.parse(trimmed));

    if (!parsed.success) {
      return null;
    }

    const content = parsed.data.choices?.[0]?.message?.content;

    return content ?? null;
  } catch {
    return null;
  }
}

export function looksLikeHtmlErrorPage(content: string): boolean {
  const head = content.trim().slice(0, 300).toLowerCase();

  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<head') ||
    head.startsWith('<body') ||
    /^<\?(?:xml|php)/u.test(head)
  );
}
