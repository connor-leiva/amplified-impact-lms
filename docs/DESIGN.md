# Amplified Impact · Implementation Hub — Design system

This file is the source of truth for the LMS prototype. Every value below is referenced by a semantic name. The CSS custom properties that implement them live in each page's `<helmet>` (`--name-with-dashes`, e.g. `action.primary` → `--action-primary`).

## Vocabulary

Use these words everywhere: in the UI, in emails, and in admin.

| Term | Meaning |
|---|---|
| AI Employee | What a learner builds. Six exist: Marketing, Sales, Database (Agent tier), Meetings, Finance, Operations (Team tier). |
| Session | A live class. One per AI Employee. |
| Step | One verified task. Every AI Employee has exactly 6. |
| Built | All 6 steps verified. |
| Deployed | Running in the learner's tools. |

Never use "installed", "module completed" or "lesson" in learner-facing copy.

## Status model

Every AI Employee has three independent states. Each is shown with the **StatusToken** component, an icon plus a text label, never color alone.

| Axis | States | Where it shows |
|---|---|---|
| access | `included`, `locked` | Sidebar rows, cards, locked preview |
| build | `not_started`, `in_progress` (n of 6), `verified` (“Built”) | Sidebar rows (compact: `0/6`, `3/6`, `Built`), cards, checklist header |
| runtime | `deployed`, `paused`, `needs_attention`, `not_deployed` | Detail header pill, “Your deployment” card, admin tables |

Progress bars fill by steps verified out of 6, never by employee count.

## Color

### Ink ramp (neutral)

A 10-step neutral ramp, split since D-031 (it was one warm hue, 85). ink-50 to ink-300 are warm (hue 89 to 91, the Cream family) and, in light mode, used for grounds and lines. ink-400 to ink-900 are green (hue 160 to 172) and, in light mode, used for text. Light mode reads it top-down, dark mode bottom-up.

| Step | OKLCH |
|---|---|
| ink-50 | 0.985 0.004 91 |
| ink-100 | 0.961 0.008 91 |
| ink-200 | 0.922 0.014 89 |
| ink-300 | 0.873 0.0155 90 |
| ink-400 | 0.661 0.017 160 |
| ink-500 | 0.502 0.017 169 |
| ink-600 | 0.397 0.0175 168 |
| ink-700 | 0.365 0.018 170 |
| ink-800 | 0.29 0.019 171 |
| ink-900 | 0.235 0.019 172 |

The ramp reproduces the brand guide exactly: ink-900 is Ink `#15211D`, ink-100 is Cream `#F4F2EC`, and the working greys are ink-600 `#3E4A45`, ink-500 `#5B6762`, ink-400 `#8A968F`, ink-300 `#D9D5CA` and ink-200 `#E9E5DB`.

`paper` is pure white and is used only for raised surfaces and, since D-031, the sidebar in light mode.

### Semantic tokens

Mappings as of D-031.

| Token | Light | Dark | Use |
|---|---|---|---|
| bg.canvas | ink-100 (Cream) | ink-900 (Ink) | Page background |
| bg.sidebar | paper | below ink-900 | Sidebar |
| bg.surface | paper | ink-800 | Cards, panels |
| bg.sunken | ink-100 | between ink-900 and ink-800 | Code blocks, inset rows, segmented tracks |
| bg.raised | paper | above ink-800 | Menus, drawers, dialogs |
| bg.hover / bg.selected | ink-100 | above ink-800 | Row and item states |
| bg.inverse | ink-900 | ink-50 | Toasts, tooltips |
| bg.poster | ink-900 | below ink-900 | Video poster. Flat, no glow. |
| line.subtle / line.default / line.strong | ink-200 → ink-300 | ink-700 range | Dividers, card borders, control borders |
| text.primary | ink-900 | ink-100 | Headings, body |
| text.secondary | ink-600 | ink-300 | Supporting copy |
| text.tertiary | ink-500 | between ink-400 and ink-300 | Meta, captions, placeholders |
| text.disabled | ink-400 | between ink-500 and ink-400 | Disabled controls, locked nav items |
| text.link | Forest, hover Ink | Energy Bright | Inline links |
| action.primary | Forest, Cream letters | Energy Bright, Ink letters | Primary buttons, focus, active nav label and icon |
| action.secondary | paper + line.strong | raised surface | Secondary buttons |
| focus.ring | action.primary at 32% | same | Focus outline on every interactive element |
| status.success | green 145° | lighter | Built, Deployed, Verified, Replay ready, Live |
| status.progress | cobalt 258° | lighter | In progress (n of 6). Always different from action.primary. |
| status.neutral | ink | ink | Not started, Paused, Not deployed, Scheduled |
| status.attention | red-orange 32° | lighter | Needs attention, warning banners, destructive actions |
| access.locked | amber 75° | lighter | Team tier lock, locked preview, upgrade prompts |

