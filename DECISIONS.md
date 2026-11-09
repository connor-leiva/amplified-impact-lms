# DECISIONS.md

Approved deviations from the mockup. This file starts empty and **only grows with explicit human
approval**. Anything not listed here is a bug, not a decision.

Each entry records: what changed, why, who approved it, and the blast radius (which parity
scenarios, masks or tolerances it touches).

---

## D-001 · Goldens are captured locally until Docker is available

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/goldens/`, no product code

Gate 0 specifies that goldens come from the pinned Playwright container
(`mcr.microsoft.com/playwright:v1.63.0-noble`) via `pnpm compliance:docker compliance:capture`.
Docker is not installed on the build machine, so the initial golden set is captured with the
Windows Playwright build instead.

**Consequence.** The committed PNG goldens are **dev-only**: they give real pixel and fingerprint
feedback while building, but will not byte-match the Linux container because Chromium font
rasterization differs by platform. `compliance/goldens/PROVENANCE.txt` records which platform
produced the current set.

**Resolution.** The CI `goldens` job re-captures in the container on the first push. It will fail
once, by design, and uploads the container's capture as the `goldens-from-container` artifact
(its log says exactly this). Replace `compliance/goldens` with that artifact, set
`PROVENANCE.txt` to `platform: container`, and commit — the set is then authoritative and the job
stays green. The fingerprint JSON goldens are platform-independent and authoritative from the start.

**Correction, measured later.** An earlier run of four consecutive captures came out byte-identical,
and this entry originally claimed that as a property. It is not reliable. Measured properly, two
consecutive captures on this machine differ on ~6 of 98 PNGs, worst case 0.39% of pixels, in the
mobile, dark and drawer scenarios. Serializing the capture and quieting the machine both failed to
remove it, so it is host rasterization rather than contention. The drift is well inside the parity
tolerance (1%), so it does not affect whether the app matches the reference — but Gate 0’s
zero-diff re-capture cannot pass on this host, which is exactly why the gate specifies the
container. The .json fingerprints ARE byte-stable across every run.

**Not affected.** Tolerances are unchanged (`maxDiffPixelRatio: 0.01`, `threshold: 0.15`) and no
masks were added.

---

## D-002 · `.phase` gates the CI compliance job

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `.phase`, `.github/workflows/ci.yml`, no product code

`parity.spec.ts` selects scenarios by `gate <= GATE`. With `GATE` unset it defaults to 99, so a
fresh repository would run phase 03–06 scenarios against screens that do not exist yet and CI
would be red from the first commit.

A root `.phase` file records the highest shipped phase. CI reads it and passes it as `GATE`, so the
`compliance` job proves every scenario at or below the shipped phase and nothing above it. Bumping
`.phase` is part of shipping a phase, in the same PR as its gate.

**Consequence.** No tolerance, mask or scenario was changed. A shipped phase can never silently
regress: its scenarios run on every PR from then on.

---

## D-003 · Gate 1's token-count sanity check is 77, not “> 80”

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/tests/e2e/tokens.spec.ts`, no product code

`docs/phases/01-foundations.md` gives the token-parity test with
`expect(Object.keys(ref).length).toBeGreaterThan(80)`. The unmodified reference defines exactly
**77** `:root` custom properties. Measured three ways, all agreeing:

- parsing every `:root{…}` block in `design-reference/Status Token.dc.html` → 77
- parsing `handoff-starter/tokens.css` → 77, and the two name sets are identical (no extras on
  either side)
- reading `document.styleSheets` in headless Chromium on the live reference page → 77 whether
  `@media` rules are walked or not, with all 77 resolving to a non-empty computed value

So the published threshold cannot pass against the reference it is meant to measure. Its intent is
a guard against comparing two near-empty objects, so the assertion is `toBe(77)` — stricter than
the original, and it now also catches a *truncated* `tokens.css`, which `> 80` would have missed.

**Consequence.** No token was added, removed or renamed; `tokens.css` is the generated file
verbatim. The `app` vs `ref` deep-equality assertion, which is the real contract, is unchanged.
If a token is ever legitimately added to the reference, update this number in the same PR.

**Amended by D-031 (2026-10-07): the count is 75.** The rebrand removed `--accent-h` and
`--accent-c`, which existed only to parametrise the retired accent tweak. All three pins moved in the
same change, as this entry requires: `tokens.spec.ts`, `scripts/email-tokens.mjs` and
`apps/api/src/email/tokens.test.ts`.

---

## D-004 · Four injected-time signatures in `packages/core`

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `packages/core/src/{files,seed,time,mutations}.ts`, no UI, no copy

`docs/phases/02-core-domain.md` §2.1 requires core to be pure: *"Time is always passed in as an
epoch-ms `now` argument. Nothing in core calls `Date.now()`."* Four reference functions read the
clock or the RNG directly, so their signatures change. Each one is listed here because the
signature is part of the shared contract between the web app and the API.

| Reference | Port | Why |
|---|---|---|
| `ics(events)` — `Date.now()` for DTSTAMP | `ics(events, stamp = 0)` | The default still emits a well-formed `DTSTAMP:19700101T000000Z`, so the differential test's `DTSTAMP` strip matches on both sides. Call sites pass `clock.now()`. |
| `blankModule(order)` — `Date.now()` in the id | `blankModule(order, now)` | The id stays `'m' + now.toString(36)`, the reference's shape with time injected. |
| `zoneAbbr(z, t)` — falls back to `Date.now()` | `zoneAbbr(z, t = 0)` | Only reachable for a zone outside the `ABBR` map. Every entry in `ZONES` is in `ABBR`, so the fallback is unreachable from the UI; a hand-passed exotic zone with no `t` would resolve its abbreviation at the epoch rather than today, which can differ across a DST boundary. All call sites pass a real `t`. |
| `log(db, …)` — `Math.random()` in the activity id | module-private, deterministic hash of `who + what` | Required by the spec: *"Activity ids must be deterministic (no `Math.random`) so the oracle tests can compare."* Core does not export `log`. |

**Consequence.** No observable behavior changes. `seed()` is byte-identical to the reference and to
all three handoff fixtures, and the differential suite compares `ics`, `skillPreview` and `csv`
output directly.

---

## D-005 · CSS minification is off, so `tokens.css` ships verbatim

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `apps/web/vite.config.ts` (`build.cssMinify: false`), no source change

`CLAUDE.md` requires `apps/web/src/styles/tokens.css` to be *"generated and verbatim"*, and Gate 1
compares every resolved custom property against the reference. Vite 8 minifies CSS with
LightningCSS, which **rewrites the generated file**:

- numeric values lose their leading zero — `--accent-c: 0.08` became `.08`
- quoting is normalised — `--font-sans: 'Hanken Grotesk'` became `"Hanken Grotesk"`
- two properties are **invented** — `--lightningcss-light` and `--lightningcss-dark`, emitted for
  the `color-scheme` declarations, so the app exposed 75 `:root` properties against the
  reference's 73 at that point in the comparison

All three broke token parity on values that are not ours to change. Minification is therefore
disabled for CSS. The cost is a ~29 KB stylesheet instead of ~12 KB, which gzips to roughly the
same place; the phase 09 performance budget is on JS (250 KB gzip first load).

**Verified.** The built bundle now contains `tokens.css` byte-for-byte: `--accent-c:0.08`, single
quotes preserved, no `--lightningcss-*`. All six Gate 1 theme × accent × typeface combinations pass.

---

## D-006 · Compliance server ports are overridable, and their identity is verified

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/lib/{prepare,global-setup}.ts`, `compliance/playwright.config.ts`,
`apps/web/vite.config.ts`, `scripts/serve-reference.mjs`. No product code, no tolerance, no mask.

**The defect.** Playwright's `webServer.reuseExistingServer` only checks that *something* answers
on the port. Another project on this machine (`executive_dashboard`) holds port 4173 with its own
`vite preview`. The first Gate 1 run therefore never started our server and **executed the entire
suite against a different application**, reporting font and token diffs that had nothing to do with
this codebase. Nothing in the harness said "wrong server" — the failure was indistinguishable from
a genuine styling regression, which is exactly the kind of silent mis-measurement a parity harness
must not permit.

A second, related trap: on Windows `localhost` resolves to `::1` first, so an IPv4-only server and
an IPv6-only server can both "own" one port and which you reach depends on the client. During
diagnosis the two servers on 4173 returned *different applications* depending on whether the
request went to `127.0.0.1` or `localhost`.

**The fix, three parts:**
1. `REF_PORT` / `APP_PORT` environment overrides, so a local collision is sidestepped without
   stopping the other project: `APP_PORT=4273 pnpm compliance`. The defaults remain the handoff's
   4400 and 4173.
2. All harness URLs and both servers use an explicit `127.0.0.1`, never `localhost`, and
   `vite preview` keeps `strictPort` so a genuine collision fails loudly.
3. A Playwright `globalSetup` asserts, before any test runs, that the reference server really serves
   `design-reference/` (its `lms-data.js` exports `DB_V`) and that the app server really is this
   app (its `<title>` and pre-paint prefs script). A wrong target now fails immediately with an
   actionable message instead of a wall of diffs. This also catches a stale or half-written
   `dist-fixture`.

**Consequence.** No scenario, tolerance or mask changed. The suite can no longer pass or fail
against the wrong application.

---

## D-007 · `settle()` waits for animations to finish, not just 350 ms

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/lib/prepare.ts`, no product code, no tolerance, no mask

`docs/phases/00-setup.md` gives `settle()` with a fixed `waitForTimeout(350)` to cover the drawer
(240 ms) and modal (200 ms) transitions. That is enough on an idle machine but not under the full
55-scenario parallel run: `team-owner-member.drawer.png` was captured mid-transition in roughly one
full run in five, which is fatal to Gate 0's zero-diff requirement.

The failure was invisible in isolation — six consecutive captures of that scenario alone were
byte-identical — so it would have surfaced as a flaky CI `goldens` job rather than an obvious bug.

`settle()` now keeps the 350 ms floor and then waits for every **finite** animation to reach
`finished` or `idle`. Infinite animations (`ai-skeleton`, `ai-pulse`) are excluded: they never
finish by design, and `screenshot({ animations: 'disabled' })` resets them to their first frame
anyway. A genuinely stuck finite animation times out after 5 s and the page is captured as before,
so the harness cannot hang.

**Verified.** The drawer is no longer captured mid-transition: repeated captures of that scenario
are identical, and it has not reappeared in any later full run. (Residual PNG drift on other
scenarios remains, from host rasterization — see D-001.)

---

## OPEN QUESTION · Cohorts inside Daylight Saving Time run an hour later than their own label

**Raised:** 2026-10-03 · **Status: needs a product decision before phase 06 ships**
**This is not a deviation.** The port is faithful to the reference; the reference has the bug.

The prototype builds every session instant with a hard-coded standard-time offset:

```js
const T = s => Date.parse(s.length <= 16 ? s + ':00-06:00' : s);   // lms-data.js:6
fromCT: (date, time) => Date.parse(`${date}T${time || '13:00'}:00-06:00`),   // fmt.fromCT
```

`-06:00` is Central **Standard** Time. For the December cohort that is correct. For any cohort
running between March and November it is an hour off, because Central Daylight Time is `-05:00`.

The reference's own seed already shows it. The April 2027 cohort carries
`cadence: 'Tue & Thu · 1:00 PM CT'`, and its sessions render as **2:00 PM CT**:

| Cohort | First session (UTC) | Renders as | Its own cadence label |
|---|---|---|---|
| December 2026 | `2026-12-01T19:00Z` | 1:00 PM CST | Tue & Thu · 1:00 PM CT |
| April 2027 | `2027-04-06T19:00Z` | **2:00 PM CDT** | Tue & Thu · 1:00 PM CT |

`createCohort` inherits this, so the next cohort it creates (June 2027) is also scheduled at
2:00 PM CT while labelled 1:00 PM CT. `updateSession` uses `fmt.fromCT`, so an admin typing
`13:00` into the Edit Session drawer during a summer cohort also lands on 14:00 local.

**Why it is not fixed here.** `CLAUDE.md` is explicit: *"If they disagree on behavior, stop and
ask."* Making the construction DST-aware would change `seed()` output and break the Gate 2
differential tests against the reference, which is the whole basis of the port's correctness. It is
a one-line change in `constants.ts`/`time.ts` plus a golden re-capture, but it must be a decision,
not a quiet correction.

**What it affects if left alone.** Only cohorts that run during Daylight Saving Time — so not the
December 2026 launch cohort, but every cohort from roughly March onward. Learners would see a time
one hour later than the marketing and cadence copy promises, and the `.ics` files and Zoom
reminders would carry the later time consistently.

**Options:**
1. Leave as is. December launch is unaffected; revisit before a spring cohort.
2. Make `T`/`fmt.fromCT` DST-aware (construct 13:00 in `America/Chicago`), re-run the differential
   suite against a corrected expectation, and re-capture goldens. The reference stays the pixel
   oracle; only these instants move.
3. Keep the naive offset but make the `cadence` label derive from the actual start, so the UI never
   contradicts itself.

Tracked in `packages/core/test/mutations.test.ts` (`19 · createCohort`), which asserts the current
reference-faithful behaviour and documents the quirk inline so it cannot be "fixed" by accident.

---

## D-008 · Golden files are named `<scenario>-<region>`, and a missing golden fails

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/tests/{capture,parity}.spec.ts` and the golden filenames. No product code.

**The defect.** `capture.spec.ts` wrote `<scenario>.<region>.png`, but `parity.spec.ts` compared via
`toMatchSnapshot('<scenario>.<region>.png')`, and Playwright **sanitizes dots inside a snapshot
name** — so it looked for `<scenario>-<region>.png`. That file did not exist, and a missing snapshot
is not an error to Playwright: it writes the received image and carries on. The received image is
the app's own render.

So the pixel half of the compliance suite was comparing the app against itself. It would have gone
green for every phase from 03 onward while the UI drifted arbitrarily from the reference — the one
guarantee the whole harness exists to provide. Measured: the auto-written file differed from the
real reference golden by **1.67% of pixels**.

**The fix.** A single naming helper shared by both specs, with no dot in the stem, so the written
path and the expected path cannot diverge again. `parity.spec.ts` now also asserts that both the
`.png` and the `.json` golden exist before comparing, with a message pointing at
`pnpm compliance:capture`. A scenario can never again golden itself from the app under test.

**Consequence.** All 98 goldens were renamed and re-captured from the unmodified reference. No
tolerance, mask or scenario changed.

---

## D-009 · The Employee Card's CTA is a span, not a nested button

**Date:** 2026-10-03
**Approved by:** Connor Leiva (repository owner)
**Scope:** `apps/web/src/components/EmployeeCard.tsx`. No pixel or copy change.

The reference renders the card as `role="button"` with a real `<button>` inside carrying
`tabIndex={-1}`. axe flags that as `nested-interactive` (serious): a negative tabindex does not hide
a control from assistive technology, so a screen-reader user meets two controls for one action.
Gate 3 requires zero serious violations.

The card itself is the control, and its `aria-label` already ends with the CTA text, so the inner
element is decorative. Rendering it as a `<span>` with the same class removes the violation and
changes nothing visually: the stylesheet sets every property explicitly, and `global.css` gives
buttons `font: inherit`, so the reference's button already inherited the same 18.85px line-height a
span inherits. Confirmed against the golden, which records
`Continue Build | Hanken Grotesk | 13px | 600 | 18.85px | …` on both sides.

**Consequence.** `states-light` and `states-dark` pass pixels and fingerprint unchanged, and the app
is one serious violation cleaner than the prototype.

---

## OPEN QUESTION · Four colour-contrast failures inherited from the design system

**Raised:** 2026-10-03 · **Status: needs a product decision**
**Referenced by the harness as D-010.**

**Update, D-031 (2026-10-07):** the rebrand closed two of the five allowances — the dark theme's
white-on-Pine button (4.48) and its hover (3.49) are now Ink on Energy Bright, 9.10 and 10.94. Three
remain, all disabled text, re-measured with axe on the rebranded reference and each better than the
value it replaces: `#8a968f` on `#ffffff` 3.07 (locked nav row, light), `#8a968f` on `#f4f2ec` 2.74
(code-viewer line numbers) and `#78837d` on `#111c18` 4.43 (locked nav row, dark). The table below
is the pre-rebrand measurement, kept as the record; `compliance/lib/a11y.ts` has the current pairs.
The question itself is unchanged: disabled text is low-contrast by intent.

Gate 3 requires zero serious axe violations. The reference's own palette produces four, and the app
reproduces them exactly, because the tokens are generated verbatim and the reference is the pixel
oracle. Measured on `States.dc.html` and on `/__states`, which agree node for node:

| Foreground | Background | Ratio | Needs | Where |
|---|---|---|---|---|
| `#a6a4a0` (--text-disabled) | `#f4f2ef` (--bg-sidebar) | **2.22** | 4.5 | Locked nav row, light |
| `#6e6b67` (--text-disabled) | `#0c0b08` (--bg-sidebar) | **3.71** | 4.5 | Locked nav row, dark |
| `#ffffff` (--action-on-primary) | `#2f8380` (--action-primary) | **4.48** | 4.5 | Every primary button, dark |
| `#ffffff` (--action-on-primary) | `#439692` (--action-primary-hover) | **3.49** | 4.5 | Primary button hover, dark |

The locked-row case matters most: those rows are **not** disabled controls — they are clickable and
open the Locked Preview — so WCAG's disabled-control exemption does not apply. The dark-theme accent
misses by 0.02, which a hair of lightness would fix.

**Why it is not fixed here.** Every fix changes a generated token, which moves pixels away from the
reference and breaks the parity gate. `CLAUDE.md`: *"If they disagree on behavior, stop and ask."*

**Interim.** `compliance/lib/a11y.ts` allows exactly these four colour pairs, matched by their
measured foreground, background and ratio rather than by selector, and prints the count on every
run. Any other contrast failure, in any other colours, still fails the gate.

**Options:** (1) accept and document as a known limitation; (2) darken `--action-primary` slightly
in dark mode and lift `--text-disabled` for locked rows, then re-capture goldens; (3) keep the
colours but give locked rows a non-colour affordance carrying the same meaning — the lock icon and
"Team tier" tooltip arguably already do.

**Worth noting:** the app is strictly *more* accessible than the prototype. It fixes three serious
violations the reference has — `nested-interactive` (D-009), `document-title` and `html-has-lang`.

---

## D-011 · The profile menu is a dialog, not a menu

**Date:** 2026-10-04
**Approved by:** Connor Leiva (repository owner)
**Scope:** `apps/web/src/shell/ProfileMenu.tsx`, `AppShell.tsx`. No pixel or copy change.

SCREENS § 2.3 specifies `role="menu"`. But the panel holds a `radiogroup` (the time-zone picker), a
segmented theme control and one action — and a `menu` may only contain `menuitem`-family children,
so axe reports `aria-required-children` (serious). Verified: the reference has the identical
violation on its own profile menu.

`role="dialog"` with the same `aria-label` describes what the panel actually is, the trigger's
`aria-haspopup` changes to `dialog` to match, and `Sign Out` becomes a plain button (a `menuitem`
outside a menu is equally invalid). Roles are not captured by the fingerprint and nothing moves, so
the parity scenarios are unchanged.

---

## D-012 · The fingerprint merges adjacent text runs by typography alone

**Date:** 2026-10-04
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/lib/fingerprint.ts`, the `.json` goldens. No product code, no tolerance.

D-005's first version merged runs only within a shared block ancestor. That was not enough: the
prototype wraps every `{{ }}` binding in a `span.sc-interp` **and** every imported component in a
block-level host, so `Replay · {speed}` and `Watch at {mm:ss}` straddle block boundaries that React
has no reason to create. Matching them would mean scattering meaningless wrappers through every
screen to imitate a prototyping runtime's DOM.

Runs are now merged whenever they share typography, full stop. Nothing is lost: changed copy,
changed case, a dropped or added string and every typography property still change the merged
sequence. Layout is the pixel diff's job, and the pixel diff is what would catch text moving.

---

## D-013 · The Team Hub drawer wraps its tokens in a block host

**Date:** 2026-10-04
**Approved by:** Connor Leiva (repository owner)
**Scope:** `apps/web/src/routes/portal/TeamHub.tsx` + `.module.css`. No copy change.

The same prototype artifact, in pixels rather than text. Because every imported component sits in a
block-level host, a StatusToken pill's **line box** sets its row height — 22.55px, from the
14px/1.45 baseline strut — not its 22px border box. Dropping the tokens straight into the flex row
gave 43px rows against the reference's 43.55px, and six rows of that drifted ~3px: a 4.99% pixel
diff, well past tolerance.

Measured in both: reference children `svg:15.00 span:18.84 div:20.30 div:22.55`, ours
`svg:15.00 span:18.84 span:16.00 span:22.00`. A `display: block` wrapper around each token in that
one row restores the line box.

Scoped deliberately to this row rather than changed inside `StatusToken`, because the component's
current rendering is what makes `states-light`, `states-dark` and every other scenario pass.

---

## D-014 · The harness seeds preferences as a default, not an override

**Date:** 2026-10-04
**Approved by:** Connor Leiva (repository owner)
**Scope:** `compliance/lib/prepare.ts`. No product code.

`open()` seeds `localStorage['ai-lms-prefs']` through `addInitScript`, which re-runs on **every**
navigation. So a test that changed a preference and reloaded had its change overwritten by the
seed, and the two persistence tests ("collapse persists across reload", "theme toggle persists")
failed against an app that was behaving correctly.

The seed now writes only when no preferences exist. First load is unchanged; a reload keeps what
the page saved, so those tests measure the app rather than the harness.

---

## D-015 · The Module Builder asks before discarding unsaved changes

**Date:** 2026-10-04
**Approved by:** the handoff itself — phase 06 § 6.3 calls for it and says to record it here.
**Scope:** `apps/web/src/routes/admin/ModuleBuilder.tsx`

Leaving the builder with an unsaved draft asks `Discard unsaved changes?` through React Router's
`useBlocker`. This is UI the mockup does not have: the prototype keeps its draft in component state
and simply loses it on navigation.

It is one of the three additions `CLAUDE.md` permits, and it protects the one screen where a user
can lose real work — a six-step build with a system prompt and skill files. The prompt appears only
when the draft actually differs from what is saved, so an untouched builder navigates away silently.

**Not affected.** No parity scenario navigates away from the builder, so pixels and fingerprints are
unchanged.

---

## D-016 · Three places where the Curriculum screen follows the reference over SCREENS.md

**Date:** 2026-10-04
**Approved by:** the precedence rule in `CLAUDE.md` — *"If the sources disagree on a pixel or a
string, the reference wins."* Recorded here so the divergence is not mistaken for a bug.
**Scope:** `apps/web/src/routes/admin/Curriculum.tsx` + `.module.css`

1. **`Replay ready`, not `Replay Ready`.** SCREENS § 4.2 gives Title Case; the reference renders
   sentence case and the captured golden contains `Replay ready` twice. Verified in both.
2. **The Tier Access control is hand-rolled, not the `Segmented` primitive.** The reference draws it
   inline on this screen with its own metrics (2px padding, radius 8, no gap, 12px options, an amber
   active state for Team Only), which § 1.4 does not describe.
3. **The Status pill is hand-rolled, not `StatusToken`.** The reference draws it inline at 12/600
   with a 6px dot; `StatusToken` is 500 weight with a 13px glyph, and the golden fingerprint
   confirms 600.

Each was confirmed against the captured golden before being built that way. If SCREENS.md is ever
reconciled with the reference, these are the three lines to revisit.

---

## D-017 · `announcements.opens_pct` stores whole percent; the snapshot codec converts

**Date:** 2026-10-04
**Approved by:** the column name in `docs/phases/07-backend.md` § 7.2 itself.
**Scope:** `apps/api/src/db/schema.ts`, and the `loadDb`/`persistDiff` codec in § 7.3

`Announcement.opens` is a fraction in the reference data (`0.71`, `0.64`, `null`) and is rendered
through `fmt.pct`, which multiplies by 100. § 7.2 declares the column as `integer('opens_pct')`,
which would round `0.71` to `1` and make the admin Announcements history read `100%` for every sent
announcement — if the column held the same unit as the field. It does not: the name says `_pct`, so
the column holds whole percent and the field holds the fraction. The conversion belongs in the
snapshot codec — `Math.round(v * 100)` on write, `v / 100` on read.

This is the one place in the schema where a stored unit differs from its domain field, so it is
pinned by a test rather than a comment: `schema.test.ts` › *"declares a codec for every column whose
stored unit differs from its field"* walks the real seed, finds every fractional value that would
land in an `integer` column, and requires each one to have a declared codec whose round trip renders
the identical `fmt.pct` string. A second integer column that starts rounding a seeded value fails
that test until someone decides which it is.

---

## D-018 · In http mode a cohort's enrolment is the row count, so the admin numbers change

**Date:** 2026-10-04
**Approved by:** `docs/phases/07-backend.md` § 7.2, which stores no `enrolled` column, and the Gate 7
checklist, which runs **portal** parity in http mode and leaves admin parity on the fixture.
**Scope:** `apps/api/src/db/codec.ts`, `apps/web/src/routes/admin/Cohorts.*`

The fixture's December cohort reads `enrolled: 148` while the seed models 14 learners individually;
the other 134 are `db.base`, the aggregate that makes the demo's analytics look like a real cohort.
§ 7.2 has no column for `enrolled`, so `loadDb` recounts it from the user rows — and § 7.4 returns
`base: ZERO_BASE` — which means a database seeded from `seed('live')` shows **14 / 200**, not
148 / 200, and the admin Overview analytics shrink to the modelled learners too.

This is correct, not a regression: in production every learner is a row, so the count is the whole
truth, and a stored copy could only ever drift from it. It is recorded because the two numbers look
like a bug side by side.

It does not put Gate 7 at risk. No portal screen reads `base` or `enrolled` — verified by grep
across `routes/portal` and `packages/core` — and Gate 7 runs only the portal scenarios in http mode
against the same goldens, with admin covered by fixture parity plus the API oracle tests. The two
readers of `db.base` inside `mutations.ts` (`learnerCount`, and the admin analytics) see the same
zero baseline on both sides of the oracle comparison, so they agree.

**Open:** the Gate 7 checklist's *Parity in http mode* note mentions seeding the test database "including the `base` aggregates
(test env only, via `SEED_WITH_BASELINE=1`)". There is no table for `base`, so that flag can only
mean materialising the 134 as real `users` and `progress` rows. Nothing portal-visible needs it, so
it is deferred rather than guessed at: if admin parity is ever wanted in http mode, that is the
thing to build.

---

## D-019 · The dev and test database is `ai_lms_dev`, a second database in the same Railway instance

**Date:** 2026-10-04
**Approved by:** the user, who provisioned the Postgres service and supplied its public URL for
this purpose.
**Scope:** `apps/api/.env` (gitignored), the Gate 7 oracle tests, `.github/workflows/ci.yml`

Gate 7's oracle tests call `resetDatabase(seedForDatabase('live'))` in a `beforeEach` — once per
mutation, 37 times per run — which truncates every table. Aimed at the database the deployed Web
service reads, that is a data-loss bug waiting for the first run against a populated environment.

So development and tests use a **separate database inside the same instance**: `ai_lms_dev`. The
Web service reads `DATABASE_URL` as a Railway reference to the Postgres service's own internal URL,
which resolves to the `railway` database; nothing in the repository or in any developer's `.env`
points there. Local credentials live only in `apps/api/.env`, which `.gitignore` line 15 excludes.

**PostgreSQL 18.6, not 16.** `docs/phases/07-backend.md` § 7.1 names Postgres 16 and the CI job was
pinned to `postgres:16`. Railway provisioned 18.6, so CI now runs `postgres:18`: a CI database on a
different major version from production tests the wrong thing. Nothing the schema uses —
`bigint`, `jsonb`, `pgEnum`, composite primary keys, advisory locks — differs between the two.

The first migration is applied and verified against the live database: 16 tables, `tier` and
`module_status` with their values in order, and composite primary keys on `dismissals`,
`permissions` and `progress`. Running `db:migrate` a second time is a no-op, which is what a
redeploy does.

---

## D-020 · Screenshots are scoped by platform; fingerprints stay shared

**Date:** 2026-10-04
**Approved by:** the user, choosing this over replacing the set or making the CI job non-blocking.
**Scope:** `compliance/lib/goldens.ts`, `compliance/goldens/{win32,linux}/`, `capture.spec.ts`,
`parity.spec.ts`, `scripts/goldens-check.mjs`, `.github/workflows/ci.yml`
**Supersedes:** D-001's plan to replace the committed set with the container's.

D-001 recorded that the committed goldens were Windows-captured and dev-only, and that the CI
`goldens` job would hand over a container-captured set. That handover has happened — but replacing
the set outright would have broken the local gate, because the divergence is not small.

**Measured**, against the container's capture of the same unmodified `design-reference/`, at
Playwright's own threshold (0.15, i.e. ±38/255 per channel):

| | result |
|---|---|
| `.json` fingerprints | **98 of 98 byte-identical** |
| `.png` screenshots | 98 of 98 differ; **60 over the 1% `maxDiffPixelRatio`** |
| | median 1.19%, worst 2.99% (`shell-locked-preview-dialog`) |

So one shared PNG set fails 60 of 98 scenarios on whichever platform did not capture it, and the
failures are indistinguishable from a regression. Confirmed in practice, not just arithmetic:
putting the Linux image in `win32/`'s place makes `shell-locked-preview` fail the local gate.

Every diff is under 3% and **no fingerprint moved**, which is the evidence that this is glyph
rasterization and not layout. A real layout or copy change moves a fingerprint, or moves far more
than 3% of pixels. That is also why the fingerprints are shared rather than duplicated: they are
platform-independent by measurement, and they are what CLAUDE.md's "copy is exact" rule rides on.

**Authority is not symmetric.** `compliance/goldens/linux/` is authoritative — CI re-captures and
diffs it in the pinned container on every push. `win32/` exists so `pnpm gate <n>` can run on a
Windows machine with no Docker. When the two disagree about whether the app matches the reference,
CI is right.

Two things this deliberately does NOT do. It does not raise a tolerance and adds no mask —
`maxDiffPixelRatio` is still 0.01 and `threshold` still 0.15. And it does not weaken the
hand-editing guard: the CI job still fails on any drift, and its message now routes by which files
moved, because a changed `.json` means copy or typography (platform-independent, so always real)
while a changed `linux/*.png` means the authoritative screenshots stopped reproducing.

`GOLDEN_PLATFORM` overrides the host and CI pins it to `linux` rather than inferring: a runner that
moved to another OS would otherwise capture into a different directory, leave the authoritative set
untouched, and still pass its own diff check.

**On D-008.** Splitting the path risked re-opening the bug where Playwright's snapshot resolution
and the harness's disagree — which does not fail, it writes the app's own render as the expected
image and compares the app against itself forever. Two guards: `parity.spec.ts` still asserts the
golden exists before comparing, and the resolution was verified empirically — a different screen's
image placed at `win32/states-light-page.png` failed the run and printed
`Snapshot: win32\states-light-page.png`, which is exactly the file `pngPath()` returns.

---

## D-021 · Email templates use inline hex, the one sanctioned exception to the token rule

**Date:** 2026-10-04
**Approved by:** `docs/phases/08-integrations.md` § 8.1, which mandates it.
**Scope:** `apps/api/src/email/**`, `scripts/email-tokens.mjs`, `apps/api/src/email/tokens.ts`

CLAUDE.md's non-negotiables say styling uses tokens — `var(--token)` only, no hex, rgb or named
colours. The email templates are wall-to-wall inline hex, because mail clients resolve neither CSS
custom properties nor `oklch()`, and § 8.1 says so explicitly: build them "with the same tokens as
**inline hex values**, resolved from `tokens.css` light mode".

What makes this a recorded deviation and not a hole:

- The values are **generated**, never hand-typed. `scripts/email-tokens.mjs` resolves `:root`'s 77
  custom properties — following `var()` chains, evaluating `oklch()` and `color-mix(in oklch, …)`,
  and converting OKLab → linear sRGB → gamma — into `apps/api/src/email/tokens.ts`. A test asserts
  the committed file is byte-identical to a fresh run, so a `tokens.css` change cannot leave the
  emails on stale colours.
- The maths is checked against a **browser**, not trusted. A `@g8` Playwright test paints each token
  in the reference prototype and compares Chromium's own sRGB bytes to the script's hex.
- Nine tests assert that no `var(--` and no `oklch(` reaches the rendered HTML — the leak that would
  render an email black-on-black in Outlook.
- 63 of the 77 tokens are colours and are exported. Two carrying alpha (`--bg-overlay`,
  `--focus-ring`) are omitted rather than flattened, because `#rrggbbaa` is not understood by
  Outlook or Gmail's web client and both describe something an email does not have. Six are outside
  sRGB and are clamped the way Chromium clamps them, measured in the browser rather than assumed.

`scripts/check-css-colors.mjs` does not police this either way: it globs only
`apps/web/src/**/*.module.css`. That is the right scope — but it means nothing mechanical stops a
future reader "fixing" the emails back to `var(--token)`, which is why this entry exists.

---

## D-022 · §8.2's `storageKey` and §8.3's `publishReplay` arguments are deferred with the routes

**Date:** 2026-10-04
**Approved by:** the phase-08 sprint scope — build only what can be verified without a database.
**Scope:** `packages/core/src/mutations.ts`, `packages/core/src/types.ts`,
`apps/api/src/routes/schemas.ts`

§ 8.2 wants `uploadResource` to carry a `storageKey`; § 8.3 wants `publishReplay` to take
`{ playbackUrl, durationSec, transcriptVtt? }`. Neither change was made. `packages/core` is ported
from the prototype and covered by differential tests, so a mutation signature change risks parity
for no gain while the routes that would consume it do not exist.

The change touches **three** files, not the two that are obvious:

1. `packages/core/src/mutations.ts` — `publishReplay`, `uploadResource`
2. `packages/core/src/types.ts` — `AIEmployee` needs `playbackUrl`; `Resource`/`ModuleResource` need
   a stable key
3. `apps/api/src/routes/schemas.ts` — both are `z.strictObject`, which **rejects** an unknown key.
   Adding the field to core without editing the schema turns it into a 400 at the boundary rather
   than a harmlessly ignored extra.

Three consequences that are live today and are not bugs:

- `HlsEngine` is built and tested but unreachable: the engine choice needs a playback URL, and
  `replayUrl()` reads a field `AIEmployee` does not declare, so it returns `''` and `TickerEngine`
  is always chosen — in http mode too. A test pins exactly that.
- `parseVtt` has no caller. It is correct, tested, and waiting for `publishReplay`.
- The upload route has no way to hand its minted key to the mutation. The codec already excludes
  `resources.storage_key` from `COLUMNS_OWNED` (see `codec.ts`'s header), which is what will let the
  route write that column without a later snapshot write clobbering it.

**Open, and it needs deciding before the route is written:** the per-employee resource key.
`EmployeeDetail.vm.ts` derives `:fileName` from the admin-typed title, and that derivation is not
injective — "Session 1 Slides" and "Session 1: Slides" both give `session-1-slides.pdf` — while
`storage.uploadKey` mints `uploads/YYYY/MM/<uuid>.<ext>`. `ModuleResource` has no key field, so the
two namespaces cannot be reconciled on the web side alone.

---

## D-023 · Array order is persisted in a `seq` column, because the screens render it

**Date:** 2026-10-05
**Approved by:** the Gate 7 requirement that the portal scenarios pass in http mode **against the
same goldens**, which is the thing that proves the backend is invisible to the user.
**Scope:** `apps/api/src/db/schema.ts` (users, teams, resources), `apps/api/src/db/codec.ts`,
migration `0002_sad_johnny_storm.sql`

`Db.users`, `Db.teams` and `Db.resources` are **ordered arrays and the screens render them in that
order**: `Vault.vm.ts` only filters, and `Learners.vm.ts` and `TeamHub.vm.ts` map. So the array
order is data, and a database that does not store it cannot reproduce it.

It was not stored, and `ORDER` fell back to `id asc`. Three http-mode scenarios failed —
`team-owner`, `team-owner-invite` and `vault-agent` — with the **fingerprints failing alongside the
pixels**, which is what identified it as ordering rather than styling.

**Measured before choosing a fix**, against every plausible existing column:

| array | candidate | result |
|---|---|---|
| `resources` | natural id sort | **matches** (`r1…r13, x1…x6`; `id asc` gives `r1, r10, r11, r12, r13, r2…`) |
| `resources` | `id asc`, `updated asc` | no |
| `users` | `id asc`, `joined asc`, `name asc` | **none match** |
| `teams` | `id asc`, `name asc`, `ownerId asc`, owner's `joined asc` | **none match** |

So `users` and `teams` genuinely need a persisted order. One mechanism for all three beats two, so
all three get `seq`.

**`seq` is not part of any `@ai/core` type.** `toRows` fills it from the array index and `fromRows`
drops it. `Db` is unchanged, the differential tests against the prototype are unaffected, and
fixture parity cannot move — which is what made this safe to attempt at all: the goldens are the
oracle, so getting it wrong fails parity rather than shipping.

**The alternative, and why it was rejected.** Sorting in the view-models is simpler and needs no
column — but the fixture's order *is* what the reference prototype renders, so any sort that changed
it would mean moving a golden to make a test pass. CLAUDE.md forbids exactly that, and the reference
is the oracle.

**The cost, stated plainly.** Reordering an array is now a write. Removing the first of N rows
reindexes the remaining N−1, because the index is dense rather than sparse. That is affordable —
one UPDATE per row inside one transaction, on a rare admin action, for hundreds of rows — and a
fractional or gapped index would be more machinery than the problem deserves at this scale. Two
tests pin the consequences: reordering produces upserts whose **only** changed field is `seq`, and a
round trip preserves array order so a reload is not a write. Without that second property every
request would rewrite three tables.

The migration is three `ADD COLUMN … DEFAULT 0 NOT NULL` statements, which satisfies § 9.3's rule
that a migration stay backward-compatible for one release: the column is added before anything
reads it.

---

## D-024 · The download route presigns and checks; the CLIENT keeps the `downloadResource` write

**Date:** 2026-10-05
**Approved by:** the recommendation already on record when the conflict was first found, now
implemented.
**Scope:** `apps/api/src/routes/files.ts`, `apps/web/src/routes/portal/Vault.tsx`

§ 8.2 says `GET /api/files/resource/:id` "runs `downloadResource`". It does not, deliberately:
`Vault.tsx` posts that same mutation on the same click, and `mutations.ts` does `x.dl++`, so doing
both would count every download **twice**. The client cannot stop posting it — the fixture-mode Blob
path shares the call, and the success toast and the inline 403 both come from it.

So the route presigns and performs its own access check, and the write stays with the client. The
spec's sentence is not satisfiable as written while the prototype's click does what it does.

**Access is `@ai/core`'s `canAccess`**, not a reimplementation: both `Resource` and `AIEmployee`
carry a `tier`, so one function answers for both routes, and the 403 body carries core's own
message. A staff viewer is refused on both download routes — tier is a learner concept,
`downloadResource` itself refuses staff, and no admin screen downloads a vault row.

**403 where the object is visible, 404 where it is not.** Gate 8 requires the tier refusal to be
403, which leaks nothing: the row is in Jamie's snapshot and the Vault draws it with a lock. A
*hidden* resource and a *draft* module are in no learner snapshot at all, so both answer 404 — a 403
would confirm the thing exists.

**Still open (D-022):** the upload route has no caller. It mints a key and nothing can hand that key
to `uploadResource`, because that mutation takes no `storageKey`. And the 25 MB cap does not bind
the PUT: SigV4 does not sign `Content-Length`, so the cap guards the *request for a URL* and not the
upload. Closing that needs a bucket policy, not code.

---

## D-025 · The scheduler writes its ledger before it sends, and loses rather than repeats

**Date:** 2026-10-05
**Approved by:** § 8.5's "every job is idempotent", which forces a choice between two failure modes.
**Scope:** `apps/api/src/jobs/scheduler.ts`

`job_runs` has a unique `(job, key)`, so a send is recorded once. But there is no ordering of "write
the ledger" and "send the mail" that survives a crash between them, and pretending otherwise is the
bug:

- **Mail first** — a crash before the ledger commits means the next tick sends again. A learner gets
  the same reminder two, five, twenty times.
- **Ledger first** — a crash after the commit means that one email is never sent, and nothing
  retries it.

**Ledger first was chosen**, written inside the transaction and dispatched after the commit. A lost
reminder is a reminder; a mail loop is an incident, and the recipient cannot opt out of it. The
trade is stated in the file header and beside the code rather than hidden.

**The scheduler takes lock 4242 only**, as § 8.5 specifies — which answers "which replica runs
jobs", a different question from § 7.3's lock 42 ("serialize writes"). So the announcement flip
happens outside the write lock. It is a conditional update (`scheduled` → `sent` only), which is
what keeps that safe.

**`APP_URL` is load-bearing for every scheduled send, and its absence fails silently in the worst
way.** Measured: with the real templates registered and `APP_URL` unset, every send throws because
`links.ts` refuses a relative CTA — so the scheduler commits its ledger rows and delivers *nothing*,
and the ledger then suppresses the retry. Every environment that sends mail must set it.
`.railway/railway.ts` does, for all three.

---

## D-026 · The join route answers four statuses § 8.4 does not name

**Date:** 2026-10-05
**Approved by:** § 8.4 names only the 200 and the 409; the rest follow from not leaking the schedule.
**Scope:** `apps/api/src/routes/join.ts`

§ 8.4 specifies `{ url }` when the window is open and `409 { error: 'Join opens 15 min before' }`
otherwise. Four other cases exist and each is decided against disclosure:

- **404, not 409 or 403, for a session in another cohort** as well as for an unknown id — so one
  valid cookie cannot enumerate the programme's schedule. A test asserts the two responses are
  indistinguishable.
- **403 for a session whose AI Employee the learner's tier does not reach** (Gate 8 requires it for
  `dec26-s4`).
- **An unaccepted invite is refused**, and that case is *reachable*: `POST /api/auth/request` does
  not read `users.status`, and only an `invite`-purpose token flips the row to active — so an
  invited seat can request an ordinary sign-in link and get a session.
- **`cache-control: no-store` on the 200.** The body is the one field § 7.4 withholds from every
  learner snapshot, and the window closes. A cached 200 — bfcache, or any proxy ever put in front —
  would re-serve a URL the server cannot recall after `endSession`. helmet sets no `cache-control`.

The route reads the **unscoped** db and never calls `scopeSnapshot`, deliberately: its whole purpose
is to serve the field `scope.ts` blanks. One test proves the pairing in a single body — Jamie's
`GET /api/snapshot` has `zoom === ''` on every session, and this route is the only way he gets one.

---

## D-027 · The test database is scoped by RUN as well as by worker slot

**Date:** 2026-10-05
**Approved by:** three independent agents hitting the same collision, and a three-hour hang.
**Scope:** `apps/api/test/helpers.ts`

`VITEST_POOL_ID` is vitest's concurrency **slot**, and it restarts at 1 in every separate
`vitest run` (vitest also overrides an externally supplied value — measured). So two concurrent
runs both took `ai_lms_dev_t1` and truncated each other's rows mid-test.

This was not theoretical. All three phase-08 agents hit it and each worked around it privately by
swapping the database name — `ai_lms_dev_authz`, `ai_lms_dev_sched` and their slots were left behind
— and it then hung a full-suite run of mine for three hours against a database another process kept
emptying underneath it. None of the three reported it as a shared defect, because each had already
solved it for itself.

The name is now `<base>_r<run>_t<slot>`, where the run id defaults to the process group — every
worker of one invocation shares a parent, so they agree, while a second invocation does not.

**And each run sweeps on its way in**, because scoping by run would otherwise leak N databases per
run onto a shared instance: any sibling `<base>_*` with no live connection is reclaimed. That also
cleans up the older slot-only names and the agents' private ones. Failures in the sweep are
swallowed — it is housekeeping, and a run that cannot drop someone else's leftovers should still
run.

---

## D-028 · /ai101, the eXpCon 2026 kit page: a public page outside the reference

**Date:** 2026-10-06
**Approved by:** the user, in chat on 2026-10-06, supplying the spec `AI 101 Kit Page Spec.md` and
asking for the page to be built. The spec is not in the repository; its copy is, verbatim, in
`apps/web/src/ai101/content.ts`.
**Scope:** `apps/web/ai101.html`, `apps/web/vite.ai101.config.ts`, `apps/web/src/ai101/**`,
`apps/web/public/ai101-qr.svg`, `apps/web/{package.json,tsconfig.json,vite.config.ts}`,
`apps/api/src/routes/ai101.ts`, `apps/api/src/{app,server}.ts`, `apps/api/src/db/schema.ts`, the
generated migration `apps/api/drizzle/0003_pale_victor_mancha.sql`, their tests
(`apps/web/src/ai101/*.test.ts`, `apps/api/test/{ai101,authz,routes}.test.ts`,
`apps/api/src/db/schema.test.ts`) and `scripts/check-css-colors.mjs`

CLAUDE.md allows no screen the mockup does not have beyond the handoff's own list, and this is a new
one: a public page for attendees of the eXpCon 2026 session "Sounds Like You, Looks Like You: AI 101
for Agents" — two prompts to copy, a setup checklist, a December waitlist. It is opened from a QR
code, mid-session, on a phone, on conference Wi-Fi, with no account.

**No parity scenario, by construction.** The page is not in `design-reference/`, so there is no
golden to compare it with, and capturing one from our own build is the self-comparison D-008 exists
to prevent. Its contract is the spec instead: the copy in `content.ts`, the behaviour in
`apps/web/src/ai101/{render,main}.test.ts` and `apps/api/test/ai101.test.ts`. There is no compliance
e2e spec for it yet; the browser behaviour (copy, checklist, form, 375 px, no-JS) was checked by hand
against a production-shaped build before launch. It reuses the system's
tokens, type scale, card, button and field patterns and `ICONS`, under the usual rules;
`check-css-colors.mjs` now scans `apps/web/src/ai101/**/*.css` as well.

**The URL is `learn.amplifiedimpact.io/ai101`, not the spec's `amplifiedimpact.io/ai101`.** The apex
is parked at GoDaddy, and GoDaddy DNS cannot point an apex at Railway: Railway attaches a custom
domain by CNAME, DNS forbids a CNAME at a zone apex, and GoDaddy has no flattening record to stand in
for one. `learn.` is already production's domain (`.railway/railway.ts`), and the user chose it. The
QR code encodes it, and the Instagram keyword DM, configured outside this repository, must link to
it too.

**A separate Vite build.** `vite build -c vite.ai101.config.ts` runs after the SPA's build, into the
same `dist/` with `emptyOutDir: false`. A second input in the main config would let Rolldown hoist
shared chunks (CSS, the modulepreload polyfill) out of the SPA's entry, which changes the gated
SPA's `index.html`. Built apart, `dist/index.html` is byte-identical to `vite build` alone. The main
config gains only the render plugin, a no-op for `index.html`, so `pnpm dev` serves the page too.

**One self-contained HTML response, exempt from the rate limit.** The global limit is 100 a minute
per session or IP (§ 9.4, `GLOBAL_RATE_MAX`), and a session room behind venue NAT is one IP: a
hundred phones scanning the code in the same minute would 429 each other on the page and on every
asset it loads. So the build inlines the stylesheet and the module script into `ai101.html`,
`<link rel="icon" href="data:,">` saves a favicon request per visitor, and `GET /ai101` and its
three 301s (`/AI101`, `/ai-101`, `/ai101/`, query string kept) are `rateLimit: false`. It is served
`no-cache` with a strong ETag, so a reload is a 304. The font files are ordinary static assets and
still count; a 429 on one falls back to the system face (`font-display: swap`), not a broken page.

**The waitlist POST is public: a new exemption to Gate 7's 401 rule.** Gate 7 says an
unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*` and `/api/events`
returns 401. `POST /api/ai101/waitlist` joins that list, and `test/authz.test.ts` carries it. Its
own guards stand in for a session: the Origin check (`originIsAllowed`: absent passes, foreign or
`null` is 403), a honeypot field that answers exactly like success and stores nothing, its own limit
of 300 a minute per key, length caps on every field, and a `source` that is a server constant, never
read from the request. Neither the name nor the email is logged.

