# Codenoscopy

AI-powered code review with personality. Paste or upload code, pick a reviewer persona and model, get detailed feedback.

## Architecture

- **Frontend**: Vite + React (static, served by Cloudflare Pages)
- **Backend**: Cloudflare Pages Functions (serverless, calls Anthropic API)
- **Hosting**: Cloudflare Pages with custom domain `codenoscopy.com`

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

# Frontend: http://localhost:3000
# Functions: http://localhost:8788
```

Vite proxies `/api/*` requests to Wrangler during development.

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

### First time setup

```bash
# Login to Cloudflare
npx wrangler login

# Create the Pages project
npx wrangler pages project create codenoscopy

# Set the API key as a secret
npx wrangler pages secret put ANTHROPIC_API_KEY
```

### Deploy

```bash
npm run deploy
```

### Custom domain

In the Cloudflare dashboard, go to Pages > codenoscopy > Custom domains and add `codenoscopy.com`. Since DNS is already on Cloudflare, it will configure automatically.

## Project Structure

```
codenoscopy/
├── src/                    # React frontend
│   ├── App.jsx             # Main component
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
├── wrangler.toml           # Cloudflare config
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
