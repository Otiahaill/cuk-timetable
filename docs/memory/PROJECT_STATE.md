# Project state
Updated: 2026-11-27 by agent
Milestone: M4-01 (in progress)
Works: Memory files created. Data at /data/timetable.json (1,334 classes, 208 courses) with meta.version. Stitch assets fully extracted. App scaffolded at /app with Vite + Preact + TypeScript, ESLint, Prettier, Vitest configured. Design tokens extracted to /app/src/styles/tokens.css.
M1 complete: Data layer implemented with validation, loading, changes overlay, typed accessors, time parsing, composite keys. Unit tests written. Version script creates data/version.json.
M2-01 complete: Onboarding screen implemented (3-step flow per Stitch).
M3-01 complete: Today screen implemented:
- Next-class card with amber highlight, live countdown (60s interval)
- Free gap rows between classes
- Timeline of remaining classes with mode chips
- Empty states: no classes today, weekend → next Monday
- A2HS install banner (dismissible, shows after 2nd visit)
- Shared ClassDetailSheet bottom sheet (drag to close, share via Web Share + WhatsApp)
- Clash detection with red border + warning icon
M4-01 progress: Week screen implemented:
- Sticky day chips (Mon-Fri) with horizontal scroll, today highlighted
- Week-at-a-glance toggle (dot strip per day)
- Vertical timeline per day with free gap rows
- Clash markers (red badge + warning icon)
- Shared ClassDetailSheet bottom sheet
Broken/unknown: Dev server and test runner don't run on Android shared storage due to native binary namespace restrictions — works on regular development machines.
How to run: On desktop: `cd app && npm run dev` — serves at http://localhost:5173; `npm test` runs vitest
Stitch assets: design system tokens in /design/stitch/INVENTORY.md, campuspulse_design_system.md, screen HTMLs in /design/stitch/screens/
GitHub: https://github.com/Otiahaill/cuk-timetable
