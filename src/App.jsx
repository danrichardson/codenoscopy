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
const TAGLINE_MIN_ROTATION_MS = 2500;
const TAGLINE_MAX_ROTATION_MS = 5000;
const TAGLINE_POOL_SIZE = 1000;
const TAGLINE_ANIMATION_DURATION_MS = 650;

const TAGLINE_LEADS = [
  'Codenoscopy-certified',
  'Lab-tested',
  'Bedside-mannered',
  'Dad-joke-enabled',
  'Scope-ready',
  'Clinic-grade',
  'Pulse-checking',
  'Stethoscope-adjacent',
  'Chart-auditing',
  'Snark-light',
  'Vitals-aware',
  'Calm-and-caffeinated',
  'Nurse-station-approved',
  'Code-ward-friendly',
  'Low-drama',
  'Procedure-conscious',
  'Good-vibes-only',
  'Whitecoat-energy',
  'Charting-fast',
  'Pager-friendly',
  'Humor-prescribed',
  'Refactor-rehab',
  'No-panic',
  'Recovery-room',
  'Rounds-ready',
];

const TAGLINE_FOCUSES = [
  'code colonoscopy',
  'PR checkups',
  'repo screenings',
  'merge triage',
  'bug diagnostics',
  'code health exams',
  'pull-request rounds',
  'lint vitals',
  'diff imaging',
  'architecture intake',
  'refactor physicals',
  'release readiness exams',
  'technical second opinions',
  'code wellness visits',
  'readability therapy',
  'test coverage bloodwork',
  'stack-wide checkups',
  'signal-rich consultations',
  'hotfix follow-ups',
  'maintainability medicine',
];

const TAGLINE_ENDINGS = [
  'with personality and clean gloves',
  'with bedside wit and build empathy',
  'minus panic, plus practical fixes',
  'for smoother merges and fewer ulcers',
  'for cleaner commits and happier Mondays',
  'for teams that ship without heartburn',
  'for confident refactors and mild chuckles',
  'for high-signal feedback and low blood pressure',
  'for practical engineers and dramatic logs',
  'for modern teams who enjoy a light roast',
  'for better pull requests and better jokes',
  'for bug hunts with friendly sarcasm',
  'for codebases that need a gentle scope',
  'for fast triage and slower eye-rolls',
  'for production calm and dad-joke charm',
];

const buildTaglinePool = (targetCount = TAGLINE_POOL_SIZE) => {
  const results = new Set(['AI-powered code review with personality']);

  for (const lead of TAGLINE_LEADS) {
    for (const focus of TAGLINE_FOCUSES) {
      for (const ending of TAGLINE_ENDINGS) {
        results.add(`${lead} ${focus} ${ending}`);
        if (results.size >= targetCount) {
          return Array.from(results);
        }
      }
    }
  }

  return Array.from(results);
};

const TAGLINE_POOL = buildTaglinePool();

const randomIntInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const TAGLINE_STANDARD_ANIMATIONS = [
  'pop-wiggle',
  'pop-glow',
  'bounce',
  'pulse',
  'tilt-snap',
  'rise',
  'sway',
  'elastic',
  'shimmer',
  'snapback',
];

const TAGLINE_WACKY_ANIMATIONS = ['boing', 'vortex'];
const TAGLINE_WACKY_CHANCE = 0.11;

const pickRandomTaglineAnimation = () => {
  const source = Math.random() < TAGLINE_WACKY_CHANCE
    ? TAGLINE_WACKY_ANIMATIONS
    : TAGLINE_STANDARD_ANIMATIONS;

  return source[Math.floor(Math.random() * source.length)];
};

const EDITOR_LANGUAGES = {
  python: python(),
  javascript: javascript(),
};

