# Project state
Updated: 2026-11-27 by agent
Milestone: M1-02 (complete)
Works: Memory files created. Data at /data/timetable.json (1,334 classes, 208 courses) with meta.version. Stitch assets fully extracted. App scaffolded at /app with Vite + Preact + TypeScript, ESLint, Prettier, Vitest configured. Design tokens extracted to /app/src/styles/tokens.css.
M1-01 complete: Data layer implemented at /app/src/lib/data.ts with runtime validation, data loading, changes overlay, typed accessors, time parsing, composite keys. Unit tests written.
M1-02 complete: Version script at tools/version.js creates data/version.json and adds meta.version to timetable.json. Current version: 2026.11-r1, SHA256: 729dcb3040a61d9df807a1471115212060555a289be49edb761aa8bd5aa4b92e.
M1-03 complete: Time parsing with 12AM/12PM edge cases tested in types.test.ts.
Broken/unknown: Dev server and test runner don't run on Android shared storage due to native binary namespace restrictions — works on regular development machines.
How to run: On desktop: `cd app && npm run dev` — serves at http://localhost:5173; `npm test` runs vitest
Stitch assets: design system tokens in /design/stitch/INVENTORY.md, campuspulse_design_system.md, screen HTMLs in /design/stitch/screens/
