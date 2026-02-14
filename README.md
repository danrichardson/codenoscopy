# Codenoscopy

AI-powered code review with personality. Paste or upload code, pick a reviewer persona and model, get detailed feedback.

## Architecture

- **Frontend**: Vite + React (static, served by Cloudflare Pages)
- **Backend**: Cloudflare Pages Functions (serverless, calls Anthropic API)
- **Hosting**: Cloudflare Pages with custom domain `codenoscopy.com`
- **CI/CD**: Auto-deploys on push to `main` via Cloudflare Git integration

## Local Development

### Prerequisites

- Node.js 18+
- npm
- A Cloudflare account (for `wrangler`)
- An Anthropic API key

### Setup

```bash
# Install dependencies
npm install

# Create local env file for the API key
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your ANTHROPIC_API_KEY
```

### Run locally

```bash
# Start both Vite dev server and Wrangler functions
npm run dev:all

# Access via http://localhost:8788 (Wrangler proxies to Vite for static assets)
```

### Build

```bash
npm run build
# Output in dist/
```

### Preview production build locally

```bash
npm run preview
# Runs Wrangler Pages dev server with built assets + functions
```

## Deployment

Deployment is automatic. Push to `main` and Cloudflare Pages builds and deploys.

```bash
git add .
git commit -m "your changes"
git push
```

Pushes to other branches create preview deployments with unique URLs.

### Environment Variables

The `ANTHROPIC_API_KEY` must be set in the Cloudflare dashboard:

Workers & Pages → codenoscopy → Settings → Environment variables

### Initial Setup (already done)

The Pages project was created in the Cloudflare dashboard by connecting to the `danrichardson/codenoscopy` GitHub repo with these build settings:

- **Build command**: `npm run build`
- **Build output directory**: `dist`

Custom domains (`codenoscopy.com` and `www.codenoscopy.com`) are configured via CNAME records pointing to `codenoscopy.pages.dev`.

## Project Structure

```
codenoscopy/
├── src/                    # React frontend
│   ├── App.jsx             # Main component (custom persona dropdown)
│   ├── App.css             # Styles
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       ├── review.js       # POST /api/review — calls Claude
│       ├── personas.js     # GET /api/personas — returns persona list
│       └── health.js       # GET /api/health — health check
├── public/                 # Static assets
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── wrangler.toml           # Cloudflare Pages config
├── package.json
└── .dev.vars.example       # Template for local API key
```

## Reviewer Personas

| Persona | Style |
|---------|-------|
| Security Expert | Vulnerability-focused |
| Performance Optimizer | Efficiency-focused |
| Code Clarity Advocate | Readability-focused |
| Bug Hunter | Edge cases and logic errors |
| Best Practices Guru | Design patterns and SOLID |
| Mean | Condescending but professional |
| Meaner | Openly dismissive |
| Meanest | Brutally harsh |

## Models

Users can choose between:
- **Haiku 4.5** — Fast and cheap, good for quick reviews
- **Sonnet 4.5** — More thorough analysis