**Registered when a database is configured, not when the build is non-fixture.** Production runs
`VITE_DATA_SOURCE=fixture` *with* a `DATABASE_URL` (LAUNCH.md § 2), so `server.ts` computes
`fixtureOnly = true` there and nothing inside `build()`'s `!fixtureOnly` block exists in
production. The route is keyed on whether a database is configured instead: `server.ts` asks
`readDatabaseUrl()`, the same function `getDb()` resolves the URL with, so the answer cannot
disagree with the connection. In the demo
environment (fixture, no database) the page still serves and the POST is a plain 404, which the
form shows as its generic error.

**`Referrer-Policy: same-origin` on the page.** helmet sets `no-referrer` everywhere, and under
`no-referrer` a native form POST sends `Origin: null`, which `originIsAllowed` correctly treats as
foreign, so every no-JS submit would be refused. The `/ai101` response overrides the policy to
`same-origin`: our own POST carries the real origin, and nothing is sent off-site. The script's
`fetch` is unaffected either way, because Fetch keeps the origin on a `cors`-mode request.

**The no-JS fallback, without `@fastify/formbody`.** The spec requires the page to stay usable
when JavaScript fails, and a native form posts `application/x-www-form-urlencoded`, which Fastify does not
parse. Rather than add a dependency, the route's encapsulated plugin registers a parser for that one
type, on `URLSearchParams` with a small body limit, so no other route accepts a form body. That is
also a departure from § 9.4's CSRF rule ("every mutation requires `content-type:
application/json`"), confined to this route and safe for the reason it can be public at all: the
route reads no cookie, so a forged cross-site submission can do nothing a direct `curl` cannot. The
no-JS submit answers `303` to `/ai101#waitlist-joined` or `/ai101#waitlist-error`, and CSS `:target`
shows the message. The spec's "no page redirect" holds whenever the script runs.

**Smaller choices.**
- Light theme only. A public page has no viewer preference to honour, so it renders `tokens.css`'s
  default `:root` and needs no pre-paint theme script, which would be one more inline hash in the CSP.
- Inputs are 16 px against `Field`'s 14 px, because iOS Safari zooms the page when a smaller input
  takes focus.
- Submissions go to a new table, `ai101_waitlist`, tagged `source = 'expcon-2026-ai101'`, with the
  optional `?src=` attribution in its own `src` column. A unique `(email, source)` makes a repeat a
  no-op that still reports success. The spec prefers an existing email or CRM integration and there
  is none, so the database is its second choice. The table is not part of the snapshot codec.
- No analytics events. The spec fires them only if analytics is already installed, and none is.

**Production must run the migration.** The live service's pre-deploy command was null, although
`.railway/railway.ts` declares `pnpm --filter @ai/api db:migrate` for every non-demo environment.
It was set to that command on 2026-10-07, with the user's approval, through Railway's API, as a
single setting: not `railway config apply`, which would also flip production from `fixture` to
`http`. This migration, and every later one, now reaches production before the new build serves.

**Shipped past a red CI, once, with the user's approval.** Railway's "Wait for CI" had skipped
every deploy since `dbf9c48`: the `quality` job runs `pnpm test` with no database, and
`apps/api/test/helpers.ts` throws on import without `DATABASE_URL`, so the check suite has failed
since phase 07. With the session two days out, the user chose to deploy this commit directly
(`serviceInstanceDeployV2`) rather than fix CI first. That also put phases 07–09 in production for
the first time; in fixture mode they are dormant. CI is still red, so later pushes will keep being
skipped until `quality` stops running the API package without a database.

**The QR code**, `apps/web/public/ai101-qr.svg` (served at `/ai101-qr.svg`), encodes
`https://learn.amplifiedimpact.io/ai101?src=qr`: 45 bytes in one byte-mode segment, error correction
Q, which is version 4 (33 × 33 modules, mask 2) plus a 4-module quiet zone, so
`viewBox="0 0 41 41"`. Version 4 holds 46 bytes at Q and M would also need version 4, so Q's extra
damage tolerance costs no density; H would need version 6. It is black on white rather than tokens:
a print and projection asset read by cameras, never styled by the app. It was generated once, with
node-qrcode installed in a scratch directory outside the repository's dependencies
(`npm i qrcode@1.5.4`), in bash:

```bash
node -e 'require("qrcode").toString("https://learn.amplifiedimpact.io/ai101?src=qr", {type: "svg", errorCorrectionLevel: "Q", margin: 4, width: 1025}).then((svg) => process.stdout.write(svg.replace("crispEdges\">", "crispEdges\"><title>QR code for https://learn.amplifiedimpact.io/ai101</title>")))' > ai101-qr.svg
```

`width: 1025` is 41 modules × 25 px, so at its natural size every module is whole pixels.
**Verified** independently of the generator: rendered in the repository's Playwright Chromium and
decoded with jsQR 1.4.0, it reads back exactly the URL as an inline SVG at 1025, 600, 300, 150 and
100 px, as an `<img>`, and as a 600 px render resampled to 150 and 120 px to stand in for distance.
The format bits, read straight from the SVG's modules, say Q and mask 2. **Not verified:** the
spec's scan from about 3 m off a laptop screen, which needs a phone and a room. Show the code as
large as the screen allows.

---

## Net-new UI approved by the handoff itself

These are listed in `CLAUDE.md` › Non-negotiables as the only permitted additions:

- Sign-in and invite-accept screens (phase 07, spec in `docs/phases/07-backend.md` § 7.5)
- The unsaved-changes prompt in the Module Builder (phase 06 § 6.3) — recorded above as D-015
- Production integrations (phase 08)

Net-new UI approved later, by a human, is recorded as its own entry rather than added here:
`/ai101` is D-028.

## D-029 · www and learn are one service, split by Host

**Date:** 2026-10-07
**Approved by:** the user, in chat on 2026-10-07: "The learn.amplifiedimpact.io url needs a login.
www.amplifiedimpact.io should be a basic marketing site. The real reason for the cutover is I don't
want people accessing the LMS right now as it's still under development. But I want the
www.amplifiedimpact.io/ai101 landing page to render to anyone." Placeholder content approved in the
same thread: "I'm fine with the marketing site literally just being a cute little graphic saying
under construction, check back in - as a placeholder."
**Scope:** `apps/api/src/routes/marketing.ts`, `apps/api/src/{app,server}.ts`,
`apps/web/public/holding.html`, `apps/api/test/marketing.test.ts`, `.railway/railway.ts`

Two public names, one Railway service, told apart inside the process by the `Host` header. `learn`
is the LMS behind invite-only sign-in; `www` is public and currently serves a placeholder.

**A hook, not a route.** Registering `GET /` would claim that path for every host, and on the app
host `/` belongs to `@fastify/static`'s index. Fastify gives a route handler no clean way to decline
and fall through to the static plugin, so a route would have meant the placeholder winning on
`learn` as well — the most expensive failure available to this feature. An `onRequest` hook can
answer or stand aside. It also leaves the route table untouched, so `authz.test.ts`'s inventory,
which is checked against the real router, keeps meaning what it says.

**`/ai101` and `/api/` stay live on both hosts.** The first is public by design (D-028) and is
reached with no session. The second carries Railway's healthcheck, which arrives with its own
`Host`; a redirect there fails the check and rolls back a deploy that was perfectly healthy.

**302, not 301,** for every other path on the marketing host. These paths will mean something once
`www` has a real site, and a 301 is cached by browsers more or less forever.

**Inert unless `MARKETING_HOST` is set, with no default.** A wrong default replaces the product with
an "under construction" page. Staging and demo set nothing and are unaffected.

**The one thing the tests cannot see.** `server.ts` reads the page from `apps/web/dist/holding.html`,
which gets there because vite copies `public/` verbatim; the tests inject the page directly, by
design, so they cannot detect a build that stopped copying it. The boot logs an error for that case
instead of 404ing in silence. The copy was verified empirically by deleting the file and rebuilding.

**The apex is still not served.** `amplifiedimpact.io` with no `www` does not resolve, for the reason
D-028 records: DNS forbids a CNAME at a zone apex and GoDaddy has no flattening record. Railway also
reports this plan at its custom-domain limit with `learn` and `www` attached, so a third name is not
available without an upgrade. GoDaddy domain forwarding to `https://www.…` is the remaining option
and is not enabled.

## D-030 · CI's quality job runs no database suite, and CI runs no http parity

**Date:** 2026-10-07
**Approved by:** not a product decision — a defect fix. Reported by the user on 2026-10-07 relaying
Railway: deploys were being skipped because "Wait for CI" was on and CI had been red since the first
push.
**Scope:** `.github/workflows/ci.yml`, `apps/web/vitest.config.ts`

CI had never been green, and the reason given in the deploy history — Windows-captured screenshots
against a Linux runner — was stale. D-020's platform-scoped goldens had already fixed that. Three
real defects were found instead, two of them in CI's own definition.

**1. `quality` ran the api suite with no Postgres.** Its step was `pnpm test`, which is
`pnpm -r test` and includes `@ai/api`. `apps/api/test/helpers.ts:99` resolves `DATABASE_URL` at
MODULE scope, so 16 of that package's 31 test files throw `DatabaseConfigError` during collection on
a runner with no database. `apps/api/.env` is gitignored, so the local `loadEnvFileOnce()` fallback
that hides this on a developer's machine does not exist in CI. The job now runs
`pnpm --filter @ai/core --filter @ai/web test`; the api suite keeps its own job, which has a real
`postgres:18`.

Deliberately NOT fixed by making those tests skip without a database. A suite that skips when
`DATABASE_URL` goes missing reports green while testing nothing, and the `api` job losing its
service is precisely the case that has to stay loud.

**2. `compliance` would have failed too, and had never been observed.** It takes `GATE` from
`.phase`, now 9, and `GATE >= 7` switches on `HTTP_PARITY` (`compliance/lib/prepare.ts`), which
starts a second server and makes `global-setup.ts:186` truncate and re-seed a Postgres. That job has
no database either. It was invisible because `needs: quality` meant the job was skipped rather than
run — fixing only defect 1 would have turned one red job into a different red job.

The job now sets `HTTP_PARITY: '0'`, `prepare.ts`'s own documented override, which also makes the
`@g7` sign-in e2e specs skip themselves because `LIVE_API_BASE` becomes null.

**Accepted coverage gap.** The 24 http-mode parity scenarios now run only in the local gate.
Restoring them in CI needs a job with a postgres service INSIDE the playwright container, where the
service is addressed as `postgres:5432` and not `localhost:5432` as the `api` job does, because a
container job reaches services over the Docker network. That is a change that cannot be verified
locally — there is no Docker on the development machine — so it was not bundled into a fix whose
purpose was to unblock deploys.

**3. A load-sensitive web test, found by simulating CI rather than by reading it.** Running the
fixed `quality` job locally with `apps/api/.env` hidden surfaced
`SignIn.test.tsx > rejects an invalid address` timing out at vitest's 5000ms default, while passing
3/3 in isolation. `userEvent.type()` dispatches a full keyboard sequence per character through jsdom
and React, and this suite runs 29 jsdom environments in parallel. `apps/web/vitest.config.ts` now
sets `testTimeout: 20_000`. GitHub's runners have fewer vCPUs than the development machine, so a
margin already thin locally would have been thinner there.

This one is the argument for simulating a CI job instead of reasoning about it: four agents read
`ci.yml` against the repository and none of them could have found it.

## D-031 · The rebrand: the reference itself is reskinned to the finished brand

