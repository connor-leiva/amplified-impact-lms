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

## Signing in (D-132)

`learn.amplifiedimpact.io/login` (the same screen as `/sign-in`) is email and password first, with the
magic link one click away ("Email Me a Sign-In Link Instead", or `/sign-in?method=link`). Every www
page links it: Log In, after About in the header nav (on a phone too) and in the footer.

| Screen | What it does |
|---|---|
| `/login`, `/sign-in` | Email, password and "Keep me signed in for 30 days". Without it, the session is a browser-session cookie and lasts 12 hours. |
| `/forgot-password` | Always answers "If that email has an account, we sent a link." An account with a password gets a reset link (1 hour); one without gets a set-password link (72 hours). |
| `/set-password?token=…` | Sets the password from either link, signs the person in, and ends their other sessions. Each link works once. |
| `/set-password?checkout=…` | The welcome page's "Set Your Password" button, for a brand-new account from that Stripe Checkout Session only. |
| `/account` | Signed in: set a first password, or change it with the current one. |

- **Accounts from checkout** get a "Set your password" email in place of the old owner invite, on the same schedule (held until `INVITES_FROM`, then at once).
- **Passwords** are argon2id hashes in `user_passwords`, never on `users`, never logged.
- **Lockout:** 5 failed sign-ins in 15 minutes locks the address for 15 minutes. Unknown addresses are counted the same way, so the lockout doesn't reveal whether an account exists. Routes and rules: `apps/api/src/routes/password.ts`.

```bash
pnpm --filter @ai/api exec vitest run test/password.test.ts   # the API's flows, against Postgres
pnpm --filter @ai/web exec vitest run src/routes/auth         # the screens
```

## GoHighLevel (D-033, D-076, D-134)

The app is the only writer into GHL. Sign-ups, orders and learners' first sign-ins are rows in
Postgres; a background loop copies them into the location in `GHL_LOCATION_ID` once a minute, and a
GHL outage never blocks a sign-up, a checkout or a sign-in. Stripe is never connected to GHL.

**Railway variables** (names only; Connor pastes the values in the dashboard):

| Variable | What it does |
|---|---|
| `GHL_TOKEN`, `GHL_LOCATION_ID` | Both set: the loop runs. Either missing: it is off. |
| `GHL_SYNC_ENABLED` | Exactly `false` pauses the loop without deleting the token. Anything else, or unset: no effect. |
| `GHL_FIELD_OFFER`, `GHL_FIELD_COHORT`, `GHL_FIELD_AMOUNT`, `GHL_FIELD_PURCHASE_DATE`, `GHL_FIELD_LMS_LOGIN` | Contact custom field ids. Each is written only when its id is set. |
| `GHL_PIPELINE_ID`, `GHL_STAGE_LEAD`, `GHL_STAGE_FREE_SKILLS`, `GHL_STAGE_CHECKOUT_STARTED`, `GHL_STAGE_PURCHASED`, `GHL_STAGE_PAYMENT_FAILED`, `GHL_STAGE_CANCELED`, `GHL_STAGE_REFUNDED` | One opportunity per contact in that pipeline, only when the pipeline and the stage's id are set. Free Skills and Checkout Started fall back to Lead. |

The token needs `contacts.write` (and `contacts.readonly`); for the pipeline, `opportunities.readonly`
and `opportunities.write`. A token without the pipeline's scopes keeps syncing contacts and tags, and
the log shows the opportunity as waiting.

**Tags.** The existing ones are unchanged. D-134 adds `ai-lead-free-skills`, `ai-buyer-accelerator`,
`ai-buyer-insiders`, `ai-buyer-agent-plan`, `ai-buyer-team-plan`, `ai-refunded`, `ai-canceled` and
`lms-logged-in` (see `docs/LMS-DELIVERY.md`).

**Backfill is automatic.** Each synced row keeps a stamp of what its sync wrote. When the stamp
changes (this release, a new field or stage id, a new `GHL_LOCATION_ID`), the loop sends every row
once more, 25 per kind per minute, pausing on a rate limit. Learners who signed in before this shipped
are queued on the first tick. To watch it:

```bash
pnpm --filter @ai/api ghl:status     # counts per kind, and the rows that are retrying or gave up
```

The Owner and Admins see the same at `learn.amplifiedimpact.io/admin/crm-sync`, with a Retry for a
row that gave up.

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
| 07 | Postgres schema, magic-link auth (email and password added in D-132), scoped snapshot, mutation API | — |
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
