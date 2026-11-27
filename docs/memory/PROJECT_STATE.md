# Project state
Updated: 2026-11-27 by agent
Milestone: M6-01 (in progress)
Works: Memory files created. Data at /data/timetable.json (1,334 classes, 208 courses) with meta.version. Stitch assets fully extracted. App scaffolded at /app with Vite + Preact + TypeScript, ESLint, Prettier, Vitest configured. Design tokens extracted to /app/src/styles/tokens.css.
M1 complete: Data layer implemented with validation, loading, changes overlay, typed accessors, time parsing, composite keys. Unit tests written. Version script creates data/version.json.
M2-01 complete: Onboarding screen implemented (3-step flow per Stitch).
M3-01 complete: Today screen implemented (next-class card, countdown, timeline, empty states, A2HS banner).
M4-01 complete: Week screen implemented (day chips, week-at-a-glance, timeline, free gaps, clash markers).
M5-01 complete: Browse screen implemented (pinned search, filter chips, results, ClassDetailSheet).
M6-01 progress: Settings screen implemented (full page per Stitch):
- Display & Battery: Dark theme toggle (OLED), Data saver (placeholder)
- Notifications: 30-min reminder toggle (requests Notification permission)
- Timetable Data: Version, last updated, total classes/courses, "Check for updates" button
- Course & Units: Current course, expandable unit checkboxes, "Change course" reset
- Share & Install: WhatsApp/System share, today's classes share, install instructions
- About: Data source, known quality issues, privacy, unofficial disclaimer
- Update mechanism: lib/updates.ts with version.json polling, atomic swap, changes.json overlay
- Tools: tools/validate.py (passes), tools/diff.py (works), docs/RELEASING.md
Broken/unknown: Dev server and test runner don't run on Android shared storage due to native binary namespace restrictions — works on regular development machines.
How to run: On desktop: `cd app && npm run dev` — serves at http://localhost:5173; `npm test` runs vitest
Stitch assets: design system tokens in /design/stitch/INVENTORY.md, campuspulse_design_system.md, screen HTMLs in /design/stitch/screens/
GitHub: https://github.com/Otiahaill/cuk-timetable