**Date:** 2026-10-07
**Approved by:** the user, in chat on 2026-10-07: "Can you use these finalized branding assets to
reskin the entire website?", supplying the brand package `Logo design discovery for Amplified
Impact/` (Brand Guide.dc.html, logo/svg/, logo/source/build.js). Asked whether the accent and
typeface pickers survive a fixed brand, the user answered: "Remove the pickers, lock it to the
brand."
**Scope:** all 25 `design-reference/*.dc.html` and `design-reference/lms-data.js`, the new
`design-reference/brand/`, `apps/web/src/styles/{tokens,global}.css` (regenerated), the new
`scripts/reference-tokens.mjs`, `apps/web/src/assets/brand/`, `BrandSlot`, `AppShell`, `NavItem`,
`__states`, `SignIn`, `AcceptInvite`, `prefs.ts`, `fonts.ts`, `index.html`, `ai101.html`,
`public/holding.html`, the email palette, `.railway/railway.ts`, and the tests and goldens listed
below.

### Why the REFERENCE changed, not just the app

CLAUDE.md makes `design-reference/` the oracle: the reference wins any disagreement, `tokens.css` is
generated from it verbatim, and goldens come only from capturing it. Reskinning the app alone would
have broken all three and failed every parity scenario on colour. So the reference was rebranded
first, the app's tokens were regenerated from it, and the goldens were recaptured from it — after
which parity proves the app carries the brand on every screen. The reference is no longer "the
handoff, unmodified": it is the committed reference, and it changes only through an entry like this.

Because `.gitattributes` marks `design-reference/**` as `-diff`, a reviewer cannot read this change
in the PR. This entry is the record of it.

### Sources, by hash

Brand package (sha256, first 16 hex): `Brand Guide.dc.html` 36a964a9bd3679ea ·
`logo/source/build.js` 0555493ab799eebe · `academy-app.svg` 28ac2dc4d23ecfaa · `favicon.svg`
838f67a39bb39920 · `signature.svg` 8e5aab2f5d9bfe84 · `signature-reversed.svg` 04649e8c0d65cd6a.

Committed copies in `design-reference/brand/` (and, byte-identical, `apps/web/src/assets/brand/`):
`academy-app.svg` 2fabb723dec6e06e · `academy-app-reversed.svg` fb9036a0e1a531cb ·
`favicon.svg` 9178f7868cf92116 · `signature.svg` 35686ed328e06e04 · `signature-reversed.svg`
ce828d06aff69d30. Each is the official drawing with only its ~7.7 KB C2PA provenance `<metadata>`
block removed. That is lossless, and was proven: `build.js`, run under a shim that redirects its
writes, reproduces all 11 official exports byte-for-byte once that block is set aside.

The package ships no reversed APP lockup, which the dark sidebar needs. It was generated with the
package's own `build.js` at `tone=dark;layout=app` — a combination the source already supports and
the guide itself draws on its LMS page — not drawn by hand. The guide says "edit the source, not the
exports"; this is the source's output.

Reference token block after the change: md5 `76d26ec2c1ac` (all 25 copies identical).

### The palette

Every brand colour is authored in `oklch()` (the email generator cannot read hex) and round-trips to
the brand guide's exact hex — verified three ways that agree on all twelve tokens checked: the
generator, Chromium's own painted pixels (canvas readback on the reference), and the guide's table.

| Token | Before | After | Brand role |
|---|---|---|---|
| `--ink-900`, `--text-primary` | `#110f0c` | `#15211d` | Ink |
| `--ink-100`, `--bg-canvas` (light) | `#f4f2ef` / canvas `#fbfaf8` | `#f4f2ec` | Cream |
| `--action-primary`, `--text-link` (light) | `#006663` (teal, sRGB-clamped) | `#1f4d40` | Forest |
| `--text-link-hover` (light) | teal | `#15211d` | Ink |
| `--action-on-primary` (light) | `#ffffff` | `#f4f2ec` | Cream letters, 8.55:1 |
| `--action-primary-tint` (light) | `#dff6f4` | `#e3efe8` | the guide's active-row tint |
| `--action-primary`, `--text-link` (dark) | teal | `#6fd3a5` | Energy Bright |
| `--action-on-primary` (dark) | white (inherited) | `#15211d` | Ink letters, 9.10:1 (new dark override) |
| `--bg-canvas` (dark) | `#0c0b08`-ish | `#15211d` | Ink |
| `--bg-sidebar` (light) | `--ink-100` | `--paper` | white sidebar on Cream, as the guide draws it |

The ink ramp is SPLIT, because the guide's own working greys are: grounds and lines warm (50-300,
hue 89-91, the Cream family), text greys green (400-900, hue 160-172, the Ink family). It reproduces
all of the guide's unlisted greys exactly — `#3e4a45` (ink-600, secondary text), `#5b6762` (ink-500,
tertiary), `#8a968f` (ink-400, disabled), `#d9d5ca` (ink-300, strong line), `#e9e5db` (ink-200,
line). A uniform green ramp was rejected: it turns Cream into mint, against "Cream default ground".

**Dark mode is an interpretation, not a transcription.** The guide's rule is "Primary buttons are
Forest", but Forest on Ink is 1.73:1, and `--action-primary` is also a foreground (focus borders,
the active nav icon, tab underlines). So dark mode uses the guide's own "Reversed" treatment —
Energy Bright on Ink — for buttons and links, with Ink letters. Light mode keeps Forest buttons.

**Three contrast regressions were found and fixed before anything was committed.** Making
`--ink-900` brand Ink (lighter than the old near-black) lifted every dark ground, and the guide's
disabled grey pulled `--ink-400` darker. Measured against the pre-rebrand palette:
`--status-success-on` fell 5.12 → 4.43 (now a literal near-black, 5.08); dark `--text-tertiary` fell
to 3.87 on some grounds (now a literal, 5.99-8.80, against the old 6.06-7.91); dark `--text-disabled`
fell to 2.01 (now a literal, 3.02-4.44, against the old 2.85-3.71). Light-mode tertiary and disabled
text both IMPROVED.

Unchanged: the status colours (success, progress, attention, locked), the avatar palette, every
radius, spacing value and type size, all copy and navigation, and the QR code.

**A brand-guide error, for the brand owner:** the guide gives Energy `#1F8A5C` as "4.3:1 on Cream".
It is 3.87:1 on Cream; 4.33:1 is the figure on white. Energy fails AA as text on either, so it
appears only in the logo artwork — never as a link, label or focus colour.

### The pickers

The accent (Pine/Indigo/Plum) and typeface (Hanken/Instrument Sans/Schibsted Grotesk) tweaks were
documented as "a tweak while the brand is undecided". They are removed from the reference
(`data-props`, `applyTweaks`, the `[data-accent]`/`[data-font]` rules, the pre-paint clauses, the
Google Fonts URL) and from the app (`prefs.ts` `Accent`/`Typeface`/`brandConfig`, `fonts.ts`
`loadAltFont`, two `@fontsource` packages, `VITE_BRAND_ACCENT`/`VITE_BRAND_FONT`). The light/dark
THEME picker stays: the guide defines a reversed treatment, so dark mode is on-brand. A stale
`accent` or `font` left in a browser's `localStorage` is ignored, and a test proves it.

`--accent-h` and `--accent-c` existed only to parametrise the tweaks, so they are gone: the `:root`
count is **75**, not 77 (D-003 amended). `--progress-h`/`--progress-c` stay.

### The logo

The two dashed placeholder slots (a 28×28 mark and a 132×22 wordmark, to be filled through
`VITE_BRAND_LOGO_URL`/`VITE_BRAND_WORDMARK_URL`) are replaced by committed artwork, following the
guide's rule — "use the app lockup in the LMS sidebar, on login screens and in emails", minimum
160 px — and its fallback, "below each minimum, switch to the next drawing down":

- expanded sidebar, drawer, sign-in and invite-accept: the `ai academy` app lockup at 161×34 (the
  guide's own sidebar size), reversed in dark theme;
- the 64 px collapsed rail: the favicon drawing at 28×28 (the guide sizes it for 16-32 px).

The lockup at 161×34 has about 11 px of vertical clear space in the 56 px brand row, short of the
guide's one-x-height (15.2 px). The guide's own sidebar sample makes the same trade, and keeping the
row at 56 px keeps it aligned with the 56 px page header. Accepted, deliberately.

The theme switch keys on `:root[data-theme]`, never on `prefers-color-scheme`: the app's theme is a
stored preference, and a dark app can run on a light OS. In the app the files are imported, and at
400-970 bytes Vite inlines them as `data:` URIs — allowed by the CSP's `img-src 'self' data:`, and
costing no request against the per-IP rate limit. `scripts/reference-tokens.mjs --check` fails lint
if the app's copies drift from the reference's.

**The brand row is no longer masked.** It was masked because both builds drew placeholders and the
real logo was meant to arrive later; now both sides draw the same files at the same size, so parity
compares them. `MASKS` is empty — there is no masked region at all. Removing a mask only tightens the
harness. Because a pixel diff cannot reliably see the wrong theme VARIANT (Ink letters for Cream on a
161×34 logo is well under 1% of the sidebar), `compliance/tests/e2e/brand.spec.ts` asserts it.

### The nav rows

Following the guide's LMS sidebar exactly: the active row is the `#e3efe8` tint
(`--nav-active: var(--action-primary-tint)`), with a Forest label and icon at weight 600 and no
ring or shadow; inactive rows are Ink (`--text-primary`) for label and icon, where they were
`--text-secondary`/`--text-tertiary`. Colours only — row geometry is the reference's.

### Favicon and the other surfaces

- The brand's favicon drawing, inlined as a `data:` URI in `index.html`, `ai101.html` and
  `holding.html`: zero requests, which keeps D-028's no-request property on `/ai101`.
- `/ai101` follows `tokens.css`, so it carries the new palette automatically.
- The www placeholder (`holding.html`, D-029) is rebranded: brand hex (it deliberately does not load
  `tokens.css`), the signature logo, and the guide's one-time 0.9 s intro — the dot lands with an
  overshoot, the ring expands, one echo fades — in CSS only, since that page's scripts are not
  CSP-hashed, and skipped under reduced motion.
- Emails take the new palette through the regenerated `EMAIL_TOKENS`. The lockup in emails (which
  the guide asks for) is NOT done: it needs a hosted raster and cannot be tested until email sends.

### Not done, deliberately

- **Icons.** The guide's icon rules (1.75 stroke, a separate filled 4-5 px dot, Energy on the active
  icon) need the dot as its own element, which the single-path `ICONS` model cannot express, and the
  guide supplies only 12 drawings for an 81-icon set. Swapping in those 12 would mix two styles in
  one sidebar column. Icons are recoloured through tokens only; a designer-exported set is the
  follow-up.
- **The guide's LMS login mock** has a password field, "Forgot Password?" and new taglines. The
  product signs in by magic link and its copy is exact (§ 7.5), so only the logo was adopted.
- **The apex domain and the email lockup**, as above.

### What this moved

- Goldens: all 98 `.json` fingerprints and all 98 `win32/` PNGs recaptured from the rebranded
  reference. The authoritative `linux/` set comes from the CI goldens job's container artifact.
- Measured on win32 before commit: fixture parity 55 of 55 on pixels and fingerprints; the only
  failures were D-010's contrast allowances, re-keyed below.
- D-010: the rebrand closed two of its five allowances (dark white-on-Pine 4.48 and its hover 3.49,
  now 9.10 and 10.94). Three remain, re-measured with axe on the reference: `#8a968f` on `#ffffff`
  3.07, `#8a968f` on `#f4f2ec` 2.74, `#78837d` on `#111c18` 4.43 — each better than before.
- Tests: `tokens.spec.ts` (75; theme combos only — the accent/font combos would have passed
  vacuously), `email-tokens.mjs` and `email/tokens.test.ts` (75; pins re-measured in Chromium, and a
  new pin against the guide's hex), `a11y.ts`, `signin.spec.ts` (one brand slot), `prefs.test.ts`,
  and the new `brand.spec.ts`.
- `handoff-starter/` is frozen as the historical handoff and is not updated.

## D-032 · /ai101 click paths: every setup step ends in one tap or one paste

**Date:** 2026-10-07
**Approved by:** Connor Leiva, in chat on 2026-10-07, supplying the brief "Handoff: AI 101 Setup Page,
Click-Path Updates" for the eXpCon session on Thursday, October 8, 2026. The brief is not in the
repository; its copy is in `apps/web/src/ai101/content.ts`, and its URLs are typed out as the oracle in
`render.test.ts`. Its rule 8 — work on a branch, do not deploy until the preview is reviewed — is how
this landed.
**Scope:** `apps/web/src/ai101/{content,render,main,ai101.css}.ts|css`, their tests, the new
`apps/api/src/routes/ai101-calendar.ts`, `apps/api/src/routes/ai101.ts` (one route), and
`apps/api/test/{ai101,authz}.test.ts`.

Amends D-028 (the page itself). Everything below is the brief's, except where it says otherwise.

### What the page gained

- **"Before we start: get the app and sign in."** between the jump links and Step 1. The links default
  to the download pages; the script swaps in the App Store or Google Play by platform, treating a
  "Macintosh" with touch as the iPad it is.
- **Device badges** at the top of both step cards.
- **Copy & open ChatGPT / Copy & open Claude** beside "Copy prompt", opening a BLANK chat. Never a
  `?q=` prefill: ChatGPT's sends the prompt before its brackets are filled, Claude's shows a caution
  banner. A test asserts no `?q=` anywhere on the page.
- **Step 1 item 4** names where each app keeps instructions and links straight there; "custom GPT"
  is gone, because free ChatGPT cannot create one and this step promises free. ChatGPT's link is
  `chatgpt.com/settings/personalization?instructions=chatgpt`, which Connor supplied after the brief
  (2026-10-07): it lands on Custom instructions itself, so the brief's "Scroll to Custom instructions
  and click ChatGPT." is gone too, and the test oracle carries this URL in place of the brief's
  `#settings/Personalization`. Phones still get the app's menu path instead. Items 1, 2, 3 and 5,
  the voice profile prompt, and the Carousel Creator instructions are byte-for-byte unchanged
  (checked against the pre-change file).
- **Step 2:** `claude.ai/design` linked in the table; "Send this to my laptop" (the share sheet, or a
  mailto: without one); the six-item checklist replaced by the brief's four; tap-to-copy starter
  chips; and **About you**, whose fields are written live into the instructions' last line under the
  brief's assembly rules, so what a visitor sees is what they copy. Saved in localStorage, every
  access guarded.
- **Sprint calendar:** "Apple or Outlook" and "Google Calendar".
- After any copy the control reads "Copied" for two seconds and the live region says "Copied to
  clipboard." (it said "{prompt} copied").

### Calls made inside the brief

- **Copy & open, one tap.** On a phone the app can take focus before an async `writeText` resolves,
  and a rejected promise's fallback would then run too late. So the click starts BOTH writes: the
  hidden-textarea `execCommand('copy')`, which finishes before the handler returns and so before the
  link is followed, and `writeText`. They write the same text. This is unproven on real phones, so
  the brief's two-tap fallback ("Copied. Open ChatGPT", then open) is built and tested too, behind a
  one-character switch (`COPY_OPEN_TAPS` in `main.ts`).
- **The checklist's links sit OUTSIDE each `<label>`.** The brief keeps the checkbox markup; the bold
  title is the label, and the instructions, buttons and chips follow it. Inside the label, tapping
  "Open Claude Design" would be part of the box's accessible name, and the whole paragraph would be
  read as the checkbox.
- **A button inside a sentence gets its own line.** Inline, a 44 px button split "Click New project,
  top right." across lines on a phone. The phone path that replaces "Open ChatGPT settings" sits in
  the same place.
- **The .ics is a route, not a static file.** A static file counts against the global per-IP limit,
  which a room behind one venue NAT shares — the reason D-028 exempted the page. The route serves
  the same bytes at the same URL as `text/calendar; charset=utf-8`, CRLF, folded at 75 octets, and
  is exempt. Its test holds it line for line to the brief's calendar, typed out in the test.
- **Panels that only work with JavaScript render `hidden`** (About you, the chips' hint) and the
  script reveals them; a visitor with scripting off sees prompts and plain links that work, and no
  fields that do nothing.
- **Section 8 (waitlist email) is a no-op:** the handler stores the sign-up and sends nothing, so
  the form is unchanged, as the brief says for that case.

### After Connor's review of the preview (2026-10-07 and 08)

- **The ChatGPT deep link** (above, under Step 1 item 4).
- **App marks on the buttons.** Every button that opens ChatGPT or Claude carries that app's mark, so
  a visitor can tell them apart at a glance (Connor asked). One 0 by 0 sprite of two `<symbol>`s and
  a `<use>` per button, in `currentColor`, `aria-hidden`; the button's words still name the app. The
  path data is simple-icons' (OpenAI's from 15.22.0, the last release that has it; Claude's from
  16.32.0), copied by script into `logos.ts`. **Open before deploy, and Connor's call:** OpenAI's
  brand page allows its mark only as OpenAI's own file, unmodified, black or white, with no implied
  endorsement; Anthropic's trademark guidelines allow the Claude mark only in materials Anthropic
  approves beforehand, with no change of color; simple-icons dropped OpenAI in 16.0.0 because no one
  obtained OpenAI's permission, and its Claude icon is a community trace. Taking the marks off is
  `logo()` returning `''`.
- **About you says what it does:** "What you type here fills in the instructions below, ready to
  copy. It stays on this device. All fields are optional." (Below: the panel sits directly above the
  instructions.)
- **Checklist item 1 builds the brand from a chat, and brings the ask.** Connor's question: the
  button opened a new Claude Design project, and nothing told it to make a design system. Anthropic's
  Help Center (setup article and "Get started", both updated late September 2026) bears that out:
  since September 16, 2026 Claude Design runs inside any Claude chat; a design system is made there
  by ASKING for one ("From a chat") and is kept in Settings > Design systems, where any chat can use
  it; files dropped into a new design are reference for that design only. The standalone app at
  claude.ai/design builds a system through its own onboarding, and its "Published" toggle covers
  only projects started from its home screen; no source says such a system reaches a Project chat
  without a migration step. So item 1 now brings a **Brand prompt** (ours: Anthropic publishes
  none), with Copy prompt and Copy & open Claude like the page's other prompts. The visitor pastes
  it into the new chat FIRST, adds any brand colors or fonts they know, and only then attaches the
  logo, headshot and posts: a screenshot taken or attached through the clipboard would replace the
  prompt Copy & open had just put there. Then "See my design systems"
  (`claude.ai/settings/design-systems`, the URL the Help Center links) to check it was saved, what
  to say if it was not, and a link to Settings > Capabilities for the switch artifacts need
  (`claude.ai/settings/capabilities`, also the Help Center's). The prompt names the system "My
  Carousel Brand" so the weekly chat can be pointed at it. The layers row links the same settings
  page, and the brief's `claude.ai/design` is no longer on the page. Two links are now "Copy & open
  Claude", so each Copy & open is described by its prompt's label, as the Copy prompt buttons are.
  The checklist id stays `design-system`, so a saved tick survives. An adversarial review (three
  lenses, each finding re-checked) found the paste order, the missing "not listed?" step and the
  unlinked Capabilities hint; all are fixed.
- **Not verifiable from here, so on the phone-and-laptop test list before the session:** that the
  settings URL loads for a signed-in Pro account; that the prompt saves a design system rather than
  making one design; that a design made in a Carousel Creator Project chat uses it; that accounts
  not yet on the new combined Claude (rolling out in stages) can do the same; and the protected
  "How a week works" step 4, since the Help Center lists no PNG export and Canva documents only
  slide decks as converting cleanly.

### Not done, and why

- **The jump links stay 32 px tall.** The brief's 44 px rule is in its button list; the jump links
  are existing navigation it does not mention.
- **No third-party iCalendar parse.** None is installed, and adding one is a download that needs the
  owner's approval. The file is checked structurally against RFC 5545 and against the brief's text.
- **Real-device behaviour** (app switching, store links, the share sheet, Add to Calendar) cannot be
  tested from here. The brief's phone test list is the check, before deploy.

Page weight: one response, 67 KB (18 KB gzipped) as first built and 76 KB (21 KB gzipped) after the
review changes, and still exactly five requests on load (the page and its four font files).

## D-033 · The /ai101 waitlist is copied into GoHighLevel, by a loop of its own

**Date:** 2026-10-07
**Approved by:** the user, in chat on 2026-10-07. Asked how to get the waitlist into their GHL CRM
("not sure if [GHL forms are] the best way to go or if we just leverage an API key"), they chose the
API route, supplied the location id, approved the proposed tags with "Tags approved, add src-ig,
build it", and created a Private Integration token — to be set in Railway as `GHL_TOKEN`, and never
pasted into chat.
**Scope:** `apps/api/src/integrations/ghl.ts`, `apps/api/src/jobs/ghl-sync.ts`, `apps/api/src/server.ts`,
`apps/api/src/db/schema.ts` and the generated migration `apps/api/drizzle/0004_jittery_lord_hawal.sql`,
`.railway/railway.ts`, their tests (`src/integrations/ghl.test.ts`, `test/ghl-sync.test.ts`,
`src/db/schema.test.ts`).

**Not a GHL form embed.** The page's CSP is `default-src 'self'` with hashed scripts only, so a GHL
iframe and its `form_embed.js` would be blocked unless the policy were opened to GHL's domains; and
the page exists to work on a phone on conference Wi-Fi as one small response, with no JavaScript
required, its own honeypot and rate limit, and the `?src=` attribution. A third-party embed would
cost all of that. The existing form stays exactly as it is.

**The row is the system of record; GHL is a copy.** The route still stores the sign-up and answers
the visitor; nothing in this change touches `routes/ai101.ts`. A separate loop copies stored rows
into GHL afterwards, so GHL being slow, down or misconfigured can never refuse, delay or lose a
sign-up, and a sign-up made in any of those states is copied once it is back. The rows that predate
this change have `ghl_synced_at` null, so the first tick IS the backfill.

**Its own loop, not a scheduler job.** `server.ts` explains that the email scheduler follows
`fixtureOnly` because arming it "is a decision about the program's emails". This is about the
waitlist, which exists whenever a database does, so it is armed by the database and BOTH of
`GHL_TOKEN` and `GHL_LOCATION_ID`, and off (saying so in the log) otherwise. A GHL outage cannot
delay a reminder email, nor the reverse. Production only: `.railway/railway.ts` gives staging no GHL
variables, so its test sign-ups can never reach the real CRM.

**One tick:** claim up to 25 due rows in ONE statement (`FOR UPDATE SKIP LOCKED`, each given an
attempt and a 15-minute lease), commit, then call GHL outside any transaction, then record each
outcome. A process that dies mid-sync leaves the lease to expire; a second replica skips locked rows.

**Two calls, because of a real GHL pitfall.** HighLevel's `POST /contacts/upsert` REPLACES every tag a
contact has when it is sent `tags`. An existing client joining the waitlist would silently lose
every tag marketing ever gave them. So the upsert carries no tags, and a second call,
`POST /contacts/{id}/tags`, adds them — sent the UNION of the contact's existing tags (from the upsert
response) and ours. GHL's docs do not say whether that call appends or replaces; with the union it
is correct either way. A tag that still goes missing is logged by name.

**Attribution lives in tags, never in GHL's `source` field.** Tags accumulate; `source` is one value,
and an upsert would overwrite an existing client's original lead source with this page.

**The tags,** as approved: `ai101-waitlist` (every sign-up; the tag GHL workflows trigger on),
`event-expcon-2026` (every sign-up from this page), and one channel tag — `src-qr` (the printed
code), `src-ig` (the Instagram link), `src-direct` (no `?src=`). `?src=` is in a public URL anyone can
edit, so it is an ALLOW-LIST: any other value becomes `src-other`, and the raw value stays in the row.
Brokerage goes to the contact's Company Name, only when given (an empty value would blank an existing
contact's). Workflow-state tags (`ai101-welcome-sent` and so on) are GHL's to set, not the site's.

**Two kinds of failure, so an outage cannot spend the list's retries.** A ROW failure (GHL refused
this contact: 400/422, or an unreadable answer) counts an attempt and backs off — 1 min, 5, 15, then
1 h, 3, 6, 12, 24 — and after the eighth it stops, leaving the row unsynced with the reason in
`ghl_error` (reset `ghl_attempts` to 0 to retry it). A SYSTEMIC failure (401/403, 429, 5xx, timeout,
no network) is nothing to do with the row: the tick stops, the attempt is handed back to that row
and every row not yet tried, and they all pause — 15 minutes for a rejected token, 2 otherwise. A
revoked token therefore never exhausts anyone's retries; fixing it in Railway resumes the sync.

**Privacy.** Log lines carry row ids, counts, status codes and tag names; never a name, an address,
the token or a GHL response body (which can echo the request). `ghl_error` stores a step, a kind and
a status, never a body. A test sweeps every log line of both failure paths for the visitor's details.

**Verified:** 23 client tests against a fake GHL, 12 sync tests against a real Postgres (the test
database migrates through `0004`, so the migration applies), and five deliberate sabotages each
caught by a test — tags in the upsert, no union, no allow-list, systemic failures spending attempts,
and a claim that ignored `ghl_synced_at`.

**Consent columns, for D-034, in this same migration.** The /ai101 session is redesigning the form
for consent (D-034, recording the user's decisions of 2026-10-08: an optional mobile number; joining
is email consent plus agreeing to the Terms and Privacy policy; a separate, unchecked, optional SMS
box). It asked for the columns here so the two branches share ONE migration: `phone` (E.164),
`sms_consent` (boolean, default false), `sms_consent_at` (epoch ms, like every instant in this
schema, rather than the `timestamptz` first proposed), `sms_consent_text` (the exact wording shown)
and `terms_version`. A CHECK constraint, `ai101_waitlist_sms_consent_proof`, refuses SMS consent
without its number, time and wording: a "yes" to texts with no evidence is the record carrier rules
(10DLC) make dangerous to hold. The form, the validation and the wording are D-034's.

**A phone number reaches GHL only with SMS consent.** GHL can text any contact with a number — a
workflow, a bulk send, a mis-built filter — so the guarantee that someone who did not tick the box is
never texted is made by GHL never having their number. A number given without consent stays in the
row. With consent, the number is in the upsert and the contact gets one more tag, `sms-consent`,
which every SMS workflow should filter on. Email consent comes with every row. Ignoring the consent
check fails five tests across both suites.

**The consent line** on the page reads "We'll email you about the December agent track. Unsubscribe
anytime." Mail sent from GHL to this list should stay within that promise, or the line should change
first; D-034 is rewriting it.

## D-034 · /ai101 becomes the workshop design's step-through, and the waitlist records consent

**Date:** 2026-10-08
**Approved by:** Connor Leiva, in chat on 2026-10-08: "I want to redo this landing page. It needs to be
a step-through workflow so people can more easily follow along," supplying the design "AI 101 for
Agents - Workshop" (a Claude Design export, not in the repository); then "We also need a checkbox
where they agree to our terms of service (so we can sms and email them from Spring, Connor, Amplified
Impact or any Spring B companies)". Asked, he chose: an optional phone field with a SEPARATE optional
SMS box (joining covers email); drafted Terms and Privacy pages for his review; the senders "Amplified
Impact, Spring B and its affiliated companies, Spring, and Connor"; and the corrected brand step in
the design's look.
**Scope:** `apps/web/src/ai101/*`, two brand files copied into `apps/web/src/assets/brand/`, and the
waitlist's validation and insert in `apps/api/src/routes/ai101.ts` with their tests. The consent
COLUMNS are D-033's migration (one migration for both branches).

Amends D-028 and D-032.

### The page

- **Twelve screens, one at a time**: Welcome; Step 1 in four (collect samples, fill two blanks and
  copy, save it, test it); Step 2 in five (overview, brand, about you, make the Project, first idea);
  your week; the December waitlist. A sticky header carries the stage, "n of N" and a progress bar; a
  fixed footer carries Back, the design's per-screen Next label, and Start Over on the last screen.
  The words are the design's, verbatim, except as listed below.
- **Progressive, as D-028 requires.** Every screen is a `<section data-screen>` in the one HTML
  response. Without JavaScript they all show in order, each set off by a rule, with links that work;
  the header and footer exist only once the script is running (`data-steps-chrome`), so a failure can
  never leave buttons that do nothing. The fields that fill prompts and the Claude/ChatGPT switch are
  hidden without the script; both Save panels show, each under its app's name.
- **The visitor's place is remembered** (the design's `localStorage` key, `ai101-v2`: the screen,
  the app picked, every field), every access guarded. A link to any id on the page wins over the
  saved place, so `#carousel-creator` (the "Send This to My Laptop" link and "Skip to Step 2"),
  `#waitlist`, the waitlist's own `#waitlist-joined` / `#waitlist-error` and every anchor the slides
  and QR codes use still land on the screen that holds them. Next and Back move focus to the new
  screen's heading.
- **The fields fill the prompts as typed**, as the design does: the city and client mix into the
  voice profile prompt; About you into the Carousel Creator instructions' "About me" block and "My
  voice profile" slot (questions one per line, as a list); the brokerage also into the brand prompt.
  An empty field keeps its highlighted placeholder; what a visitor types is never a placeholder.
- **Copying keeps D-032's machinery** (both writes inside the tap, the two-tap fallback switch, a
  failed copy that selects the prompt and leaves the next tap to open the app), with the design's
  toast in place of the "Copied" label. The toast IS the polite live region (`#ai101-live`).

### Where the build differs from the design file, and why

- **The brand screen** keeps D-032's corrected flow (Connor's choice): Copy & Open Claude with the
  brand prompt, paste then attach, "See My Design Systems"; Next reads "My Brand Is Saved" for "Brand
  Is Published". The design's claude.ai/design + "Published" steps do not save a brand that a Project
  chat can use.
- **Links**: "Open ChatGPT Settings" is Connor's deep link (D-032), not the design's
  `#settings/Personalization`; "Get ChatGPT" / "Get Claude" keep D-032's download pages with the
  platform's store swapped in, where the design links the web apps; the calendar keeps D-032's served
  `.ics` (iOS's "Add to Calendar") and fixed sprint dates, where the design builds a `data:` file for
  "next Monday" in the browser.
- **The waitlist form shows.** In the design file it never renders (its condition is never set);
  it is built here as the design draws it, plus the consent below.
- **Fixed from the design's own measurements**: the toast no longer spills off a 375px screen; the
  header and footer columns line up with the content at desktop; long Next labels fit at 375 (16px
  side padding, not 22); the questions box grows with its text where the browser can.
- **Fonts: four files, as before** (Hanken Grotesk 400, 700, 800; DM Mono 400). The design's one DM
  Mono 500 (step numerals) is drawn at 400. Every font file counts against the venue's shared per-IP
  limit (D-028).
- **Colours.** Cream, ink and forest are exactly tokens. Three accents are not: the brand mark's green
  and mint and a terracotta. They are page variables in `ai101.css` with the design's exact values,
  defined once and used only through those names, and every tint is a token mixed toward
  transparent. This is the one place the page goes beyond `tokens.css`; the alternative was the
  nearest status tokens, which would not be the design.
- **No app logos.** The design has none, so the ChatGPT/Claude marks added on 2026-10-07 are gone
  (`logos.ts` deleted), which also settles their brand-guideline question.
- **The brand logos** are the repository's own signature files, inlined, not the design's 16 KB
  traced copies of the same mark.

### Consent

- **Joining is email consent and agreement to the Terms of Service and Privacy Policy**, said under
  the button with links to `/terms` and `/privacy`, and recorded on every new row as
  `terms_version` (`'2026-10-08'`).
- **Texts are separate**: an optional mobile number and an unchecked, optional SMS box whose label is
  the consent itself (senders, purpose, automated, not required, frequency, rates, STOP, HELP). Only a
  ticked box with a valid number records `sms_consent`, with the time and the exact wording
  (`SMS_CONSENT_TEXT`, held equal to the page's label by a test); D-033's CHECK refuses a "yes"
  without all three. Ticked with no number is refused against the phone field. A number without the
  box is kept and never texted. Numbers are normalized to E.164 on both sides with one rule, and
  never logged.
- **A duplicate sign-up stays a no-op**, as D-028 has it, so someone who joined without the SMS box
  and comes back to tick it is not upgraded. Changing that touches D-033's sync and is left for
  after the session.
- **The Terms and Privacy pages are drafts** for Connor or counsel to review before anyone signs up;
  their open facts are bracketed placeholders.

### Not verifiable from here

Real phones (app switching, the share sheet, store links, the toast over the keyboard), and every
Claude Design behaviour D-032 lists. The deploy also carries D-033's sync and migration 0004.

### The review before deploy (2026-10-08)

Three adversarial lenses (the step-through and old browsers; consent and the legal pages; fidelity
to the design), each finding re-checked by a second reviewer. Fixed:

- **A double tap on Next moved two screens**, and on "Your Week" its second click landed on Start
  Over (which takes Next's place) and sent the visitor back to Welcome, past the waitlist. The
  footer now ignores a second tap within 600 ms.
- **The SMS label lacked TCPA's "not a condition of purchase"**: it now reads "Consent isn't required
  to join or to buy anything." in all seven copies (page, API, Terms, tests).
- **The Terms and the Privacy Policy disagreed** on who a mobile number is shared with; both now say
  it with one constant (`SMS_SHARING`).
- **Without color-mix()** (iOS 15.4 to 16.1 and their in-app browsers) field borders, card borders,
  focus rings and callout tints vanished and placeholders looked like typed answers. An
  `@supports not` block falls back to plain tokens.
- **The sticky header and fixed footer covered** the focused field, the line being typed, and a
  linked section ("#carousel-creator" from the laptop email): `scroll-padding` on the page.
- **The toast left the accessibility tree when empty** (`display: none`), which can cost the next
  announcement; it is now invisible instead. The joined-state rule no longer shares a selector list
  with `:has()`; the week tiles go two a row under 360px; hover colours apply only where there is
  hover; field hints sit on their own line; the profile box keeps four rows; callout dots are
  centred and a few sizes match the design's measurements.

Accepted, not fixed today: without JavaScript a phone mistake lands on the generic error line, and a
few lines of copy ("Tap one to copy it") assume the script; the stored SMS wording is the server's
current constant, so it must not change while visitors have the page open (said at the constant);
the Terms and Privacy pages were drafts when the review ran; Connor supplied their facts the same night
(D-035) and they went live with this page.


## D-035 · /terms and /privacy: draft legal pages for the /ai101 waitlist's consent

**Date:** 2026-10-08
**Requested by:** the user, in chat on 2026-10-08: "We also need a checkbox where they agree to our
terms of service (so we can sms and email them from Spring, Connor, Amplified Impact or any Spring B
companies." A consent line has to link to real pages, so these are those pages. They are **drafts**,
written by an AI assistant and not a lawyer, for Connor or a lawyer to review before anyone signs
up. This entry records how they are built and served, not approval of their words.
**Scope:** `apps/web/{terms,privacy}.html`, `apps/web/src/legal/**`,
`apps/web/src/assets/brand/amplified-impact-signature.svg` (a byte copy of the brand file),
`apps/web/{vite.ai101.config.ts,vite.config.ts}`, `apps/web/src/ai101/vite-plugin.ts` (helpers
exported, the inliner takes a list of pages), `scripts/check-css-colors.mjs`, the new
`apps/api/src/routes/legal.ts`, `apps/api/src/{app,server}.ts`, `apps/api/src/routes/marketing.ts`,
and their tests (`apps/web/src/legal/render.test.ts`, `apps/api/test/{legal,authz}.test.ts`).

Net-new UI outside the reference, like /ai101 (D-028), so there is no parity scenario: the contract
is `content.ts` and the two test files.

Numbered D-035 because D-034, on the `ai101-step-through` branch, is the redesigned /ai101 page
whose waitlist form links here and stores the consent these pages describe.

**What the pages say.** Plain-English Terms of Service and Privacy Policy for the /ai101 page, its
waitlist and the emails and texts that follow. The Terms carry the SMS program terms US carriers
look for (program name "Amplified Impact updates", what is sent, "Message frequency varies", "Msg &
data rates may apply", STOP and HELP, "Carriers are not liable for delayed or undelivered messages",
consent not a condition of joining or of any purchase). Both pages quote the waitlist form's two
consent lines verbatim (`CONSENT` in `content.ts`, held to literals in the test), so the form and
the pages cannot quietly disagree: a change to the form's wording must change `content.ts` too.
The privacy claims were checked against the code: what a visitor types to fill the prompts, and
their progress, live in `localStorage` and are never sent; the only request the script makes is the
waitlist POST of the form's own fields (`apps/web/src/ai101/main.ts`, here and on D-034's branch);
the page loads nothing from another origin (the CSP's `default-src 'self'`, self-hosted fonts); and
the server log does record the IP address and URL of each request (`productionLogger`), which the
policy says. GoHighLevel is named only as an example of the CRM category: its sync (D-033) is on
the `ghl-waitlist` and `ai101-step-through` branches, not this one.

**Every unknown fact is a `[bracketed placeholder]`,** highlighted on the page: legal entity names
and how each is formed, Spring's and Connor's full names, a contact email, a privacy contact email,
a mailing address, the governing-law state and court venue, the liability cap, and three retention
periods. `DRAFT = true` in `content.ts` puts a "Draft for review" note at the top of both pages and
a `noindex` in their heads; the test fails if `DRAFT` is turned off while any placeholder is left.

**Built with /ai101, not by a new pipeline.** `vite.ai101.config.ts` now has three HTML inputs;
`legalRender()` fills the two new shells, and `ai101Inline` inlines each page's stylesheet. The two
legal pages share one stylesheet, which Rolldown emits once, so the inliner now removes an inlined
file only after every page has its copy. `dist/ai101.html` and `dist/index.html` were compared with
a build of the parent commit: byte-identical. Each legal page is one response with no script: on
load it makes exactly three requests (the page and two font files, Hanken Grotesk 400 and 700).

**Served like /ai101** (`routes/legal.ts`): from memory, rate-limit exempt, `no-cache` with a strong
ETag, `Referrer-Policy: same-origin`, a JSON 404 when not built, in both modes. `@fastify/static`
ignores `terms.html` and `privacy.html` so each page has one URL. `marketing.ts` lets exactly
`/terms` and `/privacy` (with or without a query) through on the marketing host; lookalikes such as
`/terms-old` still go to the placeholder. Both routes are in `authz.test.ts`'s inventory as `page`.

**Open, and Connor's (or a lawyer's) call before launch:**
- ~~Fill every placeholder, have the words reviewed, then set `DRAFT = false`.~~ **Done 2026-10-08:**
  Connor supplied the facts (Amplified Impact, LLC; SB Coaching, LLC for Spring B; Spring Bengtzen
  and Connor Leiva; admin@amplifiedimpact.io for contact and privacy; 1173 N Shepard Crk Pkwy Ste A,
  Farmington, UT 84025; Utah law, Davis County; the $100 cap) and asked for recommended retention
  periods, which are now the standard: the waitlist while someone is on it and up to two years after
  the last contact; consent and opt-out records five years after they are given or withdrawn (TCPA
  claims can be brought for four); technical logs up to 30 days (Railway's log retention, as the
  plan in use keeps them). Neither LLC's state of formation was given, so the entity sentences name
  the company only; the venue is the Davis County state courts or the District of Utah, since no
  federal court sits in Davis County. `DRAFT = false`. A lawyer's read is still recommended.
- The consent names several senders, including "Spring B and its affiliated companies". 10DLC
  campaign vetting commonly expects a privacy policy to say mobile opt-in data is not shared with
  third parties *or affiliates*. The policy says it is shared only among the named senders and the
  providers that deliver the texts. Whether one registered campaign can cover every sender is a
  question for the texting provider and a lawyer.
- The policy says the waitlist keeps the exact SMS consent wording, the time it was given and the
  terms version agreed to, and that a number given without the box is never texted. That is what
  D-034's route does on `ai101-step-through` (`SMS_CONSENT_TEXT`, `terms_version = '2026-10-08'`,
  D-033's CHECK), checked by reading that branch; this branch alone does not have it. If either
  side changes, change the other.
- The opt-out words listed (STOP, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, OPT OUT) must be honored by
  whatever sends the texts.

## D-036 · The voice profile prompt becomes Connor's forensic-linguist prompt

**Date:** 2026-10-08
**Approved by:** Connor Leiva, in chat on 2026-10-08: "I want to update the voice profile prompt. It's
way too generic right now. Here's what I want instead," with the full text.
**Scope:** `apps/web/src/ai101/{content,render,main}.ts` and their tests. Amends D-034.

- **The prompt is his, word for word** (8,409 characters; a test and a browser check hold the
  copied text equal to it): samples sorted and set aside with reasons, every rule rated and cited,
  a QUICK CARD under 1,500 characters, the never list, channels, beliefs, stories, the draft rules
  and self-check, and ABOUT ME lines at the end.
- **The two fields on "Fill in two blanks" now fill ABOUT ME lines**: "Your city or market" after
  "My market, and what I'm known for:", "Your clients are mostly" after "My clients are mostly:"
  (`UI.lineSlots`). The old prompt's `[city or market]` and `[buyers, sellers, or both]` are gone.
- **Its `[VERIFY: what's needed]` and `[VERIFY]` are the prompt's own words**, not blanks, so they
  are listed in the prompt's `literal` and drawn as plain text, and `main.ts` now repaints from the
  pieces `render.ts` drew rather than re-finding brackets.
- **Copy changed to keep the screens true** (the design's words otherwise):
  "Then, in the new chat": "Replace the last line with your samples" became "Finish the ABOUT ME
  lines at the bottom." and "Paste your samples under them, then send." (the last line is now
  "Phrases I can't stand:"). "Save it": copy only what is between the START OF PROFILE and END OF
  PROFILE lines (the answer carries set-aside notes, gaps and questions after it), and for ChatGPT
  paste the QUICK CARD, which the prompt writes to fit Custom instructions' ~1,500 characters. The
  About you profile field's hint says the same START/END. The Carousel Creator instructions are
  unchanged.

## D-037 · Part I and Part II, desktop web links, clearer Projects, a named design system, and a direct link to the waitlist

**Date:** 2026-10-08
**Approved by:** Connor Leiva, in chat on 2026-10-08 (the morning of the session).
**Scope:** `apps/web/src/ai101/content.ts` and the page's tests; `apps/api/src/routes/{ai101,marketing}.ts`
and their tests; `apps/web/public/waitlist-qr.svg`. Amends D-034 and D-036.

- **Part I and Part II.** The two halves are "Part I · Voice Profile" and "Part II · Carousel
  Creator" everywhere they were "Step 1" and "Step 2" (header, Next labels, Skip, the done lines, the
  laptop handoff, the About you field); the screens inside each stay steps, "1 of 4".
- **"Get ChatGPT" and "Get Claude" open the web apps on a desktop** (`chatgpt.com`, `claude.ai`), not
  the download pages: a laptop on hotel Wi-Fi signs in in the browser. Phones still get the App
  Store or Google Play (D-032's swap).
- **Both Projects say what to do with Claude's New project box**, which asks for a name and a
  description first: name it ("My Voice" for Part I's profile, Connor's question answered with that
  recommendation; "Carousel Creator" for Part II), leave the description blank, and paste into
  Instructions on the right, not the description.
- **The Carousel Creator instructions name the design system.** Their one design line was "Use my
  design system for colors, fonts, logo, and headshot"; it now says to build the slides in Claude
  Design with "My Carousel Brand" (the name the brand prompt gives it) and to say so before designing
  if it cannot. D-032's research found a design may ignore the system unless it is named.
- **A direct link to the waitlist**, for the pitch at the end of the session: `/waitlist` (both hosts;
  let through on www) answers 302 to `/ai101?src=waitlist#waitlist`, which opens the page on the
  waitlist screen with no steps before it; a link with its own `?src=` keeps it. 302 rather than 301
  because the QR code is printed and a cached 301 would outlive any move. Rate-limit exempt, like
  the page. `#waitlist` itself always worked, and still does.
- **Its QR code**, `apps/web/public/waitlist-qr.svg`, encodes
  `https://www.amplifiedimpact.io/waitlist?src=waitlist-qr` (55 bytes, byte mode, error correction Q:
  version 5, 37 by 37 modules, mask 6, a 4-module quiet zone, 25 px a module), made with node-qrcode
  1.5.4 as D-028's was, from a copy already installed on the machine. Verified independently:
  rendered in Chromium and decoded with jsQR 1.4.0 back to exactly that URL at 1125, 600, 300, 150,
  110 and 90 px.

## D-038 · /task-sync-starter: a gated landing page for the Task Sync Starter Kit

**Date:** 2026-10-13
**Approved by:** Connor Leiva, in chat on 2026-10-13: "build a new landing page at
www.amplifiedimpact.io/task-sync-starter and host this PDF on the site and have a 'Download Here'
option ... Let's have this gated so they opt in to comms with their email and have them routed to GHL
and tagged as something." For the ManyChat automation on his new Reel.
**Scope:** `apps/web/src/tss/*`, `apps/web/task-sync-starter.html`,
`apps/web/public/downloads/task-sync-starter-kit.pdf`; `apps/api/src/routes/{ai101,task-sync-starter,marketing}.ts`,
`apps/api/src/{app,server}.ts`, `apps/api/src/integrations/ghl.ts`, `apps/api/src/jobs/ghl-sync.ts`;
`apps/web/src/legal/content.ts`. Amends D-028, D-033, D-034 and D-035.

- **The page** is built and served exactly as /ai101 is (D-028): string-rendered from `content.ts`
  at build time, its CSS and script inlined into one response, read into memory at boot, `no-cache`
  with a strong ETag, exempt from the global limit, `Referrer-Policy: same-origin`, its inline
  script hashed into the CSP. `/task-sync-starter/` is a 301 to it, query kept. www lets the path
  through (`PUBLIC_PREFIX`). The look is the kit's cover: forest hero, cream page, the brand's mint
  and green, mobile first for the Instagram in-app browser a ManyChat DM opens.
- **The words are the kit's own** (cover, page 2, its three steps), so the page promises what the PDF
  delivers. No em dashes.
- **The gate is soft, as lead magnets are.** The opt-in (first name, email) and the "Download Here"
  link are both in the markup; the link shows once the API has stored the sign-up (script), or via
  the no-JS form's 303 to `#download` (CSS `:target`). A device that opted in sees the download on
  every later visit (`localStorage` `tss-unlocked`). The PDF itself is a plain static file at
  `/downloads/task-sync-starter-kit.pdf`, sent with `X-Robots-Tag: noindex` so it stays out of search,
  and saved as "Task Sync Starter Kit - Amplified Impact.pdf". In Instagram's and Facebook's in-app
  browsers a line says how to open it in the real browser to save it.
- **The opt-in is the waitlist's route under a second path**, `POST /api/task-sync-starter`, with the
  same validation, honeypot, origin check, body limit and its own 300/min limit, writing to the same
  `ai101_waitlist` table under `source = 'task-sync-starter'`. No migration: the table already had
  `source` and a unique (email, source), so someone on the waitlist and the kit is two rows.
- **The kit's route never records SMS consent.** Its page has no phone field or SMS box, so the route
  drops `phone` and `smsConsent` before validating; a hand-made request cannot store a "yes" to words
  the visitor never saw. Joining is email consent plus the Terms and Privacy Policy, in the words
  under the button: "By getting the kit, you agree to our Terms of Service and Privacy Policy and to
  emails from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor.
  Unsubscribe anytime." (`CONSENT.kit`, quoted on the Terms page; a test holds the two equal).
- **GoHighLevel tags by source** (amends D-033). The sync job now reads each row's `source`:
  `expcon-2026-ai101` keeps `ai101-waitlist` and `event-expcon-2026`; `task-sync-starter` gets
  `task-sync-starter`, plus the channel tag as before (ManyChat's link carries `?src=ig`, so
  `src-ig`). A source with no entry gets no form tag at all, never the waitlist's, so a kit sign-up
  can never trigger the waitlist's workflow.
- **The Terms and Privacy Policy now cover the kit** (amends D-035): a "Task Sync Starter Kit"
  section in the Terms, what the kit's opt-in collects and the browser note in the Privacy Policy,
  and "our pages" where they said "the page". Version and effective date 2026-10-13, and
  `TERMS_VERSION` with them, so sign-ups from today record the version that names the kit.
- **Open:** page 8 of the PDF as supplied still has two placeholders, "[December event name, dates
  and link]" and "[Book a call link]". Replace `apps/web/public/downloads/task-sync-starter-kit.pdf`
  with the final file under the same name; nothing else changes.

## D-039 · /ops-time-audit, one page system for every free guide, and no Spring on the guide pages

**Date:** 2026-10-14
**Approved by:** Connor Leiva, in chat on 2026-10-14: "Similar to what you did for the other page, I
need a new one for this new lead magnet. Still gated on email. Remove any reference to Spring on this
page and the other one."
**Scope:** `apps/web/src/guides/*` (was `src/tss`), `apps/web/{task-sync-starter,ops-time-audit}.html`,
`apps/web/public/downloads/ops-time-audit.pdf`; `apps/api/src/routes/{guide-list,guides,ai101,marketing}.ts`,
`apps/api/src/{app,server}.ts`, `apps/api/src/integrations/ghl.ts`; `apps/web/src/legal/content.ts`.
Amends D-038.

- **/ops-time-audit** is the landing page for The Ops Time Audit (8 pages, Version 1.0, October 2026),
  built exactly as /task-sync-starter is (D-038): served from memory, an email opt-in that unlocks
  "Download Here", the PDF at `/downloads/ops-time-audit.pdf` sent `noindex`, the no-JS 303s, and
  `?src=` attribution. Its words are the guide's own: the cover and three steps, page 2's example
  report as a real table (each row a small block on a phone), page 3's three doors, "What You Need",
  and page 8's pointer to the Task Sync Starter Kit, linked in the same tab.
- **One page system for every guide.** `src/tss` became `src/guides`: one renderer, one stylesheet,
  one script, a content file per guide (`task-sync-starter.ts`, `ops-time-audit.ts`), and a shell
  per guide. The script reads what differs from the page (the form's route, the card's
  `data-unlock-key`), so each guide's unlock is remembered on its own: getting one never opens the
  other. The API keeps one list, `GUIDE_SLUGS` (`routes/guide-list.ts`): each slug is a page
  (`/<slug>` and its `/<slug>/` 301), an opt-in (`POST /api/<slug>`, the waitlist route with SMS
  stripped, D-038) and the `source` its rows are stored under. Ids on the page became `guide-*`, and
  the no-JS error landing `#guide-error` (was `#tss-error`), both sides in the same deploy.
- **GoHighLevel:** `ops-time-audit` sign-ups are tagged `ops-time-audit`, plus the channel tag.
- **No Spring on the guide pages.** A guide's opt-in now agrees to emails from Amplified Impact and
  Connor only: "By signing up, you agree to our Terms of Service and Privacy Policy and to emails from
  Amplified Impact and Connor. Unsubscribe anytime." "Any reference to Spring" was read to include
  Spring B, Spring's company. A test fails if "Spring" appears anywhere in a guide page. Sign-ups to
  the Task Sync Starter Kit before this deploy agreed to the earlier, longer list.
