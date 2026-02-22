import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const personas = [
  { id: 'security-expert', name: 'Security Expert' },
  { id: 'bug-hunter', name: 'Bug Hunter' },
];

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          review: 'Looks good overall, but add input validation.',
          persona: 'Security Expert',
          model: 'Haiku 4.5 (Fast)'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads personas and submits a review request', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Codenoscopy')).toBeInTheDocument();

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/review', expect.objectContaining({ method: 'POST' }));
    });

    expect(await screen.findByText('Review by Security Expert')).toBeInTheDocument();
    expect(screen.getByText('Looks good overall, but add input validation.')).toBeInTheDocument();
  });
});
