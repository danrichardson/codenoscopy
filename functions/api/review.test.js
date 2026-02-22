// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __testOnly, onRequestPost } from './review';

const env = {
  ANTHROPIC_API_KEY: 'test-key',
  MAX_CODE_CHARS: '20',
  RATE_LIMIT_MAX_REQUESTS: '2',
  RATE_LIMIT_WINDOW_MS: '60000'
};

const buildContext = (body, ip = '203.0.113.1') => ({
  env,
  request: new Request('http://localhost/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
    },
    body: JSON.stringify(body),
  }),
});

const buildRawContext = (rawBody, ip = '203.0.113.1') => ({
  env,
  request: new Request('http://localhost/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
    },
    body: rawBody,
  }),
});

describe('POST /api/review', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    __testOnly.resetRateLimitStore();
    vi.unstubAllGlobals();
  });

  it('rejects missing code or persona', async () => {
    const response = await onRequestPost(buildContext({ code: '', persona: '' }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });

  it('rejects invalid persona', async () => {
    const response = await onRequestPost(buildContext({ code: 'print(1)', persona: 'invalid' }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid persona');
  });

  it('rejects malformed JSON body', async () => {
    const response = await onRequestPost(buildRawContext('{"code":'));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid JSON body');
  });

  it('rejects oversized code input', async () => {
    const response = await onRequestPost(buildContext({
      code: '123456789012345678901',
      persona: 'security-expert',
      model: 'haiku',
      stream: false,
    }));

    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data.error).toContain('Maximum allowed size');
  });

  it('returns JSON review for non-stream requests', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      content: [{ text: 'Review text' }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await onRequestPost(buildContext({
      code: 'print(1)',
      persona: 'security-expert',
      model: 'haiku',
      stream: false,
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.review).toBe('Review text');
    expect(data.persona).toBe('Security Expert');
  });

  it('returns stream response when stream is enabled', async () => {
    const upstreamStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n'));
        controller.close();
      }
    });

    fetch.mockResolvedValueOnce(new Response(upstreamStream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    }));

    const response = await onRequestPost(buildContext({
      code: 'print(1)',
      persona: 'security-expert',
      model: 'haiku',
      stream: true,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    const text = await response.text();
    expect(text).toContain('content_block_delta');
  });

  it('returns 502 on upstream API failure', async () => {
    fetch.mockResolvedValueOnce(new Response('upstream error', { status: 500 }));

    const response = await onRequestPost(buildContext({
      code: 'print(1)',
      persona: 'security-expert',
      model: 'haiku',
      stream: false,
    }));

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain('Failed to get review from Claude');
  });

  it('injects dynamic persona directives into system prompt', async () => {
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.0);

    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      content: [{ text: 'Review text' }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await onRequestPost(buildContext({
      code: 'print(1)',
      persona: 'security-expert',
      model: 'haiku',
      stream: false,
    }));

    expect(response.status).toBe(200);
    const anthropicCall = fetch.mock.calls[0];
    const requestBody = JSON.parse(anthropicCall[1].body);

    expect(requestBody.system).toContain('Dynamic review directives');
    expect(requestBody.system).toContain('Focus areas:');
    expect(requestBody.system).toContain('Mood:');
    expect(requestBody.system).toContain('Format:');

    randomSpy.mockRestore();
  });

  it('rate limits repeated requests from the same IP', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify({
      content: [{ text: 'Review text' }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const basePayload = {
      code: 'print(1)',
      persona: 'security-expert',
      model: 'haiku',
      stream: false,
    };

    const first = await onRequestPost(buildContext(basePayload, '198.51.100.7'));
    const second = await onRequestPost(buildContext(basePayload, '198.51.100.7'));
    const third = await onRequestPost(buildContext(basePayload, '198.51.100.7'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);

    const data = await third.json();
    expect(data.error).toContain('Rate limit exceeded');
    expect(third.headers.get('Retry-After')).toBeTruthy();
  });
});