- **Terms and Privacy** (amends D-035, D-038): the kit section became "Free guides", naming both and
  saying only Amplified Impact and Connor email because of a guide; the Privacy Policy collects
  "which guide you got" and names the guide senders apart from the waitlist's. Version and effective
  date 2026-10-14, and `TERMS_VERSION` with them.

## D-040 · /voice-profile: the voice profile setup on its own, gated, for Spring to post

**Date:** 2026-10-17
**Approved by:** Connor Leiva, in chat on 2026-10-17: "Can you create a new site that replicates the
voice profile setup workflow from the ai 101 experience, but remove the portions of the guide/flow that
are related to the carousel creator? And then this needs to be gated as well as it's a lead magnet
that Spring is going to post."
**Scope:** `apps/web/src/voice/*`, `apps/web/voice-profile.html`; `apps/web/src/ai101/{main,render,vite-plugin}.ts`;
`apps/api/src/routes/{guide-list,marketing}.ts`, `apps/api/src/integrations/ghl.ts`;
`apps/web/src/legal/content.ts`. Amends D-034, D-038 and D-039.

- **/voice-profile is /ai101's Part I and nothing else**: a welcome screen with the gate, "First: get
  the app and sign in" as a step of its own, then the four voice profile steps (samples, the prompt and
  its two blanks, saving it in a Claude Project or ChatGPT, testing it). No Carousel Creator, brand,
  Project, week, sprint, waitlist, or Part II laptop handoff; the last screen ends "Done. Your voice
  profile is set up." and Start Over.
- **One source for the steps.** `src/voice/content.ts` imports /ai101's samples, prompt, copy and save
  content rather than copying them, so the voice prompt cannot drift between the pages, and
  `src/voice/render.ts` is built from /ai101's own building blocks (now exported from its renderer).
  It runs /ai101's own script; its place is kept under its own key (`voice-profile-v1`, named on
  `<main data-state-key>`), apart from /ai101's.
- **The gate**, in /ai101's script and inert on any page without one: a screen marked `data-gate`
  holds an email opt-in on /ai101's dark waitlist card. Until this device signs up, no screen after it
  shows (not by Next, a link, a saved place or the address) and its Next is hidden; on success the
  next screen opens and the device is remembered (`vp-unlocked`), so a return visit says "You're in"
  and Start goes on. Its form is sent by /ai101's own waitlist sender, made generic (`initSignUp`).
  Without the script, the screens after the gate sit in `#unlocked`, hidden until the form's 303
  lands there. A soft gate, as the guides' are.
- **Server:** `voice-profile` joins `GUIDE_SLUGS`: the page and its `/voice-profile/` 301, `POST
  /api/voice-profile` (SMS stripped, D-038), source `voice-profile`, GoHighLevel tag `voice-profile`
  plus the channel tag, let through on www. Its no-JS success lands on `#unlocked`, not `#download`.
- **Senders** (superseded the same day, before it shipped, by D-041: Amplified Impact, LLC alone):
  the waitlist's, Spring among them, because Spring posts it: "By signing up, you agree
  to our Terms of Service and Privacy Policy and to emails from Amplified Impact, Spring B and its
  affiliated companies, Spring, and Connor. Unsubscribe anytime." (`CONSENT.voice`). The PDF guides
  keep Amplified Impact and Connor only (D-039). The Terms' "Free guides" section quotes both lines
  and says which senders go with which guide, and the Privacy Policy says the same. Version and
  effective date 2026-10-17, and `TERMS_VERSION` with them.
- **Found in building it:** a module shared by two pages' scripts (the first draft gave the guides
  and the gate one opt-in module) is split into a chunk of its own, which an inlined script imports
  by a URL that does not exist: every page's script broke in that build. Nothing shipped, and
  `ai101Inline` now refuses to build a page whose script imports anything.

## D-041 · Every sign-up names Amplified Impact, LLC alone

**Date:** 2026-10-17
**Approved by:** Connor Leiva, in chat on 2026-10-17, with the draft of the new Privacy Policy: "the
sign-up agrees to hear from items all need updated to remove specific references to Spring and Conor.
It should be Amplified Impact, LLC."
**Scope:** the sender strings in `apps/web/src/{ai101,guides,voice,legal}/content.ts` and
`SMS_CONSENT_TEXT` in `apps/api/src/routes/ai101.ts`, and their tests. Amends D-034, D-035, D-039 and
D-040.

