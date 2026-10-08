# Amplified Impact LMS

A two-sided LMS for Amplified Impact's live, cohort-based AI training program for real estate
agents and teams.

- **Learner portal** — agents and teams build six **AI Employees** (Marketing, Sales, Database on
  the Agent tier; Meetings, Finance, Operations on the Team tier). Each comes from one live
  **Session** and is completed through six verified **Steps**.
- **Admin console** — staff author the AI Employees and run cohorts. The two sides are connected:
  admin changes appear in the portal, learner progress appears in admin.

React + Vite + TypeScript, a Fastify + Postgres API, deployed on Railway from GitHub.

## The prototype is the test oracle

`design-reference/` holds a complete, high-fidelity HTML prototype. **It is not code to copy** — it
is the specification and the oracle. The compliance harness opens it in Chromium under frozen,
deterministic conditions, captures goldens, and requires this build to match them pixel for pixel
(within 1%), string for string and style for style.

Read `CLAUDE.md` before changing anything. Its non-negotiables are the ones that matter:
goldens are never hand-edited, tolerances are never raised, copy is exact, styling uses tokens
only, and no feature exists that the mockup does not have.

| Source of truth | What it decides |
|---|---|
| `design-reference/*.dc.html`, `design-reference/lms-data.js` | pixels, copy and behavior |
| `docs/SCREENS.md` | layout and behavior contract per screen |
| `docs/DESIGN.md` | tokens, type, status model, icons, time |
| `docs/phases/NN-*.md` | what to build, in what order, and the gate that must pass |
| `DECISIONS.md` | approved deviations — and nothing else is one |

## Layout

```
apps/web/          Vite + React 19 + TypeScript SPA (portal + admin)
apps/api/          Fastify 5 + Postgres (serves /api and the built SPA)
packages/core/     TypeScript port of lms-data.js: types, seed, status, time, view-models,
                   mutations, permissions — shared by the web app and the API
design-reference/  the prototype (changed only through a DECISIONS entry, D-031)
compliance/        the parity harness: scenarios, fingerprints, goldens, e2e
docs/              DESIGN.md, SCREENS.md, phases/
```

## Getting started

```bash
corepack enable && pnpm i
pnpm exec playwright install chromium
```

```bash
pnpm dev                                  # web (Vite) + api (tsx watch)
pnpm reference                            # serves design-reference/ at :4400
pnpm --filter @ai/web preview:fixture     # the app in fixture mode at :4173
```

Open the prototype at
<http://localhost:4400/Amplified%20Impact%20LMS.dc.html> — use **View As** and **Timeline** in its
header to switch persona and cohort phase. `States.dc.html` shows every component state and
`Responsive.dc.html` shows the 1024 px and 390 px frames.

## Gates

A phase ships only when `pnpm gate <n>` is green locally **and** in CI.

```bash
pnpm gate 6          # lint + typecheck + tests + every parity/e2e scenario up to phase 6
pnpm goldens:check   # proves capturing twice is byte-identical
```

| Script | What it does |
|---|---|
| `pnpm lint` | eslint, the raw-colour guard, the no-icon-library guard, the control-character guard, the reference-token and brand-SVG check (D-031), the email-token check |
| `pnpm typecheck` | every workspace package plus the compliance harness |
| `pnpm test` | unit and differential suites |
| `pnpm harness` | Gate 0: the reference drives cleanly in all 55 scenarios |
| `pnpm compliance:capture` | regenerates goldens **from the reference** (only when it changes) |
| `pnpm compliance` / `pnpm e2e` | parity / behavior suites against the fixture build |
| `pnpm gate <n>` | everything required to ship phase n |

`.phase` records the highest shipped phase; CI passes it as `GATE` so parity proves every scenario
at or below it (see DECISIONS.md D-002).

### If another local server holds a port

Before any test runs, the harness verifies that the servers answering really are the reference and
this app — so a stray `vite preview` from another project can never be tested by mistake. If one
holds a port, pick another:

```bash
APP_PORT=4273 pnpm gate 6      # also REF_PORT for the reference server
```

