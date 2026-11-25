// src/lib/ai/client.ts
import { z } from 'zod';

import {
  extractContentFromCompletionBody,
  isLikelyTruncatedJson,
  looksLikeHtmlErrorPage,
  stripReasoningBlocks,
} from './parse-response';

// ── Public types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: Array<ChatMessage>;
  model: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
}

export interface ChatCompletionResult {
  content: string;
  reasoning?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ── Zod schemas: the I/O boundary ─────────────────────────────────────────

const SseDeltaSchema = z.object({
  content: z.string().optional(),
  reasoning_content: z.string().optional(),
});

const SseChoiceSchema = z.object({
  delta: SseDeltaSchema.optional(),
  message: SseDeltaSchema.optional(),
});

const SseUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
});

const SseChunkSchema = z.object({
  choices: z.array(SseChoiceSchema).optional(),
  usage: SseUsageSchema.optional(),
});

type SseChunk = z.infer<typeof SseChunkSchema>;

interface ParsedSseLine {
  content?: string;
  reasoning?: string;
  usage?: ChatCompletionResult['usage'];
}

// ── Logger ────────────────────────────────────────────────────────────────

interface AiClientLogMeta {
  url?: string;
  model?: string;
  messageCount?: number;
  maxTokens?: number;
  stream?: boolean;
  attempt?: number;
  status?: number;
  statusText?: string;
  contentType?: string | null;
  preview?: string;
  isHtml?: boolean;
  contentLength?: number;
  usage?: ChatCompletionResult['usage'];
  originalLength?: number;
  originalMaxTokens?: number;
  newMaxTokens?: number;
  truncationRetry?: number;
}

const log = (
  level: 'info' | 'error' | 'warn',
  message: string,
  meta?: AiClientLogMeta,
): void => {
  const timestamp = new Date().toISOString();
  const metaStr = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;

  console[level](
    `[${timestamp}] [AI-CLIENT] ${level.toUpperCase()}: ${message}${metaStr}`,
  );
};

// ── SSE parsing ───────────────────────────────────────────────────────────

const parseSSELine = (line: string): ParsedSseLine | null => {
  if (!line.startsWith('data: ')) {
    return null;
  }

  const data = line.slice(6).trim();

  if (data === '[DONE]') {
    return null;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(data);
  } catch {
    return null;
  }

  const result = SseChunkSchema.safeParse(parsedJson);

  if (!result.success) {
    return null;
  }

  const chunk: SseChunk = result.data;
  const choice = chunk.choices?.[0];
  const content = choice?.delta?.content ?? choice?.message?.content;

  const reasoning =
    choice?.delta?.reasoning_content ?? choice?.message?.reasoning_content;

  return {
    content,
    reasoning,
    usage: chunk.usage,
  };
};

// ── Stream reader ─────────────────────────────────────────────────────────

const readSSEStream = async (
  reader: Pick<ReadableStreamDefaultReader<Uint8Array>, 'read'>,
  callbacks?: StreamCallbacks,
): Promise<{
  content: string;
  reasoning?: string;
  usage?: ChatCompletionResult['usage'];
  rawBody: string;
}> => {
  const decoder = new TextDecoder();
  let buffer = '';
  let rawBody = '';
  let fullContent = '';
  let fullReasoning = '';
  let lastUsage: ChatCompletionResult['usage'] | undefined;

  const consumeLine = (line: string): void => {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith(':')) {
      return;
    }

    const parsed = parseSSELine(trimmedLine);

    if (parsed === null) {
      return;
    }

    if (parsed.content !== undefined) {
      fullContent += parsed.content;
      callbacks?.onToken(parsed.content);
    }

    if (parsed.reasoning !== undefined) {
      fullReasoning += parsed.reasoning;
    }

    if (parsed.usage !== undefined) {
      lastUsage = parsed.usage;
    }
  };

  let isDone = false;

  while (!isDone) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- SSE reads are inherently sequential
    const { done, value } = await reader.read();

    if (done) {
      isDone = true;
      continue;
    }

    const chunkText = decoder.decode(value, { stream: true });
    rawBody += chunkText;
    buffer += chunkText;

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      consumeLine(line);
    }
  }

  if (buffer.trim() !== '') {
    consumeLine(buffer);
  }

  if (fullContent === '') {
    const nonStreamContent = extractContentFromCompletionBody(rawBody);

    if (nonStreamContent !== null && nonStreamContent !== '') {
      fullContent = nonStreamContent;
      callbacks?.onToken(nonStreamContent);
    }
  }

  return {
    content: fullContent,
    reasoning: fullReasoning === '' ? undefined : fullReasoning,
    usage: lastUsage,
    rawBody,
  };
};