const FEATURE_HISTORY = [
  {
    date: '2026-02-22',
    title: 'Tagline chaos mode tuned up',
    details: 'Subtitle rotation now runs faster (2.5-5s), with a broader random animation mix and extra-wacky variants showing up occasionally for playful micro-surprises.'
  },
  {
    date: '2026-02-22',
    title: 'Line-accurate review linking',
    details: 'Single-review output now converts cited line references into interactive anchors that highlight and auto-scroll the code pane for direct traceability.'
  },
  {
    date: '2026-02-22',
    title: 'Citation-quality prompt upgrade',
    details: 'Backend prompts now send numbered source with stricter citation rules, improving line precision and reducing vague “best guess” references.'
  },
  {
    date: '2026-02-22',
    title: 'Dual-pane independent scrolling',
    details: 'Single-review mode now keeps independent scrollbars for code and review panes so long analyses stay readable with precise jump-to-line behavior.'
  },
  {
    date: '2026-02-22',
    title: 'Persona UX consolidation',
    details: 'Rebuilt persona selection as a custom multi-select dropdown with embedded checkboxes, one-click single selection, and seamless multi-select toggling.'
  },
  {
    date: '2026-02-22',
    title: 'Panel mode state intelligence',
    details: 'Panel execution now auto-activates from persona count (2-3 selected), shows a “Panel Mode Enabled” badge, and resets cleanly on Start Over.'
  },
  {
    date: '2026-02-22',
    title: 'Obfuscated persona easter egg restored',
    details: 'The hidden mean-persona hover transformation was restored and hardened with encoded matching logic while keeping the implementation intentionally non-obvious.'
  },
  {
    date: '2026-02-22',
    title: 'Dark mode toggle',
    details: 'Added persistent dark/light mode with synchronized editor theming so visual preferences survive reloads across core UI surfaces.'
  },
  {
    date: '2026-02-22',
    title: 'Syntax-highlighted editor upgrade',
    details: 'Replaced the plain textarea with language-aware CodeMirror, including line numbers and stronger editor ergonomics.'
  },
  {
    date: '2026-02-22',
    title: 'API hardening: input limits + rate limiting',
    details: 'Introduced server-side payload limits, malformed JSON handling, and per-IP rate controls for safer, more predictable endpoint behavior.'
  },
  {
    date: '2026-02-22',
    title: 'Review layout refinements',
    details: 'Refined panel geometry and container behavior to stabilize controls, remove clipping regressions, and keep interactions usable across viewport sizes.'
  },
  {
    date: '2026-02-22',
    title: 'Resilient streaming error handling',
    details: 'Improved stream lifecycle handling with clearer timeout/network interruption states, safer cancellation, and better partial-response continuity.'
  },
  {
    date: '2026-02-22',
    title: 'Review output renders as Markdown',
    details: 'Upgraded response rendering to sanitized Markdown so headings, lists, and code snippets keep structure without sacrificing safety.'
  },
  {
    date: '2026-02-22',
    title: 'Streaming responses enabled',
    details: 'Enabled progressive response streaming so users see analysis in real time instead of waiting for full completion.'
  },
  {
    date: '2026-02-22',
    title: 'Persona prompt randomness',
    details: 'Added controlled variability in focus areas, tone, and output format so repeated reviews stay fresh while matching persona intent.'
  },
  {
    date: '2026-02-22',
    title: 'Throughline Tech branding links',
    details: 'Integrated lightweight product attribution and direct contact links in the shell without adding friction to the main workflow.'
  },
];

const _transform = (name) => {
  return String.fromCharCode(name.charCodeAt(0) - 9) + 'ean' + name.slice(4);
};

const _enc = (value) => {
  return [...String(value || '')]
    .map((char) => String.fromCharCode(char.charCodeAt(0) + 1))
    .join('');
};

const _meanSet = new Set(['nfbo', 'nfbofs', 'nfboftu']);

const LINE_REF_PREFIX = '#line-';

const linkifyReviewLineRefs = (text = '') => {
  return text.replace(/\b(lines?\s+(\d+)(?:\s*[-–]\s*(\d+))?)/gi, (fullMatch, label, start, end) => {
    const startLine = Number(start);
    const endLine = Number(end || start);

    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      return fullMatch;
    }

    return `[${label}](${LINE_REF_PREFIX}${startLine}-${endLine})`;
  });
};

