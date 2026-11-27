# CUK Timetable

Personalised class timetable PWA for Co-operative University of Kenya students.

- Mobile-only (360–430px, portrait)
- Offline-first after first load
- No accounts, no backend, no tracking
- Timetable data is separate from the app — a new semester only needs a JSON swap

## Repo layout

```
app/          Vite + Preact + TypeScript PWA
data/         timetable.json + version.json (the timetable data)
design/       Stitch design exports + inventory
docs/         memory, changelog, release docs
tools/        version.js, validate.py, diff.py
.github/      CI/CD (Cloudflare Pages + GitHub Pages)
```

## Develop

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run typecheck
npm test           # Vitest
npm run build      # -> app/dist
```

### On-device checks (no native binaries required)

```bash
cd app
npm run test:local      # runs the Vitest suites through a Node loader
npm run check:syntax    # Babel parse of every source file
npm run check:imports   # verifies every local import is actually exported
```

## Deploy

### Cloudflare Pages
- Build command: `cd app && npm run build`
- Output directory: `app/dist`
- Config-as-code: `wrangler.toml`

### GitHub Pages
- Source: GitHub Actions
- The workflow builds with `GITHUB_PAGES=true` so Vite emits the
  `/cuk-timetable/` base path.

## Release a new timetable

See `docs/RELEASING.md`. Short version:

```bash
python3 tools/validate.py data/timetable.json
python3 tools/diff.py old.json data/timetable.json
node tools/version.js --message "Sept–Dec 2027 timetable"
git add data/ && git commit -m "data(app): version bump [M6]" && git push
```

## Project memory

Per `AGENTS.md`, read `docs/memory/` at the start of every session:
`PROJECT_STATE.md`, the last entries of `WORKLOG.md`, `TODO.md`, `OPEN_QUESTIONS.md`.
