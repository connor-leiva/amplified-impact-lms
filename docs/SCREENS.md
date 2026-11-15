# SCREENS.md: Screen-by-Screen Specification

This is the visual and behavioral contract for every screen. Read it together with `DESIGN.md` (tokens, type, status model) and the matching file in `reference/`.

**Precedence rule.** The reference prototype is the visual source of truth. Its inline styles, copy and logic classes in `reference/*.dc.html` decide any pixel or string question. The compliance suite compares your build against it automatically (see `phases/00-setup.md`). This file tells you *what exists, how it is laid out and how it behaves*. If this file and the reference disagree on a pixel or a string, the reference wins. If they disagree on behavior, raise it before building.

Conventions:
- All sizes are CSS px. Colors are always tokens (`--text-secondary`), never hex.
- "14/600" means font-size 14px, weight 600. Line-height follows the DESIGN.md scale unless stated.
- Copy in `code` style is exact. Title Case applies to labels (see DESIGN.md › Type).
- "Ref:" names the reference file that implements the screen.

---

## 1. Shared patterns

Use these everywhere. Do not invent variants.

### 1.1 Page container
| Screen | max-width | gap |
|---|---|---|
| Dashboard, Team Hub | 1360 | 20 |
| Employee detail | 1440 | 20 |
| Sessions | 1200 | 20 |
| Resource Vault (portal) | 1280 | 18 |
| Team Tier | 1160 | 24 |
| Admin pages (default) | 1400 | 18 |
| Staff & Roles | 1300 | 18 |
| Module Builder body | 1480 | 20 |

- Padding is `var(--page-pad-top) var(--page-pad-x) 56px` with `margin: 0 auto`. The tokens step down from 32/32 to 24 below 1280 px, and to 16 (24 top) below 768 px.
- Page header: H1 26/32 600, letter-spacing −0.02em. Subline 14 `--text-secondary` with 4 px above. Header actions sit on the right and wrap under the title on narrow widths (`flex-wrap: wrap; justify-content: space-between; align-items: flex-end`).

### 1.2 Card (section)
- Radius 14 (dialogs 14–16, small inset boxes 9–10). Border `1px solid var(--line-default)`. Background `--bg-surface`.
- Padding is 18px 20px for standard cards, 16px for aside cards, and 16px 10px 10px for list cards whose rows carry their own 8 px padding.
- Section title: 16/600 when it is an `h2` on the page, 14/600 for aside card titles.
- Inset rows and boxes inside cards: background `--bg-sunken`, border `1px solid var(--line-subtle)`, radius 10.

### 1.3 Buttons
| Variant | Height | Padding | Radius | Fill / border / text | Hover |
|---|---|---|---|---|---|
| Primary | 36 (sm 30–32, lg 38–42) | 0 14 | 8 | `--action-primary` / transparent / `--action-on-primary`, 14/600 | `--action-primary-hover` |
| Secondary | same | 0 12–14 | 8 | `--action-secondary` / `--action-secondary-line` / `--text-primary`, 14/500 | `--action-secondary-hover` |
| Ghost | 30–32 | 0 10 | 8 | transparent / none / `--text-secondary`, 13/500 | bg `--bg-hover`, text primary |
| Link | auto | 0 | — | `--text-link`, 13–14/500–600 | `--text-link-hover` |
| Destructive | 34–36 | 0 12 | 8 | transparent / `--line-strong` / `--status-attention-text` | bg `--status-attention-bg` |
| Icon | 30–32 square | — | 7–8 | as secondary or ghost; icon 14–16 | as variant |
| Disabled | as variant | — | — | `--action-secondary` / `--line-default` / `--text-disabled`, `cursor: not-allowed`, `aria-disabled="true"` | none |

- Focus on every button is `box-shadow: 0 0 0 3px var(--focus-ring)` (nav rows use 2 px).
- Icons inside buttons are 13–16 px with an 6–8 px gap.
- Labels never wrap (`white-space: nowrap`).

### 1.4 Segmented control
- Track: background `--seg-track`, border `1px solid var(--line-default)`, radius 9, padding 3, gap 2.
- Option: height 26–30, padding 0 10–12, radius 6–7, 13/500, with `aria-pressed`.
- Active option: background `--seg-active`, `box-shadow: var(--shadow-xs)`, text `--text-primary`. Inactive: transparent, `--text-secondary`.

### 1.5 Form fields
- Canonical input: height 36, padding 0 11, radius 8, border `1px solid var(--line-strong)`, background `--bg-surface`, 14px. Focus: border `--action-primary` plus a 3 px `--focus-ring`.
- The Module Builder, Employee detail, Sessions, Team Tier and Dashboard use the canonical input. Older admin screens (Overview, Curriculum, Cohorts, Learners, Vault, Announcements, Tiers, Staff) and the Team Hub and Vault use `--bg-sunken` with a `--line-subtle` border. **Keep each screen as its reference shows it.**
- Label sits above the field: 13/500 `--text-secondary`, gap 6. Optional helper text goes inline after the label as 400 `--text-tertiary`.
- Validation errors render inline under the form as 13 `--access-locked-text` (or `--status-attention-text` in the Module Builder alert box). The copy is exact and listed per screen.

### 1.6 Drawer (right side panel)
- `position: fixed; top: 0; right: 0; bottom: 0`, width `min(440 | 460 | 560px, 100vw)`.
- Background `--bg-raised`, border-left `--line-default`, `box-shadow: var(--shadow-drawer)`.
- Motion: `transform: translateX(105%) → none`, 240ms `cubic-bezier(.2,.8,.2,1)`. Scrim `--bg-overlay` fades 0→1 over 200ms; clicking it closes the drawer.
- Header padding 16–18 with title 16/600, description 13 `--text-tertiary` and a 32 px close icon button.
- Footer: border-top, padding 14px 18px, actions right-aligned with gap 8.
- Esc closes. Focus is trapped inside while open and returns to the trigger on close.

### 1.7 Modal
- Overlay `--bg-overlay`, centered, padding 20–24, `animation: ai-fade 160ms`.
- Dialog: radius 14–16, `--bg-raised`, border `--line-default`, `--shadow-pop`, `animation: ai-pop 200ms ease-out`, `role="dialog" aria-modal="true"`.
- Esc and the overlay close it.

### 1.8 Tables
- Wrap the table in a card with `overflow: hidden`, and give it an inner `overflow-x: auto` wrapper with a `min-width` (listed per table).
- Header row: CSS grid, padding 10px 18px, 13/500 `--text-tertiary`, border-bottom.
- Rows: same grid, padding 11–14px 18px, border-bottom `--line-subtle`. Clickable rows get hover `--bg-hover` and a trailing 16 px `chevR` in `--text-tertiary`.

### 1.9 Avatars, tokens, switches, skeletons
- **Avatar**: a circle filled with `avatarColor(id)`, a 7-hue `oklch(0.78 0.08 h)` palette from `lms-data.js`. Initials in `--ink-900` at 600.
  - Sizes: 22 (inline), 30 (table), 32 (sidebar), 34 (aside), 36 (menu), 40 (drawer).
  - Invited people: transparent fill with a `1.5px dashed var(--access-locked)` border.
- **Status Token**: always the `StatusToken` component. Never hand-roll a pill. See DESIGN.md › Status model.
- **Switch**: tracks are 30×18 (Admin Vault) and 34×20 (Announcements reminders), radius 999. On: `--status-success`. Off: `--line-strong`. Knob is white, 14 or 16 px, sliding 2→14 or 2→16 px over 150ms.
- **Skeleton**: `--bg-hover` with `animation: ai-skeleton 1.4s ease-in-out infinite`, at the same height as the content it replaces.

### 1.10 Toasts
- Position: fixed, bottom-right, 20 px inset. Stack up to 4, gap 8, `role="status" aria-live="polite"`.
- Pill: background `--bg-inverse`, text `--text-inverse` 13/500, padding 10px 14px, radius 10, `--shadow-pop`, max-width `min(420px, 100vw − 40px)`.
- Leading 16 px icon by tone: success `checkCircle` in `--status-success`, info `info` in `--text-inverse`, warn `alert` in `--access-locked`.
- Enter `ai-toast-in 200ms`. Auto-dismiss after 2800ms.

