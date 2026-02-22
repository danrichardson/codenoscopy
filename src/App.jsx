import { useState, useEffect, useRef } from 'react';
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

const _transform = (name) => {
  return String.fromCharCode(name.charCodeAt(0) - 9) + 'ean' + name.slice(4);
};

function App() {
  const personaRef = useRef(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedModel, setSelectedModel] = useState('haiku');
  const [isLoading, setIsLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [flashingPersona, setFlashingPersona] = useState(null);

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
        setCode(event.target.result);
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

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please enter or upload some code to review');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReview(null);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          persona: selectedPersona,
          model: selectedModel,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get review');
      }

      const data = await response.json();
      setReview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setReview(null);
    setError(null);
  };

  const handleClearAll = () => {
    setCode(DEFAULT_CODE);
    setShowPlaceholder(true);
    setReview(null);
    setError(null);
  };

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">Codenoscopy</h1>
        <p className="subtitle">AI-powered code review with personality</p>

        {!review ? (
          <div className="input-section">
            <div className="controls">
              <div className="control-group">
                <label>Reviewer Persona</label>
                <div className="custom-select-wrapper" ref={personaRef}>
                  <div
                    className="custom-select"
                    onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
                  >
                    <span>{personas.find(p => p.id === selectedPersona)?.name || 'Select...'}</span>
                    <span className="custom-select-arrow">▾</span>
                  </div>
                  {personaDropdownOpen && (
                    <div className="custom-select-options">
                      {personas.map(persona => (
                        <div
                          key={persona.id}
                          className={`custom-select-option ${persona.id === selectedPersona ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPersona(persona.id);
                            setPersonaDropdownOpen(false);
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

            <textarea
              className="code-input"
              placeholder="Paste your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={handleCodeFocus}
            />

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

              <div className="panel">
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
      </div>
    </div>
  );
}

export default App;
