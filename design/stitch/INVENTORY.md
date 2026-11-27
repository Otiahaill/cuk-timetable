# Stitch Assets Inventory

## Source
- Provided: `stitch_mobile_student_timetable_pwa.zip` (full Stitch export)
- Contains: 5 screen HTML files + design system markdown
- Extracted to: `/design/stitch/screens/` and `/design/stitch/campuspulse_design_system.md`

## Screens Documented (from Stitch HTML exports)

### 1. Today — `/design/stitch/screens/Today.html`
**Structure:**
- Header: Date + "Today" title
- **Next/Now Card** (amber highlight): Time, countdown (updates every minute), unit name, venue, lecturer, mode chip
- **A2HS Banner** (dismissible): "Install CampusPulse for offline access" with Install/Dismiss
- **Free Gap Row**: "Free 1h 30m" with calendar-plus icon (muted)
- **Later Today Timeline**: Class cards with time, mode chip, unit name, venue+lecturer
- **Bottom Tab Bar**: Today (active), Week, Browse, Settings
- **Bottom Sheet** (class detail): Drag handle, close button, time, title, subtitle (venue+lecturer), mode chip

**Key Behaviors (from inline JS):**
- Countdown updates every 60s (not every second) — battery saving
- Class cards open bottom sheet with details
- A2HS banner dismissible
- Share button uses Web Share API + WhatsApp fallback

### 2. Week — `/design/stitch/screens/Week.html`
**Structure:**
- Sticky Header: "Week 48" + "Week at a glance" toggle button
- **Sticky Day Chips**: Mon–Fri (horizontal scroll, today highlighted)
- **Week-at-a-Glance Strip** (toggleable): 5 columns with dots per class per day
- **Vertical Day Timeline**: Grouped by day header, class cards with time, mode chip, title, subtitle
- **Free Gap Rows**: "Free 2h" muted rows between classes
- **Clash Cards**: Red border + warning icon, "Clash" badge, explains both classes
- **Bottom Tab Bar**: Today, Week (active), Browse, Settings
- **Bottom Sheet** (class detail): Same as Today

**Key Behaviors (from inline JS):**
- Day chips filter timeline (tap/swipe)
- Week-at-a-glance toggle shows/hides dot strip
- Class cards open bottom sheet
- Clash cards visually distinct (red border, warning icon)

### 3. Browse — `/design/stitch/screens/Browse.html`
**Structure:**
- Header: "Browse units"
- **Pinned Search Bar**: Search input with icon, filters on input
- **Horizontal Scrolling Filter Chips**: All, In-person, Online, Thu, Lab 4, LT 2B (multi-filter)
- **Results List**: Class cards with time, mode chip, title, venue+lecturer
- **Bottom Tab Bar**: Today, Week, Browse (active), Settings
- **Bottom Sheet** (class detail): Same as Today/Week

**Key Behaviors (from inline JS):**
- Search filters by unit, venue, lecturer (client-side)
- Filter chips combine with search (AND logic)
- Each card has `data-meta` for filtering
- Results rendered statically in HTML, filtered via JS

### 4. Settings — `/design/stitch/screens/Settings.html`
**Structure:**
- Header: "Settings"
- **Display & Battery**: Dark theme toggle (OLED), Data saver mode toggle
- **Notifications**: 30-minute class reminder toggle (requests permission)
- **Share & Install**: Share via WhatsApp button, "Change course or units" link
- **Bottom Tab Bar**: Today, Week, Browse, Settings (active)

**Key Behaviors (from inline JS):**
- Dark theme toggle persists via `document.documentElement.classList.toggle('dark')`
- Toggle UI updates (thumb position, colors, aria-checked)
- Reminder toggle requests Notification permission
- Share uses Web Share API + WhatsApp fallback

### 5. Onboarding — `/design/stitch/screens/Onboarding.html`
**Structure:**
- Progress Dots: 3 steps (bar + dot for active)
- **Step 1**: Course search (autofocus, autocomplete over 3 courses)
- **Step 2**: Unit checkboxes (all checked by default except SE 312)
- **Step 3**: Success checkmark, "You are all set", link to Settings
- **Bottom Thumb-Zone Action**: Primary button ("Continue to units" → "Save timetable" → "Open Today")

**Key Behaviors (from inline JS):**
- Step progression with progress dots
- Course search filters course options
- Clicking course auto-advances to step 2
- Final step navigates to Today.html

## Design Tokens (identical across all screens — from campuspulse_design_system.md)

### Colors (Light & Dark)
- Primary: `#00652C` (light) / `#79DB8D` (dark) — Deep forest green
- Amber: `#B45309` (light) / `#FBBF24` (dark) — Next/now class highlight
- Error: `#BA1A1A` (light) / `#FFB4AB` (dark) — Clashes/changes only
- Full Material 3 color scale with surface containers (surface, surface-container-low, surface-container-high, etc.)

