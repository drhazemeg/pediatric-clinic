import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { z } from 'zod';

import { OpenAICompatibleClient } from '../client';

const BASE_URL = 'https://api.openai.com/v1';
const API_KEY = 'sk-test-key-12345';
const MODEL = 'gpt-4';

type FetchFn = typeof globalThis.fetch;

const requestBodySchema = z.object({
  response_format: z.object({ type: z.string().optional() }).optional(),
});

const resolveResponse = async (
  body: BodyInit | null,
  init: ResponseInit,
): Promise<Response> => {
  await Promise.resolve();

  return new Response(body, init);
};

/** Bun/TS types fetch as an object with static helpers (e.g. preconnect), not just a function. */
const asFetchMock = (
  fn: (...args: Parameters<FetchFn>) => ReturnType<FetchFn>,
): FetchFn =>
  // SAFETY: Mock fetch handler matches FetchFn call signature; static properties like preconnect are unused.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Mock fetch handler omits static FetchFn properties unused in tests
  fn as FetchFn;

const setMockFetch = (
  fn: (...args: Parameters<FetchFn>) => ReturnType<FetchFn>,
): void => {
  globalThis.fetch = asFetchMock(fn);
};

const parseRequestBody = (opts?: RequestInit) => {
  if (opts?.body === undefined || opts.body === null) {
    throw new Error('Expected request body in mock fetch');
  }

  return requestBodySchema.parse(JSON.parse(z.string().parse(opts.body)));
};

const makeMockStream = (chunks: Array<string>): ReadableStream => {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start: (controller) => {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
};

const makeFetchMock = (streamChunks: Array<string>, status = 200): FetchFn =>
  asFetchMock(
    async () =>
      await resolveResponse(makeMockStream(streamChunks), {
        status,
        headers: { 'content-type': 'text/event-stream' },
      }),
  );

describe('OpenAICompatibleClient', () => {
  let originalFetch: FetchFn;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends correct request and parses SSE response', async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: ' World' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { total_tokens: 10 } })}\n`,
      'data: [DONE]\n',
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.content).toBe('Hello World');
  });

  it('calls onToken callback for each token', async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'A' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'B' } }] })}\n`,
      'data: [DONE]\n',
    ]);

    const tokens: Array<string> = [];
    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    await client.chatCompletion(
      { model: MODEL, messages: [{ role: 'user', content: 'Test' }] },
      { onToken: (t) => tokens.push(t) },
    );

    expect(tokens).toEqual(['A', 'B']);
  });

  it('returns usage from the last chunk', async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { total_tokens: 5 } })}\n`,
      'data: [DONE]\n',
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.usage?.total_tokens).toBe(5);
  });

  it('throws on non-OK response', () => {
    setMockFetch(
      async () =>
        await resolveResponse('Bad Request', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        }),
    );

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    ).rejects.toThrow('400');
  });

  it('throws on empty response body', () => {
    setMockFetch(async () => await resolveResponse(null, { status: 200 }));

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    ).rejects.toThrow('Empty response body');
  });

  it('throws on invalid base URL', () => {
    const client = new OpenAICompatibleClient('not-a-url', API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    ).rejects.toThrow('Invalid base URL');
  });

  it('throws on metadata host (169.254.169.254)', () => {
    const client = new OpenAICompatibleClient(
      'https://169.254.169.254/v1',
      API_KEY,
    );

    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    ).rejects.toThrow('metadata/private network');
  });

  it('retries without response_format on 400 with response_format error', async () => {
    let callCount = 0;
    setMockFetch(async (_input, opts) => {
      callCount += 1;

      if (callCount === 1) {
        const body = parseRequestBody(opts);
        expect(body.response_format).toBeDefined();

        return await resolveResponse('response_format is not supported', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }

      const body = parseRequestBody(opts);
      expect(body.response_format).toBeUndefined();

      return await resolveResponse(
        makeMockStream([
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'retried' } }] })}\n`,
          'data: [DONE]\n',
        ]),
        {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        },
      );
    });

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
      response_format: { type: 'json_object' },
    });

    expect(callCount).toBe(2);
    expect(result.content).toBe('retried');
  });

  it('retries with more tokens on truncated response', async () => {
    let callCount = 0;
    setMockFetch(async (_input, _opts) => {
      callCount += 1;

      const responseContent =
        callCount === 1
          ? `data: ${JSON.stringify({ choices: [{ delta: { content: '{"incomplete":' } }] })}\n` +
            'data: [DONE]\n'
          : `data: ${JSON.stringify({ choices: [{ delta: { content: '{"complete": true}' } }] })}\n` +
            'data: [DONE]\n';

      return await resolveResponse(makeMockStream([responseContent]), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    });

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 100,
    });

    expect(callCount).toBe(2);
    expect(result.content).toBe('{"complete": true}');
  });

  it('strips reasoning blocks and returns JSON from GLM-style streams', async () => {
    const json = '{"questions":[{"format":"mcq"}]}';
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: '<think>\nPlanning questions...\n</think>' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: json } }] })}\n`,
      'data: [DONE]\n',
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.content).toBe(json);
  });

  it('ignores reasoning_content delta and keeps final content', async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'internal reasoning only' } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: '{"ok":true}' } }] })}\n`,
      'data: [DONE]\n',
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.content).toBe('{"ok":true}');
  });

  it('throws on HTML error page in stream', () => {
    setMockFetch(
      async () =>
        await resolveResponse(
          makeMockStream([
            `data: ${JSON.stringify({ choices: [{ delta: { content: '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>' } }] })}\n`,
            'data: [DONE]\n',
          ]),
          {
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
          },
        ),
    );

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    ).rejects.toThrow('HTML');
  });

  it('falls back to non-stream JSON body when SSE yields no tokens', async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"questions":[]}' } }],
    });

    setMockFetch(
      async () =>
        await resolveResponse(body, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);

    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.content).toBe('{"questions":[]}');
  });
});
