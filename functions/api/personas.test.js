// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet } from './personas';

describe('GET /api/personas', () => {
  it('returns persona catalog', async () => {
    const response = await onRequestGet();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(8);
    expect(data.some((persona) => persona.id === 'security-expert')).toBe(true);
    expect(data.some((persona) => persona.id === 'meanest')).toBe(true);
  });
});
