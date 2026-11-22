# The admin sidebar: six rows, one open, and a collapse that travels

Build spec for Claude Code. This is **R-4** in `handoff/lms-v3/IMPLEMENTATION-SPEC.md` ("Still to build"), plus the
admin half of **R-2** (§2 here). Decision to write: **D-236**. Written against `main` @ `e57c34d`.

**Approval.** Connor, Nov 21, 2026, about the live sidebar: "it's just really overwhelming to me to see everything
listed out like that." About this design, Nov 22: "Much much better!" He then asked for two changes, both made and
in the mockup: the Accelerator's tile centred in the rail, and the collapse in motion "like we've done on the learner
portal."

**The design is the mockup.** Open `handoff/admin-mockup/dist/index.html`. The black bar's **Sidebar: today /
proposed** switch shows the live sidebar and this one. `proposed` is what you build. The widths `1440`, `1280`,
`1024` and `390` show the full sidebar, the automatic rail and the phone's drawer. Where this file and the mockup
disagree, the mockup wins: stop and say so.

The source is `handoff/admin-mockup/AdminMock.jsx` (component `Sidebar`, and the CSS blocks named in §6).
`build_admin.py` in the same folder lists every edit made to `design-reference/admin-redesign-r2/AdminRedesign.jsx`
to produce it, each as a before and after string. The sidebar's edits are the three blocks commented "logos",
"the sidebar proposal" and "collapsing and opening in motion".

---

## 1. What changes, and what doesn't

| Changes | Stays exactly as it is |
|---|---|
| A group is a row with its icon, name, a count when something is waiting, and a chevron | The six groups, their order, their pages, each page's address and capability (`R2_NAV`) |
| Only one group is open: the one you are in, or the one you clicked | The rail's content: one icon per group with a fly-out of its pages |
| A group's pages are plain words on a guide line. No icon per page | The phone's drawer (it gets the same rows; no rail, no travel) |
| The collapse and the expand travel | The 244 px and 64 px widths, the 768 and 1200 px bands, `railChoice` |
| The rail's logo is the lockup cut to "ai"; the switcher's tile is the program's own logo (§2) | The top bar, the ⌘K palette, the crumbs, the profile button, every page |

**Not in this work:** moving Overview out of Health, or any other regrouping. Forms & Submissions has no row yet.
The Community row arrives with R-3.

---

## 2. The two logos (the admin half of R-2)

1. **The lockup.** The sidebar's logo is the brand file `amplified-impact-academy-app.svg` at **161×34**, as an
   image (the reversed file on a dark page, as `Wordmark` picks today). It replaces the "amplified impact" wordmark
   in `shell/admin/Wordmark.tsx`. **One image in both layouts.** The rail shows it through a **26 px** window: its
   "ai". At 161×34 the "ai" ends at 25.8 px and "academy" begins at 29.6 px. Never a second file for the rail, never
   a cropped copy, never the favicon drawing.
