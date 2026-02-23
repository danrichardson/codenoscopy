import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange, onFocus, placeholder }) => (
    <textarea
      className="code-input"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
    />
  )
}));

vi.mock('@codemirror/lang-python', () => ({
  python: () => ({})
}));

vi.mock('@codemirror/lang-javascript', () => ({
  javascript: () => ({})
}));

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}));

const personas = [
  { id: 'security-expert', name: 'Security Expert' },
  { id: 'bug-hunter', name: 'Bug Hunter' },
];

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    expect(screen.getByTestId('code-editor-wrapper')).toBeInTheDocument();

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

    const appRoot = document.querySelector('.app');
    expect(appRoot).toHaveClass('review-mode');
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

  it('toggles dark mode and persists preference', async () => {
    const user = userEvent.setup();
    render(<App />);

    const darkModeButton = await screen.findByRole('button', { name: 'Switch to dark mode' });
    await user.click(darkModeButton);

    const appRoot = document.querySelector('.app');
    expect(appRoot).toHaveClass('theme-dark');
    expect(window.localStorage.getItem('codenoscopy-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('keeps splash layout state before review starts', async () => {
    render(<App />);

    await screen.findByText('Codenoscopy');

    const appRoot = document.querySelector('.app');
    const container = document.querySelector('.container');
    expect(appRoot).not.toHaveClass('review-mode');
    expect(container).not.toHaveClass('review-mode');
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

  it('shows an error when review API returns non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
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

    expect(await screen.findByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('updates request payload when model changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    const modelSelect = await screen.findByLabelText('Model');
    await user.selectOptions(modelSelect, 'sonnet');

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    const reviewCall = fetch.mock.calls.find(([url]) => url === '/api/review');
    const requestPayload = JSON.parse(reviewCall[1].body);
    expect(requestPayload.model).toBe('sonnet');
  });

  it('runs panel review across multiple personas', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        const payload = JSON.parse(options.body);
        const personaName = personas.find((persona) => persona.id === payload.persona)?.name || payload.persona;
        return new Response(JSON.stringify({
          review: `Panel result from ${personaName}`,
          persona: personaName,
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

    const personaToggle = await screen.findByRole('button', { name: /Security Expert/i });
    await user.click(personaToggle);

    const bugHunterCheckbox = await screen.findByRole('checkbox', { name: 'Bug Hunter' });
    await user.click(bugHunterCheckbox);

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    expect(await screen.findByText('Panel Review (2 personas)')).toBeInTheDocument();
    expect(screen.getByText('Panel result from Security Expert')).toBeInTheDocument();
    expect(screen.getByText('Panel result from Bug Hunter')).toBeInTheDocument();

    const showCodeButton = screen.getByRole('button', { name: 'Show Submitted Code' });
    await user.click(showCodeButton);
    expect(screen.getByRole('button', { name: 'Hide Submitted Code' })).toBeInTheDocument();
    expect(screen.getByText(/def digit_fingerprint\(n\):/)).toBeInTheDocument();

    const reviewCalls = fetch.mock.calls.filter(([url]) => url === '/api/review');
    expect(reviewCalls.length).toBe(2);
    reviewCalls.forEach(([, request]) => {
      const payload = JSON.parse(request.body);
      expect(payload.stream).toBe(false);
    });
  });

  it('loads uploaded file content into code input', async () => {
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      readAsText() {
        this.onload({ target: { result: 'print("uploaded")' } });
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    const user = userEvent.setup();
    render(<App />);

    const fileInput = await screen.findByLabelText('Upload File');
    const file = new File(['print("hello")'], 'example.py', { type: 'text/plain' });
    await user.upload(fileInput, file);

    const codeInput = screen.getByPlaceholderText('Paste your code here...');
    expect(codeInput).toHaveValue('print("uploaded")');

    if (originalFileReader) {
      vi.stubGlobal('FileReader', originalFileReader);
    }
  });

  it('resets code input when clear is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const codeInput = await screen.findByPlaceholderText('Paste your code here...');
    await user.clear(codeInput);
    await user.type(codeInput, 'custom code');

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearButton);

    expect(codeInput.value).toContain('def digit_fingerprint(n):');
  });

  it('auto-switches to panel review when multiple personas are selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    const personaToggle = await screen.findByRole('button', { name: /Security Expert/i });
    await user.click(personaToggle);

    const securityCheckbox = await screen.findByRole('checkbox', { name: 'Security Expert' });
    const bugHunterCheckbox = await screen.findByRole('checkbox', { name: 'Bug Hunter' });

    expect(securityCheckbox).toBeChecked();
    expect(bugHunterCheckbox).not.toBeChecked();
    expect(screen.queryByText('Panel Mode Enabled')).not.toBeInTheDocument();

    await user.click(bugHunterCheckbox);

    expect(bugHunterCheckbox).toBeChecked();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Panel Mode Enabled')).toBeInTheDocument();

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    expect(await screen.findByText('Panel Review (2 personas)')).toBeInTheDocument();
  });

  it('resets selected personas after start over from panel review', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        const payload = JSON.parse(options.body);
        const personaName = personas.find((persona) => persona.id === payload.persona)?.name || payload.persona;
        return new Response(JSON.stringify({
          review: `Panel result from ${personaName}`,
          persona: personaName,
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

    const personaToggle = await screen.findByRole('button', { name: /Security Expert/i });
    await user.click(personaToggle);

    const bugHunterCheckbox = await screen.findByRole('checkbox', { name: 'Bug Hunter' });
    await user.click(bugHunterCheckbox);

    const reviewButton = await screen.findByRole('button', { name: 'Review!' });
    await user.click(reviewButton);

    expect(await screen.findByText('Panel Review (2 personas)')).toBeInTheDocument();

    const startOverButton = screen.getByRole('button', { name: 'Start Over' });
    await user.click(startOverButton);

    const resetPersonaToggle = await screen.findByRole('button', { name: /Security Expert/i });
    await user.click(resetPersonaToggle);

    const resetSecurityCheckbox = await screen.findByRole('checkbox', { name: 'Security Expert' });
    const resetBugHunterCheckbox = await screen.findByRole('checkbox', { name: 'Bug Hunter' });

    expect(resetSecurityCheckbox).toBeChecked();
    expect(resetBugHunterCheckbox).not.toBeChecked();
    expect(screen.queryByText('Panel Mode Enabled')).not.toBeInTheDocument();
  });

  it('shows user-friendly message when stream is interrupted', async () => {
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
            controller.error(new Error('boom'));
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

    expect(await screen.findByText('Connection interrupted while streaming the review. Please try again.')).toBeInTheDocument();
  });

  it('highlights code lines when hovering a review line reference', async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url === '/api/personas') {
        return new Response(JSON.stringify(personas), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url === '/api/review' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          review: 'Problem found on lines 2-3 in your function.',
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

    const lineReference = await screen.findByRole('button', { name: /lines 2-3/i });
    await user.hover(lineReference);

    const lineTwo = document.querySelector('[data-code-line="2"]');
    const lineThree = document.querySelector('[data-code-line="3"]');
    expect(lineTwo).toHaveClass('is-highlighted');
    expect(lineThree).toHaveClass('is-highlighted');
    expect(scrollIntoViewMock).toHaveBeenCalled();

    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('cancels active streaming when trying another persona', async () => {
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
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Partial "}}\n\n'
            ));

            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(
                'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"final"}}\n\n'
              ));
              controller.close();
            }, 60);
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

    const cancelButton = await screen.findByRole('button', { name: 'Try Another Persona' });
    await user.click(cancelButton);

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(screen.getByRole('button', { name: 'Review!' })).toBeInTheDocument();
    expect(screen.queryByText('Partial final')).not.toBeInTheDocument();
  });
});
