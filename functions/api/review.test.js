// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './review';

const env = { ANTHROPIC_API_KEY: 'test-key' };

const buildContext = (body) => ({
  env,
  request: new Request('http://localhost/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
});

describe('POST /api/review', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
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
});