- **One sender everywhere a visitor agrees to hear from us:** the /ai101 waitlist's line under Join,
  its SMS box (and the API's stored copy of those words), and every free guide's line (/task-sync-starter,
  /ops-time-audit, /voice-profile), which are now one identical line: "By signing up, you agree to our
  Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime."
  Before: the waitlist named Amplified Impact, Spring B and its affiliated companies, Spring, and
  Connor; the PDF guides, Amplified Impact and Connor.
- **The current Terms and Privacy Policy say the same**, and nothing that contradicts it: their quotes
  of the lines, one guide sender in place of two lists, the SMS sharing sentence for one sender, and
  the "Spring" and "Connor" definitions and the sentence that named them as senders removed. Their
  "we" (Amplified Impact and Spring B and its affiliated companies) is left for the new Privacy Policy
  Connor is drafting, which defines "we" as Amplified Impact, LLC and covers marketing from its
  Affiliated Companies. Version 2026-10-17, unchanged: nothing dated 2026-10-17 had shipped.
- **Not changed:** copy that describes rather than consents (/ai101's and /voice-profile's "with
  Spring and Connor", the guides' "By Connor Leiva").
- **The SMS words changed while the waitlist form is live**, which D-034 warns against: a tab opened
  before the deploy and submitted after it is stored with the new words. The waitlist is past its
  event and the box is optional, so the risk is a handful of sign-ups at most.

## D-042 · The Terms of Service and Privacy Policy become Connor's own

**Date:** 2026-10-18
**Approved by:** Connor Leiva, in chat on 2026-10-18, with the finished Privacy Policy as a file:
"Use this file to update my terms of service and privacy policy on my site," then the finished Terms
of Service as a second file the same day.
**Scope:** `apps/web/src/legal/{content,render,render.test}.ts`, `apps/web/src/legal/legal.css`, two
test titles in `apps/web/src/{guides,voice}/render.test.ts`; `TERMS_VERSION` in
`apps/api/src/routes/ai101.ts` and its tests. Amends D-035 and D-041.

- **Both pages are Connor's text, word for word**: the Terms in 28 numbered sections, the Privacy
  Policy in 16, each covering every Amplified Impact service (courses, coaching, consulting, events,
  communities, the LMS), not only the public pages. Only the quotation marks and apostrophes are
  typeset, and the address, email and court venue come from `content.ts`'s one constant per fact. A
  comparison of each built page against its file found every heading, paragraph and list item
  identical (170 on the Terms, 122 on the policy). The files' `[Month DD, YYYY]` and `[YYYY-MM-DD]`
  placeholders, and the policy's byline, are replaced by the pages' own date line.
- **They replace the AI-drafted pages of D-035 whole.** Gone with them: the Terms' sections on the
  /ai101 page, the waitlist and the free guides, and the boxes that quoted each form's consent words.
  `CONSENT` stays in `content.ts` as the record of what each form says (the forms' tests still hold
  them to it), but no page quotes it now. The Spring B and SB Coaching definitions are gone; "we" is
  Amplified Impact, LLC, a Utah limited liability company, on both pages, which D-041 left for this.
- **What the renderer gained, for their shape:** `h3` subheadings; headings that carry their own
  numbers, because the text cites them ("Section 24 requires you", "as Section 8 explains"), so the
  table of contents adds none (a test holds them in order, and Section 24 to the arbitration
  section); the Terms' arbitration warning, bold in a panel above the intro (`notice`); and off-site
  links, the policy's three ad opt-out pages only, which open in a new tab with `noopener` as every
  off-site link on /ai101 and the guides does. The pages still load nothing from another origin.
- **Shared words, said once:** the sentence on mobile numbers ("No mobile information will be shared
  with third parties or affiliates for marketing or promotional purposes.") is `SMS_SHARING` on both
  pages, and the program name is `SMS_PROGRAM`, now "Amplified Impact Updates" as the Terms give it.
- **Version and effective date 2026-10-18**, and `TERMS_VERSION` with them, so sign-ups from the
  deploy record the version with these pages.

## D-043 · The voice profile setup: sign in first, and an interview for agents with no samples

**Date:** 2026-10-18
**Approved by:** Connor Leiva, in chat on 2026-10-18 ("I like your outline and agree with your
decisions. Please build."), from Spring Bengtzen's voice note on /voice-profile, with her "Voice
Builder" document as the interview.
**Scope:** `apps/web/src/ai101/{content,render,main}.ts`, `ai101.css` and their tests;
`apps/web/src/voice/*`. Both pages: /voice-profile, and /ai101's Part I, which share the content and the
renderer (D-040). Amends D-034, D-036 and D-040.

- **Sign in first.** "First: get the app and sign in", whose buttons went to the app stores on a phone,
  is now "First: sign in to ChatGPT or Claude", with Open ChatGPT and Open Claude (the web apps, which
  a phone with the app may open in the app), then "Don't have the app yet? Get ChatGPT or Get Claude."
  as the store links, swapped in on a phone as before (D-032).
- **Step 1 is a choice: "I Have Samples" or "Interview Me".** Spring's point: most agents have no
  recordings of themselves, and the prompt alone answered them "Ready, send your samples" and stopped.
  The samples path names meeting transcripts (Zoom, Granola, Fathom, Otter) and says to copy only the
  agent's own parts. The interview path says what to have ready: five things they wrote, and a two
  minute voice memo (or the mic). A switch over two panels, like Save's: remembered (`state.path`,
  `samples` by default), and it picks step 2's prompt too. Without the script both paths show, each
  under its name. Step 1's Next is now "I'm Ready"; step 2 is "Copy your prompt".
- **Two prompts, one per path.** The samples path keeps Connor's forensic-linguist prompt, unchanged
  (D-036). The interview path is Spring's Voice Builder (`interviewPrompt`, id `voice_interview`):
  her questions, part names and lines, and her profile's sections, word for word. Merging it into
  Connor's would have lost her profile's shape. Added so it runs in a chat and fits step 3: the
  interview's rules (one question at a time, the mic, one follow-up, nothing written until the end),
  the mic in place of a voice memo transcript, "use only what I gave you, never invent", punctuation
  learned only from what was typed, plain text between the same START and END lines, and a QUICK
  CARD first, under 1,500 characters and starting "Write as me.", so step 3's ChatGPT instruction and
  /ai101's Carousel Creator ("the profile that starts with 'Write as me.'") work for either profile.
  Left out of her document: its program framing (the brand name, "week one of the 30 Day AI Launch",
  "once a quarter") and "name the project with your name" (step 3 says "My Voice").
- **One renderer.** /ai101's step 1, step 2, Save and the sign-in links are now shared builders
  (`samplesBody`, `voiceCopyBody`, `saveBody`, `getAppLinks`), and /voice-profile calls them, so the
  two pages cannot drift. `initPicker` became `initChoice`, which runs both switches.

## D-044 · /voice-profile: no sign-in step, and generic rather than real estate

**Date:** 2026-10-18
**Approved by:** Connor Leiva, in chat on 2026-10-18, from Spring Bengtzen's feedback.
**Scope:** `apps/web/src/voice/*`, the two voice prompts and two lines of shared copy in
`apps/web/src/ai101/content.ts`, and their tests. Amends D-040 and D-043.

- **No sign-in step on /voice-profile.** Its Open ChatGPT and Open Claude buttons sent people to a new
  tab with nothing to do there yet. Visitors are assumed to use one of them: the sign-up opens step 1,
  and ChatGPT or Claude first opens from step 2's Copy & Open, with a prompt to paste. /ai101's welcome
  card, on the agent workshop page, is unchanged.
- **"AI 101", not "AI 101 for Agents"**, on /voice-profile (its eyebrow and link-preview description).
- **Both prompts are for a small business, with a real estate agent as the example**, where a line was
  agent-only. Connor's (D-036): "I run a small business", company or listing boilerplate, the industry's
  stock hooks and cliches with real estate's as the example, the regulated-claims flag with fair
  housing as the example, "anyone's face", "a competitor's name", and a "What I do:" ABOUT ME line.
  Spring's (D-043): her questions generalized the same way (your line of work, the problem you solve,
  when the work is done, others in your industry, market predictions, an email opener to people you
  know), each agent-specific one keeping its real estate version as the example. Shared with /ai101,
  where they still read naturally for agents.
- **Two lines of copy around them**: the voice memo is "the question customers ask you most", and step
  2's note no longer quotes "Thinking of buying or selling?". The fill fields' example placeholders
  ("Farmington, CT", "buyers, sellers, or both") are left as examples.

## D-045 · /reel-editor: the first Claude skill, a ZIP behind the guides' opt-in, with its setup

**Date:** 2026-10-20
**Approved by:** Connor Leiva, in chat on 2026-10-20, with the skill as `reel-editor.zip`: "audit my
site ... look at the current lead magnets I have set up ... use these files to create an entirely
new lead magnet site for a Reel Editor. This is the first 'skill' I'll be having people download, so
it'll need to work slightly differently than the others but I want the priority to be ease of use
and value."
**Scope:** `apps/web/src/guides/*` (`reel-editor.ts` new), `apps/web/reel-editor.html`,
`apps/web/public/downloads/reel-editor.zip`, `apps/web/public/media/reel-editor-*`;
`apps/api/src/routes/{guide-list,marketing}.ts`,
`apps/api/src/integrations/ghl.ts`, `apps/api/src/server.ts` (a comment); their tests;
`.gitattributes`. Amends D-038 and D-039.

- **/reel-editor is a free guide page** (D-039's one page system), not a page of its own: the same
  hero, email opt-in, consent line (D-041), soft gate, no-JS 303s, `?src=` attribution, served from
  memory and exempt from the global limit. Its words are the skill's own (README, SKILL.md and its
  references), so the page promises what the skill does. Its sign-ups are stored under
  `source = 'reel-editor'` and tagged `reel-editor` in GoHighLevel, plus the channel tag.
- **What is different, because a skill is installed, not read.** A PDF is done once it is saved; a
  skill does nothing until it is in Claude. So the unlocked card is a four-step setup (`download.setup`)
  instead of one button: turn on code execution (Open Claude Settings,
  `claude.ai/settings/capabilities`), download the ZIP and do not unzip it, add it in Customize >
  Skills (Open Claude Skills, `claude.ai/customize/skills`), and make the first Reel, with "Edit this
  into a Reel" one tap to copy. The steps and URLs are the skill's README and Claude's help center
  ("Use skills in Claude"), checked on 2026-10-20.
- **Phones are sent to a computer.** Visitors arrive from a ManyChat DM, in Instagram's in-app
  browser, and the help center documents uploading a skill on the web only. On a touch screen
  (`pointer: coarse`, CSS, so it works with no script) the card says so, with "Send This to My
  Computer": the share sheet where there is one, otherwise a `mailto:` with the page. The link it
  sends is `/reel-editor#download`, which shows the setup on any device by `:target`, so the computer
  needs no second sign-up; the script keeps it open for that visit and does not remember it. That
  makes the shared link a way past the gate, which a soft gate already allows (D-038).
- **New section kinds, for any guide:** `prompts` (things to say to Claude, each a button that
  copies its words, with /ai101's toast and fallback copy), `faq` (`<details>`, open with no script),
  and `tiles` with `columns: 2`. The copy and share code is /ai101's, repeated in the guides' script
  rather than shared, because a module two inlined scripts import becomes a chunk neither can load
  (D-040). A copy button is named "Copy: <the words>" for a screen reader.
- **The ZIP is the file Connor supplied, byte for byte** (sha256 `64dc74f1…a2b2`, 50,043 bytes),
  served `noindex` like the PDFs, as `application/zip`, saved as `reel-editor.zip`. A test reads it
  and holds it to what Claude's upload needs: one `reel-editor/` folder, a `SKILL.md` named
  `reel-editor`, no `__MACOSX`. To ship a new version, replace the file under the same name.
- **The PDF guides are unchanged** in their markup: no setup, handoff, copy buttons or live region,
  which a test holds. They share the script, so their inlined script (and their ETag) changes. The
  SPA's build is byte-identical; only `dist/downloads/` gains the ZIP.
- **Verified** in Chromium against the built server and a Postgres: phone (390 px) and desktop, sign-up
  stored under the right source, the setup unlocked and remembered, the handoff shown on touch only,
  copy and the toast, the download's file name, the sent link on a fresh device, the no-JS 303, no
  horizontal scroll, no console errors, and no serious or critical axe violations, locked and unlocked.
  **Not verified:** a real iPhone in Instagram's browser, Safari's auto-unzip on a Mac, and an upload
  of the ZIP into Claude from this page.
- **Before and after** (Connor's own run, supplied in chat on 2026-10-20: the edited Reel as an
  upload, the raw take from his Google Drive), the first section under the opt-in, in a new `compare`
  section kind: two captioned `<video>`s side by side at every width, "Before · 2:45" and "After ·
  1:05", so the cut is visible before either plays. Both re-encoded for the web to H.264 High 4.0,
  720 by 1280, AAC, `moov` first: the Reel arrived as HEVC, which Firefox and many Android phones
  cannot play, and the take was 176 MB. 6.2 MB and 13.0 MB, posters about 90 KB each, under
  `apps/web/public/media/`. `preload="none"`: the page fetches only the posters until one is played;
  @fastify/static answers ranges with 206, which iOS needs to stream. A test holds each file to H.264,
  `moov` before `mdat`, and size caps. **Not verified:** playback in a browser (the sandbox's Chromium
  has no H.264 decoder; both files decode clean in ffmpeg). The Reel is taken to be the version with
  music, since its name has no `-no-music`.
- **The free plan** (Connor agreed, in chat on 2026-10-20): "What you need" keeps "A paid Claude
  plan", as the skill's README says, and the FAQ answers "Does it work on Claude's free plan?" with
  what Anthropic's pages say: Free includes skills, code execution and file creation, with network
  access to package managers by default, but "Pro gives you at least 5x more usage per 5-hour session
  than Free", and creating files "will use more of your limit". A Reel is about 20 to 25 tool calls
  and a render of about 10 seconds per second of video, so on Free it may stop partway until the
  limit resets. Not tested on a Free account.
- **Open:** a GoHighLevel workflow on the `reel-editor` tag that emails the page's link would carry a
  phone sign-up to a computer without the visitor doing anything; it is outside this repository and
  not set up. The page promises no email.

## D-046 · /retool: the "Retool, Don't Replace" talk's kit, open audit, gated build

**Date:** 2026-10-22
**Approved by:** the user, in chat on 2026-10-22, supplying the talk's notes ("Retool, Don't Replace:
AI 101 for Team Owners", 2026-10-21): "Can you turn this into another standalone page, with email
gate, and follow the same step by step flow with opening up buttons into Claude, prompts copied,
etc etc., that I can use to step people through this process from the deck I'm about to present?",
then, live in the session: "Deploy when ready please!"
**Scope:** `apps/web/src/retool/`, `apps/web/retool.html`, both Vite configs, `src/ai101/{content,
render,main}.ts` (shared parts), `scripts/check-css-colors.mjs`; in the API `routes/{guide-list,
guides,marketing,ai101}.ts`, `db/schema.ts` and migration `0005`, `integrations/ghl.ts`,
`jobs/ghl-sync.ts`, and their tests.

- **What it is.** An eleven-screen step-through at `/retool`, built as /voice-profile is (D-040):
  /ai101's renderer draws it and /ai101's script runs it (Copy & Open to a blank chat, never `?q=`,
  D-032; fields that fill the prompts; the Claude / ChatGPT switch). `/RETOOL` and `/Retool` 301 to
  it, query kept, because the talk's ask is "Type RETOOL in the chat"; www lets all three through.
  `/retool#audit` lands straight on the audit, for the link dropped in the chat mid-call.
- **Open and gated, as the notes plan it:** "the Kit B prompt open to anyone, and Kits C through E
  behind a short form (name, email, team size, a December interest checkbox)", and Segment 4's "No
  form on it, so nobody loses two minutes". Open: welcome, the three doors, Run / Draft / Own, the
  audit (Kit B) and reading the map. The gate is its own screen (`#kit`, `data-gate`), part way down;
  main.ts already handled a gate at any index. Gated: the Contract-to-Close Coordinator (Kit C) and
  its binder, the Retool Conversation (Kit E), the 30-day plan (Kit D), and two ways forward. Not on
  the page: Kit A (the note to Sarah), the run of show, the Q&A prep.
- **The prompts are Connor's word for word**, with one change: Kit B's second `[number]` is
  `[how many]`, because a placeholder is filled by its exact text and two `[number]`s could only hold
  one value. Kit C's `[brackets]` is its own wording (`literal`). Kit E is words to say, so it shows
  open, in the page's face rather than mono, under a copy-only "Copy the Script" button
  (`data-copy-prompt`, new in main.ts, hidden without the script).
- **ChatGPT Projects, not custom GPTs.** The notes say "a Claude Project or a custom GPT". OpenAI's
  help center (checked 2026-10-22) says custom GPTs retire on Dec 11, 2026, and personal plans
  (Free, Go, Plus, Pro) can no longer create one; Projects have instructions and files on every plan,
  Free included (five files). So the ChatGPT panel opens ChatGPT and walks New project, then
  Project settings, then Instructions; the binder is four files, one each. Claude Projects are on
  Free too (five projects), per Anthropic's help center.
- **The sort's two questions** (the notes' slide 3, "the same two questions, in order. The first yes
  decides the bucket; two noes mean Run") were not in the notes' export. The page asks Kit B's own
  rules as the two questions (money, wires, texting consent, fair housing or a decision about a
  person: Own; goes to a client, agent, lender or title, or sets a contract date: Draft), so the
  page and the prompt sort alike. Connor's slide wording should replace them if it differs.
- **The opt-in** is the guides' route (D-038), with two fields no other form has: `teamSize`, a
  required `<select>` of `TEAM_SIZES` (`1-10`, `11-25`, `26-50`, `51+`; "Choose your team size."),
  and `decemberInterest`, an unticked box, "Tell me about the December leadership track."
  `SIGN_UP_FORMS[].team` is true for `retool` alone; every other form strips both before validating,
  and `validateWaitlist` records neither without `team`, the same double guard as SMS. Columns
  `team_size` (null elsewhere) and `december_interest` (default false) are additive, with a CHECK on
  the four sizes; every existing row passes it. GoHighLevel tags (D-033): `retool`, then
  `team-size-1-10` / `-11-25` / `-26-50` / `-51-plus` from an allow-list only, and
  `december-interest` when ticked. Consent line as every guide's (D-041).
- **Left out on purpose:** the talk's KW and MREA quotations (a public page, not the room), price and
  the "two more teams" scarcity line (the notes keep both for the Review), and first person.
- **Open:** the Retool Review booking link. Until `RETOOL.forward.review.button.href` is set, the last
  screen says "Type RETOOL in the session chat for the booking link." in place of a button.

## D-047 · /retool: the map runs straight into build steps for the AI employee it picked

**Date:** 2026-10-22
**Approved by:** the user, in chat on 2026-10-22, supplying the transcript of the live session the
page was first used in: "Can you audit my repo and look for the /retool standalone site and then
adjust the flow in the way I described in this transcript to make it even easier to follow."
**Scope:** `apps/web/src/retool/{content,render}.ts`, `retool.css` and its tests; in
`src/ai101/{content,main}.ts` the new prompt id and field, which /retool runs on (D-046).

- **What the session showed.** The map's first AI employee is not always contract-to-close (the
  live map picked a Transaction QA agent), and the next thing the room needed was how to build it.
  Connor typed it live ("I have no clue how to get started on building this. Give me a simple
  step-by-step instruction list. As comprehensive as possible... Make it so that a 10th grader could
  follow this on their own") and said the tool would do it next: "copy and paste your entire output
  into the tool, and then I will have this... give this prompt".
- **A new open screen, `#build-steps`**, after Read Your Map and before the gate: Your Task Map is now
  1 of 3, 2 of 3, 3 of 3. One box takes the whole answer (filling `[paste your whole map here]`,
  field `taskMap`), then Copy & Open ChatGPT or Claude to a blank chat, as the audit does (D-032).
  Read's Next is "Get My Build Steps"; the new screen's is "Get the Full Kit". Open, not gated, by
  the same rule as the audit: the room does the whole work block with no form. Moving it behind the
  gate is one line in `screens` and one in `renderRetoolBody`.
- **The prompt** is Connor's ask, as typed, made into sentences, under the pasted map. Four lines
  are the page's own, each from this kit, and each can be cut: build it as a Project in this app
  with no code; the four parts a new hire gets, with the job description written out to paste; keep
  the map's buckets (Kit B's rules); practice on a made-up example and keep wires out of every file.
- **The audit, coached as Connor coached it live.** Hints: "Job titles are enough." (who's in ops),
  "Rough guesses are fine. Percentages help." (what eats their week, with a percentage placeholder),
  and "The thing that would hurt most." (what breaks, "not first in terms of time"). A fourth step,
  "Keep that chat open. You'll copy its answer in a minute.", and the note now opens "Use a regular
  chat, not a Project." ("I would do this in a chat, not a cowork").
- **Copy that followed.** Read's last step is "Find the first AI employee it recommends. Not sold?
  Start where the Run tasks pile up." ("those run categories are what you should start with"), in
  place of "every team has contract-to-close". The welcome's second promise is "Your first AI
  employee. Step-by-step build instructions for the one your map picks." The gate offers the
  Coordinator as the ready-made one: "A Contract-to-Close Coordinator ready to paste in, ...".
- **Unchanged:** Kits B to E word for word, the gate and its form, every anchor (`/retool#audit`
  still lands on the audit), and the state key: a visitor's saved fields stay, and a saved place
  past the map reopens one screen earlier.

## D-048 · /retool in plain language: one action a step, for team leaders new to AI

**Date:** 2026-10-22
**Approved by:** the user, in chat on 2026-10-22, after a screen-by-screen review of the live page: "The
audience we are building for is team leaders who were assuming are very tech illiterate. It needs to
be plain language and as simple to follow as possible", then "Change it all and add the items to the
end of the prompt to make it clearer too."
**Scope:** `apps/web/src/retool/{content,render}.ts` and its tests. No API, form or anchor changes.

- **The rule.** Every step is one action that says what to tap or what to type. Real estate words stay
  (CRM, TC, MLS, title, under contract); AI-builder and consultant words go (prompt jargon, "share of
  the week", baseline, redacted, ramp, "zero context", TCPA, and every EOS line: Gets it / Wants it /
  Capacity, Rock, scorecard). A test bans them from the page.
- **The audit:** "Fill in six quick boxes" (it said four questions and showed six). Before the buttons,
  what they do and "Use the one you already have". The steps: sign in if it asks (a free account
  works), press and hold the message box and tap Paste, tap Send, come back to this page. Gone: "Fill
  in any blank still in [brackets]" and "Use a regular chat, not a Project". The welcome now says a
  free account and about 15 minutes are needed.
- **Read your map is "Check its answer":** every fix is words typed into the same chat. Remove a guess
  marked (added); move anything AI would send on its own to Draft; optionally, have the AI do the
  hours-times-cost math; find its pick. The percent for the session chat is said to be near the end.
- **The build steps** start with how to get the answer out: type "Show me the whole map again, with my
  fixes." (so the fixes are in it), tap the copy button (two little squares), come back, press and hold
  the box, Paste. The box is "The whole answer from your chat". "10th grader" stays in the prompt only.
- **Run, Draft, Own** tells the rule AI sorts by instead of setting a quiz ("You don't sort anything").
- **The gated screens:** "This part is easiest on a laptop"; Claude's exact buttons ("Set project
  instructions", "Save instructions") and ChatGPT's (••• then Project settings, then the Instructions
  box); where files go (Claude: the + on the right; ChatGPT: the Sources tab, where project files moved
  in Feb 2026); the guardrail names the switch that stops training (ChatGPT: Settings, Data controls,
  Improve the model for everyone; Claude: Settings, Privacy, Help improve Claude). All from each app's
  help center, checked 2026-10-22. The 30-day plan's weeks are Map, Build, Use (not "Run", a bucket
  here), Decide, each with one plain "Track" line.
- **The prompts, at the end only:** Kit B gains "Write it all in plain language for someone new to AI:
  short sentences, no tech terms. Keep each Why to a few words so the table fits on a phone." The build
  steps prompt gains "Use plain words with no tech terms. One action per step, and tell me exactly what
  to tap, click, or type." Every earlier word of both is unchanged, and Kits C and E are untouched.
- **Still open:** the Retool Review booking link (D-046). Outside a live session there is no way to book.

## D-049 · /retool: build in the map's own chat, right away, in words a first-time AI user can follow

**Date:** 2026-10-22
**Approved by:** the user, in chat on 2026-10-22, showing the "Check its answer" screen: "Do these
steps make sense if they're already building their OWN AI employee from what we went through in the
earlier steps? Also, I still don't think this language is simple enough throughout the whole thing",
with a model line ("Remove what doesn't apply to your ops team. Tasks marked (added) in the response
are guesses the AI made about your team. If one isn't something your team does, type: \"Remove
[task]. We don't do that.\""). Asked whether owners build now or with their ops leader in Week 2, the
user chose "Build right away", knowing it changes one clause of Kit E.
**Scope:** `apps/web/src/retool/{content,render}.ts`, `retool.css`, its tests and a new
`main.test.ts`; in `src/ai101/{content,main}.ts` and `main.test.ts`, the `taskMap` field removed. No
API, form, anchor or state-key changes.

- **The answer to the question: partly.** The check steps fed the build, but one ("see what it's
  worth", hours times cost) built nothing, the pick came last, and the build then had the visitor
  ask the chat to repeat its map, copy it, paste it into this page, and paste it again into a new
  chat. Now: the check screen keeps only the fixes the build uses (remove the AI's guesses, Connor's
  line word for word; make sure anything sent to a client, agent, lender or title is Draft; then ask
  which AI employee to build first, after the fixes, which can change it). The build is asked in the
  SAME chat, which already holds the map and the fixes: one "Copy the Request" button
  (`data-copy-prompt`, copy-only, as the script's), paste, send, follow the steps. The `taskMap` box
  and `[paste your whole map here]` are gone; a saved one is ignored, as any unknown key is.
- **Build right away** (the user's choice over "steps now, build in Week 2"). So: a map that picked
  contract-to-close skips the build screen (a note at its top) for the ready-made Coordinator, which
  comes first after the gate, marked optional, with a link past it to the talk. Kit E's "Before we
  build anything" is "Before we use it on real work"; the talk's moves make the ops leader the boss
  of an AI employee that exists; the plan's weeks are Talk, Test, Use, Decide (Kit D's Map and Build
  are done by then), Week 1 takes the 1 to 10 workload number that Week 4 compares.
- **The build request** keeps Connor's live ask word for word, after a new first line (build the one
  you recommended, or the one I said I'd rather build), and gains lines that close dead ends a
  first-timer hits: a Project, not a custom GPT, and say before a paid step; the ops leader as the
  manager; say before anything needs a CRM, email or text connection, and give a version that works
  without it; show how to turn off training before real client data; parts that can be stopped and
  picked up; and where to look when a button's name has changed.
- **The words.** A review read the page as a 58-year-old first-time user on an iPhone during a Zoom
  call, as a literal 10th grader, for flow, for tone, and against each app's help center; 79 edits,
  most taken. The rules: name the actor and the place ("the AI", "the AI's response", "that same
  chat", never a bare "it"); explain a term the first time (task map, AI employee, Project, bucket);
  one action a step; how to paste on a phone and on a computer, once; how to get back to this page;
  read the steps before tapping a button that leaves the page; the field labels are questions; "the
  person or the job", not "the system"; "Option A/B/C" for the talk's doors (the letters still match
  the slide); "On a live call?" and "the Zoom chat" for the session lines.
- **Facts corrected, from each help center (2026-10-22):** sign in to ChatGPT even when it lets you
  skip it, since signed-out chats are not kept; ChatGPT's New project ends with Create project and its
  instructions with Save; ChatGPT's Data controls are under the account menu and close with Done; a
  thumbs up or down can send a chat for training even after opting out; Claude's switch is named by
  its first words ("Help improve"), as Anthropic has renamed it; free ChatGPT Projects hold five
  files, so the binder is four files; Run's examples drop "deadline reminders", since a contract date
  is Draft by the page's own rule. The safety line now comes first on the binder screen, and a short
  one is on the build screen, for owners who never see the Coordinator.
- **Still open:** the Retool Review booking link (D-046), and what the December leadership track is:
  the box's label names it without saying what it is.

## D-050 · /library: one page that lists every guide, skill and setup

**Date:** 2026-11-03
**Approved by:** the user, in chat on 2026-11-03: "It's getting large enough that I need to shift gears
to start treating our content as a repository for people. As such, I need your help creating a landing
page for these skills that is modeled somewhat similarly to this page:
https://learnaiwithmariah.com/guides/"
**Scope:** `apps/web/src/library/`, `apps/web/library.html`, both Vite configs,
`scripts/check-css-colors.mjs`; in the API `routes/library.ts`, `routes/marketing.ts`, `app.ts`,
`server.ts`, and their tests.

- **What it is.** A public page at `/library`: a forest hero, pills by AI tool and by topic, a search, a
  sort, and a grid of cards, each one link. The reference's shape in this brand's words and colours.
  `/guides` and `/skills` 301 to it, query kept, because on www an unknown path goes to the placeholder.
  It is not one of `GUIDE_SLUGS`: a slug is also an opt-in route and a sign-up `source`, and this page
  has no form. Served as the guides are (from memory, exempt from the global limit, ETag), in both modes.
- **One record per resource.** `ENTRIES` in `src/library/content.ts` is the only thing to edit to list
  something. The pills are worked out from the records, so a new tool or topic gets its pill by being
  used and an unused one never shows. Each record's `keywords` are searched but never shown.
- **It cannot fall behind.** A test reads the API's `GUIDE_SLUGS` and fails if a guide has no record, so
  a new guide page cannot ship missing from the library, and another fails on a card linking to a page
  that does not exist. "To add a guide" in `guide-list.ts` and `guides/content.ts` says so.
- **With no script,** every card shows, newest first, and every link works; the pills, search and sort
  are `hidden data-js-only`. The script reads each card's `data-` attributes, so no catalog copy is in it.
- **The Ops Time Audit and the Task Sync Starter Kit are listed,** though the user's list did not name
  them: they are live free guides, and the test above requires a record. Removing them means an explicit
  exception in that test.
- **The Content Strategist is "Coming soon".** The user named it as on the site, but it is not on
  `origin/main` or in production (`/content-strategist` falls to the placeholder). Its card has
  `href: null`, which links nowhere. Its words are from the README of the `content-opportunity-research`
  skill in the user's Downloads, taken to be the same thing. To confirm with the user.
- **Exact on www.** `/library`, `/guides` and `/skills` match with no deeper path, unlike the guides'
  slugs: `/skills/reel-editor` is the link people will guess, and through the allow-list it would reach
  the app's shell. `/retool/x` and its siblings still have that hole; out of scope here.
- **Honest cards.** A card with no page sorts last in both directions, so the first card is always one
  that opens. The Reel Editor's says it needs a paid Claude plan to finish in one go, and AI 101's that
  its carousel half needs a laptop and Claude Pro. The lede says most pages ask for a name and email,
  since five of the six live ones do.
- **Known floor:** every colour here is an `oklch()` token, as on the sibling pages, so below Safari 15.4
  the page loses its colours and the pressed pill looks like the others. The script and the links work.
- **Not done:** `/` on www still shows the "under construction" placeholder, which links only to /ai101.
  Whether the library replaces it is the user's call. Two older problems the review found, which the
  library now exposes to more people: /ai101's sprint calendar buttons add dates that have passed
  (D-032), and page 8 of the Task Sync PDF still has template blanks (D-038).

## D-051 · Nothing on www reaches the app: exact page paths, and a 404 for a missing file

**Date:** 2026-11-08
**Approved by:** the user, in the handoff sent to this thread on 2026-11-08, under "Ready to do":
"Close the www deep-path hole for the older pages (/retool/x reaches the SPA on www). Make the guide
slugs in PUBLIC_PREFIX match exactly, the way library|guides|skills do, and add lookalikes to
apps/api/test/marketing.test.ts. Check that /<slug>/ 301s still pass." The missing-file and
`/index.html` halves below are the same leak, found while closing it, and are not in that quote:
they ship for the user's review in the same change.
**Scope:** `apps/api/src/routes/marketing.ts`, `apps/api/test/marketing.test.ts`. No page, copy or
route changes; `learn` is untouched.

- **The hole (D-029, named in D-050).** `PUBLIC_PREFIX` matched the older pages' slugs as prefixes, so
  on www `/retool/x`, `/ai101/anything` and `/waitlist/x` passed the allow-list, found no route, and
  `server.ts`'s not-found handler answered with the LMS's `index.html`, 200. So did `/AI101/`,
  `/ai-101/`, `/RETOOL/` and `/Retool/`, which no route answers. Confirmed in production on
  2026-11-08. In a browser the app then sent the visitor to `/sign-in`, which www 302s to `/`, so
  people ended on the placeholder after loading the whole app; a client with no script, a crawler
  among them, got the app's shell.
- **Exact paths.** Every page path now matches whole, with or without a query string, and with a
  trailing slash only where a route answers one (`/ai101/`, `/waitlist/`, each `/<slug>/`, `/library/`,
  `/guides/`, `/skills/`). Anything deeper or lookalike goes to `/` with the 302 every unknown path
  gets. Adding a guide is unchanged: its slug joins the group that takes a trailing slash, its aliases
  the group that does not.
- **A missing file is a 404 on www.** A path whose last segment has an extension passed as a "file"
  whether or not one existed, so `/vault/x.png`, `/retool/x.html`, `/ai101.html` and `/favicon.ico`
  were also the app's shell, 200. A real file still passes (every file in `dist/` is a route, and so
  is `/ai101/carousel-sprint.ics`); a missing one now answers a plain-text 404, decided by the router's
  own `is404`, not a redirect, so a browser's unprompted favicon request costs one round trip.
- **`/index.html` is the placeholder.** `ROOT` named it, but it was checked after the file rule, and
  `/index.html` is a real file (the app's), so www served the app there. The placeholder is now
  checked first.
- **Tests.** Three new tests in `marketing.test.ts` put production's not-found handler back around
  `build()` (as a stand-in that answers with a shell) and hold that no deeper path, lookalike or
  missing file on www is answered with it, driven by `GUIDE_SLUGS` and `GUIDE_ALIASES`. All three fail
  on the old allow-list with the production symptoms. Checked as well against the real server
  (`server.ts` with `MARKETING_HOST` set and a built `dist/`): every page, alias, redirect, download
  and the `.ics` answer as before on www, and `learn` serves the same responses for every path tried.

## D-052 · The skills platform: skill sources in the repo, one page shape for every skill, a library for 18 or more

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, setting the goal for the skills library: "Keep each
skill's source in the repo (for example skills/<slug>/), generate its ZIP with a script, commit the ZIP
to apps/web/public/downloads/, and add a test that fails if the ZIP and its source drift apart." "Where
the job works in ChatGPT too, a ChatGPT Project version: its instructions and the files to add. Never a
custom GPT." "If adding a dozen guides shows a real duplication problem, you may refactor, with its own
decision entry and no change to the existing pages' output." "Keep the library usable at 18 or more
cards. Fix the phone layout so the first card is on the first screen. Add a topic only when several
cards use it." The slate of 17 skills was approved the same day: "slate approved."
**Scope:** `skills/` (new: `README.md`, `_shared/`), `scripts/skills.mjs` and `skills.d.mts` (new),
`eslint.config.js`; in the web app `src/guides/{content,render}.ts`, `skill-page.ts`, `skills.css`,
`skill-page.test.ts`, `skills.test.ts` (new), `src/library/{content.ts,library.css}`; in the API
`routes/{guide-list,marketing}.ts`, `integrations/ghl.ts`, `test/{authz,guides}.test.ts`. No new page
yet: each skill's page, ZIPs and library card arrive with its own entry (D-053 on).

- **A skill's source lives in `skills/<name>/`** (`skills/README.md` is the contract): `SKILL.md` and
  `references/` (what Claude reads), `chatgpt/` (the ChatGPT Project version: one instructions file, up
  to three more, and the words for the Project's Instructions box), `practice/` (made-up files to
  practise on), `evals/` (the test cases, their made-up files, and every run with its grading),
  `sample.md` (one kept output, for the page) and `page-notes.md`. Facts several skills share (the Utah
  REPC, Utah property rules, buyer agreements, outreach rules) live once in `skills/_shared/` and are
  copied into each skill's ZIP that lists them, since a skill installs alone and cannot point outside
  its folder.
- **`node scripts/skills.mjs build` makes the three downloads** a skill page offers, under
  `public/downloads/`: `<name>.zip` (the skill, one `<name>/` folder at the root, as Claude's upload
  needs), `<name>-chatgpt.zip` and `<name>-practice.zip`. No dependency: the ZIPs are written with
  node:zlib, sorted, with one fixed timestamp, so a rebuild with no source change writes the same bytes.
  `check` holds each skill to Anthropic's format and the house rules before it builds: frontmatter keys
  only from the Agent Skills spec's list; a lowercase name equal to the folder, never containing
  "claude" or "anthropic"; a description of 1,024 characters or fewer with no angle brackets (the Reel
  Editor's 833 upload fine; Anthropic's pages disagree, and the help center's 200 is not what the
  uploader enforces); every reference SKILL.md names actually shipped; no em or en dash in any file; a
  ChatGPT version of four files or fewer (Free ChatGPT holds 5 in a Project) with no mention of Claude;
  practice files, two or more test cases, a sample and page notes.
- **The drift test** (`src/guides/skills.test.ts`) unpacks every committed download and holds each
  entry, byte for byte, to its source, and fails on a file one has and the other lacks. It also holds
  each skill to its page (the right three downloads, and the ChatGPT instructions copied word for word
  from `chatgpt/paste.txt`), its HTML shell, its build entry and its library card, and fails on a ZIP in
  `downloads/` that no source makes (the Reel Editor's, Connor's own file, is the one exception).
- **One page shape for every skill.** `skillPage()` (`src/guides/skill-page.ts`) writes what every skill
  page says the same way: the hero's three steps, the opt-in, and the setup. In Claude: check code
  execution is on, download the ZIP, add it in Customize > Skills, turn off training, practise on the
  made-up files, then use it on real ones. In ChatGPT: turn off training, download, make a Project, add
  the files on its Sources tab, paste the instructions, practise, use it. Training is turned off before
  the practice in both, and the practice comes before any real file: tests hold that order. Steps only
  one skill needs (an account to make, a connector to switch on) come after the practice, which needs
  neither, and before real files. A practice set too big to attach file by file (a Claude chat takes 20
  files) is attached as its ZIP, which Claude unpacks. A page file holds only the skill's own words. The click paths are the ones /reel-editor (D-045) and /retool (D-048,
  D-049) checked, plus Claude's help center on 2026-11-08: code execution is on by default for Free,
  Pro, Max and Ultra, and is called "Create and edit files" in Claude's newer settings ("Create and edit
  files with Claude", modified 2026-11-05); the upload path ("Use skills in Claude", modified
  2026-10-30); the Privacy settings page, `claude.ai/settings/data-privacy-controls` (Anthropic's
  Privacy Center).
- **The Claude / ChatGPT switch is two radio buttons and CSS, no script:** the inputs come before both
  step lists as their siblings, and `:checked ~` shows one. It works with JavaScript off, in Safari 13
  (no `:has`) and in Instagram's in-app browser. Claude is checked to start. With no CSS, both lists
  show, each under its heading.
- **New parts, used only by skill pages:** a step can offer another file to save under its own name (the
  ChatGPT version, the practice files), and a long copy block (the Project's instructions), the copy
  chip's own button and script; a `sample` section draws a run's output as a document, with its tables
  in a region a keyboard can scroll (sideways on a phone only when a table has four columns or more).
- **No change to the existing pages' output.** Skill pages load `skills.css`, which imports the guide
  styles and adds their own, and the same script, unchanged. Every other page built from this change
  (/ai101, /voice-profile, /retool, the three guides, the legal pages, the placeholder, the app) is
  byte-identical to the build before it; the library is the one page that changes, on purpose.
- **Fewer lists to keep by hand.** The www allow-list is built from `GUIDE_SLUGS` and `GUIDE_ALIASES`
  (its pattern is byte-identical to the hand-written one of D-051 for today's five guides); each guide's
  GoHighLevel tag is its slug, from the same list; a guide lands its no-JS sign-up on `#download` unless
  it is one of the two step-throughs (/voice-profile and /retool land on `#unlocked`, as before); and the
  API's route inventory test classifies every guide's routes from the list. So adding a skill page is:
  its source, its page file, its shell (`node scripts/skills.mjs shell`), one line in `GUIDES`,
  `GUIDE_HTML` and `GUIDE_SLUGS`, and its library card.
- **The library at 18 or more cards.** On a phone each row of pills is one line that scrolls sideways
  inside itself, never the page; the hero is shorter; the search box and the sort keep their labels for
  a screen reader but do not draw them. At 390 by 844 the first card now starts 506 pixels down, whole
  on the first screen (it was 775). From 640 pixels wide nothing changes. Three topics join, each used
  by six or more of the new skills: Buyer Side, Listing Side and Contracts and Offers. A topic shows only
  once a card uses it, so they appear with the first skill pages.
- **Verified:** web tests, typecheck and lint; the API suite (894) against a local Postgres; every page's
  build compared byte for byte with the build before; a throwaway skill page built and checked in
  Chromium at 390 pixels (the switch shows one app's steps, no sideways scroll, the copy block and the
  sample read well); the library at 390 and 1280 pixels. **Not verified:** a real phone, and the switch
  with a screen reader.

## D-053 · /database-health-check: Database Health Check, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/database-health-check/`, `apps/web/src/guides/database-health-check.ts`, `apps/web/database-health-check.html`, `apps/web/public/downloads/database-health-check*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/database-health-check is the Database Health Check skill's page** (`apps/web/src/guides/database-health-check.ts`, `DATABASE_HEALTH_CHECK`), built with `skillPage()` (D-052). It uses slug `database-health-check`, unlockKey `dhc-unlocked`, and the ChatGPT instructions from `chatgptPaste('database-health-check')`, so they stay word for word with `chatgpt/paste.txt`. The eyebrow is "Free AI Skill · For Team Leaders and Ops". The lede is page-notes.md's one-line promise. The outcome step is "Clean Up and Reach Out". The practice prompt is page-notes.md's. The last step says to attach your own CRM export and gives the Follow Up Boss export click path.
- **Sections, in order:**
  - **The sample**, a shortened and faithful excerpt of sample.md: the bottom line, three health report findings, part of the contact info table, the worklist's top five actions and how to work the first, the six groups, Past Clients in full (its Smart List filter, counts, why, next move, call opener and email, and "No text: none of these 18 shows a yes in Text Consent"), three of the seven team questions, and four check-before-sending items.
  - **What you get back:** the eight output parts, in SKILL.md section 7's order.
  - **Who does what:** Run, Draft and Own.
  - **What you need:** six tiles with a button back to the sign-up.
  - **What to say:** page-notes.md's five prompts in three groups.
  - **Good to know:** six questions, including "What won't it do?" and the plan question.
  - **A note** pointing recruit lists to Recruiting Prep at /recruiting-prep.
- **Connor's three calls are left open.**
  - **Consent:** the page says only that the skill drafts texts just for contacts whose export shows documented consent, and flags the rest. The sample leaves out how the consent yes values were recorded, its question about that, and the matching check line.
  - **Texts:** the page says texts are drafts an agent sends, never a mass text. It leaves out the sample's one-at-a-time line.
  - **Merges across agents:** the page says the skill lists them for the team to decide and never merges.
- **What the page says the skill needs, all from page-notes.md:**
  - A Claude plan with skills and code execution. Free is listed by Claude's help center but unconfirmed in Claude's docs, and untested.
  - Or a ChatGPT plan with data analysis, which the free plan limits, so big exports work best on a paid plan. No ChatGPT limits are stated as numbers: page-notes says they came only from search excerpts.
  - A computer, because Follow Up Boss saves the export as a CSV.
  - A Follow Up Boss export by the Account Owner or someone the owner gave Can Export, or another CRM's full export. A closed-deal export is optional.
  - No connector. A CRM connector, if on, is only read from.
  - No cost beyond the AI plan and the CRM.
- **Sources:**
  - The setup steps are `skill-page.ts`'s, from the click paths in D-045, D-048, D-049 and D-052, checked 2026-11-08.
  - The Follow Up Boss export path, Can Export and the owner's export email come from the Follow Up Boss help center articles page-notes.md cites ("Export Contacts to a Spreadsheet", "Users, Roles & Permissions", "Invite and manage your team").
  - The Columns tip comes from "Filtering contacts".
  - The Claude plan facts come from Claude's help center ("Use skills in Claude", "Create and edit files with Claude"). ChatGPT's "Limited" data analysis comes from chatgpt.com/pricing.
  - "Follow Up Boss has no consent column of its own" comes from `references/fub-and-crm-exports.md`, which infers it from the help center's column list.
  - The Default Smart Lists fact in the sample is a review-checked fact.
- **Beyond the spec:**
  - Terms a first-time user may not know are explained where they first appear: skill (in the sign-up text), connector, Smart List and CSV.
  - The last step's note gives the Follow Up Boss export path instead of the shared note about dates, dollar amounts and page numbers, which doesn't fit this skill.
  - The FAQ says plainly what was tested: in Claude, not on Free, and not yet in ChatGPT. It says the skill is "built to read" other CRMs' exports, because only a made-up one was tested.
  - The sample shows the consent rule at the level of one group, without taking a side on Connor's open consent call.
  - The three ZIPs are built with `node scripts/skills.mjs build database-health-check`, which also passed the skill checks: `database-health-check.zip`, `-chatgpt.zip` and `-practice.zip` in `apps/web/public/downloads/`.
- **Tested:**
  - Rendered with the preview harness and screenshotted at 390 px in every state: the hero, the locked sign-up, the Claude and ChatGPT steps, the sample, and every section with the FAQ answers open. No sideways scroll. Each screenshot was read and fixed, then previewed again.
  - `pnpm exec tsc --noEmit` passes.
  - No em or en dashes in the source or on the page. Curly apostrophes everywhere except the ChatGPT instructions, which are copied word for word from paste.txt.
- **Not tested:**
  - No real phone.
- **The skill's own tests** (`skills/database-health-check/evals/`), from its build: 1 fub-5000: 15 of 15 expectations; 9 of 9 applicable objective checks (400 of 400 numbers trace to the run's analysis output); 2 other-crm: 9 of 9 expectations; 9 of 9 applicable objective checks; 3 no-consent: 8 of 8 expectations; 9 of 9 applicable objective checks; no-skill baseline 2 of 8; practice: 12 of 12 applicable case-1 expectations; objective checks all pass (339 of 339 numbers traced).
- **Against no skill:** Without the skill, Claude (with code execution) on case 3 wrote texts for every group despite no consent field, told a lead 'I saw you were looking at homes online', printed contact names and an email in the chat, miscounted duplicates (case-sensitive emails, raw phone text, the office line counted as duplicates: 14 email rows vs the skill's 20 merge groups) and stale contacts (484, mixing trash, nurture and past clients into the pipeline), used banned phrasing and an unsupported equity claim, suggested mass-applying action plans (FUB can't), and produced no worklist, no Smart List filters, no opt-out language, no team questions and no Check Before Sending. It passed 2 of 8 expectations; the skill passed 8 of 8. The skill adds: math in tested code with every number traceable, a worklist CSV as the only place personal data appears, FUB-verified export, merge, pond and Smart List facts, consent-gated text drafts, CAN-SPAM-style footers, and non-overlapping problem ranking with a first-cleanup rule.
- **Independent review** (verdict: ready-with-notes): case-2 other-crm: passed; practice: passed; case-1 fub-5000 and case-3 no-consent: passed.
- **Open for Connor** (from the review and the page):
  - Check one real Follow Up Boss 'Export All Columns' file (yours or a Forum member's, redacted): header names, date format, whether Last Communication and Last Activity come through, and how a custom Text Consent field exports. Every stale-lead check depends on it.
  - Decide how teams should treat consent recorded from a website form or an open house sign-in sheet. The skill now flags these, citing Follow Up Boss's own compliance page that a form is not an opt-in without consent wording. Confirm the wording with your broker or attorney before the Forum session.
  - Texts now come with a note that agents send them one at a time, never as a mass text. This follows Follow Up Boss's compliance page, which says its texting is not for mass or drip texting and warns against pasting the same text lead by lead. Keep or adjust this framing for the Forum audience.
  - Merge groups whose records belong to different agents are now counted and sent to the team ('who keeps the contact'), never decided by ops or the skill. In the synthetic data that is more than half the merge groups. Confirm that's the stance you want to teach.
  - Before publishing, confirm the ChatGPT Free limits in a browser (5 files per Project, 3 uploads a day, data analysis 'Limited'). page-notes flags them.
  - Run node scripts/skills.mjs build, which writes to apps/ (outside my lane), so the downloads include these changes.
  - Three calls are yours, and the page leaves each one open. Consent recorded from a website form or an open house sign-in: the page says only that texts are drafted for contacts with documented consent, and the rest are flagged. Texts going out one at a time: the page says only 'drafts an agent sends, never a mass text.' Merges across agents: the page says the skill lists them for the team and never merges. Once you decide, the sample can add back the consent breakdown, Question 6 and the one-at-a-time check line.
  - Before the Forum on November 13 to 15, run one real Follow Up Boss 'Export All Columns' file through the skill. Nobody has checked yet whether Last Communication, Last Activity and a Text Consent custom field come through, and every stale-lead check depends on them.
  - The ChatGPT version has never been run inside ChatGPT, so the plan answer in the FAQ says 'We tested the skill in Claude, not on Free and not yet in ChatGPT.' Run the practice file in a ChatGPT Project, then drop 'and not yet in ChatGPT'.
  - Setup time says about 10 minutes, in the hero, the unlocked card and 'What you need'. That is my estimate: no source gives one. Change setupMinutes if your own setup runs differently.
  - Two shared lines in skill-page.ts, which I didn't touch, affect this page. The ChatGPT 'Make a Project' step says Free ChatGPT allows 5 files in a Project, but page-notes says that number came only from search excerpts. The practice note says to start chats inside your My Voice project, which in ChatGPT conflicts with practising inside this skill's own Project.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,117), API tests (943, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).
## D-054 · /recruiting-prep: Recruiting Prep, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/recruiting-prep/`, `apps/web/src/guides/recruiting-prep.ts`, `apps/web/recruiting-prep.html`, `apps/web/public/downloads/recruiting-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/recruiting-prep is the free page for Recruiting Prep** (`skills/recruiting-prep/`, version 1.0). It is built with `skillPage()` (D-052) in `apps/web/src/guides/recruiting-prep.ts` as `RECRUITING_PREP`, with slug `recruiting-prep` and unlock key `rp-unlocked`. It is for team leaders, recruiters and appointment setters. Connor presents it at the Forum, November 13 to 15. It has a Claude skill and a ChatGPT Project version, and the ChatGPT instructions are read from `chatgpt/paste.txt` through `chatgptPaste()`.
- **What the page says the skill does.** There are two modes. List mode turns a recruit list (an MLS agent production report, a BrokerMetrics, Sisu, GoHighLevel or Follow Up Boss export, or a tracker, often mixed) into one de-duplicated list, tiered by production. It adds why-now signals, owners by tier, first-touch drafts and a clean CSV. Appointment mode preps one recruiting coffee: a production profile with the math shown, likely needs (from the team's document first, the rest labeled general guidance), discovery questions with a don't-ask list, the offer mapped to those needs, the terms quoted word for word, objection answers and a follow-up email. Every word comes from SKILL.md, its references, page-notes.md, sample.md and the graded runs.
- **Guardrails the page holds to, as SKILL.md does:**
  - It tiers on production only, never on anything personal, and never reads a notes column.
  - It makes no income, earnings or revenue-share projection, ever, even from the candidate's own numbers. The FAQ gives page-notes.md's FTC reason.
  - It never disparages a candidate's current brokerage.
  - Every recruiting text and email is treated as marketing. Texts go only to contacts with documented consent, and every message has an opt-out line, the sender and the brokerage.
  - MLS data rules vary, so the page says to check yours, with Bay East 12.11.1 and MLS Now Rule 7.3 as examples.
  - On telemarketing, the page says only that whether federal rules reach a recruiting text "isn't settled", that the drafts follow every marketing text rule anyway, and that state rules differ (Florida, Maryland and Oklahoma notes; any other state is flagged as not checked). It never says a recruiting text is not telemarketing.
- **Sections, in order:**
  - **The sample:** sample.md, shortened, cut only by whole items, rows, columns and sentences and labeled "Made-Up Example". It keeps the bottom line, five of seven flags, what was merged, the tiers, four of eight signals, the consent line, the Growing email and one text, then Marisol's profile, needs, four questions, the terms as written, one objection and five check lines.
  - **What you get back:** 12 parts, in SKILL.md's output order for list mode and then appointment mode.
  - **Who does what:** Run, Draft, Own.
  - **What you need:** six tiles, with the button back to the sign-up.
  - **Where to get your list:** new beyond the brief, see below.
  - **What to say:** page-notes.md's five prompts, in three groups.
  - **Good to know:** six questions.
  - **The note:** points to /team-playbook-builder for an agent who has already joined.
- **What it needs, as the page says it:**
  - **Claude:** a plan with skills and code execution. Claude's help center lists Free, but its developer docs list Pro and up, so Free is not promised. On Team or Enterprise, an owner turns code execution on.
  - **ChatGPT:** a Project with data analysis, which the free plan has only as "Limited". No ChatGPT Free numbers appear in this page's own words.
  - **A computer** to set up and to export the list.
  - **The recruit list.** The roster and the value proposition are optional.
  - **Connectors are optional, Claude only, read only and untested:** Google Drive or Microsoft 365 for the offer document, and Granola for meeting notes (Granola transcripts need its Business or Enterprise plan).
  - **No cost** beyond the Claude or ChatGPT plan and the MLS access or recruiting tool already in use.
- **Sources.**
  - The setup steps are `skillPage()`'s shared ones (D-045, D-048, D-049, D-052).
  - The export click paths are page-notes.md's, each from the vendor's help center, checked 2026-11-08: BrokerMetrics Export, the Sisu Recruits page article, HighLevel's Opportunities FAQs and Smart Lists, Follow Up Boss "Export Contacts to a Spreadsheet", and Google Docs Editors Help for a Google Sheet.
  - The plan facts are page-notes.md's, from Claude's help center and docs and chatgpt.com/pricing.
  - The MLS, FTC and texting facts come from page-notes.md, references/outreach-rules.md and references/recruiting-guardrails.md. Those cite the 2026 NAR Code, FTC 87 FR 13951, 47 CFR 64.1200, Bay East and MLS Now.
  - The practice prompt is page-notes.md's, word for word.
- **Calls made inside the brief:**
  - **A "Where to get your list" section** (six exports), placed after "What you need", as /team-playbook-builder has "Where to get your documents". People need to get the list out of five different tools before the skill can do anything.
  - **No Gmail draft is promised.** SKILL.md allows one when asked, but no run tested it, and Claude's pages disagree on whether its Gmail connector can write a draft (as due-diligence-review.ts records).
  - **The sample is drawn to read on a phone without hiding a column.** The merge table became a list. The tiers kept three columns. The why-now ID, agent and level share one column. The profile's totals are turned on their side. The email's signature and footer lines are joined into one paragraph each. The words are sample.md's.
  - **`setupMinutes` is 10, an estimate,** as the other pages with a ChatGPT version say. page-notes.md gives none.
  - **The eyebrow is "For Team Leaders and Recruiters",** with non-breaking spaces. Adding appointment setters wrapped badly at phone width.
- **Built:** `node scripts/skills.mjs build recruiting-prep` wrote `public/downloads/recruiting-prep.zip` (43,496 bytes), `recruiting-prep-chatgpt.zip` (41,507 bytes) and `recruiting-prep-practice.zip` (56,797 bytes) from the current sources. The skill check passed first.
- **What the skill's runs showed:**
  - Case 1, a messy 205-row MLS report and tracker with a roster: 12 of 12.
  - Case 2, appointment prep with a request for take-home math: 10 of 10. A run without the skill scored 2 of 10: it projected take-home pay and wrote an email with no opt-out line.
  - Case 3, a GoHighLevel export with personal notes and Florida contacts: 10 of 10.
  - The practice files, both modes in one request: 12 of 12, kept as sample.md.
  - A reviewer reran case 3 and the practice files from the skill alone and got the same counts.
- **Verified for the page:**
  - The preview rendered with no em or en dash, and TypeScript typechecks.
  - Screenshots at 390 pixels wide covered the hero, the sign-up, the whole sample, the Claude setup and the ChatGPT setup, and every FAQ answer opened.
  - The page is 390 pixels wide, so nothing scrolls sideways, and no table hides a column.
  - Visible copy has no straight quotes or apostrophes, apart from the ChatGPT instructions, which are copied word for word from the skill.
- **Not verified:**
  - Accessibility (axe) and a real phone.
  - The skill on a real MLS, BrokerMetrics, Sisu or GoHighLevel export, inside ChatGPT, on Claude Free, or with any connector.
- **The skill's own tests** (`skills/recruiting-prep/evals/`), from its build: 1: 12 of 12 expectations; 9 of 9 applicable objective checks; 2: 10 of 10 expectations; 8 of 8 applicable objective checks; no-skill baseline 2 of 10; 3: 10 of 10 expectations; 9 of 9 applicable objective checks; Practice files, both modes in one request: 12 of 12 checks; 9 of 9 applicable objective checks.
- **Against no skill:** On case 2 the no-skill answer passed 2 of 10 expectations. Asked for what the candidate would take home, it assumed a 2.5% commission rate, projected $319,900 and claimed a gap of more than $84,000 a year against a 70/30 split it invented. It told the leader to print that table for the candidate. It also stated needs as facts without labeling them, invented team services and a testimonial ('A lot of our top producers felt that way'), and left out the agreement and pending-deals question and the don't-ask list. Its follow-up email had a subject that was not Title Case, no opt-out line, no postal address and no recruiting footer, repeated her closing count and made an earnings claim. With the skill, the same prompt declines the projection in two sentences and quotes the terms with no math. Every needs statement is labeled general guidance, and each objection is answered only from the team's own documents, with placeholders where they say nothing. The follow-up email meets CAN-SPAM, and every number is traced in Check Before Sending. In list mode, what the skill adds is merges and counts that come out the same every run, from code that is tested and shipped with the skill. A no-skill answer would have to hand-build that code each time.
- **Independent review** (verdict: ready-with-notes): Case 3: GoHighLevel export with personal notes, a request to use them, team A to D tiers, Florida: passed; Practice files, both modes in one request: passed.
- **Open for Connor** (from the review and the page):
  - Decide whether a recruiting text to an agent counts as telemarketing in your members' states, or have the Forum's broker or attorney confirm it. The skill treats every recruiting text as marketing either way.
  - Send one redacted real export (an MLS production report or BrokerMetrics, plus a GoHighLevel or Sisu recruits download) from a Forum member, so the Columns Used mapping can be checked before the November 11 sessions.
  - Send Utah Life's value proposition by production level when it's ready. It becomes the appointment-mode fixture.
  - Approve the two behavior rules the review added: no statements about the sender or team beyond the files (no 'I talk with a few agents each quarter'), and one level-neutral email for agents with no production data instead of a level's offer.
  - Confirm that eval input files should carry 'PRACTICE FILE: made-up example' (changed from 'TEST FILE' so they match the practice files). Other skills in the repo still use TEST FILE on eval inputs, so pick one convention.
  - Run `node scripts/skills.mjs build recruiting-prep` before release so the downloads match the edited sources.
  - Whether a recruiting text counts as telemarketing in a given state is still your open question. The page never says it doesn't. It says the federal answer isn't settled, that the drafts follow every marketing text rule anyway, and that state rules differ, so check yours with your broker.
  - The page doesn't promise Gmail drafts. SKILL.md allows them when asked, but no run tested the Gmail connector, and Claude's pages disagree on whether it can write a draft. If you confirm it works, add a prompt like "Save these as Gmail drafts".
  - This page's own copy gives no numbers for ChatGPT Free. But the shared ChatGPT "Make a Project" step in skill-page.ts (D-049, D-052) says "Free ChatGPT allows 5 files in a Project." That line is on every page with a ChatGPT version. If you want no Free ChatGPT numbers anywhere, change the shared step.
  - The practice prompt from page-notes.md says "Tuesday, November 10 at 11", which is a past date by the Forum (November 13 to 15). Nothing depends on the date, but you could change it in page-notes.md and sample.md if it looks odd on stage.
  - The skill was tested only on made-up lists. Before release, run one redacted real export from a Forum member (an MLS report or BrokerMetrics, plus a GoHighLevel or Sisu download), as the review asked. The page tells people to check "What was merged" against their own file the first time.
  - The eyebrow names team leaders and recruiters only. Adding appointment setters wrapped badly at phone width.
- **Independent page check (2026-11-08, after this PR opened).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found: the lede and library card no longer say every agent is tiered (14 of 83 practice agents had no MLS data and were left untiered); the plan wording matches every skill page; ChatGPT Free's limits are described with no numbers; the earnings FAQ drops the legal word "material" and says terms are laid out only when the files state them; one name ("value proposition") for the team's offer document; and the sample's own label restored word for word. Open from it: the practice prompt's date (November 10) and whether connector plan limits belong on the page.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,117), API tests (943, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).
## D-055 · /team-playbook-builder: Team Playbook Builder, a free skill for Claude

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/team-playbook-builder/`, `apps/web/src/guides/team-playbook-builder.ts`, `apps/web/team-playbook-builder.html`, `apps/web/public/downloads/team-playbook-builder*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/team-playbook-builder is the Team Playbook Builder's page.** It is built with `skillPage()` (D-052) in `apps/web/src/guides/team-playbook-builder.ts`, with export `TEAM_PLAYBOOK_BUILDER`, unlock key `tpb-unlocked` and slug and skill `team-playbook-builder`. It works in Claude only (skill.json `apps: ["claude"]`). So the page has no ChatGPT switch and no `-chatgpt.zip`, and `chatgptPaste` is not imported, because lint fails an unused import. The page is for team leaders, owners and ops staff. The leader attaches the team's SOPs, policy manual, onboarding checklist, fee schedule and training transcripts. Claude returns, in SKILL.md's order: a bottom line; Needs your answer; the playbook skill (a ZIP each agent adds to their own Claude, checked against Claude's upload rules); conflicts; gaps; stale and broker flags; a log of what was left out; a 25-question test set; a draft message to agents with install steps and sharing steps by plan; and Check before sending. Connor presents it at the Forum, November 13 to 15.
- **Sections, in the brief's order, plus one:** a sample from the practice run; What you get back; Who does what (Run, Draft, Own); What you need (with the button back to the opt-in); **Where to get your documents** (added); What to say (all six of page-notes' prompts, in three groups); Good to know (six FAQs); and a note pointing to /database-health-check. "Where to get your documents" holds page-notes.md's upload sources (Google Docs download, the Google Drive connector, the Microsoft 365 and ClickUp connectors, Zoom VTT transcripts, and Otter, Fathom or Granola). It is there because the job depends on gathering files, and the last setup step points to it.
- **The words** come from SKILL.md, its references (agent-install.md, source-handling.md, playbook-template.md), page-notes.md, the graded runs and the build and review reports, so the page promises only what the skill does. The lede is page-notes' one-line promise without "instead of texting you", which the page can't back. "Skill" is explained in the opt-in, and "connector" in its tile. The practice prompt is page-notes' word for word.
- **The sample** is sample.md (the practice run, 12 of 12 checks), cut only by whole items, rows, columns and sentences. A script confirmed that every string on the page appears in sample.md word for word, except the four table captions, which are the page's own labels. It keeps the bottom line, Needs your answer, the topic table (topic and owner), how the playbook behaves, the pond conflict, the top three gaps, the stale flag, two broker flags (including "confirm with your broker"), three removals, 3 of 20 answerable and 3 of 5 routed test questions, the message to agents in full, and 3 of the 19 check lines. Every table has two columns so it reads on a phone. Test answers and check lines end with "Source:" and the sample's own source. The routed questions drop the "A wrong answer would" column.
- **What it needs, only as page-notes.md supports:**
  - A Claude plan with skills and code execution. Claude's help center and pricing page list Free; the claude.com docs and the platform docs leave it out. The page states both, says a Free account that can't add a skill needs a paid plan, and never promises Free.
  - Each agent needs their own Claude account, or a seat on a Team or Enterprise plan (shared with them, or added for everyone by an owner).
  - A computer, to add skills.
  - Up to 20 files in one chat.
  - Optional connectors (Google Drive, Microsoft 365, ClickUp), read only and marked untested.
  - No cost beyond the Claude plan. Zoom VTT transcripts need a paid Zoom account.
  - The tag says "or none if an owner adds it", not "none on Team or Enterprise", because a shared skill stays off until each agent turns it on.
- **Setup steps** are skill-page.ts's (D-052). The document click paths are page-notes.md's, checked on 2026-11-08 against each vendor's help center. ClickUp's own export steps are sent to ClickUp support (its help center blocked the check), and Otter, Fathom and Granola get "export or copy the transcript as text" with no click path. Setup is estimated at 10 minutes, as on the other skill pages with a practice run (page-notes gives no time).
- **Run, Draft, Own** follow SKILL.md:
  - Run: Claude reads, sorts, finds conflicts, gaps and stale sections, takes out personal data, and checks and packages the playbook.
  - Draft: the playbook, the test set and the message to agents, which the leader reads first.
  - Own: every policy, which version wins a conflict, whether a fee schedule applies to everyone, sharing, and any decision about a person. Texting consent, client funds and fair housing go to the broker, and wire and account numbers never go in the playbook.
- **What the page does not promise, because it wasn't tested:** ChatGPT (the plan FAQ says the playbook is built for Claude, and an agent who uses only ChatGPT would need a Claude account), connector reads, a live upload of a generated ZIP, or answers from an installed playbook. The update FAQ keeps the skill's honest fallback: the help center doesn't say how to load a new ZIP into a shared skill, so delete the old one, upload the new ZIP and share it again.
- **Verified:**
  - `pnpm exec tsc --noEmit` and eslint on the file pass.
  - The preview harness renders the page with no em or en dash.
  - At 390 by 844 in Chromium: the locked hero and opt-in, the unlocked setup, the sample, the FAQ with every answer open, and the full page. No sideways scroll, and no element wider than the screen outside a table's scroll region.
  - `node scripts/skills.mjs check team-playbook-builder` prints ok. `build` rewrote the two ZIPs byte for byte the same (same sha256).
- **Not verified:**
  - A real phone.
  - A live claude.ai upload of a generated playbook, and its 25 questions run against it.
  - Attaching the practice .vtt file in claude.ai (the runs read it as text).
  - Free plan behavior.
- **The skill's own tests** (`skills/team-playbook-builder/evals/`), from its build: practice: 12 of 12 checks (4 spec traps, 8 behavior and objective checks); eval 1: 11 of 11 expectations, plus the objective checks; eval 2: 9 of 9 expectations, plus the objective checks; eval 3: 8 of 8 expectations, plus the objective checks.
- **Against no skill:** On eval 1, Claude without the skill made a plausible skill folder, but it picked the handbook in the closing gift conflict and wrote policy for both gaps (a pond rule and offboarding). It also gave a wrong upload path (Settings > Capabilities), had no citations, owners, dates, staleness rule or routing, did not check the name or ZIP, and wrote no test set, agent message or Check before sending. It met 2 of 11 expectations; the skill met 11 of 11. What the skill adds: answers tied to a cited section, conflicts shown instead of decided, gaps routed instead of filled, personal data and individual pay kept out and verified by a must-not-contain scan, pre-2024 buyer steps held for the broker, a ZIP that passes Claude's upload rules, a 25-question test set, and sharing steps matched to the plan.
- **Independent review** (verdict: ready-with-notes): eval 2: individual-splits-and-personal-data: passed; practice: Lantern Lane Example Team, five files: passed.
- **Open for Connor** (from the review and the page):
  - Decide whether a later version should add ChatGPT install steps. A reviewer reported that ChatGPT now takes skills in the same format; not verified here (OpenAI's help center blocks automated reads), and nothing has been tested there.
  - Send Utah Life's real onboarding documents for the private-fixture pass. That is the only test of long manuals and real formatting.
  - Before the Forum, upload one generated ZIP (evals/runs/practice/lantern-lane-example-team-playbook.zip) to a live Claude account and run its 25 questions. That is the one end-to-end check no one could do here.
  - Confirm the page wording on plans: 'works on any Claude plan; if an agent on Free doesn't see the upload option, they need a paid plan'. The Help Center and pricing page list Free; the claude.com docs and platform docs leave it out.
  - Keep or reverse two reviewer changes: the agent message now says 'a few clicks' instead of 'about two minutes', and a topic with a CONFLICT or UNDER REVIEW block now keeps its own file.
  - Before the Forum, upload skills/team-playbook-builder/evals/runs/practice/lantern-lane-example-team-playbook.zip to a live Claude account and ask it the 25 test questions. No one has done this end-to-end check.
  - Attach the five practice files to a claude.ai chat once, to confirm it accepts the .vtt training call transcript. The graded runs read it as text, so an upload refusal would break the page's practice step on stage.
  - Confirm the plan wording. The page says Claude's help center lists skills on every plan, Free included, but Claude's docs leave Free out, and that a Free account that can't add a skill needs a paid plan. I didn't use page-notes' "works on any Claude plan", because the brief says never to promise Free.
  - Send Utah Life's real onboarding documents. Every practice and eval document is one to two pages, so "reads every document in full" is untested at real manual length, and so are sets over 20 files.
  - Setup time on the page ("about 10 minutes") is an estimate, as on the other skill pages with a practice run. page-notes gives no time.
  - From the review: decide whether a later version adds ChatGPT install steps for teams that use only ChatGPT. Also keep or reverse two reviewer changes in the skill: the agent message says "a few clicks", and a topic with a CONFLICT or UNDER REVIEW block keeps its own file.
- **Independent page check (2026-11-08, after this PR opened).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found: plan wording that matches every skill page, said for the leader and for each agent; "No extra cost" now says a Claude plan for you and for each agent; "reads every document in full" became "reads every document" (every test file was one or two pages); an unbacked line about ChatGPT-only agents replaced with "not tested in ChatGPT"; prompts regrouped by where each one works; the sample note lists every cut; and the closing note no longer calls Database Health Check "the other" team leader skill. Open from it: attaching the practice .vtt file in claude.ai, update mode, and an installed playbook answering its 25 questions are untested.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,117), API tests (943, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-056 · /content-strategist: Content Strategist, a free skill for Claude

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/content-opportunity-research/`, `apps/web/src/guides/content-strategist.ts`, `apps/web/content-strategist.html`, `apps/web/public/downloads/content-opportunity-research*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/content-strategist is the page for Connor's Content Strategist** (`skills/content-opportunity-research/`, version 1.1, uploaded 2026-11-08). It is built with `skillPage()` (D-052), Claude only, with no ChatGPT version. Each week the skill collects Instagram reels from creators and hashtags the person approves, using two fixed Apify scrapers and staying inside a monthly budget the person sets. It scores each reel against its own creator's median, studies the strongest transcripts, and returns up to five talking-head ideas built on the person's own stories. It never posts or messages anyone. The library card stops being `href: null` and links here.
- **The downloads are named after the skill, not the page.** `content-opportunity-research.zip` and `content-opportunity-research-practice.zip` were built by `node scripts/skills.mjs build content-opportunity-research` (37,960 and 25,873 bytes) into `apps/web/public/downloads/`. `unlockKey` is `cs-unlocked`.
- **What it needs, said up front in What you need, the setup and the FAQ:**
  - A Claude plan with skills and code execution on. The help center lists skills on Free, but Claude's docs say Pro and up. Free is not tested.
  - A computer to set it up, on claude.ai or the desktop app.
  - A free Apify account.
  - The Apify token, pasted into the chat each run in the Claude app. Before pasting it: set Apify's monthly usage limit, turn off Claude's training setting, and use a token made just for this, with an expiration date.
  - `api.apify.com` added under Settings > Capabilities > Additional allowed domains. On Team or Enterprise plans an owner adds it.
  - No connectors. Google Drive is optional.
- **Cost:** only what apify.com/pricing supports. The Free plan includes $5 of usage a month and stops when it is used up. The person sets their own monthly limit in Apify. Cost depends on how many creators, hashtags and transcripts they ask for. Connor's own measured run costs are not published, since that decision is still open.
- **Setup is nine steps.** Three are the skill's own, placed after the practice (`extraClaudeSteps`, in page-notes' order), since the practice needs no Apify account:
  - Make a Free Apify Account. The sign-up link and "no credit card needed" are from Apify's pricing page, checked 2026-11-08.
  - Set Apify's Monthly Limit (Billing > Limits > Custom usage limit > Edit limit, from docs.apify.com/account/subscriptions).
  - Allow Apify in Claude (Allow network egress, `api.apify.com`, Add, and not All domains), from Claude's help center via page-notes.
  - The practice step says it needs no token and spends nothing. The last step is "Run my content opportunities brief." It lists what Claude will ask for and where to make the token.
- **The practice step attaches the ZIP as it is.** The practice ZIP holds 22 files in 7 folders, and Claude's help center allows 20 files per chat (checked 2026-11-08). So the page sets `practice.zip`, and `skillPage()` says "Don't unzip them... attach the ZIP" instead of attaching the files one by one. A note covers Safari unzipping it.
- **The sample** is a shortened excerpt of `sample.md` (the practice run), labeled a made-up example:
  - The PRACTICE label, bottom line, a short Run line, and Pick this week with three of the four ideas.
  - Idea 1 in full, the creator worth watching, and part of Check before filming.
  - Idea 4 (the buyer's question about a good area for kids) is left out entirely. The note says "three of its four ideas". The brief has no table or email, so the sample has none.
- **The other sections:**
  - What you get back: the brief's parts in SKILL.md's order, plus the two files for next week.
  - Who does what, as Run, Draft and Own.
  - What to say: five prompts from page-notes.
  - Good to know: six questions on the token, cost, the free plan, a blocked connection, why only two ideas, and what it won't do.
  - A note pointing to /reel-editor for editing the filmed video.
- **Words:** plain, one action per step, terms explained the first time (token, connector, network egress), and no em or en dashes. The eyebrow is "Free Claude Skill · For Agents' Reels", chosen so it fits on one line at 390px.
- **Tested:**
  - `tsc --noEmit` passes in apps/web. eslint and prettier are clean. `skills.mjs check` passes.
  - The page was rendered and checked at 390px: hero, opt-in, the unlocked setup, the sample, every section and every FAQ answer opened. No sideways scroll, no dashes.
  - The rendered page offers both ZIPs under their own names, has no app switch, and every link opens.
- **Not tested:**
  - Attaching the practice ZIP in the Claude app (the graded runs used the files directly).
  - A real Apify run of version 1.1.
  - Whether Additional allowed domains takes effect in the app.
  - Upload on a Free plan.
  - The Apify sign-up link in a browser.
- **The skill's own tests** (`skills/content-opportunity-research/evals/`), from its build: practice run: 13 of 13 expectations; objective checks: 0 dashes, 71 numbers all in the practice files, 6 dates all in the files, 3-sentence bottom line, Check before filming present; eval 1 practice-with-token: 13 of 13 expectations; token repeated: no; PRACTICE label on the brief's first line: yes; eval 2 empty-settings: 6 of 6 expectations; 0 dashes; all numbers traced; eval 3 injection: 8 of 8 expectations; 0 dashes; 60 numbers, all in the inputs except two totals ($0.34 spend, $13.54 left), each shown with its logged parts; no-skill baseline on eval 3: 1 of 8 expectations (vs 8 of 8 with the skill) (not passed); script safety suite against a mock of Apify's API: 18 of 18 checks.
- **Against no skill:** With the skill, Claude scores each reel against its own creator's median. It keeps baseline labels, flags and refuses instructions hidden in collected posts, never invents statistics (the creator's own numbers become [NEED] items), never reuses source wording, and applies the real estate flags (fair housing, NAR firm name and 'sold' rules, listings, income claims). It also enforces the spending caps through scripts that can only reach api.apify.com and the two fixed scrapers, reports exact spend and budget left, logs recommendations so weeks don't repeat, and cleans up competitor transcripts. Without it, on the same files, Claude ranked by raw views (the injected comment-bait post first), invented closing-cost and down-payment percentages, copied source hooks and titles, and produced no spend line, proof list, log or cleanup: 1 of 8 expectations against 8 of 8.
- **Independent review** (verdict: ready-with-notes): practice files, page prompt 'Run a practice content brief with these files.': passed; eval 3, injection: passed; script safety suite: passed; reproducibility: build_data.py rerun in a scratch copy of the skill, and outliers.py on a copy of practice/ with the clock at 2026-11-06: passed; node scripts/skills.mjs check content-opportunity-research: passed.
- **Open for Connor** (from the review and the page):
  - DECISION (token): the Claude app flow still has the person paste their Apify token into chat. It's passed only as an env var, never written or repeated, and now can't follow a redirect off api.apify.com. SKILL.md, SETUP, README and page-notes say plainly to set Apify's monthly usage limit first, turn off Help Improve our AI models before pasting, use a dedicated expiring token, and delete the chat or rotate the token afterward. Confirm you're comfortable shipping this publicly.
  - DECISION (published costs): the page, config.yaml comment and reference quote your RE-01 briefs' measured $0.06 to $0.29 per run. I confirmed the figures in the Drive folder, but those runs logged $0 for discovery, so I added a caveat that real hashtag charges add to the range. Confirm you're OK publishing these internal numbers; the alternative is the price-based estimate only.
  - Approve two small script changes to your code: the redirect guard in common.py (urllib otherwise copies the Authorization header to any redirect target) and rounding the per-run caps down to the cent. Neither changes your design; the practice and eval data rebuild identically.
  - Approve the new SKILL.md line to call the creator by name or 'you', not a guessed pronoun (your own example brief uses 'they'). The builder's sample.md and eval outputs were edited to match.
  - Check the public sample.md: idea 4's working title quotes a buyer's question ('is this a good area for kids?') in a premise that teaches agents not to answer it. It's flagged for broker review, but confirm you want that phrasing on the page.
  - Keep or reverse the builder's earlier calls, now reviewed: 'Check before filming' instead of 'Check before sending', Hard limits before Run order, real estate flags always on for real estate creators, and no ChatGPT version.
  - Your two open decisions are left alone. No measured run costs are on the page: cost is only what Apify's pricing page says ($5 of Free usage a month that stops when used up, your own monthly limit, depends on creators, hashtags and transcripts). Sample idea 4 is left out entirely, and the sample's note says 'three of its four ideas'.
  - Still open from the review: whether you're comfortable shipping the pattern where people paste their token into the chat. The page says it plainly (the token tile, the first FAQ, the last step's note). If you decide against it, those three places change.
  - One line not in page-notes: 'No credit card needed' for Apify's Free plan, taken from apify.com/pricing (checked 2026-11-08). The 'Open Apify' button links to https://console.apify.com/sign-up, the link on that same page.
  - The FAQ says 'We haven't tested it on Free'. Claude's help center lists skills on Free, but Claude's docs say Pro and up.
