# Project state
Updated: 2026-11-27 by agent
Milestone: M5-01 (in progress)
Works: Memory files created. Data at /data/timetable.json (1,334 classes, 208 courses) with meta.version. Stitch assets fully extracted. App scaffolded at /app with Vite + Preact + TypeScript, ESLint, Prettier, Vitest configured. Design tokens extracted to /app/src/styles/tokens.css.
M1 complete: Data layer implemented with validation, loading, changes overlay, typed accessors, time parsing, composite keys. Unit tests written. Version script creates data/version.json.
M2-01 complete: Onboarding screen implemented (3-step flow per Stitch).
M3-01 complete: Today screen implemented (next-class card, countdown, timeline, empty states, A2HS banner).
M4-01 complete: Week screen implemented (day chips, week-at-a-glance, timeline, free gaps, clash markers).
M5-01 progress: Browse screen implemented:
- Pinned search bar (searches unit, code, lecturer, venue)
- Horizontal scrolling filter chips (mode, day, venue, level) with multi-select
- Results list with class cards (time, day, mode chip, venue, lecturer)
- Shared ClassDetailSheet bottom sheet
- Clear all filters button
Broken/unknown: Dev server and test runner don't run on Android shared storage due to native binary namespace restrictions — works on regular development machines.
How to run: On desktop: `cd app && npm run dev` — serves at http://localhost:5173; `npm test` runs vitest
Stitch assets: design system tokens in /design/stitch/INVENTORY.md, campuspulse_design_system.md, screen HTMLs in /design/stitch/screens/
GitHub: https://github.com/Otiahaill/cuk-timetable
