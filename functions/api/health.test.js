// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet } from './health';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const response = await onRequestGet();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });
});