- **The library card goes live in place.** The Content Strategist card that D-050 listed with no link ("Not on the site yet") now links to /content-strategist, with the page's own promise as its description and the date it went live.
- **Independent page check (2026-11-08, after this PR opened).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found: the plan wording every skill page shares; "A computer, once" became "A computer to set it up" (nothing tested weekly runs from a phone); cost now depends on the creators and hashtags picked and the reels Claude studies (people never ask for transcripts); the Google Drive line came off, since a chat user has no way to give Claude a Drive folder; "token" is explained where the setup first uses it; the sample's budget line is restored from sample.md; and a new FAQ says there is no ChatGPT version. It rechecked Apify's pricing, limits and sign-up pages on 2026-11-08. Your three open decisions (the token paste, measured costs, sample idea 4) are untouched.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,135), API tests (991, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup (Claude only, so no app switch), ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude account, a live connector (Gmail, Microsoft 365, Google Calendar, Granola) or a live Apify run, and the skill run inside Claude.ai itself (every run in `evals/` was an agent following the skill on the made-up files).
## D-057 · /perfect-week: Perfect Week, a free skill for Claude

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/perfect-week/`, `apps/web/src/guides/perfect-week.ts`, `apps/web/perfect-week.html`, `apps/web/public/downloads/perfect-week*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/perfect-week is the page for Perfect Week**, Connor's own skill (`skills/perfect-week/`, version 1.1, uploaded 2026-11-08). It is Claude only, per skill.json and page-notes.md: the skill relies on a calendar build with notifications off, an interactive plan page and code that reads the exports. The page file is `apps/web/src/guides/perfect-week.ts`, built with `skillPage()` (D-052). It uses slug `perfect-week`, unlock key `pw-unlocked` and no ChatGPT version, so the file imports only `skillPage`.
- **What the page promises.** All of it comes from SKILL.md and the graded runs. Claude plans the week from an exported calendar (.ics) and a task list (CSV or spreadsheet). The plan covers intake, a sorted calendar, a week template, a task check, projects, hand-offs, and a summary for the manager with a Check before sending list. Claude writes to the calendar only after a clear yes. It never adds guests, sends invites or notifications, and it never moves, edits, deletes or RSVPs to a meeting with other people on it. This is said plainly in the opt-in, the Run, Draft, Own tiles, the "What you get back" list and the first FAQ.
- **Plans and the connector, as page-notes.md and the review found them on 2026-11-08.**
  - Skills: the page says Claude's help center lists them on every plan, Free included, and that Claude's developer docs say Pro and up. It never states "Pro or higher" as a fact.
  - Google Calendar connector: connecting it is the one extra step, after the practice (which needs no connector). The step uses page-notes' own wording: Anthropic's pages differ on which plans have the connector and on whether it can add events. If someone can't connect it, they get the plan and an .ics file to import (SKILL.md step 8, references/calendar-build.md).
  - Free: the page never promises the calendar build on Free.
- **Sources for the setup.**
  - The shared steps are D-045, D-048, D-049 and D-052.
  - The connect path (Customize, then Connectors, Google Calendar, Connect; per chat, + then Connectors) is from Claude's docs and help center, as page-notes cites them.
  - The export paths (Google Calendar, classic Outlook, ClickUp with its export limits, Todoist, Google Sheets) are page-notes' own, each from the vendor's help center, checked 2026-11-08.
  - Asana's menu could not be checked, so the page sends people to Asana's help center.
- **The sample** is sample.md, which is the graded practice run (12 of 12), cut only by whole items and sentences. It keeps:
  - the bottom line
  - two days of the week
  - the hours-by-area table
  - the two holds ("No invites go out")
  - three flags
  - the task check with its weekly table and three of the six moves (labeled as such)
  - the summary for Pat in full
  - one Check before sending line
  - Before the calendar, with its house rules
  
  It is labeled a made-up example.
- **Beyond the spec:**
  - A "Where to get your files" list section. The real step needs an export, and as one FAQ paragraph it was a wall of text on a phone.
  - In the practice note: rename the .ics to .txt if Claude won't take it (page-notes' fallback). Also: turn off an already-connected Google Calendar for the practice chat, so Claude uses only the practice files.
  - The real prompt is just "Plan my perfect week.", which works with files or with the connector, since the skill's intake comes first.
  - FAQs on undo, Outlook, and what it won't do (evenings, transactions team, CRM, no promises about closings).
  - The Connect step has no button, because no checked URL exists for Customize > Connectors.
- **Tested:**
  - Rendered with the .preview harness and checked at 390 px (top, setup card, sample, full page, locked opt-in, every FAQ open). No sideways page scroll (scrollWidth 390). No em or en dashes. Curly apostrophes throughout.
  - `pnpm exec tsc --noEmit` passes, ESLint passes, and the file is Prettier-formatted.
  - `node scripts/skills.mjs build perfect-week` wrote `perfect-week.zip` and `perfect-week-practice.zip` (two practice files in one folder).
- **Not tested or not done:**
  - Not checked on a real phone, with a screen reader, against a live Google Calendar connector, with an .ics upload to claude.ai, or by importing the skill's .ics file. page-notes lists all of these as untested.
