## D-000 — Foundational decisions (ACCEPTED, by Brian)
- Mobile-only PWA, static hosting, no authentication/backend/accounts.
- Timetable data stored as JSON (chosen over Markdown) and kept separate from the app so updates need no rebuild.
- Update mechanism: version.json polling + cached timetable.json; optional changes.json overrides.
- Project memory lives in /docs/memory files, not in the context window.
- Stitch designs are the visual source of truth; AGENTS.md is the behaviour source of truth.
- v1 excludes .ics export and push/local notifications.
- Join on composite key (course+unit_code+day+start), never on array position or class id.

## D-001 — Framework choice (ACCEPTED)
Date / agent: 2026-11-27 / agent
Context: Need a lightweight UI framework for the PWA. Vanilla JS possible but components will exceed 10.
Decision: Preact (via @preact/preset-vite). ~3KB gz, React-compatible API, signals for state. Vite handles TSX/JSX.
Alternatives rejected: Vanilla JS (more boilerplate for reactive UI), React (larger bundle), Svelte (different mental model), Solid (less familiar).
Consequences: Use preact/compat for React ecosystem libs. Bundle budget 150 KB gz leaves ample room.

## D-002 — Service worker approach (PROVISIONAL)
Date / agent: 2026-11-27 / agent
Context: Need offline-first caching for app shell and data.
Decision: Hand-written service worker (no Workbox) for full control and minimal size. Cache-first for app shell (HTML, JS, CSS), stale-while-revalidate for /data/*. Versioned cache names, delete old caches on activate. Show "Update ready — reload" toast on new SW.
Alternatives rejected: Workbox (adds ~6KB, opinionated), no SW (breaks offline requirement).
Consequences: More code to maintain but total control over caching strategy.

## D-003 — Hosting (PROVISIONAL)
Date / agent: 2026-11-27 / agent
Context: Free static hosting with HTTPS, custom domain support, good CDN in Kenya/Africa.
Decision: Cloudflare Pages (free tier, unlimited bandwidth, fast in Africa, Git integration). Fallback: GitHub Pages.
Alternatives rejected: Netlify (bandwidth limits), Firebase Hosting (requires Google account), Vercel (no Kenya edge).
Consequences: Deploy from GitHub Actions or wrangler. Configure _headers for caching, _redirects for SPA fallback.