Each status token has four parts: the solid (`status.success`), `-text`, `-bg` and `-line`.

### Brand palette

The accent tweak (Pine, Indigo, Plum) was removed in D-031. The palette is the brand guide's. The tokens are authored in OKLCH, and each round-trips to the guide's exact hex.

| Color | Hex | Token | Use |
|---|---|---|---|
| Ink | `#15211D` | ink-900 | text.primary (light), bg.canvas (dark), letters on Energy Bright buttons |
| Cream | `#F4F2EC` | ink-100 | bg.canvas (light), text.primary (dark), letters on Forest buttons |
| Forest | `#1F4D40` | action.primary, text.link (light) | Primary buttons (8.55:1 with Cream letters), links, active nav label and icon |
| Energy Bright | `#6FD3A5` | action.primary, text.link (dark) | Primary buttons (9.10:1 with Ink letters), links, active nav label and icon |
| Active tint | `#E3EFE8` | action.primary-tint (light) | Active nav row background |
| Energy | `#1F8A5C` | none | Logo artwork only |

Forest cannot be the dark primary: it is 1.73:1 on Ink. Energy is 3.87:1 on Cream (the guide's 4.3:1 is the figure on white), so it is never text or a link. Terracotta is not used in the product UI. status.progress stays Cobalt 258°.

## Theme

Light mode is the default. Dark mode is a toggle in the profile menu (Theme: Light / Dark) and is remembered per browser. Both themes use the same semantic token names, so only the mapping above changes.

## Type

Typeface: **Hanken Grotesk** (the Instrument Sans and Schibsted Grotesk tweaks were removed in D-031). Mono: **DM Mono** for timestamps, countdown digits, code and file names.

Six-step scale:

| Step | Size / line | Use |
|---|---|---|
| caption | 12 / 16 | Meta, token labels, helper text |
| small | 13 / 18 | Secondary text, table cells, metadata line |
| body | 14 / 20 | Default UI text, buttons, **section labels (semibold)** |
| lead | 16 / 24 | Card titles, H2, outcome line |
| title | 20 / 28 | Session titles, sheet section headings |
| display | 26 / 32 | Page H1, large numbers |

Labels use Title Case: headings, section labels, navigation, buttons, tabs, table headers, field labels, status tokens and chapter names. Articles, short conjunctions and short prepositions stay lowercase unless they come first or last (“Add to Calendar”, “3 of 6 Steps”, “Run on a Listing”). Body copy, descriptions, hints written as sentences, toasts and tooltips stay in sentence case. The only all-caps text is the “Session N” kicker on the video poster and the LIVE badge.

## Iconography

The icons are drawn from scratch for Amplified Impact. They don't come from a library.

- 24 px grid with a 3 px safe area, 1.8 px stroke, round caps and joins, soft corners (radius 2.5 to 5).
- **Signature:** container shapes (boxes, circles, bubbles) stay open at the upper right, and a single spark dot sits in the gap. It reads as energy leaving the shape, which is the “amplified” idea.
- Glyph strokes inside containers are straight and geometric. Signal icons (Sessions, Marketing, volume) use arcs that grow outward to the right.
- Status tokens use a matching 16 px set: ring, partial pie for n of 6, check, lock, signal, pause and alert.
- Source: `ICONS` in `lms-data.js`, built from small helpers (open box, open circle, spark), so new icons follow the same rules.

## Time

- Every time shows the viewer's zone first and the program zone (CT) in parentheses: `2:00 PM ET (1:00 PM CT)`. If the viewer is in CT, only `1:00 PM CT` shows.
- The viewer's zone is detected automatically. The profile menu shows “Time zone: Auto (Eastern) · Change” and lists the US zones.
- Past events show relative time (“Deployed 4 days ago”) with the absolute date and time on hover.

## Components

All components are separate files the app imports, so the States sheet renders the real thing.

- **StatusToken**: `kind` (access, build, runtime, step, custom), `state`, `n`, `total`, `compact`, `size` (sm, md). Default, compact (sidebar), md (detail header), loading skeleton.
- **NavItem**: label, icon, active, locked, depth, collapsed, build token, badge, chevron. Locked rows use text.disabled, show a lock with the tooltip “Team tier”, and open the locked preview.
- **JoinButton**: the single canonical link to a live session. `disabled` until 15 minutes before start (hint: “Opens 15 min before”), then primary. `loading` while Zoom opens.
- **SessionCard**: five variants.
  - `scheduled` (more than 24 h): Add to calendar is primary, Join is disabled.
  - `starting_soon` (under 15 min): Join is primary.
  - `live`: LIVE badge and elapsed time.
  - `ended_processing`: “Replay processing · usually within 2 hours”.
  - `replay_ready`: Watch replay is primary.
  - Seconds hide when more than an hour remains. The countdown has `role="timer"`. A polite live region announces only at hour, 10-minute and 1-minute boundaries.
- **EmployeeCard**: icon, access or build token, outcome line, a progress bar with 6 segments, session line, one CTA. States: default, hover, focus, disabled, loading.
- **AnnouncementBanner**: severity (info, warning), title, optional body, relative time, optional action button, per-user dismissal.
- **LockedEmployeePreview**: outcome headline, 3 output bullets, “Included in Team tier” token, one primary CTA “See Team tier” that opens the Team tier page.
- **BuildChecklist** (on the detail page): 6 steps, each with title, estimated minutes, the asset it needs, a “Watch at mm:ss” link to its chapter, and either a Verified token or “Mark verified”. The header shows “n of 6 steps verified”.

## Layout

- The sidebar is expanded (248 px) on desktop by default and shows an icon with every item, including each AI Employee. The Collapse Sidebar toggle switches to a 64 px icon rail, and the choice is remembered. Below 768 px it becomes a drawer.
- Page padding is 32 px, then 24 px below 1280, then 16 px below 768. Top padding is at least 24 px so the H1 clears the header.
- On the detail page, the header sits above a main column (player, chapter rail, build checklist) and an aside (Your deployment, build kit, instructor notes). The footer has a single “Next: …” link that skips locked AI Employees.
- The expanded sidebar header shows the “ai academy” app lockup at 161 × 34 px, as do the drawer, sign-in and invite accept. Dark theme switches it to the reversed lockup. The collapsed rail shows the favicon drawing at 28 × 28 px. These replaced the logo and wordmark drop-target slots (D-031).

## Files

- `Amplified Impact LMS.dc.html`: the app (learner portal and admin console, with demo controls).
- `States.dc.html`: component states and the five session card variants.
- `Responsive.dc.html`: live frames at 1024 px and 390 px.
- `lms-data.js`: demo data, the status model, time-zone formatting and session-card logic.
- `brand/`: the app lockup and its reversed version, the signature logo and its reversed version, and the favicon (D-031).