### Typography
- Space Grotesk (headlines, time readouts): 400/600 weights
- Geist (body, UI controls): 400/600 weights
- System sans-serif fallback
- Tabular nums for timestamps/countdowns
- Scale: headline-lg (28px), headline-md (22px), title-lg (18px), title-md (16px), body-lg (18px), body-md (16px), label-lg (16px), label-md (14px), label-sm (12px)

### Spacing
- gutter-xs: 4px, gutter-sm: 8px, gutter-md: 12px, gutter-lg: 16px, gutter-xl: 24px, section: 32px, page-margin: 16px

### Shapes
- sm: 8px, DEFAULT/md: 12px, lg: 16px, xl: 24px, full: 9999px

### Motion
- state-change: 100ms ease-out
- surface-enter: 220ms cubic-bezier(0.2, 0, 0, 1)
- surface-exit: 150ms cubic-bezier(0.3, 0, 1, 1)

### Layout
- Max content width: 430px (centered on wider screens)
- Viewport-fit: cover
- Safe-area insets for bottom bar

## Component Patterns (from screen HTML)

| Component | Variants Used | Notes |
|---|---|---|
| **Button** | Primary (filled), Secondary (outlined), Icon-only, With-icon | Min-height 48px, rounded-lg |
| **Card** | Elevated (surface-container-low), Interactive (active:opacity-80), Free-gap (muted) | 16px radius, border |
| **Chip** | Filter (pill, 48px min-h), Mode badge (rounded-full), Clash badge (error) | Primary/secondary/error containers |
| **Searchbar** | Standard (pinned), With suggestions | Rounded-full, 48px min-h |
| **Toggle** | Switch (52x32px), With description label | ARIA role="switch" |
| **Bottom Sheet** | Drag handle, close button, modal backdrop | Fixed bottom, max-w-430px, rounded-t-xl |
| **Tab Bar** | 56px, 4 columns, Material Symbols icons, safe-area | Active = primary color, fill=1 |
| **Day Chips** | Horizontal scroll, today highlighted | 48px min-h, pill |
| **Progress Dots** | Bar + dot for active step | 3 steps |

## Mode Chips (semantic colors)
- **In-person / Face to face**: Green (`secondary-container`)
- **Online**: Blue (`primary-container` in dark, `surface-container-high` in light)
- **Blended**: Purple (not seen in screens, but in design system)

## Gaps Between Stitch and AGENTS.md §4 (UPDATED)

| AGENTS.md Requirement | Stitch Status | Gap |
|---|---|---|
| Bottom tab bar (Today·Week·Browse·Settings) | ✅ All 5 screens | — |
| Onboarding flow (3 steps) | ✅ Onboarding.html | — |
| Today screen (next-class card, timeline) | ✅ Today.html | A2HS banner in Stitch, not in AGENTS.md §4.2 |
| Week screen (day chips, timeline, free gaps, clash markers) | ✅ Week.html | Week-at-a-glance is dot strip (matches) |
| Browse screen (search, filter chips, results) | ✅ Browse.html | Filter chips include day+venue (not just mode) |
| Settings sheet | ✅ Settings.html (full page, not sheet) | AGENTS.md says bottom sheet from top bar; Stitch is full page |
| Class detail bottom sheet | ✅ All screens | Shared component across screens |
| Mode chips (Face to face=green, Online=blue, Blended=purple) | ✅ In-person=green, Online=blue | Blended not in mock data; Face to face called "In-person" |
| Week-at-a-glance toggle (dots not grid) | ✅ Week.html | Dot strip toggleable |
| Dark theme default, light available | ✅ Both themes, dark default | — |
| 430px centered column | ✅ max-w-[430px] mx-auto | — |
| Safe-area aware bottom bar | ✅ pb-[env(safe-area-inset-bottom)] | — |
| Share (native + WhatsApp) | ✅ All screens | Web Share API + wa.me fallback |
| A2HS banner | ✅ Today.html only | AGENTS.md doesn't mention |

## Files in `/design/stitch/`
- `campuspulse_design_system.md` — Design tokens reference
- `INVENTORY.md` — This file
- `screens/Today.html` — Today screen
- `screens/Week.html` — Week screen
- `screens/Browse.html` — Browse screen
- `screens/Settings.html` — Settings screen
- `screens/Onboarding.html` — Onboarding flow

## Action Items for Implementation
1. ✅ Design tokens → `/app/src/styles/tokens.css` (done in M0-03)
2. Build component library from patterns above (Button, Card, Chip, Searchbar, Toggle, BottomSheet, TabBar, DayChips)
3. Implement screens matching Stitch HTML structure exactly
4. Use Material Symbols icons (via font or inline SVG)
5. Note: Stitch uses Tailwind CDN — we use CSS variables from tokens.css
6. Note: Stitch Settings is full page; AGENTS.md says bottom sheet — follow Stitch (full page) as visual source of truth
7. Note: Stitch Today has A2HS banner; implement per Stitch
8. Note: Stitch uses "In-person" not "Face to face" — use Stitch terminology
