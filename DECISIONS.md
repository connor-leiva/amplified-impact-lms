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

**Resolution.** The CI `goldens` job re-captures in the container on the first push and its diff is
the authoritative set. Commit that diff, after which `PROVENANCE.txt` reads `container`. The
fingerprint JSON goldens are platform-independent and authoritative from the start.

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

**Verified.** Four consecutive full parallel captures are byte-identical across all 196 golden
files, where before the change one file drifted.

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

## Net-new UI approved by the handoff itself

These are listed in `CLAUDE.md` › Non-negotiables as the only permitted additions, and need no
entry here beyond the record that they are expected:

- Sign-in and invite-accept screens (phase 07, spec in `docs/phases/07-backend.md` § 7.5)
- The unsaved-changes prompt in the Module Builder (phase 06, § 6.3)
- Production integrations (phase 08)
