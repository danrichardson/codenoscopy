# Test Backlog

## Existing Functionality Baseline

### Frontend UI
- [x] App renders title and primary controls
- [x] Personas load from `/api/personas`
- [x] Review submission calls `/api/review` and displays result
- [ ] Error message appears when review API returns non-OK
- [ ] Upload file populates code input
- [ ] Clear button resets review and input state
- [ ] Persona dropdown keyboard accessibility
- [ ] Model selector updates request payload

### Functions API
- [x] `GET /api/health` returns `{ status: "ok" }`
- [x] `GET /api/personas` returns expected persona list shape
- [x] `POST /api/review` rejects missing code/persona with 400
- [x] `POST /api/review` rejects invalid persona with 400
- [x] `POST /api/review` maps model IDs correctly
- [x] `POST /api/review` handles Anthropic non-200 response
- [ ] `POST /api/review` handles malformed JSON body

## New Functionality (Planned)

### Markdown Rendering
- [x] Review markdown renders headers/lists/code blocks correctly
- [x] Unsafe HTML is sanitized (no script injection)

### Branding + Linkback
- [x] Throughline Tech link appears and opens correctly
- [x] `mailto:dan@throughlinetech.net` link is present and valid

### Streaming Reviews
- [x] Review text progressively appears during API stream
- [ ] Stream cancellation/error transitions to user-friendly error state

### Persona Randomness
- [x] Prompt variation modifies focus areas/mood/format
- [ ] Variation remains within persona behavior constraints

## Coverage Goal
- Keep overall line coverage at or above 80% as features are added.
- Keep branch coverage improving per feature branch; no feature merges without tests for new behavior.
