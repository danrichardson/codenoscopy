import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    cleanup();
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

    const reviewCall = fetch.mock.calls.find(([url]) => url === '/api/review');
    const requestPayload = JSON.parse(reviewCall[1].body);
    expect(requestPayload.stream).toBe(true);

    expect(await screen.findByText('Review by Security Expert')).toBeInTheDocument();
    expect(screen.getByText('Looks good overall, but add input validation.')).toBeInTheDocument();
  });

  it('renders streamed review text progressively', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(
              'event: content_block_delta\n' +
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}\n\n'
            ));
            controller.enqueue(new TextEncoder().encode(
              'event: content_block_delta\n' +
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}\n\n'
            ));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }));

    const user = userEvent.setup();
    render(<App />);

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    expect(await screen.findByText('Review by Security Expert')).toBeInTheDocument();
    expect(await screen.findByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown review safely', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          review: '## Findings\n\n- Item one\n\n```js\nconsole.log("test")\n```\n\n<script>alert("x")</script>',
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

    const user = userEvent.setup();
    render(<App />);

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    expect(await screen.findByRole('heading', { name: 'Findings' })).toBeInTheDocument();
    expect(screen.getByText('Item one')).toBeInTheDocument();
    expect(screen.getByText('console.log("test")')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('shows Throughline Tech branding and email linkback', async () => {
    render(<App />);

    const links = await screen.findAllByRole('link', { name: 'Throughline Tech' });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute('href', 'https://throughlinetech.net');

    const emailLinks = await screen.findAllByRole('link', { name: 'dan@throughlinetech.net' });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:dan@throughlinetech.net');
  });

  it('shows feature history entries in the app shell', async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggle = await screen.findByRole('button', { name: 'Feature History' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Review output renders as Markdown')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Review output renders as Markdown')).toBeInTheDocument();
    expect(screen.getByText('Streaming responses enabled')).toBeInTheDocument();
    expect(screen.getByText('Persona prompt randomness')).toBeInTheDocument();
  });
});
