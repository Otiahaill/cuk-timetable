# Project state
Updated: 2026-11-27 by agent
Milestone: M2-01 (in progress)
Works: Memory files created. Data at /data/timetable.json (1,334 classes, 208 courses) with meta.version. Stitch assets fully extracted. App scaffolded at /app with Vite + Preact + TypeScript, ESLint, Prettier, Vitest configured. Design tokens extracted to /app/src/styles/tokens.css.
M1 complete: Data layer implemented with validation, loading, changes overlay, typed accessors, time parsing, composite keys. Unit tests written. Version script creates data/version.json.
M2-01 progress: Onboarding screen implemented (3-step flow per Stitch):
- Step 1: Course search with autocomplete, grouped by level (degree/diploma)
- Step 2: Unit checkboxes (all ticked by default), synced to versioned localStorage
- Step 3: Success state with Settings link
- Recovery flow: If stored course disappears from new data, shows "Pick your course again" message
- Material Symbols font loaded via Google Fonts
Broken/unknown: Dev server and test runner don't run on Android shared storage due to native binary namespace restrictions — works on regular development machines.
How to run: On desktop: `cd app && npm run dev` — serves at http://localhost:5173; `npm test` runs vitest
Stitch assets: design system tokens in /design/stitch/INVENTORY.md, campuspulse_design_system.md, screen HTMLs in /design/stitch/screens/
GitHub: https://github.com/Otiahaill/cuk-timetable (CI workflow needs workflow scope)