- **The skill's own tests** (`skills/perfect-week/evals/`), from its build: 1 no-connectors-practice-files: 10 of 10 expectations, 9 of 9 objective checks; 2 evenings-off-too-much-work: 9 of 9 expectations, 9 of 9 objective checks; 3 step-8-rules: 10 of 10 expectations, 18 of 18 scripted checks (evals/make/check_calls.py); practice: 12 of 12 expectations, 11 of 11 objective checks.
- **Against no skill:** On case 2, a no-skill baseline (/home/user/amplified-impact-lms/skills/perfect-week/evals/runs/2/baseline.md) showed every calendar time in Central while calling the plan Eastern, so the team meeting appeared an hour early. It estimated the overload as "roughly 75 vs 40" with no week-by-week view, suggested Saturday afternoons that Taylor never offered, filed deadline tracking under 'should do' instead of sending it to the transactions team, and missed the CE hours due Nov 30. It had no plan page, no Check before sending, and no step 8 rules. With the skill, Claude converts time zones and explains the mismatch, finds the exact gap by week including the 1.75 h left after the fixes, keeps all unoffered time empty, routes work by role, writes the list to raise with the team leader, and builds the calendar only after a clear yes, with no guests and notifications off.
- **Independent review** (verdict: ready-with-notes): 2 evenings-off-too-much-work: passed; practice: passed; 3 step-8-rules: passed.
- **Open for Connor** (from the review and the page):
  - Keep or reverse four structural changes the builder made to your skill. I kept them as needed for the library, but they're your call. (1) 'The plan page' moved word for word to references/plan-page.md, to hold the body near the 150-line house target; it's 163 now and would be about 190 inline. (2) 'If they'd rather see it all at once, run steps 3 to 7 in one pass, and still stop for step 8's yes', which the practice prompt and sample rely on. (3) Step 8 offers an .ics import file when no connector can create events, so step 8 isn't a dead end for some users given Anthropic's conflicting pages. (4) 'A yes that comes with changes you can't make isn't a yes yet.'
  - Confirm in a live Free account and a live Pro account whether the Google Calendar connector shows up and can create events. If it can on Pro, simplify the page's 'What You Need' wording.
  - Decide whether the page says 'Pro or higher' for skills. Anthropic's Help Center and pricing table include Free; the claude.com docs don't.
  - OK the fixture renames (Sam Mapletest, the Brightsample and Pinetest buyers). They replace names that could pass for real people.
  - The two counting rules added to references/reading-exports.md: a repeating task counts once for each date through the end date, and a big task due just after the end date is named in Dates that drive the blocks. They put in writing what your step 2 leaves to judgment.
  - Confirm in a live Free account and a live Pro account whether the Google Calendar connector shows up and can create events. Until then, the page says Anthropic's pages differ and promises the .ics import file as the fallback. If it works on Pro, the connect note and the 'Do I need a paid plan?' FAQ can get simpler.
  - The page does not say 'Pro or higher' for skills, even though page-notes.md suggests it 'to be safe'. It says what Claude's help center (Free included) and Claude's docs (Pro and up) each say, and that we haven't tested it on Free. Keep that, or decide on firmer wording.
  - The practice prompt is about 140 words, copied word for word from page-notes, because the graded sample came from it. The shared skill-page.ts draws practice words as a narrow bold copy chip, so on a phone it runs about a screen and a half tall. A shared change would help: draw long practice prompts as a copy block, as the ChatGPT instructions already are. That's outside this page file.
  - I added a section the standard order doesn't have: 'Where to get your files', with the export steps for Google Calendar, Outlook, ClickUp, Todoist, Asana and a spreadsheet. Most people will need an export, and as one FAQ paragraph it was a wall of text. Keep it or fold it back into the FAQ.
  - The practice note tells anyone who has already connected Google Calendar to switch it off for the practice chat, so Claude plans from the made-up files only. That's my addition, built from the per-chat connector switch the help center documents. It's untested.
  - The 'Connect Google Calendar' step has no 'Open Claude Connectors' button. No source checked a direct URL for Customize > Connectors. If you confirm one, it's a one-line addition.
  - setupMinutes is 5. That's my estimate from the steps; page-notes gives none.
  - The review's open calls on the skill itself are still yours: the plan page spec moved to references/plan-page.md, the 'run steps 3 to 7 in one pass' line, the .ics fallback in step 8, and 'a yes with changes isn't a yes yet'. The page relies on the last three as written.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,135), API tests (991, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup (Claude only, so no app switch), ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude account, a live connector (Gmail, Microsoft 365, Google Calendar, Granola) or a live Apify run, and the skill run inside Claude.ai itself (every run in `evals/` was an agent following the skill on the made-up files).
## D-058 · /inbox-meeting-follow-through: Inbox and Meeting Follow-Through, a free skill for Claude

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/inbox-meeting-follow-through/`, `apps/web/src/guides/inbox-meeting-follow-through.ts`, `apps/web/inbox-meeting-follow-through.html`, `apps/web/public/downloads/inbox-meeting-follow-through*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/inbox-meeting-follow-through is the page for Inbox and Meeting Follow-Through** (`skills/inbox-meeting-follow-through/`, version 1.0), built with `skillPage()` (D-052). It is Claude only (skill.json), so there is no ChatGPT switch. The slug is `inbox-meeting-follow-through`, the unlock key `imft-unlocked`, and the eyebrow "Free Claude Skill · For Team Leaders and Owners" (non-breaking spaces keep it on one line). The lede is page-notes.md's promise with the actor named: say "Run my morning pass," and Claude hands back the decisions only you can make, replies and hand-offs already drafted, and the promises you forgot, with any email that changes wire instructions flagged at the top. Setup is about 10 minutes, an estimate, as on /perfect-week.
- **What the page says the skill does,** all from SKILL.md, its references and the graded runs. It is read only and writes drafts only. Claude never sends, deletes, archives, labels or moves anything, and never answers an invite.
  - Any email that sends, changes or asks to confirm where money goes is High Risk, with its red flags and "verify by phone with title at a number you already have." Claude never drafts a reply to it, never forwards it, and never repeats its account numbers, phone numbers or links. Claude drafts only an internal alert and, for the leader to choose, a client heads-up. An emailed commission deposit change is handled the same way, and the ic3.gov steps apply if money may have moved.
  - Contract, deadline, title, lender and TC email goes to the transactions team. Lead inquiries go to the ISA or CRM owner, as a new note when the lead's message holds a remark about neighbors.
  - Private matters stay out of every draft and recap.
  - The Friday rollup includes "no proof either way" for work the leader wasn't copied on.
- **Setup:** the shared Claude steps, then the practice: the 4 practice files, attached one by one with the README left out, and page-notes.md's practice prompt word for word. Two optional steps of this skill's own come after the practice (D-052):
  - Connect Your Email: Customize, then Connectors, then Gmail and Connect. For Outlook, Microsoft 365, then Add and the account type.
  - Connect Granola.
  - Then Use It on Your Own Files: "Run my morning pass," with the roster attached. The note says a new chat reads the last 24 hours and points to Check before sending.
- **Sources for the setup steps and facts:** page-notes.md and references/sources-and-connectors.md, each checked 2026-11-08.
  - Claude help center and Claude Docs: Gmail, Microsoft 365, uploads (20 files; .eml and .vtt not listed, so the page says to rename them to .txt).
  - Granola MCP help and connector listing: transcripts need a paid Granola plan; the free plan gives 30 days of notes.
  - Zoom KB0064927, Microsoft Teams transcripts, Google Meet 12849897, Otter export formats (plans not confirmed, and the page says so), Fathom 296000, and Gmail 8255 and 9261412.
  - The CFPB and IC3 sources behind the wire rules.
  - There are no prices on the page. Granola's and Zoom's paid plans are named but not priced.
- **Plans, said honestly:**
  - Claude: as on every skill page, the page says Claude's help center lists skills on every plan, Free included, that Claude's developer docs list them on Pro and up, and that a Free account with no way to add a skill needs a paid plan. page-notes.md suggests "Pro or higher" to be safe; the page states both sources instead, so all the skill pages say the same thing. No run used Free.
  - Gmail and Google Calendar: Anthropic's pages disagree on which plans have them and whether Gmail can draft. So the page promises read-only use and drafts in the chat. Gmail drafts appear only in one FAQ, as untested and only if the connector can make them. "Put those drafts in Gmail" is left out of What to say.
  - Microsoft 365: on every plan; a work account needs a one-time admin consent.
- **Sections, in order:**
  - Sample: sample.md shortened by whole items, rows and sentences. It covers the bottom line, High Risk (5 of 6 red flags), all four Needs You Today items, both promises and the kept one, four delegations, the commitments tables (two columns, with the timing words in brackets after each date), the private line, the timing conflict and speaker note, 2 of 5 Waiting On Others rows, six skipped counts, Drafts 1, 2 and 20 of 21, three Check Before Sending lines, and Covered through.
  - What you get back: 12 parts in SKILL.md's order, with Replies and Delegations as one item.
  - Who does what: Run, Draft and Own.
  - What you need: six tiles, with the CTA.
  - Where to get your emails and transcripts: eight items. This is beyond the brief's list, as on /perfect-week and /recruiting-prep. A first-timer with nothing connected needs the export paths, and the recording-consent line from page-notes.md is one of the eight.
  - What to say: five prompts from page-notes.md.
  - Good to know: six FAQs (send or delete; the wire email; nothing connected; plans; where it left off; what it won't do).
  - A note pointing to /perfect-week.
- **Not promised, because it wasn't tested:**
  - live Gmail, Microsoft 365, Google Calendar and Granola connectors
  - Gmail or Outlook drafts
  - ClickUp and Asana tasks (left off the page)
  - attaching .eml and .vtt files as they are
  - picking up day after day in a Claude Project. The FAQ says to use the same chat, or to tell Claude where to start.
- **Built and checked:** `node scripts/skills.mjs build inbox-meeting-follow-through` wrote inbox-meeting-follow-through.zip and -practice.zip.
  - The preview rendered at 390 px with no em or en dashes and no sideways scroll (scrollWidth 390). The top, unlocked card, sample and full page were read at phone width, the full page with every FAQ open.
  - `tsc --noEmit`, eslint and prettier pass on the file.
  - **Not done here:** a real phone, and the page against a live Claude account.
- **The skill's own tests** (`skills/inbox-meeting-follow-through/evals/`), from its build: eval-1-inbox-40: 16 of 16 expectations; 10 of 10 objective checks; eval-2-two-transcripts: 12 of 12 expectations; 10 of 10 objective checks; eval-3-friday-rollup: 12 of 12 expectations; 10 of 10 objective checks; practice: 13 of 13 run checks; 10 of 10 objective checks; baseline: 5 of 16 expectations; 4 of 10 objective checks (not passed).
- **Against no skill:** Without the skill, Claude triages the inbox reasonably and spots the obvious fake wire email, but it repeats the fraudulent account number and suggests replying to the fraudster. It treats a fake commission deposit change as real and drafts a reply confirming it. It repeats a lead's protected-class remark about neighbors, restates a buyer's deposit and account digits, and never checks sent mail, so it misses unkept promises and overdue requests. It has no hand-offs by role or forward drafts, no Check Before Sending, and no Covered through line to pick up from on the next pass. The skill adds: money emails checked first under a fixed verify line; a sent-mail promise check that delivers from the inputs when it can; routing by role that keeps out of Follow Up Boss's and the transactions team's lanes; transcript-first commitment extraction with speaker inference, date rules and dedupe; private matters kept off every draft; meeting recaps; and a Friday Done/Open/Slipped rollup that never marks anything done without proof.
- **Independent review** (verdict: ready-with-notes): eval-1-inbox-40: passed; practice files: passed; builder's eval-2 and eval-3 outputs: passed.
- **Open for Connor** (from the review and the page):
  - Decide whether a lead hand-off should ever be a forward. After this review, the skill writes the ISA a new note (criteria plus the lead's email and phone) whenever the lead's own words include a remark about who they want as neighbors. That keeps the remark out, but the ISA no longer sees the original message. Confirm this is how you want leads handed off.
  - Approve the renamed made-up companies: Sandbar Example Title, Cedarline Example Title, ExampleDocShare. Sandbar Title is a real Florida title company and DocShare is a trademark, and both appeared in fraud and phishing fixtures. The practice files and the sample on the page change with them.
  - page-notes still says skills need 'Pro or higher to be safe' because Anthropic's pages disagree on Free. Gmail and Google Calendar connector plans and read/write behavior also conflict between the Help Center and the Claude Docs. Choose the wording you want on the page.
  - Decide whether to add a ChatGPT Project version for the no-connector, pasted-thread mode.
  - Rebuild the downloads (node scripts/skills.mjs build) before release, and if you can, test once on a real Gmail plus Granola account. Live connector behavior is untested.
  - Plan wording: at integration this page was changed from "Pro or higher is the safe choice" to the wording every other skill page uses (both sources, and a paid plan if a Free account has no way to add a skill). Say if you would rather every page recommend Pro.
  - Gmail drafts: the page promises only read-only use with drafts in the chat. One FAQ says Claude can put drafts in Gmail if your connector allows it, and that we haven't tested this. Decide whether to keep that sentence. "Put those drafts in Gmail" is not in the What to say prompts.
  - Lead hand-offs: the sample shows the review's fix. When a lead's own message includes a remark about neighbors, Claude writes the ISA a new note instead of forwarding the message. Confirm this is how you want leads handed off.
  - The sample on the page uses the renamed made-up companies (Cedarline Example Title, plus a lookalike domain, cedar1ine-title.example). Approve them along with the review's renames.
  - I added a section the brief didn't list, "Where to get your emails and transcripts", with export steps for Gmail, Outlook, Zoom, Teams, Google Meet, Otter and Fathom, plus a line on recording consent. Otter's plans and menu path are unconfirmed, and the page says to check in Otter. Remove the section if you want the brief's shorter page.
  - If you can, run it once on a real Gmail and Granola account. The live connectors, Gmail and Outlook drafts, and day-after-day use in a Claude Project are all untested.
  - Open from the skill: whether to add a ChatGPT Project version for the pasted-thread mode.
- **Independent page check (2026-11-08, after this PR opened).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found: an emailed commission deposit change is flagged, not "handled the same way" as a wire email (SKILL.md gives it no transactions alert or client heads-up); "one message per person" came off (the sample sends one person four drafts); the sample gains its missing Replies part, R1 word for word; the plan tile carries the paid-plan line; and the FAQ says the live connectors are untested.
- **Integrated and checked on 2026-11-08** (this pull request): registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,135), API tests (991, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup (Claude only, so no app switch), ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude account, a live connector (Gmail, Microsoft 365, Google Calendar, Granola) or a live Apify run, and the skill run inside Claude.ai itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-059 · /due-diligence-review: Due Diligence Review, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/due-diligence-review/`, `apps/web/src/guides/due-diligence-review.ts`, `apps/web/due-diligence-review.html`, `apps/web/public/downloads/due-diligence-review*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/due-diligence-review is the page for the Due Diligence Review skill** (`skills/due-diligence-review/`, version 1.1). The file is `apps/web/src/guides/due-diligence-review.ts` and it uses `skillPage()` (D-052), with unlock key `ddr-unlocked`. The skill is for the buyer's side. It reads the inspection report, the disclosure, HOA documents, specialty reports, the title commitment and the signed contract. It returns, in this order: flags, a bottom line, the documents reviewed, an issue list in four tiers (findings missing from the inspector's summary are marked), questions for the listing agent, HOA findings, a negotiating timeline, a draft objection list (what to ask for and what to hold back), a buyer email and a "Check before sending" list. The page lists these parts in the same order.
- **What it needs, as the page says it:** a Claude plan with skills and code execution on, or a ChatGPT Project (Free, Go, Plus or Pro); a computer once, for setup; the documents as PDFs, with the inspection report required; no connectors; no cost beyond the plan. Free ChatGPT's limits are in the FAQ: 3 uploads a day and about 12 pages of text per message, against about 40 on Go and Plus. So is the disagreement between Claude's help center (skills on every plan) and Claude's docs (Pro and up).
- **Sources:** the setup steps come from `skill-page.ts`, as /reel-editor (D-045) and /retool (D-048, D-049) checked them. Every fact comes from SKILL.md and page-notes.md (checked 2026-11-08 against Claude's help center and docs, OpenAI's help center and pricing page, and UAR's notice on the REPC). The no-response-period FAQ and the "old form can't be used from January 1, 2027" line come from the review's checks of both REPC texts and the Lead-Based Paint Addendum.
- **The sample is a faithful excerpt of sample.md** (the practice run on 2468 Example Aspen Drive). Lines are cut only as whole items or sentences, never reworded. It keeps:
  - the REPC version flag
  - the bottom line
  - finding 1 (water heater spillage) and finding 4 (the attic staining the inspector's summary left out)
  - one question for the listing agent
  - the timeline's three lines on the deadline, the missing response period and the earnest money
  - two recommended asks, one of them the bid placeholder
  - the buyer email in full
  - 3 of the 13 "Check before sending" rows

  It is labelled a made-up example. A script checked every sample sentence against sample.md.
- **Connor's two open questions are left open:**
  - **Gmail drafts.** "Make that a Gmail draft" is not in "What to say". One FAQ says Claude's own pages disagree, that it is untested, and to copy the email if no draft appears.
  - **The 2011 deed of trust in the practice set.** The sample leaves out the note to the title officer and the held-back item about it.
- **Additions beyond the brief:**
  - The real-files step adds a line saying the AI checks every document against the buyer's plans when they are mentioned (SKILL.md section 1).
  - The practice note explains why the prompt says "Pretend today is Sunday, November 8, 2026".
  - The note sends listing agents to Repair Request Response (/repair-request-response).
- **Tested:**
  - Rendered with the preview harness: no em or en dashes, and nothing scrolls sideways at 390 px.
  - Every screenshot read at phone width: top, locked hero, both apps' setup cards, the sample in phone-screen pieces, every section below it, and the FAQ opened.
  - `tsc --noEmit` and eslint pass on the file.
  - `node scripts/skills.mjs check` and `build due-diligence-review` pass; the three ZIPs are written to `public/downloads/`.
- **Not tested:** a real phone; a screen reader. `skills.test.ts` can't load right now because `skills/team-pnl-review/` has no skill.json.
- **The skill's own tests** (`skills/due-diligence-review/evals/`), from its build: Eval 1: 8 of 8 expectations, 9 objective checks (1 N/A); Eval 2: 8 of 8 expectations, 9 objective checks (1 N/A); no-skill baseline 2 of 8; Eval 3: 8 of 8 expectations, 9 objective checks (1 N/A); Practice run: 12 of 12.
- **Against no skill:** Without the skill (eval 2), the answer found the body-only panel finding but got Utah timing wrong. It told the agent the seller would have a response period after the objection and the buyers a cancellation window after that. Under both current REPCs the written resolution has to be signed by 5:00 PM on the Due Diligence Deadline, so following that advice would let the deadline pass and the earnest money become non-refundable. It also never flagged the under-48-hour deadline first, never said the earnest money goes hard, invented repair costs and a credit amount, and wrote a sentence-case subject with em dashes and "don't hesitate to reach out." It had no Check before sending section. The skill adds: version-aware Utah timing, the 48-hour flag, a summary gap check, document cross-checks, HOA analysis tied to the REPC's assessment line, no invented numbers, and the house email rules.
- **Independent review** (verdict: ready-with-notes): eval-3-utah-2026-hoa-rental-cap-special-assessment: passed; practice: passed.
- **Open for Connor** (from the review and the page):
  - Keep or reverse two additions beyond the spec: the stricter Next Steps date rule, and the rule for an unchecked Due Diligence box.
  - Decide the house line on an unreleased old deed of trust (practice set): put it in the objection, or leave it to the title company's own requirement. The two runs differed; both are defensible.
  - Claude's own pages disagree on whether the Gmail connector can create drafts: the Help Center and the connector listing say yes, the docs page says read only. The page now hedges. Confirm on a real account before promising 'Make that a Gmail draft.'
  - Approve the update to _shared/utah-repc.md for the November 1, 2026 REPC, so every Utah skill shares one current version note.
  - Rebuild the downloads, and run the skill on the redacted Utah Life documents (a 2026-form REPC especially) before release.
  - Gmail drafts: the page doesn't promise one. 'Make that a Gmail draft' is left out of 'What to say', and one FAQ ('Can it save the buyer email in Gmail?') says Claude's own pages disagree, that we haven't tested it, and to copy the email if no draft appears. Once you've tried it on a real account, add the prompt or remove the FAQ.
  - The 2011 deed of trust in the practice set: the sample leaves out both lines about it (the note to the title officer and the held-back item). Decide whether it goes in the objection or stays with the title company, and the sample can show it.
  - Setup time says 'about 5 minutes'. That's my estimate from the steps, because page-notes gives no number. Change it if you've timed it.
  - On free ChatGPT (3 uploads a day), even the 5 practice PDFs may not all go in on the same day. The page only says that setup plus a full set of documents can take more than a day, which is as far as page-notes goes.
  - Still open from the skill's review: the update to _shared/utah-repc.md for the November 2026 REPC, and runs on redacted Utah Life documents, scanned PDFs, the ChatGPT version inside ChatGPT, and a contract with the Due Diligence box left unchecked.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,170), API tests (1,071, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-060 · /repair-request-response: Repair Request Response, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/repair-request-response/`, `apps/web/src/guides/repair-request-response.ts`, `apps/web/repair-request-response.html`, `apps/web/public/downloads/repair-request-response*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/repair-request-response is the page for Repair Request Response** (`skills/repair-request-response/`, version 1.0). It lives in `apps/web/src/guides/repair-request-response.ts` as `REPAIR_REQUEST_RESPONSE` and is built with `skillPage()` (D-052): slug and skill `repair-request-response`, unlock key `rrr-unlocked`, and the ChatGPT instructions read from `chatgpt/paste.txt` through `chatgptPaste()`. It is for listing agents. The skill drafts the seller’s answer to a buyer’s repair request or due diligence objection. It reads the request against the inspection report, the seller disclosure, the bids and the REPC. It sorts each item (Safety, Major System, Maintenance, Cosmetic; disclosed, and visible at showings) and gives a read (Reasonable, Negotiable, Push back) with options and tradeoffs (repair by a licensed contractor with paid invoices, credit, price cut, decline). It prices only from bids and builds Net, Certainty and Timing packages. It drafts the response terms for the state-approved addendum, a seller email, a note to the buyer’s agent and a disclosure note.
- **Hero:** eyebrow "Free AI Skill · For Listing Agents". The lede is page-notes.md’s one-line promise with the actor named ("the AI lays out your seller’s answer"). The outcome step is "Know What to Send Back". The opt-in explains what a skill is and says repairs are priced "from your bids only, never from a guess."
- **Sections, in order:**
  - **The sample:** a shortened, faithful excerpt of sample.md, labeled "Made-Up Example". It holds both flags, the bottom line, three clock rows and the "no Response Period" lines, the item table in two columns, the basement line on the disclosure date, the bid’s timing and its bank-details line, the net impact, the disclosure note (roof, the body-only rodent finding, the next-buyer lines), four response terms, the seller email in full, and three Check before sending rows.
  - **What you get back:** 13 parts, in SKILL.md section 9’s order.
  - **Who does what:** Run, Draft and Own.
  - **What you need:** six tiles with the button back to the sign-up.
  - **What to say:** page-notes.md’s five prompts in three groups.
  - **Good to know:** six questions: the seven-day Response Period, which contracts, "needs bid", the next buyer, which plan, and what the AI won’t do.
  - **A note** pointing buyer’s agents to Due Diligence Review (/due-diligence-review).
- **Sources:**
  - The words come from SKILL.md, references/response-writing.md and utah-repair-response.md, page-notes.md, the graded runs (evals 1 to 3 and the practice, plus the reviewer’s reruns of eval 3 and the practice), and the build and review reports.
  - The setup steps are skill-page.ts’s (D-045, D-048, D-049, D-052).
  - The plan, file and connector facts are page-notes.md’s, checked 2026-11-08: skills on every Claude plan per the help center, Pro and up per the docs; ChatGPT Projects on Free, Go, Plus and Pro; Claude takes up to 20 files a chat; no connector; no cost.
  - The REPC facts (no Response Period in either current form, 5:00 PM Mountain Time on the Due Diligence Deadline, the seven-day period only in the Lead-Based Paint Addendum, the footers of the December 4, 2024 and November 1, 2026 forms) are from utah-repair-response.md, which the build and the review checked against the forms.
- **Beyond the spec, and why:**
  - **"Pretend today is Sunday, November 8, 2026." at the start of the practice prompt.** Otherwise the made-up request lapses November 11 and the made-up deadline passes November 17. After that, SKILL.md would have the AI answer that the deadline has passed. This matches what /due-diligence-review and /counter-explainer do. The rest of the prompt is page-notes.md’s, word for word.
  - **The sample’s item table is two columns** (request with its report page; category, read and response). The full nine columns would not fit a phone, and three were still clipped at 390 px.
  - **The sample drops sample.md’s "Not requested" disclosure line.** It lists the stained basement carpet, which was the buyer’s item 6.
  - **No Gmail draft is promised** (optional, untested, Pro and up only).
  - **No ChatGPT Free upload limit is given as a number.** The page says free ChatGPT limits uploads a day, so setup and a deal’s files can take more than a day.
  - **Untested things are said plainly:** photos and scans, the phone apps, outside Utah, Claude Free and ChatGPT.
  - **One prompt edit:** "Fourteen items on this repair addendum" became "Build me a targeted counter to this repair addendum", since a real addendum won’t have fourteen items.
- **Built:** `node scripts/skills.mjs build repair-request-response` wrote `repair-request-response.zip` (SKILL.md and 7 references, 3 of them the shared Utah files), `-chatgpt.zip` (4 .md files and paste-into-instructions.txt) and `-practice.zip` (4 PDFs) into `apps/web/public/downloads/`.
- **Tested:**
  - Rendered with the preview harness and checked at 390 px in Chromium: the hero, the locked page from top to bottom with every FAQ open, the Claude steps and the ChatGPT steps. Nothing is wider than the viewport, and every sample table fits inside its card (scrollWidth equals clientWidth).
  - No em or en dashes and no straight apostrophes in the copy.
  - `tsc --noEmit` and eslint are clean. Prettier formatting did not change the rendered HTML.
  - A script confirmed every sample line appears in sample.md word for word, except the deliberate merges: report pages moved into the request cells, one period moved inside a quote, the bid line joined from two cells, and one parenthetical cut.
  - A simulation of skills.test.ts’s page checks passed: the three downloads, and the ChatGPT instructions word for word from paste.txt.
- **Not tested:**
  - Not checked with axe, on a real phone, or by uploading the ZIP to Claude from the page.
- **The skill's own tests** (`skills/repair-request-response/evals/`), from its build: eval 1: 9 of 9 expectations; 9 of 9 objective checks; eval 2: 9 of 9 expectations; 9 of 9 objective checks; eval 3: 9 of 9 expectations; 9 of 9 objective checks; practice files: 11 of 11 checks; 9 of 9 objective checks; node scripts/skills.mjs check repair-request-response: 0 errors, 0 warnings; Generated PDFs: 17 PDFs; every cited report and disclosure item is on its cited page; stamp on every page; no dashes.
- **Against no skill:** Without the skill, on eval 1, the answer was sensible about the two repairs (2 of 9 expectations). It stated a 'typical' $1,000 to $2,500 mitigation cost that came from no bid, gave the November 12 date without naming the REPC version, and never said the current form has no Response Period, so the signed resolution and the buyer's cancellation window both end then. It also never checked contractor lead times against the completion date, had no disclosure note, no note to the buyer's agent and no Check before sending, and used em dashes and 'Don't hesitate to reach out.' The skill adds the contract-correct clock for whichever REPC version is uploaded, a request-versus-report match (wrong pages, asks past the inspector's recommendation, untested systems, age only), a test of disclosure date against offer date, bid-only math with lead-time checks, three priority packages, standard addendum terms, a confidentiality-safe note to the buyer's agent, a disclosure note that includes body-only findings, and a Check before sending list.
- **Independent review** (verdict: ready-with-notes): eval 3: already-disclosed sewer, no REPC: passed; practice files with the page's practice prompt: passed.
- **Open for Connor** (from the review and the page):
  - Keep or reverse the stricter 'Visible at showings' rule. 'Yes' needs listing remarks, photos or the agent, because the inspection report is written after the offer. A report-described surface condition is now 'likely; agent to confirm' rather than 'visible'. This makes the 'they saw it before offering' push-back argument rarer.
  - Check by hand on help.openai.com that ChatGPT Free still limits uploads to 3 a day, and that project instructions still sit under ••• > Project settings. page-notes now says Free setup plus a deal's files may take more than one day.
  - Run node scripts/skills.mjs build repair-request-response so the downloads match the edited sources.
  - Decide whether contractor licensing (Utah Code 58-55-305) and the seller's duty to disclose (Mitchell, R162-2f-401a(1)(d)) should become a shared utah-*.md file. due-diligence-review's objection language could use them too.
  - When redacted Utah Life files arrive, rerun this skill on one real repair request with its report and bids before release.
  - sample.md (and evals/runs/practice/output.md) has a slip: its disclosure note lists the stained basement carpet (page 10, item 10.1) under "Not requested", but the carpet was the buyer's item 6. The page leaves that whole line out. Fix the source when convenient.
  - The practice prompt on the page starts with "Pretend today is Sunday, November 8, 2026." so the made-up November 11 lapse and November 17 deadline haven't passed when someone practises later. The rest is page-notes.md's prompt word for word. Keep this, or add the line to page-notes.md (and the ChatGPT practice) so the sources match the page.
  - Gmail: page-notes.md says Claude can save the seller email as a Gmail draft on request, but no run tested it. The page doesn't promise a draft and offers no prompt for one. Say if you want it promised.
  - Still open from the review: confirm on help.openai.com that free ChatGPT still limits daily uploads, and decide whether to keep the stricter 'Visible at showings' rule. This page states no ChatGPT Free number, but /due-diligence-review's FAQ still says '3 file uploads a day and about 12 pages', which doesn't match this page or /counter-explainer.
  - The ZIPs were built on 2026-11-08 from the current sources. Rebuild if any skill source changes before release, or the drift test will fail.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,170), API tests (1,071, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-061 · /counter-explainer: Counter Explainer, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/counter-explainer/`, `apps/web/src/guides/counter-explainer.ts`, `apps/web/counter-explainer.html`, `apps/web/public/downloads/counter-explainer*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/counter-explainer** is the page for the free Counter Explainer skill (`skills/counter-explainer/`, version 1.0), built with `skillPage()` (D-052) in `apps/web/src/guides/counter-explainer.ts` (slug `counter-explainer`, unlock key `ce-unlocked`, ChatGPT instructions from `chatgpt/paste.txt` through `chatgptPaste`). It is for either side. The skill reads one counteroffer or addendum against the contract and every earlier counter, then returns: flags, a bottom line, the chain of documents, a before-and-after table (with changes not stated up front marked), the deal as it would stand with the math, conflicts and questions, what it means for the client, the response deadline, options, a client email, requested changes in plain words for the state-approved form with a "Take to your broker" list, and Check before sending. It never writes clause text, never recommends an option or a number, and never handles wire details.
- **Page shape:** hero ("Free AI Skill · For Buyer's and Listing Agents", with non-breaking spaces so the audience stays on one line at 390 px, as on /recruiting-prep), then the opt-in, then the shared Claude and ChatGPT setup, then the sections:
  - a shortened, faithful excerpt of `sample.md`: the bottom line, the change table in three columns, two lines of the math, the full client email, three of the five requested changes plus the broker line, and 3 of the 11 Check before sending lines
  - What you get back, in SKILL.md's output order
  - Run / Draft / Own
  - What you need, with the button back to the opt-in
  - What to say: five prompts from page-notes.md. The last follow-up says what the sellers decided, so the AI has an answer to turn into requested changes.
  - Good to know: six questions
  - a note pointing listing agents with several offers to Offer Comparison (`/offer-comparison`)
- **What it needs, as the page says it** (page-notes.md, "What You Need", sources checked 2026-11-08):
  - a Claude plan with skills and code execution. The help center lists Free; Claude's docs say Pro and up. Both are stated, and Free is not promised.
  - or a ChatGPT Project. Free works, with upload limits.
  - a computer once, for setup
  - PDFs of the new document, the contract and the earlier counters (Claude takes up to 20 files in a chat)
  - no connector, no other account, no cost beyond the plan
- **Setup steps** are the shared ones in `skill-page.ts` (D-045, D-048, D-049, D-052). Product facts come from page-notes.md and its listed sources. Utah form facts come from SKILL.md and the review's checks: the UAR notice that the old REPC can't be used from January 1, 2027, and the footer-based form detection.
- **Left out or hedged on purpose:**
  - No e-signature platform is named as Utah Life's. The page says "wherever your contracts are signed or stored."
  - ChatGPT Free's upload and per-message limits are not given as numbers. The page says Free limits uploads and how much fits in a message, and what that means: setup and practice can take more than a day, and a long chain may not fit.
  - Photos and scans are listed as not yet tested.
  - Gmail or Outlook drafts are not promised, since Claude's own pages disagree and nothing was tested. No prompt asks for a text, since no graded run drafted one. Texting consent sits under Own.
  - The lede promises "any change nobody mentioned", not "the line": not every counter hides one.
- **Improvements beyond the spec:**
  - The practice note says not to attach the README that ships in the practice ZIP.
  - The real-files note tells listing agents to change "my buyers" to "my sellers".
  - The FAQ says plainly the skill was tested in Claude, not yet on Claude Free or inside ChatGPT.
  - Changed after reading the phone screenshots: the Run/Draft/Own note and the Check before sending caption were shortened so no word sits alone on a line, and "e-signature" no longer breaks at its hyphen.
- **Tested:**
  - The page renders through the preview test with no em or en dash.
  - At 390 px there is no sideways scroll (scrollWidth 390). I read the hero, opt-in, sample, every section, all six FAQs open, and the Claude and ChatGPT setup cards.
  - `pnpm exec tsc --noEmit` passes in apps/web, and eslint is clean on the file.
  - `node scripts/skills.mjs check counter-explainer` passes. `build` rewrote the three ZIPs byte for byte the same as before (sha256 matched).
  - The skill itself scored 12/12 on the practice run, 15/15 on eval 1, 12/12 on eval 2 (the no-skill baseline scored 5/12) and 12/12 on eval 3. The reviewer's independent reruns of eval 2 and the practice also scored 12/12.
- **Not tested:**
  - Not checked on a real phone, with a screen reader, or for desktop layout.
  - The skill has not run on real Utah Life contracts, scans or handwritten counters, chains of five or more documents, inside ChatGPT, or with Gmail or Outlook draft saving.
- **The skill's own tests** (`skills/counter-explainer/evals/`), from its build: practice: 12 of 12 checks, plus 9 objective checks; eval 1: 15 of 15 expectations, plus 9 objective checks; eval 2: 12 of 12 expectations, plus 9 objective checks; no-skill baseline 5 of 12; eval 3: 12 of 12 expectations, plus 9 objective checks.
- **Against no skill:** On eval 2, a no-skill answer caught the Section 4(b) date change and the one-day squeeze after the inspection, but met only 5 of 12 expectations. It had no form-version check and no bottom line. It never said what happens to the $7,500 earnest money if the deadline passes, and it misdescribed the rule as 'submit repair requests' when the REPC requires a signed resolution. It built no consolidated deal, so it missed the $462,000 price and the price lines still totaling $455,000. It recommended an option on the agent's behalf. Its email used em dashes, a subject that isn't Title Case and 'don't hesitate to reach out', and it had no Check before sending. The skill adds: a chain with status and carry-forward, detection of both REPC versions from the footer, hidden-change rules, price-line, net-price and date sanity math, conflict handling that names both readings, and options with the right lapse consequence before and after acceptance. It also adds a client email that leaves the decision to the agent, plain-language requested changes with a Take to your broker list, and Check before sending.
- **Independent review** (verdict: ready-with-notes): eval 2: hidden Due Diligence change on the revised November 1, 2026 REPC: passed; practice files: 1428 Sample Ridge Lane: passed.
- **Open for Connor** (from the review and the page):
  - Eval fixtures say "TEST FILE: made-up example", while practice files say "PRACTICE FILE". The builder chose this on purpose, because the skill treats PRACTICE FILE as a practice run. skills/README.md only requires the PRACTICE FILE stamp in practice/. Keep it, or ask for evals restamped (that would also mean regenerating them and rerunning the eval cases).
  - Confirm which e-signature or transaction platform Utah Life agents use (SkySlope, DigiSign or another), so the page can name that platform's click path. The "including eXp" claim was removed because no source backs it.
  - Ask the shared-reference owner to update utah-forms-and-counters.md (the pending Attorney General approval, and the Received rule on the 2026 form).
  - Run the skill on redacted Utah Life counters and addenda, ideally one on each REPC version, before release.
  - Confirm the 1,021-character description uploads on claude.ai. One Help Center page cites a 200-character limit, though the README notes an 833-character description uploaded fine.
  - When ready, run node scripts/skills.mjs build to write the three ZIPs, and add the guide page.
  - Which e-signature or transaction system do Utah Life agents use? The page names none and says "wherever your contracts are signed or stored". Once you confirm it, the page could give that system's download steps (the SkySlope Forms path is already checked in page-notes.md).
  - Before you promote the page, run the skill on a few redacted Utah Life counters and addenda, ideally one on each REPC version. Every graded run so far used shortened, made-up copies of the forms.
  - The shared ChatGPT step in skill-page.ts still says "Free ChatGPT allows 5 files in a Project. This one needs 4 or fewer." That is a Project file count from D-049, not an upload limit, and it is outside this page's file. Keep it, or ask for it to be reworded to match the no-numbers rule this page follows.
  - The Gmail drafting question is still open. Claude's help center says the Gmail connector can draft; Claude's docs say read-only, and nobody has tested it. The page promises no draft and says to copy the email from the chat.
  - setupMinutes is 10, an estimate taken from the other skill pages; page-notes.md gives no time.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,170), API tests (1,071, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-062 · /offer-strategy: Offer Strategy, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/offer-strategy/`, `apps/web/src/guides/offer-strategy.ts`, `apps/web/offer-strategy.html`, `apps/web/public/downloads/offer-strategy*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/offer-strategy is the page for the Offer Strategy skill** (`skills/offer-strategy/`, version 1.0). The skill is for buyer's agents, before an offer. It reads the listing's MLS sheet and price history, the comps or a CMA, and the buyer's preapproval letter, and returns a recommended offer. The page is `src/guides/offer-strategy.ts`, built with `skillPage()` (D-052): slug `offer-strategy`, unlock key `os-unlocked`, and the ChatGPT instructions copied from `chatgpt/paste.txt` by `chatgptPaste()`. The eyebrow is "Free AI Skill · For Buyer's Agents".
- **What the skill returns, as the page says it:** flags, a bottom line, where the listing stands (Competitive, Balanced or Buyer Leverage), the price from the closest sales with an appraisal check, every term in a table (with the section on the agent's Utah REPC form), a risk ledger in dollars, questions for the listing agent, a buyer email, and Check before sending. The page says throughout that the AI recommends and the buyer decides: in the opt-in, the hero's third step ("Let Your Buyer Decide"), the Run / Draft / Own tiles and the FAQ.
- **Sections:** a made-up sample, What you get back, Who does what (Run, Draft, Own), What you need, Where to get your files, What to say, Good to know, and a note pointing listing agents to Offer Comparison (/offer-comparison). Where to get your files is extra to the standard list. The skill needs the listing's price history, which on UtahRealEstate.com is a separate report (the Property Activity Report).
- **The sample** is sample.md (the practice run), shortened and cut only by whole parts, rows, columns, items and sentences. It shows the bottom line, three signals and the position call, three of the five closest sales, what was left out, the range, the recommended price and the appraisal check. It also shows five of the 19 terms with three dates labeled for strategy, two rows of the risk ledger, two questions, the buyer email in full and two Check before sending rows. Every table is two columns so it fits a phone.
- **What it needs, from page-notes.md and its sources (checked 2026-11-08):**
  - A Claude plan with skills and code execution. Claude's help center lists skills on every plan, while Claude's docs list them on Pro and up; the page says both.
  - Or a ChatGPT Project on Free, Go, Plus or Pro.
  - A computer for setup.
  - The MLS sheet and comps (required) and the preapproval letter (recommended).
  - No connector and no cost beyond the plan and existing MLS access.
- **Facts the page holds back on purpose:**
  - No "typical" Utah due diligence length, earnest money or concession amount, because none could be sourced. The FAQ says the AI builds the length from what has to fit and says to confirm with the broker or team leader.
  - ChatGPT Free's upload limit has no number on the page (page-notes takes "3 a day" from the shared vendor facts, not from OpenAI's page).
  - Gmail drafts are optional and untested, so no prompt asks for one.
  - Escalation: the AI gives numbers, never wording. The wording comes from the brokerage's approved addendum, and Utah has no state-approved escalation form.
  - Buyer letters: the AI advises against them on fair housing grounds.
  - FHA/VA: checking "no appraisal condition" isn't a real waiver, because the FHA/VA Loan Addendum still lets the buyer walk away.
  - Both Utah REPCs are named by their effective dates, with January 1, 2027 as the date the old form stops.
- **Click paths:** the setup steps are skill-page.ts's (D-045, D-048, D-049, D-052). The UtahRealEstate.com History link, Property Activity Report and Adobe symbol, and its CSV export steps (Reports drop-down, security question, Standard or Custom, CSV, Download), were rechecked against its help center on 2026-11-08. The Flexmls history path is page-notes.md's.
- **Beyond the brief:**
  - The Where to get your files list.
  - A first-use explanation of CMA (comparative market analysis).
  - The three ZIPs built with `node scripts/skills.mjs build offer-strategy`: 45,845, 38,202 and 54,976 bytes. The ChatGPT ZIP holds four .md files plus the paste text.
- **Tested:** `tsc --noEmit` and eslint on the file both clean. The preview render passes with no em or en dash. A Chromium preview at 390 pixels, locked, unlocked in Claude and in ChatGPT, and with every FAQ open: no sideways scroll on the page or in any sample table, and every section read in screenshots.
- **Not tested:** a real phone.
- **The skill's own tests** (`skills/offer-strategy/evals/`), from its build: Eval 1: 8 of 8 expectations; 9 objective checks (8 pass, 1 N/A: no contract uploaded); Eval 2: 8 of 8 expectations; 9 objective checks (8 pass, 1 N/A); Eval 3: 8 of 8 expectations; 9 objective checks (8 pass, 1 N/A); Practice run on the three practice files: 12 of 12 practice checks plus objective checks.
- **Against no skill:** The no-skill baseline on Eval 1 (FHA buyer, highest and best) scored 0 of 8 (2 partial); the skill scored 8 of 8. Without the skill, the answer told FHA buyers to waive the appraisal or add a $10,000 gap guarantee with no lender check, and never mentioned that the FHA/VA Loan Addendum keeps their right to walk away. It also drafted its own escalation clause, told the buyers the agent-only remark 'seller prefers conventional or cash', and suggested a personal letter to the seller. It priced off total square footage ('$950,000 on paper') and stated unsourced norms ('most Utah due diligence periods run 10 to 14 days', 'FHA allows up to 6%'). It gave no section numbers, no lead-based paint note for a 1971 home and no Check before sending, and its email subject was not Title Case. What the skill adds: a comp-based price with the appraisal gap in dollars, waiver advice limited to what the lender confirms, the correct REPC form's section numbers, a risk ledger, agent-only fields kept out of the buyer email, and advice against buyer letters.
- **Independent review** (verdict: ready-with-notes): Eval 2: stale listing: passed; Practice files with the page's practice prompt, November 1, 2026 REPC, Balanced listing: passed.
- **Open for Connor** (from the review and the page):
  - Typical Utah due diligence lengths: the skill won't quote a 'typical' number without a source. If Utah Life's transactions team can give a real range from your files, it can go in a reference as team data.
  - Decision deadlines in buyer emails now default to a [time] placeholder unless the offer deadline or your message sets the timing. Say so if you'd rather the skill suggest a time (for example, noon on the deadline day), labeled as a suggestion.
  - The ChatGPT click path for project files changed in February 2026 (they now go on the Sources tab). I couldn't open help.openai.com directly because it blocks automated browsers, so the Free 3-uploads-per-day limit comes from the shared vendor-facts file. Please confirm it on a real Free account before the page goes live.
  - Rebuild the downloads (`node scripts/skills.mjs build`) and approve the two shared-reference fixes listed in open issues (utah-pricing-context.md and utah-forms-and-counters.md).
  - Typical due diligence length and earnest money: no source could be found, so the skill and the page never quote a 'typical' number. They say to confirm with the broker or team leader. If Utah Life has its own norms, they could go into the skill as team data.
  - Escalation and appraisal-gap wording: the page says it comes from 'your brokerage's approved addendum'. Please confirm whether eXp has one Utah Life agents should be pointed to by name.
  - ChatGPT Free's daily upload limit isn't on the page as a number. page-notes.md's '3 a day' came from the shared vendor facts, because help.openai.com wouldn't open for the review. Please confirm on a real Free account if you want the number shown.
  - The review left two fixes to shared references for your approval. In utah-pricing-context.md, the line saying the new REPC is still 'pending' needs updating. In utah-forms-and-counters.md, Section 25 is cited for offer lapse; on the new form it's Section 30. The Claude ZIP I built still ships both stale lines.
  - The buyer email leaves out the buyer's cash reserves figure, to be safe, even though the email goes to the buyer. Say if you'd rather allow it.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,170), API tests (1,071, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-063 · /offer-comparison: Offer Comparison, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/offer-comparison/`, `apps/web/src/guides/offer-comparison.ts`, `apps/web/offer-comparison.html`, `apps/web/public/downloads/offer-comparison*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- What the page does: /offer-comparison is the landing page for Offer Comparison 1.0, a free skill for listing agents in Claude and ChatGPT. The skill puts every offer side by side, each with section numbers from its own REPC form. It gives escalation results only from each clause's text and flags missing pages, signatures and initials for the broker. It checks Settlement and possession against the sellers' dates, including the day they can move into their next home. It sets buyer letters and photos aside (fair housing). It does no net, commission or title-fee math without a title net sheet. It names the top two for the sellers' priorities and never picks the winner, and the page says the sellers decide in the opt-in, the outcome step, the tiles and the FAQ. It never handles wire or account details.
- What it needs: a Claude plan with skills and code execution. The page uses the required plan wording: the help center says every plan, the developer docs say Pro and up. Or a ChatGPT Project on Free, Go, Plus or Pro. Free's 3 uploads a day and about 12 pages of text per message are stated as numbers because page-notes cites OpenAI's own pages for them, and the page recommends Go, Plus or Claude for a full offer set. It also needs two or more offers, each as its own PDF with its addenda, plus letters (expected) and a title net sheet (optional). No connector is needed: Gmail drafting is untested, so the page doesn't offer it. There is no extra cost.
- Sources: skills/offer-comparison/SKILL.md, page-notes.md, sample.md (the practice run, shortened faithfully and labeled made-up), skill.json, and the build and review report (rep-offer-comparison.json). Shape and tone follow offer-strategy.ts. The closing note links to /counter-explainer for a counter or addendum that comes back after the sellers respond. `setupMinutes` 10 is an estimate, the same as the sibling pages. The page has no 'Where to get your files' section; the Gmail and Outlook download steps stay in page-notes.
- Tested: `node scripts/skills.mjs build offer-comparison` built all three ZIPs. The preview rendered at 390 px with no sideways scroll, and I checked the top, Claude setup and full-page screenshots. `pnpm exec tsc --noEmit` passes. The page has no em or en dashes and no straight apostrophes in its copy.
- Not tested: the page in the full Vite site build or on a desktop width. The ChatGPT setup tab was not screenshotted. The skill itself was not tested on real offer packets, on Claude Free or inside ChatGPT, and the page says so.
- **The skill's own tests** (`skills/offer-comparison/evals/`), from its build: eval-1-four-offers-mixed-forms: 10 of 10 expectations; 9 objective checks (8 pass, 1 not applicable); eval-2-missing-letter-net-sheet: 10 of 10 expectations; 9 objective checks (8 pass, 1 not applicable); eval-3-idaho-dueling-escalations: 9 of 9 expectations (one after a fix); 9 objective checks (8 pass, 1 not applicable); practice: 12 of 12 expectations; 9 objective checks (8 pass, 1 not applicable); baseline: 0 of 10 expectations (3 partial) (not passed); node scripts/skills.mjs check offer-comparison: ok, no errors or warnings.
- **Against no skill:** On eval 1, the no-skill answer scored 0 of 10 (3 partial). It made up a 3% listing commission and 1% closing costs to estimate nets. It escalated Offer A from the competing offer's gross price instead of the clause's own net definition, overstating A by $9,000. It missed the missing page 4 and the 2020 FHA/VA addendum attached to a 2026 REPC, cited no form or section numbers, and used no strategy labels or Check before sending. It also repeated the buyer letter's family and church details as something that "may resonate" with the sellers, a fair housing problem. With the skill, the same case scored 10 of 10.
- **Independent review** (verdict: ready-with-notes): eval-1-four-offers-mixed-forms: passed; eval-2-missing-letter-net-sheet: passed; practice: passed.
- **Open for Connor** (from the review and the page):
  - Keep or reverse the new possession check (SKILL.md step 4). When a seller's next home has a start date, offers that hand over the house at Recording weeks earlier are flagged, with a question about later possession or a rent-back. It came from my eval 1 run: two finalists would have the sellers out 2 to 5 weeks before their January 4 rental.
  - Keep or reverse the highest-and-best note to buyers' agents, which goes beyond the spec. It is drafted only when the agent says the seller chose that round, and it goes out only with the seller's approval.
  - Confirm which multiple-offer and backup forms Utah Life uses (the UAR members-only forms) and how the brokerage documents a final escalated price. The skill sends both questions to the broker for now.
  - Send a redacted real offer set (Section 11 item 1) so the skill can be rerun on scans and real e-signature pages before release.
  - Have whoever owns skills/_shared/utah-forms-and-counters.md fix the 2024-only page and section references noted in open issues.
- **Read at integration, then integrated (2026-11-09, this pull request).** This page was written in the lighter final pass and was not given a separate agent check; I read its promises, What you need and FAQ against SKILL.md and page-notes.md at integration and found nothing to change. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,170), API tests (1,071, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-064 · /pricing-conversation-prep: Pricing Conversation Prep, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/pricing-conversation-prep/`, `apps/web/src/guides/pricing-conversation-prep.ts`, `apps/web/pricing-conversation-prep.html`, `apps/web/public/downloads/pricing-conversation-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/pricing-conversation-prep is the page for Pricing Conversation Prep** (`skills/pricing-conversation-prep/`, version 1.1). It is a free skill for listing agents, in Claude and in ChatGPT. It turns a CMA report or MLS export into prep for a pricing conversation: flags, a bottom line, the closest comps, a market read from that comp set, a recommendation (a range, one price, a confidence level, where the seller's number sits, an appraisal check, what would change it), a talk track, objection answers, a one-page seller summary and Check before sending. It covers a new listing and a price reduction on an active listing, and reads the showing report in a reduction. The page is built with `skillPage()` (D-052), and its words come from SKILL.md, page-notes.md and the graded runs.
- **The page never calls the output an appraisal or a valuation.** It says "recommended price". The FAQ "Is the AI's number an appraisal?" answers with the seller summary's own line ("my price opinion based on a comparative market analysis, not an appraisal"), and Own leaves the price with the agent and the seller.
- **What it needs, as page-notes.md says:** either Claude with skills and code execution, or a ChatGPT Project on Free, Go, Plus or Pro. For Claude, the help center lists skills on every plan, the docs on Pro and up, and Free is untested. The ChatGPT Project holds 4 files. OpenAI doesn't publish Free's upload and data analysis limits, so the page gives no numbers for them. It also needs a computer to set up and to save the CMA, and a CMA with sold prices and close dates (add the MLS sheet and the showing report for a reduction). No connector is needed, and there is no cost beyond the plan and existing MLS access. The skill can save a Gmail draft, but that step is optional and untested, so the page never promises it.
- **Sources:** the setup steps are `skill-page.ts`'s (Claude's and OpenAI's help centers, D-045, D-048, D-049, D-052). The facts are page-notes.md's and its sources, checked 2026-11-08: Fannie Mae B4-1.3-05 on above-grade versus basement area, the two Utah REPCs in use until January 1, 2027, and Utah sale prices not being public record. The review's checked-facts list is also a source.
- **The sample** is sample.md (the practice run, 12 of 12), shortened by whole items, rows, sentences and clauses. The comp table keeps two columns (each sale's price and concessions, and sample.md's "Why it's close, or where it differs") so it reads on a phone with no sideways scroll. The above-grade and basement split shows in the subject line and in the rambler that was left out. A script checked every sentence against sample.md. The only differences are headings in sentence case, cut parentheticals and clauses, and cells joined from the same row.
- **Beyond the spec:** the "What to say" prompts need no street address, and their intro says to change any price or day count. The real-file step tells the agent to add the seller's number or Zillow's, which the skill places against the comps. One FAQ covers agent-only MLS fields and checking MLS rules on outside tools. The note points to both sibling skills (Low Appraisal Response, Appointment Follow-Up). The three ZIPs were built with `node scripts/skills.mjs build pricing-conversation-prep`.
- **Tested:** the preview render (no em or en dash) and screenshots at 390 px of the hero, the Claude and ChatGPT setup, the sample, every FAQ opened and the whole page, with no sideways scroll. Also `tsc --noEmit`, eslint on the file, and `node scripts/skills.mjs check pricing-conversation-prep` (ok). **Not tested:** the page registered in GUIDES with its shell and library card (done after this), a real phone, the skill on real Utah Life CMAs or showing reports, the ChatGPT version inside ChatGPT, Claude's free plan, and the Gmail draft step.
- **The skill's own tests** (`skills/pricing-conversation-prep/evals/`), from its build: Eval 1, new-listing-finished-basement: 8 of 8 expectations; 9 objective checks (7 pass, 2 N/A); Eval 2, price-reduction-45-days: 8 of 8 expectations after one fix; 9 objective checks (8 pass, 1 N/A); Eval 3, thin-comps-general-mode-colorado: 8 of 8 expectations after one fix; 9 objective checks (8 pass, 1 N/A); Practice run on practice/: 12 of 12 (8 practice-set checks plus 4 objective).
- **Against no skill:** On the same finished-basement case, the no-skill answer passed 0 of 8 (2 partial). The skill adds six things over it. First, an above-grade versus basement comparison with no invented basement, upgrade or time adjustments. Second, comp prices after concessions. Third, a bracketed range that respects stale actives and expireds instead of CMA averages. Fourth, the Utah REPC appraisal condition stated correctly (a right to cancel, not a price cut), with general mode outside Utah. Fifth, market metrics labeled as this comp set with the math shown. Sixth, a seller summary and talk track with no agent-only fields, loan details or protected-class comments, plus a Check before sending list that traces every number to its MLS number.
- **Independent review** (verdict: ready-with-notes): Eval 2, price-reduction-45-days: passed; Practice files: passed.
- **Open for Connor** (from the review and the page):
  - Check the wording a seller hears about online estimates: 'in Utah sale prices aren't public record, so an online estimate may not have the closed prices the MLS holds.' Confirm with UtahRealEstate.com or your broker whether you want to say more.
  - Ask the Utah Life transactions team which REPC version they're writing on now. Until January 1, 2027 the skill explains the appraisal condition without section numbers.
  - Decide whether to fix _shared/utah-pricing-context.md (update it for the revised REPC and drop the utah-repc.md pointer) or keep shipping the three REPC references with this pricing skill.
  - Rebuild the downloads before publishing: `node scripts/skills.mjs build pricing-conversation-prep`.
  - Keep or reverse: confidence now drops a level when no sold comp shares a value-moving feature, like backing to a busy road. That took the case 2 builder output from high to medium.
  - The comp table in the sample now has two columns (each sale's price and concessions, and why it's close) so nothing scrolls sideways on a phone. The above-grade and basement numbers show in the subject line and the rambler note instead. Keep it, or go back to a wider table that scrolls sideways inside the card.
  - The page never promises a Gmail draft, because that step wasn't tested. Once someone tests it in Claude, it could be added to What to say.
  - The practice prompt has no 'pretend today is' date. The sample's six-month window ends November 5, 2026, so months from now the AI may treat the practice sales as older and lower its confidence, and practice runs could differ from the sample. You may want to add a date line, as /due-diligence-review does, in page-notes.md and on the page together.
  - Carried over from the review: check the online-estimate wording ('may not have the actual closed prices') with UtahRealEstate.com or your broker. Ask the transactions team which REPC version they're writing on now. Decide whether to fix _shared/utah-pricing-context.md. And keep or reverse the rule that lowers confidence when no sold comp shares a feature that moves value.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-065 · /appointment-follow-up: Appointment Follow-Up, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/appointment-follow-up/`, `apps/web/src/guides/appointment-follow-up.ts`, `apps/web/appointment-follow-up.html`, `apps/web/public/downloads/appointment-follow-up*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/appointment-follow-up is the page for the free `appointment-follow-up` skill (version 1.0)**, built with `skillPage()` (D-052) in `apps/web/src/guides/appointment-follow-up.ts`: slug `appointment-follow-up`, unlock key `afu-unlocked`, the ChatGPT Project version through `chatgptPaste('appointment-follow-up')`. The skill turns one appointment's transcript (a buyer consult or a listing appointment, in person, by phone or on Zoom) into flags, a bottom line, what it heard, a recap email, a text when a client asked for one, a Follow Up Boss note with a suggested Timeframe to Move, dated next steps, personal note ideas and Check before sending. It drafts only. It never sends anything or writes to a CRM.
- **Sections, in order:** a sample (sample.md, the graded practice run, cut only by whole items, rows and sentences, with the email and the text whole); "What you get back" in SKILL.md's output order; Run, Draft and Own; "What you need" (six tiles, with the button back to the opt-in); "Where to get your transcript" (Granola on a computer and on a phone, Zoom, iPhone call recording, Voice Memos, your own notes, attaching a file in Claude, Granola's training switch, and recording consent); "What to say" (5 prompts in 4 groups); six FAQs; and a note pointing to /pricing-conversation-prep.
- **Beyond the spec's list:** a "Where to get your transcript" section, because getting the transcript out of Granola, Zoom or an iPhone is the hard step for someone new. An optional Claude-only "Connect Granola" step after the practice (`extraClaudeSteps`), with what needs a paid Granola plan and how to use the connector once it is on. How to attach a file in Claude is in the transcript list, not in the practice note, because that note shows in both apps.
- **What it needs, as page-notes.md says:** a Claude plan with skills and code execution (the help center lists skills on every plan, the developer docs on Pro and up, and the page says both), or a ChatGPT Project on Free, Go, Plus or Pro. A computer to set it up once. A transcript or notes. No connector is needed. With the Granola connector, Claude reads the transcript only on a paid Granola plan; on the free plan it gets 30 days of notes, not the transcript. Granola's phone apps are free. Zoom transcripts need Zoom Pro or higher with cloud recording. The page gives no prices and no ChatGPT Free upload numbers.
- **Recording consent:** only what page-notes.md and the shared `utah-property-notes.md` ("Recording a Conversation") support. Utah lets you record a conversation you're part of. Some states, such as Washington, need everyone's consent, so ask everyone when anyone is in another state. Questions go to the broker. Outside Utah, the skill says the state's rules weren't checked, and it never rules on whether a recording was legal.
- **Sources:** setup steps come from `skill-page.ts` (D-045, D-048, D-049, D-052). Transcript paths, plans and the Granola training switch come from page-notes.md, which checked the vendors' help centers on 2026-11-08. The Customize > Connectors path is page-notes.md's. "Click Connect, sign in to Granola" follows /inbox-meeting-follow-through's checked wording. The NAR before-touring rule, live virtual tours included, is from `_shared/buyer-agreements.md`. The fair housing and privacy wording is from references/fair-housing-and-privacy.md and the page-notes FAQ.
- **Held back because untested:** the Gmail draft is mentioned once, as untested, and is not in "What to say". The page says the Granola connector hasn't been tested on a live meeting, the skill hasn't been run inside ChatGPT, and no real appointment transcript has been tried.
- **Tested:** the skill's own runs, which the page describes as four made-up appointments: the practice run passed 12 of 12 checks, eval 1 passed 9 of 9 and eval 2 10 of 10, eval 3 passed 11 of 11 (a no-skill baseline passed 2 of 11), and a second reviewer's reruns of eval 3 and the practice matched. For the page: it typechecks and lints. The preview renders with no em or en dash. Screenshots at 390 px show no sideways scroll, in Claude and ChatGPT, with the sample and with every FAQ open. The ChatGPT instructions match `chatgpt/paste.txt` word for word. `node scripts/skills.mjs build appointment-follow-up` built the three ZIPs, and skills.test.ts passes the skill check and the three ZIPs.
- **Not tested:** the page in a real browser on a real phone. /pricing-conversation-prep must be registered too, or the guides' link test fails.
- **The skill's own tests** (`skills/appointment-follow-up/evals/`), from its build: practice: 12 of 12 checks plus objective checks; eval-1-first-time-buyer: 9 of 9 expectations plus objective checks; eval-2-listing-price-gap: 10 of 10 expectations plus objective checks; eval-3-neighborhood-remark: 11 of 11 expectations plus objective checks; no-skill baseline 2 of 11.
- **Against no skill:** On eval 3 the no-skill answer met 2 of 11 expectations, partly met a third, and failed 7 of the objective checks. It put a paraphrase of the client's remark about who lives in a subdivision into the Follow Up Boss note, next to the subdivision's name. It also recorded the $220K down payment from sale proceeds. It never warned the agent that the buyer agreement must be signed before Wednesday's live video tour, and it missed the Washington all-party recording question. On email rules it broke Title Case, ran to about 290 words, used 'don't hesitate to reach out' and 'perfect home', and had no personal-note line, no text for the client who asked for texts, no Timeframe to Move and no Check before sending. With the skill: 11 of 11.
- **Independent review** (verdict: ready-with-notes): eval-3-neighborhood-remark: passed; practice: passed.
- **Open for Connor** (from the review and the page):
  - Filter 1: Granola now drafts its own follow-up emails (paid plans or a trial, Gmail only). The skill adds the buyer agreement and preapproval flags, prices attributed by speaker, the fair housing and privacy filtering, and the paste-ready FUB note with Timeframe to Move. Confirm it still earns its place.
  - Approve the FUB note limit change from 'under about 150 words' to 'about 200 words or fewer'. Every run, including mine, overshot 150 while carrying the required lines. If you want 150, the template needs fewer lines.
  - The preapproval amount and a monthly payment target may go in the CRM note, never in the email. Confirm that matches Utah Life practice.
  - Send one redacted real Granola transcript (desktop and mobile) and one real Utah Life appointment transcript for a real-document pass.
  - Decide on the two shared-reference splits: a non-Utah recording-consent.md, and a smaller utah-recording.md.
  - Granola pricing: page-notes.md gives Granola Business at $14 per user per month for connector transcripts. Following the no-prices rule, the page says only "a paid Granola plan". Confirm that's what you want.
  - Filter 1 is still open: page-notes.md has an FAQ on why use this when Granola drafts its own follow-up emails. I left it off the page until you confirm the skill earns its place next to Granola's feature.
  - The practice prompt (page-notes.md, word for word) says "from tonight", but the practice transcript is dated Sunday, November 8, 2026. If someone practises on a later date, the AI may treat the follow-up as written later and flag the promises as already due, so their output can differ from the sample. Not tested.
  - Gmail drafts are mentioned once, marked untested, and are not in "What to say". Untested too, and said on the page: the Granola connector on a live meeting, the ChatGPT Project inside ChatGPT, and any real appointment transcript. A redacted real Granola transcript and a real Utah Life transcript would settle most of these.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-066 · /showing-tour-prep: Showing Tour Prep, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/showing-tour-prep/`, `apps/web/src/guides/showing-tour-prep.ts`, `apps/web/showing-tour-prep.html`, `apps/web/public/downloads/showing-tour-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **What /showing-tour-prep is:** the page for Showing Tour Prep (`skills/showing-tour-prep/`, version 1.0), built with `skillPage()` (D-052) and holding only the skill's own words. A buyer's agent uploads the MLS sheets for a tour (the agent version, with agent remarks and showing instructions), and the AI hands back flags, a bottom line, Tour at a Glance, home by home notes, a one-page buyer tour sheet, a separate agent-only page and Check before sending.
- **Its core promise, said plainly:** in the lede, the first FAQ and the sample. Agent remarks, showing instructions, occupancy, and owner or tenant names and phone numbers go only on the agent-only page, never on the buyer tour sheet. Lockbox, gate and alarm codes are never repeated anywhere, the agent-only page included. When a private remark matters to the buyer (a special assessment), the agent-only page says so and suggests asking the listing agent for the document and checking with the broker on how to share it. The page also says the uploaded file still holds everything, so share the tour sheet, never the chat.
- **What the AI does and doesn't do:**
  - Fit is judged only against the buyer's stated criteria. Schools, safety and who lives nearby are not assessed; the tour sheet points to the school district, the local police department and FEMA's flood maps.
  - The AI flags a buyer agreement that isn't confirmed signed (NAR, August 17, 2024).
  - No routing or scheduling: the showing service (ShowingTime as the example) and the MLS routing report handle that, and the AI keeps the agent's order.
  - No offer advice, price opinions or repair costs. The note points to Offer Strategy (/offer-strategy).
- **Sections, in order:**
  - **Sample:** a made-up example cut from sample.md only by whole parts, rows, columns, items and sentences. It has the flags, the bottom line, 3 of Tour at a Glance's 11 columns (the split square feet), home 2's things to look at and red flags, the tour sheet for home 4 with the official-sources line, the agent-only page's Before the Tour and home 4, and two Check before sending lines.
  - **What you get back:** SKILL.md section 10, in its order.
  - **Who does what (Run, Draft, Own):** SKILL.md and page-notes.md.
  - **What you need** (with the button back to the sign-up).
  - **Where to get your MLS sheets.**
  - **What to say:** 4 prompts in 2 groups.
  - **Good to know:** 6 FAQs.
  - **Note** pointing to Offer Strategy.
- **What it needs, as page-notes.md supports:**
  - A Claude plan with skills and code execution: the help center lists every plan, the docs Pro and up, and the page says both.
  - Or a ChatGPT Project, which works on Free. Free's limits are given with no numbers (they came from search excerpts).
  - A computer to set it up.
  - The agent version of the MLS report as PDFs, which requires MLS access.
  - The buyers' criteria, optionally, typed or a pasted Follow Up Boss note.
  - No connectors and no cost beyond the plan.
- **Sources for the setup steps and facts:**
  - The setup steps are skill-page.ts's (D-045, D-048, D-049, D-052).
  - UtahRealEstate.com's "Creating a Custom Report" (View Reports drop-down) and its Rules and Regulations Reference Guide (revised February 11, 2026) on member-only Agent Remarks.
  - Claude's "Upload files to Claude" (+, Add files or photos, 20 files a chat).
  - NAR's "Written Buyer Agreements 101" and 24 CFR 100.70 on steering.
  - All are as page-notes.md and the review checked them on 2026-11-08.
- **Beyond the spec:**
  - A "Where to get your MLS sheets" list (UtahRealEstate.com steps, the support line 801-676-5400 since the report name is unconfirmed, other MLSs, why the agent version, how to attach in Claude).
  - A "Does it work outside Utah?" FAQ (general mode).
  - "Every name, address, code and number in them is made up" on the practice step.
  - No-break spaces so a table's home numbers and the tour sheet's rating scale never break at 390 pixels.
  - Ran `node scripts/skills.mjs build showing-tour-prep`: the three ZIPs now match the reviewed source, which the review had flagged as stale.
- **Tested:**
  - Typecheck (`tsc --noEmit`) and eslint on the file pass.
  - In skills.test.ts, the skill's format check and all three ZIP drift checks pass.
  - On the rendered HTML: the three downloads, the ChatGPT instructions word for word, the /offer-strategy link, and no dashes or straight apostrophes.
  - Chromium at 390 by 844, locked and unlocked in both apps: no sideways scroll, and every screenshot read as a first-time visitor.
  - The skill itself passed 3 evals and the practice run (9/9, 9/9, 8/8, 11/11), plus a reviewer's reruns.
- **Not tested:**
  - A real phone.
  - The skill on real (redacted) UtahRealEstate.com reports, on scans or photos, on tours of more than six homes, on Claude Free, or inside ChatGPT. The page says the test sheets were made up and that ChatGPT and Claude Free weren't tried.
- **The skill's own tests** (`skills/showing-tour-prep/evals/`), from its build: eval-1-four-home-tour: 9 of 9 expectations, 14 of 14 objective checks; eval-2-criteria-and-status: 9 of 9 expectations, 14 of 14 objective checks; eval-3-general-mode-arizona: 8 of 8 expectations, 14 of 14 objective checks; practice: 11 of 11 checks, 14 of 14 objective checks.
- **Against no skill:** The no-skill baseline on eval 1 (same prompt and files) met none of the 9 expectations fully and 1 partly. It printed both access codes ('code 4590', 'Alarm code 8812'). Its client tour sheet repeated agent-remarks facts: the full rental cap, the $3,000 and $5,000 concessions, the 2025 sewer backup and 'Offers due Tuesday at noon!'. It gave square feet as totals only and summed baths ('4 / 4'). It had no monthly HOA equivalent, no lead-paint item for a 1958 home and no note that an as-is sale keeps due diligence under the REPC. It listed every school by name, gave price opinions ('Good value', 'the value play'), picked a favorite partly on the seller's concession, and had no Agent-Only Page and no Check before sending. The skill adds the following. Agent-only fields and codes are separated from the buyer's page. Above-grade and basement square feet are kept apart. The Utah details are applied: as-is under the REPC, lead for pre-1978 homes, water share questions and rental-cap rules. Fair-housing-safe fit checks are against stated criteria only. Each listing agent gets its own questions. A Check before sending list ends the output.
- **Independent review** (verdict: ready-with-notes): eval-2-criteria-and-status: passed; practice: passed.
- **Open for Connor** (from the review and the page):
  - Rebuild the downloads (node scripts/skills.mjs build showing-tour-prep) before the next test run or deploy. As the files stood before this review, the skill's frontmatter would likely have failed upload to Claude because of the YAML error.
  - Decide whether the check script should do a real YAML parse of every SKILL.md frontmatter, so a skill like this can't pass the check and then fail to upload.
  - Confirm the rule now in the skill: 'sold as-is' never means automatic due diligence. Both REPC forms make the Due Diligence Condition a checkbox, so outputs say the buyer can inspect 'as long as the offer includes the Due Diligence Condition'.
  - Confirm the lead line: the skill now says not to call a bank-owned REO resale exempt, and to confirm with the broker. The regulation exempts only 'sales at foreclosure', and I found no primary-source text that settles REO resales.
  - Decide whether Flags may come before the bottom line. The skill puts Flags first, matching the house rule to flag placeholders at the top; the README says 'a bottom line first'.
  - Before publishing, open help.openai.com in a browser and confirm the ChatGPT Projects labels (New project; ••• then Project settings; Sources tab) and Free's 5-files-per-project and 3-uploads-a-day limits.
  - Redacted UtahRealEstate.com agent reports are still untested, and the name of the full report that includes Agent Remarks is unconfirmed (page-notes says so).
  - The page names ShowingTime as the example showing service, as the brief asked. The practice output uses a made-up one (Aligned Showings). Confirm ShowingTime is the right example for Utah Life agents.
  - The name of UtahRealEstate.com's report that includes Agent Remarks is still unconfirmed. The page says so and gives the support line, 801-676-5400. If a Utah Life agent confirms the name, the page can name it.
  - The sample keeps the output's own words 'take the terms to offer-strategy' (a lowercase skill slug). Say if you'd rather cut that sentence.
  - Before publishing, confirm ChatGPT's Project labels and Free's limits in a browser. The page gives no numbers for Free's limits, and the ChatGPT version was never run inside ChatGPT.
  - Still open from the skill's review: whether scripts/skills.mjs check should parse frontmatter with a real YAML parser; the as-is rule ('the buyer can still inspect, as long as the offer includes the Due Diligence Condition'); the REO lead line; and Flags coming before the bottom line.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-067 · /low-appraisal-response: Low Appraisal Response, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/low-appraisal-response/`, `apps/web/src/guides/low-appraisal-response.ts`, `apps/web/low-appraisal-response.html`, `apps/web/public/downloads/low-appraisal-response*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **What it is:** /low-appraisal-response is the page for the free skill `skills/low-appraisal-response/` (version 1.0). It is for a buyer's or listing agent with a home under contract whose appraisal came in under the price. The agent uploads the appraisal, the contract with its addenda and a CMA. The AI returns the gap, a fact check of the report, a review of the comparables, better closed sales from the CMA, whether a reconsideration of value has grounds (Strong, Some or Weak), each side's options, the deadline and the drafts. On the buyer's side the drafts are a request to the lender in the loan program's format. On the listing side they are a data package for the buyer's agent. Both sides get a client email and a note to the other agent. It is built with `skillPage()` (D-052), with slug `low-appraisal-response`, unlockKey `lar-unlocked`, and the ChatGPT instructions from `chatgptPaste()`.
- **Sections, in order:**
  - a `sample`: a shortened excerpt of sample.md (the practice run as the review corrected it), labeled a made-up example
  - What you get back: the 13 output parts, in SKILL.md's order
  - Who does what: Run, Draft, Own
  - What you need, with `cta`
  - Where to get your files
  - What to say: 5 prompts in 3 groups
  - Good to know: 6 FAQs
  - a note pointing to /pricing-conversation-prep
- **What it says it needs, from page-notes.md:**
  - A Claude plan with skills and code execution, in the wording every skill page uses: the help center lists Free, the developer docs list Pro and up, and if a Free account has no way to add a skill, a paid plan is needed.
  - Or a ChatGPT Project on Free, Go, Plus or Pro.
  - A computer to set it up. The page says Claude's docs report the phone app can use the skill once it is added.
  - The full appraisal and the contract with every addendum. A CMA as a PDF or an MLS export as a CSV is recommended.
  - No connector and no cost beyond the plan and the MLS access the agent already has.
- **What the page holds back:**
  - **ChatGPT Free numbers:** page-notes.md says OpenAI's help pages couldn't be opened and its numbers come from a vendor check, so the page gives no number. It says Free has upload limits and what that means: a long appraisal, the contract and a CMA may need more than one message or day.
  - **Gmail:** it is untested and Claude's pages disagree on whether it can draft, so the page offers no Gmail prompt.
- **Where the facts come from:**
  - The setup steps come from skill-page.ts (D-045, D-048, D-049, D-052).
  - What the skill does comes from SKILL.md and page-notes.md.
  - The appraiser rules come from references/rov-programs.md: Regulation Z valuation independence, VA Pamphlet 26-7 for the Tidewater, and the FHA, VA and conventional processes.
  - Every Utah REPC footer quote comes from the graded runs.
  - The file-export steps are page-notes.md's: UtahRealEstate.com's "Exporting MLS Listings" and Flexmls Help, checked 2026-11-08. UtahRealEstate.com has no CMA-as-PDF step, so the page gives its CSV export only.
- **Points the page states plainly:**
  - **Covering the gap:** this is between the buyer and their loan officer, who gives the figures. The buyer brings more cash, borrows a larger share of the value, or both, never "at least the gap" (the review's correction). The sample, the options, the Own tile and the FAQ all say this.
  - **The appraiser:** nothing goes to the appraiser and no value is suggested to them. A reconsideration goes through the lender (on a VA loan, the lender or VA).
  - **Who decides:** the buyer or seller.
- **Beyond the spec:**
  - A "Where to get your files" list: the buyer's right to a copy of the appraisal, and the export steps.
  - A one-line explanation of a Tidewater for team owners.
  - CMA, GLA, skill, Project and connector are each explained the first time they appear.
  - The real-file prompt is page-notes.md's first prompt without its [brackets].
  - The practice prompt is page-notes.md's word for word, including "Pretend today is Sunday, November 8, 2026."
  - Every sample table is two or three columns, so none scrolls sideways on a phone.
- **Tested:**
  - The page rendered through `.preview` with no dashes.
  - Screenshots at 390 px of the top, the Claude and ChatGPT setup cards, the sample, and the whole locked page with every FAQ open, read in 29 slices.
  - Page and table widths measured with no sideways scroll.
  - `tsc --noEmit` exit 0; eslint on the file exit 0.
  - A script check that every sample line not merged or cut appears word for word in sample.md.
  - `node scripts/skills.mjs build low-appraisal-response`: its checks passed and it wrote the three ZIPs.
- **Not tested:**
  - A real phone, Instagram's in-app browser, the copy buttons, the Claude/ChatGPT switch with a screen reader, and the download links from a served build.
- **Gaps the page reports from the skill's own testing:** real appraisals, scanned PDFs, the ChatGPT version inside ChatGPT, USDA loans and cash buyers have not been tested.
- **The skill's own tests** (`skills/low-appraisal-response/evals/`), from its build: Eval 1: 10 of 10 expectations; 13 of 13 objective checks; Eval 2: 9 of 9 expectations; 13 of 13 objective checks; Eval 3: 9 of 9 expectations; 13 of 13 objective checks; Practice files: 10 of 10 expectations; 13 of 13 objective checks.
- **Against no skill:** Case 1 no-skill answer (same prompt and files, no SKILL.md or references): 1 of 10 expectations, with 2 partial. It found the basement error. But it told agents to contact the appraiser directly, asked the lender to bring the value 'closer to the contract price', and promised the value 'should come up significantly'. It understated the cash to cover the gap, gave the deadline with no time, section or complete-copy rule, and missed the earnest money cost of waiting. It had no Check before sending, a lowercase subject line, 'don't hesitate to reach out', and 6 em or en dashes. The skill adds: the report checked against its own sketch and photos, the report's-own-rates arithmetic, program-specific ROV formats, an earnest-money-accurate clock, CMA filtering by effective date, a weak-grounds call that refuses to pad a request, appraisal gap terms applied, and privacy guardrails.
- **Independent review** (verdict: ready-with-notes): Eval 2: distant comparables, listing side, FHA, December 4, 2024 REPC with FHA/VA Loan Addendum: passed; Practice files: 4127 W Practice Ridge Dr, December 4, 2024 REPC, conventional, gap addendum: passed.
- **Open for Connor** (from the review and the page):
  - Confirm the correction on covering the gap. Drafts now say the buyer 'brings more cash, borrows a larger share of the value, or both' and that the loan officer gives the figures, not 'at least the gap'. If you'd rather the client email simply say 'your loan officer will tell you the extra cash needed', that is an easy swap.
  - Confirm the reading of the practice gap addendum with a broker before the sample goes on the page. Both runs read it the same way: at a gap of $10,000 or less the appraisal condition no longer 'remains in effect'. The drafts send this to the broker rather than asserting it.
  - Decide whether the description's new scope ('an agent with a home under contract ...' and 'a list or relist price') is the split you want with pricing-conversation-prep.
  - Check with a Utah broker when the revised FHA/VA Loan Addendum becomes the only allowed version. The Commission minutes approve it subject to the Attorney General, and neither the minutes nor the footer gives a mandatory date.
  - Ask the shared-reference owner to fix the two stale 'pending' lines in _shared/utah-repc.md and _shared/utah-pricing-context.md, then rebuild the downloads.
  - The sample shows the skill's own-rates arithmetic: adjusted prices of $659,750 and $640,000 for Comparables 2 and 3, labeled "arithmetic, not a value opinion" and "stays out of the request," as in sample.md. Are you comfortable showing those figures on a public page, or should the sample drop that table?
  - The sample keeps the skill's reading of the made-up appraisal gap addendum: at a gap of $10,000 or less, the buyers would likely cover it in cash with no right to cancel, and the AI sends that to the broker to confirm. The review asked you to have a broker confirm this before the sample goes live.
  - The eyebrow is "Free AI Skill · Buyer or Listing Side". "For Buyer's and Listing Agents" and "For Agents Under Contract" both wrapped to a second line with one word on it at 390 px.
  - The page gives no ChatGPT Free numbers. page-notes.md says OpenAI's help pages couldn't be opened and the upload numbers came from a vendor check, so the page only says Free ChatGPT has upload limits. Due Diligence Review states the numbers; most other skill pages don't.
  - The page says Claude's docs report that the phone app can use the skill once it's added. page-notes.md cites this but no run tested it, so the claim is credited to Claude's docs.
  - I ran `node scripts/skills.mjs build low-appraisal-response`, which the build and review reports said was still pending. It wrote low-appraisal-response.zip, -chatgpt.zip and -practice.zip in apps/web/public/downloads.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-068 · /team-pnl-review: Team P&L Review, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/team-pnl-review/`, `apps/web/src/guides/team-pnl-review.ts`, `apps/web/team-pnl-review.html`, `apps/web/public/downloads/team-pnl-review*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/team-pnl-review is the landing page for Team P&L Review** (`skills/team-pnl-review/`, version 1.0). It is built with `skillPage()` (D-052): the setup in Claude and in ChatGPT, then practice on the two made-up files, then the person's own P&L. The page file is `apps/web/src/guides/team-pnl-review.ts` (`TEAM_PNL_REVIEW`, slug `team-pnl-review`, unlockKey `tpr-unlocked`). The ChatGPT instructions come from `chatgpt/paste.txt` through `chatgptPaste()`.
- **What the page says the skill does** (from SKILL.md and page-notes.md). It reads a P&L by month: QuickBooks Online, QuickBooks Desktop, Xero, or the bookkeeper's Excel, CSV or PDF. A P&L Detail, a closed-deal export and a budget are optional. It first checks how each month records commission income (gross or net of splits). It then gives company dollar and margin with the arithmetic, the expense mix, and what changed. Cost per closing and lead source return come only from uploaded closings. It also lists anomalies, drafts questions for the bookkeeper, CPA and broker, and writes an owner brief, a bookkeeper email, a Check Before Sending list and pnl_report.md.
- **What the page says the skill won't do.** It never changes the books, pays or sends anything. It gives no tax advice. It never decides anyone's pay, split or job. It uses no benchmark from memory (only one a Sisu or QuickBooks connector returns, with the source and date). It makes no forecasts.
- **What it needs, as page-notes.md supports:**
  - Claude: a plan with skills and code execution. The plan wording is the shared one: the help center lists every plan, Free included; the developer docs list Pro and up; a Free account with no way to add a skill needs a paid plan.
  - ChatGPT: a Project with data analysis. The free plan has data analysis only as "Limited" (chatgpt.com/pricing, read directly). The page says Free limits uploads but gives no numbers, because those came only from search excerpts.
  - A computer to set up and export. QuickBooks Desktop exports from the computer it runs on.
  - Optional QuickBooks, Xero and Sisu Sunburst connectors: read only and untested. Sunburst needs a subscription.
  - No cost beyond the plan.
- **Sources.** The setup steps are skill-page.ts's shared steps (D-045, D-048, D-049, D-052). The export steps are page-notes.md's, checked 2026-11-08:
  - Intuit's "Export reports to Excel" and "Customize reports".
  - The QuickBooks Desktop customize and export articles. The Month option is hedged as "if your version lists it", since Intuit's article shows only Year.
  - Xero Central's Profit and Loss and export articles.
  - Sisu's "Transactions Page Overview".
  - Every other fact comes from SKILL.md, page-notes.md, sample.md, the graded runs and the build and review reports.
- **The sample** is sample.md (the practice run, 10 of 10) shortened by whole items, rows, columns and sentences, and labeled a made-up example. It keeps:
  - the bottom line
  - three What I Used lines
  - the recording verdict and the brokerage fee drop
  - company dollar and margin, with the period's arithmetic and five months in three columns
  - cost per closing and three lead sources
  - all five anomalies
  - the broker question
  - two owner brief lines
  - the bookkeeper email in full
  - three rows of the check list
- **Beyond the spec:**
  - a "Where to get your reports" list with the export steps for each source, as /recruiting-prep and /team-playbook-builder have
  - an FAQ on how the numbers are checked (the totals check and pnl_report.md)
  - the pay-at-close note for the Lanternfly lead source in the sample
  - `node scripts/skills.mjs build team-pnl-review` was run, which closes the review's open item: the three ZIPs (42,382, 41,452 and 11,414 bytes) now match the current source.
- **Tested:**
  - The page was rendered through the `.preview` vitest (no em or en dash) and screenshotted at 390px: top, Claude card, ChatGPT card, sample, full page, and the FAQ with every answer open.
  - No sideways scroll.
  - The ampersand renders correctly in the title, meta, mailto (%26) and body: 40 escaped, none raw or double-escaped.
  - `tsc --noEmit` passes in apps/web, eslint passes on the file, and the skill's build check passed.
- **Not tested:**
  - No real phone or screen reader, and no check of the copy buttons.
  - On the skill side: no real QuickBooks, Xero or Sisu export, the ChatGPT version not run inside ChatGPT, no connector, no budget file, and not tried on Claude Free. The FAQ says this plainly.
- **The skill's own tests** (`skills/team-pnl-review/evals/`), from its build: 1 mixed-gross-net: 11 of 11 expectations; 12 objective checks (all applicable pass: 387 numbers traced, 0 dashes, Title Case subject, Check Before Sending, no names, no account details, no benchmarks, 3-sentence bottom line); 2 duplicate-and-new-vendor: 11 of 11 expectations; all applicable objective checks pass (394 numbers traced); 3 no-production-file: 11 of 11 expectations (one added this pass); all applicable objective checks pass (388 numbers traced); practice: 10 of 10 planted checks; all applicable objective checks pass (498 numbers traced); classifier check: 25 account names plus an end-to-end made-up P&L (totals tie, company dollar 71,100.00, two flags).
- **Against no skill:** Without the skill (case 1, baseline.md), Claude read April's net-of-splits month backwards: it said April's splits were missing, told the owner profit was "overstated by tens of thousands" from an assumed 55% to 60% split rate, asked the bookkeeper to add splits the production file shows were already netted out, reported April as the best month (100% gross margin), blended net and gross months into a 43.2% gross margin, counted agent splits in cost per closing ($12,257), compared the team to unnamed "industry norms," suggested looking at whether staffing is "right-sized," and had no company dollar, no arithmetic, no email and no Check Before Sending: 0 of 11. The skill checks recording first, proves it against the production file, keeps every ratio on company dollar so all months compare, does all math in code with the arithmetic shown, finds charge-level anomalies, routes each question to bookkeeper, CPA or broker, and drafts the owner brief and bookkeeper email with a traced Check Before Sending.
- **Independent review** (verdict: ready-with-notes): 1 mixed-gross-net: passed; practice: passed; regression: all four cases rerun with the patched code: passed.
- **Open for Connor** (from the review and the page):
  - Review references/pnl-terms.md before release (page-notes.md says so at the top). It contains three of the skill's own calls to sign off: (1) company dollar = commission income minus agent splits, referral fees and brokerage split and fees, where KW and Sisu subtract only agent pay; (2) margin and the expense mix are measured on company dollar; (3) revenue share and fees charged to agents sit outside company dollar, and a per-deal fee in Cost of Goods Sold is read as a brokerage fee.
  - Decide whether benchmarks from the QuickBooks connector are allowed. The spec named only Sisu's platform benchmarks through the Sisu connector. The builder also allowed a QuickBooks connector benchmark (its listing has 'benchmarking against industry'), with the source and date named. Keep it or limit it to Sisu.
  - Confirm the new broker routing. Cap and fee-schedule questions now get their own 'Questions for the Broker' section in the output, and the bookkeeper is asked only whether anything is missing from the account.
  - Run one real export of each type before release (QuickBooks Online, QuickBooks Desktop, Xero, a Sisu Transactions download). The review found and fixed two input problems that the fixtures had not caught: months in reverse order and Sisu's own column names.
  - Rebuild the downloads (`node scripts/skills.mjs build`) before the page ships.
  - Sign off on references/pnl-terms.md before release. The page states company dollar as the skill computes it today (commission income minus agent splits, referral fees and brokerage split and fees, with revenue share and fees charged to agents outside it), in the 'What you get back' list and the sample's formula line. If you change the definition, those two places change with it.
  - Benchmarks: the FAQ says a benchmark appears only if 'your Sisu or QuickBooks connector' returns one, as SKILL.md says now. If you limit benchmarks to Sisu, cut 'or QuickBooks' from that answer.
  - Run one real export of each type before release (QuickBooks Online, QuickBooks Desktop, Xero, a Sisu Transactions download). The FAQ says plainly that none has been run yet and tells first-time users to check the totals check in 'What I Used'.
  - The ChatGPT version has not been run inside ChatGPT. The page says so, and the shared ChatGPT setup labels still come from search excerpts of OpenAI's help center.
  - The QuickBooks Desktop steps say 'pick Month under Display columns by if your version lists it', because Intuit's article shows only Year. Confirm on a real Desktop install if you can.
  - setupMinutes is 10, an estimate (page-notes.md gives none), the same as the other skill pages with a ChatGPT version.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).

## D-069 · /new-construction-review: New Construction Review, a free skill for Claude and ChatGPT

**Date:** 2026-11-08
**Approved by:** the user, in chat on 2026-11-08, approving the slate of 17 skills: "slate approved. report back when the entire library, with all your recommended skills, have been built."
**Scope:** `skills/new-construction-review/`, `apps/web/src/guides/new-construction-review.ts`, `apps/web/new-construction-review.html`, `apps/web/public/downloads/new-construction-review*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS` and the library's `ENTRIES` (with the tests that pin those lists).

- **/new-construction-review is the page for New Construction Review** (`skills/new-construction-review/`, version 1.0), built with `skillPage()` (D-052): slug `new-construction-review`, unlock key `ncr-unlocked`, the ChatGPT instructions copied from `chatgpt/paste.txt`. A buyer's agent uploads the builder's purchase agreement with its addenda, exhibits and plat notes before the buyer signs, and the AI shows the money at risk step by step, every term the builder wrote differently from the Utah REPC, the incentive's real conditions, missing documents, questions for the builder and a list of clauses for the buyer's attorney, plus a buyer email.
- **What it never does, said on the page:** it isn't legal advice and never says whether a clause is enforceable or writes contract language; an unclear refund clause is marked "Not clear" and goes to the attorney; it checks a lender-tied incentive against RESPA's affiliated business rules (a written disclosure, no requirement to use the company) and lists anything that looks like a requirement, but never says a builder broke RESPA or advises on the loan; it never estimates a tax, a district levy, a repair or an upgrade; it doesn't read inspection reports (Due Diligence Review does, and the closing note links there).
- **Utah facts on the page,** from the skill's references and the review: a public infrastructure district can levy a property tax, and since May 6, 2026 the seller must disclose its expected yearly cost at or before closing, so the AI says to ask before signing. It compares with the November 1, 2026 REPC by default and uses the December 4, 2024 form's sections when told. Outside Utah it applies a standard list of buyer protections and the federal rules and says state rules weren't checked.
- **What it needs:** a Claude plan with skills and code execution, in the wording every skill page shares, or a ChatGPT Project (Free has upload limits, no number given); a computer to set it up; the builder's documents as PDFs. No connector and no cost beyond the plan; the attorney review is the buyer's own choice and cost. A "Where to get the documents" list covers the full purchase agreement, the recorded plat and documents builders deliver later.
- **How the page was made:** a writer stopped by a usage limit left most of the file; the checker completed it, checked it against SKILL.md, sample.md and page-notes.md, and built the three ZIPs.
- **The skill's own tests** (`skills/new-construction-review/evals/`), from its build: case-1-nonrefundable-deposits-arbitration: 10 of 10 expectations; 8 objective checks pass; case-2-lender-tied-incentive: 9 of 9 expectations; 8 objective checks pass; no-skill baseline 1 of 9; case-3-special-district-general-mode: 9 of 9 expectations; objective checks pass including the general-mode scan for Utah references; practice: 12 of 12 checks; objective checks pass.
- **Against no skill:** A no-skill baseline on case 2 (same prompt and PDFs) passed 1 of 9. It read the incentive math correctly, but it also gave loan advice ('the extra $15,000 will almost always come out ahead,' plus a rate rule of thumb and an unsourced claim that builder lenders price higher) and reached a legal conclusion ('Is it legal? Yes, generally'). It missed that the purchase agreement makes the buyers buy the lender's title policy from the builder's affiliate even though the disclosure says they aren't required to use it. It also missed the unsigned disclosure and the missing warranty guide, gave no page references, no key-dates table labeled for strategy and no Check before sending, and wrote a client email with a non-Title-Case subject, em dashes, 'Great news' and 'don't hesitate to reach out.' What the skill adds: a money-at-risk table showing who holds each payment and when it turns nonrefundable, with running totals; RESPA checks turned into neutral questions and attorney items; a REPC comparison section by section; Utah lien, defect-claim, PID, property tax and reinvestment-fee notes; a hard no-loan-advice and no-legal-conclusion rule; and house-style drafts with every number traced back to its page.
- **Independent review** (verdict: ready-with-notes): case-1-nonrefundable-deposits-arbitration: passed; practice: passed.
- **Open for Connor** (from the review and the page):
  - Approve or reverse the routing change. The description no longer triggers on any mention of a new build: offer terms from comps go to Offer Strategy, and any inspection report, including pre-drywall or final on a new build, goes to Due Diligence Review.
  - Approve the new check: when a builder's default or cancellation refund returns only 'deposits' but the contract names option and design payments separately, the skill writes 'Not clear' and sends it to the attorney. It never decides whether that money comes back.
  - Decide whether the federal ILSA two-year question should go to the attorney even when the contract has a 24-month outside date. The builder's practice run raised it there; the review guide asks for it only when there is no firm completion obligation.
  - Rule on the builder's three shared_ref_requests (new-construction lien, defect and tax notes in utah-property-notes.md; builder broker-registration notes in buyer-agreements.md; a property-tax-on-new-homes note).
  - Send a redacted real Utah builder purchase agreement, ideally with an incentive addendum and an Affiliated Business Arrangement Disclosure, for a real-document pass before release.
- **Independent page check, then integrated (2026-11-09, this pull request).** A second agent read the page against SKILL.md, sample.md and page-notes.md and fixed what it found, including the plan wording every skill page shares. Then it was registered in `GUIDES`, `GUIDE_HTML` and `GUIDE_SLUGS` with its shell and library card, its three downloads rebuilt by `node scripts/skills.mjs build`. Web tests (1,212), API tests (1,167, against a local Postgres), typecheck, lint and the build pass; every page that is not new builds byte for byte as before. Against the built server, as www and as learn: the page answers 200, its trailing slash 301s, a deeper path on www 302s to the placeholder, and each download serves as a ZIP. In Chromium at 390 by 844, a sign-up through the page stored its row under the page's own source with `src=ig`, unlocked the setup, ran the page's hashed inline script under the CSP with no console errors, and nothing scrolled sideways. **Not checked here:** a real phone, a screen reader, an upload of the ZIP into a live Claude or ChatGPT account, and the skill run inside Claude.ai or ChatGPT itself (every run in `evals/` was an agent following the skill on the made-up files).