### 1.11 Icons
- Only `ICONS` from `starter/icons.ts`, rendered by `<Icon name>`: 24 viewBox, `fill: none`, `stroke: currentColor`, stroke-width 1.8, round caps and joins.
- Sizes are 13–18 inline and 22 in the page header tile.
- Never import an icon library.

---

## 2. App shell (all screens)

Ref: `Amplified Impact LMS.dc.html`, `Nav Item.dc.html`.

The shell is a full-height flex row, `100vh`, min-height 480, with `overflow: hidden` on the shell and scrolling inside `main`.

### 2.1 Sidebar
| Mode | When | Width | Behavior |
|---|---|---|---|
| Full | ≥ 768 px and preference `sidebar !== 'rail'` (default) | 248 | In flow |
| Rail | ≥ 768 px and preference `sidebar === 'rail'` | 64 | In flow, icons only, tooltips via `title` |
| Drawer | < 768 px | 280 | `position: fixed`, slides from left (`translateX(-105%)` → none, 220ms `cubic-bezier(.2,.8,.2,1)`), scrim `--bg-overlay`, `--shadow-pop` |

**Frame.** Background `--bg-sidebar`, border-right `1px solid var(--line-default)`, width transition 180ms ease. Two CSS variables are set on the `aside` and consumed by NavItem:
- `--nav-hover: color-mix(in oklch, var(--line-default) 70%, var(--bg-sidebar))`
- `--nav-active: var(--action-primary-tint)` (D-031)

**Brand row.** Height 56, padding `0 16` (rail `0 18`), border-bottom, gap 10. It holds one `BrandSlot` logo (D-031; it replaces the two dashed placeholder slots): a `data-brand-slot` wrapper (`flex: none; display: flex`) around the logo image (`alt=""`).
- Full and drawer: the `ai academy` app lockup at 161×34 (`brand/amplified-impact-academy-app.svg`), switching to the reversed lockup (`brand/amplified-impact-academy-app-reversed.svg`) in dark theme. The switch is keyed on `:root[data-theme]`, not `prefers-color-scheme`.
- Rail: the favicon drawing (`brand/favicon.svg`) at 28×28.

In drawer mode a 32 px close icon button sits at the right (`aria-label="Close menu"`).

**Context line** (full and drawer only). Padding `14px 20px 0`, 13/1.4 `--text-tertiary`.
- Learner: `cohortLine(cohort, now)`, which renders `December 2026 Cohort · Week 2 of 6`, `… · Starts Dec 1` or `… · Completed`.
- Admin: `Admin Console · December 2026 Cohort`.

**Nav.** Padding 10, gap 14 between groups. Admin group labels are 14/600 `--text-tertiary` with padding 4px 10px, hidden in rail mode.

**Portal nav** (in this order):
1. `Dashboard` (`grid`)
2. `Sessions` (`radio`)
3. `AI Employees` (`bot`). This is a group header: the badge shows the number of AI Employees included in the user's tier (`title="3 included in your tier"`), a chevron shows open or closed, and clicking toggles the children. It starts open.
   - Children: one row per visible AI Employee in curriculum order. Each row has depth 1, the employee's own icon, and `label = short` (Marketing, Sales, Database, Meetings, Finance, Operations).
   - The right-hand slot shows one of three things: a compact build token (`0/6`, `3/6`, `Built`), an `Opens Dec 14` clock token for scheduled employees, or a 13 px lock for locked employees (`title="Team tier"`, text `--text-disabled`).
   - Clicking a locked child opens the Locked Employee Preview modal. It never navigates.
4. `Team Hub` (`users`), Team tier only.
5. `Resource Vault` (`archive`).

In rail mode the group header disappears. The groups render as `[Dashboard, Sessions]`, then `[each employee icon]`, then `[Team Hub?, Resource Vault]`.

**Admin nav groups** (D-157, the Admin Console's groups, spec § 8):
- `Health`: `Overview` (`chart`)
- `Build`: `Curriculum` (`layers`, badge `N Draft` when drafts exist), `Module Builder` (`pencil`), `Resource Vault` (`archive`), `Cohorts & Sessions` (`calendar`), `Announcements` (`send`)
- `Support`: `Learners & Teams` (`users`)
- `Revenue`: `Tiers & Upgrades` (`card`, badge = count of `new` upgrade requests)
- `Operations`: `Audit Log` (`listChecks`), for a role with `audit.read` (Owner, Admin, Support)
- `Access`: `Roles & Permissions` (`lock`), for a role with `ops.read` (Owner, Admin); `Staff & Roles` (`shield`)

A Console row shows only to a staff role whose Console capabilities open it (`consoleCan`, `@ai/core`), and a group with nothing in it is left out: Instructor and Content Editor see no `Operations` group. The reference renders the Owner's sidebar; it has no Audit Log or Roles screen, so those two rows open the Overview there.

**Admin groups fold** (D-157, collapsible groups). Expanded (desktop and the phone drawer), each group's label is a heading button: 16px/600 `--text-tertiary`, padding `4 10`, at least 44px tall, radius 8, the nav rows' hover (`--nav-hover`) and 2px focus ring. The label sits left, and the AI Employees row's chevron sits right (14px `chevD`, stroke 2, `--text-tertiary`, turned -90° when closed). It carries `aria-expanded` and `aria-controls` (the id of the group's row list), and Enter and Space toggle it. Its rows sit 2px apart under it, as before, and are not rendered while the group is closed.
- **With no choice made**, only the group holding the active page is open, so every heading is in view.
- **A choice is remembered** per signed-in staff member, in this browser (`ai-lms-prefs` → `navGroups`), and it wins.
- **Arriving on a page**, by a row, a link or its URL, opens that page's group if it was closed. On the page itself, closing it stays closed.
- **In the rail**, groups have no headings and every row shows, as before.

The learner nav does not fold. The reference keeps the open state in memory only.

**NavItem.**
- Row: height 32, radius 8, gap 10, padding `0 10` (depth 1: `0 10 0 24`; rail: 0, centered), 14px.
- Weight: 500, or 600 when active.
- Colors:
  - Idle: text and icon `--text-primary` (D-031).
  - Active: background `var(--nav-active)` with no ring or shadow, text and icon `--action-primary`, `aria-current="page"` (D-031).
  - Hover: `var(--nav-hover)`.
  - Locked or disabled: text and icon `--text-disabled`.
- Badge: height 20, min-width 20, radius 999, `--bg-surface`, border `--line-default`, 12/500 `--text-secondary`.

**Footer.** Border-top, padding 10, gap 4.
- `Collapse Sidebar` / `Expand Sidebar` NavItem (`panel` icon), hidden in drawer mode. It persists `prefs.sidebar = 'rail' | 'full'`.
- Profile button: padding 6, radius 10, containing a 32 px avatar, the name 14/500, a tag 12 `--text-tertiary` and a `chevUD` icon. Tags:
  - Agent: `Agent Tier`
  - Team member: `{role} · Team Tier`
  - Staff: `Owner · Admin Console`

### 2.2 Header
- Height 56, padding `0 var(--page-pad-x)`, border-bottom, background `--bg-canvas`, gap 12.
- Drawer mode: a 34 px menu icon button sits first (`aria-label="Open menu"`).
- Breadcrumbs: `nav aria-label="Breadcrumb"`, 14px, separators `/` in `--text-disabled`. Earlier crumbs are clickable and `--text-tertiary` 400. The last crumb is `--text-primary` 600 and ellipsizes. Below 768 px only the last crumb shows.

| Route | Crumbs |
|---|---|
| `/` | Dashboard |
| `/sessions` | Sessions |
| `/employees/:id` | AI Employees / {Employee name} |
| `/team` | Team Hub |
| `/vault` | Resource Vault |
| `/team-tier` | Team Tier |
| `/admin` | Admin / Overview |
| `/admin/curriculum` | Admin / Curriculum |
| `/admin/curriculum/:id` and `/new` | Admin / Curriculum / {name or `New AI Employee`} |
| `/admin/cohorts` | Admin / Cohorts & Sessions |
| `/admin/learners` | Admin / Learners & Teams |
| `/admin/vault` | Admin / Resource Vault |
| `/admin/announcements` | Admin / Announcements |
| `/admin/tiers` | Admin / Tiers & Upgrades |
| `/admin/staff` | Admin / Staff & Roles |

