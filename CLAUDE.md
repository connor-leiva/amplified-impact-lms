# CLAUDE.md: Rules for Building Amplified Impact

Put this file at the repository root. It applies to every task in this repo.

## What you are building
A two-sided LMS for Amplified Impact's AI training program. It has two parts:
- a **learner portal**, where agents and teams build six "AI Employees" through live Sessions
- an **admin console**, where staff create the AI Employees and run cohorts

There is a complete, high-fidelity prototype in `design-reference/`. **Your job is to recreate it exactly** in React + Vite + TypeScript, backed by a Fastify + Postgres API, deployed on Railway from GitHub.

## Sources of truth (in priority order)
1. `design-reference/*.dc.html` and `design-reference/lms-data.js`: pixels, copy and behavior. Open them in a browser (`pnpm reference` → http://localhost:4400).
2. `docs/SCREENS.md`: the layout and behavior contract for each screen.
3. `docs/DESIGN.md`: tokens, type, the status model, icons and time rules.
4. `phases/NN-*.md`: what to build, in what order, and the gate that must pass.
5. `DECISIONS.md`: approved deviations. **It starts empty and only grows with explicit human approval.**

If the sources disagree on a pixel or a string, the reference wins. If they disagree on behavior, stop and ask.

## Non-negotiables
- **Never ship a phase without its gate.** Run `pnpm gate <n>` (screenshots in Docker: `pnpm compliance:docker gate <n>`). A phase is done only when it is green locally and in CI.
- **Never edit `compliance/goldens/` by hand**, and never regenerate them to make a failing test pass. Goldens come only from `pnpm compliance:capture` against the committed `design-reference/`, which itself changes only through a DECISIONS.md entry (D-031, the rebrand). CI proves this.
  Screenshots are scoped by platform (`goldens/linux/` is authoritative and CI-enforced, `goldens/win32/` is the local dev set) and the `.json` fingerprints are shared, because they are platform-independent by measurement. See D-020.
- **Never raise the tolerance** (`maxDiffPixelRatio: 0.01`, `threshold: 0.15`) and never add masks, except a narrowly scoped one with a DECISIONS.md entry.
- **Never add features, screens, copy or UI the mockup doesn't have.** The only exceptions are the explicitly listed net-new pieces: sign-in and invite-accept screens (phase 07), the unsaved-changes prompt (phase 06), and production integrations (phase 08). If something seems missing, ask.
- **Copy is exact.** Labels are Title Case and descriptions are sentence case, as rendered in the reference. Do not paraphrase, shorten or "improve" text.
- **Styling uses tokens.** `apps/web/src/styles/tokens.css` is generated and verbatim. Use only `var(--token)`: no hex, rgb or named colors, no Tailwind, no CSS-in-JS runtime, no UI kit. Spacing and radii are literal px values copied from the reference.
- **Icons** come only from `ICONS` in `@ai/core` through `<Icon>`. No icon libraries.
- **Business logic lives in `packages/core`.** Status, time, view-models, seed and mutations are ported from the reference and covered by differential tests. Screens render view-models. The API runs the same mutation functions.
- **Time:** always use `fmt.*`. The viewer's zone comes first and the program zone follows in parentheses. Never use `toLocaleString` directly in components.
- **Required landmarks:**
  - `aside[aria-label="Primary"]`
  - `header` containing `nav[aria-label="Breadcrumb"]`
  - `main`
  - `[role="dialog"]` for modals
  - `data-drawer="open"` on open drawers
  - `data-brand-slot` on the brand logo
  - `body[data-app-ready="true"]` once loaded
- **Demo controls** (View As, Timeline, Reset Demo) and the `?as=`, `?phase=` and `?now=` params exist **only** in fixture mode. They must be impossible in `http` mode.
- **Accessibility:** zero serious or critical axe violations, visible focus on every interactive element, tokens that pair an icon with a text label (never color alone), and `prefers-reduced-motion` honored for confetti.

## Workflow per task
1. Read the phase file and the SCREENS section for the task, then open the matching reference file side by side with your build.
2. Port the logic first (`*.vm.ts` plus a unit test), then the markup, then the styles.
3. Run the relevant parity scenario (`GATE=<n> pnpm compliance --grep <id>`) and read both diffs:
   - the PNG diff, in `compliance/report`
   - the fingerprint diff, which shows the exact text, size, weight, line-height or color that is wrong
4. Run `pnpm gate <n>` before opening a PR. Paste the gate summary in the PR description.

## Commands
| Command | What it does |
|---|---|
| `pnpm dev` | web (Vite) + api (tsx watch) |
| `pnpm reference` | serves `design-reference/` at :4400 |
| `pnpm --filter @ai/web preview:fixture` | the app in fixture mode at :4173 (what parity runs against) |
| `pnpm compliance:capture` | regenerates goldens from the reference (only when the reference changes) |
| `pnpm compliance` / `pnpm e2e` | parity / behavior suites, in fixture mode |
| `pnpm compliance:http` | the portal scenarios against the real API, against the SAME goldens (phase 07 § 7.3). Its own step, never a dependency of `parity` — Playwright skips a project whose dependency failed, which once let three http diffs suppress all 55 fixture scenarios |
| `pnpm --filter @ai/api db:migrate` / `db:seed` / `db:seed:prod` | apply migrations, load the demo seed, load § 9.5's launch seed |
| `pnpm gate <n>` | everything required to ship phase n |
| `railway config plan` / `apply` | infrastructure changes (reviewed in the PR) |
