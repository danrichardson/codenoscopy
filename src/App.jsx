import { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import './App.css';

const DEFAULT_CODE = `def digit_fingerprint(n):

    """
    Transform a number into a unique 'digit fingerprint' by
    weighting each digit with increasing primes.
    Example: 472 -> 4*2 + 7*3 + 2*5 = 8 + 21 + 10 = 39
    """

    primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    digits = list(map(int, str(abs(n))))  # handle negative numbers too
    fp = 0
    for i, d in enumerate(digits):
        fp += d * primes[i % len(primes)]
    return fp

def main():
    raw = input("Enter some integers separated by spaces: ")
    nums = list(map(int, raw.split()))
    fingerprints = [digit_fingerprint(n) for n in nums]
    print("\\nDigit fingerprints:")

    for n, fp in zip(nums, fingerprints):
        print(f"{n} → {fp}")

if __name__ == "__main__":
    main()`;

const MODELS = [
  { id: 'haiku', name: 'Haiku 4.5 (Fast)' },
  { id: 'sonnet', name: 'Sonnet 4.5 (Balanced)' },
];

const REVIEW_TIMEOUT_MS = 90000;
const THEME_STORAGE_KEY = 'codenoscopy-theme';

const EDITOR_LANGUAGES = {
  python: python(),
  javascript: javascript(),
};

const FEATURE_HISTORY = [
  {
    date: '2026-02-22',
    title: 'Dark mode toggle',
    details: 'Added persisted dark/light theme toggle with editor theme switching.'
  },
  {
    date: '2026-02-22',
    title: 'Syntax-highlighted editor upgrade',
    details: 'Replaced plain textarea with CodeMirror editor including line numbers and language-aware highlighting.'
  },
  {
    date: '2026-02-22',
    title: 'API hardening: input limits + rate limiting',
    details: 'Added server-side code-size validation and per-IP request throttling for review endpoint protection.'
  },
  {
    date: '2026-02-22',
    title: 'Review layout refinement',
    details: 'Review mode now expands left with balanced code/review panel widths and smoother panel entrance.'
  },
  {
    date: '2026-02-22',
    title: 'Review-mode scroll containment',
    details: 'Removed page-level right scrollbar by keeping overflow and scrolling inside the code/review panels.'
  },
  {
    date: '2026-02-22',
    title: 'Resilient streaming error handling',
    details: 'Added clearer timeout/network/stream interruption messages and improved partial-stream behavior.'
  },
  {
    date: '2026-02-22',
    title: 'Review output renders as Markdown',
    details: 'Reviews now support headings, lists, and code blocks with sanitized rendering.'
  },
  {
    date: '2026-02-22',
    title: 'Streaming responses enabled',
    details: 'Review text appears progressively instead of waiting for the entire response.'
  },
  {
    date: '2026-02-22',
    title: 'Persona prompt randomness',
    details: 'Each review varies by focus areas, mood, and feedback format for less repetitive output.'
  },
  {
    date: '2026-02-22',
    title: 'Throughline Tech branding links',
    details: 'Added site and email links for direct contact and project attribution.'
  },
];

const _transform = (name) => {
  return String.fromCharCode(name.charCodeAt(0) - 9) + 'ean' + name.slice(4);
};

const detectEditorLanguage = (inputCode, fileName = '') => {
  const normalizedFile = fileName.toLowerCase();
  if (normalizedFile.endsWith('.py')) {
    return 'python';
  }
  if (normalizedFile.endsWith('.js') || normalizedFile.endsWith('.jsx') || normalizedFile.endsWith('.ts') || normalizedFile.endsWith('.tsx')) {
    return 'javascript';
  }

  const trimmed = inputCode.trim();
  if (trimmed.includes('def ') || trimmed.includes('import ') || trimmed.includes('if __name__ ==')) {
    return 'python';
  }
  if (trimmed.includes('function ') || trimmed.includes('const ') || trimmed.includes('=>')) {
    return 'javascript';
  }

  return 'python';
};

const appendStreamChunk = (payload, onTextDelta) => {
  if (!payload) {
    return;
  }

  const lines = payload.split('\n');
  let dataLine = '';

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLine += line.slice(5).trim();
    }
  }

  if (!dataLine) {
    return;
  }

  try {
    const parsed = JSON.parse(dataLine);
    if (parsed?.type === 'content_block_delta' && parsed?.delta?.text) {
      onTextDelta(parsed.delta.text);
    }
  } catch {
  }
};

const readReviewStream = async (response, onTextDelta) => {
  if (!response.body) {
    throw new Error('Streaming response did not include a body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    let readResult;
    try {
      readResult = await reader.read();
    } catch {
      throw new Error('STREAM_INTERRUPTED');
    }

    const { done, value } = readResult;
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      appendStreamChunk(chunk, onTextDelta);
    }
  }

  if (buffer) {
    appendStreamChunk(buffer, onTextDelta);
  }
};