**Demo controls** render only when `VITE_DEMO_MODE=true`; they never ship in production.
- At ≥ 1360 px they sit inline: label `View As` (13 tertiary) + segmented `Agent Tier | Team Owner | Admin`, then `Timeline` + segmented `Week 0 | Week 2 | After Cohort`, then a ghost `Reset Demo` button.
- Below 1360 px they collapse into a secondary button `Demo: {role} · {phase}`. It opens a 330 px popover (top 52, right 12) with both segmented controls full-width and a secondary `Reset Demo Data` button.

### 2.3 Profile menu
- `role="menu"`, fixed position. Full mode: left 10, bottom 64. Rail: left 72, bottom 12. Drawer: left 12, bottom 76.
- Width `min(300px, 100vw − 24px)`, padding 6, radius 12, `--bg-raised`, `--shadow-pop`, `ai-pop 140ms`.

Contents, top to bottom:
1. Identity: 36 px avatar, name 14/600, email 12 `--text-tertiary`.
2. Divider: 1 px `--line-subtle`.
3. Time zone line, 13px: `Time Zone: ` then the value in `--text-primary` 500, e.g. `Auto (Eastern)`. On the right, a link button that toggles between `Change` and `Done`.
4. Zone picker (when open): `role="radiogroup"`, `--bg-sunken`, max-height 210, scrolling. It contains `Auto · {zone}` followed by the 7 US zones from `ZONES`, each shown as `{Label} · {abbr}`. Selecting a zone saves it immediately.
5. Hint, 12 tertiary: `Session Times Show as {example}`, where the example is the next session formatted with `fmt.time`.
6. `Theme` row: segmented `Light | Dark` with `sun` and `moon` icons. Saves `prefs.theme` and sets `data-theme` on `<html>`.
7. Divider.
8. `Sign Out` menu item with the `logout` icon.

Esc or an outside click closes the menu.

### 2.4 Global overlays
- **Locked Employee Preview** (opens from any locked entry point): a modal with a centered panel of width `min(520px, 100%)` (see §5.7). Tabs switch between all locked AI Employees. `See Team Tier` closes it and navigates to `/team-tier`.
- **Confetti** fires once when an AI Employee becomes Built: 110 pieces, colors `--action-primary`, `--status-success`, `--access-locked`, `--status-progress`, `--ink-300`, durations 1.5–2.6 s, `ai-confetti` keyframes, `aria-hidden`, `pointer-events: none`. Respect `prefers-reduced-motion` and skip it.
- **Toasts** follow §1.10.

---

## 3. Learner portal

Personas used throughout (from the seed):
- **Agent tier**: Jamie Ortiz (`u_jamie`). Marketing deployed, Sales 3/6, Database not started.
- **Team owner**: Alex Morgan (`u_alex`) at Northline Realty Team.

### 3.1 Dashboard `/`
Ref: `Portal Dashboard.dc.html`.