### Pixel goldens

`compliance/goldens/` is captured only by `pnpm compliance:capture` against the committed
reference (D-031). The authoritative set comes from the pinned container:

```bash
pnpm compliance:docker compliance:capture
```

`compliance/goldens/PROVENANCE.txt` records which platform produced the current set. See
DECISIONS.md D-001.

## Publishing to GitHub

The repository is initialized on `main` with no remote, so GitHub Desktop will offer
**Publish repository**.

1. GitHub Desktop → **Add** → **Add Existing Repository** → this folder.
2. **Publish repository**. Keep **Keep this code private** checked — the handoff specifies a
   private repo.
3. Install the **Railway GitHub app** on it when you set up the Railway project (phase 00 § 0.8),
   and put the real `owner/repo` into `.railway/railway.ts` in place of `YOUR_ORG`.

### What the first CI run will do

| Job | Expected |
|---|---|
| `quality` | ✅ lint, typecheck, 769 tests |
| `harness` | ✅ the reference drives cleanly in all 55 scenarios |
| `compliance` | ✅ 55 parity scenarios and 25 e2e behaviours (`.phase` is 6) |
| `goldens` | ❌ **expected on the first push only** |

`goldens` re-captures inside the pinned Linux container. The committed PNGs were captured on
Windows, and Chromium rasterizes text slightly differently per platform, so they will not
byte-match. The job explains this in its log and uploads the container's set as the
`goldens-from-container` artifact. Download it, replace `compliance/goldens`, change
`PROVENANCE.txt` to `platform: container`, and commit — that set is then authoritative and the job
stays green. See DECISIONS.md D-001. The D-031 rebrand repeats this: it recaptured the win32 PNGs
and the shared `.json`, not the linux set, so its push fails `goldens` until the container set from
that run is committed to `compliance/goldens/linux/`. Until then CI's `compliance` parity also
compares against the pre-rebrand linux PNGs.

Add `quality`, `goldens`, `harness` and `compliance` as required status checks on `main` **after**
that commit, so protection is not blocked by the known first-run diff.

## Progress

| Phase | Delivers | State |
|---|---|---|
| 00 | Monorepo, CI, Railway IaC, compliance harness, goldens | ✅ shipped |
| 01 | Tokens, fonts, theme / accent / typeface (accent and typeface superseded by D-031), Icon | ✅ shipped |
| 02 | `packages/core`: types, seed, status, time, view-models, 37 mutations, permissions | ✅ shipped |
| 03 | Primitives + 7 product components + `/__states` | ✅ shipped |
| 04 | Router, sidebar, header, profile menu, data layer | ✅ shipped |
| 05 | Portal: Dashboard, Employee detail, Sessions, Team Hub, Vault, Team Tier | ✅ shipped |
| 06 | Admin: Overview, Curriculum, Module Builder, Cohorts, Learners, Vault, Announcements, Tiers, Staff | ✅ shipped |
| 07 | Postgres schema, magic-link auth, scoped snapshot, mutation API | — |
| 08 | Email, file storage, HLS replays, Zoom join window, scheduler | — |
| 09 | production / staging / demo environments, hardening, launch seed | — |

## Open decisions to confirm before phase 07

- **Production domain.** The docs use `learn.YOUR_DOMAIN` and `demo.YOUR_DOMAIN` as placeholders.
- **Video host for replays.** Any HLS provider works behind the `VideoEngine` interface.
- **Email sender domain** for Resend.
- **Brand assets.** Settled by D-031 — the committed "ai academy" lockup and favicon replace the
  logo and wordmark slots, and `VITE_BRAND_LOGO_URL` / `VITE_BRAND_WORDMARK_URL` are retired.

## Open question needing a product decision

- **Daylight Saving Time.** The prototype builds every session instant at a hard-coded `-06:00`,
  so any cohort running between March and November sits an hour later than its own `cadence`
  label claims. The reference does this too (its April 2027 cohort renders 2:00 PM CT while
  labelled 1:00 PM CT). The December launch cohort is unaffected. See DECISIONS.md › OPEN QUESTION.
