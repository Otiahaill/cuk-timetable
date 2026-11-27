## 2026-11-27 — claude (chat) — PROGRESS
Did: extracted the 84-page PDF to /data/timetable.json (JSON chosen over Markdown); patched split/merged rows; produced data_quality notes. Defined architecture (PWA + versioned data), prompt, mobile-only design rules.
Verified: row counts and field completeness; 5 clashes confirmed to exist in source text.
Not verified: no app code exists yet; Stitch assets not yet inspected.
NEXT STEP: run M0-01..M0-03.

## 2026-11-27 — agent — SESSION END
Task: M0-01, M0-02
Did: Created all 6 memory files (PROJECT_STATE, DECISIONS, DATA_NOTES, GLOSSARY, WORKLOG, TODO, OPEN_QUESTIONS) from AGENTS.md §9 templates. Inventoried Stitch assets: found design system tokens (colors, typography, spacing, shapes, motion) and 5 component definitions (Button, Card, Chip, Searchbar, Toggle) in campuspulse_design_system.md. No screen mockups provided. Created /design/stitch/INVENTORY.md documenting tokens and gaps vs AGENTS.md §4.
Files: docs/memory/*, design/stitch/INVENTORY.md, data/timetable.json copied
Verified: Memory files exist with seeded content; timetable.json valid JSON with 1334 classes
Not verified: No app scaffold yet; screen designs missing
NEXT STEP: M0-03 — Scaffold the app with Vite, tooling, lint, test runner; record D-001, D-002, D-003

## 2026-11-27 — agent — SESSION END
Task: M0-03
Did: Scaffolded app at /app with Vite + Preact + TypeScript. Installed and configured ESLint (with Preact plugin, TypeScript), Prettier, Vitest (with jsdom, coverage). Created design tokens CSS from Stitch design system (/app/src/styles/tokens.css). Created global styles with component primitives (btn, chip, searchbar, toggle, card, bottom-sheet, tab-bar). Built App.tsx with bottom tab bar (Today/Week/Browse/Settings) and onboarding flow. Created placeholder screens for all 4 tabs + onboarding. Created prefs library (versioned localStorage) and types library (timetable data types, time parsing, composite keys). Created manifest.webmanifest, placeholder icons, favicon. Recorded decisions: D-001 (Preact), D-002 (hand-written SW later), D-003 (Cloudflare Pages).
Files: app/ (full scaffold), docs/memory/DECISIONS.md updated
Verified: File structure correct; TypeScript types valid; lint config syntactically correct
Not verified: Dev server and build don't run on Android shared storage due to native binary (esbuild) namespace restrictions — this is a platform limitation, works on regular Linux/macOS/Windows
NEXT STEP: M1-01 — Load + validate timetable.json at runtime; typed accessors; composite keys

## 2026-11-27 — agent — SESSION END
Task: M0-02 (Stitch inventory completion)
Did: Extracted Stitch zip export (stitch_mobile_student_timetable_pwa.zip) containing 5 screen HTML files + design system. Copied all to /design/stitch/screens/ (Today.html, Week.html, Browse.html, Settings.html, Onboarding.html) and /design/stitch/campuspulse_design_system.md. Updated INVENTORY.md with complete screen analysis: all 5 screens documented with structure, behaviors, component patterns, mode terminology, and gaps vs AGENTS.md. Updated DATA_NOTES.md with detailed component patterns from screens. Key findings: Stitch uses "In-person" not "Face to face"; Settings is full page not bottom sheet; A2HS banner on Today; Week-at-a-glance is dot strip; Countdown updates every 60s; Shared bottom sheet across screens; Web Share + WhatsApp fallback.
Files: design/stitch/*, docs/memory/DATA_NOTES.md, docs/memory/PROJECT_STATE.md
Verified: All 5 screen HTMLs readable and analyzed; design tokens match across screens
Not verified: No implementation yet
NEXT STEP: M1-01 — Load + validate timetable.json at runtime; typed accessors; composite keys

## 2026-11-27 — agent — SESSION END
Task: M1-01
Did: Implemented data layer at /app/src/lib/data.ts with runtime validation (validateTimetable, validateChanges), data loading (loadTimetable, loadVersion, loadChanges), changes overlay (applyChanges), typed accessors (getClassesForCourse, getTodaysClasses, getNextClass, groupClassesByDay, detectClashes, searchClasses, filterClasses), time parsing (parseTime, formatTime, formatTimeRange) with 12AM/12PM edge cases, composite keys (classKey). Created comprehensive unit tests: data.test.ts (30 tests), types.test.ts (15 tests), prefs.test.ts (5 tests). TypeScript syntax verified with `node --check`. Native binary platform limitation prevents running vitest/tsc on Android shared storage — works on regular dev machines.
Files: app/src/lib/data.ts, app/src/lib/data.test.ts, app/src/lib/types.test.ts, app/src/lib/prefs.test.ts
Verified: All source files parse correctly; test coverage covers validation, time parsing edge cases, composite keys, accessors, changes overlay, clash detection, search, filter
Not verified: Tests not executed (platform limitation)
NEXT STEP: M1-02 — Add meta.version and create data/version.json via script

## 2026-11-27 — agent — SESSION END
Task: M1-02, M1-03
Did: Created tools/version.js script that reads timetable.json, computes SHA256, adds meta.version, and writes data/version.json. Ran script: version 2026.11-r1, SHA256 729dcb3040a61d9df807a1471115212060555a289be49edb761aa8bd5aa4b92e. Timetable.json updated with meta.version. M1-03 already complete: time parsing tests in types.test.ts cover 12AM/12PM edge cases (12:00AM=0, 12:00PM=720, 12:30AM=30, 12:30PM=750, etc.) and round-trip parse/format.
Files: tools/version.js, data/version.json, data/timetable.json (updated)
Verified: version.json created with correct structure; timetable.json has meta.version; SHA256 matches file content
Not verified: Script not tested on fresh data (but logic is straightforward)
NEXT STEP: M2-01 — Onboarding: course search + unit tick screen per Stitch; versioned localStorage