**1. Header.** H1 `Dashboard`. Subline:
- Agent: `Agent Tier · Marketing, Sales and Database Included` (the included employees' short names joined with ", " and " and ").
- Team: `{Team name} · Team Tier`.

**2. Announcement Banner** (§5.6). Shows the newest `sent` announcement that is in-app, matches the user's audience, and has not been dismissed by this user.
- Seed example (warning): `Session 3 moved to {Wed Dec 9} · {time}`, with action `Update Calendar` (downloads the session `.ics`) and dismiss.
- The relative time (`Yesterday`) shows the absolute date on hover.

**3. Session Card** (§5.4). The variant comes from `cardSession(db, user, now)`.
- After the cohort ends (phase *After Cohort*), the card is replaced by the post-cohort card, which has the same card shell:
  - Kicker 14/600 secondary: `Your Cohort Wrapped on {Jan 8}`
  - Title 20/600: `Office Hours Continue Wednesdays`
  - Meta 13 tertiary: `Drop-In Build Help with Jordan Hale · Next: {Wed, Jan 13 · 11:00 AM CT}`
  - Buttons: primary `Add Office Hours to Calendar`, secondary `Rewatch Any Session` (→ `/sessions`).

**4. Body.** A wrapping flex row with gap 20: main `flex: 999 1 600px`, aside `flex: 1 1 280px`.

*Main, Progress card.* Padding 20px 22px, gap 16.
- Label `Progress` 14/600 secondary.
- Big number `{built} of {included}` at 26/32 600 tabular, followed by `AI Employees Built` 14 secondary.
- On the right, a secondary button `Next Up {Employee name} →`: the first open, included employee that is in progress, otherwise the first not started. It is hidden in Week 0 and when everything is built.
- Segmented progress bar (`role="img"`, aria-label lists each employee's `n of 6 steps`): one 8 px segment per included employee, gap 6, radius 4, track `--track`. Fill width is `n/6`, colored `--status-progress` while in progress or `--status-success` once built. Each segment's `title` is `{name}: {n} of 6 steps verified`.
- Legend row (gap 8×20): `{short}` followed by a build Status Token for each. Agent tier adds a link button with a 12 px lock: `{N} More with Team Tier`, which opens the Locked Preview.
- Week 0 adds a footer row (border-top): `Your First Build Is Session 1 on {Dec 1} · ▶ Watch the 5-Min Orientation` (link button).

*Main, "Your AI Employees".*
- `h2` 16/600 `Your AI Employees`, with `One live build each · Replays post within 2 hours` (13 tertiary) on the right.
- Grid `repeat(auto-fill, minmax(260px, 1fr))`, gap 14, containing one **Employee Card** (§5.5) per visible employee, including locked and scheduled ones.
- Card click:
  - Locked: opens the Locked Preview.
  - Scheduled: shows the toast `{name} opens {Mon D}. Materials post that morning.` (the reference lowercases the month; use the correct case).
  - Otherwise: navigates to `/employees/:id`.

*Aside, Quick Links card.* Rows padding 9px 8px, radius 10, hover `--bg-hover`. Each row has a 32 px icon tile (`--bg-sunken`, bordered), title 14/500, sub 12 tertiary and a trailing 14 px icon.
- `Cohort Community` / `148 members · 23 new posts today` / `arrowUR`. Opens the community URL (setting `communityUrl`); the sub text is a setting.
- `Office Hours` / `Wednesdays · {11:00 AM CT}` / `calPlus`. Downloads the next office-hours `.ics`.
- `Technical Support` / `Typical reply in under 2 hours` / `chevR`. Opens support (setting `supportUrl`).

*Aside, Cohort Schedule card.* Title `Cohort Schedule` with an `All Sessions` link (→ `/sessions`). One row per cohort session:
- 26 px number tile (mono 12), title 13/500 (secondary if locked), sub `{Tue, Dec 1 · 1:00 PM CT}` 12 tertiary.
- Compact token: locked → access locked; held with replay → `Replay` (success, check); live → `Live` (live dot); next → `Next` (progress, clock); otherwise none.
- Row click: the session's employee (locked → preview), or `/sessions`.

### 3.2 Employee detail `/employees/:employeeId`
Ref: `Portal Workspace.dc.html`.

Guards: a locked employee redirects to the first accessible one *and* opens the Locked Preview. An unknown id redirects to `/`.

**Header** (gap 16).
- Icon tile 46, radius 12: success tint when built, otherwise action tint (`--action-primary-tint`, `--action-primary-line`, `--action-primary`).
- H1 (name) 26/32, then a runtime Status Token at size `md`. Its tooltip is `Deployed {relative} · {absolute}`, `Built, not deployed yet`, or `Deploys after all 6 steps are verified`.
- Outcome 16/24 `--text-primary`.
- Metadata 13 tertiary, dot-separated: `From Session 1 · `**`The Autonomous Agent`**` · 45 Min Build · For listing agents & marketing coordinators`. The session title is a link to `/sessions`. Self-paced employees start with `Self-Paced`.

**Scheduled banner** (only when not yet open): a bordered card with a `Opens Dec 14` clock token and the text `The live build is Session 6. Everything here unlocks {Mon, Dec 14} at {9:00 AM CT}.` Mark Verified then shows a toast instead of toggling.

**Grid.** Main `flex: 1.7 1 560px`, aside `flex: 1 1 340px`, gap 20.

*Main, Player card* (`aria-label="Session replay"`).
- **Poster**: 16:9, background `--bg-poster`, flat with no gradient. Padding 6% 7%, bottom-aligned stack:
  - Kicker: mono 12, letter-spacing .12em, UPPERCASE, `--ink-400`: `Amplified Impact · Session 1`
  - Title 26/32 600 `--ink-50`: the session title
  - Sub 14 `--ink-400`: `{Employee name} · with Jordan Hale`
- **With a replay:**
  - Chip at top-left: `Replay · 1×`.
  - Big play button: 64 px circle `--ink-50` at 50%/44% when paused.
  - Captions while playing with CC on: a centered pill, 14px, `oklch(0 0 0 / .72)`.
- **Without a replay** (upcoming, live or processing), a top-right block:
  - When text, 13 `--ink-300`: `{Wed, Dec 9 · 1:00 PM CT}`, `Live now`, or `Replay processing · usually within 2 hours`.
  - Join Button (§5.3), plus a translucent `Add to Calendar` button (`oklch(1 0 0 / .08)` fill, `oklch(1 0 0 / .2)` border, `--ink-50` text).
  - Note `Join opens 15 min before`.
- **Controls** (replay only), padding 10px 14px 4px:
  - Seek bar: 16 px hit area, 4 px `--track` rail, progress in `--action-primary`. Six step markers, 2×8 px, colored `--status-success` once verified, otherwise `--text-tertiary`. The 12 px thumb is `--bg-surface` with a 2 px `--action-primary` border. `role="slider"`.
  - Buttons: play/pause, back 10 s (`reset` icon), then the time in mono 13 `12:34 / 58:24`.
  - Current chapter label 13 tertiary: `Step 3 · Teach It Your Voice`.
  - Speed button: mono 12, cycles `1× → 1.25× → 1.5× → 2×`.
  - CC toggle (`aria-pressed`), then a `Transcript` toggle button.
- **Chapter rail**, below a border:
  - Title `Chapters` (or `Session Agenda` with no replay) 14/600, with `Chapters Follow the 6 Build Steps` 12 tertiary on the right.
  - Grid of 6 columns at `minmax(112px, 1fr)` with gap 6. Each cell, padding 8px 10px, radius 9: `Step {n} · {mm:ss}` 12 tertiary with a 13 px success check when verified, then the chapter name 13/500.
  - The active chapter uses the action tint and line. Clicking seeks to the step timestamp and plays.
- Playback position is saved to `localStorage['ai-lms-pos-{id}']` every 5 s and on unmount, and restored on mount.

*Main, Transcript panel* (when toggled).
- Search input (canonical) with the count on the right: `{n} matches` or `{n} lines`.
- Max-height 300, scrolling. Each line has a mono 12 time in `--text-link` (46 px wide) and text 14 `--text-secondary`. The current caption line gets `--action-primary-tint`, and matches are highlighted with `--access-locked-bg`. Clicking a line seeks.
- Empty states: `No matches in this transcript.` and `The searchable transcript posts with the replay.`

*Main, Build Checklist* (`aria-label="Build checklist"`).
- Header, padding 18px 20px 14px: `h2 Build Checklist` 16/600, then `{n} of 6 Steps Verified` 14 secondary, then a build Status Token on the right. Below that, 6 segments of 6 px with gap 4 (verified segments use progress color, or success once built).
- Ordered list, padding 6px 8px 8px. Each step row has padding 12 and radius 10. The *next* step gets `--bg-sunken`.
  - Number circle 24, 1.5 px border: verified → success line, bg and text; next → `--action-primary`; others `--line-strong`.
  - Title 14/500 (secondary once verified), then hint 13 tertiary.
  - Meta row 12 tertiary: `About {mins} Min`, then `▶ Watch at {mm:ss}` (link, only with a replay), then asset chips (height 24, `--bg-sunken`, bordered, 12/500). The prompt step gets `Copy Prompt` and `View`. A step mentioning "skill file" gets one download chip per JSON or YAML file, labeled with the file name minus `.skill.json` or `.skill.yaml`.
  - Right side: `Mark Verified` (primary for the next step, secondary otherwise), or a `Verified` step token. Clicking the token undoes the step unless the employee is deployed; in that case it shows the toast `This AI Employee is deployed, so its checklist is locked.`
- Verifying the 6th step sets `builtAt`, logs `built {name}`, fires confetti and shows the toast `{name} is built. Deploy it from the card on the right.`

*Aside, Your Deployment.* The border switches to `--status-attention-line` when the runtime is `needs_attention`.
- Header: `h2 Your Deployment` 16/600 with the runtime token.
- Platform row (inset box): a 30 px `bot` tile, `Platform` 12 tertiary, value 14/500 (e.g. `Claude Project`). An `Open ↗` link appears when deployed.
- When line 13 secondary: `Deployed 4 days ago` or `Built …`, with the absolute time as its title.
- Issue box when `needs_attention`: attention tint, 13.
- Last Output (deployed and a run exists): `Last Output` and a relative time on one line, then an inset box with the title 13/600 and a 3-line clamped preview 13/1.5.
- Actions by state:

| Runtime / build | Primary | Secondary / note |
|---|---|---|
| `deployed` | `{runLabel}` (play), e.g. `Run on a Listing` → Run drawer | `Pause` |
| `paused` | `Resume` | note `Paused. It won’t pick up new work until you resume it.` |
| `needs_attention` | `Reconnect` (reset) → toast `Reconnected. Test run passed.` | issue text |
| not deployed, built | `Mark as Deployed` (rocket) | note `All 6 steps are verified. Mark it deployed once it’s running in your tools.` |
| not built | `Mark as Deployed`, disabled | note `Finish all 6 steps to deploy. {n} to go.` |

*Aside, Build Kit.*
- Title `Build Kit` with `{files + 1} Items` on the right.
- Prompt box (inset): `System Prompt` 14/600, with `{lines} lines · about {chars/4} tokens` 12 below.
  - Buttons: `View` (secondary) and `Copy` (primary; becomes `Copied` in success tint for 2 s).
  - Chips: `Fill In` followed by each `{{VAR}}` name in mono 11.5, `--access-locked-text` on `--access-locked-bg`.
- File rows (padding 8, hover): a 44×22 mono 11 type badge (`JSON`, `YAML`, `Notion`), the name (mono for JSON and YAML) 13/500, a desc 12 tertiary, then 30 px `eye` (preview) and `download` (or `ext` = `Duplicate to Notion`) buttons.
- Resource rows have the same layout. Pending items (`Posted after the session`) are disabled.

*Aside, Instructor Notes.* A 34 px avatar, then `Instructor Notes` 14/600 with `Jordan Hale` 12 tertiary, then the notes 14/1.6 `--text-secondary`.

**Footer.** Border-top, padding 20px 0 40px, right-aligned secondary button `Next: {next included, open employee} →`, or `Back to Dashboard` when there is none.

**Drawers** (width 560):
- *Viewer*: the prompt or skill file with line numbers (44 px, `--text-disabled`), mono 12.5/1.7 on `--bg-sunken`. `#` heading lines are `--text-link` 600 and `{{VARS}}` are `--access-locked-text`. Footer: `Copy`, plus `Download` or `Duplicate to Notion`.
- *Run*: a textarea labeled `Paste a listing` (derived from `runLabel`), prefilled with `runDemo.input`. Footer button `Run`, which becomes `Run again`.
  - Running state: a spinner and `{short} AI Employee Is Working…` for 1400 ms.
  - Then one card per output section: label 13/600 secondary, body 14/1.55 `pre-wrap`. `Copy All` copies them all.
  - The run writes `lastRun = {at, title: "{section} · {first input line}", preview}`.

### 3.3 Sessions `/sessions`
Ref: `Portal Sessions.dc.html`.

- H1 `Sessions`. Sub: `December 2026 Cohort · 6 live builds · Tue & Thu · {1:00 PM CT}`. Secondary button `Add All Sessions to Calendar` downloads one `.ics` with every accessible session.
- **Body**: main list card `flex: 999 1 600px`, aside `flex: 1 1 280px`.
- **List rows**: padding 16px 18px, border-top between rows, and the next session's row gets `--bg-sunken`.
  - Ring 34 (mono 13): held sessions show a success check, the next session has an action-primary ring, others a `--line-strong` ring with the number.
  - Title 16/600 `Session {n} · {title}` plus a token:
    - locked: `Team Tier`
    - replay: `Replay Ready`
    - processing: `Replay Processing`
    - live: `Live Now` (live dot)
    - next: `Next Up`
    - otherwise: `Scheduled`
  - Meta 13 tertiary: `{employee} · {Wed, Dec 9 · 1:00 PM CT} · 75 min` and, for held sessions, `{n} attended live`.
  - Actions by state:
    - Live or next: Join Button, stacked with its hint.
    - Upcoming: secondary `Add to Calendar`.
    - Replay: primary `Watch Replay` (play) → the employee page.
    - Locked: secondary `Preview` with a lock icon → Locked Preview.
- **Aside**:
  - `Office Hours` card: `Drop-In Build Help · Wednesdays · {11:00 AM CT}`, then 3 inset rows (`{when}` plus `Recording Posted` when past, or an `Add to Calendar` link when upcoming).
  - `Your Attendance` card: a big number 26/32, `of {held} Sessions Attended Live`, and a 13 tertiary note `Missed one? Every replay has chapters for the 6 build steps and a searchable transcript.`

### 3.4 Team Hub `/team` (Team tier; management actions for Team Owner)
Ref: `Portal Team Hub.dc.html`.

- H1 `Team Hub`. Sub: `{Team} · Team Tier · December 2026 Cohort`. Actions: `Export CSV` (secondary) and `Invite Member` (primary, `userPlus`).
- **Three summary cards**, grid `repeat(auto-fit, minmax(300px, 1fr))`, gap 14:
  1. `Seat Allocation`: `{used} of {seats}` with `Seats Assigned`, then 7 avatar slots of 34 px. Open slots are dashed with `+` and open the invite modal; invited slots are dashed amber. Below: `Owner 1 · Operations Lead 1 · Agents {n} of 5`.
  2. `Team Deployments`: the total plus `AI Employees Deployed Across the Team`, then one row per employee (76 px label, 6 px success bar, `n/m`).
  3. `Before {Session N · date}`: headline `{n} members haven’t finished earlier builds` (or `Everyone is caught up on earlier builds`), up to 4 people rows (22 px avatar, name, gap or `Reminded {relative}`), and a secondary `Remind {n} Members` button (`bell`). The border is `--access-locked-line` when anyone is behind.
- **Team Activity table**, min-width 920. Columns `minmax(220px,2fr) 140px 110px 170px minmax(200px,2fr) 100px 40px`; headers `Name · Role · Date Joined · AI Employees Built · Deployment Status · Last Active`.
  - Name cell: avatar 30, name, ` (You)`, email.
  - AI Employees Built: 6 squares of 14 px (success = built, progress tint = in progress, outline = none) plus `n/6`.
  - Deployment Status: a dot and a sentence. Possible values:
    - `Invite Sent · Awaiting Acceptance`
    - `{X} Needs Attention`
    - `{A, B} Deployed · {C} In Progress`
    - `In Progress: {…}`
    - `Not Started`
  - Clicking a row opens the member drawer.
- **Member drawer** (440):
  - Avatar 40, name, email, and two facts (`Joined`, `Last Active`).
  - A `Role` select (`Team Owner` | `Operations Lead` | `Sales Agent`), disabled for the owner.
  - `AI Employees`: a bordered list, one row per employee, showing a compact build token and a runtime token.
  - Footer: `Remove Seat` (destructive, hidden for yourself) and `Send Reminder` or `Resend Invite` (primary).
- **Invite modal** (460): title `Invite a Team Member`, sub `{n} of 7 seats available` or `All seats are assigned`.
  - Fields: `Work Email`; `Full Name` with `Optional`; `Role` as radio cards (Operations Lead, Sales Agent, Team Owner), each with a sub line and `{used} of {cap} used` (amber when full).
  - Footer: `Cancel` and `Send Invite`.
  - Errors, in this order:

| Condition | Message |
|---|---|
| bad email | `Enter a valid email address.` |
| already on team | `That person is already on your team.` |
| no seats | `All seats are assigned. Remove a seat or contact us to add more.` |
| role cap (Ops Lead 1, Sales Agent 5, Owner 1) | `Your plan includes {cap} {role}{s}.` |

### 3.5 Resource Vault `/vault`
Ref: `Portal Vault.dc.html`.

- H1 `Resource & Compliance Vault`. Sub: `Templates, workflows and compliance guides for real estate AI. One click to download.` Search field on the right (340 wide).
- Underline tabs, height 42, active `inset 0 -2px 0 var(--action-primary)`:
  - `Library {13}`
  - `Executive Build Vault {6}`, with a lock for Agent tier
  - URL: `?tab=executive`.
- Filters: category chips (`All` plus the 4 categories, or the 3 executive categories), each with a count that respects the search and type filters. Active chip: action tint and line. On the right, a type select `All File Types` plus the 5 types.
- List rows, padding 14px 18px:
  - 38 px type icon tile: `Claude Project` → bot, `Workflow JSON` → fileCode, `Prompt Pack` → chat, `PDF Guide` → file, `Notion Template` → book. Amber tile when locked.
  - Title 14/500, with chips `New` (updated within 3 days) and `Team Tier` (locked to the viewer). Desc 13 tertiary.
  - Category (200 wide), then type over `{size} · Updated {Dec 3}` (130 wide).
  - Action button (min-width 118): `Download`, `Duplicate` (Notion), or `Upgrade` (locked; amber; files an upgrade request).
- Downloads increment `dl`.
- Empty state: `No resources match. Try a different search or category.`
- Executive tab on Agent tier: an amber-bordered panel with the kicker `Team Tier`, title `Executive Build Vault` 20/600, a description, and the button `Book Upgrade Consultation` (which becomes `Consultation Requested`), next to a list of locked items.

### 3.6 Team Tier `/team-tier` (Agent tier only; Team tier redirects to `/`)
Ref: `Portal Upgrade.dc.html`.

- H1 `Team Tier`. Lead 16/24 secondary: `All six AI Employees, seven seats and the leadership builds. Everything you’ve built on Agent tier comes with you.`
- **Left column**, `flex: 1.6 1 520px`:
  - `h2 What You Add`, then one card per locked employee: a 40 px amber icon tile, name 16/600 plus a session line 13 tertiary, the headline 14 secondary, and 3 outputs with checks.
  - `Compare Tiers` table, columns `1fr 96px 96px`:
    - AI Employees: 3 / 6
    - Seats: 1 / 7
    - Live Sessions and Replays: ✓ / ✓
    - Resource & Compliance Vault: ✓ / ✓
    - Team Hub with Progress Tracking: — / ✓
    - Executive Build Vault: — / ✓
- **Right column**: a sticky price card (top 24, radius 16, `--shadow-card`):
  - `Team Tier` token, then `$4,995` 26/32 with `per Team, per Cohort · 7 Seats`, then the features with checks.
  - A 42 px primary `Book Upgrade Consultation` button. Once requested, it shows the success-tinted `Consultation Requested` with the note `Requested {relative} · we’ll reach out within 1 business day`. Otherwise the note reads `15-minute call · Your Agent tier progress carries over`.

---

## 4. Admin console

Persona: Casey Lin (Owner). Every admin mutation also appends to `activity` and shows a toast. The exact strings are in `phases/02-core-domain.md` › Mutations.

### 4.1 Overview `/admin`
Ref: `Admin Overview.dc.html`.

- H1 `Overview`. Sub: `{cohortLine} · Updated Live from Learner Activity`. Actions: `Export Report` (CSV of the funnel) and `New AI Employee` (→ builder `/new`).
- **KPI grid** `repeat(auto-fit, minmax(200px, 1fr))`, gap 12. Each card has a label 13 secondary, a value 26/32 600 tabular and a sub 12. The five cards:
  - `Active Learners`
  - `AI Employees Deployed`, with the sub `+{n} in the last 24 hours` in success color
  - `Build Completion`
  - `Live Attendance`
  - `Upgrade Pipeline` (amber when open)
- **Row 2**:
  - Chart card (flex 2): `AI Employees Deployed` with `Cumulative, all learners`. An SVG `viewBox 0 0 600 200` with `preserveAspectRatio="none"` holds grid lines at 25/50/75% (`--line-default`), an area fill (action tint) and a line (`--action-primary`, 2 px, non-scaling stroke). Day labels run underneath.
  - `Live Activity` feed (flex 1, max-height 280, scrolling): a dot colored by tone, `**who** what`, and a relative time.
- **Row 3**:
  - `Build Funnel by AI Employee`: a legend (Deployed, In Progress, Not Started), then rows with a 170 px label (icon, short name, `Team` tag), a 10 px stacked bar (`--status-success` | `--status-progress` | `--track`) and `{pct} · {d} of {n}`.
  - `Live Attendance`: bars for S1–S6, height 150. Held sessions are solid `--action-primary`; future ones are dashed outlines labeled with the date. Footer: `Replay Views: S1 312 · S2 188`.
- **Needs Attention** list: `No build progress or inactive for 5+ days`, with `Nudge All`. Each row shows a 30 px avatar, name, sub, a reason (amber) and `Send Nudge` (which becomes `Nudged {relative}`).

### 4.2 Curriculum `/admin/curriculum`
Ref: `Admin Curriculum.dc.html`.

- H1 `Curriculum`. Sub: `{n} AI Employees · {n} in Agent Tier, all in Team Tier · {n} draft`. Primary `New AI Employee`.
- Table, min-width 1080, columns `64px minmax(260px,2.4fr) 190px 180px 150px 120px 200px`, headers `Order · AI Employee · Tier Access · Live Session · Status · Deployed · Actions`.
  - Order: the number plus up and down chevrons (disabled at the ends).
  - AI Employee: a 36 px icon tile, name 14/500 and the outcome line, ellipsized.
  - Tier Access: segmented `Agent + Team | Team Only`. Team Only uses an amber active state.
  - Live Session: `Session 1 · The Autonomous Agent` with `{date} · Replay Ready` or the time.
  - Status: a token (Published success, Scheduled progress, Draft neutral) with a sub line (`6 steps · 3 files`, `Opens Dec 14`, `Hidden from learners`).
  - Deployed: a 5 px bar and a percentage.
  - Actions:
    - `eye`: preview as a learner by switching to the matching persona. Fixture and demo modes only; in production it opens the portal route in a new tab.
    - `pencil`: opens the builder.
    - `Publish`, `Publish Now` (scheduled) or `Unpublish` (secondary).
- Footer note 13 tertiary: `Tier access and publish status update the learner portal immediately. Open the portal in a second tab to watch it change.`

### 4.3 Module Builder `/admin/curriculum/new` and `/admin/curriculum/:id`
Ref: `Admin Module Builder.dc.html`.

**Sticky top bar** (top 0, `color-mix(in oklch, var(--bg-canvas) 92%, transparent)` with backdrop blur 10 px). From left to right:
- A back icon button.
- The title 16/600.
- A status token: Draft, Scheduled or Published.
- Save state 12: `Unsaved changes` (amber), `Saved {relative}`, `All changes saved`, or `Not saved yet`.
- `Delete Draft` (destructive; saved drafts only).
- `Save Draft` (or `Save` when not a draft).
- Primary `Publish` (or `Update Live Module`).

**Left column** (flex 1.2) of form cards, in order:
1. **Basics**:
   - `Name`
   - `Sidebar Label`
   - `Outcome Line` with helper `Input → outputs. Shown under the title and on the card.`
   - `Outcome Headline` with helper `Used in the locked preview and on the Team tier page.`
   - `For` with helper `Completes “For …” in the metadata line.`
   - `Icon`: a grid of the 12 `MODULE_ICONS` as 34 px toggles.
   - `Tier Access`: segmented, with a note.
2. **Outputs**: exactly 3 numbered inputs, with helper `Three bullets for the locked preview and Team tier page`.
3. **Live Session & Replay**: `Linked Session (Applies to Every Cohort)` select (`Self-Paced (No Live Session)` and Sessions 1–6), a clash warning, and a replay status box with upload button.
4. **Build Steps**: `Six steps · each one is a chapter in the replay · {total} min total`. Six fixed rows; you cannot add or remove steps, only reorder them. Each row has up/down, the number, title, hint, `Chapter`, `Replay At` (mm:ss) and `Minutes`.
5. **System Prompt**: a mono textarea (min-height 280), stats, and `Variables Learners Fill In:` chips. The empty-state text is `None yet. Wrap a placeholder in double braces, like {{TEAM_NAME}}.`
6. **Skill Files & Assets**: file rows with remove, and a dashed drop zone `Drop JSON or YAML skill files, or a Notion export`.
7. **Deployment**: `Platform`, `Run Button Label`, `Instructor Notes`.
8. **Publishing**: three choice cards, `Draft` (Hidden from learners), `Scheduled` (Visible as “Opens …”) and `Published` (Available now). Scheduled adds an `Opens On` date input followed by `at 9:00 AM CT`.

**Right column** (sticky top 76, flex 1):
- `Live Learner Preview`, with two segmented controls: `Card | Locked Preview | Detail Header` and `Agent | Team`.
- The preview sits on a dotted canvas (`radial-gradient(var(--line-default) 1px, transparent 1px)` at 16 px, `--bg-sunken`) and renders the *real* `EmployeeCard`, `LockedEmployeePreview` or a header mock from the unsaved draft.
- Link `Open in Learner Portal ↗`. For drafts it shows the toast `Publish first. Drafts are hidden from learners.`

**Validation.** Errors show in an attention alert at the top of the left column.
- Always: `Give the AI Employee a name.`
- When publishing:
  - `Add the outcome line. Learners see it under the title.`
  - `Add all three outputs.`
  - `The system prompt is too short to publish.` (under 40 characters)
  - `Give all six build steps a title.`

On save, step ids are renumbered `c1…c6`, `build` is set to the sum of the step minutes, and `short` defaults to the name minus ` AI Employee`.

### 4.4 Cohorts & Sessions `/admin/cohorts`
Ref: `Admin Cohorts.dc.html`.

- H1 `Cohorts & Sessions`. Sub: `Each cohort runs the same six live builds on its own schedule and roster.`
- **Cohort cards**, grid `auto-fill minmax(260px, 1fr)`. Selecting a card gives it an action border and tint. Each card shows:
  - The name 16/600 and a status token (`Live`, `Enrolling`, `Draft` or `Completed`).
  - `{Dec 1 – Jan 8} · Tue & Thu · 1:00 PM CT`.
  - An enrollment bar with `{enrolled} / {capacity}`.
- A dashed `New Cohort` card creates a draft cohort. Its start is the first Tuesday at least 63 days after the last cohort's start, and it gets 6 sessions at day offsets `[0, 2, 7, 9, 14, 16]`, 13:00 CT, 75 min.
- **Schedule card** for the selected cohort: `{name} Schedule` plus a status note, and an `Open Enrollment` button for drafts.
  - Table, min-width 1060, columns `40px minmax(240px,2fr) 170px minmax(170px,1.2fr) 150px 110px 230px`, headers `# · Session · Date & Time · Zoom · Status · Attendance · Actions`.
  - Zoom: a mono link that copies on click.
  - Primary action by state:
    - Next session: `Go Live` (success fill)
    - Live: `End Session`
    - Processing: `Publish Replay`
  - `Edit` (secondary, pencil) on every row.
- **Edit drawer** (440): `Edit Session {n}` with `{cohort} · Changes Appear in the Portal Immediately`.
  - Fields: `Title`, `Date`, `Start Time (CT)`, `Duration (Minutes)`, `Zoom Link`.
  - Info box: `Learners with reminders on get the updated time and link automatically. The dashboard countdown updates as soon as you save.`
  - Footer: `Cancel` and `Save Session`.

### 4.5 Learners & Teams `/admin/learners`
Ref: `Admin Learners.dc.html`.

- H1 `Learners & Teams`. Sub: `December 2026 Cohort · seat and progress data syncs from the portal`. Action `Export Roster`.
- **Stats** (4 cards): `Total Learners`, `Agent Tier`, `Team Tier Seats`, `Pending Invites` (amber when non-zero).
- **Controls**: segmented `Learners | Teams`. In the Learners tab, add a tier filter `All Tiers | Agent | Team` and a search field (`Search name, email or team`).
- **Learners table**, min-width 1000, columns `minmax(240px,2fr) 110px minmax(160px,1.3fr) 170px 120px 120px 30px`, headers `Learner · Tier · Team · Role · AI Employees · Last Active · Status`.
  - Demo persona rows get `--bg-sunken`.
  - Status is `Active`, `At Risk` or `Invited`.
  - Footer: `Showing {n} of {total} learners.`
- **Teams table**, min-width 860: `Team · Owner · Seats · Deployed · Pending Invites`.
- **Learner drawer** (440): facts (`Tier`, `Team`, `Joined`, `Last Active`) and `Build Progress` rows. Locked employees show an access token; others show build plus runtime tokens.
  - Footer: `Upgrade to Team Tier` (amber primary) or `Move to Agent Tier` (secondary), plus `Send Nudge` / `Resend Invite`.

### 4.6 Resource Vault manager `/admin/vault`
Ref: `Admin Vault.dc.html`.

- H1 `Resource Vault`. Sub: `{n} published · {n} in the Executive Build Vault · {n} downloads`. Primary `Upload Resource`.
- Segmented `All | Library | Executive Vault`.
- Table, min-width 1080: `Resource · Category · Type · Access · Downloads · Updated · Status`.
  - Access is a pill button that toggles `Agent + Team` / `Team only` (lowercase “only” in the pill, as the reference renders it). Executive items show the toast `Executive Vault items are Team only` instead.
  - Status is a switch between `Published` and `Hidden`; hidden rows render at 55% opacity.
  - Each row has a delete icon.
- **Upload drawer** (460):
  - A file drop zone. Before a file: `Drop a file or click to browse` with `JSON, PDF, Markdown or Notion export · up to 25 MB`. After: the file name with `Ready to publish · click to replace`.
  - Fields: `Title`, `Description`, `Category` (4 library + 3 `Exec · …`), `Type`, and `Access`. Access is forced to Team for executive categories, with the note `Executive categories are always Team only.`
  - Errors: `Add a title.` and `Attach a file first.`
  - Footer: `Cancel` and `Publish to Vault`.

### 4.7 Announcements `/admin/announcements`
Ref: `Admin Announcements.dc.html`.

- H1 `Announcements`. Sub: `In-app banners and email for the December 2026 Cohort, plus automated reminders.`
- **Composer** (flex 1.4): `New Announcement`, with `Title`, `Message`, then a wrapping row of controls:
  - `Audience` segmented: `All Learners | Agent Tier | Team Tier | Team Owners`, with `Reaches {n} learners` below.
  - `Channels` checkbox buttons: `In-App Banner`, `Email`.
  - `Severity`: `Info | Warning`.
  - `Action Button`: `None | Update Calendar | Open Sessions`.
  - `When`: `Send Now | Schedule`, plus a `datetime-local` input when scheduling.
- **Banner Preview**: the real `AnnouncementBanner` rendered from the form, at 40% opacity when in-app is off.
- Errors: `Add a title and a message.` and `Pick at least one channel.`
- Primary button `Send Now` or `Schedule`.
- **Automated Reminders** card: `Sent for every cohort on its own schedule`, then 5 rows, each with a label, `{channel} · On/Off` and a switch.
- **History** table: `Announcement · Audience · Channels · Status · Date · Opened`.

### 4.8 Tiers & Upgrades `/admin/tiers`
Ref: `Admin Tiers.dc.html`.

- H1 `Tiers & Upgrades`. Sub: `December 2026 Cohort revenue {$} · {n} Agent licenses · {n} teams`.
- **Tier cards**, grid `auto-fit minmax(340px, 1fr)`. Each card shows:
  - `{Name} Tier`, seats, and a license count.
  - The price as an editable number input (44 high, 24/600) with a per-unit note.
  - The blurb, the features, and `Cohort Revenue`.
  - The Team card gets an action-line border.
- **Access Matrix**: `Click an Agent cell to include or gate a module`. Columns `Included · Agent · Team`; rows are the employees plus 5 fixed features. Clicking an Agent cell on an employee row toggles its tier.
- **Upgrade Requests**: `From locked modules and the Executive Vault in the portal`, with `{n} open · {$} potential` on the right.
  - Rows are ordered new → contacted → converted → closed.
  - Each row has a status token and actions: `Mark Contacted`, `Convert to Team` (amber; runs `upgradeUser`) and `Close`.
  - Empty state: `No requests yet.`

### 4.9 Staff & Roles `/admin/staff`
Ref: `Admin Staff.dc.html`.

- H1 `Staff & Roles`. Sub: `Who can build, publish and manage the program.`
- **Team Members** card:
  - Header row with an email input, a role select (`Admin`, `Instructor`, `Content Editor`, `Support`) and the primary `Invite Staff`.
  - Errors: `Enter a valid email address.` and `That person is already on staff.`
  - Rows: avatar, name (`(you)`), email, activity, a role select (disabled for Owner) and remove. Removing the Owner shows the toast `The owner can’t be removed`.
- **Permissions** matrix, min-width 760: `Owner Permissions Are Fixed`. Rows are the 8 `PERMS`; columns are the 5 `STAFF_ROLES`, each cell a 22 px checkbox. The Owner column is fixed at 60% opacity.
- In production these permissions are **enforced by the API**. See phase 07.

---

## 5. Product components (exact contracts)

All live in `apps/web/src/components/`. Each has a matching reference file and appears on `/__states`.

### 5.1 StatusToken
Ref: `Status Token.dc.html`.

Props: `kind: 'access'|'build'|'runtime'|'step'|'custom'`, `state`, `n`, `total = 6`, `compact`, `size: 'sm'|'md'`, `label?`, `tone?`, `icon?`, `title?`, `loading?`.
- Pill sizes: sm is height 22 with padding `0 8 0 6`; md is height 26 with padding `0 10 0 8`. Radius 999, 1 px border in the tone's `-line`, background the tone's `-bg`, text the tone's `-text`.
- Type 12/500 (md 13), tabular numerals, gap 5. Icon is 13 px (md 14) in a 16 viewBox, stroke 1.5.
- Compact: height 16, no padding, background or border, gap 4. Neutral tone uses `--text-tertiary` and shows the short label.
- Labels and icons:

| kind.state | Label (compact) | Tone | Icon |
|---|---|---|---|
| access.included | Included | neutral | check |
| access.locked | Team Tier | locked | lock |
| build.not_started | Not Started (`0/6`) | neutral | ring |
| build.in_progress | `{n} of {total} Steps` (`{n}/{total}`) | progress | pie (n/total) |
| build.verified | Built | success | check |
| runtime.deployed | Deployed | success | signal |
| runtime.paused | Paused | neutral | pause |
| runtime.needs_attention | Needs Attention | attention | alert |
| runtime.not_deployed | Not Deployed | neutral | minus |
| step.verified / other | Verified / Not Verified | success / neutral | check / ring |
| custom, tone `live` | {label} | success | 7 px pulsing dot (`ai-pulse 1.6s`) instead of icon |

- Default tooltips:
  - build in progress: `In progress · {n} of {total} steps verified`
  - built: `Built · all {total} steps verified`
  - not started: `Not started · 0 of {total} steps verified`
- Copy the 16 px glyph paths verbatim from the reference `IC` map, including the pie arc math.

### 5.2 NavItem
Specified in §2.1. Props: `label, icon, active, locked, disabled, depth: 0|1, collapsed, token?, badge?, badgeTitle?, chev?: 'open'|'closed', title, busy, onClick`.
- Loading state: a 32 px skeleton row.
- Locked and disabled rows set `aria-disabled` and do not fire `onClick` when disabled.

### 5.3 JoinButton
Ref: `Join Button.dc.html`.

Props: `mode: 'disabled'|'ready'|'live'|'loading'`, `hint`, `url`, `size: 'md'|'lg'`, `stack`, `onJoin`.
- Label: `Join Session` (ready), `Join Now` (live), `Opening Zoom…` (loading, with a spinner), with a `video` icon otherwise.
- Disabled: secondary fill, `--text-disabled`, `aria-disabled`, `pointer-events: none`, and the hint `Opens 15 Min Before` shown as 12 tertiary text (beside it, or below when `stack`).
- **It is the only element anywhere that links to Zoom.**
- `joinMode(session, now)`: `live` while live; `ready` from 15 minutes before start; otherwise `disabled`.
- SessionCard shows `loading` for 900 ms before calling `onJoin`.

### 5.4 SessionCard
Ref: `Session Card.dc.html`. View-model: `sessionVM(db, session, variant, now)`.

- Card: radius 14, padding 20px 24px, `--shadow-xs`, a wrapping flex row with gap 20×28.
- Left column (`flex: 1 1 320px`):
  - Kicker 14/600 secondary: `Next Live Session`, `Starting Soon`, `Live Now`, `Session Ended` or `Replay Ready`. Live adds a `LIVE` badge before it (12/700, letter-spacing .06em, success tint, pulsing dot) and `{mm:ss} Elapsed` (mono 13) after it.
  - Title 20/600 `Session {n} · {title}`.
  - Meta 13 tertiary: `{employee} · {when} · {mins} Min with {instructor}`.
  - Optional note 13 secondary with a clock or check icon.
- Countdown (`scheduled` and `starting_soon` only): `role="timer" aria-live="off" aria-label="{aria}"`, made of tiles at least 58 wide, radius 10, `--bg-sunken`.
  - Each tile: digits mono 20/500, then the unit 12 tertiary (`Days`, `Hours`, `Min`, `Sec`, singular when 1).
  - Days show only when > 0, hours only when days or hours > 0, and **seconds only when ≤ 1 hour remains**.
  - A visually hidden `aria-live="polite"` span renders `vm.aria`, which changes only at hour, 10-minute and 1-minute boundaries (`Starts in 2 days 2 hours`, `Starts within 20 minutes`, `Starts within 3 minutes`, `Starts within 1 minute`).
- Actions by variant:

| Variant | Rule | Primary | Also |
|---|---|---|---|
| scheduled | > 15 min out (shown when > 24 h on the States sheet) | `Add to Calendar ▾` menu: Google Calendar (New tab), Outlook (New tab), Apple or Other (.ics file) | Join Button disabled, with the hint |
| starting_soon | ≤ 15 min | Join Button (ready) | countdown with seconds |
| live | live | Join Button (live) | `LIVE` badge and elapsed time |
| ended_processing | ended < 12 h ago, replay processing | secondary `Open the Build Kit` | note `Replay processing · usually within 2 hours` |
| replay_ready | ended < 12 h ago, replay ready | primary `Watch Replay` | note `Chapters and a searchable transcript are up.` |

### 5.5 EmployeeCard
Ref: `Employee Card.dc.html`. View-model: `cardVM(db, user, employee, now)`.

- Container: `role="button"`, `tabIndex=0`. Enter or Space opens it. Full height, padding 18, radius 14, gap 14, border `--line-default`.
- Hover: border `--line-strong`, `--shadow-card`, `translateY(-1px)`, 150ms. Focus: a 3 px ring.
- Layout, top to bottom:
  - Row: a 38 px icon tile and a token. The token is access locked, or `Opens {date}` with a clock, or the build token.
  - Name 16/600 and the outcome 13/1.45 secondary, clamped to 2 lines.
  - Pushed to the bottom (`margin-top: auto`):
    - Six progress segments of 4 px with gap 3. Hidden when locked or scheduled.
    - Meta 12 tertiary: `{Session N · Replay Ready | Live Now | Replay Processing | Dec 9}` or `Self-Paced`, then `{mins} Min Build`.
    - Divider, then the CTA (height 32, 13/600, arrow icon): `Start Build`, `Continue Build`, `Open`, `Preview` or `View Details`. It is primary only while the employee is open, included and not yet built.
- Forced states for the States sheet: hover, focus, disabled (55% opacity, no pointer), loading (skeleton at the same size).

### 5.6 AnnouncementBanner
Ref: `Announcement Banner.dc.html`.

Props: `severity: 'info'|'warning'`, `title`, `body?`, `when`, `abs`, `actionLabel?`, `onAction`, `onDismiss`.
- Container: padding `12 12 12 14`, radius 12, gap 12.
- Warning: `role="alert"`, `--status-attention-bg` and `-line`, an `alert` icon in `--status-attention`.
- Info: `role="status"`, `--bg-surface` with `--line-default`, a megaphone icon in `--action-primary`.
- Title 14/600, then `when` 12 tertiary (with `abs` as its tooltip), then an optional body 13 secondary on its own line.
- Optional secondary action button (30 high). Dismiss is a 30 px icon button (`aria-label="Dismiss"`). Dismissal is stored per user.

### 5.7 LockedEmployeePreview
Ref: `Locked Employee Preview.dc.html`.

- `role="dialog" aria-modal="true"`, radius 16, `--bg-raised`, `--shadow-pop`.
- Top bar:
  - A `role="tablist"` segmented control with one tab per locked employee (`short` labels) and `aria-selected`.
  - A close button.
- Body, padding 24:
  - A 42 px amber icon tile and an access token labeled `Included in Team Tier`.
  - The headline 20/600.
  - `{name} · {Session N · Thu, Dec 10}` 13 tertiary.
  - 3 outputs (14 secondary, with success checks).
- Footer:
  - The note `Your Agent tier progress carries over.` (12 tertiary).
  - A 38 px primary `See Team Tier →`.

---

## 6. `/__states` (component contract sheet)

Ref: `States.dc.html`. Build this route exactly. It is the Phase 03 compliance target and must stay in the app (enabled when `VITE_ENABLE_STATES=true` and in dev).

1. Header `States` with a Light/Dark segmented control.
2. **Next Live Session · Five Variants**: five 520 px columns, each labeled with the mono variant id and its rule. Each renders `SessionCard` with `sessionVM(seed, Session 3, variant, variantNow(Session 3, variant, 0))`.
3. **Components × States**: a grid of `150px repeat(5, 300px)` with columns `Default | Hover | Focus | Disabled | Loading` and rows `Nav Item`, `Status Token`, `Join Button`, `Employee Card` (Sales for Jamie at Week 2).
4. **Nav Item Variants**: Active, Group with included count, Child in progress, Child built, Child locked, and Icon rail (collapsed).
5. **Status Token Catalog**: rows Access, Build, Build · compact, Runtime and Step, each token captioned with its mono `kind.state` code.
6. **Announcement Banner**: a warning and an info example.

Components accept a `force` prop (`'hover'|'focus'|'disabled'|'loading'`) that renders the state statically. It is used only by this sheet.

---

## 7. Copy and time rules

- **Title Case** applies to labels, buttons, nav, tabs, headers, field labels, tokens and chapter names. **Sentence case** applies to descriptions, hints written as sentences, toasts and tooltips.
- The vocabulary is fixed: AI Employee, Session, Step, Built, Deployed. Never use "installed", "module completed" or "lesson".
- **Time**: always use `fmt.time` / `fmt.when` from `packages/core`.
  - The viewer's zone comes first and the program zone (CT) follows in parentheses, e.g. `2:00 PM ET (1:00 PM CT)`. CT viewers see only `1:00 PM CT`.
  - Past events use relative time (`fmt.ago`, or `fmt.agoInline` mid-sentence) with the absolute time (`fmt.abs`) in a `title` attribute.
- **Money**: `fmt.money` gives `$4,995`. **Numbers**: `fmt.num`, with tabular numerals wherever digits update.

---

## 8. Public pages (outside the reference)

Pages a human approved after the handoff, recorded in `DECISIONS.md`. They are not in `reference/`, so no parity scenario or golden covers them; their copy source and their tests are named here instead. They use the same tokens, type scale and patterns as §1.

### 8.1 AI 101 kit page `/ai101`
Approved in D-028. Copy and both prompts: `apps/web/src/ai101/content.ts`, the only file to edit when they change. Tests: `apps/web/src/ai101/{render,main}.test.ts` and `apps/api/test/ai101.test.ts`.

- **Route.** Public, no session, served by the API as one self-contained HTML response at `https://learn.amplifiedimpact.io/ai101`. `/AI101`, `/ai-101` and `/ai101/` answer 301 to `/ai101` with the query string kept. `?src=` is attribution only and never changes the page.
- **Outside the app shell.** Of the required landmarks only `main` exists, holding a `nav[aria-label="On this page"]` for the jump links: no `aside[aria-label="Primary"]`, no header breadcrumb, no demo controls. `body[data-app-ready="true"]` is static. One `h1`; sections are `h2`, sub-blocks `h3`. Light theme only.
- **Order.** Header (eyebrow, H1, subhead, jump links) → `#voice-profile` → `#carousel-creator` → `#four-things` → `#sprint` → `#waitlist`.
- **Behaviour.** Each prompt block's `Copy prompt` button copies the plain prompt and reads `Copied` for 2 s, announced in a polite live region; `[placeholders]` are highlighted on screen only. The setup checklist persists in `localStorage` under `ai101-checklist`. The waitlist form posts to `POST /api/ai101/waitlist` and shows `You're on the list.` inline. Everything except copying and the checklist's persistence works without JavaScript.