// ── Retry / safety helpers ────────────────────────────────────────────────

const MAX_TRUNCATION_RETRIES = 2;

const isResponseFormatError = (status: number, text: string): boolean => {
  if (status !== 400 && status !== 422) {
    return false;
  }

  const lower = text.toLowerCase();

  return (
    lower.includes('response_format') ||
    lower.includes('json mode') ||
    lower.includes('json_object') ||
    lower.includes('unsupported parameter')
  );
};

const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',
  '100.100.100.200',
]);

const RFC1918_PATTERN =
  /^(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/u;

const isMetadataOrPrivateHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();

  if (METADATA_HOSTS.has(lower)) {
    return true;
  }

  if (RFC1918_PATTERN.test(hostname) && process.env.NODE_ENV === 'production') {
    return true;
  }

  return false;
};

const sanitizeForLog = (text: string, maxLen = 300): string =>
  text
    .replaceAll(/Bearer\s+[^\s"']+/giu, 'Bearer [REDACTED]')
    .replaceAll(/sk-[a-zA-Z0-9_-]{20,}/gu, '[REDACTED_API_KEY]')
    .slice(0, maxLen);

// ── Request body: an owner contract, not a dictionary ─────────────────────

interface ChatCompletionRequestBody {
  model: string;
  messages: Array<ChatMessage>;
  temperature: number;
  stream: boolean;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

// ── Retry context ─────────────────────────────────────────────────────────

interface RetryContext {
  attempt: number;
  truncationRetries?: number;
  retriedForResponseFormat?: boolean;
}

// ── Client ────────────────────────────────────────────────────────────────

/**
 * Build the request body. `retriedForResponseFormat` controls whether
 * `response_format` is included — some providers reject it on first try.
 */
const buildChatCompletionBody = (
  opts: ChatCompletionOptions,
  retriedForResponseFormat: boolean,
): ChatCompletionRequestBody => {
  const body: ChatCompletionRequestBody = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    stream: true,
  };

  if (opts.max_tokens !== undefined && opts.max_tokens > 0) {
    body.max_tokens = opts.max_tokens;
  }

  if (opts.response_format !== undefined && !retriedForResponseFormat) {
    body.response_format = opts.response_format;
  }

  return body;
};

export class OpenAICompatibleClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async chatCompletion(
    opts: ChatCompletionOptions,
    callbacks?: StreamCallbacks,
  ): Promise<ChatCompletionResult> {
    return await this.doChatCompletion(opts, callbacks, { attempt: 1 });
  }

  /**
   * Validate and resolve the request URL. Throws on invalid base URLs
   * and on SSRF-sensitive hosts (metadata endpoints, RFC1918 in prod).
   */
  private resolveUrl(): string {
    let hostname: string;

    try {
      const { hostname: parsedHostname } = new URL(this.baseUrl);
      hostname = parsedHostname;
    } catch {
      throw new Error(`Invalid base URL: ${this.baseUrl}`);
    }

    if (isMetadataOrPrivateHost(hostname)) {
      throw new Error(
        'Requests to metadata/private network addresses are not allowed',
      );
    }

    return `${this.baseUrl.replace(/\/$/u, '')}/chat/completions`;
  }

  /** Send the request and return the parsed SSE stream result. */
  private async sendAndStream(
    opts: ChatCompletionOptions,
    callbacks: StreamCallbacks | undefined,
    ctx: RetryContext,
  ): Promise<ChatCompletionResult> {
    const url = this.resolveUrl();

    const body = buildChatCompletionBody(
      opts,
      ctx.retriedForResponseFormat === true,
    );

    log('info', 'Sending chat completion request', {
      url: sanitizeForLog(url, 200),
      model: opts.model,
      messageCount: opts.messages.length,
      maxTokens: opts.max_tokens,
      stream: true,
      attempt: ctx.attempt,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });

    log('info', 'Received response', {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type'),
    });

    if (!res.ok) {
      const text = await res.text();
      const preview = sanitizeForLog(text, 500);

      log('error', 'API request failed', {
        status: res.status,
        statusText: res.statusText,
        preview,
        isHtml: looksLikeHtmlErrorPage(preview),
      });

      if (
        ctx.retriedForResponseFormat !== true &&
        isResponseFormatError(res.status, preview)
      ) {
        log('warn', 'Provider rejected response_format, retrying without it');

        return await this.doChatCompletion(opts, callbacks, {
          ...ctx,
          attempt: ctx.attempt + 1,
          retriedForResponseFormat: true,
        });
      }

      if (looksLikeHtmlErrorPage(preview)) {
        throw new Error(
          `Upstream returned an HTML error page (status ${res.status}), not AI JSON. ` +
            'Check base URL, proxy, or gateway configuration. ' +
            `Preview: ${preview.slice(0, 200)}`,
        );
      }

      throw new Error(`OpenAI-compatible API error ${res.status}: ${preview}`);
    }

    if (res.body === null) {
      throw new Error('Empty response body from API');
    }

    const reader = res.body.getReader();

    const streamResult = await readSSEStream(reader, callbacks);

    const result: ChatCompletionResult = {
      ...streamResult,
      content: stripReasoningBlocks(streamResult.content),
    };

    if (looksLikeHtmlErrorPage(result.content)) {
      const preview = result.content.slice(0, 500);

      log('error', 'Stream returned HTML error page instead of AI content', {
        preview: preview.slice(0, 200),
      });

      throw new Error(
        'Upstream returned an HTML error page in the stream, not AI JSON. ' +
          'Check base URL, proxy, or gateway configuration. ' +
          `Preview: ${preview.slice(0, 200)}`,
      );
    }

    if (result.content === '') {
      throw new Error('Empty response from AI');
    }

    return result;
  }

  private async doChatCompletion(
    opts: ChatCompletionOptions,
    callbacks: StreamCallbacks | undefined,
    ctx: RetryContext,
  ): Promise<ChatCompletionResult> {
    const result = await this.sendAndStream(opts, callbacks, ctx);

    const truncationRetries = ctx.truncationRetries ?? 0;
    const isTruncated = isLikelyTruncatedJson(result.content);

    if (truncationRetries >= MAX_TRUNCATION_RETRIES || !isTruncated) {
      log('info', 'Chat completion successful', {
        contentLength: result.content.length,
        usage: result.usage,
      });

      return result;
    }

    const baseTokens =
      opts.max_tokens !== undefined && opts.max_tokens > 0
        ? opts.max_tokens
        : 8192;

    const newMaxTokens = Math.min(Math.round(baseTokens * 1.75), 128_000);

    log('warn', 'Response looks truncated, retrying with more tokens', {
      originalLength: result.content.length,
      originalMaxTokens: opts.max_tokens,
      newMaxTokens,
      truncationRetry: truncationRetries + 1,
    });

    return await this.doChatCompletion(
      { ...opts, max_tokens: newMaxTokens },
      callbacks,
      {
        ...ctx,
        attempt: ctx.attempt + 1,
        truncationRetries: truncationRetries + 1,
      },
    );
  }
}