const parseLineRefHref = (href = '') => {
  if (!href.startsWith(LINE_REF_PREFIX)) {
    return null;
  }

  const rawRange = href.slice(LINE_REF_PREFIX.length);
  const [rawStart, rawEnd] = rawRange.split('-');
  const start = Number(rawStart);
  const end = Number(rawEnd || rawStart);

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return null;
  }

  return {
    start: Math.max(1, Math.min(start, end)),
    end: Math.max(start, end),
  };
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
  const [selectedPersonaIds, setSelectedPersonaIds] = useState([]);
  const [selectedModel, setSelectedModel] = useState('haiku');
  const [isLoading, setIsLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [panelReviews, setPanelReviews] = useState([]);
  const [error, setError] = useState(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [editorLanguage, setEditorLanguage] = useState('python');
  const [isPanelCodeOpen, setIsPanelCodeOpen] = useState(false);
  const [hoveredLineRange, setHoveredLineRange] = useState(null);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [flashingPersona, setFlashingPersona] = useState(null);
  const [isFeatureHistoryOpen, setIsFeatureHistoryOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isTaglineFrozen, setIsTaglineFrozen] = useState(false);
  const [isTaglineAnimating, setIsTaglineAnimating] = useState(false);
  const [taglineAnimationVariant, setTaglineAnimationVariant] = useState('pop-wiggle');
  const isReviewMode = Boolean(review) || panelReviews.length > 0 || isLoading;
  const codeLines = code.split('\n');
  const linkedSingleReview = review ? linkifyReviewLineRefs(review.review) : '';
  const activeTagline = TAGLINE_POOL[taglineIndex] || TAGLINE_POOL[0];

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/personas')
      .then(res => res.json())
      .then(data => {
        setPersonas(data);
        if (data.length > 0) {
          setSelectedPersonaIds([data[0].id]);
        }
      })
      .catch(err => console.error('Failed to fetch personas:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (personaRef.current && !personaRef.current.contains(event.target)) {
        setPersonaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (TAGLINE_POOL.length < 2 || isTaglineFrozen) {
      return undefined;
    }

    const timeoutMs = randomIntInRange(TAGLINE_MIN_ROTATION_MS, TAGLINE_MAX_ROTATION_MS);
    const timeoutId = setTimeout(() => {
      setTaglineIndex((current) => {
        let nextIndex = Math.floor(Math.random() * TAGLINE_POOL.length);

        if (nextIndex === current) {
          nextIndex = (current + 1 + Math.floor(Math.random() * (TAGLINE_POOL.length - 1))) % TAGLINE_POOL.length;
        }

        return nextIndex;
      });
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [taglineIndex, isTaglineFrozen]);

  useEffect(() => {
    setTaglineAnimationVariant(pickRandomTaglineAnimation());
    setIsTaglineAnimating(true);
    const animationTimeout = setTimeout(() => {
      setIsTaglineAnimating(false);
    }, TAGLINE_ANIMATION_DURATION_MS);

    return () => clearTimeout(animationTimeout);
  }, [taglineIndex]);

  const handlePersonaHover = (persona) => {
    if (_meanSet.has(_enc(persona.id))) {
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

    const selectedPersonas = selectedPersonaIds.slice(0, 3);
    if (selectedPersonas.length === 0) {
      setError('Select at least 1 reviewer persona.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReview(null);
    setPanelReviews([]);

    if (selectedPersonas.length > 1) {

      try {
        const requests = await Promise.all(
          selectedPersonas.map(async (personaId) => {
            const response = await fetch('/api/review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code,
                persona: personaId,
                model: selectedModel,
                stream: false,
              })
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to get panel review');
            }

            return response.json();
          })
        );

        setPanelReviews(requests);
      } catch (err) {
        setError(getReviewErrorMessage(err, false));
        setPanelReviews([]);
      } finally {
        setIsLoading(false);
      }

      return;
    }

    let timeoutId;
    let didReceivePartial = false;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    try {
      const selectedPersonaId = selectedPersonas[0];
      const personaName = personas.find((item) => item.id === selectedPersonaId)?.name || selectedPersonaId;
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
          persona: selectedPersonaId,
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
    setPanelReviews([]);
    setError(null);
    setHoveredLineRange(null);
  };

  const handleClearAll = () => {
    cancelActiveReview();
    setCode(DEFAULT_CODE);
    setEditorLanguage('python');
    setShowPlaceholder(true);
    setReview(null);
    setPanelReviews([]);
    setError(null);
    setSelectedPersonaIds(personas.length > 0 ? [personas[0].id] : []);
    setPersonaDropdownOpen(false);
    setIsPanelCodeOpen(false);
    setHoveredLineRange(null);
  };

  const scrollToCodeLine = (lineNumber, behavior = 'smooth') => {
    const targetLine = document.querySelector(`[data-code-line="${lineNumber}"]`);
    if (targetLine) {
      targetLine.scrollIntoView({ behavior, block: 'center' });
    }
  };

  const toggleSelectedPersona = (personaId) => {
    setSelectedPersonaIds((current) => {
      if (current.includes(personaId)) {
        return current.filter((id) => id !== personaId);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, personaId];
    });
  };

  const selectSinglePersona = (personaId) => {
    setSelectedPersonaIds([personaId]);
    setPersonaDropdownOpen(false);
  };

  const selectedPersonaLabel = () => {
    if (selectedPersonaIds.length === 0) {
      return 'Select personas...';
    }

    if (selectedPersonaIds.length === 1) {
      const selectedPersona = personas.find((persona) => persona.id === selectedPersonaIds[0]);
      return selectedPersona?.name || 'Select personas...';
    }

    return `${selectedPersonaIds.length} personas selected`;
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
            <button
              type="button"
              className="tagline-toggle"
              onClick={() => setIsTaglineFrozen((value) => !value)}
              aria-pressed={isTaglineFrozen}
            >
              {isTaglineFrozen ? 'Resume taglines' : 'Freeze taglines'}
            </button>
            <a href="mailto:dan@throughlinetech.net" className="branding-link">
              dan@throughlinetech.net
            </a>
          </div>
        </div>

        <h1 className="title">
          <a
            href="https://github.com/danrichardson/codenoscopy"
            target="_blank"
            rel="noreferrer"
            className="title-link"
          >
            Codenoscopy
          </a>
        </h1>
        <div className={`subtitle-shell anim-${taglineAnimationVariant} ${isTaglineAnimating ? 'is-animating' : ''}`}>
          <p className="subtitle">{activeTagline}</p>
        </div>

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

        {!review && panelReviews.length === 0 ? (
          <div className="input-section">
            <div className="controls">
              <div className="control-group">
                <div className="control-label-row">
                  <label>Reviewer Persona</label>
                  {selectedPersonaIds.length > 1 && (
                    <span className="panel-enabled-badge">Panel Mode Enabled</span>
                  )}
                </div>
                <div className="custom-select-wrapper" ref={personaRef}>
                  <button
                    type="button"
                    className="custom-select"
                    onClick={() => setPersonaDropdownOpen((open) => !open)}
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
                    <span>{selectedPersonaLabel()}</span>
                    <span className="custom-select-arrow">▾</span>
                  </button>
                  {personaDropdownOpen && (
                    <div className="custom-select-options" role="listbox" id="persona-options-listbox">
                      {personas.map((persona) => (
                        <div
                          key={persona.id}
                          className={`custom-select-option persona-option-row ${selectedPersonaIds.includes(persona.id) ? 'selected' : ''}`}
                          role="option"
                          tabIndex={0}
                          aria-selected={selectedPersonaIds.includes(persona.id)}
                          onClick={() => selectSinglePersona(persona.id)}
                          onMouseEnter={() => handlePersonaHover(persona)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              selectSinglePersona(persona.id);
                            }

                            if (event.key === 'Escape') {
                              setPersonaDropdownOpen(false);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            className="persona-option-checkbox"
                            checked={selectedPersonaIds.includes(persona.id)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleSelectedPersona(persona.id)}
                            aria-label={persona.name}
                          />
                          <span>{flashingPersona === persona.id ? _transform(persona.name) : persona.name}</span>
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
        ) : panelReviews.length > 0 ? (
          <div className="results-section">
            {error && <div className="error">{error}</div>}
            <div className="results-header">
              <div>
                <h2>Panel Review ({panelReviews.length} personas)</h2>
                <span className="model-badge">{MODELS.find((model) => model.id === selectedModel)?.name || selectedModel}</span>
              </div>
              <div className="button-group">
                <button className="btn btn-secondary" onClick={handleClearResults}>
                  Try Another Panel
                </button>
                <button className="btn btn-secondary" onClick={handleClearAll}>
                  Start Over
                </button>
              </div>
            </div>

            <div className="panel-code-toggle-section">
              <button
                type="button"
                className="panel-code-toggle"
                aria-expanded={isPanelCodeOpen}
                aria-controls="panel-submitted-code"
                onClick={() => setIsPanelCodeOpen((value) => !value)}
              >
                <span className={`feature-history-caret ${isPanelCodeOpen ? 'open' : ''}`} aria-hidden="true">
                  ▸
                </span>
                <span>{isPanelCodeOpen ? 'Hide Submitted Code' : 'Show Submitted Code'}</span>
              </button>
              {isPanelCodeOpen && (
                <div id="panel-submitted-code" className="panel-code-box">
                  <pre className="code-display">{code}</pre>
                </div>
              )}
            </div>

            <div className="panel-review-grid">
              {panelReviews.map((panelReview, index) => (
                <div className="panel" key={`${panelReview.persona}-${index}`}>
                  <h3>{panelReview.persona}</h3>
                  <div className="review-display">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                    >
                      {panelReview.review}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
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
                <pre className="code-display code-display--linked">
                  {codeLines.map((line, index) => {
                    const lineNumber = index + 1;
                    const isHighlighted = hoveredLineRange
                      ? lineNumber >= hoveredLineRange.start && lineNumber <= hoveredLineRange.end
                      : false;

                    return (
                      <div
                        key={`code-line-${lineNumber}`}
                        data-code-line={lineNumber}
                        className={`code-line ${isHighlighted ? 'is-highlighted' : ''}`}
                      >
                        <span className="code-line-number">{lineNumber}</span>
                        <span className="code-line-content">{line || ' '}</span>
                      </div>
                    );
                  })}
                </pre>
              </div>

              <div className="panel review-panel">
                <h3>Review</h3>
                <div className="review-display">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      a: ({ href, children, ...props }) => {
                        const range = parseLineRefHref(href || '');

                        if (!range) {
                          return <a href={href} {...props}>{children}</a>;
                        }

                        return (
                          <button
                            type="button"
                            className="line-ref-link"
                            onMouseEnter={() => {
                              setHoveredLineRange(range);
                              scrollToCodeLine(range.start);
                            }}
                            onMouseLeave={() => setHoveredLineRange(null)}
                            onFocus={() => {
                              setHoveredLineRange(range);
                              scrollToCodeLine(range.start, 'auto');
                            }}
                            onBlur={() => setHoveredLineRange(null)}
                            onClick={() => {
                              setHoveredLineRange(range);
                              scrollToCodeLine(range.start);
                            }}
                          >
                            {children}
                          </button>
                        );
                      },
                    }}
                  >
                    {linkedSingleReview}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isReviewMode && (
          <div className="footer-note">
            Built by{' '}
            <a href="https://throughlinetech.net" target="_blank" rel="noreferrer">
              Throughline Tech
            </a>
            {' '}•{' '}
            <a href="mailto:dan@throughlinetech.net">dan@throughlinetech.net</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
