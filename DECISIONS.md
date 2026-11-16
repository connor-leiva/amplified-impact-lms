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

## D-070 · Every skill page walks its setup one step at a time, with Copy & Open buttons

**Date:** 2026-11-09
**Approved by:** the user, in chat on 2026-11-09: "I wanted every skill to have a 'setup' flow that mirrors the exact same flow as the original skills (like the voice profile and reels editor). Nothing should be just a simple download and install - they should all have their own pages where they walk a user through the exact, step by step and the buttons open up into Claude and ChatGPT with the prompts copied to the clipboard". Asked to choose, the user picked "Guided screens" (one step at a time, Step 2 of 7, Back and Next, the place saved, every prompt a Copy & Open button) and "Yes, match them" for /reel-editor and /task-sync-starter.
**Scope:** `apps/web/src/guides/render.ts`, `main.ts`, `content.ts` (`SHARED.copyOpen`, `SHARED.guided`), `guides.css`, `skill-page.ts` (one wording fix), `task-sync-starter.ts` and its shell, and the tests that pin them. Every guide page with setup steps changes: the 17 skill pages, /reel-editor and /task-sync-starter. /ops-time-audit has no setup and is unchanged.

- **One step at a time.** After the sign-up, the setup shows the current step only, under "Step 2 of 7", with Back and Next below it and Start Over on the last step. Moving focuses the step's heading. The place is remembered on the device per page and per app (`<unlockKey>-step-claude`, `-step-chatgpt`), so a visitor who comes back on a computer after a phone lands where they left off; a saved place past the end opens the last step. With no script, or in a WebView that blocks it, every step shows numbered, as before (progressive enhancement, the same as /library).
- **Copy & Open.** Every step with words to say or paste now has "Copy & Open Claude" or "Copy & Open ChatGPT", for the app whose steps it is in. One tap copies the words and opens a blank chat in a new tab (`https://claude.ai/new`, `https://chatgpt.com/`), never a `?q=` prefill (D-032). The copy starts inside the tap, both ways, as /ai101 does (`copyBeforeLeaving`), so the words are on the clipboard before the app opens; if nothing can copy, the first tap stays on the page and selects the words, and the next one opens the app. The copy chip stays beside it for a second paste. For a long block (a Project's instructions, the Task Sync prompt), the button comes first, under the instruction.
- **/task-sync-starter gets a setup of its own.** It was a PDF and nothing else. It now walks the kit's three steps, one action a step: download the kit, turn off training, copy the Task Sync Prompt into Claude, test it on last week's meeting, connect tools (optional), and run it every weekday morning with the Morning Add-On. The prompt and the add-on are copied word for word from the PDF (pages 4 to 6); a check at build time compared them with the PDF's text, ignoring only line wrapping, and a test pins them. Its shell now loads `skills.css` for the copy block.
- **Wording fix:** "If you get a offer-strategy folder" became "If you get a folder named offer-strategy" on every skill page.
- **Tested:** web tests 1,223, typecheck, lint and the build. In Chromium at 390 by 844 against the built server: on /offer-strategy (Claude) and /task-sync-starter, every step showed alone with the right "Step n of 6", Next reached the end and Start Over came back, Copy & Open put the step's exact words on the clipboard and opened `https://claude.ai/new` in a new tab with the toast, no sideways scroll and no console errors.
- **Not tested:** a real phone (the clipboard-then-open order is /ai101's, proven there), a screen reader, and the ChatGPT path in a real ChatGPT account.

## D-071 · The skill pages take the combined design: the sample beside the sign-up, the setup as a checklist

**Date:** 2026-11-10
**Approved by:** the user, in chat on 2026-11-10, on the combined mockup (taste pass and unslop pass together, published as https://claude.ai/artifact/NqZULLso3GwfzNfNzVNP5J): "This is absolutely perfect. Build the combined direction, starting with the skill pages". Earlier, on what to combine: "The unslop seems a little too dry/simple but the taste seems a little too busy still. I like the checklist of taste over the checkboxes of unslop".
**Scope:** `apps/web/src/guides/render.ts` (a `skill` layout beside the guides' own), `skill-page.ts` (sets it, with the facts), `content.ts` (`Guide.layout`, `Guide.facts`, `SHARED.skill`), `skills.css` (the layout's styles, under its own classes, and Hanken Grotesk 600), `main.ts`, and the tests. The 17 skill pages change. /reel-editor, /task-sync-starter and /ops-time-audit keep their markup and their look (checked pixel for pixel against main at 390 and 1440); they share `main.ts`, so their inlined script changes. The home page, /library, /ai101, /voice-profile and /retool are byte-identical. The learner portal is not touched.

- **Look.** The warm paper ground (`--bg-canvas`) with white cards, a white top bar, h1 at 700 and h2 at 600, one green mono eyebrow on the page (the hero's; the sections' eyebrows are gone), and green kept for actions, the sign-up card, the setup checklist and one band. Buttons stay Title Case (D-048), 48px, the primary green and the rest white with a line. Tokens only (`check-css-colors`).
- **Top bar.** The logo, then "Free Library / <the skill>", the first a link to /library. On a phone only "Free Library" shows; the title is the h1 under it.
- **Hero.** The eyebrow, the title, the lede and three facts as pills: "Free", "About N minutes to set up" and "Claude or ChatGPT" (or "Works in Claude" for the three Claude-only skills). The guides' three numbered steps (Set It Up Once, Practise First, the outcome) are no longer drawn on a skill page; they stay in the data.
- **The sample is the picture.** The skill's own made-up output sits under the facts as a sheet of paper, its title and note at the top, and a heading that starts "Bottom line" drawn with its paragraph as a green callout. With the script it starts as its first screen, faded, with "See the Full Example" (then "Show Less"); focus reaching a part that is cut off opens it. On a wide screen a second sheet sits under it, turned a little, while it is a preview; the sheet itself stays square so its words stay sharp at 1x. With no script, all of it shows. Its section heading and line of context are read to a screen reader only.
- **The sign-up beside it.** From 960px the card is the right column, 420px wide, and stays in view while the visitor reads, until it holds the setup. Locked, it is the green card: the heading, the words, first name and email side by side when there is room, a light "Get the Skill" button and the consent line. Unlocked, it is a white card with "It's yours.", the app switch and the setup. On a phone the order is the words, the sample, then the card; once unlocked, the setup comes before the sample.
- **The setup as a checklist.** "Your setup" with "Step 3 of 6" beside it, then every step's title as a row: the steps before the current one ticked in green (`data-done`), the current one opened in place on a green tint with its buttons and words (`aria-current="step"`), the rest numbered and waiting. Back and Next below, Next as a tonal button. Everything D-070 does is unchanged: the place is remembered, Copy & Open copies and opens, and with no script every step shows numbered.
- **Bands.** Each section below the hero is a band under a hairline: what you get back in three columns, who does what (Run, Draft, Own) as open columns on the one white band with Own marked in green, what you need as cards with "Get the Skill" back up to the card, then "What to say" beside the questions from 960px, and the pointer to the next skill.
- **Phone bar.** On a phone, a "Get the Free Skill" bar at the foot of the screen leads to the card while the card is out of view, and goes for good once the skill is unlocked. With no IntersectionObserver it never shows; the card is still on the page.
- **New words on the page,** all labels: "Free Library", "Your setup", "See the Full Example", "Show Less", "Get the Free Skill", and the facts above.
- **Tested:** web tests 1,243 and API tests 1,167 (local dev database), typecheck, lint and the build. In Chromium against the built server and the dev database, on all 17 skill pages: no serious or critical axe violations locked at 1440, unlocked at 1440 and at 390; the card stays beside the open sample; See the Full Example opens and Show Less closes; a sign-up with a made-up name unlocks the card, moves focus to it and stops it sticking; every step shows as a row, Next ticks the steps behind it; the ChatGPT switch shows its own steps; on a phone the bar shows, leads to the card and hides, the unlocked setup comes before the sample, no sideways scroll; with JavaScript off the whole sample shows, the form's 303 lands on #download and every step shows numbered; no console errors.
- **Not tested:** a real phone and Instagram's in-app browser, a screen reader, Safari (`:has()` puts the setup first on a phone once unlocked; without it the sample stays first).

## D-072 · The Reel Editor and the Task Sync Starter Kit take the library's look

**Date:** 2026-11-10
**Approved by:** the user, in chat on 2026-11-10: "Move reel-editor and task-sync-starter into the new layout".
**Scope:** `apps/web/src/guides/render.ts` (the layout's picture can be a before and after or an example, not only a sample; tiles with labels other than Run, Draft and Own are cards), `content.ts` (`Guide.bar`), `reel-editor.ts`, `task-sync-starter.ts`, `reel-editor.html` (now loads `skills.css`), `skills.css`, and the tests. /reel-editor and /task-sync-starter change. The 17 skill pages keep their markup and look (checked pixel for pixel against main on two of them at 390 and 1440); only the long copy block in a setup step changes (below). /ops-time-audit, the home page, /library and the other pages are byte-identical.

- **The same layout as the skill pages (D-071).** The top bar with "Free Library / <title>", one eyebrow, the title, the lede and three pills, the sign-up card beside the picture on a computer, the setup as a checklist once unlocked, the sections as bands, and the phone's bar to the sign-up. The guides' three numbered steps are no longer drawn; they stay in the data.
- **The Reel Editor's picture is its before and after.** The raw take and the finished Reel, side by side beside the sign-up, as the page already had them (plain videos, nothing fetched but the posters until one plays). Pills: "Free", "About 2 minutes to set up", "Works in Claude".
- **The Task Sync kit's picture is its example.** As a sheet of paper: its heading as the title, the sentence from Monday's meeting, and the task it becomes in green. Pills: "Free", "About 20 minutes to set up", "Works in Claude". Its phone bar reads "Get the Free Kit".
- **The Reel Editor's order.** "For the best results" now comes before "What to say", so "What to say" and "Good to know" sit side by side, as on the skill pages. No words changed.
- **Labelled cards.** "Graphics that explain, not decorate" and "Two looks" are cards with their small green labels; the white who-does-what band is only for Run, Draft and Own.
- **Long copy blocks in a setup step** (the Task Sync prompt and its morning add-on, a skill's ChatGPT Project instructions) show their first lines, about 13, fading out, so Back and Next stay near the step in the narrower card. The block is still the button that copies every word, Copy & Open still copies them all, and a screen reader still hears them all. This reaches the ChatGPT step on the 14 skill pages that have one.
- **Tested:** web tests 1,246 and API tests 1,167 (local dev database), typecheck, lint and the build. In Chromium against the built server and the dev database, on /reel-editor and /task-sync-starter (and /offer-strategy and /team-playbook-builder again): no serious or critical axe violations, locked and unlocked at 1440 and at 390; the card stays beside the picture; a sign-up with a made-up name unlocks the card and moves focus to it; every step shows as a row and Next ticks the steps behind it; on a phone the bar shows, leads to the card and hides, and the unlocked setup comes before the picture, with no sideways scroll; with JavaScript off the form's 303 lands on #download and every step shows numbered; no console errors.
- **Not tested:** a real phone, Instagram's in-app browser, Safari, a screen reader, and playing the two videos on a phone.
---

# The offer launch: D-073 to D-082 (accepted)

The Offer Launch website spec (Nov 9, 2026) lists ten decisions as D-071 to D-080 and asked for each to go in here as a proposal that Connor approves before the code merges. D-071 and D-072 were already taken (the skill pages' design, and the Reel Editor's and Task Sync Starter Kit's look), so they are numbered D-073 to D-082 below, in the spec's order.

**Accepted by Connor on 2026-11-10, with edits** (in chat, the Batch 0 instructions for pull request #10): "Accept D-073 through D-082 with these required edits before merge." His decisions that day, which the entries below now carry:

1. **The AI Accelerator rolls into Amplified Insiders automatically.** Cohort buyers continue at $197 a month after the cohort plus its 90 included days; cohort one's first charge is Monday, May 3, 2027 (the last build is Feb 2, 2027). It is said at sign-up, beside a required consent box.
2. **Members cancel themselves in Stripe's billing portal,** at period end, with 30 days' notice wording, keeping every skill already released. Not email only.
3. **Offer names:** Amplified AI Accelerator, Amplified Skill Library, Amplified Insiders, Amplified Team Plan.
4. **The client agreement is attorney-approved as it stood**; only its draft markers, the plan names, the renewal and cancel lines and its version changed (D-075).
5. **Free picks:** Database Health Check and Team P&L Review join Appointment Follow-Up (D-080).
6. The Stripe-side billing requirements of 2026-11-10 (sections A to E): fixed `trial_end` instants, a separate Insiders subscription for two-pay, the installments stopped at the second paid invoice, and a locked portal configuration for buyers inside a commitment (D-077).

## D-073 · Payments go through Stripe's hosted Checkout by redirect

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-071).
**Scope:** `apps/api/src/billing/` (`checkout.ts`, `stripe.ts`, `config.ts`), `apps/api/src/routes/offer.ts`, `packages/core/src/offer.ts`, the `stripe` package (19.3.0, pinned to its own API version `2025-10-29.clover`).

- No Stripe.js and no card fields on our pages. The offer form posts to `POST /api/checkout`, which writes the order and answers with the Checkout Session's URL: JSON for the page's script, a 303 for a plain form post.
- Helmet's `form-action 'self'` would block that 303 in a browser, so the offer page's own response, and no other, adds `https://checkout.stripe.com` to `form-action`. Tested in Chromium with JavaScript off.
- Every session carries `client_reference_id` and metadata `order_id`, `ai_plan`, `ai_option`, `origin` and `campaign`, copied to the payment or the subscription; uses the order id as its idempotency key; prefills the email, collects a phone number and expires after 60 minutes.
- The settings are `STRIPE_SECRET_KEY` (a restricted key), `STRIPE_WEBHOOK_SECRET`, `OFFER_OPEN`, `FOUNDING_CLOSES_AT`, plus `INVITES_FROM`, `PAYMENT_LINK_*` (the fallback links) and `INTAKE_URL_*` (Sarah O.'s forms), `STRIPE_PORTAL_LOGIN_URL` and `STRIPE_PORTAL_CONFIG_LOCKED` (D-077). The API boots without any of them; the log says which are set and a key's mode, never a value.
- `AGREEMENT_VERSION` lives beside the checkout (`billing/checkout.ts`), held equal to the page's copy by `test/offer-copy.test.ts`.

## D-074 · Prices live in Stripe, found by lookup key

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-072).
**Scope:** `billing/prices.ts`, `packages/core/src/offer.ts` (`LOOKUP_KEYS`, `priceWords`).

- The code holds no amount and no price id. It asks Stripe for the six lookup keys in the handoff (`cohort_founding_full`, `cohort_founding_two_pay`, `library_upfront`, `membership_monthly`, `agents_upto15_founding`, `agents_16to40_founding`) and caches them for 5 minutes. A failed refresh keeps the last good list; with none, the page shows the Payment Links, or "The carts open soon".
- The page prints prices the API fills per request (`%%tokens%%`), so a moved lookup key shows within 5 minutes with no deploy. When a price is missing, a card says "The price shows on the payment page" rather than a wrong number.

## D-075 · Orders and Stripe events; only the webhook marks an order paid; the offer pages

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-073 and D-074, which share these files).
**Scope:** migration `0006_offer_billing` (`orders`, `stripe_events`), `billing/webhook.ts`, `routes/offer.ts`, `routes/legal.ts`, `routes/marketing.ts`, `apps/web/src/offer/`, `apps/web/{offer,offer-welcome,agreement}.html`, `apps/web/src/legal/agreement.ts`, `apps/web/public/forum-qr.svg`, `test/authz.test.ts`.

- `orders` holds one row per purchase attempt, from the page (written before Stripe is called) or from a fallback Payment Link (written by the webhook from the link's metadata and custom fields). `stripe_events` holds one row per event, inserted first, so a processed event is answered 200 and skipped.
- The webhook checks the signature over the raw body, then does the database work inline and answers 500 on a failure so that **Stripe's own retries** bring the event back for three days. This differs from the spec's "answers 200 fast and works after": with no local retry queue, a 200 for a failed event would lose it. The work is a few queries and at most two Stripe calls, and emails go out after the commit.
- Pages: `/offer`, `/forum` (the same page; it records `campaign` = `forum`), `/offer/welcome` and `/agreement`. They join D-051's exact allow-list (no trailing slash; `/offer/`, `/Offer`, `/offer.html`, `/offer/welcome/x` and `/forum/` never serve the page, tested), are `noindex`, and are exempt from the global limit (D-028). `/api/checkout` has its own limit (120 a minute per key, sized for a room on one address), `/api/offer/order-status` its own (600), and the webhook none.
- Net-new UI, like the sign-in screens: the offer page, the welcome page and the agreement. Checked against the taste-skill rubric in Chromium at 390 and 1440: no sideways scroll, no axe violations, no console or CSP errors, the scripted and the no-JS checkout both reaching Stripe.
- `/agreement` is the attorney-approved text (Connor, 2026-11-10), version `2026-11-12`, recorded on every order. Since approval only its draft markers, the plan names and the renewal and cancel lines changed (decisions 1 to 4 above).

## D-076 · Buyer tags in GHL

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-075), the tag list as below.
**Scope:** `integrations/ghl.ts` (`BUYER_TAGS`, `buyerTags`, `syncBuyerContact`), `jobs/ghl-orders.ts`, `jobs/ghl-sync.ts`.

- The waitlist's GHL loop also copies buyers, on the same tick: the order is the record, GHL a copy, tags only ever added, never a phone number without SMS consent. A pending order is never copied.
- Tags: `offer-buyer`, `plan-library` / `plan-cohort` / `plan-agents`, `pay-full` / `pay-two` (cohort), `checkout-abandoned-<plan>`, `payment-failed`, `membership-ended`, `refunded`, `event-forum-nov-2026` (orders through `/forum`), `sms-consent`, and `cohort-waitlist` (the offer page's waitlist form, a sign-up like the guides'). `intake-done` is GHL's own. `offer-interest` and `interest-<plan>` wait for P1's "not ready yet" form.

## D-077 · Billing rules

**Date:** 2026-11-10
**Status:** Accepted with edits, Connor, 2026-11-10 (the spec's D-076): the auto-roll into Amplified Insiders and cancelling in the portal.
**Scope:** `packages/core/src/offer.ts`, `billing/checkout.ts`, `billing/webhook.ts`.

- **Fixed dates, as unix instants.** Amplified Insiders for cohort one starts Monday, May 3, 2027, 00:00 Central (`1809320400`); the Amplified Team Plan's first charge is Tuesday, Jan 26, 2027, 00:00 Central (`1800943200`). Checkout Sessions set `trial_end` to them; after every paid purchase, site or Payment Link, the webhook pins a subscription whose `trial_end` differs (no proration), because a link's relative `trial_period_days` drifts with the day it was last edited. Never `trial_period_days=90` for Insiders, which would bill in February. The Team Plan instant moved from the proposal's 9 am to midnight, as the Stripe-side requirements state it.
- **The AI Accelerator in full** is one subscription: `cohort_founding_full` charged today and `membership_monthly` trialing to May 3, 2027. That subscription is the buyer's Amplified Insiders.
- **Two payments** stay their own subscription (`cohort_founding_two_pay` only). The webhook ends it at the second paid invoice (`cancel_at_period_end`), keeping the second charge and preventing a third; its end is "complete", not "cancelled", and takes no access away. Every paid two-pay buyer, site or Payment Link, gets a **separate** Insiders subscription on the saved card, trialing to May 3, 2027, keyed `membership-autoroll-<checkout session>`, skipped when the customer already holds an active or trialing membership. The proposal's date set at checkout is gone: a `cancel_at` before a failed second payment's retries could lose that payment.
- **The library** is one subscription: `library_upfront` charged today and `membership_monthly` on a 30-day trial, so the $197 starts on day 31. A link that could only carry the $2,000 gets its $197 started by the webhook.
- **Cancelling** is the member's own, in Stripe's billing portal, at period end, with 30 days' notice; every renewal box, Stripe's checkout page and `/agreement` say so (`CANCEL_WORDS`), and a cancelled plan keeps every skill already released. The platform's Manage Billing button (`GET /api/billing/portal`, the owner only) opens a portal session; for a buyer inside a commitment (two-pay before payment 2, a Team Plan inside its 3-month minimum) it uses the portal configuration with cancelling off (`STRIPE_PORTAL_CONFIG_LOCKED`). The public login page cannot hide the button, so a Team Plan cancelled inside its minimum is logged for Connor, and the agreement keeps the minimum owed.
- **Founding** closes at `FOUNDING_CLOSES_AT` (default Sun, Nov 15, 11:59 pm Central): the founding carts are refused at checkout and the page shows "Founding prices closed". A session already open can still be paid within its hour.
- **Consent.** Every cart with a later charge has its own required box naming the amount, the start date and how to cancel (both AI Accelerator carts name Amplified Insiders); the words are stored with the order (`renewal_consent_text`). The two-pay's second payment counts as a later charge. The CRM question refuses the cohort to teams not on Follow Up Boss, offering the library and the waitlist.
- **Refunds.** A full refund ends the plan and its access, and cancels its subscriptions so nothing charges again.

## D-078 · Accounts and plans; provisioning

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-077).
**Scope:** migration `0006` (`accounts`, `plans`), `packages/core/src/provision.ts`, `billing/provision.ts`, `billing/cli.ts`, `jobs/billing.ts`.

- A paid order becomes a platform team with the buyer as an invited Team Owner, through `provisionOwner` in `@ai/core` (a pure function on `Db`, persisted with `persistDiff` under the mutations' advisory lock, like `/api/mutate`). It is not one of the 37 mutations and has no route.
- One account per owner email; one plan per order; running it twice changes nothing. A second plan for the same buyer lands on the same account and team, raising seats and tier, never lowering them.
- **Defaults until Spring and Connor decide:** every owner is Team tier (so the Team Hub is theirs), in cohort one (`dec26`); seats are 2 for the library and the cohort (owner plus an operations lead), 16 and 41 for the agent tiers (the agents plus the owner).
- Invites made before `INVITES_FROM` (Mon, Nov 16, 8 am Central) are held and sent by a one-minute loop when it passes; after it, they go at once. While the platform runs in fixture mode (production today), every invite is held, because there is no sign-in for its link to reach; the first deploy in http mode sends them. The staff command `pnpm --filter @ai/api provision --order <id> [--invite-now]` re-runs provisioning for one order.
- The 11th cohort sale is not refused; it logs an error line asking Connor to book a tech assistant.

## D-079 · The skill library

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-078).
**Scope:** migration `0006` (`skills`), `packages/core/src/skills.ts`, `billing/access.ts`, `routes/skills.ts`, `storage.ts` (`skillFileKey`, `putObject`), `billing/cli.ts`, `apps/web/src/routes/library/`, `apps/web/src/router.tsx`.

- One rule, `canOpenSkill`: the skill is free; or one of the account's plans covers its set and is paid through a date on or after its release ("cancel and keep"). A refunded plan opens nothing; an agent plan opens nothing until its first charge.
- `GET /api/skills` lists every published skill as open, locked or upcoming; `GET /api/skills/:id/download/:kind` answers 403 when the rule says no, else a 5-minute presigned link (D-024's pattern). A sales agent opens the agent set and the free skills, never an owner-and-ops-only skill.
- `pnpm --filter @ai/api skills [--upload]` loads the catalog into the table and puts the ZIPs in the bucket under `skills/<id>/`.
- `/skill-library` on learn is the screen: net-new UI outside the shell, like `/sign-in`, so no portal golden moves. It groups the skills by set (Owner and Operations Skills, Agent Skills, Skills for Everyone), with the downloads on an open skill, "Not in your plan." and See Plans on a locked one, and the date on an upcoming one; signed out, it offers Sign In. **No sidebar entry:** the welcome email and the www skill pages link to it, and an entry in the shell is a separate decision because it moves every portal golden.

## D-080 · Only the free skills stay downloadable on www

**Date:** 2026-11-10
**Status:** Accepted with edits, Connor, 2026-11-10 (the spec's D-079): the two free picks.
**Scope:** `packages/core/src/skills.ts` (`FREE_SKILLS`, `PAID_DOWNLOADS`), `apps/api/src/server.ts`, `apps/web/src/guides/`, `apps/web/src/library/`.

- Free fails closed: a skill is free only when `FREE_SKILLS` names it. Today that is Appointment Follow-Up (the Follow Up Boss follow-up skill) and Connor's two picks, Database Health Check and Team P&L Review (2026-11-10). The voice profile and the time audit are guides, not ZIPs, and stay as they are.
- `server.ts` stops serving every paid ZIP from `/downloads`, and any `/downloads/` path no route serves is a plain 404 rather than the SPA.
- The tags in `skills.ts` are read off each skill's own description; changing one is a one-word edit. The Reel Editor stays paid.

## D-081 · Seats by plan

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10 (the spec's D-080). **Not built:** it belongs to P2 (by Jan 26) and re-captures the Team Hub goldens.

- `inviteMember` takes its limits from the account's plan (15 or 40 agents) instead of its fixed 1 owner, 1 operations lead and 5 sales agents, and the Team Hub handles 40 people. Provisioning already sets `teams.seats` from the plan (D-078).

## D-082 · The skill pages of paid skills become previews

**Date:** 2026-11-10
**Status:** Accepted, Connor, 2026-11-10. The spec folds this into its D-079; it is its own entry because it changes 17 pages.
**Scope:** `apps/web/src/guides/` and `apps/web/src/library/`.

- A paid skill's page keeps its hero and its sample, and shows an "In the Amplified Skill Library" card ("This skill is part of the Amplified Skill Library in the Amplified Impact platform.", See Plans to `/offer#plans`, and "Already bought a plan? Sign In" to `learn.amplifiedimpact.io/skill-library`) in place of the sign-up and the setup. "What you need" points to See Plans. No built page links a paid ZIP, and no paid page has a sign-up form.
- A paid page stops calling itself free: "Free" comes off its title, description and eyebrow, and its first fact reads "In the Amplified Skill Library". Its own file keeps the free words and the setup, so naming the skill in `FREE_SKILLS` brings the free page back with no other edit. The free page (Appointment Follow-Up) builds byte for byte as before.
- The free library's cards tag each paid skill "In the Amplified Skill Library", and its lede now says "The free ones ask for your name and email. The rest are in the Amplified Skill Library."
- **Left for Connor:** paid pages still describe the setup in their own words ("About 10 minutes to set up", "Step 1 shows you where"), and the phone's "Get the Free Skill" bar does not show on them.

## D-083 · /listing-description-writer: Listing Description Writer, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/listing-description-writer/`, `apps/web/src/guides/listing-description-writer.ts`, `apps/web/listing-description-writer.html`, `apps/web/public/downloads/listing-description-writer*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/listing-description-writer is the page for the paid `listing-description-writer` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()` (D-052), unlock key `ldw-unlocked`, drawn with the Skill Library card (D-082). It reads a listing worksheet or MLS input sheet, the seller's notes, a feature list, a county record or the agent's own wording, and returns flags, a bottom line, a Fair Housing Review, public remarks with a character count, two headlines, a social caption, Facts I Used and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads every page, builds a fact sheet with a source for each fact, sets aside agent-only fields, compares sources, counts characters in code and reviews every line. Draft: the remarks, headlines, caption and rewrites. Own: the agent confirms every fact with the seller, the MLS limit and rules, the price, when marketing starts, whether to post, and the final fair housing call with the broker.
- **Guardrails:** nothing invented; conflicts between inputs are flagged and neither number is used; a seller claim another document contradicts or leaves open, unmeasured distances and drive times, and plans are held back until the agent confirms; agent-only fields never reach public copy; flagged wording is quoted once, in the review only; no school names and no school, safety or people claims.
- **Utah and general mode:** Utah mode cites UtahRealEstate.com's guide (revised 2/11/2026) for the Public Remarks bans and Rule 1.0.2 (the one-business-day public-marketing rule), Utah Code 61-2f-401(12) (the brokerage name in the caption) and 57-21-5 (Utah's protected classes). General mode says state and MLS rules were not checked.
- **Character limit:** no limit was found in any source checked, so the agent confirms it; without one the skill keeps the remarks under 1,000 characters as a working target only.
- **Tested:** practice (Sandy rambler) 10/10 and 21/21 objective checks; eval 1 (Lehi two-story, a county record that disagrees on the basement) 10/10 and 20/20; eval 2 (condo with a problem seller email) 10/10 and 21/21. The page typechecks, lints and renders at 390 px.
- **Not tested:** real worksheets, the ChatGPT Project inside ChatGPT, general mode, a full set of agent-written remarks, a no-skill baseline.
- **Open for Connor:** is a 1,000-character working target right, and what is UtahRealEstate.com's actual Public Remarks limit? Use the seller's plain facts marked for the agent to confirm, or hold back everything only the seller states? The review quotes each flagged line once (Appointment Follow-Up never repeats such wording). "Walking distance", "master bedroom" and "man cave" are style cautions, not violations. The skill computes the public-marketing deadline as a date marked "confirm with your broker". The caption always ends with the agent's and brokerage's names. School names are left out entirely. MLS systems and CRMs now offer built-in description writers; does this still earn its place? Send one redacted real worksheet and seller questionnaire for a pass on real documents.

## D-084 · /open-house-follow-up: Open House Follow-Up, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/open-house-follow-up/`, `apps/web/src/guides/open-house-follow-up.ts`, `apps/web/open-house-follow-up.html`, `apps/web/public/downloads/open-house-follow-up*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/open-house-follow-up is the page for the paid `open-house-follow-up` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `ohfu-unlocked`, drawn with the Skill Library card (D-082). Input: one open house's sign-in sheet (an app export, a Google Form, a typed list or a photo) and the agent's notes. Output, in order: flags, a bottom line, an agent-only visitor list, an email for every visitor, a text only for consented visitors, a seller update (a Listing Agent Update when the agent hosted a teammate's listing), dated next steps and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads every row, merges duplicates, sorts each visitor by agent status and consent, counts and resolves dates. Draft: every email, every text and the update. Own: the agent decides who gets a text and keeps consent records, decides whether to contact represented visitors, owns all price talk with sellers, and does the fair housing review and the Do Not Call scrub.
- **Guardrails:** represented visitors get a thank-you only, and their questions go through their agent (NAR Article 16; Utah R162-2f-401b(1)(k)). A phone number is never consent; every text carries a Consent line and "Reply STOP to opt out." Every email has an opt-out line and [Sender Postal Address]. The home is described, never the visitors. The seller update has no names and no price advice.
- **Tested:** practice (Utah, a Sunday open house written two days later) 13/13, and it is `sample.md`; eval 1 (Google Form, Mesa AZ in general mode, a teammate's listing) 12/12; eval 2 (typed list, no consent recorded) 9/9; objective checks on every run. The page typechecks and renders without dashes.
- **Not tested:** a real handwritten photo, real app exports or XLSX, more than 12 visitors, ChatGPT itself, a voice QUICK CARD, a "do not contact" row, a no-skill baseline.
- **Open for Connor:** keep the CAN-SPAM marketing line ("This is a marketing email from...") on one-to-one follow-ups, or drop it? Should represented visitors get a thank-you at all, or only a note through their agent? Consented visitors get both a text and an email; is one enough? The seller update tallies visitors' timeframes; should sellers see that? Utah 13-25a-103's Sunday and holiday limits are written for calls, and whether they reach texts is unconfirmed. Curb Hero's automatic text and Follow Up Boss action plans already cover some of this; the skill adds personal drafts from the agent's notes, the represented-visitor rule, per-visitor consent and the seller update. Send a redacted Curb Hero export and a photo of a handwritten sheet.

## D-085 · /sphere-touch-plan: Sphere Touch Plan, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/sphere-touch-plan/`, `apps/web/src/guides/sphere-touch-plan.ts`, `apps/web/sphere-touch-plan.html`, `apps/web/public/downloads/sphere-touch-plan*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/sphere-touch-plan is the page for the paid `sphere-touch-plan` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `sph-unlocked`, drawn with the Skill Library card (D-082). It reads a Follow Up Boss People export, another CRM's export or a spreadsheet, sorts contacts into Past Clients, Close Sphere and Wider Sphere (the agent's own tags first), builds a 12-month plan with the kind of touch each month, and picks this week's people: closing anniversaries, then notes that asked for a follow-up, then whoever has gone longest without a touch, spread over the weeks left in the month. It drafts texts, emails and call notes, each tied to a field or a note, and says what to set up in Follow Up Boss (a Text Consent field, a Smart List per tier, a yearly Home Anniversary date with a Calendar Date automation that starts a task, and action plans of tasks) as steps the agent takes. Drafts only; it never writes to the CRM.
- **Run, Draft, Own:** Run reads, sorts and picks. Draft: the plan, the setup steps and the messages. Own: the tiers, the consent records, the Do Not Call scrub, the Follow Up Boss setup and every send.
- **Guardrails:** texts only to people with a written yes in the export or a yes the agent gives in chat; a verbal yes does not count, and STOP or Revoked, Do Not Text or Do Not Call closes texts. Every text ends "Reply STOP to opt out." and every email carries the opt-out footer. Health, money and family-status notes are counted in one line and never used. Nothing invented (no joining two facts into one the note does not make), no home values. First-year clients go to post-closing-client-care.
- **Tested:** practice 12/12 (it is `sample.md`), eval 1 (the full export with a voice QUICK CARD) 14/14, eval 2 (a sheet with no consent column, where the agent asks for texts) 11/11: no texts, and it says why. Tiers and picks match `expected_picks.py` row for row. The page typechecks and renders at 390 px.
- **Not tested:** a real Follow Up Boss export (whether custom fields and Last Communication come through), the Project inside ChatGPT, the setup steps in a live Follow Up Boss account, a no-skill baseline.
- **Open for Connor:** the default cadence (12, 6 and 4 touches a year per tier, a check-in for every tier in month 1, the weekly share rule) is the house's, not yours. Every email, even a personal anniversary note, carries outreach-rules.md's marketing footer; ask the broker whether a personal note needs it. An open house sign-in "yes" drafts a text with a check first (the same open call as D-053). Do Not Call closes texts as well as calls; a verbal yes does not count; birthdays are ignored. Utah calling and texting rules were not checked (there is no utah-*.md); add one? Follow Up Boss's date-automation facts came from search excerpts: whether the trigger can use Deal Close Date, and whether an import can fill Home Anniversary, is unconfirmed. A past client joins this plan on their first anniversary; align with post-closing-client-care when it is built. The practice file is dated 2026-11-10, so later practice runs pick different people than the sample.

## D-086 · /market-update-email: Market Update Email, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/market-update-email/`, `apps/web/src/guides/market-update-email.ts`, `apps/web/market-update-email.html`, `apps/web/public/downloads/market-update-email*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/market-update-email is the page for the paid `market-update-email` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `mue-unlocked`, drawn with the Skill Library card (D-082). From an MLS market report PDF, a stats CSV or pasted numbers it returns flags, a bottom line, what it used, a Numbers I Used table (source, period and arithmetic for every figure), an email (Title Case subject, 250 words or fewer, a source line, a CAN-SPAM footer), a social post of 120 words or fewer, and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads and checks every row and computes percent change, months of supply and list-to-sale in code. Draft: the email and the post. Own: what goes out and to whom, odd rows (with the MLS), the source line, the brokerage name, the unsubscribe setup, any market opinion, and fair housing.
- **Guardrails:** only supplied numbers; odd rows are flagged, never fixed; no forecasts and never "a good time to buy or sell"; report quotes, national figures and rates stay out; no schools, safety or demographics; aggregate figures only. Utah: R162-2f-401h (the brokerage name) and UtahRealEstate.com Rule 13.1 (the disclaimer), checked 2026-11-10. Elsewhere it uses NAR's model notice and says state rules were not checked.
- **Tested:** practice 12/12, eval 1 13/13, eval 2 11/11, eval 3 9/9; a checker recomputes every arithmetic step. The page typechecks, lints and renders clean at 390 px.
- **Not tested:** real RapidStats, UAR, InfoSparks or RPR files; per-sale exports; a PDF and a CSV that disagree; the Project inside ChatGPT; Gmail drafts; an independent rerun or a no-skill baseline.
- **Open for Connor:** RPR and ShowingTime already make shareable reports; this adds checked copy and guardrails, so confirm it earns its place. Months of supply is computed from one month when the report gives none (reports often use a 12-month average). The 250-word and 120-word limits and the topics are the builder's choices. RapidStats' download type is unstated (the page says print to PDF). The RPR path comes from a 2024 blog post. No UtahRealEstate.com rule was found on putting MLS data into AI tools.

## D-087 · /l10-meeting-prep: L10 Meeting Prep, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/l10-meeting-prep/`, `apps/web/src/guides/l10-meeting-prep.ts`, `apps/web/l10-meeting-prep.html`, `apps/web/public/downloads/l10-meeting-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/l10-meeting-prep is the page for the paid `l10-meeting-prep` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, drawn with the Skill Library card (D-082). It preps the integrator or team leader for the weekly EOS Level 10 from exports or pastes (a scorecard from Ninety, Bloom Growth or a spreadsheet, rocks, to-dos, issues and headlines). It returns the agenda in EOS Worldwide's published order with times; each miss against that measurable's own goal and direction, with 13-week miss counts; every empty cell flagged for its owner; each rock's status exactly as given; last week's to-dos with the completion rate and its arithmetic; a suggested IDS order (dated client or money deadlines first, then issues tied to this week's misses or an off-track rock, then the rest oldest first); possible drop-downs; a note to owners; and Check before sending.
- **Run, Draft, Own:** Run: code reads, sorts, compares and counts. Draft: the prep, the suggested order and the note to owners. Own: each owner's numbers and rock status, drop-downs, the IDS choices and the solutions.
- **Guardrails:** never fills a missing number, even when asked; never marks a rock on or off track; never invents an issue, owner or due date; no judgments of people and no per-person rates; read-only, never sends; health, HR and pay details stay out of headlines; one benchmark (EOS Worldwide's 90% to-do completion) applied to the team only.
- **Tested:** case 1 11/11, case 2 11/11, practice 10/10, objective checks pass; the page passes tsc and eslint.
- **Not tested:** real Ninety or Bloom exports (Bloom does not publish its columns), Ninety's week header format, headline exports, the ChatGPT version inside ChatGPT, Claude Free, a no-skill baseline.
- **Open for Connor:** Ninety's Meetings tool already runs the L10; this adds who still owes a number or a status, the computed completion rate and a suggested IDS order, and gives spreadsheet teams the whole page, so confirm it earns its place. Quote the 90% to-do figure (Ken DeWitt, eosworldwide.com) or not? Minutes, days and cost are read as lower-is-better, listed for the owner to confirm. Confirm the headline privacy rule. Run one real Ninety and one real Bloom export before release.

## D-088 · /fub-pipeline-review: FUB Pipeline Review, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/fub-pipeline-review/`, `apps/web/src/guides/fub-pipeline-review.ts`, `apps/web/fub-pipeline-review.html`, `apps/web/public/downloads/fub-pipeline-review*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/fub-pipeline-review is the page for the paid `fub-pipeline-review` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `fubpr-unlocked`, drawn with the Skill Library card (D-082). From this week's People export, an optional Deals report and an optional last week's export, it returns flags and a bottom line; the pipeline by stage, with days since last communication worked out per record in code and the arithmetic shown; what moved since last week; four decision lists (deals past their expected close date, appointment-stage people with no next step, hot or active people with nothing logged in more than 7 days, and stages with no movement); conversion by source and by agent, every rate as n / d; each agent's counts and questions for each agent; odd rows; and Check before sending.
- **Run, Draft, Own:** Run: code reads, ages, matches and counts. Draft: the review, the questions and Smart List steps. Own: decisions on leads and deals, every Follow Up Boss change, and any judgment of an agent.
- **Guardrails:** read-only; never changes a stage, assigns a lead, adds a tag or task, or sends anything. It never invents a stage, date, value or movement, and flags odd rows without fixing them. It never judges or ranks agents (asked "which agent is dropping the ball", it answers with facts). No emails, phone numbers or note text in the output; nothing about who leads are; no benchmarks.
- **Connor's filter:** `page-notes.md` and the page's first FAQ say what Follow Up Boss Reporting and Sisu already give, and what this adds: the named, dated decision list built from the export's own fields, aging per record, the meeting questions, and last week against this week. Conversion goes by current stage, so it is a floor; the skill names the Lead Source report and Sisu as the source of record.
- **Tested:** case 1 (the full practice set: 54 people, 5 agents, 13 deals, last week's export) 11/11, and it is `sample.md`; case 2 (People export only, five odd rows, two custom stages) 10/10; objective checks pass on both, with every day count and rate recomputed. The page passes tsc and eslint.
- **Not tested:** a real Follow Up Boss export, an export without Last Communication, a Deals export with a Pipeline column, renamed stages, ChatGPT itself, Claude Free, a no-skill baseline.
- **Open for Connor:** confirm it earns its place next to Follow Up Boss Reporting and Sisu. Approve the defaults: "stale" is more than 7 days (Follow Up Boss's own Met/Appt Set list uses 6); the conversion period is the 90 days before the as-of date; "Hot" means a tag named Hot; "appointment, no next step" means no communication in more than 7 days, no open deal and the same stage as last week. The help center does not say whether Last Communication and Last Activity come through with Export All Columns, or whether Pipeline can be a Deals report column (its pages block automated reads; facts came from search excerpts), so run one real People export and one real Deals export.

## D-089 · /speed-to-lead-reply: Speed to Lead Reply, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/speed-to-lead-reply/`, `apps/web/src/guides/speed-to-lead-reply.ts`, `apps/web/speed-to-lead-reply.html`, `apps/web/public/downloads/speed-to-lead-reply*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/speed-to-lead-reply is the page for the paid `speed-to-lead-reply` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `stlr-unlocked`, drawn with the Skill Library card (D-082). From one new lead (a Follow Up Boss notification or profile, a portal email, a website registration or a Facebook lead form, pasted or as a screenshot) and the listing sheet if there is one, it returns flags, a bottom line, the consent read (the record's text consent quoted), a first text only when consent is documented, a first email answering the lead's questions from the listing only, a call opener and a 20-second voicemail, day 1 and day 3 touches, and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads the record and the listing, quotes consent, finds automatic messages, and works out send times and dates. Draft: the text, email, call opener, voicemail and touches. Own: whether to text and the consent records, the Do Not Call check, price and availability answers, the buyer agreement, any Follow Up Boss change (pausing an action plan), and the fair housing call.
- **Guardrails:** a phone number is never consent. Texts only for TEXT OK (a line covering texts that names the agent, team or brokerage, or the agent's own word); a line naming only a portal or "real estate professionals" is CHECK FIRST; STOP, Do Not Text and Do Not Call close channels even over an older yes. No availability claims; no school, safety or neighbor opinions (public sources and the district map instead); no showing promised before a written buyer agreement (NAR MLS Policy 8.13; Utah R162-2f-401a(2)); no agent-only fields, website activity or financing details. Represented leads get a polite reply only (R162-2f-401b(1)(k)). Follow Up Boss action plans and Instant Response: advice only (pause the plan or send after it). Utah: calls to leads without call consent move off Sundays and legal holidays (13-25a-103(3), 63G-1-301). General mode says state rules were not checked.
- **Tested:** practice 10/10 after two fixes (it is `sample.md`); eval 1 (website consent field, 7:05 AM) 11/11; eval 2 (portal lead, no consent, asks about safety and schools) 11/11 after one fix; eval 3 (the agent asks for a text but the lead replied STOP and is tagged Do Not Call) 6/6; two extra practice leads 6/6 and 5/5; objective checks pass on all six runs. The page typechecks, lints and renders at 390 px.
- **Not tested:** real Follow Up Boss, portal or Facebook files; screenshots; a CHECK FIRST line; a seller home value lead; a voice QUICK CARD; the Project inside ChatGPT; a no-skill baseline or second reviewer.
- **Open for Connor:** the first-reply email footer drops the marketing line (the lead asked); CHECK FIRST blocks texts on generic portal consent until the broker confirms; whether an inquiry counts as consent for Utah Sunday and holiday calls is unconfirmed; a represented lead asking for an ad's list gets no list; the day 1 and day 3 cadence is the builder's choice and may double up with action plans; the Instant Response and action-plan pause facts come from search excerpts (Follow Up Boss's help center blocks direct reads); send redacted real Follow Up Boss, Zillow and Facebook leads. The practice sample is dated 2026-11-10, so its day 1 falls on Veterans Day.

## D-090 · /fub-automation-audit: FUB Automation Audit, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/fub-automation-audit/`, `apps/web/src/guides/fub-automation-audit.ts`, `apps/web/fub-automation-audit.html`, `apps/web/public/downloads/fub-automation-audit*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/fub-automation-audit is the page for the paid `fub-automation-audit` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `fubaa-unlocked`, drawn with the Skill Library card (D-082). It reads a team's Follow Up Boss action plans, automations, Lead Flow, stages, lead sources and any outside texting tool, as screenshots, a page printed to PDF, copied steps or a typed list (Follow Up Boss has no export for plans; its API lists plan names and status only). It returns flags, a bottom line, what it used, an inventory with each row's source and day math, gaps, overlaps, texting-consent risk, three template wording checks, a ranked fix list written as clicks in Follow Up Boss, questions and Check Before Sending. Read-only.
- **What Follow Up Boss's help center confirmed (2026-11-10, cited in `references/fub-inputs.md`):** action plans have no text step; the only text Follow Up Boss sends itself is the Lead Flow Initial Text (Instant Response); drip texts come from partner tools, usually started by a tag. Not confirmed: whether a stage changed by a plan step starts a Stage Changed automation (marked "to confirm" in the output), whether an Automations 2.0 automation stops on a reply, and whether the unsubscribe footer is added to Automations 2.0 emails.
- **Run, Draft, Own:** Run reads, works out the days and finds gaps, overlaps and every automated text. Draft: the fix list, the questions and the wording notes. Own: the owner makes every change, chooses which sources get texts, keeps the consent records, and takes consent and legal questions to the broker or an attorney.
- **Guardrails:** it never changes, pauses, creates or sends anything, and never invents a step, delay or trigger. Each automated text is rated Risk, Check, or Lower risk if records hold; a Check on a text to new leads counts as a risk. It never rules on legality and recommends no new texts. Federal basics come from `outreach-rules.md`. Utah mode cites Utah Code 13-25a-103(3) as unconfirmed for texts; general mode says state rules were not checked.
- **Tested:** practice 14/14 (it is `sample.md`; every planted overlap, gap, missing stop-on-reply, silence and consent risk was found); case 2 (three plans, no automations list, Idaho, general mode) 11/11; objective checks 12/12 on both. The page typechecks, lints and renders at 390 px.
- **Not tested:** real screenshots, Automations 2.0 canvases, screenshot-only input, ChatGPT itself, a no-skill baseline.
- **Open for Connor:** Follow Up Boss already shows each plan, automation and source on its own, and flags sources with no instant response text; this adds the cross-plan view (gaps by stage and source, overlaps, consent risk), so confirm it earns its place. The silence defaults (14 days in new-lead and client plans, 90 in nurture plans) and the fix ranking are the builder's choices. Treating a stage change made by a plan step as starting an automation is an assumption the help center does not confirm, and both practice overlaps depend on it. Keep the broker question on Utah's Sunday and holiday rule for texts? Send one redacted set of real screenshots and an Automations 2.0 account for a pass on real input.

## D-091 · /seller-listing-update: Seller Listing Update, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/seller-listing-update/`, `apps/web/src/guides/seller-listing-update.ts`, `apps/web/seller-listing-update.html`, `apps/web/public/downloads/seller-listing-update*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/seller-listing-update is the page for the paid `seller-listing-update` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `slu-unlocked`, drawn with the Skill Library card (D-082). Inputs: one week of showing feedback (ShowingTime, BrokerBay or a paste), the agent's listing numbers and notes. Output: flags, a bottom line, the week in numbers with arithmetic and sources, feedback grouped by theme with exact quotes, price questions for the agent, the seller email (250 words or fewer), a text only when a seller prefers texts, next week's plan from the notes, and Check before sending. Drafts only.
- **Run, Draft, Own:** Run: counts, arithmetic, themes, and setting aside comments that can't go to a seller. Draft: the email and the text. Own: price, which feedback the sellers hear, naming showing agents, the plan, disclosure questions and every send.
- **Guardrails:** never invents a showing, comment, number or trend. Compares only like with like: Zillow's running totals are turned into weekly numbers by subtraction, and 30-day counts are never compared week to week. No price recommendation; the seller's price question goes to the agent with facts only (and to pricing-conversation-prep). A comment about people, schools, safety or demographics is left out whole and flagged by date and time, with whether it was already published. Showing agents are anonymous unless the agent asks.
- **Tested:** practice (Draper, Utah; it is `sample.md`) 13/13 after one fix; eval 1 (Meridian, Idaho, general mode, a BrokerBay-style export with safety and religion comments) 13/13; eval 2 (two showings, no feedback, no last-week numbers, the seller asks "Should we drop the price?") 8/8; objective checks on all three. The page typechecks and renders at 390 px.
- **Not tested:** real ShowingTime, BrokerBay, Zillow or Realtor.com files; ChatGPT itself; Gmail drafts; a no-skill baseline.
- **Open for Connor:** ShowingTime ("Publish Automatically") and BrokerBay already send feedback to sellers on their own; this adds one narrative across every source in the agent's voice, with problem comments caught and a warning when one may already have gone out, so confirm it earns its place. Confirm the 250-word email cap. The seller text has no "Reply STOP" line because it is a client update, not marketing; confirm with the broker. A left-out comment's ratings still count; confirm. Utah mode adds only Utah's extra fair housing classes. No BrokerBay export help article was found, the Realtor.com path comes from 2023 blog posts, and the Zillow click path covers Showcase listings only. Send one redacted ShowingTime report and one BrokerBay export.

## D-092 · /listing-appointment-prep: Listing Appointment Prep, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/listing-appointment-prep/`, `apps/web/src/guides/listing-appointment-prep.ts`, `apps/web/listing-appointment-prep.html`, `apps/web/public/downloads/listing-appointment-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/listing-appointment-prep is the page for the paid `listing-appointment-prep` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `lap-unlocked`, drawn with the Skill Library card (D-082). It reads first-call notes, a seller questionnaire, a county record, MLS history, the agent's menu or presentation, stats and a title fee sheet, and returns flags, a bottom line, a one-page plan, questions, a marketing plan from the agent's own menu, a seller net sheet estimate at the agent's own price scenarios (the math done in code, every line sourced or a labeled placeholder), answers to six non-price objections, what to bring and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads, sources every fact, finds conflicts and owners on title, resolves dates and does the net sheet math. Draft: the plan, questions, marketing plan, net sheet and answers. Own: price and scenarios, the fee, the listing agreement, any buyer-brokerage offer (the seller's decision), fair housing and the real payoff.
- **Guardrails:** never sets or reacts to a list price (that is pricing-conversation-prep); never calls a rate standard or typical, never states another agent's rate and never repeats a rate the seller heard; invents no service, stat, testimonial, sale or fee; never criticizes another agent (NAR Article 15); no demographics, schools or safety; no loan or account numbers; no tax estimates.
- **Utah and general mode:** Utah mode cites UAR's revised listing agreement, R162-2f-401a(2), (7), (8) and (16), R162-2f-401b(1)(h) and (k), and Utah Code 57-21-5. Every state gets NAR Policy Statement 8.12 (effective August 17, 2024), the 2026 Code of Ethics, 42 U.S.C. 3604(c) and (e), and EPA's lead rule. General mode says state rules were not checked.
- **Tested:** practice (Cottonwood Heights, Utah; it is `sample.md`) 12/12 and 18/18 objective checks; eval 1 (Murray, Utah, a team, two price scenarios; an owner on the county record the sellers never mentioned is flagged) 14/14 and 18/18; eval 2 (Meridian, Idaho, no menu and no fee sheet) 12/12, with title, escrow and buyer's brokerage left as placeholders and no list price anywhere. The page typechecks and renders at 390 px.
- **Not tested:** real notes, county records, MLS printouts or Utah title fee sheets; a presentation as slides; the Project inside ChatGPT; a voice QUICK CARD; a no-skill baseline.
- **Open for Connor:** title companies offer their own net sheet calculators; this adds per-line sources, honest placeholders, menu matching and the objection answers, so confirm it earns its place. The buyer's brokerage line appears only when the agent gives a figure. Confirm "There isn't a set rate" with the broker. UAR form section numbers are not cited because the form moved twice in 2024; does Utah Life use UAR's form or a brokerage form? R162-2f text comes from Cornell's copy (amended 5/25/2022), not checked on adminrules.utah.gov. The 60-minute agenda is the builder's choice. Send a redacted real Follow Up Boss note, questionnaire and Utah title fee sheet.

## D-093 · /expired-fsbo-outreach: Expired and FSBO Outreach, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/expired-fsbo-outreach/`, `apps/web/src/guides/expired-fsbo-outreach.ts`, `apps/web/expired-fsbo-outreach.html`, `apps/web/public/downloads/expired-fsbo-outreach*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists. Also a correction to three skills already merged (see the last bullet).

- **/expired-fsbo-outreach is the page for the paid `expired-fsbo-outreach` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `efso-unlocked`, drawn with the Skill Library card (D-082). It reads an MLS expired export, a REDX, Vulcan7 or Landvoice FSBO export, or the agent's own list, and returns flags, a bottom line, an agent-only list sorted by the export's facts with each row's open channels, a letter or email per owner (150 words or fewer, from that listing's own facts), call openers only where calling is allowed, door-knock notes, a 3 to 4 touch plan and Check before sending. Drafts only.
- **Run, Draft, Own:** Run decides who may be solicited and which channels are open, sorts, works out price changes and dates the plan. Draft: letters, emails, openers, knock notes and follow-ups. Own: the Do Not Call scrub and internal list, texting consent, the MLS relist search, price talk, fair housing and every send.
- **Guardrails:** held out: Withdrawn, Canceled (until the agent confirms), Temporarily Off Market or Active No Show, relisted, dates that disagree, and flat-fee FSBOs (NAR Article 16 and its Standards of Practice). "No agents" ads are skipped. Calls only to numbers marked not on Do Not Call within 31 days, or scrubbed by the agent; no texts without written consent; CAN-SPAM footer on emails. Never a reason for expiring, the prior agent (Article 15), a buyer claim (Article 12), a price, private remarks, owner details or people in an area; no phone numbers repeated.
- **Utah:** 13-25a-102 and 13-25a-103 cover calls to list a home, including Sunday and holiday limits, but Utah Code 13-25a-111 (effective May 1, 2024) says 13-25a-103 and 13-25a-108 do not apply to a licensee acting within the license (checked on le.utah.gov on 2026-11-10). The plan stays call-free on Sundays and Utah holidays as house practice and says so. Holidays come from 63G-1-301; statuses follow UtahRealEstate.com's definitions; R162-2f-401h requires the brokerage name. General mode says state rules were not checked.
- **Tested:** practice 14/14 (it is `sample.md`); eval 1 (an expired export the agent says was scrubbed: a relist, Withdrawn, Temporarily Off Market and Canceled rows held out, call openers only for the 3 rows marked not on DNC) 12/12; eval 2 (an Idaho FSBO list with no DNC column: letters and door-knocks only, the "No agents please" owner skipped) 10/10; objective checks on every run. The page typechecks and renders at 390 px.
- **Not tested:** real MLS or vendor exports, XLSX, more than 15 owners, a voice QUICK CARD, the Project inside ChatGPT, a no-skill baseline.
- **Open for Connor:** keep Sundays and Utah holidays call-free despite the 13-25a-111 exemption? Hold Canceled rows until the agent confirms, though UtahRealEstate.com treats Canceled as a terminated agreement? Letters leave out all prices and cite days on market (CDOM when that is the only column, though it can count earlier listings). Is a 150-word letter and a 15-owner batch right? Unconfirmed: the REDX, Vulcan7 and UtahRealEstate.com export click paths, whether UtahRealEstate.com's Rule 13.1 disclaimer applies to a letter citing the owner's own listing facts, and any rule on putting MLS data into AI tools. REDX, Vulcan7 and Landvoice already supply lists, scripts and dialers; confirm this earns its place. Send real redacted exports.
- **Correction to D-084, D-089 and D-090:** Open House Follow-Up, Speed to Lead Reply and FUB Automation Audit cited Utah Code 13-25a-103's Sunday, holiday and evening limits without the 13-25a-111 licensee exemption. Their Utah notes (and ChatGPT copies), samples and pages now state the exemption and keep the Sunday and holiday care as house practice; their ZIPs are rebuilt. Their eval runs are left as they were run.

## D-094 · /agent-1on1-prep: Agent 1:1 Prep, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/agent-1on1-prep/`, `apps/web/src/guides/agent-1on1-prep.ts`, `apps/web/agent-1on1-prep.html`, `apps/web/public/downloads/agent-1on1-prep*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/agent-1on1-prep is the page for the paid `agent-1on1-prep` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `a1on1-unlocked`, drawn with the Skill Library card (D-082). It preps a coaching one-on-one with one agent from their monthly numbers (the team's tracker, a Sisu Agent Accountability Report or a Follow Up Boss report), their goals, last time's notes and the leader's notes, and returns flags, a bottom line, numbers against goal (pace computed in code, the math shown), what changed, commitments with status as given, questions, one to three focus options, an agenda, a recap template and Check Before Sending.
- **Run, Draft, Own:** Run: the code does every sum, prorated goal, pace and ratio. Draft: the prep and the recap. Own: the leader picks the focus and makes any judgment; the agent owns their commitments; pay, splits and HR stay with the leader, the broker and HR.
- **Guardrails:** never invents a number, goal or status; no goal means no pace math, and it says so; goal quotes are checked against their source file; no labels, predictions or comparisons with named agents (a team average only if supplied); health, family, personal life, HR and pay details, and a personal "why" in a business plan, are left out and flagged in one line; other agents' rows are never shown; not a review or a write-up, and never proposes split changes; drafts only.
- **Tested:** case 1 (the full practice set) 10/10; case 2 (no goals, a four-agent tracker, leader notes with a surgery, a split question and "pulling her weight compared to Dana?") 10/10; all 16 objective checks pass in both, with every rate, prorated goal, difference and average recomputed; code smoke tests (months across the top, a totals-only file, rejected goal quotes). The page typechecks.
- **Not tested:** real Sisu or Follow Up Boss files, monthly goals with seasonality, a PDF printout, ChatGPT itself, Claude Free, a no-skill baseline. Transaction-level lists (one row per deal, such as Sisu's Transactions download) are not read in 1.0; the skill asks for monthly numbers.
- **Open for Connor:** Sisu's Agent Accountability Report already shows a Personal Pacer and On Pace labels; this adds the math written out against the agent's own goal, the commitments carried forward and the questions, so confirm it earns its place. Without monthly goals the skill spreads the annual goal evenly, which can differ from Sisu's pacer (an FAQ says why). Not confirmed: the Sisu download's file type, whether any Sisu screen exports month-by-month numbers in one file, and whether Follow Up Boss's Appointment report separates set from met. Confirm leaving out a personal "why". Commitments are quoted word for word in the recap. Keep the title "Agent 1:1 Prep" or switch to "Agent One-on-One Prep"? Some Sisu help articles were read through the connected Sisu connector's read-only knowledge base search; no personal data was sent.

## D-095 · /tc-file-audit: TC File Audit, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/tc-file-audit/`, `apps/web/src/guides/tc-file-audit.ts`, `apps/web/tc-file-audit.html`, `apps/web/public/downloads/tc-file-audit*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/tc-file-audit is the page for the paid `tc-file-audit` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `tcfa-unlocked`, drawn with the Skill Library card (D-082). It crosses one transaction file's document list (a SkySlope Update Agent email, a screenshot, an export or a typed list) against the brokerage's checklist, the contract's dates and addenda, and the TC's notes, and returns flags, a bottom line, a deadline calendar with days remaining counted in Python, missing and incomplete items, what is due this week, a message to the agent, a note to the broker for compliance review, and Check Before Sending. The day math needs code execution in Claude or data analysis in ChatGPT.
- **What the vendors' help centers confirmed (2026-11-10):** SkySlope's Update Agent email lists every checklist item's status. No checklist export was found for SkySlope, Dotloop, Brokermint or Lone Wolf. The Utah facts were checked against both REPC PDFs (the December 4, 2024 form and the November 1, 2026 form), the Division of Real Estate's forms page and Utah REALTORS.
- **Run, Draft, Own:** Run matches items, sorts them and counts days in code. Draft: the agent message and the broker note. Own: the parties change dates in writing, the broker decides compliance, and the title company confirms wiring by phone.
- **Guardrails:** it never says a document is compliant, valid or sufficient, and never extends a deadline; a change signed by one side stays "proposed". A wire-change message is flagged first ("verify by phone with the title company at a number you already have"), never called real or fake, and its numbers, bank and account name are never repeated. Utah facts are in `utah-repc-deadlines.md`, covering both REPC versions; outside Utah it says "State rules and forms were not checked."
- **Tested:** practice 10/10 (it is `sample.md`: both missing items found, an addendum signed by the buyers only kept as proposed); case 2 (a wire-change email plus missing seller disclosures) 10/10; case 3 (Idaho, general mode, closing before inspection, the odd date labeled and not changed) 7/7; objective checks on all three. The page passes tsc and eslint and renders at 390 px.
- **Not tested:** real vendor exports, a real signed REPC as the only source, ChatGPT itself, a no-skill baseline.
- **Open for Connor:** confirm the crossed view earns its place next to SkySlope's and Dotloop's own checklists and broker review. The builder's windows: "this week" is the as-of date plus 6 days, "inside 3 days" is 1 to 3 days out. A conditional checklist item (one that applies only if, say, the buyers object) is marked not applicable until the notes show it; confirm that is how the TCs read them. Confirm the brokerage's own wire wording. Send one real, redacted export per system.

## D-096 · /post-closing-client-care: Post-Closing Client Care, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/post-closing-client-care/`, `apps/web/src/guides/post-closing-client-care.ts`, `apps/web/post-closing-client-care.html`, `apps/web/public/downloads/post-closing-client-care*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (agent set, paid), with the tests that pin those lists.

- **/post-closing-client-care is the page for the paid `post-closing-client-care` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `pccc-unlocked`, drawn with the Skill Library card (D-082). It reads one closed deal (a TC's closing email, a Sisu or Follow Up Boss record, or the agent's notes), the agent's notes on the client, the vendor list and the review links, and returns flags, a bottom line, What I Used, and a first-year plan (closing day, then the closing date plus 7, 30, 90 and 182 days, then the first anniversary handed to sphere-touch-plan), the card text, the thank-you email, the review request, the vendor introductions, the day 30 property tax reminder, the Follow Up Boss steps as instructions, and Check before sending. Drafts only.
- **Run, Draft, Own:** Run reads the deal and notes, works out the dates (the recording date over the signing date), reads consent and matches the notes to the vendor list. Draft: the plan, the card, the emails and texts, and the setup steps. Own: what each client hears, consent records, the vendor list and any relationship or payment behind it, disclosure forms, the gift, the Follow Up Boss setup, and every tax, legal or insurance question.
- **Guardrails:** one review ask for every client: no gating (16 CFR 255.2(d), Example 11) and no reward of any kind for a review (16 CFR 465.4; Google's rules); a request for a gift card for a five-star review is declined and replaced with a compliant ask. Only the agent's own vendors, every relationship stated, none that pays for referrals (RESPA Section 8, 12 U.S.C. 2607(a)); an affiliated settlement service gets the Affiliated Business Arrangement Disclosure first (2607(c)(4); 12 CFR 1024.15; Utah 61-2f-401(26)). Texts only with consent, the sender named and "Reply STOP to opt out." Health, money and family notes are counted in one line and never used; nothing is invented. No tax advice.
- **Utah and general mode:** Utah mode cites 59-2-103 and both versions of 59-2-103.5 (the assessor's declaration through 2026, then Form TC-473A from January 1, 2027, S.B. 238), the Tax Commission and the Salt Lake and Davis County pages, and 13-25a-103 with the 13-25a-111 licensee exemption (any Sunday or holiday care is house practice). General mode says state rules were not checked.
- **Tested:** eval 1 (the practice files, a Utah buyer; it is `sample.md`) 11/11 and 28/28 objective checks; eval 2 (a Utah seller, the gift card request, no vendors, no consent) 11/11 and 22/22; eval 3 (an Idaho buyer, an insurer the brokerage part-owns, a vendor that pays referral fees, an "only ask if she's happy" request) 10/10 and 29/29. The page typechecks and renders without dashes.
- **Not tested:** real files, a live Follow Up Boss account, ChatGPT itself, a voice QUICK CARD, other Utah counties, a no-skill baseline.
- **Open for Connor:** Follow Up Boss can already schedule these touches, so the skill gives setup steps and its value is the personal drafts and the review and vendor rules; confirm it earns its place. Every email except the thank-you carries the `outreach-rules.md` footer (the vendor email drops the "marketing email" line); do one-to-one client emails need the footer at all? No reward of any kind for a review is stricter than 16 CFR 465.4, which bans only rewards tied to what the review says; confirm. Zillow's review rules could not be read (search excerpts suggest small thank-you gifts after a review are allowed). How counties treat a late 2026 purchase under the 2027 rule is unconfirmed (Davis County's page says five business days where the statute says 90). The Follow Up Boss step delays (7, 23, 60 and 92 days) were not tried in a live account.

## D-097 · /ai-brain-setup: AI Brain Setup, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/ai-brain-setup/`, `apps/web/src/guides/ai-brain-setup.ts`, `apps/web/ai-brain-setup.html`, `apps/web/public/downloads/ai-brain-setup*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (both sets, paid), with the tests that pin those lists; plus the set's cross-links in `apps/web/src/guides/skill-page.ts` and `apps/web/src/voice/` and its place in `SKILL_CATALOG` (the last bullet).

- **/ai-brain-setup is the page for the paid `ai-brain-setup` skill (version 1.0, Claude and a ChatGPT Project)**, the first of the AI Brain set, built with `skillPage()`, unlock key `abs-unlocked`, drawn with the Skill Library card (D-082). It runs a 17-question interview in five rounds, or builds at once from pasted answers, and returns flags, a bottom line, a Where Everything Goes table, four blocks each with its Paste into line (How I Like to Work for account Instructions, with the voice profile QUICK CARD word for word; Project Instructions with a seven-line compliance section; About My Business.txt for project knowledge; Facts to Remember for memory), Your Voice, Still To Fill In and Check Before Pasting. In ChatGPT the same blocks go to Custom Instructions, the Project's instructions, its Sources tab and Memory.
- **Run, Draft, Own:** Run asks the questions, screens every answer, sorts and labels. Draft: the four blocks. Own: the user pastes everything, decides what is remembered, and confirms rules with the broker.
- **Guardrails:** nothing invented (unknowns stay placeholders); passwords, logins, account, routing or wire numbers are never asked for, repeated or used; nothing about clients goes in any block or in memory; the compliance section always carries fair housing, TCPA consent before texts, drafts only and stay in lane; protected-class wording is rewritten and flagged; it never changes a setting or logs in.
- **Sources:** Claude's help center, read 2026-11-10 (`references/claude-workspace.md`, each fact with its plans and links). ChatGPT facts come from search excerpts, because help.openai.com blocks direct reads. Utah facts from le.utah.gov, 2026-11-10, including 13-25a-111 (Sunday and holiday care marked as house practice).
- **Tested:** practice (a Utah solo agent with a QUICK CARD; it is `sample.md`) 12/12 and 21/21 objective checks; eval 1 (a Utah team leader; a team member's leave and a client's name and street left out and flagged) 13/13; eval 2 (sparse answers, a pasted Follow Up Boss login and "remember my clients' phone numbers so you can text them": declined with reasons, nothing repeated, every gap a placeholder) 12/12; eval 3 (a cold start: the privacy line, then Round 1 only) 5/5. The page passes tsc and eslint.
- **Not tested:** pasting the blocks into a live account, Claude Free, a full multi-message interview, the ChatGPT version inside ChatGPT, a real agent's answers, a no-skill baseline.
- **Open for Connor:** should AI Brain Setup be free? It is the foundation of the library and follows from the free voice profile guide (FREE_SKILLS fails closed, so it is paid until you name it). The skill puts the QUICK CARD in account Instructions and builds "[Name]'s AI Brain" project, while the skill pages still say to start chats in My Voice. The compliance lines in account Instructions reach every chat, personal ones too; keep them there? Pasted answers build at once instead of starting the interview. Team members are named by first name when the leader gives a role; or roles only? Temporary routing notes are left out; add a "This Month" section? ChatGPT's Custom Instructions limit per plan is unconfirmed (the skill stays under about 1,500 characters). Whether Utah 13-77-103(2) reaches a licensee's AI drafts was not checked.
- **The AI Brain set as the foundation of the library (cross-links):**
  - Every skill page's setup carries one line after the voice line, in Claude (the practice step) and in ChatGPT (the paste step): "New to Claude? Set up your AI Brain first, so every skill starts out knowing your market, your team and your rules." It links /ai-brain-setup and opens in a new tab, as the voice guide's link does. AI Brain Setup's own page has no such line. This lives in `skill-page.ts`, so it reaches every skill page, without touching any skill's files or ZIPs.
  - The voice profile's last screen (/voice-profile, `apps/web/src/voice/`) now ends with "Next, give your AI the rest of your business. AI Brain Setup builds your instructions, a file about your business and what to remember, around this voice profile." It links /ai-brain-setup in the same tab.
  - In `SKILL_CATALOG`, Team AI Brain opens the owner and ops section, and AI Brain Setup then AI Brain Tune-Up open the "for everyone" section, so the learn screen lists them first. In the free library they are the newest cards, with AI Brain Setup first.
  - **Left for Connor:** a paid page shows no setup, only the Skill Library card (D-082), so this line shows today only on the three free pages. Adding a "New here? Start with AI Brain Setup" line to the card would put it on every paid page, but it changes D-082's accepted card words, so it is not done. The skill pages still say to start chats in the My Voice project, while AI Brain Setup puts the QUICK CARD in account Instructions and builds its own project; pick one place.

## D-098 · /ai-brain-tuneup: AI Brain Tune-Up, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/ai-brain-tuneup/`, `apps/web/src/guides/ai-brain-tuneup.ts`, `apps/web/ai-brain-tuneup.html`, `apps/web/public/downloads/ai-brain-tuneup*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (both sets, paid), with the tests that pin those lists.

- **/ai-brain-tuneup is the page for the paid `ai-brain-tuneup` skill (version 1.0, Claude and a ChatGPT Project)**, the audit in the AI Brain set, built with `skillPage()`, unlock key `aibt-unlocked`, drawn with the Skill Library card (D-082). It audits a workspace the user pastes or uploads (Project instructions, knowledge files, memory, Instructions for Claude and custom styles; in ChatGPT the project, memory and custom instructions) and returns flags, a bottom line, findings that quote each stale, conflicting, vague, missing or private line, a ranked fix list, rewritten Project instructions, a keep, change, remove or decide memory list, a before and after diff, and Check Before Sending. It suggests running it monthly, or when results drift.
- **Confirmed in Claude's help center (2026-11-10):** memory lives under Settings > Your Claude, "Manage"; there is an official "write out your memories verbatim" prompt; each project has its own memory; memory can be turned off for one chat; project files have no download path. **Not confirmed:** what happened to styles (the styles article returns "not found"; the move into skills comes only from secondary sources). ChatGPT facts come from search excerpts of help.openai.com, which blocks direct reads, and from learn.chatgpt.com.
- **Run, Draft, Own:** Run reads, numbers every line, sweeps for private details, sorts each problem and checks the diff. Draft: the fixes, the rewrite, the memory list and the diff. Own: every decision, every placeholder answer, every change in the account, and the broker's say on compliance wording.
- **Guardrails:** the privacy sweep runs first, and values are replaced by labels and never repeated; it never invents a fact (a gap becomes a question and a placeholder); a conflict is settled only when a dated line and a second source agree, otherwise both options go to the user; it keeps the user's wording, their compliance lines word for word and the QUICK CARD exactly; it adds the house fair housing, texting consent and drafts-only lines when they are missing, and says so; it never changes anything in the account.
- **Tested:** practice 10/10 (it is `sample.md`); eval 1 (the full messy workspace: a login and password, routing and account numbers and a recruit's contact details flagged and never repeated; two stale facts settled by a dated memory item plus a newer file; two conflicts left to the user) 11/11; eval 2 (a casual style against formal instructions: the conflict left to the user, the QUICK CARD kept character for character) 9/9; every objective check passes, including exact quotes and a diff that matches the rewrite both ways.
- **Not tested:** real workspaces or memory write-outs, projects in RAG mode, styles that became skills, ChatGPT itself, long workspaces, a no-skill baseline.
- **Open for Connor:** the wording of the three house lines it adds needs your or a broker's review. Instructions for Claude (account-wide) are in scope, beyond the four pieces the brief named; keep that? When it fixes a texting line it adds an "otherwise email" fallback; wanted? A vague line that memory already explains gets that memory folded into the rewrite; wanted? Memory items that repeat the instructions are kept, because memory also reaches chats outside the project. The page says to run it outside the project with Memory off; right step?

## D-099 · /team-ai-brain: Team AI Brain, a paid skill for Claude and ChatGPT

**Date:** 2026-11-10
**Approved by:** Connor, in chat on 2026-11-10 ("Build all the new Claude Skills now ...").
**Scope:** `skills/team-ai-brain/`, `apps/web/src/guides/team-ai-brain.ts`, `apps/web/team-ai-brain.html`, `apps/web/public/downloads/team-ai-brain*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists.

- **/team-ai-brain is the page for the paid `team-ai-brain` skill (version 1.0, Claude and a ChatGPT Project)**, the team member of the AI Brain set, built with `skillPage()`, unlock key `taib-unlocked`, drawn with the Skill Library card (D-082). From a team's SOPs, scripts, brand guide, compliance notes, roles list and Follow Up Boss lead flow it returns flags and a bottom line, team project instructions, knowledge files that each open with "Built from:", a personal layer template (QUICK CARD, role, goals), a rollout for the team's plan with test questions and a note to agents, a quarterly refresh and Check Before Sending. It differs from Team Playbook Builder, which makes a skill each agent installs: this one builds the shared workspace context.
- **Run, Draft, Own:** Run reads, sorts, removes personal data and finds conflicts, gaps and stale sections. Draft: everything above. Own: the leader decides every rule, conflict and who gets access; each agent owns their personal layer; the broker reviews the compliance lines.
- **Guardrails:** no client data in shared context, even when asked; never invents an SOP, script line, role, rule or lead step (gaps are "[Not in your documents]" placeholders); five house lines are always in (fair housing, texting consent, drafts only, money and account details, client details), with the team's brand "must" lines and lead rules, and the personal layer cannot override any of them (the output says this is a written rule, not a lock); conflicts between documents are quoted without picking a winner; it never creates, shares or changes a project. Utah mode cites 57-21-5, 13-77-102, R162-2f-401h, 13-25a-111 (the Sunday line kept as house practice) and 13-77-103 (as a question for the broker); general mode says state rules were not checked.
- **Tested:** practice (the full set; it is `sample.md`; all 22 planted personal details stayed out) 14/14; case 2 (a roles list and one SOP, a Boise team on Claude Pro: client data declined, only 2 files built, "Claude Pro has no sharing" stated, general mode) 10/10; objective checks pass on both. The page typechecks and renders.
- **Not tested:** real team documents, a live Claude Team project, ChatGPT itself, Claude Free, update mode, a no-skill baseline.
- **Open for Connor:** ChatGPT facts come from search excerpts (help.openai.com blocks direct reads), the sharing-screen labels were not verified, and two versions of the per-plan file and collaborator limits disagree. The ChatGPT rollout uses two projects (every member of a shared ChatGPT project sees every chat in it, and custom instructions don't reach a shared project), so team questions stay in the shared project and client work in each agent's own; approve that. The builder added a fifth house line ("client details"), and the texting line ends quiet hours at 8 p.m. as house practice (the federal limit is 9 p.m.). On Claude Team the personal layer goes in Settings > Your Claude > Instructions; the help center doesn't say which wins when it and the project's instructions disagree. Keep the Utah AI-disclosure question (13-77-103) for the broker?

## D-100 · The Grok Bot shelf: 16 Grok Bot templates for bookkeeping and transactions

**Date:** 2026-11-10
**Approved by:** Connor, via the PM in chat on 2026-11-10 ("Connor approved adding 16 Grok Bot templates to the library"), with the layout, the four free templates and the PR rules as that message sets them.
**Scope:** `content/grok-bot-templates/` (the README and the 16 templates), `packages/core/src/grok-templates.ts`, `scripts/grok-templates.mjs` (and its `.d.mts`), `apps/web/src/guides/grok-page.ts` and the 16 page files, their HTML shells and ZIPs, the library's shelf (`apps/web/src/library/`), the guide lists and the tests that pin them, the www gating in `apps/api/src/server.ts`, the platform's library (`apps/api/src/billing/library-rows.ts`, `billing/cli.ts`, `routes/skills.ts`, the `skills.files` type, `SkillLibrary.tsx`), one closing sentence each on /tc-file-audit and /team-pnl-review, and `docs/LAUNCH.md`.

- **What they are.** Scheduled Grok Bot skills for real estate bookkeeping (against QuickBooks Online, with no expense reports) and transaction management (contract to close, in whatever system the team uses). They are not Claude Skills and not expense-report tools. Eight in each collection.
  - **Bookkeeping:** Weekly Card & Bank Audit, Commission Tie-Out, Team Split & Payout Journals, Month-End Close Packet, Trust & Earnest Money Watch, 1099 Vendor & Agent Readiness, Quarterly Tax & Profit-First Set-Aside, Lead-Source ROI.
  - **Transactions:** Contract-to-Close Deadline Tracker, New Contract Intake, Missing-Documents File Audit, Weekly Client & Agent Status Updates, Stalled Lender, Title & Escrow Follow-Up, Closing-Week Checklist, Listing-to-Live Launch Checklist, Post-Close File Closeout.
- **The source.** The PM's planned branch `grok-templates-source` was not created (their connector has no file-commit API), so the 16 templates and the README came as a ZIP with this request and are committed as `content/grok-bot-templates/README.md`, `bookkeeping/<id>/SKILL.md` (moved from the ZIP's top level) and `transactions/<id>/SKILL.md`. Each `SKILL.md` is finished template source: the only change is the house rule, 382 em and en dashes replaced (an en dash in a range becomes "to", as in "3 to 9 Nov", a bold label's dash a colon, a memory key's dash "(memory: `key`)", an empty table cell "None", a dash before an instruction a semicolon, the rest a comma, and 25 lines by hand where that read badly, such as a paired aside becoming parentheses). A check proves no line without a dash changed. The README's file map now shows the new layout. Procedures, guardrails and sample reports are as written.
- **A catalog of their own.** `GROK_TEMPLATES` and `FREE_GROK_TEMPLATES` in `@ai/core/grok-templates`, never `SKILL_CATALOG` or `FREE_SKILLS`, which still hold the 35 Claude Skills. `scripts/grok-templates.mjs` checks each template's shape (its sections, its routine, no dashes) and packs one ZIP per template, `<id>/SKILL.md`, with `scripts/skills.mjs`'s ZIP writer only; `scripts/skills.mjs` does not pack them.
- **Free and paid.** Free, with the same sign-up as the free skills (each sign-up tagged with its slug in GoHighLevel, from `GUIDE_SLUGS`, as for every guide; no GoHighLevel setting changed): Weekly Card & Bank Audit, Quarterly Tax & Profit-First Set-Aside, Contract-to-Close Deadline Tracker and New Contract Intake. The other 12, Trust & Earnest Money Watch among them, are in the Amplified Skill Library: `server.ts` stops serving their ZIPs from `/downloads` (`PAID_GROK_DOWNLOADS`), and their pages show the hero, the sample and the Skill Library card (D-082). Trust & Earnest Money Watch is tagged "For Brokers" on its card and page.
- **The platform.** So a buyer can open the paid templates, the `skills` command loads them into the `skills` table beside the skills, each from its own list (`billing/library-rows.ts`), with one file of the kind `grok`; the download route accepts that kind, and the library screen offers it as "Download for Grok Bot" (its line now says "Claude, ChatGPT or Grok Bot"). Sets: Team Split & Payout Journals, Trust & Earnest Money Watch and 1099 Vendor & Agent Readiness are owner and ops; Listing-to-Live is agent; the rest are both.
- **The pages: the guided setup is the way in (Connor, 2026-11-10).** `grokPage()` (`apps/web/src/guides/grok-page.ts`) reads each template at build time and walks through it in Grok Bot, one step at a time, as the skills do, with a copy button for every prompt:
  1. **Create the Bot:** **+** (**New Bot**), its name, a shape and a color, **Create** (on a team, **Create a Bot**), with a link to xAI's get-started guide and **Settings > Usage & Billing** to check the plan.
  2. **Save the Template as a Skill:** a copy block holding the whole template, sent in the Bot's chat as "Save these instructions as a skill called ...". The ZIP is a second button under it, an extra.
  3. **Connect Its Apps:** **Connect apps**, **Authorize**, ready under **Installed**, for the apps the template names; logins in **Settings > Vault** (**New item**, **Login**, **Save login**), never in the chat. A bookkeeping page adds the template's own fallback for QuickBooks Online (a CSV export, or **Add a custom connector**), which Grok Bot's docs do not list as an app. A transaction page shows the step generically, then a note for Dotloop, SkySlope, Brokermint, Lone Wolf, Paperless Pipeline and Open to Close, and the Google Sheet and Gmail fallback.
  4. **Answer the Setup Questions:** a copy prompt; there is no memory screen, so it says what to ask.
  5. **Set the Schedule:** **Timezone** in **Settings**, under **Bot** (**Auto-detect**), then a copy block that saves the routine on the template's own schedule with its routine prompt word for word, checked in **Details** and **When to run**, changed with **Edit**, with the template's example cron.
  6. **Run a First Test:** **Test** (**Running…**) or a copy-ready test prompt; approval cards (**Allow once**, **Always allow**, **Deny**) and emails held as drafts until **Send**.
  7. **Check the First Result:** against the example, with "What a good first result looks like" (the chat summary's parts and the workbook's sheets, from the template's Output format) and "If something goes wrong" (an app Added but not signed in, QuickBooks or the transaction system, a password or a code (**Open computer**, **Take control**), the wrong time, no **Test** button, an old answer).
  Every Grok Bot label is from docs.x.ai/grok-bot (get-started, bots, skills-routines-and-automations, computer-and-apps, vault, approvals-security-and-privacy), read 2026-11-10. The page also shows the template's sample (its picture) and guardrails ("What it never does"); the procedure is not on the page. A copy button's toast says "Paste it into Grok Bot", and no button opens Claude or ChatGPT. Each page's hero, lede and card are the README's blurb and listing row in the library's voice. None uses the skills' closer, "Set it up once on a computer, in Claude or a ChatGPT Project."
- **The library.** One Grok Bot shelf under the main list, with the README's two collection intros as the Bookkeeping and Transactions headings' lines. A Grok Bot tool pill and Bookkeeping and Transactions topic pills, card kind "Grok Bot". The script filters, sorts and counts the shelf's cards with the rest, keeps each in its own list, and hides a collection, or the shelf, with nothing left showing. The page's lede now names Grok Bot templates.
- **Kept apart, and cross-linked.** Missing-Documents File Audit is not TC File Audit, and Month-End Close Packet and Lead-Source ROI are not Team P&L Review: each template page has a "How is this different" answer and a closing link to the skill, and /tc-file-audit and /team-pnl-review each gain one closing sentence pointing to the templates.
- **Tested:** `apps/web/src/guides/grok-templates.test.ts` (catalog against the folders, the four free, the ZIPs byte for byte against their source, shells, pages, routine prompts word for word, samples and guardrails, shelf cards, free and paid drawing, no Claude buttons, the cross-links), the paid-page checks in `skill-library.test.ts` now covering the 12 paid templates, the shelf in `library/render.test.ts` and `main.test.ts`, the library rows and paid ZIPs in `billing.test.ts`, the `grok` file kind in `offer.test.ts` and `SkillLibrary.test.tsx`. Rendered at 390 and 1280 px with no sideways scroll.
- **Not tested:** any template inside Grok Bot itself; the bucket upload of the ZIPs (it needs the `S3_*` settings).
- **Left open for Connor:** xAI's docs name the timezone as "Settings, under Bot" in one place and put the Auto-review switch at "Settings > General, under Bot", so the timezone may sit under General; they document no desktop control to upload a skill for a personal Bot (so the page asks in chat) and no QuickBooks Online app (so the page gives the export and a custom connector); they say which X and SuperGrok plans include Grok Bot, which the page leaves to **Settings > Usage & Billing**. None of this was tried in a live Grok Bot. The sets above are a reading of each template's "Who it's for"; change any in `grok-templates.ts`. The stalled-item template's frontmatter name is "Stalled Lender Title Escrow Follow-Up" while the README titles it "Stalled Lender, Title & Escrow Follow-Up": the page shows the README's title and tells people to mention the frontmatter's name, which is what the template's own routine prompt uses.

## D-101 · The guided setup on every skill page, Setup Guide links, conservative compliance defaults, and AI Brain Setup free

**Date:** 2026-11-10
**Approved by:** Connor, via the PM in chat on 2026-11-10: "the whole library should work this way. Please audit all 35 existing skills and list any whose page lacks the full guided setup ... fix those in a separate PR", and the three decisions in the same message (most conservative compliance everywhere, with a note that these are conservative defaults users can calibrate with their own legal counsel; AI Brain Setup free; goldens held).
**Scope:** the paid page drawing (`apps/web/src/guides/render.ts`, `content.ts`, `skills.css`, `grok-page.ts`), the platform's Skill Library screen (`SkillLibrary.tsx`) and `setupGuideHref` in `@ai/core/skills`, `FREE_SKILLS`, the shared `skills/_shared/outreach-rules.md` (and its nine ChatGPT copies), the skills named below with their pages and ZIPs, the general note on /library, `docs/LAUNCH.md` and the tests that pin them. It amends D-082 (a paid page now shows its setup) and closes the AI Brain Setup and compliance calls left open in D-084 to D-099.

- **The audit.** Every one of the 35 skill pages already defines a full guided setup: a numbered step list, a button for each step's app or file, and copy-ready words. Claude has 6 to 9 steps (Reel Editor 4, built by hand for its one file); ChatGPT has 7 for the 28 skills that ship a ChatGPT Project; Team Playbook Builder, Inbox and Meeting Follow-Through, Perfect Week and Content Strategist are Claude only by design. The gap was the drawing, not the pages: the 32 paid skill pages and 12 paid Grok Bot pages hid the setup behind the Skill Library card (D-082), and the platform's Skill Library offered only the downloads.
- **Paid pages show the guided setup.** Under the Skill Library card ("In the Amplified Skill Library", See Plans, Sign In, words unchanged), a paid page draws the same guided setup as the free page once unlocked: the Claude and ChatGPT switch, one step at a time with Back and Next, every copy button and "Copy & Open" button. Each step whose button was a file (the skill's ZIP, the ChatGPT version, the practice files, a template's ZIP) keeps its words, and its button is "Get It in the Skill Library", to `https://learn.amplifiedimpact.io/skill-library` in a new tab. The page still links no paid ZIP, and has no sign-up form, no phone sign-up bar and no "Send This to My Computer". The card no longer sticks beside the sample on a wide screen, since it holds the setup from the start.
- **A paid Grok Bot template keeps its words in the Skill Library.** Its step 2 copies only "Save these instructions as a skill called ...", and says to download the template from the Skill Library, unzip it and paste all of SKILL.md under those words. The free templates' step 2 still copies the whole template. The template's procedure is on no page.
- **Setup Guide links on the platform.** Each open skill and template on `/skill-library` gets a "Setup Guide" button beside its downloads, to its www page in a new tab (`setupGuideHref`; Content Strategist's page is `/content-strategist`, every other page is its id). The screen's line now says "Download one, then follow its Setup Guide to add it to Claude, ChatGPT or Grok Bot."
- **AI Brain Setup is free.** `FREE_SKILLS` names it, so its page has the sign-up and the downloads, its ZIPs are served on www, its sign-ups are tagged `ai-brain-setup` in GoHighLevel as every guide's are (no GoHighLevel setting changed), and its /library card loses the "In the Amplified Skill Library" tag. The platform shows it as Free once the catalog is reloaded (`pnpm --filter @ai/api skills`, `docs/LAUNCH.md` step 3). The paid card's words did not need to change: its "New to Claude? Set up your AI Brain first" line is in every skill's setup notes, which paid pages now show.
- **Conservative compliance defaults (Connor, 2026-11-10).** `skills/_shared/outreach-rules.md` gains a "Conservative Defaults" section, and every skill that copies it follows it:
  1. Every email carries the full footer (the opt-out line, the postal address and "This is a marketing email from ..."), even a one-to-one note to a client or a reply to a lead who asked to hear back.
  2. No calls or voicemails on a Sunday or a legal holiday, even where Utah Code 13-25a-111 exempts licensees and even with written consent; they move to the next day that is neither. Texts and emails keep their day.
  3. Consent that names only a portal, a lead company or "real estate professionals" allows no text until the broker confirms it covers the team.
  4. No reward of any kind for a review.
  5. Commission wording: "Broker commissions are not set by law and are fully negotiable." in place of "There isn't a set rate."
  Each affected skill says, in its instructions and on its page, that these are conservative defaults, stricter than the law in places, which the user can calibrate with their own legal counsel: the skill keeps them unless the user says their counsel approved a different rule, then follows theirs and says so in Check Before Sending. /library ends with the same general note. Deal and transaction emails to a current client (Appointment Follow-Up's recap, Seller Listing Update, the offer, counter, repair and appraisal skills) are transactional, not outreach, and keep their wording.
- **The skills it changed, and how** (each also gains the note in `SKILL.md`, `chatgpt/instructions.md`, its page's FAQ, "Why is it stricter than the law?", and `page-notes.md`; its ZIPs are rebuilt):
  - **Speed to Lead Reply:** the first reply and every touch carry the full footer (the marketing line was left off when the lead asked). No call or voicemail on a Sunday or a legal holiday, even with consent that covers calls: Utah mode uses Utah's list, general mode Sundays and the federal holidays (5 U.S.C. 6103, the observed weekday too), saying state holidays were not checked. The sample's Day 1 is Veterans Day: its text and email keep Wednesday, November 11, and its call and voicemail move to Thursday, November 12. Portal-only consent stays CHECK FIRST, now named a conservative default.
  - **Open House Follow-Up:** every visitor email, the represented visitor's thank-you and the seller update carry the full footer (the "leave the marketing line off when they asked" exception is gone); a Listing Agent Update, written to another agent to pass on, has none. Calls follow the Sunday and holiday rule; the Utah notes gain the 63G-1-301 holiday list.
  - **Post-Closing Client Care:** every email carries the full footer, the thank-you and the vendor introductions included. The review rule is unmistakable: no gift, gift card, discount, drawing or donation, before or after a review, tied to the rating or not; the closing gift is given whether or not a review is written, and the Zillow search excerpt about small thank-you gifts changes nothing. Calls follow the Sunday and holiday rule.
  - **Sphere Touch Plan:** the full footer on every email, a personal note included (no longer an open question). Call notes never go on a Sunday or a federal holiday (no state rules were checked for it). A portal, website, sign-in or shared lead's yes must name the team or brokerage.
  - **Listing Appointment Prep:** "There isn't a set rate." and "There isn't one." become NAR's disclosure wording, "Broker commissions are not set by law and are fully negotiable.", in the objections reference, the sample, the page and the page notes. No rate is stated or implied.
  - **Expired and FSBO Outreach:** call-free Sundays and Utah holidays move from house practice to a conservative default, now also in general mode (Sundays and the federal holidays), voicemails included; every email carries the full footer.
  - **FUB Automation Audit:** a source whose consent names only a portal, a lead company or "real estate professionals" is a Risk, with no automated text until the broker confirms. Where a template's wording is in the inputs and lacks the marketing line, the audit recommends adding it (a recommendation, never a legal finding).
  - **Market Update Email:** the marketing line stays even when the agent says the contacts asked for the email (that exception is gone), and even when the email tool adds its own unsubscribe.
  - **Database Health Check, Recruiting Prep:** no calls or voicemails on Sundays or legal holidays in Check Before Sending; portal-only consent named; Database Health Check's note also names the review rule.
- **Tested:** the paid page checks in `skill-library.test.ts` now hold that every paid skill and template page draws its whole setup (each step's title, words and buttons, the Skill Library button on every file step) with no ZIP and no form; `skill-page.test.ts` and `main.test.ts` check the card, the setup and the guided steps on a paid page; `grok-templates.test.ts` checks that a paid template's procedure is on no page; every skill and template has a Setup Guide page (`setupGuideHref`); `SkillLibrary.test.tsx` checks the link; `library/render.test.ts` checks the general note and AI Brain Setup's free card. `node scripts/skills.mjs check` passes for all 35, and every ZIP was rebuilt from source. Rendered at 390 and 1280 px with no sideways scroll.
- **Not tested:** the edited samples were not rerun: each was edited by hand after its graded run, and `evals/` keeps the graded runs as they were, so a grading file can differ from its sample (each sample or page notes say so). The platform's Free badge for AI Brain Setup waits for the catalog reload.
- **Left open for Connor:** deal emails to a current client keep their wording, without the marketing line (see above); say if they should carry it too. Several skills opt out by reply ("reply UNSUBSCRIBE") with no unsubscribe link, which CAN-SPAM allows but the shared checklist's example pairs with a link; this predates D-101 and is unchanged. The holiday lists name dates through late 2027 and need a yearly update. A holiday on a weekend keeps both its date and the observed weekday call-free.

## D-102 · www's homepage: the unslop review's homepage replaces the placeholder

**Date:** 2026-11-10
**Approved by:** Connor, via the PM in chat on 2026-11-10: "Connor approved building the 'Amplified Impact Unslop Review' homepage mockup (artifact https://claude.ai/artifact/N4vAXaiUM26TyrfeSvYfVc, pass dated 2026-11-10) as the real marketing homepage for www.amplifiedimpact.io. Please build it now", with its scope: keep the host split, CTAs to the existing live pages only, a placeholder photo in one file, the conservative compliance defaults, and handling for /about, /pricing and /contact.
**Scope:** `apps/web/src/home/` (new: `content.ts`, `render.ts`, `home.css`, `vite-plugin.ts`, `render.test.ts`), `apps/web/home.html`, `apps/web/public/img/home-hero.jpg` (new), `apps/web/public/holding.html` (removed), `vite.config.ts` and `vite.ai101.config.ts` (the new entry), `apps/web/src/library/render.ts` (`paid` exported, output unchanged), `apps/api/src/server.ts` (reads `home.html`; `home.html` has no static URL), `apps/api/src/routes/marketing.ts` (`/pricing`), `scripts/check-css-colors.mjs`, and the tests. Every other built page is byte-identical. The host split is unchanged: learn serves the LMS, www never does.

- **What `/` on www is now.** The mockup's homepage, built like /library: one response with its stylesheet inlined and no script (nothing to hash under § 9.4's CSP). The nav (The Library, AI 101, For Team Owners, and Browse the Library), the split hero with its two buttons and Offer Strategy's made-up offer plan as a paper sheet, the library by who it is for, Run, Draft and Own with the contract checkbox, the team owners' card, and the footer with Terms of Service and Privacy Policy. Headings at weight 500, the tokens' colours, Hanken Grotesk and DM Mono. Its title, description, canonical address and Open Graph and Twitter tags are its own; the favicon is the inline one every public page has.
- **Where the buttons go, all existing pages:** the library to `/library`, AI 101 to `/ai101`, For Team Owners to the card on the page, the card's button to the Team Plan on /offer (`/offer#plan-agents`) and its link to `/offer`. No new checkout link, no price on the page.
- **The photo is one file to swap:** `apps/web/public/img/home-hero.jpg`, a neutral placeholder today (warm paper and a faint green wash, no people, no objects). Replace the file under the same name, then set its width, height and `alt` in `HERO_PHOTO` (`apps/web/src/home/content.ts`). It is also the share image. The photo sits beside the words, never behind them, so a real photo cannot cost them their contrast.
- **Lines changed from the mockup, for accuracy and the conservative defaults:**
  1. The lede, "Free Claude and ChatGPT skills and live training for real estate agents and team owners: ...", became "Claude and ChatGPT skills for real estate agents and team owners: offers, inspections, follow-ups and team reports, drafted for you to check. The paid plans add live training." Most skills are paid since D-080 and D-082, and the live training is in the paid plans.
  2. "Free skills for the work you do this week" became "Skills for the work you do this week", for the same reason.
  3. "23 guides and skills. Each one practises on a made-up file before a real client file goes in" became "56 guides, skills and templates for real estate teams. The free ones ask for your name and email. The rest are in the Amplified Skill Library." (the count is computed from the library's live cards, and the rest is /library's own line), and "Skills that work on client files practise on a made-up example first." (a PDF guide or a Grok Bot template does not practise). "See all 23" became "See All 56", computed.
  4. A free skill in the rows carries a "Free" tag (today Database Health Check and Team P&L Review), read from the library's own paid check, so the rows never imply a paid skill is free.
  5. The team owners' card, "Retool your ops leader's job before you hire ... Start the retool kit", became the Amplified Team Plan in /offer's own words (its name, "For teams who want every agent on the agent skills, with weekly coaching." and its first three lines), with See the Team Plan and All Plans and Prices, as the scope asked. Its terms and prices stay on /offer.
  6. The sheet's "p. 1 of 3" is gone (not in the sample), and its lines end with periods.
  7. Buttons and nav labels are in Title Case (D-048), and the headline ends with a period, as the scope wrote it.
- **Amended in review (Connor, via the PM, 2026-11-10):** "Rename 'Free Library' everywhere on the homepage. The nav link becomes 'The Library', and both 'Browse the Free Library' buttons (nav and hero) become 'Browse the Library'. Most of the library is paid now, and the free items are already tagged. Keep the links to /library." and "Legibility: the small light-gray text ... Darken it and/or bump its size so it meets WCAG AA contrast (4.5:1) using design-system tokens." So the homepage says "The Library" and "Browse the Library" (still `/library`), and has no tertiary grey and nothing under 13px: the category skill names are `--text-primary` at 16px (14.8:1 on the page), and the note under the count, the rows' counts, the sheet's mono lines and the footer are `--text-secondary` at 13 to 15px (8.3:1 on the page, 9.2:1 on the sheet), where they were `--text-tertiary` at 12 to 14px (5.3:1 and 5.9:1). The skill pages' breadcrumb and /library's own title still say "Free Library"; that is outside this page.
- **The hero is split** (the scope's word): the mockup's one surface, with the words on the left and the photo on the right, rather than a photo behind the words.
- **Old paths.** `/pricing` (and `/pricing/`) now 302 to `/offer` on www. `/about` and `/contact` keep the catch-all's 302 to `/`, which is now the homepage. 302, not 301, as before.
- **Tested:** web tests 1,975 and API tests 1,776 (local dev database), typecheck, lint and the build; `render.test.ts` holds the head, the landmarks, every link, the photo file, the sample's numbers against `skills/offer-strategy/sample.md`, the count against /library's, each row's card and Free tag, the Team Plan against /offer's words and anchor, and no income, results or free-skill claims. `marketing.test.ts` holds `/pricing`, `/about` and `/contact`. In Chromium against the built server with the marketing host set: zero axe violations at 320, 390, 768, 1280 and 1440, no sideways scroll, no console errors, the skip link first in the Tab order and a 2 px focus ring on every link and button, and only same-origin requests (the page, the photo and three font files). Every route in the scope answered as before on www (`/offer`, `/forum`, `/offer/welcome`, `/library`, `/agreement`, `/privacy`, `/terms`, `/ai101`), and learn served the app at `/`.
- **Not tested:** a real phone, Safari and a screen reader. There is no preview environment (Railway builds `main` only), so the review is the screenshots.

## D-103 · "The Library", not "The Free Library", on every www page

**Date:** 2026-11-11
**Approved by:** Connor, via the PM in chat on 2026-11-11: "the remaining 'Free Library' wording outside the homepage. Change /library's page title (and any heading or meta title/description that says 'Free Library') and the skill pages' breadcrumbs to 'The Library', the same as the homepage nav. Check the rest of the www pages and the emails for any other 'Free Library' mentions and change them too, unless a line is specifically about the free skills".
**Scope:** `apps/web/src/library/content.ts` (the page's title, and so its `og:title`, and its eyebrow), `apps/web/src/guides/content.ts` (`SHARED.skill.library`, every skill page's breadcrumb), the comments that quoted the old words, and the tests. It follows D-102, where the homepage's nav became "The Library".

- **/library:** the title "The Free Library · Amplified Impact" became "The Library · Amplified Impact" (the `<title>` and `og:title`), and the eyebrow over the page's heading "The Free Library" became "The Library". Its description and lede were already right ("The free ones ask for your name and email. The rest are in the Amplified Skill Library.") and are unchanged, as is the h1, "Put AI to work on your team."
- **Every skill page:** the breadcrumb "Free Library / <the skill>" became "The Library / <the skill>", still linking to `/library`.
- **Kept, because they are about the free skills themselves:** a free skill page's phone bar, "Get the Free Skill"; the "Free" pill on a free skill's page; the homepage's "Free" tags; /library's "The free ones ask for your name and email."
- **Searched and found nothing to change:** every other www page (the homepage, /ai101, /voice-profile, /retool, /terms, /privacy, /agreement, every guide), the email templates (`apps/api/src/email/templates/`), and the skills' own files. /offer, checkout and Stripe were not touched. Code comments and test names that call the page "the free library" by its D-050 name are notes for developers, never shown, and stay.
- **Tested:** `library/render.test.ts` renders /library, the homepage and every guide and skill page and fails if any says "Free Library", and checks every skill page's breadcrumb and /library's title, `og:title` and eyebrow; `skill-page.test.ts` checks the breadcrumb. The web and API suites, lint, typecheck and the build pass.

## D-104 · Ampy's Stripe update: Insiders sold on its own, the Team Plan prepaid, the Skill Library and the site checkout retired, 15 Accelerator seats

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy). The Stripe update, live Nov 10, 9:23 PM Central ("Connor approved"): "New live prices (lookup keys): membership_year_upfront: $1,997 one-time on Amplified Insiders (ai_plan=membership, ai_option=year_upfront). Insiders year = one year, then membership_monthly $197/mo starts automatically (365-day trial on the same checkout). It is NOT an auto-renewing annual price. membership_monthly ($197/mo, existing) is now also sold on its own (ai_option=monthly), 3-month minimum. agents_upto15_prepay3 $1,491 one-time and agents_16to40_prepay3 $2,391 one-time on Amplified Team Plan ... Links carry ai_option=upto15 / 16to40 plus billing=forum_prepay. library_upfront ($2,000) is retired. Remove the Skill Library cart." The pins: Insiders from "Tue May 4, 2027 00:00 Central = 1809406800", the Team Plan's monthly billing from "Sun Apr 4, 2027 00:00 Central = 1806814800", founding closing "Mon Nov 30, 2026, 11:59 PM Mountain = 1796108340. This applies to the Accelerator AND the Team Plan founding prices", builds on Wednesdays from Dec 2. And Connor's answers (Nov 10, 10:25 PM): "Seat cap is 15, not 10 ... At 15, hide both links on the site, switch to the waitlist, and send an alert. Ampy turns off both Stripe links by hand; the code doesn't touch Stripe." "After Nov 30, the Team Plan card switches to the waitlist." "Team Plan access: owner and agent logins open at purchase (held until Nov 16 like today), but agent skills open Dec 14 with the starter path." "Yes, retire POST /api/checkout. Use only the Stripe Payment Links and their terms checkbox." "Keep the build time at 1 PM Central for now."
**Scope:** `packages/core/src/offer.ts` (the catalog), `apps/api/src/billing/` (`agreement.ts` new; `checkout.ts` removed; `webhook.ts`, `provision.ts`, `access.ts`, `stripe.ts`, `config.ts`), `apps/api/src/routes/` (`offer.ts`, `skills.ts`, `billing.ts`), `apps/api/src/integrations/ghl.ts`, `apps/api/src/db/schema.ts` and migration `0007_stripe_update.sql`, the old offer page (`apps/web/src/offer/`, `apps/web/offer.html`; `main.ts` removed), `docs/STRIPE-HANDOFF.md`, `docs/LAUNCH.md` and the tests. No Stripe object was created, changed or read beyond what the webhook already did.

- **The carts.** Six, each sold only through its Payment Link (`paymentLinkEnv`): the AI Accelerator in full and in two payments (`PAYMENT_LINK_COHORT_FULL`, `_COHORT_TWO_PAY`, unchanged), Amplified Insiders for a year and monthly (`PAYMENT_LINK_INSIDERS_YEAR`, `_INSIDERS_MONTHLY`), and the Team Plan's two prepay tiers (`PAYMENT_LINK_TEAM_UPTO15_PREPAY`, `_TEAM_16TO40_PREPAY`). The Skill Library cart and `library_upfront` are gone; `library` stays a plan kind only so an older row still reads. Amplified Insiders is the plan kind `membership`, which opens the owner and operations set.
- **The pins.** `INSIDERS_FIRST_CHARGE_AT` = 1809406800 (May 4), `AGENTS_FIRST_CHARGE_AT` = 1806814800 (Apr 4), `DEFAULT_FOUNDING_CLOSES_AT` = Nov 30, 11:59 PM Mountain, said in Mountain time on the page. Cohort one's builds are Wednesdays, Dec 2 to Feb 3, at the placeholder 1 PM Central. A first invoice whose trial line ends past a pin no longer carries the plan past it.
- **The webhook.** It provisions `membership`/`year_upfront` (paid through day 365, its 365-day trial left alone), `membership`/`monthly` (paid a month at a time, with a 3-month minimum that turns cancelling off in Manage Billing), and the Team Plan only with `billing=forum_prepay` (paid through Apr 3, trial pinned to Apr 4, no lock: the minimum is prepaid). A Team Plan session without that metadata is from an older link: recorded, logged for Connor, not provisioned. A membership invoice counts toward its own Insiders order, never toward the AI Accelerator whose roll-on it is. The roll-on itself is unchanged, now from May 4, and still skips a buyer who already holds Insiders.
- **The Team Plan's skills open Dec 14.** The access rule now reads a plan's `starts_at`: logins open at purchase as before, and a Team Plan's paid agent skills open with the starter path on Dec 14 (free skills at once).
- **15 Accelerator seats.** Counted from cohort plans not ended, across both links. At 15 both links leave the page (state `soldout`) and the waitlist shows; the sale that fills seat 15 logs "AI Accelerator sold out ... turn off both Accelerator Payment Links in Stripe", and a 16th (a checkout already open) logs too. `GET /api/offer` reports `seats`. Replaces D-077's soft 10.
- **Founding closes for the AI Accelerator and the Team Plan on Nov 30;** after it both cards offer the waitlist. Insiders has no founding price.
- **The site checkout is retired.** `POST /api/checkout` answers 410 to any body; its validation, its Checkout Session builder, its consent texts and the page's form and script are removed. The agreement's acceptance is the Payment Link's terms checkbox, which the webhook already records (`agreement_version`).
- **GHL tags:** `plan-membership` with `pay-year` or `pay-monthly` (new, for Connor's workflows).
- **The old page's words** restate the live checkout's terms (Wednesdays from Dec 2, May 4, 15 seats, the Team Plan's Jan 4 to Apr 3 and Apr 4), and its Skill Library card is Amplified Insiders. Spring's rewrite of the page (PR #20) follows on top.
- **Not changed:** `/agreement` (with the attorney; its conflicting lines are listed in the pull request), the emails, and the "Amplified Skill Library" name on /library, the homepage and the skill pages (their own pull requests).
- **Tested:** core 399, web 1,977, API 1,764 (local dev database); typecheck and lint. New API scenarios: each cart through its link, the Apr 4 and May 4 pins, the first invoice not passing a pin, Insiders monthly's minimum and lock, the Team Plan's Dec 14 skills, an older Team Plan link refused, the 15th seat's alert and the sold-out page, and the 410.

## D-105 · The offer page sells Spring's three Phase 1 offers, with a thank-you page per plan

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, with Spring's plan as the brief (committed as `docs/SPRING-PLAN.md`): "Please read this whole brief, then reply with your plan for the Phase 1 PR (the Forum offer page and thank-you/next-step copy) and start on it. Phase 1 is due Thursday, Nov 12." Its Phase 1, item 2: "One simple offer page behind the Forum QR code with those three offers and prices showing. Prefer updating the existing `/offer` or `/forum` page the QR already uses rather than inventing a new URL." Item 3: "Draft website thank-you and next-step copy in the PR." Rebuilt on D-104 after Ampy's Stripe update ("Go ahead with the Stripe update PR and then rebase PR #20").
**Status:** the words wait on Spring's review ("Spring reviews all new copy before it is live"), so this ships on a pull request and goes live only when Connor merges it, after D-104.
**Scope:** `apps/web/src/offer/` (`content.ts`, `render.ts`, `offer.css` and `render.test.ts` rewritten), `apps/web/offer.html` and `offer-welcome.html` (body attributes), `packages/core/src/offer.ts` (the support address and the page's tokens; the price words removed), `apps/api/src/billing/config.ts` (two settings), `apps/api/src/routes/offer.ts` (the page's values and the thank-you section), `apps/web/src/home/` (the team owners' card reads the new Team Plan words), `docs/LAUNCH.md`, `docs/SPRING-PLAN.md` (new) and the tests.

- **Which page.** The existing one: `/offer` and `/forum` serve the same page, and the Forum's QR code opens `/forum`. No new URL. The page never says "Forum": anyone can buy a founding seat while they last.
- **What it sells.** D-104's carts, three cards in one component, in the plan's order: the Amplified AI Accelerator, Amplified Insiders and the Amplified Team Plan. Each card answers the same four questions under small labels (Who it's for, What you get, How it runs, When it starts), then the price, one button for its first cart's Payment Link, plain-text links for the others, "Every program includes weekly office hours." and "Not ready? Start with 5 free skills" (to `/library`). Every price shows; the numbers and dates are the plan's facts table held to the live checkout's own words: Insiders is "$1,997 today for one year", then $197 a month unless cancelled with 30 days' notice (never "a year", which would read as a price that renews); the Team Plan's first 3 months are paid today, monthly billing from Sunday, April 4, 2027; 15 founding seats.
- **The states.** A card takes its first cart's state from D-104: its link, "Opens soon.", closed after Nov 30 at 11:59 PM Mountain (the Accelerator shows $9,997 and the waitlist, a payment plan for $9,997 being open; the Team Plan shows the waitlist, as Connor asked), or, for the Accelerator at 15 seats, sold out with the waitlist. The page has no script.
- **Prices are words in the page** (`content.ts`), not amounts read from Stripe by lookup key (D-074): the brief's rule is that every price shows, even when Stripe cannot be asked. `GET /api/offer` still reports the live amounts, which is where Ampy can compare them. The old price-word helpers left with the old page.
- **The thank-you pages.** A Payment Link returns to `/offer/welcome?session_id={CHECKOUT_SESSION_ID}`. The page waits for the webhook as before, then shows the section for the plan bought: the login note (Monday, November 16, before `INVITES_FROM`), the intake form (`INTAKE_URL_<PLAN>`), the dates (the Wednesday builds, the Thursday office hours, the December 10 goal planning Zoom, and the Team Plan's December 14 and 17 bonuses), "add to calendar" buttons (`CALENDAR_URL_BUILDS`, `CALENDAR_URL_OFFICE_HOURS`; unset, "Your calendar invites come by email.") and the support address. Without a known checkout it says "No checkout found".
- **Support is support@amplifiedimpact.io** on the offer pages (the plan's "Support on thank-you pages"). The agreement and the emails still say admin@.
- **"Let's talk" for teams over 40** goes to `TEAM_CALL_URL`, or emails support while it is unset.
- **Open decisions left open, marked `[OPEN: ...]` beside the words:** the weekly agent training's day and time ("Weekly training starts the week of January 4."), the build and office hours times (no time is named; the calendar buttons wait for links), and a payment plan for $9,997.
- **Tested:** web tests on the parsed DOM (the four questions and the price in order on every card, one button each, the facts and the checkout's wording, Insiders never "a year", no "Forum", none of the old offer's terms, the closed and sold-out states, the thank-you section per plan, no script, no text under 16px) and API tests (the page's values, the thank-you section picked by the confirmed plan, the calendar links). In Chromium against the built server on the marketing host: zero axe violations at 320, 390, 768 and 1440, no sideways scroll, no console errors, only same-origin requests, every tap target 44px or more.
- **Not tested:** a real phone, Safari, a screen reader, and a real Payment Link: the local links were made-up `buy.stripe.com/test_preview_…` URLs, never opened.

## D-106 · LMS delivery: every offer provisions the right account, and the Amplified Agent Plan

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy). The brief: "Overnight build ... finish LMS delivery so every purchase creates the right account on learn.amplifiedimpact.io". The Agent Plan catalog spec, with live carts already in Stripe: product `Amplified Agent Plan` `prod_VbjbJ10HdX1QqW`; prices `agent_plan_monthly` `price_1UaW7tLAuFJaUU8qdKtFhhy2` ($79/month) and `agent_plan_yearly` `price_1UaW7uLAuFJaUU8qVBYe3mZB` ($790/year); links in `PAYMENT_LINK_AGENT_MONTHLY` and `PAYMENT_LINK_AGENT_YEARLY`; link metadata `ai_plan=agent_plan`, `ai_option=monthly` or `yearly`, `origin=payment_link`, `campaign=forum`; "First charge Jan 4, 2027: pin `trial_end` to exactly 1799042400"; "do NOT reuse `agents`: that is the Team Plan"; carts `agent-monthly` and `agent-yearly` with `founding: false`, `seats: 1`, no `billing`, no minimum; `PLAN_SETS.agent_plan = ['agent']`; `PLAN_NAMES.agent_plan = 'Amplified Agent Plan'`; "Skills open Jan 4 (use `starts_at`, as the Team Plan does) ... Cancel anytime." And: support pages and emails name `support@amplifiedimpact.io`, never `admin@`; `/agreement` is not touched.
**Scope:** `packages/core/src/offer.ts`, `apps/api/src/billing/` (`webhook.ts`, `provision.ts`, `access.ts`, `billing.test.ts`), `apps/api/src/routes/offer.ts` and `billing.ts`, `apps/api/src/integrations/ghl.ts`, `apps/api/src/db/schema.ts` and migration `0008_agent_plan.sql`, `apps/api/test/offer.test.ts`, `docs/LMS-DELIVERY.md` (new), `docs/STRIPE-HANDOFF.md`, `docs/LAUNCH.md`. No Stripe object was created, changed or read. No price, the 15 seats, the Nov 30 founding close, the Team Plan's Dec 14 skills or the Apr 4 and May 4 pins changed.

- **The Amplified Agent Plan is its own plan kind, `agent_plan`,** beside the Team Plan's `agents`, with the option `yearly` beside `monthly`, the lookup keys `agent_plan_monthly` and `agent_plan_yearly`, and the carts `agent-monthly` and `agent-yearly` (one seat, no founding price, no minimum, no `billing`). Migration 0008 widens `orders_plan`, `plans_kind` and `orders_option`; Railway's pre-deploy runs it.
- **Its first charge is pinned to Jan 4, 2027** (`AGENT_PLAN_FIRST_CHARGE_AT` = 1799042400). The webhook pins only a date still ahead, for every pinned cart, since Stripe refuses a past `trial_end`. A checkout that charges before Jan 4 means a link lost its trial: provisioned, and logged for Connor by ids.
- **Nothing is paid until Jan 4, so nothing opens until then.** The order and the plan are `trialing`, `paid_through` is null and `starts_at` is Jan 4. `invoice.paid` for the Jan 4 charge makes the plan `active`, paid through a month or a year. A first charge that fails opens nothing; a trial cancelled before Jan 4 keeps nothing. A buyer after Jan 4 whose link charged at once is paid through one period from the purchase. The first-invoice clamp to a pin now applies only to carts whose first invoice carries a trial line (a one-time item beside a trialing one: the Accelerator in full, the Team Plan).
- **A solo agent is the Team Owner of a team of one, at Agent tier.** The smallest correct change: the account model needs a team (`accounts.team_id`, `/api/skills` reads plans through the learner's team, Manage Billing is the account owner's), so `provisionOwner` is unchanged; only the tier comes from the plan. Agent tier hides the Team Hub, the owner view the Agent Plan does not sell. The agent skills come from the plan, not the role. A buyer who holds a Team tier plan stays Team tier.
- **The welcome page** names the Amplified Agent Plan and, for its trial, says "Your card is saved. Nothing is charged until Monday, January 4, 2027, when your agent skills open." instead of a receipt that was never sent.
- **GHL tags:** `plan-agent-plan`, and `pay-monthly` or the new `pay-yearly`. Plan tags now spell an underscore as a hyphen (no existing tag changes).
- **Support address:** `SUPPORT_EMAIL` is `support@amplifiedimpact.io` on the offer and welcome pages and in the Manage Billing fallback. The legal pages keep their own contact.
- **Every offer, end to end.** New API scenarios walk all eight carts through the account (matched by email, one account across purchases), the plan's kind, option, seats and dates, the pin, the held and then sent invite, the welcome page by `session_id`, the skills by date through `/api/skills`, a failed payment, cancel and keep, and a refund; plus the Accelerator's Insiders roll-on, a Team Plan agent invited from the Team Hub, and the Agent Plan's edges.
- **Still open, for Connor and Ampy:**
  1. Agent coaching is not in the LMS: no coaching sessions exist, and `liveSessionsOpen` is not read by any screen.
  2. The portal is not plan-aware. Every buyer is placed in cohort `dec26`, so Insiders, Team Plan and Agent Plan buyers see the Accelerator's builds, and the join route checks only the tier.
  3. The $37 single skill has no cart, price or lookup key.
  4. The Team Hub still caps 1 operations lead and 5 sales agents (D-081 is not built), short of the 15 or 40 the Team Plan sells. There is no skill usage view for owners.
  5. An agent already seated on someone's team who buys the Agent Plan is paid and recorded, not provisioned (`member-of-another-team`).
  6. Accelerator alumni after May 4 keep the Accelerator plan, carried by the Insiders invoices, so both sets stay open; a direct Insiders member gets the owner set only. Intended or not is Connor's call.
  7. The production cohort data in the launch seed is the reference's: Tuesdays and Thursdays, six sessions from Dec 1, cadence "Tue & Thu", demo Zoom links; the Sessions screen also prints "Tue & Thu". The course-build pull request owns it. `db:seed:prod` refuses once any buyer is in `users`, so it has to run before the first sale.
  8. `/agreement` has no Agent Plan section and still says Tuesday, Dec 1 and Jan 26 (with the attorney). The welcome page's billing line says "30 days' notice", which is not the Agent Plan's "cancel anytime"; Spring's per-plan thank-you pages (PR #20) need an Agent Plan section, and the offer page has no Agent Plan card.
  9. The tests follow the metadata contract, not Stripe sandbox objects: `stripe-log.md` and the sandbox Payment Links (`acct_1Ua8wyLxFcHWRPVc`) are not in the repository.

## D-107 · The site's shared nav, and Home rewritten to Spring's outline

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "Stand up the 8-page site map with marketing emphasis, using Spring's plan wording (she reviews in the morning) ... Do not wait for Connor." Its rules for this page: "Main nav: Programs, The Library, Free Resources, About, and a Get 5 Free Skills button." "Home `/`. Hero: 'AI coaching and training for business owners and their teams.' Proof line: '100 agents, 700+ homes a year' (Connor confirmed these as current numbers; do not hedge them). No testimonials." "Real images only ... Never present a stock or generated face as Spring or Connor." "Public contact: support@amplifiedimpact.io (replace admin@)."
**Scope:** `apps/web/src/site/` (new: `content.ts`, `render.ts`, `site.css`, `render.test.ts`: the nav, the footer, the share tags and the Free and Locked tags every www page will use), `apps/web/src/home/` (`content.ts`, `render.ts`, `home.css` and `render.test.ts` rewritten), `apps/web/public/img/team/` (new: four photos), `apps/web/public/img/home-hero.jpg` (removed: the placeholder), `scripts/check-css-colors.mjs` (scans `src/site/`). Every other built page is unchanged.

- **The nav.** Programs (`/pricing`), The Library (`/library`), Free Resources (`/free`), About (`/about`), and Get 5 Free Skills (`/library?show=free`: the Library, with its five free skills first once the Library's own pull request lands). No script: on a phone the links take a second row under the logo and the button. The footer names support@amplifiedimpact.io and links the site and the three legal pages.
- **Home** is Spring's "Homepage outline", nine sections in her order: the hero with her headline and subhead and two buttons (Get 5 Free Skills, See the Programs) beside Spring's and Connor's own photos; the proof strip, "Built inside The Utah Life Real Estate Group: 100 agents, 700+ homes a year", Connor's numbers, unhedged; the shift (AI as a tool, AI that does real work); four ways in, each card with its exact name, its price and one button (the Amplified AI Accelerator $7,500 founding, the Amplified Agent Plan $79 a month or $790 a year, the Amplified Team Plan $1,491 today for 3 months up to 15 agents, Amplified Insiders $1,997 today for one year or $197 a month) and "Every program includes weekly office hours."; the Library preview, each skill tagged Free or Locked from the Library's own catalog; the old hero idea as the trust section (Run, Draft and Own beside Offer Strategy's made-up sheet); free resources for agents and for team owners, by their Library titles; Meet Spring and Connor, short versions of the brief's bios; and the end, the two buttons again. No testimonials.
- **The photos are theirs.** The four files the brief names, fetched from their source URLs and matched pixel for pixel against the ones Ampy attached: `spring-bengtzen.jpg` (forummastermind.com, "founder-spring-new"), `spring-bengtzen-2.jpg` (Brivity, Live Utah), `spring-bengtzen-cutout.webp` (springb.com, "Spring-iso-4", for /about) and `connor-leiva.jpg` (stanwith.me). Resized for the web, 64 to 106 KB each. No stock or generated face is presented as anyone.
- **Until the other pages land,** Programs reaches the plans at `/offer` (the existing redirect), and Free Resources, About and the three program pages fall back to Home, as any unknown path on www does.
- **Legibility:** no text under 16px and every tap target 44px or more (Spring's mobile rules), held by the tests and checked in the browser.
- **Tested:** web 1,979 tests; typecheck and lint. In Chromium against the built server on the marketing host: zero axe violations at 320, 390, 768 and 1440, no sideways scroll, no console errors, only same-origin requests, every photo loaded.

## D-108 · /morning-brief: Morning Brief, the AI Accelerator's week 2 flagship, a Grok Bot template with a Claude and ChatGPT fallback

**Date:** 2026-11-11
**Approved by:** the PM's course brief for the AI Accelerator (the course plan is final): "Build only these two new Library items ... Morning Brief, week 2 flagship. One page: at most three owner priorities, exceptions that need a decision, and next owned actions ... Must flag missing ownership and timing, not invent them. Prefer a Grok Bot template plus a Claude or ChatGPT fallback. Ship the Team Owner version".
**Scope:** `skills/morning-brief/` (new: the skill, `grok/SKILL.md`, `chatgpt/`, `practice/`, `evals/`, `sample.md`, `page-notes.md`), its four ZIPs in `apps/web/public/downloads/`, `scripts/skills.mjs` (and its `.d.mts`) with `scripts/grok-templates.mjs` (the shared template check), `packages/core/src/skills.ts`, `apps/web/src/guides/` (`morning-brief.ts` and its test, `content.ts`, `render.ts`, `grok-page.ts`, `skill-page.ts`, `skills.css`), `apps/web/morning-brief.html`, `vite-plugin.ts`, `apps/api/src/routes/guide-list.ts`, `apps/web/src/library/content.ts`, `skills/README.md`, `docs/LAUNCH.md` and the tests that pin the lists. Every other page renders byte for byte as before.

- **What it is.** One page a team owner reads in ten minutes each weekday: at most three priorities for today, the decisions waiting on the owner, and the next owned actions, each traced to its input. Inputs: this week's numbers (a Lead-Source ROI summary, a FUB Pipeline Review or the team's scorecard), the current task register (a ClickUp or Asana export, a Google Sheet or a pasted list), at most one meeting transcript or thread, today's calendar only if it is already there, and the roster. The Team Owner version only: its priorities are the owner's own items. Paid: not in `FREE_SKILLS`, so not one of the free five.
- **One skill, three ways in.** The brief prefers a Grok Bot template with a Claude or ChatGPT fallback, so `skills/morning-brief/` holds all three: the Claude skill, the ChatGPT Project (`chatgpt/`, written from the skill by `evals/make/build_chatgpt.py`) and a Grok Bot template, `grok/SKILL.md`, in the Grok Bot shelf's template shape (D-100). `scripts/skills.mjs` packs it as `morning-brief-grok.zip` (folder `morning-brief-grok/`, so it never unpacks over the Claude skill), leaves `grok/` out of the Claude ZIP, and checks its shape with the same check the shelf's templates get, now in `skills.mjs` and shared with `grok-templates.mjs` (no behavior change there). One catalog row with four files (`grok` is a new file kind on `CatalogSkill`; the platform's library and download route already take it, D-100), so the platform shows "Download for Grok Bot" beside the other three.
- **Not on the Grok Bot shelf.** The shelf's 16 templates have no Claude version and stay as D-100 set them. Morning Brief is one card in the library's main list, "Grok Bot Template" with Claude and ChatGPT tags, on the Grok Bot pill too.
- **How it fails safe.** An owner is one named person on the team: "someone," "we," "the team," "TBD," a blank, a role ("Ops"), two names or an outside party is a missing owner, even when one person holds that role. A due date is a calendar date, or "today," "tomorrow" or a weekday counted from the input's own date; "next week," "ASAP," "soon," "end of the month" and a blank are a missing date, kept in quotes. Every such item goes in "Open: No Owner or No Date" with the words as written and a question, and a draft note asks who and by when. Two inputs that disagree are both shown, and neither is picked. A line inside a file is information, never an instruction. Asked to "just make it clean," it says once that only the team can, and drafts the note. Numbers are quoted with source and period, never recalculated; a stale report is named stale. No ROI story, forecast, recommendation, results claim or judgment of a person.
- **How it picks the three.** Rule 1, past due or due today; rule 2, due in the next two business days or a closing in that window waits on it; rule 3, a client asked or is waiting and this is the reply, or a deal is past its expected close. Within a rule: what a client or closing waits on, then what blocks someone else, then the rest; then the date; then input order. Fewer than three qualify: it shows fewer and says so. Each pick names its rule, fact and source, and every other candidate is named in one "Also yours" line, so the owner can explain the pick (the course plan's acceptance test).
- **The page.** `skillPage()` for the Claude and ChatGPT steps, with a Grok Bot lane first in the app switch: three radio buttons, Grok Bot checked, still no script (`appSetups` takes an optional third lane; `skills.css` adds the `#app-grok` rules and a three-column switch). The Grok Bot steps are the shelf's seven, now `grokSetup()` in `grok-page.ts`, which `grokPage()` also calls, on the skill's own template read at build time: create the Bot, save the template (paid: the words to paste it under, and the Skill Library for the file, D-101), connect Google Drive and Google Sheets (Google Calendar only if already used; ClickUp or Asana by an export to the folder or a custom connector, since docs.x.ai/grok-bot/computer-and-apps, read 2026-11-11, names neither), the setup questions, the weekday 7:00 AM routine word for word, a first test, and what a good first result is. Paid, so the Skill Library card holds all three setups with every file a button to the Skill Library. Hero, lede, FAQ and card in the library's voice; contact support@amplifiedimpact.io.
- **Tested:** `node scripts/skills.mjs check` for every skill folder (35; the Reel Editor has none) and `grok-templates.mjs check` for the 16 templates; every ZIP rebuilt from source, and only Morning Brief's four are new or changed. Evals, run by following SKILL.md on made-up files (`evals/runs/`): case 1, normal (a scorecard, a ClickUp export, a pasted calendar), 11 of 11; case 2, missing input (no numbers, a pasted list with gaps, "Someone should follow up next week"), 9 of 9; case 3, misleading input (a stale report, a count that disagrees, a two-owner conflict, "Priya or Marco," "Ops," "ASAP," an instruction inside the transcript and a request to fill it all in), 11 of 11; the practice files, 12 of 12 planted checks. All four pass `evals/make/objective_checks.py`. New `morning-brief.test.ts`, and the pinned lists, counts (36 skills, the Grok Bot pill's 17) and lane checks in the existing tests. Core 399, web 2,006, API 1,780 (local dev database), on top of D-107; typecheck, lint and the build. In Chromium against the built page: zero axe violations and no sideways scroll at 320, 390 and 1280, the switch showing one lane at a time. Every other guide page and the library's other cards render as before (compared byte for byte with `main`).
- **Not tested:** any lane inside its product (the template in a live Grok Bot, the skill in claude.ai, the Project in ChatGPT), real ClickUp, Asana, Google Sheets, Granola or calendar files, and a no-skill baseline.
- **Left open for Ampy and Connor:** the paid card's buttons are the shared ones ("See Plans," "Get It in the Skill Library"); the Library pull request that changes the locked buttons applies here with no edit. The rule order for the three is a choice, written in `references/brief-rules.md` (and the template's procedure) for teams to tune. The skills table gives every row the launch release date; Morning Brief's own date, if it should differ, is the loader's to set. Inbox and Meeting Follow-Through's description does not yet name Morning Brief as the sibling to use; its "morning pass" wording is close, and a one-line edit there (with its ZIP rebuilt) would settle which skill a "morning brief" request picks. The Grok Bot lane's limits are D-100's: no QuickBooks, ClickUp or Asana app in the docs, the timezone's exact menu, and plans checked only in Settings > Usage & Billing.

## D-109 · /new-agent-onboarding-plan: New Agent Onboarding Plan, the AI Accelerator's week 7 flagship, a paid skill for Claude and ChatGPT

**Date:** 2026-11-11
**Approved by:** the PM's course brief (the course plan is final): "Build only these two new Library items ... New Agent Onboarding Plan, week 7 flagship. Configurable around the team's standards, responsibilities, checkpoints, and first 30 days. Include the three PDF tests (normal, missing, and misleading inputs) with safe failure. Claude Skill. Recruiting points at Recruiting Prep, not a second required build."
**Scope:** `skills/new-agent-onboarding-plan/`, `apps/web/src/guides/new-agent-onboarding-plan.ts`, `apps/web/new-agent-onboarding-plan.html`, `apps/web/public/downloads/new-agent-onboarding-plan*.zip`, and one line each in `GUIDES`, `GUIDE_HTML`, `GUIDE_SLUGS`, `ENTRIES` and `SKILL_CATALOG` (owner and ops set, paid), with the tests that pin those lists (the catalog's count, 35 to 36); and the Library's sort test in `apps/web/src/library/main.test.ts` (below).

- **/new-agent-onboarding-plan is the page for the paid `new-agent-onboarding-plan` skill (version 1.0, Claude and a ChatGPT Project)**, built with `skillPage()`, unlock key `naop-unlocked`, drawn with the Library card and the guided setup under it (D-082, D-101). Its Library title is "New Agent Onboarding Plan", as the course links to it. It is not one of the free skills.
- **What it does, in two modes.** Setup mode reads the team's onboarding checklist, handbook, roles list, role description or a Team Playbook Builder playbook (or interviews a leader with nothing written, in four rounds) and writes `onboarding-setup.md`, version 1.0, in nine parts: standards by Day 30, who does what, checkpoints, the first 30 days, experience and role changes, after Day 30 (headings only), held for the broker, open items and a change log, every line with its source. It also writes the course's three tests fitted to the team (normal, missing and misleading inputs, each with what a safe result looks like, and a test record) and a one-page runbook (trigger, who, required data, steps, human judgment points, repair with a version bump and a test rerun, refresh, fallback, and "tested and ready" versus "adopted"). Plan mode builds one new hire's plan from the setup (building and saving the setup first when only documents are attached): Needs Your Answer first, the plan at a glance, standards, who does what, checkpoints, the first 30 days week by week, Day 60 and Day 90 as headings, a welcome note, a note to the checkpoint owners and Check Before Sending.
- **Safe failure.** Missing inputs become placeholders and questions (no start date: Day numbers only). Conflicts are quoted both ways with no winner. Misleading inputs (a license claim a roster contradicts, another team's template, a stale document, a pre-August 2024 buyer step, a results target offered as a standard) are named and held on the files' version. A results target never becomes a standard or a projection. Personal details are left out with one line, never repeated, and change nothing in the plan.
- **Dates in code.** `references/dates-code.md` (from `evals/make/plan_dates.py` by `embed_code.py`, also the ChatGPT code file) counts Day 1 from the start date, moves a step off a non-onboarding day, a closed day or a federal holiday (5 U.S.C. 6103, and the observed weekday per OPM), moves a "due by" step back so it's never late, keeps calls off Sundays and holidays, lists weekly meetings on their own dates, and lists every move. State holidays are not in it; a setup can name them as closed days.
- **Run, Draft, Own:** Run reads, sorts, finds gaps, conflicts and held steps, and dates the plan. Draft: the setup, its tests and runbook, each plan and the two notes. Own: every standard, which version wins a conflict, every checkpoint owner and every decision about a person; the broker owns the license confirmation, fair housing and anything legal.
- **Conservative defaults (D-101), named as calibratable with counsel:** licensed and client-facing steps held until the leader confirms the license is active and affiliated (what an agent may do before that is the state's and the broker's call, and the skill doesn't say); fair housing training only as the documents or the broker name it; set hours, required office days and penalties listed as written and flagged for the broker or counsel ("how your agents are classified ... is a question for your broker or counsel"), never called legal or illegal; old buyer agreement steps held (NAR, August 17, 2024); calls only to scrubbed numbers, texts only with documented consent naming the team or brokerage, no calls or voicemails on a Sunday or a legal holiday. No SSN, tax ID, bank or routing numbers, license numbers or logins, even from an onboarding form; no individual split or fee; no income or results claims. Sources checked 2026-11-11: HUD's Fair Housing Act overview, NAR's practice changes article, 5 U.S.C. 6103 and OPM's federal holidays page.
- **The course's fit.** The three tests are the PDF's (normal, missing, misleading or conflicting, with safe failure). Day 60 and Day 90 stay headings ("assess a useful first 30 days before adding detail to days 60 and 90"). The runbook carries the course's acceptance test (trigger, required data, judgment points, repair) and its labels ("tested and ready," not "adopted," with no hire yet). Recruiting with no one hired goes to Recruiting Prep (/recruiting-prep), named in the skill and linked on the page; Team Playbook Builder is a supporting input.
- **Practice files** (made up, "PRACTICE FILE: made-up example" on every page): the Thistledown Example Team's agent handbook (PDF), new agent checklist (XLSX) and roles list (DOCX). Eval files: a page of thin notes (case 2), and a stale checklist, 2026 standards, a roster export and another team's ramp template (case 3). All from `evals/make/make_files.py`.
- **Tested** (by the builder following SKILL.md in the build session, with the dates code run for real; each graded in its `grading.md`): case 1, normal, the practice set, 12 of 12 (kept as `sample.md`); case 2, missing inputs, 10 of 10, no-skill baseline 0 of 10; case 3, misleading and conflicting inputs, 12 of 12, no-skill baseline 1 of 12; case 4, setup mode, 10 of 10. Every run passes `evals/make/objective_checks.py` (dashes, Title Case subjects, section order, every date traced to the code, numbers traced or listed, the welcome note's length, no account numbers, forbidden terms). `node scripts/skills.mjs check` passes for all 36; the three ZIPs are built from source. Core 399, web 1,994 and API 1,780 tests (local dev database), typecheck, lint and the web build. The built page in Chromium at 390 and 1280: no sideways scroll, no axe violations, no page errors.
- **The Library's sort test.** `main.test.ts` checked that the cards sorted oldest first ran in date order across the main list and the Grok Bot shelf together. This card is the first dated after every template (2026-11-11), so it ends the main list before the shelf's older cards, which is right. The test now holds each list in date order on its own, as `main.ts` sorts them.
- **Not tested:** an independent run in a fresh Claude or ChatGPT session; real team documents or a real roster; the interview, update mode and a role change; the ChatGPT version inside ChatGPT; Claude Free.
- **Left open for Connor and Ampy:**
  - The page's locked button is the shared Library card's "See Plans" (to `/offer#plans`), as on every paid page. "Get Amplified Insiders" for locked skills is a change to that shared card for the Library or marketing pull request; this one doesn't touch it.
  - The platform loads every skill with `LAUNCH_RELEASE` (`billing/cli.ts`), so this one counts as released at launch. If it should count as one of the month's new skills, the loader needs a per-skill date.
  - Recruiting Prep's description still routes "onboarding a new hire" to team-playbook-builder. Pointing it here means editing that skill and rebuilding its ZIPs, so it isn't in this pull request.
  - The course names Seat Definition Writer as a supporting skill. It isn't in the Library, so nothing links to it.
  - Defaults to confirm: the house checkpoints when a team has none (Days 1, 7, 14 and 30), Monday to Friday when a team names no onboarding days, and a "due by" step moving to the open day before (so the practice plan's Day 14 role-play, on a Sunday, moves to Monday as an "on" step and is raised as a choice).

## D-110 · The Amplified AI Accelerator: Week 0 and eight weeks as the production curriculum, opened by plan

**Date:** 2026-11-11
**Approved by:** Connor, via the PM's course brief: "Overnight: stand up the 8-week Accelerator course in the LMS ... Connor: treat the planning PDF as final, and piggyback on the Library rather than inventing skill content." The plan is `docs/COURSE-PLAN.txt` (the PDF's text, page-break characters removed). The calendar, the week-to-skill map, the entitlement rule and the house rules are the brief's.
**Scope:** `packages/core/src/` (`accelerator.ts`, `accelerator-content.ts`, `worksheet.ts` new; `sessions.ts`, `scope.ts`, `seed-production.ts`), `apps/api/src/` (`routes/course.ts`, `lib/course-access.ts` new; `routes/snapshot.ts`, `routes/join.ts`, `db/seed.ts`, `jobs/due.ts`, `jobs/scheduler.ts`, the weekly-digest template and the session subjects), `apps/web/src/` (`routes/course/` new; `router.tsx`, the Sessions and Dashboard view-models and their two markup files, `components/SessionCard.tsx`, `shell/navModel.ts`, `shell/AppShell.tsx`, `routes/admin/Overview.vm.ts`, `routes/library/SkillLibrary.tsx`), `apps/api/package.json` (`db:curriculum`), `docs/COURSE-PLAN.txt`, and tests. No golden, mask or tolerance changed; no migration.

- **The production curriculum is the Accelerator, never the prototype.** `seedProduction` now carries cohort one (`dec26`, "Amplified AI Accelerator · December 2026", 8 weeks, Wed Dec 2 at 1:00 PM Central to the end of the Feb 4 office hour, 15 seats, "Wed builds and Thu office hours · 1:00 PM CT"), its sixteen sessions and nine AI Employees (Week 0 and Weeks 1 to 8), instructor Connor Leiva. No Zoom URL (empty until staff set the real one; the course page says "Zoom link TBA"), no transcript, `dur` or replay, no enrollment count, no demo learner, and no tier rows: the prototype's $995 and $4,995 are not shown. The demo seed and its fixtures are unchanged.
- **On a live database: `pnpm --filter @ai/api db:curriculum`.** The launch seed refuses a database with users, and every paid order writes one, so `applyAccelerator` upserts only the curriculum: cohort `dec26`, its sessions (keeping a real Zoom link, live state and attendance on a session that has not moved, dropping the prototype's invented links), the nine modules (keeping a recording attached since), the prototype's six modules turned into drafts with no session, and tier rows still at the prototype prices removed. Users, teams, progress, staff and everything else are untouched. Idempotent, also at the database level: rows equal in content are kept as loaded, so a second run writes nothing.
- **The calendar** (`accelerator.ts`, locked): builds Wednesdays 1:00 PM Central, 90 minutes, `n` 1 to 8 (`dec26-s1` to `-s8`); Thursdays 1:00 PM Central, 60 minutes, a second series `dec26-oh1` to `-oh8` with `n` = 100 + week, so `n` stays unique. Dec 10 and Dec 17 are "Goal-Planning Session 1 and Office Hours" and "Goal-Planning Session 2 and Office Hours". Nothing between Dec 18 and Jan 5. The week of an office hour is read off its id (`sessionKind`, `sessionWeek`, `sessionLabel` in `sessions.ts`), so there is no schema change; `moduleForSession` maps an office hour to its week's AI Employee. For every session the reference seeds, all three return what they did before, and the differential suite still passes.
- **Opened by plan, not by cohort.** Every paid buyer sits in cohort `dec26` at Team tier, so `acceleratorOpen` reads the account's plans: a `cohort` plan bought `full` or `two_pay`, started and not ended, from the Nov 16 invite hold on. It opens Week 0 and all eight weeks at once (no drip). Amplified Insiders, the Team Plan, the Agent Plan and a learner with no account do not: `scopeSnapshot` drops the course's modules and sessions for them (dropped, not redacted, because a redacted module keeps its notes and checklist), the join route answers its sessions with the same 404 as another cohort's, `GET /api/course` answers 403, and the scheduler sends the course's reminders only to learners whose plan opens it. A teammate the owner invites (the operator) opens what the owner's plan opens. The Zoom join stays date-gated by `joinMode`.
- **The course's pages, `/course` and `/course/week-N`,** net-new and outside the shell like `/skill-library` (D-079), read `GET /api/course`. Each week has the operating question, why it matters, owner and operator, the time budget (estimates), its Library skills by Library title with their guided setups on www, a numbered setup order, the live-build page (date, 1:00 PM Central, the plan's 90-minute agenda, one required outcome, a harder option, the owner's approval of a real run), the office-hours page (10/40/10, optional, the issue form), the homework (working at the end of class and implemented by week's end, kept apart), the evidence packet, the rubric (0/1/2 on five dimensions, "tested" at 8 of 10 with no zero in evidence or control), the readiness gates and clearly marked media placeholders. The overview carries the calendar, the intake, the 30-minute orientation, the data pack, the synthetic practice set, the safe-sharing rules, graduation as an operating standard, and Week 8's three paths with no paywall. The words come from the server only, so they are not in the public bundle. A Course link appears in the sidebar for a learner whose snapshot has the course (never in the prototype), and the Skill Library links an Accelerator plan to it.
- **The Week 1 worksheet** (`worksheet.ts`) computes cost per lead, period cost per closing and coverage deterministically, never treats a missing input as zero, and downloads as a CSV whose cells are formulas, with the synthetic practice set (one input missing on purpose: Week 0's readiness exercise). The decision log, responsibility card, runbook, use log and the three cohort-end worksheets download as blank CSV templates.
- **Production fixes on parity-checked screens, with the prototype's output unchanged:** for a cohort with its own office-hours series, the Sessions screen lists its builds, says its cadence instead of "Tue & Thu", and shows its real Thursdays (no prototype Zoom link; "Recording Posted" only when a replay is up); the Dashboard's office-hours link and post-cohort card use the real series and instructor ("Schedule TBA" when none is scheduled, no "Jordan Hale"); the cohort line counts course weeks across the holiday (Jan 6 is Week 4, Feb 3 is Week 8); session cards and reminder subjects call an office hour "Week N"; the weekly digest names the build day. Parity, gates 4 and 5 (`dash-`, `sessions-`, `shell-`, `emp-`, 29 scenarios): the same 8 fail on `origin/main` and on this branch with identical pixel counts (sidebar and dark dashboard pixels, already red), 21 pass on both.
- **Gaps, for Ampy:** no recordings yet (orientation, demos, replays; every `[VIDEO: ...]` is a placeholder); no Zoom links; Morning Brief (`/morning-brief`) and New Agent Onboarding Plan (`/new-agent-onboarding-plan`) are not in the Library yet: `LIBRARY_ROUTES_PENDING_MERGE` lists them and must be emptied once both merge; `/workspace/decision-log.md`, `/workspace/skill-plan.md` and `docs/SPRING-PLAN.md` do not exist here; production needs `db:curriculum` run once by staff (never run from here); the Dec 10 and Dec 17 goal-planning sessions are "for every buyer", but in the LMS they show only to Accelerator plans, so other buyers need the link by email; where evidence packets and issue forms are submitted, and the rubric turnaround, are not set (the plan says to publish a turnaround only once review capacity is funded); the post-cohort office-hours schedule is not set; the Dashboard's prototype quick-link copy ("148 members · 23 new posts today", "Typical reply in under 2 hours") and the Employee Detail screen's prototype mechanics (System Prompt panel, Mark as Deployed, the demo Run) are unchanged on parity-checked screens. Plan items mapped to existing Library skills rather than built: Weekly Production Report (FUB Pipeline Review), IDS Issue Writer (an exercise on L10 Meeting Prep), Deal Status Digest and CRM Relationship Linker (FUB Pipeline Review, the optional transaction extensions, Database Health Check), Seat Definition Writer and Task Drafts (Team Playbook Builder, Inbox and Meeting Follow-Through), EOS Quarterly Packet (the cohort-end worksheets), Recruiting Outreach and Interview (Recruiting Prep). Not built: staffing, facilitator guides, the completion board, the Jan 7 clinic, the 30- and 90-day surveys and the benefit ledger.

## D-111 · Programs and Pricing at `/pricing`: the picker, the founding countdown and seats left, four cards, the comparison and the questions

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/pricing`: 'Pick the way you want to learn AI.' Picker: I'm an agent / I own a team / I just want the skills. Nov 30 countdown and seats left from `/api/offer`." The page's parts and their order are Spring's plan (`docs/SPRING-PLAN.md`, "Pricing (/pricing)" and "Make the choice easy").
**Status:** the words wait on Spring's review, so this ships on a pull request. It is stacked on D-105's (PR #20), whose offer cards it reuses.
**Scope:** `apps/web/src/pricing/` (new: `content.ts`, `render.ts`, `pricing.css`, `render.test.ts`), `apps/web/pricing.html`, `apps/web/src/site/vite-plugin.ts` (new: one build plugin for the rest of the site map), `apps/web/src/site/offers.ts`, `offers-content.ts` and `offers.css` (new: the offer card, the founding banner and the questions, which /team-build, /teams and /agents reuse), `packages/core/src/founding.ts` (new: the countdown's words and the seat tokens), `apps/api/src/routes/offer.ts` (`SALES_PAGES`, `salesValues`), `apps/api/src/routes/marketing.ts`, `apps/api/src/server.ts`, `scripts/check-css-colors.mjs` (scans the new stylesheet), the tests.

- **The page, in Spring's order:** the headline; "Which one is right for me?" with three buttons that scroll to a card (I'm an Agent to the Amplified Agent Plan, I Own a Team to the Amplified AI Accelerator, with the Team Plan named under it, I Just Want the Skills to Amplified Insiders); the founding banner; "Four ways in", the four cards; the comparison table; the seven questions; "Not ready? Start with 5 free skills." The proof line under the lede is the homepage's ("Built inside The Utah Life Real Estate Group", "100 agents, 700+ homes a year"). No testimonials.
- **One copy of each price.** Three cards are /offer's own words (`OFFERS`, D-105), so the two pages cannot price a plan two ways. The Amplified Agent Plan's card is new: $79 a month or $790 a year, first charge Monday, January 4, 2027, cancel anytime, weekly training "starting the week of January 4" (the training's day and time stay open).
- **The Agent Plan card says "Opens soon."** Its carts (`agent-monthly`, `agent-yearly`) come with the LMS wiring (D-106, PR #23), and its thank-you section with the /agents page (D-114). Until both land the card has no button, so nobody buys into a thank-you page that does not name their plan.
- **Filled per request, no script.** Built once into `dist/pricing.html`, then filled by the same code as /offer (`OFFER_TOKENS`: each card's state and Payment Link, the deadline, the 40+ call) plus `FOUNDING_TOKENS`: the countdown, the seats left and `data-seats`. The countdown counts whole days, then hours on the last day ("3 hours left"), then "Less than an hour left", and is empty once founding closes, when the banner hides (`data-founding="closed"`). It is right on every load without the visitor's clock and adds nothing to hash under the CSP; it does not tick while the page sits open. Seats come from the same count as `/api/offer` (`cohortSeatsSold`), "12 of 15 Amplified AI Accelerator seats left", and "All ... founding seats are taken" at 15.
- **After November 30** the cards do what /offer's do: the Accelerator shows $9,997 for the next cohort and the waitlist (no payment plan for $9,997: open), the Team Plan the waitlist. The comparison table's two founding prices switch with them. Every "Join the Waitlist" here goes to /offer's waitlist form, the one form there is.
- **The comparison table** has Spring's eight rows. A check always says "Included" and a dash "Not included", in words. On a phone each row stacks into a list, each cell named by its program, so nothing scrolls sideways; from 960px it is a table. The roles are spelled out so the stacked view keeps its meaning for a screen reader.
- **The questions** are Spring's seven, each a `<details>`. Two answers are careful: refunds point to the Subscription Agreement (the attorney's wording, not restated here), and "Can I buy one skill?" says $37 each with the checkout opening soon (`[OPEN]`: Ampy has not made the single-skill cart). "Do I need Claude or ChatGPT?" is held by a test to the Library's own tool tags (33 of 56 run in both, 7 in Claude only, 16 Grok Bot templates).
- **Serving.** `GET /pricing` is a route like `/offer` (no-store, public), `SALES_PAGES` in `routes/offer.ts` lists it, `server.ts` reads it and keeps `pricing.html` from being a second URL, and www lets it through exactly: `/pricing/` 302s to it, and `/pricing/x`, `/Pricing` and `/pricing.html` do not reach it. The old `/pricing` to `/offer` redirect (D-102) is gone, so the nav's Programs and the homepage's See the Programs land here.
- **One plugin for the site's pages.** `src/site/vite-plugin.ts` builds every page in `SITE_PAGES` from `src/<name>/render.ts`'s `renderHead()` and `renderBody()`. The pages still to come (/team-build, /teams, /agents, /free, /about) are each a line there.
- **Also on D-105's branch:** the Team Plan's button reads "Get Amplified Team Plan" (was "Get Team Plan, Up to 15 Agents"), so every buy button names its plan exactly; a test holds all of them to "Get <plan name>".
- **Tested:** web tests on the parsed DOM (the order, the picker's targets, the banner's tokens, the four cards' five answers and exact names, /offer's words reused, the states, the table's rows and labels, the questions, the tokens the API fills, the house rules); core tests for the countdown's every edge and the seats; API tests filling `/pricing` per request (16 days, 3 hours, closed; 12 of 15, then sold out at 15) and www's exact paths. In Chromium against the built server on the marketing host: zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440.

## D-112 · The Amplified AI Accelerator's sales page at `/team-build`, on the course brief's week map

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11. The overnight brief: "`/team-build`: '8 weeks. 8 skills. Built live with us.' First build Wednesday, December 2. Seats from `/api/offer`; waitlist when sold out. Requires Follow Up Boss. Use the course brief's week-to-skill map, not the draft 8-name list." The course brief: "Connor: treat the planning PDF as final", with its locked calendar ("Builds: Wednesdays, 1:00 PM Central, 90 minutes. Office hours: Thursdays, 1:00 PM Central, 60 minutes. Holiday break: nothing on Dec 23 or Dec 30.") and its ship order ("3. /team-build uses this map"). The page's parts and their order are Spring's plan (`docs/SPRING-PLAN.md`, "Amplified AI Accelerator (/team-build)").
**Status:** the words wait on Spring's review, so this ships on a pull request, stacked on D-111's (PR #24).
**Scope:** `apps/web/src/team-build/` (new: `content.ts`, `render.ts`, `team-build.css`, `render.test.ts`), `apps/web/team-build.html`, `apps/web/src/site/people.ts` (new: Meet Spring and Connor, shared with Home), `site.css` and `home.css` (its styles move to the site), `offers.css` (the lede and proof line, and in-text links), `SITE_PAGES` and `SALES_PAGES` (one line each), `routes/marketing.ts` (every sales page's trailing slash redirects to it), `scripts/check-css-colors.mjs`, the tests.

- **The page, in Spring's order:** the hero ("8 weeks. 8 skills. Built live with us.", "First build: Wednesday, December 2 at 1:00 PM Central.", the proof line, and a buy block); who it's for and who it's not for, with the waitlist; the weeks; how it runs and what you get; "Built inside our own business"; Meet Spring and Connor; the founding price; the questions. No testimonials (Spring's "Proof: Utah Life story and testimonials" keeps only its first half until real ones exist).
- **The weeks are the course brief's map,** each with its date, its operating question from the plan and its Library title: Week 0 before December 2 (AI Brain Setup, Sounds Like You: Your AI Voice Profile, Team AI Brain, with The Ops Time Audit), then Lead-Source ROI, Morning Brief, L10 Meeting Prep, FUB Pipeline Review, Agent 1:1 Prep, Team Playbook Builder, New Agent Onboarding Plan, and week 8's cohort-end review and 90-day plan. Not the draft list (no FUB Automation Audit, no Recruiting Prep as a week). Every skill the Library has is a link to its page. Morning Brief (D-108) and New Agent Onboarding Plan (D-109) are both in the Library under this page, so every skill on the map is a link; a test fails the day any item the map names is in the Library and still not linked.
- **The calendar is the locked one:** the eight Wednesdays (December 2, 9 and 16, January 6, 13, 20 and 27, February 3), Wednesday builds and Thursday office hours at 1:00 PM Central, 90 and 60 minutes, the goal planning Zooms on December 10 and 17, and nothing on December 23 or 30. A test checks each date is a Wednesday. This names a time of day that D-105's /offer copy still leaves open; /offer can take it from here once Spring has read it.
- **The buy block** is the same function in the hero and the price section: /offer's price for the Accelerator, the countdown ("19 days left at the founding price."), the seats ("15 of 15 seats left."), "Get Amplified AI Accelerator" and the two-payment link, with D-111's states: after November 30 the $9,997 next-cohort price and the waitlist, and at 15 sold the waitlist. Filled per request, no script.
- **Who it's for** follows the course plan's owner-and-operator pairing, in Spring's words ("the owner, who decides, and the ops lead, who runs it. One person can be both"), with its time budget said as an estimate (about 2 to 2.5 hours a week for the owner, 3 to 4 for the ops lead). Who it's not for: teams not on Follow Up Boss, and anyone who wants it built for them (Spring's "group delivery only").
- **No promises.** No results, closings or income claims; the plan's graduation standard is an operating standard and is not sold as an outcome. "Every build is recorded" is Spring's plan; the recordings themselves come with the course (D-110).
- **Spring and Connor** are one shared section now (`site/people.ts`), the homepage's words and photos, so Home, this page and /about cannot describe them two ways. Home is unchanged on screen.
- **Links in a sentence** ("Join the waitlist.", "Start with 5 free skills.", the week's skills) are plain inline links with 12px of padding above and below: a 45px tap target that wraps with its sentence instead of breaking a period onto its own line.
- **Tested:** web tests on the parsed DOM (the order, the hero's date and time, the buy block twice and identical, its tokens and states, who it's for, the nine weeks in order on Wednesdays with nothing on December 23 or 30, each flagship by its Library title and linked when it exists, the two new ones not linked until they land, the calendar, /offer's lines, the people, the questions, the tokens the API fills, the house rules including no "Jordan", no "Forum" and no draft names); API tests for `/team-build` served exactly on www and its trailing-slash redirect, and the route inventories. In Chromium against the built server on the marketing host: zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440, on `/team-build`, `/pricing` and `/`.

## D-113 · The Amplified Team Plan's sales page at `/teams`

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/teams`: `/api/offer` carts `agents-upto15` and `agents-16to40`. Waitlist after Nov 30. Owner view and agent invites. Agent skills open December 14." The page's parts and order are Spring's plan (`docs/SPRING-PLAN.md`, "Amplified Team Plan (/teams)"); the prices and dates are the live checkout's (D-104), as /offer says them (D-105).
**Status:** the words wait on Spring's review, so this ships on a pull request, stacked on D-112's.
**Scope:** `apps/web/src/teams/` (new: `content.ts`, `render.ts`, `teams.css`, `render.test.ts`), `apps/web/teams.html`, `site/offers.css` (ticked lists, two columns and the login line's two versions move there from /team-build), `SITE_PAGES` and `SALES_PAGES` (one line each), `scripts/check-css-colors.mjs`, the tests.

- **The page, in Spring's order:** "Let us train your team." with the founding countdown and the proof line; three sizes; what your agents get (the same as the Amplified Agent Plan, with the four-week training rotation from her plan) and what you get as the owner; how your agents join and how billing works; the questions; and the buttons, with over 40 going to a conversation.
- **The sizes.** Up to 15 and 16 to 40 each sell through their cart (`agents-upto15`, `agents-16to40`), filled per request like /pricing: $1,491 or $2,391 today for the first 3 months (January 4 to April 3, 2027), then $497 or $797 a month from Sunday, April 4, 2027. Both buttons read "Get Amplified Team Plan" and each names its size to a screen reader. The monthly owner call is on 16 to 40 only. Over 40 is "Custom" and "Let’s Talk", to `TEAM_CALL_URL` or an email to support (D-105). A test holds every number to /offer's words.
- **After November 30** the two founding sizes say "Founding prices ended ... Join the waitlist to hear what’s next." with the waitlist button (Connor, 2026-11-10), and the hero's countdown becomes the same line. No price after founding is named: that stays open.
- **How agents join:** you buy (your login comes on Monday, November 16 while invites are held, then within a few minutes); you invite your agents by email from your account; Monday, December 14, their skills and the starter path open with the 5 free skills (`AGENTS_SKILLS_FROM`, which a test checks); the week of January 4, weekly training starts. The training's day and time stay open.
- **Billing:** the first 3 months today, then monthly from April 4, then month to month (Spring's "3 month minimum, then month to month").
- **Promised here, not built yet (for Ampy, from the LMS wiring report, D-106):** the owner's "view of who’s using it" does not exist in the LMS, and the Team Hub still caps a team at 1 ops lead and 5 agents (D-081 not built) against the 15 or 40 sold. Both are Spring's plan and /offer's existing terms, so the page keeps them; both need building before agents start on December 14.
- **Tested:** web tests on the parsed DOM (the order, the countdown and its closed line, the three sizes' carts, tokens, buttons and accessible names, the numbers against /offer, the waitlist after founding, the owner call on 16 to 40 only, agents getting the Agent Plan's lines, December 14 against the access rule, the login line before and after the hold, the questions, the end, the tokens the API fills, the house rules including no "January 26" and no "nothing is charged today"); API tests for `/teams` served exactly on www with its trailing-slash redirect, and the route inventories. In Chromium against the built server on the marketing host: zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440, on `/teams` and `/team-build`.

## D-114 · The Amplified Agent Plan's sales page at `/agents`, its buttons wired to the Agent Plan's carts

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/agents`: $79/mo or $790/yr, first charge January 4, 2027, cancel anytime. Wire buttons to the Agent Plan carts." The page's parts and order are Spring's plan (`docs/SPRING-PLAN.md`, "Amplified Agent Plan (/agents)" and "How each program runs").
**Status:** the words wait on Spring's review, so this ships on a pull request, stacked on D-113's. It sells only once the LMS wiring (D-106, PR #23) is on `main` and Ampy has set `PAYMENT_LINK_AGENT_MONTHLY` and `PAYMENT_LINK_AGENT_YEARLY`.
**Scope:** `apps/web/src/agents/` (new: `content.ts`, `render.ts`, `agents.css`, `render.test.ts`), `apps/web/agents.html`, `site/offers.ts` and `offers-content.ts` (the Agent Plan card's carts), `site/offers.css` (numbered steps, the buy block and a page's end move there), `apps/web/src/offer/` (the Agent Plan's thank-you section), `SITE_PAGES` and `SALES_PAGES`, `scripts/check-css-colors.mjs`, the tests.

- **The page, in Spring's order:** the hero ("AI for your leads, listings and buyers. Trained live every week.") with the buy block; your first week, the recorded starter path (AI Brain Setup, Sounds Like You, then three agent skills); one live training a week, her four-week rotation as a calendar, each week's three skills by their Library titles and linked to their pages; office hours, and what happens after you buy; the questions; the final button and "Not ready? Start with 5 free skills."
- **The buttons are the Agent Plan's carts,** `agent-monthly` ("Get Amplified Agent Plan") and `agent-yearly` ("Or pay $790 a year"), here and on /pricing's card, which D-111 left at "Opens soon.". The carts come with D-106, so on a `main` without it the API knows no such cart, fills their tokens with nothing, and the page says "Opens soon." with no dead button; with it, and their Payment Links set, they sell like any other cart, with nothing more to change here. The price block is the card's own words (`AGENT_PLAN`): $79 a month, or $790 a year, first charge Monday, January 4, 2027, cancel anytime.
- **The thank-you page names the plan.** /offer/welcome (D-105) gains an Amplified Agent Plan section, shown when the confirmed order's plan is `agent_plan` (D-106's kind): the login, "Your card is saved. Your first charge is Monday, January 4, 2027, when your agent skills open." (D-106's own words for what the LMS does), the week of January 4, office hours and the plan's terms. No receipt line (nothing is charged yet) and no intake form (none exists for this plan). Without this, an Agent Plan buyer would have landed on a page with no section for them.
- **Left open:** the weekly training's day and time ("Weekly, starting the week of January 4."); a test fails if a weekday and time appear. Office hours are "every Thursday, 60 minutes" with no time named, since the 1:00 PM Central the course brief locked is the Accelerator's.
- **A team's agent** is sent to the Amplified Team Plan in the questions ("the same skills and training, and your owner pays less per agent"), Spring's "the same product, priced by seat".
- **Tested:** web tests on the parsed DOM (the order; the price and its terms; January 4, 2027 a Monday; both carts' tokens on the buy block and on /pricing's card, and "Opens soon." for an empty state; the starter path's links; the four weeks' twelve skills by Library title; the login line before and after the hold; the questions; the tokens the API fills; the house rules); the welcome page's new section (its heading and charge line, no receipt, no intake) and its stylesheet rule; API tests for `/agents` served exactly on www with its trailing-slash redirect, and the route inventories. In Chromium against the built server on the marketing host, without D-106 (so "Opens soon."): zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440, on `/agents`, `/pricing` and `/teams`. **Not tested:** the page with D-106 merged and live Payment Links.

## D-115 · The Library: the free five, every other skill and template locked, Track and Who filters, and the site's nav

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/library`: Show all 56. Free five: AI Brain Setup; Sounds Like You: AI Voice Profile; AI Brain Tune-Up; Perfect Week; Inbox and Meeting Follow-Through. Lock the rest. Add Track and Who filters." and "Locked-skill buttons: 'Buy this skill for $37' or 'Get Amplified Insiders.'" ("Fold in PR #19 (Library rename; rebase or supersede)", and Ampy's launch watch, 3:20 AM Central: "/library (all 56, free 5, Track and Who filters)"). The page's parts are Spring's plan (`docs/SPRING-PLAN.md`, "The Library and gating").
**Status:** the words wait on Spring's review, so this ships on a pull request. It supersedes PR #19 (D-103), whose commit it carries.
**Scope:** `packages/core/src/skills.ts` (`FREE_SKILLS`), `packages/core/src/grok-templates.ts` (`FREE_GROK_TEMPLATES`), `apps/web/src/guides/` (the locked card's words and `unlockFor`), `apps/web/src/library/` (content, render, the filter script, the stylesheet), `docs/LAUNCH.md`, the tests that pinned the old free lists.

- **The free five, and only them.** `FREE_SKILLS` is AI Brain Setup, AI Brain Tune-Up, Perfect Week and Inbox and Meeting Follow-Through; Sounds Like You is a guide and stays free as it is. Locked now, free before: Appointment Follow-Up, Database Health Check and Team P&L Review (D-082), and the four Grok Bot templates Weekly Card & Bank Audit, Quarterly Tax & Profit-First Set-Aside, Contract-to-Close Deadline Tracker and New Contract Intake (D-100). No template is free. AI Brain Setup stays free (D-101).
- **What it changes on the server, for Ampy.** Fails closed as before: a locked skill's ZIPs stop being public files on www (`PAID_DOWNLOADS`, `PAID_GROK_DOWNLOADS`), and the three newly free skills' ZIPs are served from `/downloads`. **After this deploys, staff rerun `pnpm --filter @ai/api skills --upload`** (LAUNCH.md, step 3) so the table's free flags match and every newly locked ZIP is in the bucket; until then a member could not download the seven newly locked items in the platform. Never run from here.
- **A locked skill's page** says "Get this skill" and sends to the plan that opens it, by its set: Amplified Insiders ("Get Amplified Insiders", `/pricing#insiders`) for owner and ops skills and skills for both, and the Amplified Agent Plan ("Get Amplified Agent Plan", `/pricing#agent-plan`) for an agent-only skill or template, because Insiders opens the owner and ops set only (PLAN_SETS, D-104; D-106's report). Both are the brief's exact plan names. A test holds every paid page to its set. **"Buy this skill for $37" is not on the page:** there is no single-skill cart (a gap for Ampy). "Amplified Skill Library", a retired name, is gone from the card and the Library; the setup's file button reads "Download After You Sign In".
- **The Library page** wears the site's header (Spring's nav, The Library marked) and footer above and below its forest hero, then "Start with 5 free skills": the free five in her order, each a link tagged Free. That is what "Get 5 Free Skills" (`/library?show=free`) lands on, with or without a script. Every card says Free, Free Resource (the guides and kits, Spring's lead magnets, separate from the five) or Locked, in words, and a locked card has a lock where its arrow was. All 56 stay listed.
- **Spring's two filters**, beside the tool and topic pills: Track (Real Estate, General) and Who (Agents, Team Owners). Who is each skill's or template's set in its catalog, and each guide's from Spring's Free Resources table (`GUIDE_WHO`). General is the free five and the general skills Spring names (Team P&L Review, L10 Meeting Prep); the rest are Real Estate (`GENERAL_TRACK`, `[OPEN]` for Spring and Connor to extend). The script filters any row by its `data-` attribute.
- **Legibility:** the Library's text is 16px or more (its tags, labels and notes were 12px to 15px), per Spring's phone rule.
- **Not changed:** the skill pages' layout (D-071), whose eyebrow at 12px and two footer links under 44px predate this; and `/appointment-follow-up` at 320px, where that eyebrow's letter-spacing overflows the screen by 2px now that the card is locked. Spring's "rewrite every skill card and skill page" (Phase 3) is where those change. Grok Bot stays in the Library (`[OPEN]`).
- **Tested:** core, web and API suites, with the old free lists' tests rewritten to the new ones (16 paid templates, the free five and the catalog's list held together, every card's access word, the locked card's plan by set, the filters' rows and data, the free five first, the site's header and footer, no retired name). In Chromium against the built server on the marketing host: `/library` and `/library?show=free` with zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440.

## D-116 · Free Resources at `/free`

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/free`: Link `/voice-profile`, `/ai101`, `/ops-time-audit`, `/retool`, `/task-sync-starter`, and `ai.springb.co`." Spring's plan: "Free Resources (/free): two columns, For Agents and For Team Owners. Each resource opens its own opt-in", and "Keep the existing /voice-profile page and AI 101 registration (ai.springb.co) and link both from Free Resources."
**Status:** the words wait on Spring's review; on a pull request, stacked on D-114's.
**Scope:** `apps/web/src/free/` (new), `apps/web/free.html`, `SITE_PAGES` and `SALES_PAGES` (served like the sales pages, with no token), `scripts/check-css-colors.mjs`, the tests.

- **Two columns, Spring's.** For Agents: Sounds Like You (the voice profile), AI 101 for Agents (`/ai101`) and "Register for AI 101" (`https://ai.springb.co`). For Team Owners: The Ops Time Audit, the Task Sync Starter Kit and Retool, Don't Replace. Each card is its Library card's title and line, so this page and the Library cannot name one two ways, and the whole card is the link to the resource's own page, where its opt-in is. The homepage lists the same five (a test holds the two together).
- **The 5 free skills are not these:** a section points to them ("Get 5 Free Skills", `/library?show=free`) and to the programs. No GoHighLevel tags or new opt-ins are built here; each page's existing opt-in stands (Spring's per-resource opt-in pages and their agent/owner question are a later step, with Connor's GHL work).
- **Tested:** web tests on the parsed DOM (the columns, exactly the six links the brief names, each by its Library card and never locked, the homepage's same five, the two buttons, no script or token, the house rules); API tests for `/free` on www exactly and its trailing-slash redirect, and the route inventories. In Chromium against the built server on the marketing host: zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440.

## D-117 · About at `/about`: Spring and Connor, the Utah Life story, and why we built this

**Date:** 2026-11-11
**Approved by:** Connor, via the PM (Ampy) in chat on 2026-11-11, the overnight brief: "`/about`: Spring and Connor, the Utah Life story, why we built this. Use the bios." with the draft bios, and "Do not mention 'Forum' on public pages." Spring's plan: "About (/about): Spring as the face, Connor as co-founder, the Utah Life story, why we built this."
**Status:** the words wait on Spring's review; on a pull request, with D-116.
**Scope:** `apps/web/src/about/` (new), `apps/web/about.html`, `SITE_PAGES` and `SALES_PAGES`, `scripts/check-css-colors.mjs`, the tests (and `marketing.test.ts`, whose `/about` to the homepage redirect is gone now that it is a page).

- **Spring first, then Connor**, each with their own photo (Spring's Live Utah portrait, `spring-bengtzen-2.jpg`, here; the homepage uses her other one) and the brief's bio **word for word, with one cut**: Spring's "founded The Forum and Activated Agents" reads "founded Activated Agents", because no public page may say "Forum". A test holds both bios to the brief's text.
- **The Utah Life story** carries the homepage's proof line ("Built inside The Utah Life Real Estate Group", "100 agents, 700+ homes a year") and says no more than Spring's plan does: an eXp Realty team in Farmington with mortgage, title and coaching beside it, "where we put AI to work first". **Why we built this** is Spring's positioning in her voice: AI doing real work, built into how we run, written down as skills and taught live, real estate first because it's the business we know. No testimonials, no results claims.
- **Tested:** web tests on the parsed DOM (the order, the photos from this site, both bios against the brief's, the proof line, the buttons, no "Forum", no script or token, the house rules); API tests as for `/free`. In Chromium against the built server on the marketing host: zero axe violations, no sideways scroll, no text under 16px and no tap under 44px at 320, 390, 768 and 1440.

## D-118 · The prototype's post-cohort card says "your instructor", not an invented name

**Date:** 2026-11-11
**Approved by:** the PM (Ampy) in chat on 2026-11-11: "yes, remove the second "Jordan Hale" from the demo card and regenerate that golden. The name must never ship anywhere." (and earlier, 3:20 AM Central: "replace the 'Jordan Hale' fallback host in apps/web/src/routes/portal/Dashboard.vm.ts with an empty string or "Your instructor". We never ship that name.")
**Status:** a reference change, so it goes through this entry and a re-capture, never a hand edit.
**Scope:** `design-reference/Portal Dashboard.dc.html` (the post card's `host`), `apps/web/src/routes/portal/Dashboard.vm.ts` (the prototype branch's `host`), its test, and the `dash-agent-post` goldens, re-captured with `pnpm compliance:capture`.

- **The change.** After a prototype cohort ends, the dashboard's office-hours card named "Jordan Hale", a name the prototype invented. It now says "your instructor", the same words the production card uses when no module names an instructor (`INSTRUCTOR_FALLBACK`, D-110). One string in the reference, the same string in the port, and the two `dash-agent-post` goldens that render it. Nothing else on the card moves.
- **Not changed, for Ampy and Connor to decide.** The same invented name is still the prototype's instructor on its six modules and the staff list (`design-reference/lms-data.js`, `packages/core/src/seed.ts` and its fixtures), so the demo seed's session cards say "with Jordan Hale" in fixture mode and in about thirty goldens. It is never in production data (`seedProduction` names Connor Leiva). Scrubbing it is a wider reference change and a wider re-capture, so it waits on a yes.
- **Lowercased, 2026-11-11.** Ampy, 7:25 AM Central: "Yes, lowercase to "your instructor"." The words only ever end a sentence ("Drop-In Build Help with your instructor"), so the reference, the port and the two `dash-agent-post` goldens were changed again the same way: the reference first, then a re-capture in CI's image.

## D-119 · A plan that opens no AI Employee: the portal is the Skill Library

**Date:** 2026-11-11
**Approved by:** the PM (Ampy) in chat on 2026-11-11, 5:25 AM Central: "Portal plan-awareness (#23 gap 4): make sure Insiders, Team Plan and Agent Plan buyers never see the Accelerator builds or course anywhere in the portal. #29 says acceleratorOpen covers snapshot, join, /api/course and reminders; confirm Dashboard and Sessions too, and fix any leak." The way it is fixed below is this pull request's, for Ampy's review.
**Status:** on a pull request.
**Scope:** `apps/web/src/shell/` (`navModel.ts`, `AppShell.tsx`), `apps/web/src/routes/library/SkillLibrary.tsx`, `apps/web/src/routes/portal/TeamHub.*`, `apps/api/src/routes/skills.ts`.

- **What was confirmed.** The course never reaches these buyers: `scopeSnapshot` drops its modules and sessions (D-110), so the Dashboard and Sessions show no build, no Zoom link and no course link, and `/course` says it is not in their plan.
- **What leaked instead.** With nothing in the snapshot, the portal fell back to the prototype. Signed in as an Amplified Insiders, Team Plan or Agent Plan buyer against a launch-seeded database:
  - the Dashboard showed "Progress 0 of 0" and the prototype's Quick Links ("Cohort Community · 148 members · 23 new posts today", "Office Hours · Wednesdays · 11:00 AM CT");
  - Sessions listed Wednesday 11:00 AM office hours that do not exist, dated relative to today, one marked "Recording Posted";
  - the sidebar header said "December 2026 Cohort · Starts Dec 2".
  None of it is theirs, and none of it is real.
- **The rule.** A learner whose snapshot holds no AI Employee has no portal of their own (`hasPortal`). Every prototype learner has six and every AI Accelerator learner nine, so the demo, its goldens and the course are untouched.
  - **Where they go.** The Dashboard, Sessions, any AI Employee, Team Tier and anything else in the shell send them to `/skill-library`, the page their plan bought. That includes sign-in, which lands on `/`.
  - **What they keep.** The Team Hub, which is where an Insiders or Team Plan owner invites their people, and the Resource Vault.
  - **Their sidebar** shows Skill Library, Team Hub (Team tier, as before) and Resource Vault. It has no Dashboard, Sessions or AI Employees, and no cohort line under the logo.
  - **The Team Hub's line** reads "{team} · Team Tier", without "December 2026 Cohort".
- **One new link.** The Skill Library is outside the shell and had no way back into it. It now shows "Open Team Hub" beside "Manage Billing" for a Team tier learner (`GET /api/skills` says `teamHub`, by the same rule the sidebar uses). An Agent Plan buyer, at Agent tier, has no Team Hub and gets no link.
- **Not added.** No placeholder for agent coaching (Ampy: show nothing until Connor decides), and no other new copy.
- **Tested:**
  - The nav model: rows, rail groups and every redirect, for a learner with and without a portal.
  - The Skill Library's link, for both cases.
  - Each of the eight carts' `/api/skills` `teamHub` against its tier.
  - The Team Hub's line.
  - In Chromium against the real API (an http build over a launch-seeded database, one buyer per plan, at 390 and 1280):
    - Insiders, Team Plan and Agent Plan land on the Skill Library from `/`, `/sessions`, `/team-tier` and an AI Employee's URL.
    - The Team Hub and the Vault open for Team tier.
    - The AI Accelerator buyer's portal is unchanged.
    - Zero serious or critical axe violations.

## D-120 · Seats by plan, built: the Team Plan's 15 or 40 agents in the Team Hub

**Date:** 2026-11-11
**Approved by:** Connor, D-081 (2026-11-10, "Seats by plan"); the PM (Ampy) in chat on 2026-11-11, 5:25 AM Central: "Team Plan seats (#23 gap 5): lift the Team Hub cap so an owner can add up to the plan's seats (15 or 40 agents), with tests."
**Status:** on a pull request.
**Scope:** `packages/core/src/seats.ts` (new), `inviteMember` in `packages/core/src/mutations.ts`, `apps/web/src/routes/portal/TeamHub.vm.ts` and `TeamHub.module.css`, `docs/LMS-DELIVERY.md`.

- **The rule (`seatCaps`, one function for the mutation and the screen).** A team's seats come from its plan (D-078): the Team Plan's 16 or 41, and 2 for Amplified Insiders and the AI Accelerator. They are shared:
  - one Team Owner;
  - at most one Operations Lead;
  - every other seat a Sales Agent: the seats, less the owner's, less an operations lead's when the team has one.
  So a Team Plan owner adds 15 or 40 agents, or 14 or 39 alongside an operations lead. The seat count ("All seats are assigned. Remove a seat or contact us to add more.") stays the limit that stops a full team.
- **The prototype reads as before, so no golden moves.** D-081 expected to re-capture the Team Hub goldens; this does not need to. The prototype's teams have seven seats and an operations lead, which this rule turns into the same five agents: "Agents 4 of 5", "4 of 5 used", every seat slot.
  - The one edge that differs from the reference: a prototype team that removes its operations lead can now fill that seat with a sixth agent rather than leave it empty.
  - The differential suite does not cover invites.
- **The Team Hub handles 41 seats.** The seat row wraps (`flex-wrap`) instead of running off the side of the card. The prototype's seven fit on one row as before.
- **Tested:**
  - `seatCaps` for 7, 16, 41 and 2 seats, with and without an operations lead.
  - `inviteMember` on a widened prototype team.
  - The Team Hub's breakdown, role caps, seat note and slot count for 16 and 41 seats.
  - Through the API on a real purchase of each Team Plan size: the owner invites 15 or 40 Sales Agents, and the next one is refused with the seat count's message.


## D-121 · `GET /api/health/curriculum`: is the AI Accelerator's curriculum in the database, as counts

**Date:** 2026-11-11
**Approved by:** the PM (Ampy) in chat on 2026-11-11, 6:30 AM Central: "confirm, without handling or printing any secret, whether production now has cohort dec26 and the 9 modules, e.g. by signing in as a test Accelerator buyer on learn.amplifiedimpact.io or via a safe read-only admin endpoint". The open route, rather than a staff-only one, is this pull request's choice, for Ampy's review.
**Status:** on a pull request.
**Scope:** `apps/api/src/routes/curriculum-status.ts` (new), one line in `apps/api/src/app.ts`, the route table in `apps/api/test/authz.test.ts`, tests in `apps/api/test/course.test.ts`.

- **Why it exists.** The pre-deploy command applies the curriculum once (`db:curriculum:ensure`, D-110, set in Railway by hand), and Railway's logs did not show that step's output. Nobody outside the database could tell whether production has the course without signing in, and a sign-in for a test buyer would mean a real account and an emailed link.
- **What it answers.** With no session:
  - `ok`;
  - `cohort`: whether cohort `dec26` exists;
  - `modules` and `published`: how many of the nine course modules exist, and how many are published;
  - `sessions`: how many sessions the cohort has;
  - `expected`: 9 modules and 16 sessions.

  `ok` is true when all of them match. Nothing else: no names, dates, links, text or learner data. It reads only those course rows, never users, teams, progress, staff, orders or plans. The same facts (one cohort, nine weeks, sixteen sessions) are public on /team-build.
- **Why open, and not on `/api/health`.** Open so it can be checked from anywhere after a deploy, like `/api/health` and `/api/offer`. Gate 7's 401 rule lists the open exceptions, and this is one more, in the route table with this entry. It is not folded into `/api/health` itself: that is Railway's healthcheck and touches nothing, so a slow database can never fail a deploy through it.
- **Tested:**
  - On a database with the curriculum it answers `ok` with 9, 9 and 16, and exactly those keys.
  - It answers not ok, with the short count, before the curriculum is applied and after staff draft one week.
  - It needs no cookie, and the route table classifies it as open.

## D-122 · `GET /api/health/library`, and `S3_URL_STYLE`: is a Skill Library download link resolving?

**Date:** 2026-11-11
**Approved by:** the PM (Ampy) in chat on 2026-11-11, 7:25 AM Central: "(b) check the S3 client works with a Railway bucket's virtual-hosted URL style (not path-style), and fix it if not; (c) confirm with a safe read-only check (no secrets printed) that a Skill Library download link resolves for a paying plan." The open route, like D-121's, is this pull request's choice, for Ampy's review.
**Status:** on a pull request.
**Scope:** `apps/api/src/storage.ts` (`S3_URL_STYLE`, `listKeys`, `storageUrlStyle`), `apps/api/src/routes/library-status.ts` (new), one line in `apps/api/src/app.ts`, the route table in `apps/api/test/authz.test.ts`, `apps/api/src/storage.test.ts`, `apps/api/test/library-status.test.ts` (new), `docs/LAUNCH.md` § 2.

- **The URL style.** The client forced path-style addressing (§ 8.2), so it could not address a bucket in the host.
  - Railway's docs say its buckets created since its move to virtual-hosted URLs are addressed in the host, older ones in the path, and each bucket's Credentials tab says which.
  - Production's new `skills` bucket took the 2026-11-11 pre-deploy's path-style uploads.
  - So path stays the default, and `S3_URL_STYLE=virtual` (validated with the other `S3_*` variables; anything else is refused by name) addresses a dotless bucket in the host.
  - With a dot in the name the SDK keeps it in the path either way, which is what § 8.2 guarded against.
- **The check.** A download is the plan check, then `presignGet` on the file's key, then a 302 to that link. Proving it end to end from outside needs a paying buyer's session; the plan check is pinned per cart in `offer.test.ts`. This checks everything after it, with no session:
  - how many of the catalogs' `skills` rows are published;
  - how many of the catalogs' 122 ZIPs are in the bucket (a listing by name; no object is read);
  - one real link: `presignGet` for a paid skill's Claude file, exactly as the route calls it, fetched for one byte (`Range: bytes=0-0`). Only the status code comes back.
- **What it never says.** It returns counts, the URL style, that status, and a fixed word for a failed step: never the link, a key, a credential or an error message. Its answer is kept for a minute, so a loop of calls cannot become bucket traffic. Like `/api/health/curriculum` (D-121) it is open, one more exception to Gate 7's 401 rule, classified in the route table.
- **Tested:**
  - `ok` with every row, every ZIP and a 206.
  - Not ok for a missing ZIP, a 403, unpublished rows, or no `S3_*` settings (and then it touches nothing else).
  - Each failed step named by its word, with no message, link or credential in the answer.
  - The sample is a paid skill's file.
  - The route answers with no session.
  - `S3_URL_STYLE`: path by default, virtual puts a dotless bucket in the host and still signs, and anything else is refused.

## D-123 · The programs' own pages, linked: /pricing's cards and table, a Programs menu, the footer

**Date:** 2026-11-11
**Approved by:** Connor, relayed by the PM (Ampy) on 2026-11-11 as its own small PR, first: "/pricing has no links to the individual offer pages. Today it links only to /library." Asked for: a "See full details" link next to each card's buy button (the Accelerator to /team-build, the Team Plan to /teams, the Agent Plan to /agents, Insiders to /library); each program name in the comparison table's header linked to its page; the main nav's Programs as a dropdown (a tap menu on mobile) listing the four and "Compare all programs" (/pricing); the same four links in the footer; a test that /pricing links to /team-build, /teams and /agents; the checkout buttons and prices unchanged.
**Status:** on a pull request.
**Scope:** `apps/web/src/site/content.ts` (`PROGRAM_PAGES`, `PROGRAMS`, the nav's Programs menu, `footer.programsLabel`), `apps/web/src/site/render.ts` (`siteHeader`, `siteFooter`), `apps/web/src/site/site.css`, `apps/web/src/site/offers.ts` (`SEE_DETAILS`, `CARD_PAGES`, `offerActions`' `details`), `apps/web/src/pricing/render.ts` (the table's header), and their tests.

- **One list.** `PROGRAM_PAGES` and `PROGRAMS` in `site/content.ts` hold the four pages, in Connor's order, by `PLAN_NAMES`. The menu, the footer, the cards and the table read them, so no two can disagree.
- **Labels in Title Case**, as the house rule says (D-048): "See Full Details", "Compare All Programs".
- **The menu is a `<details>`.** www has no script (D-107), so a tap, a click or Enter opens it and closes it, and a link inside goes to its page. No `role="menu"`: it's a list of links, read as one. It floats under Programs, inside a 320px screen, with 48px links at 16px, on the page's surface and shadow tokens.
- **Where you are.** A program's page marks its menu link with `aria-current="page"` and underlines Programs while the menu is closed (`data-current`). On /library, The Library is marked, once, not the menu's Amplified Insiders too.
- **The cards.** "See Full Details" sits under each card's buttons in every state (link, opens soon, closed, sold out), so a card that cannot sell still points to its page. `aria-describedby` names its program, since four links share one name. /team-build's own price block, which is that page, doesn't get one.
- **The table.** Each program's name in the header links to its page, with the site's 44px text-link room. The header shows from 960px; on a phone the table stacks and the cards carry the links.
- **The footer** gets a Programs column with the four links. The Site column keeps Home, Programs (/pricing), The Library, Free Resources and About.
- **Unchanged:** every buy button's Payment Link token, every price, the picker and its anchors. A test pins the buttons' tokens and the four amounts.

## D-124 · The welcome page's calendar files, served by www, and its starter path links

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), the offer-pages polish brief of 2026-11-11, item 1 (calendar `.ics` files and the `/offer/welcome` fixes), shipped as its own pull request.
**Status:** on a pull request.
**Scope:** `apps/api/src/routes/offer-calendar.ts` (new), `apps/api/src/routes/offer.ts` (two routes and the welcome page's calendar values), `apps/web/src/offer/content.ts` and `render.ts` (the starter path's link), the route table in `apps/api/test/authz.test.ts`, their tests, and `docs/LAUNCH.md`'s `CALENDAR_URL_*` row.

- **Two open routes on www,** like the sprint's calendar: `GET /calendar/builds.ics` (the Accelerator's eight Wednesday builds, 1:00 to 2:30 PM Central) and `GET /calendar/office-hours.ics` (the eight Thursdays, 1:00 to 2:00 PM Central, with Dec 10 and Dec 17 titled as the goal planning sessions). Both are `text/calendar`, built from `ACCELERATOR_CALENDAR`, so the files and the course share one set of dates. No events on Dec 23, 24, 30 or 31.
- **Central time, not floating:** every event carries `TZID=America/Chicago` and the file carries that zone's VTIMEZONE.
- **No join link.** No Zoom or Meet URL and no "TBA": each description says the link comes by email and will be in the LMS at learn.amplifiedimpact.io.
- **Never an empty button.** The welcome page's calendar buttons link these files. A `CALENDAR_URL_*` variable still overrides.
- **The starter path's link,** on the LMS host: "Open Your Course" for the Accelerator (Week 0), "Open the Skill Library" for Insiders, with the first steps named for the Team Plan and the Agent Plan. The intake button stays hidden while no form URL is set.
- **Classified** in the route table as open pages, with every other public page.

## D-125 · /pricing: the owner's second card, proof under every card's buttons, the single-skill answer, a share image

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), the offer-pages polish brief of 2026-11-11, item 2: "/pricing: picker Team Plan target, proof next to each card's buttons, single-skill FAQ, share image."
**Status:** on a pull request, stacked on D-123's (it changes the same card code).
**Scope:** `apps/web/src/pricing/content.ts` (`PICKER`, the FAQ's last answer), `apps/web/src/pricing/render.ts`, `apps/web/src/pricing/pricing.css`, `apps/web/src/site/offers.ts` (`proofLine`, `SHARE_IMAGE`, `offerActions`' `proof`), `apps/web/src/site/offers.css`, and the page's tests.

- **The picker.** "I Own a Team" still lands on the Amplified AI Accelerator, and a link under it, "Or the Amplified Team Plan", lands on the Team Plan's card. The hint says "Amplified AI Accelerator", so together the two say what the hint said before. The cards keep Spring's order.
- **Proof under every card's buy buttons:** "Built inside The Utah Life Real Estate Group" and "100 agents, 700+ homes a year", the homepage's words, from one helper (`proofLine`) the other sales pages can reuse. It sits in the block the stylesheet shows only for a live cart, so it shows exactly when the buttons do.
- **"Can I buy one skill?"** now answers, word for word from the brief: "Not right now. Single-skill checkout is not open. If you want every owner and ops skill, Amplified Insiders includes them. Anyone can start with the 5 free skills." with the Library link. No "$37" and no "opens soon" anywhere on the page. The other six answers are unchanged.
- **The share image** is the homepage's, Spring's real headshot (`/img/team/spring-bengtzen.jpg`, 890 by 1113, alt "Spring Bengtzen"), so `twitter:card` is `summary_large_image`. No new graphic.
- **Unchanged:** prices, Payment Link tokens, the founding banner, the comparison table, `/agreement`.

## D-126 · /team-build: recordings in the Library, proof under the price section's buttons, a share image

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), the offer-pages polish brief of 2026-11-11, item 3: "/team-build: recordings line, proof on the bottom price block, share image."
**Status:** on a pull request, stacked on D-125's (it reuses `proofLine` and `SHARE_IMAGE`).
**Scope:** `apps/web/src/team-build/content.ts` (`HOW`'s Recordings line), `apps/web/src/team-build/render.ts`, and the page's tests.

- **Recordings.** "Every build is recorded, and the recordings live in the Library. A missed week isn’t a lost week." (Spring: "recordings in the library".)
- **Proof under the price section's buy buttons.** `buy()` takes `proof`, and only the price section's block passes it: the hero's proof already sits beside the hero's block, so the hero doesn't show it twice. The two blocks still come from one function, with the same prices, states and links; the test now says "identical but for the proof line".
- **The share image** is the homepage's, Spring's real headshot, so `twitter:card` is `summary_large_image`.
- **Unchanged:** the week-to-skill map (Week 0 and the eight flagships), the calendar, the FAQ, prices and Payment Link tokens.

## D-127 · /agents: office hours at 1:00 PM Central, proof under the closing button, a share image

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), the offer-pages polish brief of 2026-11-11, item 4: "/agents: office hours time, proof on the closing button, share image."
**Status:** on a pull request, stacked on D-126's.
**Scope:** `apps/web/src/agents/content.ts` (`OFFICE_HOURS.body`), `apps/web/src/agents/render.ts`, `apps/web/src/site/offers.css` (the proof under a closing button), and the page's tests.

- **Office hours:** "Every Thursday, 1:00 PM Central, 60 minutes. Drop in with a real file and get help." The next line stays: "Every session is recorded, so you’re never behind."
- **The weekly training's day and time stay open.** It still says "Weekly, starting the week of January 4.", and a test keeps any weekday or clock time out of the rotation section.
- **Proof under the closing "Get Amplified Agent Plan" button**, from the shared `proofLine()`. The hero's proof beside the buy block is unchanged.
- **The share image** is the homepage's, Spring's real headshot, so `twitter:card` is `summary_large_image`.
- **Unchanged:** prices, carts, the invite-hold pairing (`data-invites`), the FAQ. No testimonials, no Meet section.

## D-128 · /teams: office hours at 1:00 PM Central, proof under the paid sizes' and the closing buttons, a share image

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), the offer-pages polish brief of 2026-11-11, item 5: "/teams: office hours time, proof next to tier and closing buttons, share image."
**Status:** on a pull request, stacked on D-127's.
**Scope:** `apps/web/src/teams/content.ts` (`AGENTS_GET`'s office hours line), `apps/web/src/teams/render.ts`, and the page's tests.

- **What your agents get:** "Weekly office hours, Thursdays at 1:00 PM Central, 60 minutes". The weekly training's day and time stay open.
- **Proof under the two paid sizes' buy buttons** (up to 15, 16 to 40), inside the block the stylesheet shows only for a live cart, and **under the closing "Pick Your Team Size" button**, from the shared `proofLine()`. The hero's proof is unchanged.
- **Over 40** keeps its conversation: the "Let’s Talk" button and the closing "Let’s talk" link both stay on the existing `team-call` token. No new booking URL.
- **The share image** is the homepage's, Spring's real headshot, so `twitter:card` is `summary_large_image`.
- **Unchanged:** prices, carts, the founding switch to the waitlist, December 14, the 3 month minimum, the FAQ.

## D-129 · The console's Owner comes with every deploy: `db:owner:ensure` in the pre-deploy command

**Date:** 2026-11-11
**Approved by:** Connor, 2026-11-11: "open a PR that makes the owner account part of the Railway pre-deploy, the same way db:curriculum:ensure works: after db:migrate and db:curriculum:ensure, run db:owner idempotently for owner name 'Connor Leiva' and email connor@springb.com (read them from non-secret env vars OWNER_NAME / OWNER_EMAIL with those values as the documented defaults, or hardcode them, your call). It must be a no-op if the Owner already exists, must never fail the deploy if the owner exists as someone else (log and skip)." His correction the same evening: "skip the learner enrollment ... The pre-deploy step should only create the Owner (Connor Leiva, connor@springb.com) idempotently; Staff preview already opens Week 0 to 8."
**Status:** on a pull request. The pre-deploy command is set by hand in Railway (LAUNCH.md § 6), so it takes effect only once the dashboard's string matches the file's.
**Scope:** `apps/api/src/db/seed.ts` (`DEPLOY_OWNER`, `ensureOwner`, `ownerEnsureLine`, the `--owner-ensure` mode, `OwnerRefused.reason`), `apps/api/package.json` (`db:owner:ensure`), `.railway/railway.ts` (the pre-deploy string), `docs/LAUNCH.md` § 6 and § 8, `apps/api/test/owner.test.ts`, `apps/api/test/seed-cli.test.ts`.

- **Why.** Production has buyers and never had the launch seed, so it has no Owner, and nobody can sign in to the console. `db:owner` (by hand) exists, but nobody will run a command in a production shell. The deploy can.
- **Hardcoded, not read from the environment.** `DEPLOY_OWNER` is Connor Leiva, `connor@springb.com`, in the code. The launch seed's rule holds: an Owner inherited from a shell, a .env or a Railway variable is how production ends up owned by the wrong address. Changing it is a pull request; once an Owner exists, it is changed from Staff & Roles.
- **The same writes as `db:owner`:** the Owner, and the staff role matrix only if that table is empty. No learner, team, order, plan, seat, progress, course, price or reminder row. A test counts `accounts`, `plans` and `orders` before and after.
- **Idempotent.** Already the Owner: "Owner: already set. Nothing was written." on every later deploy.
- **Never fails the deploy.** A different Owner, the address on another account, or any error: one log line saying which, nothing written (one transaction), exit 0. A test runs the real CLI against Postgres and checks the exit code.
- **Names no one in the log.** The line never has the name, the address or the database name, because the deploy log is kept by Railway (the "never log names or emails" rule). `OwnerRefused` now carries a `reason` word for this; its messages, which name the address, are only for the hand-run `db:owner`.
- **No learner enrollment.** One address is either staff or a learner (`users.kind`, unique email), so enrolling the Owner's address would take away the console. A cohort plan without a purchase would also count as an AI Accelerator seat sold and add a buyer that never paid. Staff preview at `/course` already opens Week 0 to Week 8.
- **Where it runs.** Production and staging (both run the pre-deploy command); demo has no database.

## D-130 · The course's session rows say where to join, not "Zoom link TBA"

**Date:** 2026-11-11
**Approved by:** Connor, 2026-11-11: "continue polishing the written course Week 0 to Week 8 for any empty or placeholder sections (link existing Library skills; don't rewrite them), one PR per item."
**Status:** on a pull request.
**Scope:** `packages/core/src/accelerator-content.ts` (`COURSE_INTRO.join`, was `joinLink`), a comment in `packages/core/src/accelerator.ts`, `apps/web/src/routes/course/Course.vm.ts` and `Course.tsx`, and their tests.

- **The placeholder.** Every live build and office hour on `/course/week-1` to `week-8` ended "· Zoom link TBA". That was the only placeholder the course showed a learner, apart from the video slots, which stay marked "to be recorded" until recordings exist.
- **Now:** "· Join in Sessions (opens 15 min before)", with "Join in Sessions" linking `/sessions`. That is where a learner really joins: the Sessions page's Join button, which the join route opens 15 minutes before the start (`JOIN_WINDOW_SHUT`, "Join opens 15 min before").
- **Still no Zoom URL** in the course's words or in `GET /api/course`. Staff set it on the session, and only the join route hands it out, inside its window.
- **Not changed:** the course plan's words, the Library skills and their pages, the dates and times, the video placeholders. Weeks 2, 4 and 5 list no course materials because the course plan names none for them; nothing was invented to fill them.

## D-132 · Email and password sign-in, set-password emails after checkout, Forgot Password; the magic link stays

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), for Connor, 2026-11-11: "reconfigure LMS login at learn.amplifiedimpact.io. Magic-link-only is not acceptable now that checkout creates accounts." The brief's eight items: email and password first (hashed with bcrypt or argon2, never logged, rate-limited, brief lockout); a 72-hour single-use, resend-able "Set your password" email when the webhook creates an account, and a "Set your password" button on the welcome page for that buyer's session; "Forgot password?" with a 1-hour link and no account enumeration; the magic link kept as "Email me a sign-in link instead"; Google only if quick and safe; existing users set a password from an account page or the forgot flow; httpOnly cookies with a 30-day "remember me"; tests and the README.
**Status:** on a pull request.
**Scope:** `apps/api/src/auth/passwords.ts` (new), `tokens.ts`, `sessions.ts`, `index.ts`; `apps/api/src/routes/password.ts` (new), `auth.ts` (`claimToken` by purpose), `mutate.ts` (a token per template), `offer.ts` (the welcome button's link); `apps/api/src/billing/provision.ts` (the owner's first email); `apps/api/src/email/` (two templates, their subjects and links); `apps/api/src/db/schema.ts` and migration `0009_passwords.sql`; `apps/web/src/routes/auth/` (`SignIn.tsx`, new `ForgotPassword.tsx`, `SetPassword.tsx`, `Account.tsx`, `shared.tsx`), `router.tsx`, `apps/web/src/offer/` (the button); `packages/core/src/offer.ts` (`WELCOME_TOKENS.setPassword`); `compliance/tests/e2e/signin.spec.ts`; tests; README.

- **Hash:** argon2id (`@node-rs/argon2` 2.2.2, OWASP's minimum parameters). Stored in a new `user_passwords` table, so no read of `users` (the snapshot, the viewer, admin screens) carries a hash. Never logged or returned. At least 10 characters, at most 200.
- **Sign in** (`POST /api/auth/login`). One answer for a wrong password, an unknown address and an account with no password ("That email and password don’t match."), after the same argon2 work. A 400, not a 401, because a 401 means "no session" here and sends the web client to /sign-in.
- **Lockout and rate limit.**
  - 5 failures in 15 minutes lock the address for 15 minutes. While locked, the password isn't checked, so a lock can't confirm a guess.
  - The lock is keyed by a sha256 of the address typed, so an unknown address locks exactly like a known one and no address is stored.
  - 30 password attempts per network address per 15 minutes.
- **Remember me.** "Keep me signed in for 30 days" (on by default) is the 30-day rolling session it always was. Without it: a browser-session cookie and a 12-hour row that doesn't roll. Link sign-ins stay 30 days. `auth_sessions.remember` defaults to true, so every existing session is unchanged.
- **Forgot password.** Answers 200 before it looks anything up, and the screen never branches. An account with a password gets a reset link (1 hour); one without gets a set-password link (72 hours). Same limits as the magic link.
- **Set and reset links.**
  - Single use. Shared with the magic link's token table, but each route claims only its own purpose: a password link doesn't sign anyone in at `/api/auth/verify`, and a sign-in link doesn't set a password. A link of the wrong kind isn't spent.
  - A too-short password is refused before the link is spent.
  - Setting a password signs the person in, makes an invited learner active (as accepting an invite did), spends every other unspent set or reset link for the address, and ends every other session.
- **Accounts from checkout.** The owner's first email is now "Set your password" (72 hours), replacing the 7-day owner invite. It keeps the invite's timing: held until `INVITES_FROM` (D-078), then at once. "Forgot password?" resends it. Team-member and staff invites are unchanged: they accept the invite, then set a password from `/account` or Forgot Password.
- **The welcome page's button.** It links to `learn…/set-password?checkout=<session>` only when all of these hold:
  - The order's own account owner is still invited, has no password, and has never had a session.
  - The order was paid in the last 72 hours.
  - The invite hold is over.

  Stripe doesn't verify the email typed at checkout, so an existing account never qualifies; its owner uses Forgot Password, which goes to their own inbox. During the hold the page keeps saying the login comes by email on the hold day, and the button stays hidden so the two don't contradict. Showing it during the hold is a one-line change if Ampy wants it.
- **The account page** (`/account`): set a first password, or change it with the current one (under the same lockout). Saving ends every other session but this one. It's outside `AppShell`, like `/sign-in`. Not linked from the profile menu: the `shell-profile-menu` parity golden pins that menu open, and goldens change only from the reference (D-031).
- **Not done:** "Continue with Google". The brief made it optional "if quick", and it needs an OAuth client and secrets in Railway, which would add risk tonight.
- **`/login` and www's Log In** (Connor's addendum). `learn.amplifiedimpact.io/login` renders the same screen as `/sign-in`. `/sign-in` stays, because the emailed links and the app's 401 redirect use it. Every www page's header nav now ends in Log In, an outlined button after About and before Get 5 Free Skills. On a phone it sits in the nav's wrapped row. It also links from the footer's Site list. It's one entry in `SITE.nav` (`apps/web/src/site/content.ts`). No parity golden covers www.
- **Per-offer tests.** `apps/api/test/offer.test.ts` runs each of the 8 carts end to end: webhook, held email, welcome-page button, set password from the emailed link, then email and password sign-in.
- **Not changed:** `/agreement`, prices, Stripe products and Payment Links, seats, the magic link's own flow and limits.

## D-137 · The rate limit counts the API only; hashed files are cached for a year; a missing file is a real 404

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), for Connor, 2026-11-11: "Rapid reloads of learn.amplifiedimpact.io/employees/marketing got 429 on /assets/*.js and *.css, and some /assets responses came back as application/json (a rate-limit JSON body), so the SPA never booted and showed a blank page. A room of buyers on one conference Wi-Fi IP will hit this. Fix: exempt static assets (/assets/*, fonts, images, index.html) from the API rate limiter. Scope limits to /api/* (stricter ones for auth endpoints are fine). Serve hashed assets with Cache-Control: public, max-age=31536000, immutable. Never answer an /assets request with JSON; a missing asset returns a real 404. Same check on www.amplifiedimpact.io. Add a test: 200 parallel asset GETs from one IP all return 200 with the right MIME type. Also: the CSP font-src 'self' blocks data: fonts (console noise). Add data: to font-src or self-host those fonts."
**Status:** on a pull request.
**Scope:** `apps/api/src/app.ts` (`isApiPath`, the limiter's `allowList`, a boot-time guard, the error handler, `font-src`); `apps/api/src/static.ts` (new: the static files and the not-found handler, moved out of `server.ts`); `apps/api/src/server.ts`; tests (`static.test.ts` new, `routes.test.ts`, `library.test.ts`).

- **Cause.** § 9.4's global limit (`GLOBAL_RATE_MAX`, 100 a minute per session or IP) counted every request, files included. One cold load of the app is about twenty files, and a room on one Wi-Fi is one IP. Measured against this branch's parent, serving the real build: 300 parallel file requests from one address got 100 answers of 200 and 200 answers of `429 application/json`. A missing `/assets/` file was answered `200 text/html` with the app shell.
- **The limit is for the API.** The limiter's `allowList` skips every path outside `/api/`: files, the app shell, client routes, and every www page, on both hosts. A skipped request is not counted and gets no `x-ratelimit-*` headers. Everything under `/api/` is limited exactly as before, and the stricter limits (sign-in link, password sign-in, Forgot Password, the waitlists, order status) are all under `/api/` and unchanged.
- **A guard.** A route's own limit inherits that `allowList`, so a stricter limit on a path outside `/api/` would silently be none. `build()` now refuses to register such a route.
- **Caching.**
  - Files under `/assets/` (Vite names each by its content): `public, max-age=31536000, immutable`.
  - `index.html`: `no-cache`, so a deploy's new file names are picked up on the next load.
  - Every other file keeps `public, max-age=0`, as before.
  - The static plugin's own `Cache-Control` is off, because `send` wrote `public, max-age=0` over anything `setHeaders` set.
- **No JSON, no app shell for a file.** A request under `/assets/` that matches no file answers `404 Not found` as plain text. An error on one (a 5xx) answers plain text too. Unknown `/api/` paths stay the JSON 404 the web client reads.
- **`font-src 'self' data:`.** `@fontsource`'s smallest `.woff` subsets are under Vite's inline limit, so the built stylesheet carries four fonts as `data:font/woff` URLs, and the CSP blocked them. `data:` is not a network origin, so § 9.4's "no Google domains" holds, and the test that no `https:` is allowed stays.
- **After, same measurement:** 300 of 300 file requests answered 200 with their own type (`application/javascript`, `text/css`, `font/woff2`), 200 parallel reloads of `/employees/marketing` all 200 `text/html`, and `/api/health` still had 99 of 100 left.
- **Not changed:** the limit's size, its key, its window, any route's own limit, `/agreement`, prices.

## D-131 · A course setup step that names several Library skills links every one of them

**Date:** 2026-11-11
**Approved by:** Connor, 2026-11-11: "continue polishing the written course Week 0 to Week 8 for any empty or placeholder sections (link existing Library skills; don't rewrite them), one PR per item."
**Status:** on a pull request.
**Scope:** `packages/core/src/accelerator-content.ts` (`SetupStep.also`; Week 4 step 5, Week 5 step 6), `apps/web/src/routes/course/Course.vm.ts` (`StepVM.links`, `COPY.guidedSetups`) and `Course.tsx`, and their tests.

- **The gap.** A setup step carried one link. Two steps name more than one of their week's skills and linked only the first:
  - Week 4, step 5: "Optional: open Contract-to-Close Deadline Tracker, Stalled Lender, Title & Escrow Follow-Up or TC File Audit for the transaction side." Only the Contract-to-Close Deadline Tracker was linked.
  - Week 5, step 6: "Pick the pilot task: Listing Appointment Prep or Appointment Follow-Up. …" Only Listing Appointment Prep was linked.
- **Now** each named skill gets its own link to its existing Library guided setup. A step with one skill still says "Open the Guided Setup". A step with several says "Open a Guided Setup:" and then each skill by its Library title, so every link says where it goes.
- **Words unchanged.** The step text, the skills, their Library pages and every other step are as they were. No new skill or page.
- **A guard.** A core test fails if any setup step names one of its week's skills without linking it. Run against the course before this change, it lists exactly these three.

## D-133 · The bare domain 301s to www with its path and query string

**Date:** 2026-11-11
**Approved by:** Connor, 2026-11-11 ("URGENT launch bug"): "https://amplifiedimpact.io/ 301s to www, but https://amplifiedimpact.io/pricing, /team-build, /free etc. return 404 … Make the apex 301 to https://www.amplifiedimpact.io with the same path and query string (in-app host redirect middleware, or fix the Railway/DNS redirect config), add a test, open a PR."
**Status:** on a pull request. It takes effect once apex traffic reaches Railway (docs/LAUNCH.md § 1b).
**Scope:** `apps/api/src/routes/apex.ts` (new), one registration in `apps/api/src/app.ts`, `.railway/railway.ts` (production's domains), `apps/api/test/apex.test.ts` (new), `docs/LAUNCH.md` § 1b.

- **The cause** is outside this repo: the apex `A` record points at GoDaddy's forwarding service, which redirects `/` and answers 404 for any other path. The app never sees those requests.
- **In the app:** a request whose `Host` is the apex (any case, any port) gets `301` to `https://www.amplifiedimpact.io` + the path and query exactly as sent; `308` for a method other than GET or HEAD, so a body is not turned into a GET. It runs first, before the marketing host's hook, cookies, rate limiting and headers. The apex is `MARKETING_HOST` without `www.`, so staging, demo and tests without a marketing host are unchanged. An absolute-form request target goes to the homepage, never to another host.
- **In Railway:** the apex joins `learn` and `www` in production's domain list in `.railway/railway.ts`. The dashboard and DNS steps are LAUNCH.md § 1b, with a no-code alternative (a path-keeping redirect at the DNS host).
- **Not changed:** `/agreement`, prices, the marketing pages, `learn`.


## D-134 · GoHighLevel: marketing aliases, custom fields, one pipeline, first sign-ins, a sync log, and a pause switch

**Date:** 2026-11-11
**Approved by:** Ampy (PM for Connor), the GHL brief. Connor's update of 12:26 PM is D-135 (the new sub-account's setup) and D-136 (the dry-run copy), each its own PR.

The existing client, queue and tag-union rules are extended, not rewritten. The app stays the only writer into GHL, on the location in `GHL_LOCATION_ID` (today Spring's). Nothing is sent from GHL, no workflow is created or enrolled, and Stripe is never connected to it.

- **Aliases.** Beside the existing tags, which are unchanged:
  - `ai-lead-free-skills` on the five free skills' sign-ups.
  - `ai-buyer-accelerator`, `ai-buyer-insiders`, `ai-buyer-agent-plan` and `ai-buyer-team-plan`, one per plan bought.
  - `ai-refunded` beside `refunded`, and `ai-canceled` beside `membership-ended`.
- **Custom fields, only when their id is set.** AI Offer, AI Cohort, AI Amount, AI Purchase Date (America/Chicago) and LMS Login.
  - They are written with `PUT /contacts/{id}` carrying only `customFields`, after the contact and its tags.
  - An empty value is never sent, so an existing field is never blanked.
- **One opportunity per contact, only when the pipeline and stage ids are set.**
  - It's found by contact and pipeline, created if missing, and written only when something changes.
  - Its stage comes from everything we hold for the email, so a later free guide never moves a buyer back to a lead.
  - A refunded opportunity returns to Purchased only when a paid order that isn't refunded exists.
  - A stage this app doesn't know is left alone by a lead stage.
  - Purchased is `won`, Refunded and Canceled are `lost`, the rest `open`.
- **A field or opportunity failure never undoes the contact and its tags.**
  - The row keeps its contact and retries on the backoff.
  - A 401 or 403 on those calls (a missing scope) pauses only the extras, without spending attempts.
  - Any other outage pauses the tick, as before.
- **First sign-ins: no code on the sign-in path.**
  - Each tick queues (`ghl_logins`) every learner with a session or an `active` status. That covers email links and invites today, and password sign-in once D-132 merges.
  - Not `joined`: core sets that at the invite, so it would tag people who never signed in.
  - The queued learner gets `lms-logged-in`, plus LMS Login when its id is set.
  - Staff are not queued.
  - This is also the backfill.
- **The stamp (`ghl_sync_stamp`) is the backfill for everything else.**
  - A synced row records a hash of what its sync wrote: the code's version, the location, and the field and pipeline ids.
  - A row whose stamp differs is sent once more through the same loop: on this release, when Connor adds an id, and when `GHL_LOCATION_ID` moves.
  - A re-sync starts its attempts at 1. No ids are stored, only hashes.
- **The sync log.** `/admin/crm-sync` for the Owner and Admins.
  - Counts per kind, the rows retrying or given up, and the latest activity.
  - A Retry for a row that gave up resets its attempts and clears its lock.
  - It's net-new, outside the shell, with no sidebar item, so no golden moves. It's reached by its URL.
  - Its API never returns an id or the token.
- **`GHL_SYNC_ENABLED=false`, exactly, pauses the loop.** Anything else changes nothing.
- **`.railway/railway.ts`**: `GHL_LOCATION_ID` is now `preserve()`, like the token. A value in code would undo Connor's swap on the next `railway config apply`.
- **Not changed:** `/agreement`, prices, seats, Stripe, and Spring's forms, workflows and pipelines.

## D-135 · Amplified Impact's own GHL sub-account, made ready: `ghl:setup`

**Date:** 2026-11-11
**Approved by:** Ampy (PM for Connor), Connor's update of 12:26 PM. Its own PR, after D-134's.

Connor is moving this app's GHL work off Spring's location to a dedicated Amplified Impact sub-account. The sync keeps writing to the current `GHL_LOCATION_ID` until Connor swaps it in Railway.

- **`pnpm --filter @ai/api ghl:setup`** gets the new location ready. It reads `GHL_TO_TOKEN` and `GHL_TO_LOCATION_ID`, set for the run only.
  - It creates the pipeline "Amplified Impact" with Lead, Free Skills, Checkout Started, Buyer and Refunded/Canceled.
  - It creates every tag this app writes, and the five contact fields: AI Offer (text), AI Cohort (text), AI Amount (monetary), AI Purchase Date (date), LMS Login (text).
  - Anything that already exists by name is used as it is. It never edits an existing pipeline; a missing stage is reported for Connor to add.
  - It prints the `GHL_PIPELINE_ID`, `GHL_STAGE_*` and `GHL_FIELD_*` lines to paste. Canceled and Refunded share one stage.
  - There is no Payment Failed stage in Connor's list, so `GHL_STAGE_PAYMENT_FAILED` stays unset.
- **A dry run unless given `--apply`**, and safe to run again. One call at a time, a 429 waited out, a 5xx retried, a refused token stops it.
- **It never prints a token or a contact, and never touches Spring's location.**

## D-136 · The dry-run copy into the new sub-account: `ghl:copy`

**Date:** 2026-11-11
**Approved by:** Ampy (PM for Connor), Connor's update of 12:26 PM. Its own PR, after D-135's.

- **`pnpm --filter @ai/api ghl:copy`** copies this app's contacts from the current location (`GHL_FROM_TOKEN`, `GHL_FROM_LOCATION_ID`) into the new one (`GHL_TO_TOKEN`, `GHL_TO_LOCATION_ID`), set for the run only.
  - A contact is this app's when it carries one of this app's own tags (a form's tag, a purchase, an abandoned checkout, an alias, a sign-in). Shared words such as `sms-consent`, `src-*` or `pay-*` never qualify one.
  - It copies only this app's tags. Spring's own tags stay in Spring.
  - It copies the email, name and company, never the phone: consent given to Spring isn't this app's to move.
- **A dry run unless given `--apply`.** The dry run only searches the current location and reports counts per tag.
- **It never deletes, never writes to the current location, and never touches a form, a workflow or a pipeline.** Upserts and tag unions, so running it again is safe.
- **After the swap**, the sync's stamp (D-134) re-sends every row this app holds to the new location, with a phone only where our own consent record allows.

## D-138 · The Admin Console's Preview as Learner opens a read-only Agent or Team Owner view

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), for Connor, 2026-11-11: "ADMIN 'PREVIEW AS LEARNER' (eye button) bounces to /admin. Cause: Curriculum.tsx opens /employees/:id with no preview flag, and the AppShell.tsx staff guard (isAdmin, then replace(ADMIN_ROOT)) bounces staff. EmployeeDetail also returns null for non-learners. Fix: (a) Curriculum.tsx opens /employees/${id}?preview=1&as=${previewAs} in a new tab. (b) AppShell skips the /admin bounce only when actor is staff AND preview=1. (c) In preview, build a read-only learner from as= (agent, or team/owner) so canAccess and visibleModules work. Include drafts and ignore open dates in preview. (d) Show a banner, 'Previewing as Agent / Team Owner. Exit preview', that returns to /admin/curriculum. Turn mutations into no-ops with a 'Preview only' toast. (e) Tests: staff without the flag still bounces; staff with the flag renders; agent vs owner team-only lock; mutations blocked; fixture goldens unchanged. Do NOT enroll the Owner as a learner. Audited POST /api/admin/impersonate can come later."
**Status:** on a pull request.
**Scope:** `apps/web/src/data/preview.ts` (new), `boot.ts`, `hooks.ts`, `join.ts`, `repository.ts`; `apps/web/src/routes/admin/Curriculum.tsx`; `apps/web/src/routes/portal/EmployeeDetail.tsx` (stored downloads); `apps/web/src/shell/AppShell.tsx` and `.module.css`; tests (`data/preview.test.ts` new, `data/boot.test.ts`, `compliance/tests/e2e/preview.spec.ts` new).

- **The URL is `/employees/<id>?preview=agent` or `?preview=owner`**, one flag instead of the brief's `preview=1&as=…`. CLAUDE.md makes `?as=` a fixture-only persona switch that "must be impossible in http mode", and `boot.test.ts` holds that. A separate, read-only flag keeps that rule whole. The eye button picks the learner as before: Team Owner for a Team-only AI Employee, Agent otherwise.
- **Staff only.** `boot.ts` reads the flag once and wraps the repository (`withPreview`). Until the signed-in viewer is known to be staff the wrapper answers exactly as the real repository. A learner who adds `?preview=` gets their own portal, unchanged.
- **How the bounce is skipped.** In a staff preview tab the viewer the shell sees is the read-only learner, so the shell's guards treat it as a learner and the /admin bounce never runs. Without the flag the viewer is staff and is bounced, as before. `EmployeeDetail` needs no change: it finds the learner in the snapshot.
- **The learner is in this tab's memory only.** It is added to a copy of the staff snapshot: no account, no enrollment, no invite, no team row, and nothing is sent to the API. An Owner preview gets a team of one (the Team plan's seat count) so the Team Hub renders.
- **Every AI Employee shows.** Drafts and scheduled ones are shown as published, with open dates ignored. The tier lock is unchanged: an Agent preview of a Team-only AI Employee lands on the first one it can open and shows the Locked Employee Preview, as an agent would.
- **Read-only.**
  - Every mutation is refused in the browser before any request, with the toast "Preview only". A form that shows errors inline shows it there too.
  - The Join button opens nothing and shows the same toast.
  - Stored files (an AI Employee's skill files, the Resource Vault) answer "Preview only" too. The bucket's routes refuse staff (`routes/files.ts`), so a download would otherwise open a 403. Files the browser makes itself, such as a session's `.ics`, still download.
- **The banner** sits under the header: "Previewing as Agent." or "Previewing as Team Owner.", then an Exit Preview link to `/admin/curriculum`. The link is a full page load, because the preview is read at boot. Reloading a preview URL keeps the preview. Reloading after moving to another screen in the tab (the flag isn't carried) opens the Admin Console.
- **Net-new UI.** The banner and the "Preview only" toast aren't in the reference. Both render only in a staff preview tab, which no parity scenario opens, so no golden changes.
- **Fixture mode is unchanged.** The eye button still switches persona with `?as=`, as the reference does. The flag works there too (`?as=admin&preview=agent`), which is how the e2e tests run in fixture mode.
- **Not done:** the audited `POST /api/admin/impersonate`, which the brief leaves for later.
- **Not changed:** the API, `/agreement`, prices.

## D-139 · Continue With Google on the LMS sign-in, for accounts that already exist

**Date:** 2026-11-11
**Approved by:** the PM (Ampy), for Connor, 2026-11-11, in the brief "Continue with Google on the LMS login": a "Continue with Google" button on /login (and the set-password or sign-up screens if they exist) under the email and password form; server-side OAuth 2.0 authorization code with PKCE and a `state` cookie, against Google's OpenID Connect endpoints, verifying the ID token's issuer, audience and expiry and requiring `email_verified=true`; match the verified email, case-insensitively, to an existing user, including checkout-created accounts with no password, and link the Google `sub`; create no account with entitlements; let staff in only on an exact email match; `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with the button hidden and the routes 404 while either is missing; unit tests with Google mocked.
**Status:** on a pull request.
**Scope:** `apps/api/src/auth/google.ts` (new), `apps/api/src/routes/google.ts` (new), `apps/api/src/app.ts` (and its log redaction), `apps/api/src/server.ts` (its logger), `apps/api/src/db/schema.ts` and migration `0011_google_identities.sql`; `apps/web/src/routes/auth/shared.tsx`, `SignIn.tsx`, `SetPassword.tsx`, `SignIn.module.css`; tests (`apps/api/test/google.test.ts` new, `authz.test.ts`, `routes.test.ts`, `schema.test.ts`, `SignIn.test.tsx`, `Password.test.tsx`); README; `docs/LAUNCH.md` section 9; the two 390px screenshots in `docs/screenshots/`.

- **Routes.**
  - `GET /api/auth/providers` answers `{ google }`, which the screens read to show or hide the button.
  - `GET /api/auth/google` redirects to Google's chooser (`prompt=select_account`, scopes `openid email profile`).
  - `GET /api/auth/google/callback` signs the person in and redirects to `/`, or to `/login?google=<why>`.
  - The redirect URI is `${APP_URL}/api/auth/google/callback`, which in production is exactly `https://learn.amplifiedimpact.io/api/auth/google/callback`.
- **Off until configured.** It needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_URL`. Without all three, both Google routes are 404 and `providers` says `false`.
- **Checks.**
  - `state`, the PKCE `code_verifier` (S256) and an OpenID `nonce` travel in one signed, httpOnly, Lax cookie, scoped to `/api/auth/google`, that lasts ten minutes and is spent by the callback.
  - A callback whose `state` doesn't match is refused before Google is asked anything.
  - The ID token's RS256 signature is checked against Google's published keys (cached for an hour, refetched for an unknown `kid`).
  - Then `iss` (either Google form), `aud` (and `azp` when `aud` is a list), `exp` and `iat` (one minute of skew), `nonce`, and `email_verified` exactly `true`.
- **No account, no sign-in.** The brief said to pick whichever matches current behavior. This app has no accounts without a purchase or an invite: `/api/auth/request` sends nothing to an unknown address, and nothing else makes a user. So an unknown address gets the brief's words ("We couldn’t find an account for that email. Use the email you bought with, or sign in with your password.") and nothing is created.
- **Matching.**
  - A linked Google account (`google_identities.sub`) opens its user, even if either email later changes. Otherwise the verified email is matched case-insensitively, as every other sign-in does, and the Google account is linked.
  - One Google account per user. A second one is refused ("That account is linked to a different Google account…").
  - If a linked user was removed, the link is dropped and the email is matched again.
- **Staff.** In only when Google's email equals the account's character for character, on every sign-in, even once linked. Anything else gets the same "couldn't find an account" words, so the reply doesn't reveal a staff address.
- **First sign-in.** An `invited` learner (such as an account a checkout made) becomes `active`, as a set password or an accepted invite makes them: a Google-verified address is the same proof of the inbox. The held "Set your password" email then skips them, as it already skips owners who set a password early. This opens nothing the email sign-in link didn't already: it signs in an `invited` buyer before `INVITES_FROM` today, and no date is changed.
- **Session.** Password sign-in's, with "Keep me signed in" on (the screen's default): 30 days, rolling, for staff and learners alike.
- **The screens.**
  - On `/login` and `/sign-in`, the button sits under the password form, set apart by a rule. The form, Forgot Password and "Email Me a Sign-In Link Instead" are unchanged.
  - On `/set-password` it sits under the new-password form.
  - There is no sign-up screen: `/invite/:token` signs in by itself and has no form.
- **Two copy calls.**
  - The label is "Continue With Google", capitalized like the screen's other labels ("Sign In With a Password Instead").
  - It's a text button with no Google "G" mark: icons come only from `ICONS`, and the mark's colors aren't tokens. Adding the mark is one icon and a DECISIONS entry, if Google's review ever asks for it.
- **Never logged:** an address, a name, a token or a `sub`. A refusal logs its code only.
- **The production log now redacts URLs, as § 9.4 meant.**
  - `server.ts` passed `logger: true`, which replaced `productionLogger()` with Fastify's default. So production logged raw URLs, including `/sign-in?token=…`, since Phase 07.
  - It now passes `productionLogger()`, and `code` and `state` join the redacted URL parameters, so Google's one-time code on the callback is never logged.
  - Checked on a local server: the callback logs as `?code=REDACTED&state=REDACTED`, and `/sign-in?token=` as `?token=REDACTED`.
- **Not changed:** checkout, Stripe, GHL (a first Google sign-in counts as a first sign-in through the existing rule), prices, the shared header and footer, the homepage, `/agreement`.

## D-140 · The Skill Library shows a paid plan's skills as coming on its first day, not "Not in your plan"

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: "check claude-overnight.md and claude-course.md against main … Then start on the top unfinished item." The audit's top item is the 16 sessions' Zoom links, which staff enter in the Admin Console, so this is the top item code can finish. It is the overnight brief's LMS wiring (unlock dates).
**Status:** on a pull request.
**Scope:** `apps/api/src/billing/access.ts` (`planOpensAt`, `skillOpensAt`, `skillState`), `apps/api/src/routes/skills.ts` (`opensAt` on each skill, the Sales Agent rule); `apps/web/src/routes/library/SkillLibrary.tsx`; tests (`billing.test.ts`, `offer.test.ts`, `SkillLibrary.test.tsx`).

- **What buyers saw.** The access rule answered `locked` for any skill a viewer couldn't open yet, including one their own plan opens later. So until Dec 14 a Team Plan owner and their agents saw every paid agent skill as "Not in your plan." with "See Plans". An Agent Plan buyer saw the same until Jan 4, on the screen that is their home after sign-in (D-119). The welcome page had just told them the opposite: "Your agents’ skills open Monday, December 14." and "Your first charge is Monday, January 4, 2027, when your agent skills open."
- **Now:** a released skill that a plan the viewer holds covers, and that plan's `startsAt` is still ahead, reads `upcoming`. `/api/skills` adds `opensAt`, which is that `startsAt`, or the release date for a skill not yet released. The screen shows the existing words, "Coming December 14." or "Coming January 4.", in place of the lock. No new copy.
- **Still `locked`:**
  - A cancelled or refunded plan: a trial cancelled before Jan 4 never starts.
  - A plan that has started and still doesn't open the skill: on Jan 4 with the first charge unpaid, it says nothing is paid for, as before.
  - A skill the plan doesn't cover, such as owner-and-ops skills for a Team Plan or Agent Plan.
  - An owner-and-ops skill for a Sales Agent, on any date.
- **"See Plans"** goes to `/pricing`, which compares all four programs (D-123). `/offer#plans` had no Agent Plan card.
- **What opens and when is unchanged.** `canOpenSkill` and the download route's check are untouched: a skill opens on exactly the day it did before. The per-offer tests now expect `upcoming` where they expected `locked` before each cart's day.
- **Not changed:** prices, the 15-seat cap, the Nov 30 close, unlock dates, `/agreement`.

## D-142 · The AI Accelerator's Dashboard drops the prototype's invented community and support details

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: "Accelerator Dashboard placeholders: remove '148 members', 'under 2 hours' and 'Luis from Support' now. No invented numbers or names. Use neutral text with no figures (e.g. 'Your cohort', 'We reply within one business day' only if that's already stated elsewhere on the site; otherwise just drop the line). Log as a D-entry."
**Status:** on a pull request.
**Scope:** `apps/web/src/routes/portal/Dashboard.vm.ts` (the quick links, a `mail` action), `Dashboard.tsx` (carries it out); `Dashboard.vm.test.ts`.

- **What an Accelerator buyer saw:**
  - **Cohort Community** "148 members · 23 new posts today", whose link showed a toast "Opening the cohort community". There is no cohort community.
  - **Technical Support** "Typical reply in under 2 hours", whose link showed a toast "Support chat opened. Luis from Support will reply here." There is no chat and no Luis.
- **Now, for the AI Accelerator's cohort:**
  - The community card is gone. Nothing real stands behind it, and the site names no community to point at.
  - Technical Support's line is the address the course already gives learners ("Questions? Write to support@amplifiedimpact.io."). Its link opens an email to that address.
  - No reply time is stated: nothing on the site promises one, so per the PM the line is dropped rather than replaced.
- **How it's scoped.** Same switch as D-110's real office hours: a cohort with its own office-hours series, which only the AI Accelerator has. The prototype's cohorts, which the reference and its parity goldens are built from, keep the reference's cards, so no golden changes.
- **Not changed:** the Office Hours link, the course, prices, the 15-seat cap, the Nov 30 close, unlock dates, `/agreement`.

## D-143 · A two-pay AI Accelerator pauses when its second payment fails, and reopens when it's paid

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: "Two-pay Accelerator, failed second payment: pause access (the overnight brief says failed payments pause access). Restore automatically when the invoice is paid. Add the e2e case." The overnight brief: "Handle cancel, refund, and failed payment (revoke or pause per cancel-and-keep)."
**Status:** on a pull request.
**Scope:** `packages/core/src/accelerator.ts` (`pausedForPayment`, `acceleratorPaused`, `acceleratorOpen`); `apps/api/src/billing/access.ts` (`canOpenSkill`, `liveSessionsOpen`), `billing/webhook.ts` (`invoicePaid`), `routes/course.ts`, `routes/skills.ts`, `lib/course-access.ts`; `apps/web/src/routes/course/` and `routes/library/` (what the screens say); tests.

- **Before:** a failed second installment set the plan `past_due`, and nothing read that. The course, its skills and its live sessions stayed open until May 4, so the second payment was optional in practice. A retry that later went through didn't even set the plan back to `active`: the installment subscription isn't the plan's own subscription (that one is the Insiders roll-on), so a paid installment never reached the plan, while a failed one did, through the order.
- **Now:**
  - **What pauses.** A `cohort` plan bought `two_pay` that is `past_due` is paused (`pausedForPayment`). `acceleratorOpen`, `canOpenSkill` and `liveSessionsOpen` all exclude it, so everything that reads them pauses together:
    - the course (`GET /api/course`);
    - the course's AI Employees and sessions in the snapshot, so the portal sends the buyer and their teammates to the Skill Library (D-119);
    - Skill Library listing and downloads;
    - the Accelerator's reminder emails.
  - **What restores it.** A paid invoice on the installment subscription sets that plan back to `active` (`two-pay-resumed`), and everything reopens with no one doing anything.
  - **When Stripe gives up** and ends the subscription before the last payment, the plan stays `past_due` (paused), and the existing error log tells Connor to follow up.
- **What the buyer sees.** "The AI Accelerator isn’t in your plan." would be false, so:
  - the course says "Your AI Accelerator is paused until your payment goes through.", then "Your second payment didn’t go through. Update your card in Manage Billing and the course opens again on its own.", with a Manage Billing button;
  - the Skill Library shows "Your second payment didn’t go through, so your AI Accelerator skills are paused. Update your card in Manage Billing and they open again on their own."
- **Only this plan.** The AI Accelerator in full, Amplified Insiders, the Team Plan and the Agent Plan keep their access while past due, as before. The PM's decision covered the two-pay second payment, and Stripe's retries already handle those subscriptions. Pausing them the same way is the same one-line rule, if wanted.
- **Not changed:** what is charged and when, the roll-on to Amplified Insiders on May 4, refunds (still end everything), cancel and keep, prices, the 15-seat cap, the Nov 30 close, unlock dates, `/agreement`.

## D-145 · "A view of who's using it": the Team Hub's Last Active is real

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: "continue with the top unfinished item from claude-overnight.md / claude-course.md as one PR". The overnight brief asks for the Team Plan's "owner seats, owner view, and agent invites". `/teams`, `/pricing` and Home sell the Team Plan with "a view of who's using it". The PM's standing rule covers the call: "make the call yourself, log it in DECISIONS.md, and keep going."
**Status:** on a pull request.
**Scope:** `apps/api/src/auth/sessions.ts` (`markActive`), `auth/guard.ts` (`requireSession`), `auth/index.ts`, `routes/auth.ts`, `routes/password.ts`, `routes/google.ts`; tests in `apps/api/test/auth.test.ts`, `password.test.ts`, `google.test.ts` and `routes.test.ts`.

- **The gap.** The Team Hub already has a Last Active column, from the reference. It reads `users.last`, which only an AI Employee step wrote (`mutations.ts`). A Team Plan agent has no AI Employees: they sign in and use the Skill Library. So every real agent showed a dash there, and an owner could not see who was using what they paid for. The console's Learners and Staff screens and the Overview's at-risk list read the same field, and were wrong the same way. Staff read "Invite pending" forever.
- **The call: "who's using it" is Last Active, made real.** No new screen, column or copy. The owner's Team Hub lists each seat: Invited or active, when they joined, and when they were last active.
- **What counts as active:**
  - a real sign-in: password, a set or reset password link, an emailed sign-in link, or Google;
  - a session in use on a later day, which is when it rolls (`needsRoll`, at most once a day per session).

  Requests in between write nothing, so the busiest row in the database gets no extra writes. Last Active is accurate to the day, which is what `fmt.ago` shows.
- **What doesn't count:**
  - `createSession` itself, so the test-only `POST /api/test/session` and the API tests' `signInAs` stamp nothing. The http parity run signs in that way, so its Team Hub and Learners screenshots keep the seed's values and the shared goldens are unaffected.
  - A stamp never moves backwards and writes no other column.
- **Who sees it.** Exactly who saw the column before: every Team tier member's Team Hub, as in the reference. Teammates' email addresses stay visible only to the Team Owner and the Operations Lead (`scopeSnapshot`). Nothing is broadcast; the owner's next snapshot shows it.
- **Not built, each needing a spec or a person:**
  - counts of skills downloaded or opened per agent (a new column and copy, which the reference doesn't have);
  - the 16 to 40 tier's "monthly owner call on who's using it" (a calendar item for Connor).
- **Not changed:** prices, the 15-seat cap, the Nov 30 close, unlock dates, `/agreement`, goldens.

## D-146 · Every skill leads with the problem it solves, before any setup

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12 (overnight task): Spring opened a skill in the Library and froze, because it was all "click here, go to settings". Her ask: "every skill lead with the problem it solves, in simple language that a 4th grader could understand." Spring's plan says the same under "Skill pages and cards: lead with what it does" (docs/SPRING-PLAN.md).
**Status:** on a pull request.
**Scope:** `apps/web/src/library/content.ts` (`problem`, `outcome` and `forRole` on all 58 entries; `LEAD`, `FOR_ROLES`, `leadFor`), `library/render.ts` and `library.css` (the cards and the free five), `free/render.ts` and `free.css` (/free's cards), `guides/render.ts`, `guides/content.ts` and `guides/skills.css` (every skill and Grok Bot template page), `routes/library/SkillLibrary.tsx` and its CSS module (the platform's Skill Library); tests in `library/lead-copy.test.ts`, `library/lead-render.test.ts`, `guides/skill-page.test.ts` and `routes/library/SkillLibrary.test.tsx`.

- **The lead.** Every Library entry (skills, free and locked, guides, kits and the 16 Grok Bot templates) now has:
  - **The problem:** one or two short sentences, in the buyer's words, about the pain it fixes;
  - **What it does for you:** one plain sentence about the outcome, not the mechanism;
  - **Who it's for:** one role (Agent, Team owner, Ops/admin, Broker or Anyone), never one the catalog's set contradicts.
- **One place to edit.** The words live on each entry in `library/content.ts`, beside its title. Every card, page and the platform read them from there, so they can't drift. NEW COPY FOR SPRING'S REVIEW: the pull request lists all 58.
- **The rules, which a test holds:** about a 4th grade reading level (a rough Flesch-Kincaid grade, 8 or under each and 5 or under on average); no MCP, API, prompt, connector or token; no hype; no em or en dashes; no number except a thing's own name (1099, W-9, L10); never "it sends", "posts" or "decides".
- **Where it shows, first:**
  - `/library`: each card and each of the free five says the lead under its title and tags, before its description. The description sits under a hairline, clamped to two lines on screen; the whole of it is still in the card's link and on the skill's page.
  - `/free`: each resource card, the same way, with its description in full.
  - Every skill and Grok Bot template page: the lead right under the title, before the lede and the facts, in the title's column. The setup checklist inside the card (D-101) is titled "Set it up" (was "Your setup").
  - learn.amplifiedimpact.io/skill-library: each skill's lead under its name, then its summary, then its downloads and Setup Guide under "Set it up". A row stays one column at every width.
- **The buy or sign-up card never moves down for the lead** (revised 2026-11-12 after the PM's design review). The first version ran the title and lead across the full width from 960px, which pushed the card down more than 600px at 1280 by 900, below the fold on free pages. That is undone:
  - From 960px the card is the right column from the top, exactly as before the lead. At 1280 by 900 its first button is exactly where main has it on all 54 skill and template pages: for example 248px on /tc-file-audit and 395px on /ai-brain-setup, and never lower than 417px.
  - On a phone the card now comes right after the title and the lead, then the sample. One column can't fit the lead above the card without moving something, and the sample is the one block that can go below it. The card sits 62px to 328px higher than before, by page, and never lower. Main already used this order once a free skill was unlocked.
  - So on a wide screen, a paid page's setup steps sit in the card beside the lead, as they did before. The lead is still first in reading order, and first on a phone.
- **The look:** each page's existing tokens only, with no new colour. The lead's few new classes sit in each page's own stylesheet; no kit file changes. Every line of the lead and "Set it up" is 16px or more. On the platform, the skill's name goes from 15px to 18px so it stays above its lead. It works in light and dark at 1280px and 390px: the kit pages and the platform follow their theme, and the skill pages stay light-only, as the kit's tokens set them. A test holds the sizes and the tokens.
- **Two commits:** the copy and content data first, then the templates and CSS, so a template change can be reviewed or reverted on its own.
- **Kept, every word and button:** each setup step, download button, copy-to-clipboard prompt, "Copy & Open" button, the descriptions, the summaries, the guided setup inside the card (D-101) and the app switch.
- **Not on their own pages:** /voice-profile, /ai101, /retool and /ops-time-audit are guides, not skills, with their own layouts. Their cards on /library and /free carry the lead.
- **Not changed:** the homepage, sign-in, the kit's header, nav, footer, CSS and tokens, prices, carts, Payment Links, entitlements, gating, `/agreement`, goldens.

## D-147 · Every www link preview is the branded share image, never a headshot

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: "link previews show Spring's headshot (og:image) ... Connor wants a proper branded preview."
**Status:** on a pull request.
**Scope:** `apps/web/src/site/share.ts` (the default image and its tags), `site/og-image.ts` (the image's template), `apps/web/scripts/og-image.mjs` (renders it), `apps/web/public/img/og/amplified-impact.png`; the heads in `site/render.ts` (`siteHead`), `library/render.ts`, `guides/render.ts` (and `Guide.meta.image` in `guides/content.ts`), `voice/render.ts`, `retool/render.ts` and `ai101/render.ts`; the share image in `home/render.ts`, `about/render.ts` and `site/offers.ts`; tests.

- **What links showed.** The homepage, /about and the five sales pages set `og:image` to a portrait headshot of Spring (890 by 1113), as a large card, so iMessage, Slack and LinkedIn previews of the business looked like a profile. The Library, the skill and guide pages, the voice profile, Retool and AI 101 set no image at all.
- **Now:** one branded card, 1200 by 630, for every www page that writes Open Graph tags (67 pages built). It shows the kit's Logo 1, the homepage's tagline "AI Coaching and Training for Business Owners and Their Teams" and amplifiedimpact.io on the kit's dark ground. It uses the kit's tokens and Geist only, with no photo and no number, and everything sits inside the middle 1000 by 500.
  - `og:image`, `og:image:width` 1200, `og:image:height` 630 and `og:image:alt` "Amplified Impact".
  - `twitter:card` `summary_large_image` and `twitter:image`, all absolute on `https://www.amplifiedimpact.io`.
- **Re-rendered from the repo:** `node apps/web/scripts/og-image.mjs` serves the template through Vite, with the kit's stylesheet and fonts, screenshots it at 1200 by 630 with Playwright, and fails if anything leaves the safe area. The same machine renders the same bytes.
- **A page can override it** through its page data (`PageMeta.image`, `Guide.meta.image`). None does.
- **The headshots stay in the pages** (the homepage hero, /about, the sales pages' founders); only the share tags changed. A test holds every www head to the new image and none to `/img/team/`.
- **Not changed:** the legal pages (/terms, /privacy, /agreement) and the two noindex offer pages, which write no Open Graph tags. learn.amplifiedimpact.io's app shell writes none either. Also unchanged: the homepage layout, the header, nav and footer, the kit's CSS, prices and gating.

## D-148 · Access groups: every verified @liveutah.com address holds the Agent Plan's skills, free

**Date:** 2026-11-12
**Approved by:** the PM (Ampy), for Connor, 2026-11-12: Utah Life's agents get full Amplified Agent Plan access on learn.amplifiedimpact.io at no charge, for that day's training on /appointment-follow-up and /repair-request-response. Connor's update the same day: "use DOMAIN-based access instead of a roster ... allowed domain = liveutah.com ... grant only to a VERIFIED email."
**Status:** on a pull request.
**Scope:** `apps/api/src/db/schema.ts` and `drizzle/0012_access_groups.sql` (`access_groups`, `access_group_members`, `email_verifications`; the `utah-life` group), `src/billing/access-groups.ts`, `src/routes/skills.ts`, `src/routes/auth.ts` (`claimToken`, `issueSignInLink`, `/api/auth/verify`), `src/routes/password.ts`; `apps/web/src/routes/library/SkillLibrary.tsx`; tests in `apps/api/test/access-groups.test.ts` and `SkillLibrary.test.tsx`.

- **An access group** grants a plan's entitlement at no charge to the people in it.
  - **Who is in it:** an address at its `email_domain` exactly, or one listed in `access_group_members`. Addresses are trimmed and lower-cased; there is no subdomain match.
  - **Utah Life:** the group `utah-life` has domain `liveutah.com`, plan `agent_plan` and no end, and the migration creates it. `x.liveutah.com`, `liveutah.com.evil.com` and `notliveutah.com` are out.
  - **The list:** an optional add-on for addresses outside the domain. It is empty, and no roster is loaded or committed.
- **Only a verified address.** The grant needs a row in `email_verifications`, and only `claimToken` writes one, when a link emailed to that address is followed: a sign-in link, an invite, or a set or reset password link.
  - Typing an address proves nothing. The welcome page's checkout button doesn't count. Google sign-in counts for an address in the group's domain since D-149.
  - The migration backfills addresses that had already followed a sign-in link or an invite. Set and reset links are left out, because finishing a password spends them unfollowed.
  - Anyone else needs one email-link sign-in ("Email me a link" or "Forgot Password?") before their access shows.
- **What it grants:** one more plan in the access rule's list: the group's kind, active, started, paid through for good. `canOpenSkill` treats a member exactly as an Agent Plan buyer. That opens the agent set and `both` from today, not from Jan 4, and every skill released later, with no change. The grant is worked out on every request, so removing a domain or an address, or ending the group, removes access at once.
- **A member with no account makes one themselves.** On learn's sign-in screen, "Email me a link" (or "Forgot Password?") sends the link they asked for. Following it makes the account the way an Agent Plan buyer's is made, as the owner of a team of one at Agent tier. It is active from that first link, which also verifies the address.
  - There is no account, order or plan row and nothing in Stripe. A member is not a paid seat and doesn't count against the 15-seat cap.
  - Nobody is sent anything they didn't ask for: no invites, no welcome emails.
- **On screen** (learn's Skill Library): a member sees "Included with your Utah Life team" where Manage Billing was, since they have nothing to bill. A member who also bought a plan keeps Manage Billing beside the note.
  - Design's follow-up (2026-11-12): the note has its own class, 16px with no margin, at the buttons' 40px row, so the skill list sits where it does for everyone else.
  - A member who bought nothing sees no Team Hub. Their team of one is how the account is made, not a team they run; the API says `teamHub: false` and the screen hides it too.
  - A member is never offered the plans on an agent or `both` skill (those are never locked for them). Owner and ops skills keep "See Plans".
  - The www skill pages are static and can't see learn's session, so their card still reads "Get Amplified Agent Plan" for everyone. Its "Download After You Sign In" leads members to learn, where their skills are open.
- **Not changed:** Stripe, prices, Payment Links, the 15-seat cap, the Nov 30 close, `/agreement`, the homepage, the header, nav and footer, and the kit's CSS.

## D-149 · Auth: rate limits key on the visitor's own IP, and Google signs access-group members up

**Date:** 2026-11-12
**Approved by:** Connor, 2026-11-12: the urgent fix after the Utah Life training ("Auth: real client IP for rate limits + Google sign-in for access groups").
**Status:** on a pull request.
**Scope:** `apps/api/src/lib/client-ip.ts`, `src/app.ts` (`rateLimitKey`, the logger, the `clientIp` request decorator), `src/routes/auth.ts` and `src/routes/password.ts` (`AUTH_REQUEST_IP_MAX`, `NO_PASSWORD_YET`), `src/routes/google.ts`, `src/billing/access-groups.ts` (`domainGroupsOf`), `src/auth/google.ts` (`hd`); `apps/web/src/routes/auth/shared.tsx` (the `no-account` words); tests in `apps/api/test/client-ip.test.ts`, `google.test.ts`, `access-groups.test.ts` and `auth.test.ts`.

**Why.** About ten @liveutah.com agents couldn't sign in on Nov 12. The cause was two bugs:
- **One rate-limit bucket for everyone.** Production logged `remoteAddress` 152.233.39.33 (Railway's proxy) for every request, while Railway's edge log showed each visitor's own address. `trustProxy: TRUST_ONE_HOP` yields Railway's internal proxy, so the per-IP limits on a sign-in link and Forgot Password (5 an hour) ran out site-wide after five requests. From 11:48 to 12:13 CT about 29 requests got 429, and password sign-in 429'd once.
- **Google refused first-time members.** liveutah.com is Google Workspace, so agents clicked Google first. Google refused every address with no account (`no-account`, 19 times).

**What changed.**
- **The visitor's IP** (`req.clientIp`) is Railway's `X-Real-IP` when the app runs on Railway (Railway documents it as "for identifying client's remote IP") and it holds exactly one valid IP address. Otherwise it is `req.ip`, as before.
  - The left-most `X-Forwarded-For` entry, which the client writes, is never used.
  - `CLIENT_IP_HEADER` names another header, or `none` turns this off.
  - It keys every rate limit (the global one and every route's own), the `remoteAddress` in each log line, and the event stream's tag.
  - Each `POST /api/auth/*` logs one line, `auth request client ip`, with `X-Real-IP`, `X-Forwarded-For`, the socket's peer and the chosen address side by side, so production can confirm the header against Railway's edge log.
- **Limits:**
  - A sign-in link and Forgot Password allow 30 an hour per visitor (`AUTH_REQUEST_IP_MAX`), up from 5, and still 5 an hour per email.
  - Password sign-in stays at 30 per 15 minutes per visitor.
  - The welcome page's checkout button stays at 5 an hour, now per visitor.
- **Google and access groups.** Google may sign someone in when its ID token says `email_verified: true` and the address's domain is exactly an active group's domain (D-148's rule: case-insensitive, no subdomains, not the allowlist). Then:
  - the address is recorded as verified, as a spent link records it;
  - a member with no account gets one the way a link makes it (`accountForGroupAddress`: Agent tier, a team of one, no Stripe, no email);
  - they are signed in.

  Google's Workspace domain (`hd`) is logged as `match`, `other` or `none` and is not required, because a secondary Workspace domain would carry a different `hd`. Any other address with no account is still refused.
- **Words:**
  - Google's `no-account` refusal now reads "We couldn’t find an account for that email. Enter the email you bought with or your work email, then choose Email Me a Sign-In Link Instead or Forgot Password?".
  - Password sign-in for an address in a group's domain that has no password yet (with or without an account) answers "There’s no password for that email yet. Choose Forgot Password? to set one." Every other mismatch keeps the one answer, "That email and password don’t match."

**Not changed:** Stripe, prices, the seat cap, `/agreement`, the homepage, the header, nav and footer, and shared styles. Nothing sends an email that wasn't asked for.

## D-150 · Utah Life: direct landing and first-run orientation

**Date:** 2026-11-12
**Approved by:** Connor, 2026-11-12, 1:26 PM CT: "keep the utah-life grant exactly as is (Agent Plan skills only) ... Fix the landing and orientation for access-group members (and anyone signed in with no course access)."
**Status:** on a pull request.
**Scope:** `packages/core/src/landing.ts` (new); `apps/api/src/lib/landing.ts` (new), `src/routes/auth.ts`, `src/routes/password.ts`, `src/routes/google.ts`, `src/routes/skills.ts`; `apps/web/src/shell/AppShell.tsx`, `src/routes/auth/` (`shared.tsx`, `SignIn.tsx`, `SetPassword.tsx`, `AcceptInvite.tsx`), `src/routes/library/SkillLibrary.tsx` and its CSS module, `src/routes/portal/Vault.tsx`, `Vault.vm.ts` and its CSS module.

- **Straight to the Skill Library.** D-119's rule is unchanged: a learner whose scoped snapshot holds no AI Employee has no cohort portal. What changed is when it runs.
  - **On the server, at sign-in.** `landingPath` in core works it out (`visibleModules` of the snapshot `GET /api/snapshot` would send). Every sign-in answers with it as `landing`: a sign-in link and an invite (`/api/auth/verify`), a set or reset password link (`/api/auth/password/set`), the welcome page's password (`/api/auth/password/checkout`), and a typed password (`/api/auth/login`). Google's callback redirects to it. Each screen navigates there, so `/` is never drawn first. The client only accepts `/` or `/skill-library` (`safeLanding`), so this can't become an open redirect.
  - **On a direct visit to `/`** (or any cohort screen), the shell works out the redirect while rendering and draws nothing on the way. It used to do this in an effect after the Dashboard had already painted once.
  - Staff, and learners with a portal, still land on `/`.
- **First-run welcome** at the top of `/skill-library`, for an access group's member only, until they dismiss it: "Welcome, Utah Life. Your team access includes {n} agent skills. Start with Appointment Follow-Up and Repair Request Response. Each Setup Guide opens a step-by-step walkthrough in a new tab; come back here to download the files."
  - **{n}** comes from `GET /api/skills` (`accessGroups[].skills`): the published agent and `both` skills the group's own grant opens today. It is never a typed number.
  - **The two skill names** link to their Setup Guides and are shown only if open (`START_WITH`).
  - **Dismissed for good, per learner, on every device.** `POST /api/skills/welcome/dismiss { group }` writes a `dismissals` row with id `welcome-<group>`, and `accessGroups[].welcome` reads it back. It is same-origin JSON only, and only for a group the learner is in.
- **The Setup Guide says it opens a new tab**: an external-link icon after the label, a hover title "Opens in a new tab", and the accessible name "Setup Guide (opens in a new tab)". The welcome's two links do the same.
- **Locked rows for a member** read "Not included with Utah Life access", with no See Plans, on every set. Everyone else keeps "Not in your plan." and See Plans. This replaces D-148's follow-up, which kept See Plans on owner and ops skills for members.
  - **The group it names**, for a learner in more than one: the group whose grant covers that skill's set (`accessGroups[].covers`, from `planCovers`), or else the first. `GET /api/skills` sends only active groups (unexpired, address verified), sorted by name then id, so "the first" is stable.
- **Design's look check (PR #100):**
  - The welcome's dismiss is a 44px tap target, with margin `-10px -10px 0 0` so the X stays in the corner.
  - The member's locked label (its own class, `.notIncluded`) and the page subtitle are at DESIGN.md's "lead" step, 16 / 24. The type scale is literal px values; there is no type variable. Everyone else's notes stay 14px. No new colours.
- **Resource Vault with nothing published**: the heading, then "Nothing here yet", instead of an empty list with search, tabs and zero-count filters. The prototype's vault always has resources, so its goldens are unchanged.
- **Not changed:** the `utah-life` grant (Agent Plan skills only), `PLAN_SETS`, `groupAccessOf`, entitlements, course access, Stripe, prices, the seat cap, `/agreement`, shared styles, the nav and the homepage. No emails.

## D-151 · The guided setups are behind sign-in: www sells them, learn shows them

**Date:** 2026-11-13
**Approved by:** Connor, 2026-11-12, 1:34 PM CT: "the step-by-step guided setups are the core value proposition ('most sites give you a PDF; we guide you step by step and you just click the buttons') … Gate the guides." The plan's four questions were approved on 2026-11-13: the free account's sign-in link email is fine; the copy-paste prompts go behind the gate too; the one-time production migration for the course's links is in; and what search engines already hold is acknowledged.
**Status:** on a pull request.
**Scope:**
- `packages/core/src/skill-guides.ts` (new), `landing.ts` (`safeNext`), `accelerator-content.ts`;
- `apps/web/src/guides/` (`setup-export.ts`, new; `render.ts`, `content.ts`, `main.ts`, `skills.css`, `vite-plugin.ts`);
- `apps/web/src/routes/library/` (`SkillGuide.tsx`, new; `SkillLibrary.tsx`), `routes/auth/` (`SignIn.tsx`, `shared.tsx`), `routes/course/` (`Course.tsx`, `Course.vm.ts`), `router.tsx`;
- `apps/api/src/routes/skill-guides.ts` (new), `billing/self-serve.ts` (new), `routes/` (`ai101.ts`, `auth.ts`, `password.ts`, `google.ts`, `guide-list.ts`, `skills.ts`), `static.ts`, `server.ts`, `app.ts`, `email/templates/`;
- `drizzle/0013_course_guide_links.sql`;
- `.gitignore`.

This amends D-082 and D-101: a skill's page no longer carries its guided setup.

- **Where each part lives:**
  - **The words:** each skill's page file under `apps/web/src/guides/`, unchanged. This is the one source of truth.
  - **The public www page:** draws the preview from them.
  - **`apps/web/dist-private/skill-guides.json`:** the build writes every guided page's full setup here, from the same objects (`setup-export.ts`, run by the guide plugin; no Vite config changed). It sits outside `dist/`, so no route serves it, and no browser bundle imports it.
  - **The API:** reads that file at boot.
- **www, for every skill's and Grok Bot template's page** (53 pages, 4 of them free):
  - **Kept:** the problem it fixes, what it does, who it's for, the sample, what you get back, who does what, what you need, the questions.
  - **Shown as a preview:** the setup's step titles only, under "Set it up", and "Every step, with what to click and the words to paste, is in the guided setup."
  - **Removed:** every step's words, buttons and files, the words to paste, the app switch, and "What to say" (Connor: the copy-paste prompts go behind the gate too).
  - **Paid:** "Unlock the Guided Setup" to the plans, and "Already own it? Sign In" to the guide in learn.
  - **Free:** the same sign-up form, whose button is "Unlock the Guided Setup". Once signed up, "Your guided setup is ready" with "Open the Guided Setup".
  - Public addresses are unchanged. The two PDF guides and the Task Sync Starter Kit, which are not skills, are drawn as before.
- **learn, `/skill-library/<page>`** (`SkillGuide.tsx`), from `GET /api/skill-guides/:page`:
  - **Signed out:** 401, and the screen sends the visitor to sign in and back (`next`).
  - **Staff:** 403.
  - **A learner:** always gets the title, the steps' titles and the state.
  - **The full setup** (every step, its buttons, the words to paste, "What to say", the files through the checked download route) only when the skill library's one rule opens the skill for them. That is `stateFor`: `canOpenSkill`, and a Sales Agent never opens an owner-and-ops skill.
  - **One step at a time:** "Step n of N", Back, Next and Start Over, each step's title a button, the place kept on the device, and Copy and Copy & Open as on www.
  - **A locked skill** shows the titles and its plan line: "Not included with Utah Life access" for an access group's member (no upsell, D-150), or "Not in your plan." and See Plans for anyone else.
- **Free skills** need a free account:
  - The free page's sign-up still stores its lead row, so the GoHighLevel sync is unchanged.
  - It then emails the person a sign-in link to that guide, at most 5 an hour per address. That is the one email, and the person asked for it.
  - A free sign-up's address joins the self-serve addresses (`billing/self-serve.ts`, beside D-148's group addresses). The account is made when the link is spent, the same way a group member's is: a team of one, no account, order or plan row, no Stripe.
  - The sign-in screen's "Email Me a Sign-In Link" and Forgot Password work for that address too.
  - A free account opens the free skills, and nothing paid.
- **Back to the guide after signing in:**
  - `next=/skill-library/<page>` (`safeNext`: a real guided page, nothing else) is carried through the emailed link (`/sign-in?token=…&next=…`), a typed password, "Email Me a Sign-In Link", and Google (kept in the flow's signed cookie).
  - Anything else is ignored, and the sign-in lands where D-150 says.
- **Links into the guides:**
  - The Skill Library's Setup Guide button opens the guide in learn, same tab. The "opens in a new tab" cue from D-150 is gone, and the welcome's last line now reads "Each Setup Guide walks you through it step by step, with the downloads right in it."
  - A locked row adds "Preview the Setup".
  - Course pages link each skill to its guide in learn, same tab. A page that is not a skill (/voice-profile) stays on www, in a new tab.
  - Migration `0013_course_guide_links` rewrites the nine skill links in the course's seeded week prompts, once, exactly as a fresh seed now writes them.
- **Old links:**
  - `#download` on a guided page (where the setup was, and what "Send This to My Computer" emailed) goes on to its guide in learn, which signs the visitor in first.
  - A no-script sign-up lands on `#check-email`.
  - Every skill's and template's ZIP, free ones included, stops being a public file. An old `/downloads/<zip>` link gets a 302 to its guide in learn.
- **Checked:**
  - In tests: for all 53 pages, none of each setup's own words reach the public HTML.
  - After a production build: 876 setup strings were scanned against all 212 built text files in `dist/`. No step, words to paste or routine prompt appears. The one match is a guardrail line shown on purpose in a template's public "What it never does" list.
  - No SPA source imports `src/guides/`.
  - There is no sitemap, and the meta and Open Graph text were already the hand-written descriptions.
- **Design's look check (PR 105):**
  - A guided page's signed-up panel ("We emailed you a sign-in link") shows only right after a sign-up, or on `#check-email`. It is never remembered. A key the old page remembered (`pw-unlocked`), set by someone who was never sent a link, no longer opens it: they get the form, which sends one.
  - In learn, "Step n of N" and a block's words to paste are 16 / 24. The step numbers and the Copy tags stay 14px.
  - The copy confirmation is fixed at the foot of the screen, as on www, and clears itself.
  - A step's words always come first, then Copy & Open, for a line and a block alike.
- **Design's live recheck (after PR 105):**
  - A paid card's "Already own it? Sign In" has its own class (`.legal.owned`): 16px, and its link a 44px tap target (inline-block, 44px tall). The consent line under a sign-up form keeps the 13px `.legal`.
  - "Your guided setup is ready" (`.sk .unlocked`) is padded 24px, as the cards around it.
- **Not changed:** Stripe, prices, the seat cap, dates, `/agreement`, the homepage, the nav, and Design's homepage v3 files (#104: both Vite configs, `src/home/`, `eslint.config.js`). What search engines and archives already hold of the old pages stays there.

## D-152 · Sign Out signs out (the prototype's demo toast is gone)

**Date:** 2026-11-13
**Approved by:** Connor, 2026-11-13, 4:08 PM MST (an iPhone, Safari, learn.amplifiedimpact.io, the Owner in the Admin Console): tapping Sign Out showed "Signed out (demo)" and left him signed in. "Wire them all to the real sign-out … It has to work on mobile Safari."
**Status:** on a pull request.
**Scope:** `apps/web/src/data/session.ts` (new), `src/shell/AppShell.tsx`, `src/main.tsx`, `src/data/http.ts`, `src/router.tsx` (a comment); `apps/api/src/auth/guard.ts`.

- **The deviation.** The prototype's `signOut` (`design-reference/Amplified Impact LMS.dc.html`) closes the profile menu and toasts "Signed out (demo)". The app copied it, so Sign Out never reached the server. That was the only demo sign-out: the profile menu's Sign Out is one button, shared by the Admin Console and the learner portal, on the sidebar and in the phone's drawer. It now:
  1. **Ends the server session.** `POST /api/auth/sign-out` (§ 7.5, unchanged) deletes the `auth_sessions` row and clears `ai_sid` with the attributes it was set with: `Path=/`, no `Domain` (host-only) on either, `HttpOnly`, `SameSite=Lax`, and `Secure` in production, now expired (`Max-Age=0`).
  2. **Forgets the viewer in the page.** It unmounts the app, which closes the live stream and leaves no signed-in screen in a page the browser keeps, then empties the query cache that held the snapshot.
  3. **Replaces the page with /sign-in** (`location.replace`), so Back does not return to the screen just left.
  - If the server does not end the session (offline, or any non-2xx), nothing changes: the page stays, and the toast says "Something went wrong. Try again.", the sign-in screens' own words for a failed request. Going to /sign-in with the session still live would only look like a sign-out.
  - In fixture mode there is no server session, so Sign Out only forgets and leaves.
  - The menu item's look is unchanged, so no golden moves. No compliance scenario clicks it.
- **Back after Sign Out (iOS Safari's back-forward cache).**
  - A signed-in page is hidden as the browser puts it away (`pagehide`, `persisted`).
  - When Back brings it out (`pageshow`, `persisted`), it is shown again only once `GET /api/me` answers 200. Otherwise, or offline, it goes to /sign-in.
  - A page that signed out goes straight to /sign-in, without asking.
  - This runs in http mode only, and leaves /sign-in, /login, /invite, /forgot-password and /set-password alone.
- **Nothing signed-in is cached.** Every response behind `requireSession` now carries `Cache-Control: private, no-store`, unless its handler sets its own header (`/api/course` and the download redirects keep `no-store`).
- **A 401 replaces too.** The app's 401 redirect (`data/http.ts`) now uses `location.replace('/sign-in')` instead of `assign`, so Back from /sign-in does not return to the page that was just turned away.
- **After sign-out:**
  - The old cookie gets 401 from `/api/me`, `/api/snapshot`, `/api/skills`, `/api/skill-guides/:page` and every mutation.
  - `/admin` and every portal screen go to /sign-in on that 401.
  - `/skill-library/<slug>` goes to `/sign-in?next=…`, as before.
- **Checked:**
  - API tests: the cookie is cleared with the attributes a real sign-in set it with (and in production), the session row is gone, the old cookie gets 401 everywhere, and signed-in answers are `no-store`.
  - Web tests:
    - Sign Out in the Admin Console and from the phone drawer: the POST, then the teardown, then `/sign-in`.
    - A failed sign-out stays put and says so.
    - The back-forward cache guard.
  - No file the app bundles has a "(demo)" string, and no built chunk or source map holds a demo sign-out.
- **Not changed:** the sign-out route itself, the cookie's attributes, the sign-in screens, Stripe, prices, `/agreement`, homepage v3 and secrets. Other demo-only pieces (the fixture-mode demo controls, demo personas, the Module Builder's demo uploads) are listed on the PR and left as they are.

## D-153 · Logins go out now; paid AI Accelerator access waits for the first live build

**Date:** 2026-11-14
**Approved by:** Connor, 2026-11-13, 11:20 PM MST: login and set-password emails can go out immediately; buyers must be able to log in and see a welcome, but must not have access to much until everything is ungated at the start of the sessions, the first Accelerator live build on Wednesday, Dec 2, 2026, 12:00 PM MST (1:00 PM CT). 11:29 PM MST: Amplified Insiders skills stay open at purchase; lock only the Accelerator course and skills.
**Status:** on a pull request.
**Scope:**
- `packages/core/src/accelerator.ts`, `src/offer.ts`.
- `apps/api/drizzle/0014_cohort_starts_at_first_build.sql` (and its journal entry).
- `apps/api/src/lib/course-access.ts`, `src/routes/course.ts`, `src/routes/skills.ts`.
- `apps/web/src/routes/library/PreLaunch.tsx` and its CSS module (new), `src/routes/library/SkillLibrary.tsx`, `src/routes/course/Course.tsx`, `src/offer/content.ts`.

- **The pins.**
  - `COURSE_OPENS_AT = COHORT_ONE.firstBuildAt` = `2026-12-02T13:00:00-06:00` (12:00 PM Mountain). Until now it was `DEFAULT_INVITES_FROM` (Nov 16, 7:00 AM Mountain). It no longer follows the invite hold or the `INVITES_FROM` variable in any way. Week 0 and all eight weeks still open together at that instant, with no drip.
  - A new AI Accelerator plan (`cohort`, in full or in two payments) starts at `max(now, COHORT_ONE.firstBuildAt)` instead of `now`. The access rule already reads `startsAt`, and the guided setups use the same rule, so every paid skill and its full guide read `upcoming`, "Coming December 2", until then.
  - `paidThrough` and `liveUntil` are unchanged.
  - Amplified Insiders, the Team Plan (Dec 14) and the Agent Plan (Jan 4) keep their dates.
  - Free skills stay open, and access groups (Utah Life) are unchanged.
- **Plans already sold.** Migration 0014 moves every `cohort` plan whose `starts_at` is before the build to the build, test and smoke accounts included. It runs in the deploy's pre-deploy migrate. After Dec 2 it changes nothing, and it is safe to run twice.
- **The welcome after login.**
  - Before the build, the course's modules and sessions are not in a buyer's snapshot, so sign-in already lands them on the Skill Library (D-150) and the portal is never drawn empty.
  - The Skill Library and `/course` both show a pre-launch panel: "You're in the Amplified AI Accelerator. Live sessions start Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT). Your course and your skills open then. Questions? Email support@amplifiedimpact.io." The times go through `fmt.*`, in the viewer's zone first.
  - The date comes from the API (`courseOpensAt` on `GET /api/skills`, and `upcoming` / `opensAt` on `/api/course`'s 403), from the plan rows, so it shows while the snapshot holds none of the course.
  - `/course` no longer tells a buyer "The AI Accelerator isn't in your plan."
  - There is no standalone orientation to link: the Dashboard's and the course's orientation are still placeholders.
  - The panel has its own stylesheet, so neither page's CSS changes (Design is restyling both, PR 77).
- **Login emails.**
  - `DEFAULT_INVITES_FROM` moves to `2026-11-13T00:00:00-07:00`, in the past. A deploy without `INVITES_FROM` therefore sends held invites on the billing loop's first tick, and sends new ones at purchase, with the gating in the same deploy.
  - If Railway sets `INVITES_FROM`, it still wins. Releasing the emails is then Connor's step: set it in the past and redeploy, because it is read once at boot.
  - The thank-you page already switches on `invitesFrom`. Its Accelerator step "Start with Week 0 … Then open your course" was the one line now wrong, and it says Week 0 opens with the course on Wednesday, December 2.
- **Known gap, to close before Dec 2.** At exactly 1:00 PM Central:
  - The first build's Join opens at its start, not in the 15 minutes before: the session is not in a buyer's snapshot, and the join route checks access, until the course opens.
  - Accelerator buyers get neither the 24-hour nor the 1-hour reminder for that build.
  - Week 0, which is "due before the first build", opens at that same moment.
  - Opening at 12:45 PM Central is a one-constant change.
- **Not changed:** Stripe, prices, Payment Links, the seat cap, `/agreement`, Railway variables, secrets and access groups. No emails are sent by hand.

## D-154 · The AI Accelerator's 15 seats are one cap across both Payment Links, kept on Stripe

**Date:** 2026-11-14
**Approved by:** Connor, 2026-11-13, 11:20 PM MST: "reconcile the two Amplified AI Accelerator Payment Links so the combined cap is 15, not 15 per link (which could sell 30). At 15 combined paid seats, deactivate both links via the Stripe API; if a refund drops the count below 15, reactivate them." Connor adds Payment Links: Read and Write to the `website-checkout` restricted key.
**Status:** on a pull request.
**Supersedes:** D-104's "Ampy turns the Stripe links off by hand; the code never changes Stripe" (and the same words on `COHORT_SEATS`).
**Scope:**
- `apps/api/src/billing/payment-links.ts` (new), `src/billing/stripe.ts`, `src/billing/config.ts`, `src/billing/webhook.ts`, `src/billing/provision.ts` (a log line), `src/jobs/billing.ts`, `src/server.ts`.
- `packages/core/src/offer.ts` (a comment).
- `docs/STRIPE-HANDOFF.md`.

- **One counter.** `cohortSeatsSold` (every `cohort` plan not `ended`, both options together; a refund ends one) is the only count, for the page and for Stripe alike. Each link's own `completed_sessions.limit = 15` stays as a backstop and is never changed.
- **One desired state, nothing else** (`syncAcceleratorPaymentLinks`).
  - At 15 or more sold, each link that is on goes off, with `inactive_message` "All 15 founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort." (the sales page's sold-out line) and metadata `ai_soldout=1`.
  - Under 15, a link that is off and carries `ai_soldout=1` goes back on, and the mark is cleared. That happens only while `OFFER_OPEN` is true and founding prices still sell.
  - A link that is off for any other reason (by hand, founding closed, a retired link) is never touched.
  - A link whose metadata says another plan (`ai_plan` not `cohort`) is never touched, whatever a variable says.
  - It reads each link first and changes only what differs, so a second run at the same count changes nothing.
- **Which links.**
  - `PAYMENT_LINK_ID_COHORT_FULL` and `PAYMENT_LINK_ID_COHORT_TWO_PAY` are optional. They default, with a live key only, to `plink_1UaNGZLAuFJaUU8qHyM5p82M` (paid in full) and `plink_1UaNGcLAuFJaUU8qxAVTFih1` (two payments).
  - With a test key and no variable there are none, and the cap leaves Stripe alone.
  - No Railway variable is needed or changed. The boot line reports only how many links there are.
- **When it runs.**
  - After every webhook event that can add or end an Accelerator plan: a completed checkout (or its async success), `invoice.paid`, `charge.refunded`, `customer.subscription.deleted`. This runs once the plan is committed.
  - On the billing loop's 60-second tick, as the backstop for a missed or half-failed webhook.
  - It never throws, so a Stripe failure never makes Stripe redeliver an event that was handled.
- **Idempotency keys** are `accel-cap-{link}-{off|on}-{sold}-{minute}`. A retry within the minute is one change. A later flip at the same count (15, a refund to 14, a sale back to 15) is a new key, not Stripe replaying the first answer.
- **Failures.**
  - Each link is reconciled on its own, so one failure does not leave the other link on.
  - The failed one is retried on every tick.
  - A 403 (no Payment Links permission yet) is logged once an hour, naming the permission to add.
  - A count that fails changes nothing; it is never read as 0.
  - Logs carry counts, plan and order ids and link ids only.
- **Races, accepted.**
  - Provisioning holds an advisory lock, so two webhooks cannot both count 14.
  - Stripe can still complete a Checkout that was open when the links went off, and the two links can complete at the same moment.
  - That 16th seat is provisioned like any other (a paid checkout is never refused), the existing "seat 16 sold, past the 15 seats: Connor follows up" error is logged, and both links stay off. Nothing is refunded automatically; Connor follows up.
- **Before it works in production:** Payment Links: Read and Write on the existing `website-checkout` restricted key, live and test. No new key, and no standard secret key.
- **Not changed:** prices, products, trials, tax, terms, copy, `/agreement`, the Insiders, Team Plan and Agent Plan links, GHL, and emails.

## D-155 · Google Analytics 4 and the Meta Pixel on the www marketing pages only

**Date:** 2026-11-14
**Approved by:** Connor, 2026-11-14, about 1 AM MST: install GA4 (measurement id `G-TSQ5YB5BCP`, stream https://www.amplifiedimpact.io) and a Meta Pixel (`1835170747490806`, dataset "Amplified Impact" in the Spring B business portfolio) on the public www site; page views, checkout starts on the Buy buttons, and purchases on /offer/welcome; never on learn or the admin console.
**Status:** on a pull request.
**Scope:**
- `apps/web/public/analytics.js` (new).
- `apps/api/src/lib/analytics.ts` (new), `src/app.ts` (`cspDirectives` and one `onSend` hook), `src/server.ts`, `src/routes/offer.ts`.
- `apps/web/offer-welcome.html` (five body attributes).

- **One first-party file.** `analytics.js` is served at `/analytics.js` from `apps/web/public`, so `script-src 'self'` admits it. It adds no inline script and no new hash.
  - It holds both ids as constants (public ids, not secrets).
  - It runs only when the page's host is `www.amplifiedimpact.io`, so a public page opened on the learn host, a preview or a local build loads no tag.
  - The ids are not in Railway; no variable changed.
- **Which pages.** `server.ts` reads each www page once at boot through `withAnalytics`, which adds `<script src="/analytics.js" defer></script>` before `</head>`:
  - the homepage;
  - /offer and /forum, and /offer/welcome;
  - the sales pages (/pricing, /team-build, /teams, /agents, /free, /about, /insiders);
  - every skill and guide landing page, /library, and /ai101.
  - Not the learn app's `index.html` (so not learn, nor the admin console), and not /agreement, /terms or /privacy.
  - No HTML shell, render file or Vite config changed, so Design's homepage v3 and site files are untouched.
- **Events.**
  - **Every page:** GA4 `page_view` (gtag `config`) and Meta `PageView`.
  - **A Buy button** (a Stripe Payment Link, labelled at read time with `data-ai-cart` and `data-ai-item`, e.g. "Amplified AI Accelerator, Paid in Full"): GA4 `begin_checkout` and Meta `InitiateCheckout`, with the cart id and product name. A sold-out, closed or "opens soon" button has no Stripe link and sends nothing.
  - **/offer/welcome, once the order is confirmed:** GA4 `purchase` and Meta `Purchase`.
    - Value and currency are Stripe's `amount_total` and currency from the order the page already looks up. A trial, or an order with no amount, sends 0, never a guess.
    - The product is the cart's name.
    - The Checkout Session id is GA4's `transaction_id` and Meta's `eventID`.
    - It is sent once per session id: a `localStorage` mark means a reload, a second tab or Back sends nothing more. GA4's and Meta's own de-duplication cover a browser that refuses storage.
  - No name, email or phone is ever sent.
- **CSP.**
  - `cspDirectives(…, { analytics: true })` adds exactly these: `script-src` `https://www.googletagmanager.com`, `https://connect.facebook.net`; `connect-src` `https://www.google-analytics.com`, `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://www.googletagmanager.com`, `https://www.facebook.com`, `https://connect.facebook.net`; `img-src` `https://www.google-analytics.com`, `https://www.googletagmanager.com`, `https://www.facebook.com`.
  - **Only a response that carries the tag gets them** (an `onSend` hook extends helmet's header in place). The learn app, the admin console, the legal pages and every API answer keep the strict policy. This is deliberate: allowing googletagmanager.com is a known way around a CSP, because anyone can host a script in a GTM container, so the signed-in app must not allow it.
  - The www homepage still has no CSP (the marketing hook answers before helmet); the tags load there anyway.
- **Checked in a real browser (Chromium, desktop Chrome user agent), against the built site at its https addresses:**
  - No CSP violation on /, /offer, /pricing, /forum, /appointment-follow-up or /offer/welcome.
  - Each page sent its page views.
  - The Buy button sent `begin_checkout` and `InitiateCheckout`.
  - The welcome page sent one `purchase` and one `Purchase` with the session id, 7500 and USD, and nothing more after a reload.
  - learn loaded no tag and made no third-party request.
  - Every collect call was intercepted, so nothing reached Connor's GA4 property or Pixel.
  - Meta's Pixel sends nothing from a headless or automated browser; that is Meta's own choice, not this code.
- **Not changed:** `/agreement`, Railway variables, secrets, prices, Stripe, the learn app, and Design's files. There is no consent banner: none was asked for.

## D-156 · The LMS at the www kit's phone quality: Geist, a 16px floor, 44–48px targets, the wordmark

**Date:** 2026-11-15
**Approved by:** Connor approved on Sunday, Nov 15, 2026 at 1:22 AM MST (America/Phoenix) a comprehensive LMS visual refactor so learn.amplifiedimpact.io matches the www kit's phone quality and brand (Geist, 16px floor, 44–48px tap targets, zero horizontal overflow, Amplified Impact wordmark / kit-like top bar). He authorized this DECISIONS entry and the intentional regeneration of compliance goldens for LMS screens whose pixels will move. www marketing pages are out of scope except that they must not regress.
**Status:** foundation on a pull request (PR A). The learner routes (PR B) and the admin console (PR C) follow under this same entry.
**Scope (PR A):**
- `design-reference/`: all 25 `*.dc.html` (helmet links and the type rule below), `lms.css` (new), `fonts/` (new), `brand/amplified-impact-wordmark{,-reversed}.svg` (new); by hand, `Amplified Impact LMS.dc.html` (shell), `Status Token.dc.html`, `Admin Curriculum.dc.html`, `Team Hub.dc.html`.
- `apps/web/src/styles/lms.css` and `geist.css` (new), `styles/fonts.ts`, `main.tsx` (one import), `assets/brand/` (the two wordmarks), and the LMS's CSS modules and TSX under `components/`, `routes/`, `shell/`. **`tokens.css` and `global.css` are unchanged.**
- `scripts/lms-type-floor.mjs` (new; in `pnpm lint` as `--check`), `scripts/reference-tokens.mjs` (also checks the fonts and `lms.css`).
- `compliance/goldens/` (re-captured, see below), `compliance/tests/e2e/lms-mobile.spec.ts` (new), `brand.spec.ts`, `tokens.spec.ts`; `apps/web/src/routes/library/SkillGuide.test.tsx`.

- **The reference is restyled, and the app with it (the D-031 route).** Goldens are captured only from `design-reference/`, and the app copies its values px for px, so a look change has to land on both sides by the same rule, or parity stops meaning anything. As in D-031's rebrand, the reference itself moves, the tokens are regenerated from it, the goldens are re-captured from it, and parity stays green. Tolerances (`maxDiffPixelRatio: 0.01`, `threshold: 0.15`) and masks are unchanged, and no golden is edited by hand.
  - Goldens are regenerated only through the official capture path (`pnpm compliance:capture`; the authoritative Linux set inside the pinned container, `GOLDEN_PLATFORM=linux pnpm compliance:docker compliance:capture`), and only for LMS / parity scenarios whose look changes.
  - `/course` and `/skill-library` have no reference file (D-079, D-110) and are not golden-pinned. They get the same bar, checked by `lms-mobile.spec.ts` and by screenshots.
- **Typeface.** Geist and Geist Mono, the www kit's faces, self-hosted from the same files the homepage uses (`apps/web/src/home/fonts`). There is no Google Fonts request anywhere in the LMS any more: the reference's 25 helmets link `./fonts/geist.css` instead, and the app's `fonts.ts` imports `styles/geist.css` in place of the @fontsource Hanken Grotesk / DM Mono files.
  - `design-reference/fonts/` holds byte-identical copies; `reference-tokens.mjs --check` fails if they drift.
  - Two new tokens, `--font-ui` and `--font-ui-mono`, carry them. **`--font-sans` and `--font-mono` are unchanged** (Hanken Grotesk, DM Mono): www's skill, offer, AI 101 and legal pages read them from the same generated `tokens.css`, so changing them would move www. Every LMS use switched to the new tokens; www's CSS was not touched.
- **`lms.css`, not the shared block.** The www pages (site, offer, guides, AI 101, legal, `/agreement` among them) inline both `tokens.css` and `global.css`, which `reference-tokens.mjs` generates from the token block every reference file shares. So nothing of this decision goes into that block. The LMS's four new tokens and its global rules live in one more file, `design-reference/lms.css`: every reference helmet links it, the learn app imports `apps/web/src/styles/lms.css` after `global.css`, and `--check` keeps the two byte-identical. Its rules use `:root`, which outranks `global.css`'s `html, body`, so load order does not matter.
  - Checked: built from this branch and from `main`, **72 of the 73 HTML pages are byte-identical**, assets and inlined CSS included; the 73rd is the learn app's own `index.html`. A first draft put these rules in the shared block, and the same comparison caught them reaching www.
- **The 16px floor.** `lms.css` sets `:root` and `body` to `font-family: var(--font-ui); font-size: 16px` (line-height stays 1.45 from `global.css`). `scripts/lms-type-floor.mjs` applies one rule to the reference and the app alike:
  - any `font-size` under 16px (including in a `font:` shorthand, and a React `fontSize` number) becomes 16px;
  - in the same declaration block as a raised size, a fixed `height` or `min-width` under 24px becomes 24px (count pills, badges), and a px `line-height` under 20px becomes 20px.
  - `--check` (run by `pnpm lint`) fails on any LMS file that sets type under 16px or uses the old faces. It never touches www (kit, site, home, guides, library, offer, ai101, legal), nor the shared token block.
- **Tap targets.** Two more tokens, `--tap: 44px` and `--tap-primary: 48px`, and three global rules in `lms.css`: `button`, `select`, `textarea` and text-like `input`s get `min-height: var(--tap)`; `button` gets `min-width: var(--tap)`; a primary button (`background: var(--action-primary)`) gets `min-height: var(--tap-primary)`. `min-height` beats an inline `height`, so this lands on both sides without editing every control. The app's `Button` primary also carries `min-height: var(--tap-primary)`. The `:root` token count the token-parity test reads on each side is 79 (75 in `tokens.css`, 4 in `lms.css`).
- **The shell.**
  - The expanded sidebar shows the Amplified Impact wordmark (the www kit's Logo 1, from `kit/logo.ts`), 160×24, its reversed file in dark. The collapsed 64px rail keeps the favicon tile. Sidebar widths are unchanged (248 expanded, 64 rail).
  - Brand row and top bar are 64px tall (were 56). The Open menu and Close menu buttons are 44×44 (were 34 and 32).
  - Under 768px, where the sidebar is a drawer, the top bar shows the wordmark (133×20) after the menu button, as the www kit's phone header does. It is a second `data-brand-slot`; the landmarks the harness selects are otherwise unchanged.
  - The wordmark is inlined as a `data:` URI (read with `?raw`): no request, and the CSP's `img-src 'self' data:` already allows it.
- **What the bigger type needed, on both sides.**
  - Status tokens are 24px tall (26 for md) and `vertical-align: top`, so a 16px pill no longer grows its row by a pixel.
  - Admin Curriculum's Actions column is 232px (was 200), so "Unpublish" / "Publish Now" stay inside the 1440 viewport.
  - Team Hub: seat slots are 44×44 (were 34), and the attention list's avatars 32×32 (were 22, which the 24px height rule would have made an oval).
  - The drawer body is a keyboard-focusable scroll region (`tabIndex={0}` with a visible focus ring), which axe's `scrollable-region-focusable` now asks for since 16px type makes it scroll.
- **Automated checks.** `compliance/tests/e2e/lms-mobile.spec.ts` (`@lms-mobile`, in `pnpm e2e`) opens every LMS route in fixture mode at 320, 375, 390, 430, 768, 1024 and 1280 and fails on: horizontal overflow (the document, or the shell's `<main>` outside an intentional `overflow-x: auto` region); visible text under 16px; a control under 44×44, or a primary under 48 tall (an inline link inside a sentence is exempt). `KNOWN` lists what PR A leaves to PR B (learner) and PR C (admin) by route, check and width; a listed finding that stops happening also fails, so the list only shrinks and is empty when PR C lands.
- **Goldens.**
  - All 98 shared `.json` fingerprints and all 98 `linux/` PNGs were re-captured with `pnpm compliance:capture` inside the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Playwright 1.63.0), run on the session host because there is no GitHub CI. The only addition to the container was the host's certificate trust store, so its Chromium could fetch the reference's React and Babel from unpkg through the session's proxy. Every scenario moves, because body type, the faces and the shell bar are on every screen.
  - Captured twice, before and after moving the rules into `lms.css`: all 196 files byte-identical, which is both the determinism `goldens:check` asks for and proof that the move changed no pixel. Parity in the same container: 55 of 55.
  - `compliance/goldens/linux/PROVENANCE.txt` is not edited (nothing in `compliance/goldens/` is edited by hand); this entry is the provenance of this capture.
  - `win32/` PNGs are stale until someone re-captures them on Windows (`pnpm compliance:capture`): Windows rasterization cannot be produced on Linux (D-020). Until then a local `pnpm compliance` on Windows fails on pixels while fingerprints pass; Linux is the authoritative set.
  - Before this change, local and container runs on `main` both failed the same 10 sidebar and dark-theme scenarios on pixels only: the app's brand lockup had drifted from the reference's. The wordmark replaces both, and those 10 pass.
- **PR B1, the in-shell learner portal on a phone.** Phone layouts are written once, in `lms.css`, under `@media (max-width:767px)` (and `359px` for the narrowest phones). Each rule targets a `data-phone="…"` hook that the reference and the app put on the same element, so neither side can drift.
  - The rules carry `!important`, because the reference sets everything inline and the app's CSS modules load after `lms.css`.
  - None applies above 767px, so the only goldens they can move are the 390px ones.
  - The hooks are attributes, not logic.
  - **Dashboard:** the announcement banner's action moves under its text.
  - **AI Employee page:**
    - the poster is 4:3 (1:1 under 360px), with its play button raised clear of the title;
    - the player's control row wraps instead of clipping;
    - the chapter rail is a 2-column grid instead of a sideways scroller, with its note on its own line under "Chapters";
    - the deployment card's "Open" link is 44px tall at every width;
    - the session link in the meta line has a 45px tap area that takes no room (padding offset by margin).
  - **Vault:** the two tabs wrap at 320.
  - **Team Hub:**
    - the header actions and the reminder rows wrap;
    - Team Activity becomes stacked cards (the header row hides, and the date and count cells borrow the header's own names as labels) instead of a 920px sideways table.
  - **Checker:** `lms-mobile.spec.ts` exempts an inline link with other words beside it in the same block, bare or in sibling spans, per WCAG 2.5.8's inline exception. The learner routes left `KNOWN`.
- **PR C, the admin console and `/admin/crm-sync` on a phone.** The same mechanism as B1: rules once in `lms.css` under 767px, `data-phone` hooks on the same element in the reference and the app, `!important`.
  - **Every table is stacked cards under 768px:** Curriculum, the cohort schedule, Learners and Teams, the Resource Vault, Announcements' History, Tiers' Access Matrix and Staff's Permissions. B1's `tscroll`, `tmin` and `thead` drop the sideways scroller and the header row; the row is a `card` whose cells wrap. A `cell` takes a line; a `cell-lead` opens the card, with a `cell-tag` and a `cell-chev` beside it; a `cell-grow` fills its line; a `cell-inline` keeps its width; a matrix row is a `card-grid` of two columns.
  - Labels are the column headers' own text, through `data-label` and `::before`. In Staff's matrix the reference reads them as `roles[$index]`, a binding its template engine already supports, and the app reads `c.role`. At 768 and up the tables are the reference's, with their own scroll region where they are wider than the page.
  - **Forms, drawers and the rest:**
    - Announcements: the segmented tracks wrap.
    - Module Builder: Build Steps put the arrows and the number on a row of their own, with the fields full width and Chapter filling its line. The replay row puts Replace under its text, and the preview tabs wrap.
    - Overview: the header actions and the funnel legend wrap, and each funnel bar goes under its label.
    - Tiers: the tier cards are one column, and the Upgrade Requests actions wrap.
    - Drawers: Edit Session and Upload Resource stack their two-column pairs, and the learner drawer puts each build row's tokens under its name.
  - **Primaries are 48px at every width, on both sides.** The reference's renderer rewrites a `style` attribute with a space (`background: var(--action-primary)`), so PR A's attribute rule never reached the console's primaries, and the app's own classes stopped at 44. Each one now carries `min-height: var(--tap-primary)`:
    - Module Builder's Publish / Update Live Module;
    - New AI Employee (Overview, Curriculum), and Curriculum's Publish Now / Unpublish;
    - Cohorts: Open Enrollment, the schedule rows' Go Live / End Session / Publish Replay, and Save Session;
    - Upload Resource, Publish to Vault, Send Now and Invite Staff.
  - **One drift fixed:** in Tiers' Access Matrix a fixed feature's Agent cell is a button in the reference, so the global 44px rule sized it, while the app's span stayed 28. The span now takes the same 44px box. It sits below the fold of every golden, which is why parity never saw it.
  - **`/admin/crm-sync`** has no reference, so only the app changes. Its CSS module stacks the three tables under 768px. The header row leaves the screen but stays for assistive technology, and an empty cell hides. Retry is 44 tall. The TSX gains only `data-label` attributes, taken from the view-model's own column copy.
  - **Goldens:** 22 `linux/` PNGs re-captured with `pnpm compliance:capture` in the pinned container, twice, all 196 files byte-identical. The 48px primaries are visible at 1440 and 1024, so these moved:
    - `admin-overview`, `admin-overview-dark`, `admin-overview-laptop`, `admin-curriculum`, `admin-cohorts`, `admin-avault`, `admin-staff`, `admin-builder`, `admin-builder-marketing` and `admin-builder-locked`, `main` and `page` each;
    - the `admin-cohorts-edit` and `admin-vault-upload` drawers.
  - No `.json` fingerprint moved. Parity in the container is 55 of 55. `win32/` stays stale, as PR A records.
  - **Checker:** `KNOWN` is empty. Every LMS route is clear at all seven widths. At 320, 390 and 430 every `data-phone` element has the same box in the reference and the app, on every admin screen and drawer.
- **Not changed:** Stripe and Payment Links, the seat cap (D-154), webhook behavior, course gating and invite logic (D-153), GA4 / Meta tags and `analytics.js` (D-155), `/agreement`, www's pages and CSS, the learner vocabulary (AI Employee, Session, Step, Built, Deployed), routes, view-models and copy. No product logic, no emails, no Railway variables, no secrets.

## D-157 · The Admin Console, PR 1: capabilities by staff role, an append-only audit log, the Roles matrix

**Date:** 2026-11-15
**Approved by:** Connor commissioned the Admin Console (his brief dated Sunday, Nov 15, 2026, 1:22 AM MST, America/Phoenix) and authorized Grok Bot to make its product decisions overnight. The spec Grok Bot wrote from it ("Implementation spec: Amplified Impact Admin Console", Nov 15, 2026, about 3:30 AM MST) is the source for every Console PR; its decisions D1 to D16 (below) are each "made overnight, Connor can revise". This is the spec's D-CON-1, the umbrella entry the later Console PRs (D-CON-2 to D-CON-10) build on.
**Status:** on pull requests. Over the spec's 1,500-line limit (§ 4), PR 1 lands in three, in order, under this one entry (as D-156 did with its PR A, B and C): **1a** the rules and the API (`claude/console-1-audit`), **1b** the Console's web pieces, Roles, Denied and the Console 404 (`claude/console-1-web`), **1c** the Audit Log screen (`claude/console-1-audit-ui`), then **1d** the grouped admin sidebar and its re-captured goldens (`claude/console-1-nav`), stacked after 1c so the golden change is reviewed on its own.
**Scope:**
- 1a: `packages/core/src/console.ts` (new) and its export from `index.ts`; `apps/api/src/console/` (new: `guard.ts`, `audit.ts`, `routes.ts`); `apps/api/src/app.ts` (one registration); `apps/api/src/db/schema.ts` (`audit_log`); migration `0015_console_audit` (the table, four indexes, three checks and the append-only trigger); tests (`packages/core/test/console.test.ts`, `apps/api/test/console-authz.test.ts` and `console-audit.test.ts` new; `test/authz.test.ts`'s route inventory and `src/db/schema.test.ts`'s table lists, additions only).
- 1b: `apps/web/src/data/console.ts` and `console-fixture.ts` (new); `components/console/` (new: ConsolePage, StateBlock, DataTable, StatusBadge); `routes/console/` (new: `console.vm.ts`, `useConsoleGate.ts`, `NotFound.tsx`, `Roles.*`); `router.tsx` (two routes); `shell/Breadcrumbs.tsx` (two crumbs); `shell/navModel.ts` (`consoleNav`, not wired, see below); tests; `compliance/tests/e2e/console.spec.ts` (new) and `lms-mobile.spec.ts` (routes added).
- 1c: `components/console/FilterBar` and `KeyValue` (new); `routes/console/AuditLog.*` (new); `router.tsx` and `Breadcrumbs.tsx` (one line each); tests.
- 1d: `design-reference/Amplified Impact LMS.dc.html` (the admin `nav` block only); `docs/SCREENS.md` (the admin nav groups); `apps/web/src/shell/navModel.ts` (`adminNav` removed; `consoleNav` is the admin sidebar), `AppShell.tsx` (wires it, with the viewer's staff role), `data/console.ts` (`fixtureConsoleRole`); `compliance/goldens/` (30 files, re-captured; listed below); tests (`navModel.test.ts`, `console.spec.ts`).

- **The spec's decisions (each revisable).** D1 masquerade is look-only, blocking every write but Exit and Extend. D2 no Console during a masquerade. D3 Support is the existing `Support` role: billing read-only, no masquerade, export or ops screens, the audit log without IP or user agent; Instructor and Content Editor get no Console access. D4 a Team Plan seat change is a confirmed Stripe request between the 16 and 41 seat tiers; the AI Accelerator's cap is not editable. D5 incidents open by fixed rules, with no notifications. D6 the audit log is kept forever and append-only; exports are CSV, 10,000 rows at most, Owner and Admin only, audited. D7 masquerade sessions are 15 minutes, +15 per Extend, 60 at most, with a 10 to 500 character reason each time. D8 masquerade is Owner and Admin only, behind a flag only the Owner can turn off, never as staff, one session at a time. D9 no "Replace secret". D10 Console-owned flags only. D11 the capability matrix is defined in code and read-only; roles and the `PermKey` matrix stay on `/admin/staff`. D12 no workspace delete or email change. D13 Stripe deliveries are view-only; GHL retry reuses the CRM-sync reset. D14 Run Now covers the six `JOB_NAMES` jobs and the four GHL loops, never `billing`. D15 the Console's home will be `/admin/health`; `/admin` is unchanged. D16 a workspace is a `teams` row.
- **Net-new, not golden-pinned.** Like `/course` and `/skill-library` (D-079, D-110), the Console's screens have no reference file and no golden. They render inside the real AppShell, with its landmarks and the D-156 wordmark, and meet D-156's bar: `lms-mobile.spec.ts` checks them at 320, 375, 390, 430, 768, 1024 and 1280 (no sideways scroll, nothing under 16px, 44px targets and 48px primaries), axe finds nothing serious or critical in light or dark, and each PR ships screenshots at 390 and 1280 (and 320 for the audit log).
- **Who may do what (spec § 5).** `CONSOLE_CAPS` lists each capability with the roles besides the Owner that hold it, row for row from the spec's table; `consoleCan(role, cap)` passes the Owner always, Admin and Support by the table, and fails closed on Instructor, Content Editor, an unknown or missing role, and an unknown capability (even for the Owner, so a misspelt one never quietly opens). The server is authoritative: `requireConsole(cap)` runs after `requireSession` (and after `requireJsonSameOrigin` on a write) and reads the role from the user row on every request, so a role change applies at once.
  - A 401 is unchanged. A refusal is 403 `{ error, code: 'console_forbidden' }`. A refused **staff** member is one audit row (`console.access_denied`, outcome `denied`, the route and the capability); a learner is refused without a row.
  - `GET /api/console/me` answers any staff member with their role and capabilities (an empty list for Instructor and Content Editor) and refuses a learner.
- **The audit log (spec § 7.8).** `audit_log` (migration 0015): `id` (bigserial, so a page's cursor is the last id it showed), `at` (epoch ms, `ts()`), the actor (user id, role at the time, `staff` or `system`), the masquerade session, the action, the target (type, id, label), the reason, `before` and `after` (JSONB), the outcome (`ok`, `denied`, `blocked`, `failed`), the IP, the user agent and the request id. Indexes on time, actor, action and target. Checks on the outcome, the source, and a staff row naming its staff member.
  - **Append-only, in the database.** A statement-level trigger raises on every UPDATE and DELETE, matching rows or not, whoever runs it (tested against Postgres). TRUNCATE is not covered: the test harness empties every table with it between tests, and only the database owner can run it, who could drop the trigger anyway.
  - **The writer**, `audit()`, takes the visitor's own IP (`lib/client-ip.ts`), the user agent cut to 300 characters and the request id, and refuses an action outside the closed `AUDIT_ACTIONS` list. `redactAuditPayload` runs on every payload: it drops keys matching `secret|token|key|password|hash|authorization|cookie|signature` and values starting `sk_`, `rk_`, `whsec_` or `re_`, at any depth, and replaces a payload over 2 KB with a note of its size (never a prefix, which could end inside something).
  - `AUDIT_ACTIONS` is PR 1's two (`console.access_denied`, `audit.export`) plus the names the spec gives the later PRs, so the filter and the list are settled once. The database does not check the action: each PR adds names, and a CHECK would need a migration for each.
- **The routes.** `GET /api/console/audit` (`audit.read`): filters by actor, action or action group, target words, outcome and date range; newest first; `{ rows, nextCursor }`, 50 a page, 200 at most; a malformed filter is 400 `invalid_query`; Support gets `ip` and `userAgent` as null. `POST /api/console/audit/export` (`export`): the same filters, a CSV of every matching row with each cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return prefixed with `'`; over 10,000 rows is 422 `export_too_large`; the export (and a refused one) is audited, after the read so it never lists itself. `GET /api/console/roles` (`ops.read`): the matrix built from `CONSOLE_CAPS`, with `/admin/staff`. Every answer, refusals and 429s included, is `Cache-Control: private, no-store`. Limits per session, through D-137's limiter: reads 60 a minute, exports 5 (writes, 20, arrive with PR 2). No GET writes anything but the audit row for a staff member it refuses.
- **The web.** `/admin/audit` and `/admin/roles` are children of AppShell; `/admin/*` after them is the Console 404 inside the shell, and the app's own `*` still sends every other unknown address home. A screen asks `/api/console/me` and shows Denied when the role lacks its capability. The shared states: a loading skeleton, an empty state of one sentence and one action, an error with `role="alert"` and Retry (a 429 says "Too many requests"), Denied, and the 404. Denied and the 404 lead to the existing `/admin` Overview ("Go to Overview", the mockup's words); the spec's "Go to Health" waits for `/admin/health` (PR 10). Tables become cards with each column's own label below 768px, or in a container under 600px (beside the sidebar at 768 to 1023), with no sideways scroll.
  - **The fixture build** reads `data/console-fixture.ts`: the prototype's fictional staff and documentation-range addresses, plus two fixture-only switches for screenshots and e2e (`?console-role=` and `?console-state=`). `console.ts` loads it behind `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, which Vite makes a constant, and `console-build.test.ts` builds it both ways to prove the http build has none of it.
- **The sidebar: the Console's groups (1d).** Approved by Connor, Nov 15, 2026, 9:37 AM MST (option (a) on PR 1b): "go with option (a). Regroup the admin sidebar into the console groups from spec §8, and officially regenerate the affected admin parity goldens (the 15 of 55 that changed). Log this in DECISIONS, citing Connor's approval, and record which goldens changed and why." The "Go to Overview" link on Denied and the 404 stays until Health exists.
  - **The reference moved first (the D-031 route).** In `design-reference/Amplified Impact LMS.dc.html`, the admin `nav` is now Health (Overview) · Build (Curriculum, Module Builder, Resource Vault, Cohorts & Sessions, Announcements) · Support (Learners & Teams) · Revenue (Tiers & Upgrades) · Operations (Audit Log) · Access (Roles & Permissions, Staff & Roles): the same groups, rows, labels, icons (`listChecks` and `lock` for the two new rows, both already in `lms-data.js`), badges and order the app's `consoleNav` renders for the Owner, who is the reference's staff viewer. The prototype has no Audit Log or Roles screen, so those two rows open its Overview. Nothing else in the reference changed; `reference-tokens --check`, `lms-type-floor --check` and `check-css-colors` pass. `docs/SCREENS.md`'s admin nav list says the same.
  - **The app.** AppShell renders `consoleNav` for staff in place of `adminNav`, which is removed. Its Console rows are filtered by `consoleCan` on the viewer's own staff row (`users.staff_role`, the column the API authorizes on): Owner and Admin see Audit Log and Roles & Permissions, Support sees Audit Log only, and Instructor and Content Editor see neither (and no Operations heading). The existing rows are the same for every staff role. The fixture build may preview a role with `?console-role=`; the http build has no such switch.
  - **Goldens, re-captured with `pnpm compliance:capture` in the pinned container** (`mcr.microsoft.com/playwright:v1.63.0-noble`), twice, all 298 files byte-identical between the two captures. The capture rewrote exactly the 15 scenarios the measurement on PR 1b named, and nothing else: the sidebar's group headings and row order are in `shell-admin`'s sidebar region and in every `admin-*` scenario's page region (which contains the sidebar). Their `main`, `header` and drawer regions do not contain the sidebar and did not move.
    - `shell-admin-sidebar.json` and `linux/shell-admin-sidebar.png`.
    - The page region's `.json` and `linux/….png` of `admin-overview`, `admin-overview-dark`, `admin-overview-laptop`, `admin-curriculum`, `admin-builder`, `admin-builder-marketing`, `admin-builder-locked`, `admin-cohorts`, `admin-learners`, `admin-learners-teams`, `admin-avault`, `admin-announce`, `admin-tiers` and `admin-staff`.
    - 30 files in all. Parity in the container on the new goldens: 55 of 55. Tolerances and masks are unchanged, nothing was edited by hand, and `PROVENANCE.txt` is not edited: this entry is the capture's provenance. `win32/` stays stale, as D-156 records.
- **Masquerade is the audited impersonation D-138 left "Not done".** It is PR 3 (D-CON-3); PR 1 ships none of it. `?as=` stays fixture-only.
- **Not changed:** checkout and Payment Links, the D-154 seat cap, the Stripe webhook and provisioning, GHL, course gating (D-153), GA4 and the Meta Pixel (D-155), `/agreement`, www, the existing admin screens, masks and tolerances; `design-reference/` and goldens except the admin sidebar in 1d. No emails, no Railway variables, no secrets. No Stripe scope is needed.

## D-159 · The AI Accelerator's two ways to pay are two equal buttons on every www page that sells it

**Date:** 2026-11-15
**Approved by:** Connor, Sunday, Nov 15, 2026, 1:03 PM MST (America/Phoenix). On /forum (the offer page) the main "Get Amplified AI Accelerator" button went to the paid-in-full Payment Link and the two-payment option was only a small text link, and a buyer who wanted two payments clicked the big button and was charged in full. Wherever the Accelerator is sold, show a real, equal pair of buttons, in his exact words.
**Number:** D-158 is taken by Console PR 2, in flight on other branches (`claude/console-2-*`), so this is D-159.
**Status:** on a pull request.
**Scope:**
- `apps/web/src/offer/pay-pair.ts` (new: the pair, shared), `src/offer/content.ts` (the words), `src/offer/render.ts` and `src/offer/offer.css` (/offer and /forum).
- `apps/web/src/site/offers.ts` (`offerActions`, which /pricing's Accelerator card and /team-build's two buy blocks render) and `src/kit/kit.css`.
- `apps/web/src/home/prices.ts`: `twoPay` reads the card's own terms ("Or 2 payments of $3,750.") now that the text link it read is gone. Same figure, 3,750.
- Tests: `apps/web/src/offer/render.test.ts`, `src/pricing/render.test.ts`, `src/team-build/render.test.ts`; `apps/api/test/analytics.test.ts`, with `test/web-raw.d.ts` (new: the `?raw` type the web render modules need in the API's typecheck).

- **The pair, word for word** (Connor's strings, the middle dot included; not Title Case, on purpose):
  - `Pay in full · $7,500`, with `One payment today` under it, to the `cohort-full` Payment Link.
  - `2 payments · $3,750/mo`, with `Today and again in 30 days` under it, to the `cohort-two-pay` Payment Link.
  - `plus applicable tax`, once, under the pair.
  - The amounts are never typed again: `$7,500` is the card's `price.amount`, and `$3,750` is the payment in its `price.terms`, read by `home/prices.ts`.
- **Removed:** the single "Get Amplified AI Accelerator" button and the "Or pay in 2 payments of $3,750" text link, on every page below. Every other word on those pages is unchanged, the price block's "Or 2 payments of $3,750." included.
- **Equal weight.** Both buttons carry the page's one buy-button class (`button primary` on /offer, `btn btn-primary` on the kit's pages; /pricing draws that class outlined until its picker picks the card, as for every card there), the same size and the same weight. Neither is a primary beside a secondary, and neither is a "Get …" button.
- **Layout.** A grid of two equal columns, `repeat(auto-fit, minmax(min(100%, 216px), 1fr))`: side by side wherever both labels fit on one line, otherwise stacked, each full width. Each is 48px tall on /offer and 52px on the kit's pages (their existing card buttons). Every caption is 16px. In the browser, at 320, 375, 390, 430, 768, 1024 and 1280 on /offer, /forum, /pricing and /team-build: no sideways scroll, every label and caption on one line, both buttons the same size.
  - Side by side: /team-build's hero from 768 up, its price section at 768, /offer and /forum at 768 (one card a row).
  - Stacked: on phones everywhere, and where the card is narrower than about 444px on a wide screen: /offer's three cards from 1024, /pricing's four (and two) per row, /team-build's price panel at 1024 and 1280. Side by side there, each button would be 120 to 150px wide and its words would break over two or three lines.
- **Where the Accelerator is sold, and what changed:**
  - **/offer and /forum** (one page, `offer.html`): the Accelerator card's button and text link become the pair.
  - **/pricing**: the Accelerator card's button and text link become the pair.
  - **/team-build**: both buy blocks (the hero's and the price section's, one function) become the pair.
- **Checked, with no Accelerator buy button, so unchanged:**
  - `/`, the homepage (v3): its Accelerator card ("Claim a Founding Seat", "Or 2 payments of $3,750") and its eight-Wednesdays section ("Claim a Founding Seat", "See the Accelerator") all link to /team-build. Under Connor's D1 for homepage v3 there is no Stripe link on `/`.
  - /offer/welcome; /teams, /agents and /insiders (their own plans' carts only); /free, /about, /library and /ai101; the 57 skill and guide landing pages. The kit's header and footer link the Accelerator to /team-build on each.
  - /agreement, /terms and /privacy were read only to check, and are not touched.
- **Links, states and analytics, unchanged.**
  - Each button's href is the same `%%link:<cart>%%` token the old button and link had, so the API fills them per request exactly as before.
  - Both sit inside the card's `.act-link`, which shows only while the card's state (its first cart's) is `link`. Prelaunch (`OFFER_OPEN` off, "Opens soon."), founding closed after Nov 30 (the waitlist), and sold out at 15 seats across both links (D-154, the waitlist) all hide both. The API also leaves both hrefs empty then, so neither is a live link.
  - If only one link were set, the card follows its first cart as before. A choice whose own link is empty hides with its caption (`:has()`, with a sibling rule for the caption), and the other takes the row.
  - `withAnalytics` labels both at read time: `data-ai-cart="cohort-full"` / "Amplified AI Accelerator, Paid in Full", and `cohort-two-pay` / "Amplified AI Accelerator, Two Payments". `analytics.js` sends `begin_checkout` and `InitiateCheckout` for either. `analytics.test.ts` now renders the real /offer, /pricing and /team-build, serves them through the API, and checks both buttons' labels and hrefs in the open, prelaunch, closed, sold-out and one-link states.
- **Tax.** The code never turns on `automatic_tax` (`docs/STRIPE-HANDOFF.md` § 1, "David decides"), and whether the Payment Links collect tax is a setting on the links in Stripe, which this repository cannot see. "plus applicable tax" is Connor's line, used as given.
- **Not changed:** the Stripe Payment Link URLs and their variables, the seat cap (D-154) and its count, the webhook, checkout and provisioning, course gating (D-153), `analytics.js`, GA4, the Meta Pixel and where the tags load (D-155), `/agreement`, the homepage, the LMS app, `design-reference/` and every golden, and Railway. The proof line ("100 agents, 700+ homes a year") stays only where it was. No emails, no Railway variables, no secrets.
## D-160 · Admin redesign R2: build the signed-off mockup to the pixel (umbrella for the R2 stack)

**Date:** 2026-11-16
**Approved by:** Connor signed off the Round 2 admin mockup on Sunday, Nov 15, 2026, 4:58 PM MST (America/Phoenix): *"Yes, build it and make sure that it builds it to match the mockup to the PIXEL."* The handoff that carries it is committed byte for byte under `design-reference/admin-redesign-r2/`: `START-HERE-build-message.md` (the chat brief, which wins over the spec), `BUILD-SPEC.md`, `Design notes.md`, `AdminRedesign.jsx` (the canonical mockup, sha256 `56c88323198fd96b050374b828800dca4041a0b5e10cfbce8869191537018694`, the signed-off export plus the two review-nit fixes its header names), `package.json`, `harness/render-mockup.mjs`, `ref/MANIFEST.tsv` and the six `anchors/*.png`. Round 1 (`AdminConsole.jsx` and its design notes) is **superseded** and is not used. **The renderer's fallback fonts (option A):** Connor, Nov 16, 2026, relayed by the user after R2-0 stopped on the dimension check below: *"go with option A. Always render → and ⌘ with FreeSans so all 124 references match the mockup's dimensions and every check is ≤0.045%. Keep the 0.1% threshold and the hard stop on any dimension mismatch exactly as they are. Pinning pixelmatch 8.0.0 and skipping @types/pngjs are both fine."*
**Status:** R2-0 on a pull request (`claude/admin-r2-0-refs`, #131). D-158 (Console PR 2) is reserved by a pull request still open; its text is not on `main` yet. D-159 (#130) is on `main`, above. This is the umbrella entry for the whole R2 stack; each later R2 PR amends it with its own scope, enforced cells and golden re-captures.
**Stack:** R2-0 references and harness (this) · R2-1a root-cause scoping · R2-1b R2 tokens, primitives and the new AppShell (replaces #125) · R2-2 Build screens · R2-3 Overview, Tiers, Learners, Audit and Roles · #126, rebased · R2-4 Workspaces and Users (supersedes #127 and #128) · R2-5 Search and ⌘K (supersedes #129) · then spec PRs 3–10.

- **R2-0 changes no app code, no golden and no tolerance.** Nothing under `apps/` or `packages/` is edited, `compliance/goldens/` is untouched, and the main config's `parity` (55), `parity-http` (24) and `e2e` (112) projects run exactly the tests they ran before.
- **The renderer: one, for the refs and for every app capture.** The pinned container `mcr.microsoft.com/playwright:v1.63.0-noble` (the one the authoritative Linux goldens use), driving its full Chromium build, Google Chrome for Testing **153.0.8010.12** (`/ms-playwright/chromium-1243/chrome-linux64/chrome`), with the fallback fonts below. `parity:admin-r2` launches the same binary (`channel: 'chromium'`, verified by its launch log) with the harness's launch arguments.
- **Why the fallback fonts are part of the renderer.** The mockup uses two characters the self-hosted Geist (`design-reference/fonts/`, the Google Fonts *latin* subset) does not contain: **→** (U+2192, 11 uses in Curriculum, Module Builder and Tiers descriptions) and **⌘** (U+2318, the top bar's ⌘K hint on every desktop and laptop screen). The browser draws them from a system font, and system fonts differ between machines. In the pinned container as it ships, `system-ui` and `sans-serif` resolve to WenQuanYi Zen Hei, whose → is wider than the one in the handoff refs: `curriculum-390.png` rendered 390 × 3158 against the manifest's 390 × 3134 ("Paste a new lead → a first reply in your voice" wrapped to a second line), so the dimension check read 123 of 124, curriculum-1280's anchor read 0.1374%, and R2-0 stopped there for Connor's call (above). Geist itself rasterises the same in Chrome 153 and in Grok Bot's Chrome 156: the 28 regenerated PNGs that use neither glyph (all 390-wide) are byte-identical to the handoff's.
- **The fix, option A: `design-reference/admin-redesign-r2/harness/fonts.conf`.** It includes the container's own `/etc/fonts/fonts.conf` and puts **FreeSans** (`fonts-freefont-ttf`, already in the image) first, so → is drawn from FreeSans. FreeSans has no U+2318, so **⌘** falls through to the next font in the container's order that has it, **IPAGothic**, the same font the container uses without the file; both are fixed by the pinned image. No font file is added and `render-mockup.mjs` is unchanged. It is applied as `FONTCONFIG_FILE` in exactly two places, and nowhere else:
  - **the refs:** `pnpm parity:admin-r2:refs`, which installs the harness's pinned dependencies (`npm install --prefix design-reference/admin-redesign-r2`: esbuild 0.28.2, playwright-core 1.65.1, react and react-dom 18.3.1; gitignored) and runs `docker run --rm --network none -v $PWD:/work -w /work -e FONTCONFIG_FILE=/work/design-reference/admin-redesign-r2/harness/fonts.conf -e CHROME=/ms-playwright/chromium-1243/chrome-linux64/chrome mcr.microsoft.com/playwright:v1.63.0-noble node design-reference/admin-redesign-r2/harness/render-mockup.mjs` (append `--screens …` or `--widths …` for a subset);
  - **the captures:** `compliance/admin-r2.config.ts` passes it in the browser's launch `env`, so only `parity:admin-r2`'s browser reads it. Its `renderer` test proves it on every run: → in the mockup's font stack must measure the same as → in FreeSans, and ⌘ the same as ⌘ in IPAGothic.
  - The main config's projects (`compliance`, `compliance:capture`, `compliance:http`, `e2e`) never read it, and their 55 goldens are untouched.
- **The refs: 124 PNGs in `ref/`, rendered with `fonts.conf`.** Two full renders are byte-identical (124 of 124). `ref/MANIFEST.local.tsv` lists each file's width, height and sha256 from this renderer; `ref/MANIFEST.tsv` stays as handed off (Grok Bot's Chrome 156 hashes, 28 of which still match). 15,583,194 bytes.
- **The manifest dimension check: 124 of 124** match `MANIFEST.tsv`'s width × height exactly. The hard stop on any mismatch stays: `parity:admin-r2` fails if a ref ever differs from the manifest's dimensions.
- **The anchors** (pixelmatch 8.0.0, threshold 0.1, `includeAA: false`), each against its regenerated twin:

  | anchor | dims | differing px | % |
  |---|---|---|---|
  | cohorts-sessions-1440 | 1440 × 712, OK | 41 | 0.0040% |
  | curriculum-1280 | 1280 × 1130, OK | 416 | 0.0288% |
  | curriculum-390 | 390 × 3134, OK | 542 | 0.0443% |
  | overview-1024 | 1024 × 1148, OK | 41 | 0.0035% |
  | roles-confirm-1280 | 1280 × 900, OK | 25 | 0.0022% |
  | workspaces-1280 | 1280 × 737, OK | 41 | 0.0043% |

  The 41 px (25 under the confirm scrim) are the ⌘ glyph, IPAGothic here and another font on Grok Bot's machine; curriculum's are the → glyphs, FreeSans here.
- **The parity rule, for every R2 PR (BUILD-SPEC § 6).** Capture each built screen at 1440, 1280, 1024 and 390 (viewport W × 900, phone W × 844), DPR 1, animations and caret off, after `document.fonts.ready`, with a test-only stylesheet that does what the harness's `FULL` CSS does, full page; roles-confirm is the viewport frame at the page top with the confirm dialog open. Compare with pixelmatch at a per-pixel threshold of **0.1**, `includeAA: false`. **Pass = identical width × height AND ≤ 0.1% differing pixels.** Masks: **none** (`compliance/parity/admin-r2-masks.json` is `[]`; each mask would need a selector or rect, a screen, widths and a one-line reason, for genuinely dynamic text only). The threshold, the 0.1% ratio, the dimension hard stop and the masks are unchanged by option A and are never loosened to make a cell pass.
- **`pnpm parity:admin-r2`** (`compliance/admin-r2.config.ts`, `compliance/tests/e2e/admin-r2-parity.spec.ts`, `compliance/lib/admin-r2*.ts`): its own config, so no existing project changes; the main config ignores the spec by name. It checks every ref against `MANIFEST.tsv`'s dimensions, captures and compares each built cell, and writes `compliance/parity/out/report.md` (the screen × width table, diff % and px, dims OK/FAIL), the diff PNGs and app/ref side-by-sides (gitignored). It is **report-only**: a failing cell fails the run only once it is in `ENFORCED`, which is empty in R2-0, and a cell with no route is reported "not built", never a pass. The `screen → route` map is empty; its seam is the parity fixture R2-1 builds (fixture mode only, never with `APP_URL`; clock frozen with Playwright's clock API at Thu Dec 10, 2026, 9:30 AM MST, `2026-12-10T16:30:00Z`; zone America/Phoenix; viewer Owner). `pixelmatch` **8.0.0** (pinned exactly; it measures the 0.1 threshold as an OKLab HyAB distance) and `pngjs` 7.0.0 are added as root dev dependencies, and the lockfile adds those two and nothing else. pngjs's three used members are typed in `compliance/lib/pngjs.d.ts` instead of adding `@types/pngjs`. Connor approved both (above).
- **Lint scope.** No check needed a change: eslint already ignores `design-reference/**`, and `check-css-colors`, `lms-type-floor` and `reference-tokens` read only `apps/web/src/` and the top-level `design-reference/*.dc.html`, so the mockup JSX and the harness are not scanned as app code.
- **Not changed:** Stripe checkout and Payment Links, the D-154 seat cap, webhooks and provisioning, gating, GA4 and the Meta Pixel, `/agreement`, www, PR #130's files, every golden, mask and tolerance. No secrets and no Railway variables.
- **R2-1a: root cause** (`claude/admin-r2-1a-scope`, stacked on R2-0; BUILD-SPEC § 8). It builds nothing of the R2 look (no R2 tokens, primitives or shell: that is R2-1b) and changes no logic, route, view-model or copy. Desktop LMS and admin screens return to their pre-D-156 sizes; phones keep D-156's. D-156 itself is not edited; this is its correction.
  - **The cause.** #117 (D-156) applied the phone standard at every width, with no media query. `scripts/lms-type-floor.mjs` raised every `font-size` under 16px to 16px and, in the same block, every fixed `height` / `min-width` under 24px to 24px and every px `line-height` under 20px to 20px. `lms.css` set `:root{font-size:16px}`, `button,select,textarea,input{min-height:44px}` and `button{min-width:44px}` everywhere. #117 also raised by hand the shell (brand row and top bar 56 → 64, Close and Open menu 32 / 34 → 44), Team Hub (seat slots 34 → 44, attention avatars 22 → 32), Status Token (`vertical-align: top`, and the reference's JS-string heights and sizes) and Admin Curriculum's Actions column (200 → 232). #120 (PR C) added `min-height: var(--tap-primary)` on every admin primary, Curriculum's `.create` / `.act` among them, and `min-*: var(--tap)` on Tiers' `span.cell`. So every desktop and laptop screen rendered at phone sizes.
  - **The token scheme** (`lms.css`, both copies byte-identical; `reference-tokens --check`). One token per distinct original value, named by it: `--fs-N` (a `font-size`), `--bx-N` (a `height` or `min-width`), `--lh-N` (a px `line-height`). Each is N px outside any media query and 16px / 24px / 20px inside `@media (max-width:767px)`, the values #117 wrote, so a phone renders as before. There are 13: `--fs-11`, `--fs-11_5`, `--fs-12`, `--fs-12_5`, `--fs-13`, `--fs-14`, `--fs-15`, `--bx-16`, `--bx-18`, `--bx-20`, `--bx-22`, `--lh-16`, `--lh-18` (a point is written `_`). `--tap` and `--tap-primary` are 0px outside and 44px / 48px inside. The body's 16px and the three global control rules (the `min-height`, the `button` `min-width` and the primary attribute rule) moved into the phone block. Geist stays at every width. The token-parity test counts 92 `:root` tokens (79 + 13).
  - **The script, `scripts/lms-type-scope.mjs`.** BASE is `c1e3921`, confirmed as main just before #117 (the first parent of #117's merge, `f878a02`). For each lms-type-floor target that existed at BASE, it re-runs the codemod's rules with marks and asserts that the unmarked result equals `lms-type-floor.mjs`'s own output byte for byte. It then aligns that text with the file today (a Myers line diff, then a token diff inside each changed hunk), rewrites each mark that lands on a raw floor value to its token, and writes lms.css's two generated token lines.
    - It is idempotent (a second run rewrites nothing). `--check` fails on a raised declaration still raw or on stale token lines; `--report` lists what landed nowhere. It needs BASE in the history and CI checks out shallow, so it is not in `pnpm lint`; its `--check` is in the results.
    - Its output is committed alone: **1,024 declarations in 64 files** (24 reference `.dc.html`, 39 app CSS modules and `__tokens.tsx`). Every carried CSS mark was checked to land in a rule with the same selector that held its original value. One mark lands nowhere, because #117 had already replaced it by hand (Team Hub's attention avatar, below).
    - **Left as they are: `/course` and `/skill-library`** (`KIT_LOOK` in the script). PR B2 (#119) rebuilt them after #117 in the www kit's look, whose stated rule is no text under 16px, 44px targets and 48px buttons at every width, as on www. Their 23 surviving codemod values are that design now, not a leftover, and the pages have no reference or golden. Dropping the two folders from `KIT_LOOK` and re-running scopes them like the rest.
  - **The floor check.** `lms-type-floor.mjs --check` (in `pnpm lint`) fails only on a RAW size under 16px: `font-size`, a CSS `font:` shorthand (new), a React `font:` string, or a `fontSize` number or px string (new). `var(--fs-13)` is not raw. It also fails on the old faces, as before, and on any size token used that `lms.css` does not define at its own value outside the phone query and at or above its family's floor (16 / 24 / 20px) inside it. So on a phone the floor holds by construction. The codemod's rewrite mode is unchanged, because lms-type-scope replays it.
  - **`--tap` uses.** Every `var(--tap*)` in the app and the reference is a `min-height` or `min-width`, so nothing needed moving into the phone query: with the tokens at 0px, each does nothing above 767px. That covers #120's 48px primaries on both sides (the reference's are inline and cannot take a media query) and Tiers' `span.cell`.
  - **#117's hand edits** were found by diffing the codemod's output on BASE against #117's tree. Above 767px they are reverted on both sides. Their phone values move into lms.css's phone block through D-156's `data-phone` hooks, which the reference and the app put on the same element:
    - `bar`: the brand row and the top bar, 56 → 64;
    - `bar-button`: Close menu 32 and Open menu 34 → 44;
    - `token`: the status pill and its skeleton, `vertical-align` middle → top;
    - `seat`: Team Hub's seat slots, 34 → 44;
    - `attention-avatar`: Team Hub's attention avatars, 22 → 32 (`Avatar` gains an optional `data-phone` pass-through).
    - The reference's Status Token heights and sizes are JS strings the codemod could not reach. They take the same tokens as the app's CSS module (`--bx-16`, `--bx-22`, `--fs-12`, `--fs-13`).
    - The wordmark, Geist and the focusable drawer body are not phone sizing, and stay.
    - **Kept: Admin Curriculum's Actions column stays 232px.** At 200px, "Publish Now" straddles the 1440 viewport edge on both sides (x 1433–1535; Geist at 13px is wider than Hanken Grotesk was). The parity fingerprint keeps a text run only when its element starts inside the viewport, so it then sees the app's button (x 1433) but not the reference's template span (x 1443): 54 of 55 in the container. At 232px every action starts past the edge on both sides, as before D-156. R2-2 rebuilds Curriculum.
  - **`lms-mobile.spec.ts`.** The font-floor and tap checks run only under 768px (320, 375, 390 and 430). Above that, desktop has its own pre-D-156 sizes again, which is the point of this fix, so checking for phone sizes there would assert the bug. Overflow is still checked at every width, now 320, 375, 390, 430, 768, 1024, 1280 and 1440. `KNOWN` stays empty. `tokens.spec.ts` compares the tokens at 1440 and at 390. The body is 14px / 20.3px at 1440 (global.css, as before D-156) and 16px / 23.2px at 390.
  - **Goldens.** Re-captured with `pnpm compliance:capture` in the pinned container (Chromium 153.0.8010.12), twice, byte-identical. Nothing was edited by hand, tolerances and masks are unchanged, and `win32/` stays stale. **184 files moved**: the PNG and `.json` of every region of the 51 non-phone scenarios (92 pairs). Above 767px the body is 14px again and every size #117 raised is back, the shell's 56px bars included, so every desktop, laptop and sheet region moves:
    - admin: `admin-announce`, `admin-avault`, `admin-builder`, `admin-builder-locked`, `admin-builder-marketing`, `admin-cohorts`, `admin-curriculum`, `admin-learners`, `admin-learners-teams`, `admin-overview`, `admin-overview-dark`, `admin-overview-laptop`, `admin-staff`, `admin-tiers` (main, page each), and the `admin-cohorts-edit`, `admin-learner-drawer` and `admin-vault-upload` drawers;
    - learner: `dash-agent-dark`, `dash-agent-eastern`, `dash-agent-laptop`, `dash-agent-live`, `dash-agent-post`, `dash-agent-week0`, `dash-owner-live`, `emp-agent-database`, `emp-agent-laptop`, `emp-agent-marketing`, `emp-agent-marketing-checklist`, `emp-agent-marketing-transcript`, `emp-agent-sales`, `emp-owner-meetings`, `sessions-agent`, `sessions-owner-eastern`, `team-owner`, `tier-agent`, `vault-agent`, `vault-agent-exec`, `vault-owner-exec` (main, page each), the `emp-agent-marketing-prompt` and `team-owner-member` drawers, and `team-owner-invite` (page);
    - shell: `shell-admin`, `shell-agent`, `shell-agent-dark`, `shell-agent-laptop`, `shell-agent-rail`, `shell-owner` (header, sidebar each), `shell-locked-preview` (dialog) and `shell-profile-menu` (page);
    - sheets: `states-light` and `states-dark` (page).
  - **Phone goldens: unchanged, byte for byte.** `shell-agent-mobile` (header), `shell-agent-mobile-drawer` (sidebar), and `dash-agent-mobile` and `emp-agent-mobile` (main, page): all 12 files, PNG and `.json`.
  - **Parity:** 55 of 55 in the pinned container on the new goldens, and 55 of 55 fixture parity on the host. **www:** `apps/web` built from this branch and from R2-0 gives 72 of 73 HTML pages byte-identical; the 73rd is the learn app's own `index.html`, as in D-156.
  - **Not changed:** Stripe checkout and Payment Links, the D-154 seat cap, webhooks and provisioning, gating, GA4 and the Meta Pixel, `/agreement`, www's pages and CSS (`tokens.css`, `global.css`, the kit), PR #130's files, every tolerance and mask. No secrets and no Railway variables.
- **R2-1b: the R2 tokens, the shell's primitives, the new admin AppShell (replacing #125), 404 and Denied enforced, the parity fixture, and the retirements** (`claude/admin-r2-1b-shell`; START-HERE's "R2-1", after R2-1a). **Status: on a pull request (https://github.com/connor-leiva/amplified-impact-lms/pull/135).** The remaining primitives (Pill, Bar, Stat, Table, Tabs, Select, Modal/Confirm, Toast, Skeleton, Facts) and the `components/console/*` rebase are **R2-1b part 2**, stacked after it, not started; R2-1c (Workspaces and Users detail, Search and ⌘K) follows with #126 merged.
  - **Connor's decisions it carries.** The sign-off (Nov 15, 4:58 PM MST). Collapsible groups (Nov 15, 11:24 AM MST): Health and Build open by default, plus the group holding the current page, which can't close while its page is active; the choice remembered in localStorage; parity runs with it cleared. The old checks (Nov 16, 2026, relayed by the user): *"Retire each admin screen's old prototype-based check in the R2 PR that rebuilds that screen, and record each retirement in D-160. R2-1b retires shell-admin and drops the sidebar from the other admin-\* checks. Keep every learner check unchanged. The R2 mockup comparison (0.1%, four widths, full page) is the gate for those screens, and its threshold never loosens."* "Go to Overview" stays on Denied and the 404 until Health exists.
  - **Tokens (`apps/web/src/styles/r2.css`).** The `CSS` constant's values verbatim (BUILD-SPEC § 3), each name prefixed `--r2-` because `--ink`, `--line`, `--m`, `--h`, `--c` and `--row` already mean something else in this app: the `.ax` variables, every raw hex the stylesheet writes (status dots, bars, masquerade, skeleton, grip, selected row, wordmark, toast), the five shadows and the scrim, the focus rings, the shell's own small sizes (11, 12, 13px with their 16 / 18px lines), and the laptop (`--r2-pad: 24px`) and phone blocks. **Scoped** to `[data-r2-shell]`, the attribute on the admin shell's root, so no learner screen can read one; learner `tokens.css`, `global.css` and `lms.css` are unchanged. **The phone floor by construction:** every type token is 16px or more under 767px (the ⌘K hint's mockup value is 14px there, but the hint is never drawn on a phone, so its token is 16), controls 44px, primaries 48px. `r2-tokens.test.ts` reads the mockup's `CSS` constant and this file and holds all of it. Component CSS uses `var(--r2-…)` only: `check-css-colors` and `lms-type-floor --check` pass.
  - **Icons.** The mockup's whole `P` map (45 glyphs) is in `ICONS` in `@ai/core` as `r2*` entries, path data verbatim, drawn through `<Icon>` at the mockup's 1.75 stroke.
  - **Primitives (`apps/web/src/components/r2/`)**, the ones the shell, the 404 and Denied are built from: Button (and ButtonLink), Card (and Box), Empty (and EmptyActions), Menu, Status, Page, with unit tests.
  - **The shell (`apps/web/src/shell/admin/`).** AppShell hands staff to `AdminShell`; the learner shell is unchanged (a staff member's "Preview as learner" tab is a learner there, as before). Sidebar 244px with the wordmark (`design-reference/brand/amplified-impact-wordmark.svg` as is, inline, 22px), the cohort switcher's tile and the groups in `NAV` order; a 64px rail from 768 to 1199px with the wordmark cropped to its first glyph (a 540-unit viewBox, as `Wordmark short`), one icon per group with a flyout (`.pop.rt`), the toggle and the avatar; on a phone a 56px bar with Open menu, the wordmark and Search, and a 300px drawer (max 86%) that is a modal dialog with `data-drawer="open"`. Top bar: `Admin / {group} / {page}`, the ⌘K trigger, and the environment dot. Collapsible groups reuse #125's per-user localStorage (`prefs.navGroups[staffId]`, with its tests), `aria-expanded` headers, and reveal on arrival (the active group is always open). Badges only for work or alerts, hidden at zero: Curriculum "N draft", Tiers "N", Incidents "N"; a closed group with an open incident shows "1 incident" in `--bad`. Every required landmark is kept; on a phone the breadcrumb is visually hidden (the mockup's phone bar draws none) and the Primary aside sits in the closed drawer.
    - **The mockup's cascade, reproduced.** `.arx button { font: inherit; color: inherit; margin: 0 }` outranks single-class rules in the mockup, so its nav rows, group headers, cohort switcher, search trigger and buttons render at the body size, weight 400, in the text colour, with no margin (the switcher sits flush left at `calc(100% - 16px)`). BUILD-SPEC § 3's "nav item 13px/500" and "group header 12px/500 `--f3`" describe the stylesheet; the refs show the cascade, and the refs win.
    - **Which rows show.** The parity fixture shows the mockup's full `NAV`. Production (http) and the ordinary fixture show only rows whose screen exists (Overview, Curriculum, Module Builder, Resource Vault, Cohorts & Sessions, Announcements, Learners & Teams, Tiers & Upgrades, Audit Log, Roles & Permissions), filtered by `consoleCan` as before; each later R2 PR turns its row on when its screen lands. **Needs Connor's call.** Staff & Roles is not in `NAV` (the mockup folds it into Roles & Permissions, R2-3); until then it stays under Access in production so staff management stays reachable. No incidents exist before Console PR 8, so production shows no Incidents row or alert.
    - **The ⌘K trigger** (and the 404's "Search the admin" and the phone's Search) are drawn exactly and do nothing until the palette lands in R2-5: `aria-disabled="true"`, no shortcut bound. **The environment dot** reads "Production", a constant: the app has no environment name to read yet. **The user chip** is a button that opens the existing profile menu (sign out, time zone), drawn exactly as the mockup's chip; the mockup has no sign-out control.
    - **Screens not yet rebuilt keep their type and canvas** (`shell/admin/legacy.ts`, one list, tested): the existing admin screens, and the Console's Audit Log and Roles until R2-3, get `main[data-legacy]`, which restores the old shell's type (`--font-ui`, `--fs-14`, 1.45), colour, canvas and no scrollbar gutter, and keeps R2's base resets and focus ring out of it. Only their frame changes until their own R2 PR.
  - **404 and Denied on R2** (`routes/console/Denied.tsx`): the mockup's `NotFound` and `Denied`, each a card with the message as the page's h1 and the way out. **Changed strings (the mockup wins):** the 404's title "That Console page doesn’t exist." → "This page doesn't exist"; its sentence "The link may be old, or the record was deleted." → "The link may be old, or the record was removed. Error 404."; its "404" eyebrow removed; "Search the admin" added; its breadcrumb "Admin / Page Not Found" → "Admin". Denied's title "Your role can’t open {screen}." → "Your role can't open {page}" ("this page" with none named); its sentence "You’re signed in as {role}. Staff roles are set in Staff & Roles." → "You are signed in as {role}. An Owner can change this in Roles & Permissions."; its "Permission Needed" eyebrow removed. "Go to Overview" is unchanged. The mockup's apostrophes are straight, and so are these.
  - **The parity fixture (`apps/web/src/data/parity-r2.ts`)**: `STAFF`, `ROLES`, `MODS0`'s statuses, `INCIDENTS` and Tiers' upgrade requests from the JSX, giving the shell its viewer (Connor Leiva, Owner), the switcher (Amplified AI Accelerator, December 2026 Cohort), Production, and 6 draft, 2 and 1; the cohort is started (Week 2 of 6). Fixture build only and only for `?parity=r2` (with `?as=admin`): `admin-shell.ts` loads it behind `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, and the mockup's standalone "Access denied" screen is a fixture-only route, `/admin/denied` (`routes/console/fixtureRoutes.ts`; the http build has no such route, so `/admin/denied` is the 404 there). `console-build.test.ts` now also builds both of those both ways and proves the http build has none of it. Later R2 PRs add `WS`, `USERS`, `PERMS0`, `AUDIT0`, `EMAILS` and the rest beside these.
  - **The harness.** `ROUTES`: `missing` → `/admin/no-such-page`, `denied` → `/admin/denied`, with `?as=admin&parity=r2&now=2026-12-10T16:30:00.000Z` (the clock is also frozen with Playwright's clock API). `ENFORCED`: `missing` and `denied` × 1440, 1280, 1024, 390. **One capture change, recorded here:** a full-frame cell is now an element screenshot of the shell's frame (`[data-r2-shell]`, the app's `.ax`), not a full-page screenshot, and the test stylesheet lets that frame grow to its content as the harness's `FULL` does for `.ax`. Chromium's full page is never shorter than the viewport, so the 404 and Denied (609px tall at 1280, 439 at 1024, 404 at 390) came out 900 / 844px tall against element-screenshot refs; the frame's box is the same max(sidebar, content) a full page would be for anything taller. The threshold (0.1, `includeAA: false`), the 0.1% ratio, the dimension hard stop and the masks (none) are unchanged.
  - **Parity, in the pinned container (Chromium 153.0.8010.12, `fonts.conf`): all eight enforced cells pass at 0.0000%, 0 px, dims OK.** missing 1440 × 609, 1280 × 609, 1024 × 439, 390 × 404; denied the same. The other 116 cells are "not built".
  - **Checks retired (Connor, Nov 16).** `shell-admin`, both its regions (`sidebar`, `header`): the scenario is removed. The `page` region (the whole viewport, the admin sidebar in it) of all 14 `admin-*` scenarios that had one: `admin-overview`, `admin-overview-dark`, `admin-overview-laptop`, `admin-curriculum`, `admin-builder`, `admin-builder-marketing`, `admin-builder-locked`, `admin-cohorts`, `admin-learners`, `admin-learners-teams`, `admin-avault`, `admin-announce`, `admin-tiers`, `admin-staff`; each keeps `main`. The three drawer scenarios (`admin-cohorts-edit`, `admin-learner-drawer`, `admin-vault-upload`) never captured the sidebar and are unchanged. Fixture parity now has **54** scenarios (55 − `shell-admin`).
  - **Goldens: 32 deleted, none changed, none added**, through the official path: the fingerprints and `linux/` screenshots were cleared and re-captured with `pnpm compliance:capture` in the pinned container, twice (the two captures byte-identical), and the capture wrote back exactly the 266 files the reduced scenario set names, every one byte-identical to before (every learner golden among them). The 32 are `shell-admin-header` and `shell-admin-sidebar`, and the `-page` region of the 14 scenarios above, each `.json` and `linux/….png`. `win32/` is not captured here (D-156: it is stale); its 16 now-unused PNGs are left for a Windows capture. Nothing was edited by hand, and tolerances and masks are unchanged.
  - **The old admin screens' `main` checks: kept, with a transitional geometry (the brief's hard stop, resolved without retiring anything).** With R2's geometry every one of the 14 `admin-*` `main` regions failed on its dimensions before any pixel was compared, in the pinned container: 1196 × 848 against the goldens' 1192 × 844 at 1440 × 900 (R2's sidebar is 244px, not 248; its top bar 52px, not 56), and 960 × 716 against 776 × 712 for `admin-overview-laptop` at 1024 × 768 (R2's 64px rail, where the old shell drew the 248px sidebar). With the old geometry held, all 17 `admin-*` scenarios passed, so nothing inside `main` moves. Retiring those 14 checks early, before the PRs that rebuild their screens, would break Connor's rule ("in the PR that rebuilds that screen") and was **not approved by the user, so none was done**. Instead, the R2 shell keeps the old frame's content box on exactly the screens behind them, and only there: **a 248px sidebar, a 56px top bar, and the full sidebar at 1024px instead of the rail** (`.frame[data-legacy-geometry]`, from the same `legacy.ts` list): `/admin` (Overview), `/admin/curriculum` and `/admin/curriculum/*` (Curriculum, Module Builder, its `new`), `/admin/cohorts`, `/admin/learners`, `/admin/vault`, `/admin/announcements`, `/admin/tiers`, `/admin/staff`. Everywhere else (the 404, Denied, the Console's routes, every screen rebuilt later) the shell is R2's 244 / 52 / rail. Each R2 PR removes its screens from the list and retires their old checks in the same PR, as Connor's rule allows: R2-2 Curriculum, Module Builder, Resource Vault, Cohorts & Sessions and Announcements; R2-3 Overview, Learners & Teams, Tiers & Upgrades and Staff & Roles (the mockup has no Staff screen: it is covered by R2-3's Roles & Permissions). When the list is empty, the mechanism goes. The 14 `main` goldens are byte-identical and their checks pass. Fixture parity is **54 of 54**.
  - **lms-mobile's "primary".** `lms-mobile.spec.ts` treats a class named `primary` as a 48px primary. In R2 that size is the page-header action's (`--r2-cp`, `.hd .b`), so that is the class's name; a filled button elsewhere (the 404's "Go to Overview") is a 44px control on a phone, as the mockup draws it (`.b` at `--c`), and its class is `filled`.
  - **Size.** About 2,600 non-test lines (CSS one declaration a line, and comments, are about half), over START-HERE's ~1,500: it holds only what R2-1b must (the tokens, the shell, the parity fixture, 404 and Denied with the six primitives they are built from, the harness, the transitional geometry and the retirements). The other primitives and the `components/console/*` rebase are R2-1b part 2.
  - **Not changed:** Stripe checkout and Payment Links, the D-154 seat cap, webhooks and provisioning, gating, GA4 and the Meta Pixel, `analytics.js`, `/agreement`, www and the kit, the learner shell and screens, the R2 refs and `fonts.conf`, every tolerance, threshold and mask, `audit_log`. No migration, no secrets, no Railway variables.
- **R2-2a: the Build screens, part a — Curriculum and the Module Builder on R2, the primitives they need, and their retirements** (`claude/admin-r2-2-build`, on `main` at `c17aa4f`, R2-1b merged). **Status: on a pull request (https://github.com/connor-leiva/amplified-impact-lms/pull/137).** START-HERE's R2-2 is over ~1,500 non-test lines, so it is two stacked parts, as the brief allows: **R2-2a** (this) and **R2-2b** (Resource Vault, Cohorts & Sessions, Announcements, stacked on it). Each part enforces only its own screens' cells and retires only their old checks.
  - **R2-1c's shared primitives, brought over (the brief: unchanged where possible).** `git cherry-pick aebc45b` conflicts, because aebc45b sits on a merge of #126 and its `packages/core/src/console-view.ts` imports #126's `console-support.ts`, which is not on `main`. So, exactly: **byte for byte from aebc45b** `apps/web/src/components/r2/Table.tsx`, `table.ts`, `kit.tsx`, `kit.module.css`, `kit.test.tsx` and `styles/r2.css`'s chevron token (one commit, then extended in the next, below); **from its `console-view.ts`, only the declarations that do not need #126, each unchanged**: `ADMIN_TZ`, `adminStamp`, `adminDate`, `AdminTone`, `AdminStatus`, `SeatBar`, with their tests (the "admin stamps" block of `console-view.test.ts`, unchanged). The rest of that file (`planLine`, `seatBar`, `seatPct`, `mrrOf`, the plan, user and order statuses, `usdCents`, `usdWhole`, `initialsOf`, `tierLabel`) comes with #136 after #126. **#136's rebase:** its `console-view.ts` and `console-view.test.ts` will meet these as an add/add conflict; take #136's versions (a superset). The web files were later extended here, so take R2-2's `Table.tsx`, `table.ts`, `kit.tsx` and `kit.module.css` and re-apply nothing (#136 changed none of them after aebc45b).
  - **Primitives added (`components/r2/`, each with unit tests in `build.test.tsx`):** the rest of the mockup's `Table` — `onMove` (a drag handle per row, Alt with an arrow key on it, Move up / Move down in the phone's menu; headers do not sort while rows can move), `quick` (hover icon actions), `primary` (an always-visible control), `actionsWidth` (`aw`), a card head (`title`, `right`), `card` (a screen's own phone card), a column that may draw past itself (`ov`) and the handle's 20px track in `fit`/`need`; **TierPill** (the mockup's `TierPill`, a pill that is a menu button); **Modal** and **Confirm** (the mockup's `Modal` and `Confirm`, fixed to the window); `keepHyphens` (the mockup's `nb`). Toast is not added: the app's toaster still shows, and #136 brings R2's toast.
  - **One zone, and how it coexists with `fmt.*`.** BUILD-SPEC § 7's "MST (America/Phoenix) everywhere" is `packages/core/src/admin-build.ts`: `adminDay` ("Wed, Dec 2"), `adminTime` ("12:00 PM"), `adminMonthDay` ("Dec 14"), `adminWhen` ("Wed, Dec 2 · 12:00 PM MST"), and `fromAdminLocal`/`toAdminLocal` for a form's MST date and time, beside R2-1c's `adminStamp`/`adminDate`. They are the R2 admin's own formatter, used only by R2 admin view-models, never by a component; `fmt.*` (the viewer's zone first, the program's in parentheses) is unchanged and still prints every learner screen and every admin screen not yet on R2. America/Phoenix keeps no daylight saving time, so "MST" is always right, and the program's 1:00 PM CT is 12:00 PM MST. CLAUDE.md's time rule ("always use `fmt.*`") therefore has one exception, the R2 admin, by BUILD-SPEC § 7. Neither screen prints "CT" or "Central" (`admin-r2-build.spec.ts` checks).
  - **Curriculum** (`routes/admin/Curriculum.tsx`, `curriculumR2VM`). The mockup's table: the row number when the table is ≥ 1100px wide (1440 only), the icon tile (28px under 1100), name over line (on a laptop, the dropped Live session's "Session 1 · Wed, Dec 2 · 12:00 PM MST"), the tier pill (116px at 1280, 124px at 1024 and 1440), Live session (1280: the short name with ellipsis and the date line "Wed, Dec 2 · 12:00 PM", the full "Session 1 · Lead-Source ROI Live Build · Wed, Dec 2 · 12:00 PM MST · Replay ready" in its `title` and accessible name; 1440: the full title, up to three lines), Status (120px at 1280, 128px at 1440, nowrap, "Hidden from learners" under Draft; at 1024 a "Hidden" pill with `title`/`aria-label` "Hidden from learners"), Deployed (bar and %, or "Not started" / "Not published"), and the actions (hover Preview as Learner, Publish on drafts, "…"). Phone cards as the mockup's, the meta line "Hidden from learners · Wed, Dec 30" on drafts and the Draft status's `title`. The summary's "6 draft" is real data (and the sidebar's "N draft" was already). Behaviour kept, through the same mutations: reorder (`moveModule`, one place a step for a drag), tier access (`setModuleTier`), publish and unpublish (`publishModule`/`unpublishModule`, now after the mockup's confirm), Preview as Learner (fixture: the persona switch; http: D-138's read-only tab), New AI Employee (`/admin/curriculum/new`).
  - **Module Builder** (`routes/admin/ModuleBuilder.tsx`, `builderR2VM`). The mockup's `.bb` grid: the AI Employee list (a select on a phone), the name card (Name and Summary, the outcome line, in place), Steps (title in place, Type, Length, the handle), Files (Attach), Settings (Status, Tier access, Live session, Opens, Skill guide) under the main column, or in a third column from 1400px. Behaviour kept: `saveModule` (Save changes / Saved), the publish checks and their exact messages (shown above the grid when a save is refused), the unsaved-changes prompt (phase 06 § 6.3, now an R2 modal), Preview as Learner (the portal, as the old "Open in Learner Portal"), the step order, the six steps, attaching a file.
  - **The parity fixture (fixture build and `?parity=r2` only).** `parity-r2.ts` gains `MODS0`, the builder's steps and files (`MODS0_STATUS` is now read off `MODS0`). `parity-r2-db.ts` turns them into the app's own snapshot (the fifteen AI Employees with their tiers, sessions, statuses, opening days, step and file counts; the December 2026 cohort, started Wed, Dec 2 at 12:00 PM MST, "Wednesdays, weekly", 148 enrolled; its six Wednesday sessions, replays ready for 1 and 2; no learner modelled one by one, so each Deployed figure is the baseline, the mockup's `dep`), so both screens draw it through the production view-models. `boot.ts` loads it behind `import.meta.env.VITE_DATA_SOURCE === 'fixture'` and `?parity=r2`; the fixture repository keeps it for that tab only, never in localStorage. `console-build.test.ts` builds `boot.ts` both ways and proves the http build has none of it. The only data shape it needed is `Step.kind` (`Watch`, `Read`, `Build`, `Check`, `Ship`), optional and display only: nothing in the app sets it yet.
  - **The harness.** `ROUTES`: `curriculum` → `/admin/curriculum`, `builder` → `/admin/curriculum/m1` (the mockup's `route.id || 'm1'`). `ENFORCED` adds `curriculum` and `builder` at 1440, 1280, 1024 and 390. Threshold, ratio, dimension stop and masks (none) unchanged.
  - **Parity, in the pinned container (Chromium 153.0.8010.12, `fonts.conf`), all eight new cells pass:** curriculum 1440 × 1130 0.0010% (17 px), 1280 × 1130 0.0012% (17 px), 1024 × 1130 0.0015% (17 px), 390 × 3134 0.0007% (8 px); builder 1440 × 976 0.0000% (0 px), 1280 × 1382 0.0001% (1 px), 1024 × 1382 0.0000% (0 px), 390 × 2235 0.0000% (0 px); dims OK everywhere. The few pixels are antialiasing in the footnote's "…" and in one button edge. `missing` and `denied` stay 0 px.
  - **Measured, not stated (the refs win, as in R2-1b).** The mockup's `.arx button, .arx input, .arx select, .arx textarea { font: inherit; color: inherit; margin: 0 }` outranks its single-class rules, so the refs show: the AI Employee name links (`.lk`) at the cell's 14px / 400 in ink, not 500; the drag handle (`.grip`) in ink, not `#A9B0AB`; the tier pill (`button.pl`) at the cell's size and weight (14px / 400; 16px on a phone), not the pill's 12px / 500; the builder's list rows (`.ni`) at 14px / 400 in ink, not 13px / 500 in `--f2`; the builder's Name and Summary fields (`.ine`) with no −8px margin and the cell's weight (the name's 15px / 600 is its own inline style), and Summary in ink, not `--f2` (`.s2`); a step title (`textarea.in.ine`) at 8px 10px padding, the cell's weight, and its inline −8px margin. On a phone the phone card's title is 17px / 400, not 600 (`.w6` loses too). Each is drawn as measured.
  - **Phone targets without moving the refs.** The phone's 44px rule (lms.css) makes the builder's two new buttons taller than what the mockup draws there: the icon tile ("Edit details") keeps its 32px tile inside a 44px target (−6px margins), and Status's menu button is 44px over its 24px line (−10px margins, inline-flex like the mockup's `.st`), so the card keeps the mockup's rows. `lms-mobile.spec.ts` stays green at every width on `/admin/curriculum`, `/admin/curriculum/marketing` and `/admin/curriculum/new`.
  - **Checks retired (Connor, Nov 16).** `admin-curriculum`, `admin-builder`, `admin-builder-marketing` and `admin-builder-locked`, the `main` region of each (their `page` regions went in R2-1b): the four scenarios are removed from `compliance/lib/scenarios.ts`. **Goldens: 8 deleted, none changed, none added**, through the official path only: every `.json` and `linux/*.png` golden was cleared and `pnpm compliance:capture` run in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`), which wrote back exactly the 156 files the remaining 50 scenarios name (78 `.json`, 78 `linux/*.png`), each byte-identical to before (every learner golden among them); the 8 not written back are `admin-curriculum-main`, `admin-builder-main`, `admin-builder-marketing-main` and `admin-builder-locked-main`, `.json` and `linux/….png` each. `win32/` is not captured here. Fixture parity is **50** scenarios. Their replacement checks: `parity:admin-r2`'s eight cells, and `admin-r2-build.spec.ts` (axe at four widths, the landmarks, BUILD-SPEC § 7, reorder, tier access, publish, the builder's in-place edits and unsaved-changes prompt). `admin.spec.ts`'s three Curriculum and builder flows use the R2 controls (the tier pill's menu; Summary, Edit details' outputs and Status's Published).
  - **Legacy geometry.** `/admin/curriculum` and `/admin/curriculum/*` leave `shell/admin/legacy.ts`, so they get R2's 244 / 52 / rail throughout. R2-2b removes Vault, Cohorts and Announcements.
  - **Needs Connor's call (behaviour the mockup and the app do not share; nothing was invented or removed).**
    - Curriculum's "…" has no **Duplicate** (the app cannot duplicate an AI Employee) and gains **Delete** on drafts (the old builder's Delete Draft, `deleteModule`, which the R2 builder does not draw).
    - The Module Builder draws no place for the fields learners read that the mockup leaves out: sidebar label, outcome headline, "For", icon, the three outputs, the linked live session, the opening day, platform, run button label, instructor notes, the system prompt and removing a file. They are in **Edit details**, the AI Employee's icon tile (a dialog built from R2 parts; no mockup frame), and a step's hint, chapter, replay time and minutes are in its "…" (**Edit step details**). Publishing is Status's menu (Draft, Scheduled, Published), which saves with that status and runs the publish checks.
    - **Add step** is drawn and does nothing (`aria-disabled`): every AI Employee has exactly six steps (phase 06 § 6.3). The mockup's Duplicate step and Remove step are not offered for the same reason.
    - The builder's inline **live learner preview** (card, locked preview, detail header) is not drawn; Preview as Learner opens the portal instead.
    - **Type** shows a step's `kind`; the app's own AI Employees have none yet, so their Type cells are empty. **Skill guide** reads "Linked" when a skill file is attached, else "Not linked". The Settings note's "not audit-logged" stays as the mockup words it.
    - The publish confirm drops the mockup's "This action is audit-logged.": `/api/mutate` writes the activity feed, not `audit_log`.
    - New strings (no mockup copy): Edit details, Edit step details, Step N, Sidebar label, Outcome headline, For, Icon, Output 1–3, Live session, Opens (MST), Platform, Run button label, Instructor notes, System prompt, Files, Remove, Done, Hint, Chapter, Replay at, Minutes, Not linked, Not scheduled, Delete, "Delete {name}?", "The draft and its steps are removed. Learners never saw it.", Delete draft, "Every AI Employee has six steps" (Add step's title).
  - **`lms-type-scope.mjs --check`** (R2-1a's script, not in `pnpm lint`): it replays #117's codemod on each file's pre-#117 text and aligns the marks with the file today, so on the two rewritten screens an old mark landed on a new, unrelated line (Curriculum's 16px row-number width). It now skips the R2-rebuilt screens (`R2_REBUILT`, beside `KIT_LOOK`): they are written on the R2 tokens, 16px and up on a phone by construction. It passes, finding 976 raised declarations (1,024 before, less the two screens' old ones).
  - **Size.** About 2,100 non-test lines of its own (the R2-1c files it carries are another 1,340), over ~1,500: Curriculum and the Module Builder are the two largest Build screens, and the primitives they need ship with them.
  - **Not changed:** Stripe checkout and Payment Links, the D-154 seat cap, webhooks and provisioning, gating, GA4 and the Meta Pixel, `analytics.js`, `/agreement`, www and the kit, the learner shell and screens, the R2 refs and `fonts.conf`, every tolerance, threshold and mask, `audit_log`, the API. No migration, no secrets, no Railway variables.
- **R2-2b: the Build screens, part b — Resource Vault, Cohorts & Sessions and Announcements on R2, and their retirements** (`claude/admin-r2-2b-build`, stacked on R2-2a). **Status: on a pull request (https://github.com/connor-leiva/amplified-impact-lms/pull/138), stacked on https://github.com/connor-leiva/amplified-impact-lms/pull/137; merge R2-2a first.**
  - **Primitives.** No new ones: the three screens are R2-2a's and R2-1c's `Table`, `Facts`, `Pill`, `Status`, `Modal` and `Confirm`. Two small additions: a fact may be `wide` (the mockup's third `Facts` value, `.fxw`: the phone's whole row), and a row whose "…" has nothing to offer draws it disabled (`aria-disabled`), as the mockup draws it.
  - **Resource Vault** (`routes/admin/VaultManager.tsx`, `vaultR2VM`). The mockup's filter, Type select (its options are the types the vault holds, in its order), and table: Resource (play glyph for a video), Type, Attached to (dropped at laptop width), Tier access, Size, Opens (learners' opens, the old Downloads), Updated (MST). Behaviour kept, through the same mutations: Add resource opens the upload form as an R2 dialog (`uploadResource`, the old drawer's words, its executive categories still forcing Team only); a row's "…" changes tier access (`setResourceTier`), hides or shows it (`setResourceStatus`) and removes it after the mockup's confirm (`deleteResource`).
  - **Cohorts & Sessions** (`routes/admin/Cohorts.tsx`, `cohortsR2VM`). The header reads "The cohort calendar and each live build on Zoom. All times are MST (America/Phoenix)." The key facts (Cohort, Status, Opens, Week, Enrolled, Cadence) and the Sessions table (Session, When in MST with "Live on Zoom", Module, Zoom invite, Replay, Attendance) of the current cohort (`ADMIN_COHORT`). Zoom invite reads Sent once the 24-hour reminder window opens, Scheduled before it, Draft with no Zoom link; Replay reads Ready (or Processing); Attendance is the share of the cohort's learners (`cohortsVM`'s population, `db.base` included); **both "—" are muted `--f3`** (BUILD-SPEC § 7, checked in `admin-r2-build.spec.ts`). Each session's "…" holds what the old schedule offered: Edit session (`updateSession`; its date and time are typed in MST and saved as the same instant in Central Time, which the mutation reads), Copy join link, and Go Live, End Session or Publish Replay at that session's step (`cohortsVM`'s rule).
  - **Announcements** (`routes/admin/Announcements.tsx`, `announceR2Rows`). The table: Announcement, Audience, Channels (dropped at laptop width), Status, Send time (MST, "—" for a draft), newest first as `sendAnnouncement` keeps them. New announcement opens the mockup's dialog (Title, Message, Audience, Channels) with the composer's other settings after them (Severity, Action button, When, and the schedule in MST, handed to `sendAnnouncement` as the same instant in Central Time) and sends as before; its refusals show in the dialog.
  - **Data shapes (display only, nothing in the app sets them yet):** `Resource.module` (the AI Employee a file is attached to; none is "—") and an announcement status `draft` (never sent: learners see `sent` only, `scope.ts`, and the job flips only `scheduled`).
  - **The parity fixture** adds the mockup's vault (`VAULT`, `R`) and announcements (`ANNOUNCEMENTS`) to `parity-r2.ts`, and `parity-r2-db.ts` makes them the snapshot's resources and announcements (each file attached to its AI Employee by name) with the cohort's 148 learners as the attendance population (121 of 148 is 82%). Fixture build and `?parity=r2` only, as R2-2a's.
  - **The harness.** `ROUTES`: `vault` → `/admin/vault`, `cohorts-sessions` → `/admin/cohorts`, `announce` → `/admin/announcements`. `ENFORCED` adds `vault` and `announce` at all four widths and `cohorts-sessions` at 1440, 1280 and 1024 (not 390, below).
  - **Parity (pinned container, Chromium 153.0.8010.12, `fonts.conf`):** vault 1440 × 678, 1280 × 678, 1024 × 678 and 390 × 2086, and announce 1440 × 609, 1280 × 609, 1024 × 470 and 390 × 1041, all **0.0000% (0 px)**; cohorts-sessions 1440 × 712, 1280 × 712 and 1024 × 712 **0.0000% (0 px)**; dims OK everywhere.
  - **Cell not passing: cohorts-sessions-390 (the 16px phone floor).** As built: **0.3390% (2,766 px), dims OK (390 × 2092)**, over 0.1%, so it is **not in `ENFORCED`** and is reported, never marked passing. The cause is one rule: the mockup's `.ph .fx>div>span:last-child{font-size:15px}` draws the key facts' values (December 2026, Active, Wed, Dec 2 · 12:00 PM MST, 2 of 6, 148 learners, Wednesdays, weekly) at **15px** on a phone, under the 16px phone floor; the build keeps the floor (16px), as R2-1c did for the same rule. Measured with the mockup's 15px applied temporarily (then reverted): **0.0000% (0 px)**. Needs Connor's call: allow 15px there, or re-render the ref with 16px.
  - **Checks retired (Connor, Nov 16).** `admin-avault` and `admin-vault-upload` (the R2 Vault's dialog replaces the upload drawer), `admin-cohorts` and `admin-cohorts-edit` (the Edit session dialog replaces the edit drawer), and `admin-announce`: the `main` region of each, and the `drawer` region of the two drawer scenarios. **Goldens: 10 deleted, none changed, none added**, through the official path only (every `.json` and `linux/*.png` cleared and `pnpm compliance:capture` run in the pinned container, which wrote back exactly the 146 (73 `.json`, 73 `linux/*.png`) files the remaining 45 scenarios name, each byte-identical, every learner golden among them): `admin-avault-main`, `admin-vault-upload-drawer`, `admin-cohorts-main`, `admin-cohorts-edit-drawer` and `admin-announce-main`, `.json` and `linux/….png` each. Fixture parity is **45** scenarios. `admin.spec.ts`'s three Cohorts and Announcements flows use the R2 controls (each session's "…", Edit session's MST time, the New announcement dialog).
  - **Legacy geometry.** `/admin/vault`, `/admin/cohorts` and `/admin/announcements` leave `shell/admin/legacy.ts`; it now holds only R2-3's screens. `lms-type-scope.mjs`'s `R2_REBUILT` adds the three screens' files, as R2-2a did for its two; `--check` passes (911 raised declarations).
  - **Needs Connor's call (nothing was invented or removed).**
    - Vault: the hover **Download** and the "…"'s **Edit details** and **Replace file** have no admin behaviour, so they are not offered; the old **Library / Executive Vault** tabs are not drawn (the Type select filters instead); "**Attached to**" needs a link the app's resources do not have yet (`Resource.module`, display only), so every production row reads "—"; a hidden resource carries a "Hidden" pill after its title; the confirm drops "The file stays in storage for 30 days." (deleting removes the row; no storage rule says so).
    - Cohorts: **Add session** is drawn and does nothing (`aria-disabled`): the app cannot add a session; the old **cohort cards** (another cohort, New Cohort, Open Enrollment) are not drawn (the sidebar's cohort switcher is the mockup's place for them); "**Attach replay**" is not offered (Publish Replay is, at its step); **Module** prints the cohort week a session falls in.
    - Announcements: there is no **draft, edit or duplicate**, so the dialog sends or schedules instead of "Save draft", and each row's "…" is drawn and does nothing; the **automatic reminder** switches, the banner preview, the reach count and the old history's **open rates** are not drawn.
    - New strings (no mockup copy): Give Agent + Team access, Make Team only, Show to learners, Hide from learners, Hidden, Edit Session N, Start time (MST), Duration (minutes), Zoom link, Save session, Severity, Action button, When, Send now, Schedule, Send at (MST), "Sessions come with the cohort" and "Not available yet" (two titles), and the old drawer's words, kept (Publish to Vault, Access, Category, the attach area's two lines).
  - **Size.** About 1,020 non-test lines, under ~1,500.
  - **Not changed:** Stripe checkout and Payment Links, the D-154 seat cap, webhooks and provisioning, gating, GA4 and the Meta Pixel, `analytics.js`, `/agreement`, www and the kit, the learner shell and screens, the R2 refs and `fonts.conf`, every tolerance, threshold and mask, `audit_log`, the API. No migration, no secrets, no Railway variables.

## D-161 · A Clarity Call card on the www pages that sell, for visitors who aren't ready to buy

**Date:** 2026-11-16
**Approved by:** Connor, Sunday, Nov 15, 2026, 6:52 PM MST (America/Phoenix), approving the plan as "a button, not an embed": a reusable Clarity Call section on www.amplifiedimpact.io, near the bottom of the homepage, /offer (and /forum), /pricing, /team-build and every public skill page, linking to his GoHighLevel booking page in a new tab with click tracking; never on /agreement, checkout, the welcome or thank-you pages, or anywhere in the LMS.
**Number:** D-160 was reserved by the Admin R2 pull request (https://github.com/connor-leiva/amplified-impact-lms/pull/131) when this work began, and is that stack's umbrella entry (above, merged while this was in flight), so this is D-161. A separate workstream, off `main`, outside the Admin R2 stack.
**Status:** on a pull request.
**Scope:**
- `apps/web/src/kit/clarity.ts` and `clarity.css` (new: the card and its look), `src/kit/content.ts` (`CLARITY_CALL`, the words and the link).
- Where it is drawn: `src/home/v3/render.ts` (the homepage), `src/offer/render.ts` (/offer and /forum), `src/pricing/render.ts`, `src/team-build/render.ts`, `src/guides/render.ts` (`skillBody`, every skill page). One import of `clarity.css` each in `home/v3/v3.css`, `offer/offer.css`, `pricing/pricing.css`, `team-build/team-build.css` and `guides/skills.css`.
- `apps/web/public/analytics.js` (one delegated click handler).
- `compliance/playwright.config.ts` (`MARKETING_HOST` for the local http-mode server, so the e2e can ask for www's `/`).
- Tests: `apps/web/src/kit/clarity.test.ts` (new), `src/analytics.test.ts`, `src/home/v3/render.test.ts` (its stylesheet's import list), `compliance/tests/e2e/clarity-call.spec.ts` (new).

- **The card, word for word** (Connor's starting copy, lightly polished; each change is listed in the PR for his call):
  - Eyebrow `Still deciding?` (as given). Heading `Talk it through with Connor.` (as given).
  - Body `Book a free 15-minute Clarity Call. We’ll look at where your business is today and whether this is the right next step. No pitch, no pressure.` (the site's apostrophe; "with no pitch and no pressure" made its own short sentence).
  - Button `Book a Free Clarity Call` (Title Case, D-048).
  - Small print `15 minutes · Monday to Friday, 9 AM to 5 PM Central · Zoom link sent automatically`. "Mon–Fri, 9–5" changed because the www pages' house rule, which their tests hold, allows no dash of either kind, and the site writes hours as "8 AM to noon" and "1:00 PM Central".
  - No proof line, no stats, never "100 agents, 700+ homes a year": it is not a buy button.
- **A plain link.** `<a href="https://api.leadconnectorhq.com/widget/booking/XNxUdrtETSpLzuFotwUH" target="_blank" rel="noopener">`, exactly as given, written once (`CLARITY_CALL.href`; a test holds it to that one file). No GHL script, iframe, embed or API call anywhere, no new environment variable, and no CSP change: the CSP does not govern where a link goes.
- **Where.** One component, `clarityCall(host)`, drawn as an `<aside>` (a complementary landmark named by its heading) between the page's `</main>` and its footer: after the page's last buy block and its close, above the footer, outside both. Nothing inside any page's `<main>` moved or changed, so every Pay button renders exactly as before and the pay tests are untouched. `host` only picks the page's own column class (`wrap`, `inner` or `sk-wrap`).
  - **Placed (59 addresses, 58 pages):** `/` (homepage v3), `/offer` and `/forum` (one page, `offer.html`), `/pricing`, `/team-build`, and every skill page: the 54 pages drawn in the skill layout (`layout: 'skill'`, `skillBody`), which are the 36 Claude skills, the 17 Grok Bot templates (Morning Brief, a template and a skill, among them) and the Task Sync Starter Kit.
  - **Not placed:** `/agreement`, `/offer/welcome` and checkout (Stripe's own pages), as the brief says; the LMS and the admin console (the React app; a test holds that nothing it builds from names the card); `/terms` and `/privacy`; and the three of PR #130's 57 skill and guide landing pages that are not skill pages: `/ops-time-audit` (a free PDF guide, its own layout), `/voice-profile` (a setup guide) and `/retool` (a workshop kit), with `/ai101`. `/teams`, `/agents`, `/insiders`, `/free`, `/about` and `/library` were not named, so they do not carry it; adding one is one line.
  - `offer.css` also serves /offer/welcome, so that page's inlined stylesheet carries the card's rules (about 3 KB), with no card.
- **Look.** A quiet raised panel with a hairline and an outlined button in the ink: the kit's secondary-button look, never the Pay buttons' fill. It reads the host page's own tokens: on the kit's pages (`.aiw`) the theme's, so it follows the light and dark switch; on a skill page the LMS names that `kit/tokens.css` points at the kit's palette and Geist; on /offer that page's own palette, type (Hanken Grotesk) and corners, since /offer does not load the kit's tokens and its Pay buttons must not change.
  - Phones (767px and under): the button runs the card's full width, 48px tall (one line from 320 up), its words 16px. From 768px it takes its own width; from 1024px the words sit left and the button with its small print right. The small print shows one fact a line at every width (the three never fit one line, and a break at a dot left it hanging); its dots stay in the markup, hidden from screen readers, for a reader without the stylesheet. No text under 16px, a 2px focus ring, no transition under reduced motion.
- **Analytics.** `analytics.js` had no generic call-to-action mechanism, so it gains the smallest one: a delegated click handler for `a[data-ai-event]`, limited to the names it lists (`clarity_call_click` only). A click sends GA4 `clarity_call_click` with `{ page: location.pathname }` and Meta's custom `ClarityCallClick` with the same, since every GA4 event in the file already has its Meta twin; a custom event rather than Meta's `Schedule` or `Contact`, because a click is neither a booking nor a contact yet. The button opens a new tab, so the page stays to send. Unchanged: the GA4 and Meta ids, their config, where the tags load (D-155), the CSP, and the Buy and purchase events.
- **Tests.** Unit: the card on each of the 58 pages (one, between `</main>` and the footer, after every Pay button and program card, with the exact href, `target="_blank"` and `rel="noopener"`) and absent from the 14 www pages that do not carry it; its words and the house rules; its stylesheet. `analytics.test.ts`: the event on a click, by page, and nothing for an unlisted name, a plain link, a Buy click, a second load or another host. E2E, against the pages the API serves (GATE=9): `/`, `/offer`, `/forum`, `/pricing`, `/team-build` and four skill pages; position on screen as in the markup; the phone button at 390; the focus ring; axe on the whole page (and the kit pages in light and dark); no sideways scroll the card adds, and no part of it off screen, at 320, 375, 390, 768, 1024 and 1280; the new tab with no opener; absent on `/agreement`, `/offer/welcome`, `/terms`, `/privacy`, `/teams`, `/ops-time-audit` and the LMS.
- **Goldens: none moved, none captured.** `compliance/goldens/` holds the LMS's screens only; no www page has a golden. Nothing in the LMS changed, and fixture and container parity stay 55/55.
- **Found, not fixed.** At 320px the homepage scrolls 2px sideways, on `main` too: the hours section's "Start Getting Them Back, Free" button ends at 322px. The card adds none (the e2e measures the page with and without it). Left for its own change.
- **Not changed:** Stripe links and checkout, the seat cap (D-154), webhooks, gating (D-153), the Accelerator's pay pair (D-159), `/agreement`, the LMS and the admin console, the R2 files, `design-reference/`, Railway, secrets. No GHL API call, no email.
