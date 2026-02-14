# Codenoscopy Roadmap & Ideas

## Current State (Feb 2026)

Deployed on Cloudflare Pages with Functions. Vite + React frontend, Cloudflare Worker calling Anthropic API. Eight personas (5 constructive, 3 mean), two model choices (Haiku/Sonnet), file upload or paste. Git-connected auto-deploy from GitHub.

---

## Persona Improvements

### Add Randomness to Reviews

Friend feedback: reviews feel too static/formulaic. The same code gets nearly identical feedback structure every time.

Ideas:

- Inject randomness into the system prompts at request time — randomly select 2-3 focus areas from a larger pool rather than listing all of them every time. This forces the model to vary its emphasis.
- Add a "mood" modifier that gets randomly appended: "You're having a particularly good day" vs "You just came out of a frustrating meeting" vs "You're mentoring a junior developer you like."
- Vary the review format instruction: sometimes bullet points, sometimes narrative, sometimes a scored rubric, sometimes a conversation with the code author.
- Add a temperature parameter that users can adjust (or that varies slightly per request).

### New Persona Ideas

- **The Intern** — Asks a lot of questions, isn't sure if things are bugs or features, occasionally gives surprisingly good observations.
- **The Architect** — Ignores implementation details, focuses entirely on design decisions, abstractions, and how this code fits into a larger system.
- **The Pragmatist** — "Does it work? Ship it." Only flags things that will actually cause problems in production. Dismisses stylistic concerns.
- **The Historian** — Reviews code as if it's an archaeological artifact. "This pattern suggests the author was working circa 2015, before async/await was widely adopted..."
- **The Pair Programmer** — Collaborative tone, asks what the author was thinking, suggests alternatives rather than criticizing.
- **Language-Specific Expert** — Detects the language and reviews with deep domain knowledge (Pythonic idioms, Rust ownership patterns, Go conventions, etc.).
- **The Deadline Reviewer** — "You have 30 minutes to ship this. Here's what you MUST fix vs what can wait."

### Rework the Mean Personas

Current plan: keep them for now, but long-term consider making them more nuanced. "Mean" could become more like a tough-but-fair senior engineer rather than just harsh. The humor should come from the personality, not just the negativity. Consider adding a "redemption arc" where after the harsh review, a follow-up prompt could generate "okay, here's how to actually fix all of this."

---

## Feature Ideas

### Review Enhancements

- **Markdown rendering** — The review output is currently plain text. Render it as markdown so code blocks, bold, headers, and lists display properly.
- **Syntax highlighting** — Use a library like Prism or Highlight.js on both the submitted code and any code snippets in the review.
- **Line number references** — Make line numbers in the review clickable/hoverable to highlight the corresponding code.
- **Multi-file review** — Allow uploading a zip or multiple files for reviewing how files interact.
- **Diff view** — When the reviewer suggests changes, show them as an actual diff.
- **Review history** — Store past reviews (localStorage or Cloudflare KV) so users can compare how their code improves.
- **Export** — Download the review as markdown or PDF.

### Multi-Persona Features

- **Panel review** — Run the same code through 2-3 personas simultaneously and show all reviews side by side. ("What do the Security Expert AND the Bug Hunter think?")
- **Debate mode** — Two personas review the same code and then respond to each other's reviews.
- **Progressive review** — Start with the Pragmatist (quick check), then optionally drill down with specialists.

### User Experience

- **Language auto-detection** — Detect the programming language and display it, adjust the prompt accordingly.
- **Code editor** — Replace the textarea with Monaco Editor or CodeMirror for syntax highlighting, line numbers, and better editing while typing.
- **Shareable reviews** — Generate a unique URL for a review that can be shared (would need Cloudflare KV or D1 for storage).
- **Dark mode** — The current design is light-only.
- **Mobile optimization** — The side-by-side layout breaks on mobile; consider a tabbed view.
- **Streaming responses** — Use the Anthropic streaming API so the review appears progressively instead of all at once after a long wait.

### Engagement & Gamification

- **Code challenge mode** — Present intentionally bad code and challenge users to find all the issues before the AI does.
- **Score tracking** — Rate code on various dimensions (security, performance, readability) with a numeric score.
- **"Fix it" mode** — After a review, one-click to have Claude generate the improved version of the code.

---

## Technical Improvements

### Architecture

- **Streaming** — Switch from the batch messages API to streaming. The current wait for a full review (especially on Sonnet) is too long. Cloudflare Workers support streaming responses.
- **Rate limiting** — Add per-IP rate limiting via Cloudflare to prevent API key abuse. Could use Cloudflare's built-in rate limiting or a simple KV-based counter.
- **Error handling** — Better user-facing error messages for API failures, rate limits, and oversized inputs.
- **Input validation** — Server-side code length limits. Currently accepts up to 10MB which could be expensive.
- **Caching** — Cache identical code+persona+model requests in Cloudflare KV to save API costs.

### Model Management

- **Model updates** — The model IDs are hardcoded. Consider a config file or environment variable so models can be updated without code changes.
- **Cost display** — Show estimated cost per review based on token count and model choice.
- **Token counting** — Show the user how many tokens their code is before submitting.

### Testing

- **Unit tests** — The Cloudflare Functions have zero tests. Add Vitest for the frontend and Miniflare for function testing.
- **E2E tests** — Playwright or Cypress for basic flow testing.
- **Load testing** — Understand the Cloudflare Functions limits and Anthropic API rate limits.

---

## Business / Positioning Ideas

- **Branding** — "Codenoscopy" is memorable. Lean into the medical metaphor — "diagnose your code," "code health check," "prognosis," etc.
- **Landing page** — The app currently jumps straight into the tool. Consider a landing page that explains what it is, shows example reviews, and then links to the tool.
- **Blog content** — Write posts like "We ran 100 open source projects through Codenoscopy — here's what we found" for SEO and credibility.
- **API access** — Offer a simple API for CI/CD integration. Run Codenoscopy as a GitHub Action on PRs.
- **Freemium model** — Free tier with Haiku, paid tier for Sonnet and advanced features.
- **Education angle** — Position it as a learning tool for bootcamp students and self-taught developers. The persona variety makes it useful for understanding different review perspectives.

---

## Priority Order

1. Markdown rendering for reviews (quick win, big UX improvement)
2. Streaming responses (eliminates the painful wait)
3. Persona randomness (addresses the "too static" feedback)
4. Syntax highlighting with a code editor
5. Dark mode
6. Panel review (multiple personas)
7. Rate limiting and input validation
8. Landing page
9. New personas
10. Everything else

---

## Notes & Friend Feedback

- Personas are too static/predictable — need more variation (addressed above)
- *(Add more feedback here as it comes in)*