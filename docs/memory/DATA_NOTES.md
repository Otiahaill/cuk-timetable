# Data notes
- Source: CUK Teaching Timetable Sept–Dec 2026, 84 pages, two table layouts (degree pages 1–68, diploma/certificate pages 69–84; diploma layout has no mode column and an SPW column).
- Extraction produced 1,334 classes / 208 courses; days Mon–Fri only.
- 5 degree rows merged two units in one PDF row → split (pages 28, 29, 30, 31, 33).
- Unit code issues: BECO4104 printed as "BECO 41O4"; BHRM4.1SSP "RESEARCH PROJECT PROJECT PROPOSAL" deduplicated; BIT3.1SSP cooperative philosophy had no code (BUCU1105 inferred); BNEC2.1SSP circuit theory has no code (null).
- Same-slot clashes present in the source: BCOM1.1 Wed 7:00AM (BUCU1101 vs BUCU1104); BCOM2.1 Tue 4:00PM (BACC2105 vs BHRM1101); BCOM2.1 Wed 7:00AM (BFIN2101 vs BHRM1101); BCOM2.1 Wed 1:00PM (BACC2105 vs BFIN2101); BCOM2.1S Thu 1:00PM (BSTA2101 vs BUCU1105).
- Source typo kept as printed: "BHRM … Dr Dr. Jane Njenga" cleaned to "Dr. Jane Njenga"; "COOPORATE GOVERNANACE" spelling is as printed; BSWK2105 groups list "(BCD2.1,BCD2.1)" on the BCD3.1 row is a source typo.
- Diploma/certificate `mode` is derived from venue.

## Stitch Design Schema (from campuspulse_design_system.md + screen exports)

### Design Tokens (identical across all screens)
- Colors: Material 3 light/dark with primary green, amber accent, red error (full surface container scale)
- Typography: Space Grotesk (headlines/time) + Geist (body/UI), 400/600 weights, system fallback, tabular nums
- Spacing: 4px base unit (gutter-xs to gutter-xl, section 32px, page-margin 16px)
- Shapes: 8px/12px/16px/24px/9999px radius scale
- Motion: 100ms/220ms/150ms, ease-out/cubic-bezier, respects prefers-reduced-motion
- Layout: 430px max-width centered, viewport-fit=cover, safe-area insets

### Screen Components (from 5 Stitch HTML exports)

**Today Screen:**
- Next/Now card (amber highlight) with live countdown (60s interval)
- A2HS install banner (dismissible)
- Free gap rows ("Free 1h 30m" muted)
- Later today timeline (class cards: time, mode chip, title, venue+lecturer)
- Bottom tab bar (4 tabs, 56px, safe-area)
- Class detail bottom sheet (drag handle, time, title, subtitle, mode chip)

**Week Screen:**
- Sticky header: week label + "Week at a glance" toggle
- Sticky day chips (Mon-Fri, horizontal scroll, today highlighted)
- Week-at-a-glance dot strip (5 columns, dots per class, toggleable)
- Vertical timeline grouped by day (headers + class cards)
- Free gap rows between classes
- Clash cards: red border + warning icon + "Clash" badge + explanation
- Bottom tab bar + shared bottom sheet

**Browse Screen:**
- Pinned search bar (filters unit/venue/lecturer on input)
- Horizontal scrolling filter chips (All, mode, day, venue — multi-select)
- Results list (class cards same as Today/Week)
- Bottom tab bar + shared bottom sheet

**Settings Screen (full page, not sheet):**
- Display & Battery: Dark theme toggle (OLED), Data saver toggle
- Notifications: 30-min reminder toggle (requests Notification permission)
- Share & Install: WhatsApp share, "Change course or units" link
- Bottom tab bar

**Onboarding (3 steps):**
- Progress dots (bar + active dot)
- Step 1: Course search (autofocus, autocomplete)
- Step 2: Unit checkboxes (all checked by default except one)
- Step 3: Success state with Settings link
- Bottom thumb-zone primary button (label changes per step)

### Component Patterns
- Button: Primary/Secondary/Icon/With-icon, min-h-48px, rounded-lg
- Card: Elevated (surface-container-low), Interactive (active:opacity-80), Free-gap (muted), 16px radius
- Chip: Filter (pill, 48px min-h), Mode badge (rounded-full), Clash badge (error container)
- Searchbar: Standard (pinned), rounded-full, 48px min-h
- Toggle: Switch (52x32px), ARIA role="switch", with description label
- Bottom Sheet: Fixed bottom, max-w-430px, rounded-t-xl, drag handle, backdrop
- Tab Bar: 56px, 4 columns, Material Symbols icons, safe-area
- Day Chips: Horizontal scroll, today highlighted, 48px min-h, pill
- Progress Dots: Bar + dot for active step (3 steps)

### Mode Terminology (from Stitch)
- "In-person" (green) — not "Face to face"
- "Online" (blue)
- "Blended" (purple, in design system only)

### Behaviors
- Countdown updates every 60s (not every second) — battery saving
- Class cards → bottom sheet (shared across screens)
- Search + chips combine with AND logic
- Dark theme toggle persists on html.classList
- Web Share API + WhatsApp fallback for sharing
- A2HS banner on Today (dismissible)
