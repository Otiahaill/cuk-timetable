# Changelog

All notable changes to CUK Timetable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for the app version.
Data versions use the format `YYYY.MM-rN`.

## [Unreleased]

### Added
- Initial release of CUK Timetable PWA

## [1.0.0] - 2026-11-27

### Data
- **Data version: 2026.11-r1** — CUK Final Degree, Diploma & Certificate Teaching Timetable, Sept–Dec 2026
- 1,334 classes across 208 courses (Monday–Friday)
- Source: 84-page PDF extracted to JSON
- SHA256: `729dcb3040a61d9df807a1471115212060555a289be49edb761aa8bd5aa4b92e`

### Features
- **Onboarding** (3-step flow):
  - Course search with autocomplete, grouped by level (degree/diploma)
  - Unit checkboxes (all checked by default), synced to versioned localStorage
  - Recovery flow when stored course disappears from updated data

- **Today Screen**:
  - Next-class card with amber highlight, live countdown (60s interval)
  - Free gap rows between classes ("Free Xh Ym")
  - Timeline of remaining classes with mode chips
  - Empty states: no classes today, weekend → next Monday
  - A2HS install banner (dismissible)

- **Week Screen**:
  - Sticky day chips (Mon–Fri) with horizontal scroll, today highlighted
  - Week-at-a-glance toggle (dot strip per day)
  - Vertical timeline per day with free gap rows
  - Clash markers (red badge + warning icon) for 5 known source clashes

- **Browse Screen**:
  - Pinned search bar (unit, code, lecturer, venue)
  - Horizontal filter chips: mode (semantic colors), day, venue, level
  - Multi-select filters with AND logic
  - Results list with class cards

- **Settings Screen** (full page):
  - Display & Battery: Dark theme toggle (OLED), Data saver
  - Notifications: 30-min reminder toggle (Notification API)
  - Timetable Data: Version, last updated, totals, "Check for updates"
  - Course & Units: Expandable unit checkboxes, "Change course" reset
  - Share & Install: WhatsApp/System share, today's classes share
  - About: Data source, quality issues, privacy, unofficial disclaimer

- **Shared ClassDetailSheet** (bottom sheet):
  - Drag to close, swipe down to dismiss
  - Time, venue, lecturer, class size, shared groups
  - Changed/cancelled badge with reason
  - Share via Web Share API + WhatsApp fallback

- **Update Mechanism**:
  - version.json polling (6-hour interval + manual)
  - Atomic swap with changes.json overlay
  - Cross-tab sync via CustomEvent
  - SHA256 validation

- **PWA**:
  - Service worker: cache-first shell, stale-while-revalidate data
  - Offline fallback to index.html
  - Update toast with reload button
  - A2HS install prompt (after 2nd visit, dismissible)
  - Manifest with maskable icons, standalone display

### Tools
- `tools/version.js` — Bumps version, creates version.json, updates meta.version
- `tools/validate.py` — Validates timetable.json (0 errors, 361 warnings expected)
- `tools/diff.py` — Human-readable diff between timetable versions
- `docs/RELEASING.md` — Complete release workflow documentation

### Technical
- Stack: Vite + Preact + TypeScript, ESLint, Prettier, Vitest
- Design tokens from Stitch (Material 3 colors, Space Grotesk + Geist)
- Bundle target: ≤150 KB gzipped
- Mobile-only: 360–430px, portrait, 48px touch targets

### Known Data Quality (from source)
- 5 same-slot clashes in source PDF (marked with red badge)
- Diploma/certificate mode derived from venue (Online if venue=ONLINE)
- Unit code fixes: BECO4104 (was BECO 41O4), BHRM4.1SSP deduplicated
- Null unit codes: BIT3.1SSP (BUCU1105 inferred), BNEC2.1SSP

---

## Data Version History

| Version | Date | Message |
|---------|------|---------|
| 2026.11-r1 | 2026-11-27 | Sept–Dec 2026 timetable |

---

## App Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-11-27 | Initial release |