const getReviewErrorMessage = (error, didReceivePartial) => {
  if (error?.name === 'AbortError') {
    return 'The review timed out. Please try again or use a shorter input.';
  }

  if (error?.message === 'STREAM_INTERRUPTED') {
    if (didReceivePartial) {
      return 'Connection interrupted. Showing the partial review received so far.';
    }
    return 'Connection interrupted while streaming the review. Please try again.';
  }

  if (error?.message?.includes('Failed to fetch')) {
    return 'Network error while requesting review. Check your connection and try again.';
  }

  return error?.message || 'Failed to get review';
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return 'light';
};

function App() {
  const personaRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const activeAbortControllerRef = useRef(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedModel, setSelectedModel] = useState('haiku');
  const [isLoading, setIsLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [editorLanguage, setEditorLanguage] = useState('python');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [flashingPersona, setFlashingPersona] = useState(null);
  const [isFeatureHistoryOpen, setIsFeatureHistoryOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const isReviewMode = Boolean(review) || isLoading;

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/personas')
      .then(res => res.json())
      .then(data => {
        setPersonas(data);
        if (data.length > 0) {
          setSelectedPersona(data[0].id);
        }
      })
      .catch(err => console.error('Failed to fetch personas:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (personaRef.current && !personaRef.current.contains(e.target)) {
        setPersonaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePersonaHover = (persona) => {
    if (['mean', 'meaner', 'meanest'].includes(persona.id)) {
      setFlashingPersona(persona.id);
      setTimeout(() => setFlashingPersona(null), 200);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uploadedCode = event.target.result;
        setCode(uploadedCode);
        setEditorLanguage(detectEditorLanguage(uploadedCode, file.name));
        setShowPlaceholder(false);
      };
      reader.readAsText(file);
    }
  };

  const handleCodeFocus = () => {
    if (showPlaceholder) {
      setCode('');
      setShowPlaceholder(false);
    }
  };

  const cancelActiveReview = () => {
    latestRequestIdRef.current += 1;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('USER_CANCEL');
    }

    setIsLoading(false);
  };

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please enter or upload some code to review');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReview(null);

    let timeoutId;
    let didReceivePartial = false;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    try {
      const personaName = personas.find((item) => item.id === selectedPersona)?.name || selectedPersona;
      const modelName = MODELS.find((item) => item.id === selectedModel)?.name || selectedModel;
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      timeoutId = setTimeout(() => abortController.abort(), REVIEW_TIMEOUT_MS);

      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          code,
          persona: selectedPersona,
          model: selectedModel,
          stream: true,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get review');
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setReview({
          review: '',
          persona: personaName,
          model: modelName,
        });

        await readReviewStream(response, (text) => {
          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          didReceivePartial = true;
          setReview((previous) => {
            if (!previous) {
              return {
                review: text,
                persona: personaName,
                model: modelName,
              };
            }

            return {
              ...previous,
              review: previous.review + text,
            };
          });
        });

        if (!didReceivePartial) {
          throw new Error('STREAM_INTERRUPTED');
        }
      } else {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        const data = await response.json();
        setReview(data);
      }
    } catch (err) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      if (err?.name === 'AbortError' && activeAbortControllerRef.current?.signal?.reason === 'USER_CANCEL') {
        setReview(null);
        setError(null);
        return;
      }

      setError(getReviewErrorMessage(err, didReceivePartial));
      if (!didReceivePartial) {
        setReview(null);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }

      if (activeAbortControllerRef.current?.signal?.aborted || latestRequestIdRef.current === requestId) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  const handleClearResults = () => {
    cancelActiveReview();
    setReview(null);
    setError(null);
  };

  const handleClearAll = () => {
    cancelActiveReview();
    setCode(DEFAULT_CODE);
    setEditorLanguage('python');
    setShowPlaceholder(true);
    setReview(null);
    setError(null);
  };

  return (
    <div className={`app ${isReviewMode ? 'review-mode' : ''} theme-${theme}`}>
      <div className={`container ${isReviewMode ? 'review-mode' : ''}`}>
        <div className="branding-bar">
          <a
            href="https://throughlinetech.net"
            target="_blank"
            rel="noreferrer"
            className="branding-link"
          >
            Throughline Tech
          </a>
          <div className="branding-actions">
            <button
              type="button"
              className="theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
            </button>
            <a href="mailto:dan@throughlinetech.net" className="branding-link">
              dan@throughlinetech.net
            </a>
          </div>
        </div>

        <h1 className="title">Codenoscopy</h1>
        <p className="subtitle">AI-powered code review with personality</p>

        <section className="feature-history" aria-label="Feature History">
          <button
            type="button"
            className="feature-history-toggle"
            aria-expanded={isFeatureHistoryOpen}
            aria-controls="feature-history-list"
            onClick={() => setIsFeatureHistoryOpen((value) => !value)}
          >
            <span className={`feature-history-caret ${isFeatureHistoryOpen ? 'open' : ''}`} aria-hidden="true">
              ▸
            </span>
            <span>Feature History</span>
          </button>
          {isFeatureHistoryOpen && (
            <ul id="feature-history-list">
              {FEATURE_HISTORY.map((entry) => (
                <li key={`${entry.date}-${entry.title}`}>
                  <span className="feature-history-date">{entry.date}</span>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!review ? (
          <div className="input-section">
            <div className="controls">
              <div className="control-group">
                <label>Reviewer Persona</label>
                <div className="custom-select-wrapper" ref={personaRef}>
                  <button
                    type="button"
                    className="custom-select"
                    onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        setPersonaDropdownOpen(true);
                      }

                      if (event.key === 'Escape') {
                        setPersonaDropdownOpen(false);
                      }
                    }}
                    aria-expanded={personaDropdownOpen}
                    aria-haspopup="listbox"
                    aria-controls="persona-options-listbox"
                  >
                    <span>{personas.find(p => p.id === selectedPersona)?.name || 'Select...'}</span>
                    <span className="custom-select-arrow">▾</span>
                  </button>
                  {personaDropdownOpen && (
                    <div className="custom-select-options" role="listbox" id="persona-options-listbox">
                      {personas.map(persona => (
                        <div
                          key={persona.id}
                          className={`custom-select-option ${persona.id === selectedPersona ? 'selected' : ''}`}
                          role="option"
                          tabIndex={0}
                          aria-selected={persona.id === selectedPersona}
                          onClick={() => {
                            setSelectedPersona(persona.id);
                            setPersonaDropdownOpen(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedPersona(persona.id);
                              setPersonaDropdownOpen(false);
                            }

                            if (event.key === 'Escape') {
                              setPersonaDropdownOpen(false);
                            }
                          }}
                          onMouseEnter={() => handlePersonaHover(persona)}
                        >
                          {flashingPersona === persona.id ? _transform(persona.name) : persona.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="control-group">
                <label htmlFor="model-select">Model</label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="persona-select"
                >
                  {MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label htmlFor="file-upload" className="file-upload-label">
                  Upload File
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.sh,.bash,.sql,.html,.css,.json,.yaml,.yml,.toml,.xml"
                    onChange={handleFileUpload}
                    className="file-upload"
                  />
                </label>
              </div>
            </div>

            <div className="code-editor-wrapper" data-testid="code-editor-wrapper">
              <CodeMirror
                value={code}
                height="420px"
                theme={theme === 'dark' ? oneDark : 'light'}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  foldGutter: true,
                }}
                extensions={[EDITOR_LANGUAGES[editorLanguage]]}
                onFocus={handleCodeFocus}
                onChange={(value) => setCode(value)}
                placeholder="Paste your code here..."
              />
            </div>

            {error && <div className="error">{error}</div>}

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleReview}
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? 'Reviewing...' : 'Review!'}
              </button>
              {code && (
                <button
                  className="btn btn-secondary"
                  onClick={handleClearAll}
                  disabled={isLoading}
                >
                  Clear
                </button>
              )}
            </div>

            {isLoading && (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="bounce1"></div>
                  <div className="bounce2"></div>
                  <div className="bounce3"></div>
                </div>
                <p className="loading-text">Analyzing your code...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="results-section">
            {error && <div className="error">{error}</div>}
            <div className="results-header">
              <div>
                <h2>Review by {review.persona}</h2>
                <span className="model-badge">{review.model}</span>
              </div>
              <div className="button-group">
                <button className="btn btn-secondary" onClick={handleClearResults}>
                  Try Another Persona
                </button>
                <button className="btn btn-secondary" onClick={handleClearAll}>
                  Start Over
                </button>
              </div>
            </div>

            <div className="side-by-side">
              <div className="panel">
                <h3>Your Code</h3>
                <pre className="code-display">{code}</pre>
              </div>

              <div className="panel review-panel">
                <h3>Review</h3>
                <div className="review-display">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {review.review}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="footer-note">
          Built by{' '}
          <a href="https://throughlinetech.net" target="_blank" rel="noreferrer">
            Throughline Tech
          </a>
          {' '}•{' '}
          <a href="mailto:dan@throughlinetech.net">dan@throughlinetech.net</a>
        </div>
      </div>
    </div>
  );
}

export default App;
