---
name: "CampusPulse"
description: "Mobile-first, OLED-optimized student timetable PWA with high-contrast deep green, amber live-class indicators, and red clash alerts."
---

## Overview

CampusPulse is a mobile-only student timetable and class-finder PWA built for one-handed, bright-sunlight legibility on 360px–430px phones. It defaults to a deep-neutral dark theme to conserve OLED battery life while offering a full light theme for daytime outdoor use. The visual language is **High-Contrast / Modern**: flat tonal surfaces, 16px card corners, zero decorative blur or gradients, and strict typographic hierarchy where class time leads, unit name follows, and venue/lecturer sit third.

## Colors

Deep forest green anchors primary actions and active navigation; warm amber highlights the current or next upcoming class; red is reserved strictly for timetable clashes and schedule changes.

```yaml
colors:
  light:
    primary: "#00652C"
    on-primary: "#FFFFFF"
    primary-container: "#15803D"
    on-primary-container: "#D3FFD5"
    secondary: "#436648"
    on-secondary: "#FFFFFF"
    secondary-container: "#C4EDC6"
    on-secondary-container: "#14371D"
    amber: "#B45309"
    on-amber: "#FFFFFF"
    amber-container: "#FEF3C7"
    on-amber-container: "#78350F"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#93000A"
    background: "#F6FBF2"
    on-background: "#181D17"
    surface: "#F6FBF2"
    surface-dim: "#D6DCD3"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#F0F5EC"
    surface-container: "#EAEFE6"
    surface-container-high: "#E4EAE1"
    surface-container-highest: "#DFE4DB"
    on-surface: "#181D17"
    surface-variant: "#DAE6D7"
    on-surface-variant: "#3F493F"
    outline: "#566156"
    outline-variant: "#BECABC"
    inverse-surface: "#2C322C"
    inverse-on-surface: "#EDF2E9"
    inverse-primary: "#79DB8D"
  dark:
    primary: "#79DB8D"
    on-primary: "#003916"
    primary-container: "#15803D"
    on-primary-container: "#D3FFD5"
    secondary: "#A9D0AB"
    on-secondary: "#14371D"
    secondary-container: "#2E5134"
    on-secondary-container: "#D2FBD3"
    amber: "#FBBF24"
    on-amber: "#291800"
    amber-container: "#452B00"
    on-amber-container: "#FDE68A"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#0F1510"
    on-background: "#DFE4DB"
    surface: "#0F1510"
    surface-dim: "#0F1510"
    surface-bright: "#353B34"
    surface-container-lowest: "#0A0F0A"
    surface-container-low: "#181D17"
    surface-container: "#1B211B"
    surface-container-high: "#262B26"
    surface-container-highest: "#313630"
    on-surface: "#DFE4DB"
    surface-variant: "#3F493F"
    on-surface-variant: "#BECABC"
    outline: "#889487"
    outline-variant: "#3F493F"
    inverse-surface: "#DFE4DB"
    inverse-on-surface: "#2C322C"
    inverse-primary: "#006D30"
```

## Typography

To stay fast on low-end Android devices, only one weight pair (**400** and **600**) is loaded for **Space Grotesk** (headlines and time readouts) and **Geist** (body and UI controls), with immediate system sans-serif fallback. Body copy and form inputs are **16px minimum** so mobile browsers never auto-zoom on focus. All timestamps and countdowns use `tabular-nums`.

```yaml
typography:
  headline-lg:
    fontFamily: "Space Grotesk"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Space Grotesk"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.15px
  title-lg:
    fontFamily: "Space Grotesk"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  title-md:
    fontFamily: "Geist"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Geist"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  body-md:
    fontFamily: "Geist"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Geist"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: "Geist"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: "Geist"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.2px
```

## Layout & Spacing

Mobile-only single-column layout targeting **360px–430px** portrait viewports; on wider screens, the app centers inside a `430px` column. All primary interactive targets meet a **48px minimum** height/width, and primary actions sit in the lower thumb zone. A fixed **56px** bottom tab bar (plus safe-area inset) anchors navigation across Today, Week, Browse, and Settings. Cards use **12px** vertical/grid spacing and **16px** horizontal page margins.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 32px
  page-margin: 16px
```

## Elevation & Depth

**Tonal layers** establish depth without heavy drop shadows or backdrop blurs (which hurt scroll performance on budget Android devices). The base canvas sits on `surface`, standard class cards sit on `surface-container-low`, active or elevated bottom sheets sit on `surface-container-high`, and subtle `1px` `outline-variant` borders separate interactive chips and free-gap rows.

## Shapes

Cards and bottom sheets use generous **16px** (`rounded-lg`) corners for a friendly, tactile mobile feel. Filter chips, day pills, and mode badges use pill (`9999px`) or `12px` (`rounded-md`) corners.

```yaml
rounded:
  sm: 8px
  DEFAULT: 12px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
```

## Motion & Micro-interaction

Motion is minimal and hardware-accelerated (`transform` and `opacity` only) to stay smooth at 60fps on low-end Android phones. No decorative loops, no pulsing dots, and no layout-thrashing animations. Bottom sheets slide up cleanly with a decelerating curve; tab and chip switches settle instantaneously.

```yaml
motion:
  state-change:
    duration: 100ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 220ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Tone of voice:** Direct, calm, and practical—written for a student checking their phone between lectures.
- **Capitalisation:** Sentence case everywhere (`Add to Home screen`, `Free 2h`, `Week at a glance`).
- **Terminology:** Use "Unit" (not "Course" for individual subjects; "Course" is the degree program), "Venue" (not "Room" or "Location"), "Clash" (not "Conflict"), and "Mode" (`In-person`, `Online`, `Hybrid`).
- **Numbers & time:** 24-hour or compact 12-hour (`09:00 – 11:00` or `9:00 AM`) with `tabular-nums`; countdowns update every minute (`Starts in 24m`), never every second.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Chip** → `@components/chip.html` — `chip-action`, `chip-input`, `chip-with-icon`
- **Searchbar** → `@components/searchbar.html` — `searchbar-standard`, `searchbar-with-suggestions`
- **Toggle** → `@components/toggle.html` — `toggle-standard`, `toggle-label`, `toggle-description`

## Do's and Don'ts

- **Do** keep every tap target at least `48px` (`min-h-[48px]`).
- **Do** keep body text and `<input>` font sizes at least `16px` (`text-body-md`).
- **Do** center the layout in a `430px` max-width column on wider viewports.
- **Do** place primary actions in the bottom thumb zone and use bottom sheets for all detail views.
- **Don't** use `backdrop-blur`, heavy shadows, or pure `#000000` backgrounds.
- **Don't** use hover-only states, tooltips, multi-column desktop grids, or side panels.
- **Don't** use red for anything other than timetable clashes or schedule changes.