2. **The program's tile.** The cohort switcher's tile is the program's own logo, not its initials:
   `programLogo(key, { variant: 'tile', size: 32, title: '' })` from `apps/web/src/home/program-logo.ts` (36 on the
   phone). A tile is never drawn under 32 px (that file's own rule), so the tile grows from 24 to 32; the switcher's
   44 px height holds it without changing. `AdminShellData` gains the program's key (`'accelerator'` today) beside
   its name. The tile keeps its own colours in both themes.
3. **In the rail the tile is centred** on the same line as the "ai", the group icons, the toggle and the avatar:
   every one of them has its centre 31.5 px from the sidebar's left edge.

---

## 3. Six rows, one open

**The group row** (`button`, `aria-expanded`): the group's icon (`GROUP_ICON`, 16 px), its name, then on the right
the roll-up if there is one, then a 12 px chevron that turns 90° when the group is open.

**Which group is open.** One at most.
- Arriving on a page, the group that holds it is open.
- Clicking a closed group opens it and closes the other. Nothing navigates.
- Clicking the open group closes it. Then none is open.
- Going to any page resets this: that page's group is the open one.
- This is view state for the session. It replaces `DEFAULT_OPEN`, the stored open map (`loadNavGroups`,
  `saveNavGroups`) and `toggleGroup`. Leave anything already stored where it is, unread.

**Where you are.** The current page's row has the tint and forest text (`aria-current="page"`). Its group's name and
icon are forest. If that group is closed, the group row takes the tint instead.

**The pages** sit under the group on a 1 px guide line that drops from the centre of the group's icon. Each is its
label and, when it has one, its count pill. No icon. A closed group's pages are not reachable by keyboard.

**The roll-up** on a closed group says what is waiting inside it. It is the first of the group's rows that has a
count, in the group's order. Nothing waiting, nothing shown. An open group shows none: its rows carry their own.

| Count (`NavCounts`) | On the page's row | On the closed group |
|---|---|---|
| `drafts` | "6 draft" (as today) | "6 draft" |
| `requests` | "2 requests" (today: "2") | "2 requests" |
| `incidents` | "1 incident" / "3 incidents", in the alert colour (today: "1") | the same, in the alert colour (today's `alert`) |
| `waiting` (**new**, from R-3: Community threads whose last word is a member's) | "3 waiting" | "3 waiting" |

Until R-3 is merged, `waiting` is 0 and nothing shows.

**The model** (`shell/admin/adminNav.ts`): `adminNav()` takes `peek: R2Group | null | undefined` in place of `open`
(`undefined`: the active group; `null`: none; a group: that one). `AdminNavGroup` keeps `open` and gains
`roll?: { text: string; alert: boolean }` in place of `alert`. A row's `badge` becomes the text in the table above.
Pure, as it is today. `Sidebar.tsx` renders it; `AdminShell.tsx` holds `peek` and clears it when the path changes.

---

## 4. The collapse and the expand travel

The same move as the learner sidebar (IMPLEMENTATION-SPEC B-43), on the brand's tokens, which the repo already has
(`apps/web/src/components/motion/ai-motion.css`: `--aim-dur-quick` 160 ms, `--aim-dur-base` 240 ms,
`--aim-dur-move` 380 ms, `--aim-dur-spring` 560 ms, `--aim-ease`, `--aim-ease-spring`). **No duration or curve is a
number in the component.** Read them from the tokens, in CSS and in the script.

Three separate things, so the width and the layout can change at different moments: the column's **width** (64 or
244), the **layout** (rail or full), and **travelling** (collapsing, expanding, or not).

**Closing**, one overlapping move:
1. At the click the column starts narrowing (`--aim-dur-move`, `--aim-ease`), and on the same curve the logo's window
   closes from 161 to 26 px and slides 2.5 px to the rail's centre line.
2. For the first `--aim-dur-quick` the full layout stays. Its words fade out: group names, roll-ups, chevrons, the
   open group's pages, the switcher's two lines and its arrows, "Collapse sidebar", the name and role. The switcher's
   border and fill fade with them, and so does the tint on the current row.
3. Then the layout becomes the rail, and five kinds of thing glide from where they were to their place there
   (`--aim-dur-base`, `--aim-ease`): the program tile, each group's icon, the toggle's icon, the avatar. They arrive
   as the edge does.

**Opening:**
1. At the click the layout becomes full at once, behind the edge. The same things glide back out
   (`--aim-dur-move`, `--aim-ease`, no overshoot), and the logo's window opens to 161 px on that curve.
2. The words fade in (`--aim-dur-base`), and the switcher's border and fill with them.
3. The column springs open (`--aim-dur-spring`, `--aim-ease-spring`: a panel arriving).

**The glide is FLIP.** Before the layout changes, measure each mover; after, measure again and animate
`transform: translate(dx, dy)` to none with the Web Animations API. Match movers by identity, not by position: the
tile, each group by its name, the toggle, the avatar (`data-fl` in the mockup). So a group's icon must be the same
logical element in both layouts.

**Rules.**
- **Only a click on the toggle travels.** A resize across 768 or 1200 px, the phone's drawer, and
  `prefers-reduced-motion: reduce` switch at once.
- **A second click part-way turns it round** and lands cleanly. Clear both timers and start the other way.
- While travelling, each layout keeps its own width whatever the column is doing (full: 243 px minimum; rail: 63 px
  maximum), and the column clips it. So nothing re-wraps or drifts on the way.
- **Clip the sidebar only while it travels.** At rest it must not clip: the rail's fly-out menus open outside it.
- The main column re-flows as the sidebar's width changes. That is intended.
- Focus stays on the toggle across the change.

---

## 5. Measurements

From the mockup's stylesheet. `--c` is the admin's control height (32 px; 44 on the phone), `--cp` 36 px (48),
`--t` the text size (14 px; 16).

| Thing | Value |
|---|---|
| Group row | height `--cp`; padding 0 8 px; gap 10 px; radius 8 px; `calc(--t − 1px)` / 500; ink. Its icon `--f2`. Hover: `--sub`. Holding the current page: forest text and icon; closed as well: `--tint` fill. 2 px above each |
| Roll-up | 12 px / 400, `--f3`, pushed right. Alert: `--bad`, 500. The chevron follows it at 8 px |
| Chevron | 12 px, `--f3`; turns 90° over 200 ms |
| Pages block | 2 px above, 6 px below; 15.5 px from the row's left edge to a 1 px `--line` guide; 10 px from the guide to the rows; 1 px between rows |
| Page row | height `calc(--c − 2px)` (`--c` on the phone); padding 0 8 px; radius 7 px; `calc(--t − 1px)` / 400, `--f2`. Hover: `--sub`, ink. Current: `--tint`, forest, 500 |
| Count pill on a page row | as today's `.count`; incidents in `--bad` on `--badb` |
| Opening and closing a group | the pages block's height, 200 ms ease (grid rows 0fr to 1fr), hidden from the keyboard and screen readers while shut. Reduced motion: at once |
| Nav padding | 6 px 8 px 16 px |
| Logo | 161×34; top bar padding stays 0 16 px in the rail; window 26 px wide, 2.5 px right of its open position |
| Switcher, full | margin 0 8 px 8 px on both sides (as production; the old mockup lost its left margin); tile 32 px |
| Switcher, rail | no border, no padding, 36 px wide, centred; tile 32 px |

---

## 6. Where it goes

| File | What |
|---|---|
| `apps/web/src/shell/admin/adminNav.ts` (+ test) | `peek`, `roll`, the badge texts, `waiting` in `NavCounts` (§3). Remove `DEFAULT_OPEN`, `isGroupOpen`, `toggleGroup`. |
| `apps/web/src/shell/admin/Sidebar.tsx`, `AdminShell.module.css` | The group row and pages (mockup CSS block "the sidebar proposal": `.gx`, `.gw`, `.gwi`, `.gkids`, `.gk`), the travel (block "collapsing and opening": `.nar`, `.a-collapsing`, `.a-expanding`, `.fl`, `sbfade`, `sbbox`), the logo window (`.wm`, `.wm-ai`), the tile and switcher rules. Module class names are yours; the values are the mockup's. |
| `apps/web/src/shell/admin/AdminShell.tsx` (+ test) | Holds `peek`; clears it on a path change; tells the sidebar a toggle was by hand. Stops reading and writing the stored groups. |
| `apps/web/src/shell/admin/Wordmark.tsx` | The academy app lockup as an image, light and reversed; `short` is the 26 px window, not a second drawing. |
| `apps/web/src/data/admin-shell.ts` | The program's key for the tile. |
| `design-reference/admin-redesign-r2/AdminRedesign.jsx` and `ref/` | The reference's `Sidebar` becomes this one (the three blocks in `build_admin.py`, without the today/proposed switch), and the refs are rendered again (`pnpm parity:admin-r2:refs`). **By entry D-236, never by editing results.** Every admin ref shows the sidebar, so every ref changes: say so in the PR and attach before and after for one screen. |

`AdminMock.jsx` also carries new screens and sample data that are **not** part of this work. Take only the sidebar.

---

## 7. Tests

- `adminNav.test.ts`: the open group for a path; `peek` a group, the same group again, `null`; a role that can't
  open a group doesn't get it; each roll-up text; no roll-up on an open group; `waiting` at 0 shows nothing.
- `AdminShell.test.tsx`: one group open at a time; a closed group's pages are not focusable; `aria-expanded`,
  `aria-current`; the rail still gives one fly-out per group; the phone's drawer has the same rows and no toggle.
- The travel can't be asserted frame by frame. Assert where it **lands**: collapse, expand, a second click at 60 ms
  and at 260 ms of a collapse and at 150 ms of an expand, three quick clicks. After each: the classes or attributes
  at rest, 64 or 244 px, the logo's window 26 or 161 px, no animation still running. With reduced motion: at rest
  60 ms after the click. A resize into the laptop band: at rest 80 ms later. Then open a fly-out in the rail and
  check it is drawn outside the sidebar.
- Then capture it slowed down, as the mockup was checked: set the four `--aim-dur-*` tokens to 8× on both pages and
  take frames at 40, 120, 180, 240, 320 and 460 ms of the collapse and at 40, 120, 240, 380, 500 and 720 ms of the
  expand. Put the app's beside the mockup's in the PR.
- The admin parity run (`pnpm parity:admin-r2`) against the re-rendered refs.
- axe on the full sidebar, the rail and the drawer: zero serious or critical.

## 8. Done when

1. On every admin page, at 1440, 1280, 1024 and 390, the sidebar matches the mockup's `proposed` sidebar: a
   screenshot of each beside the mockup's in the PR (on Overview; on Community once R-3 is in; with Operations
   opened by hand; with every group shut; the rail; a fly-out open; the drawer).
2. §7 passes.
3. D-236 is written, quoting Connor's words from the top of this file.
4. Nothing in §1's right-hand column changed.
