**Admin redesign R2: build it to match the signed-off mockup to the pixel (next free D-number, expected D-160; D-158 is Console PR 2, D-159 is #130)**

Repo `connor-leiva/amplified-impact-lms`, base `main` (ba0cb42). Connor signed off the Round 2 admin mockup on Sun Nov 15, 2026, 4:58 PM MST: *"Yes, build it and make sure that it builds it to match the mockup to the PIXEL."* The mockup renders are the source of truth. "Close enough" fails.

**Attached:** `AdminRedesign.jsx` (canonical mockup), `BUILD-SPEC.md` (full detail: tokens, breakpoints, sidebar, decisions, parity protocol, root-cause fix), `Design notes.md`, `render-mockup.mjs`, `package.json`, `MANIFEST.tsv`, and 6 anchor PNGs. `AdminConsole.jsx` (Round 1) is superseded.

**PR R2-0 (references only, no app change).** Commit the attachments under `design-reference/admin-redesign-r2/`, with the harness in `harness/` and the manifest in `ref/`. Then run `node design-reference/admin-redesign-r2/harness/render-mockup.mjs` to generate `ref/`: 30 screens × 1440/1280/1024/390, plus `roles-confirm-*`, 124 PNGs. It uses local Geist from `design-reference/fonts/`. Every PNG must match `MANIFEST.tsv` width × height exactly. Check them against the anchors as well (≤0.1%). Add `pnpm parity:admin-r2` (`compliance/tests/e2e/admin-r2-parity.spec.ts`) in report-only mode.

**Parity rule, for every PR from here on.** Build a parity fixture that reproduces the mockup's data exactly. It's fixture mode only and never ships. Freeze the clock at Thu Dec 10, 2026, ~9:30 AM MST, viewer Owner. Capture each built screen at the same width, DPR 1, in the same Chromium as the refs, full-page with scrollers expanded (BUILD-SPEC §6). Compare with pixelmatch (0.1, includeAA false). **Pass = identical dimensions AND ≤0.1% differing pixels** for every screen × width the PR touches. Masks are for dynamic text only, each listed with a reason in `compliance/parity/admin-r2-masks.json` (expected: none). Never loosen the threshold. In each PR's test-results comment (naming the head SHA), post:
- a screen × width table showing diff % and px plus dims OK/FAIL;
- the masks;
- the diff PNGs;
- side-by-sides at 1280 and 390.

By the end of the stack, all of these pass at all 4 widths: curriculum, overview, health, workspaces, workspace-detail, billing, cohorts-sessions, roles + roles-confirm, usage. So does every other screen with a ref.

**Exact design.** Port the `CSS` constant in the JSX verbatim as tokens:
- colours (#F4F2EC / #FFF / #15211D / #46524D / #5F6A64 / #E6E3DA / #D3CFC3 / forest #1F4D40 / mint #6FD3A5 and status sets);
- Geist type: 14/20 body, 12/16 meta, 13 mono, 15/22 section, 26/32 h1 (phone 16/16/16/17/24);
- sizes: 32 controls, 36 primaries, 52 rows, 40 table headers, 22 pills, 52 top bar;
- radii 8/12/999 and the exact shadows;
- sidebar 244px; **64px icon rail at 768–1199** with flyouts; 300px drawer ≤767; page max-width 1400.

Use the existing `design-reference/brand/amplified-impact-wordmark.svg` as-is. The rail crops it to its first glyph, as the JSX does.

**Sidebar.** Groups are Health, Build, Support, Revenue, Operations, Access, in the JSX's item order.
- Groups are **collapsible** (Connor, 11:24 AM). Health, Build and the active page's group start open. The choice is remembered in localStorage.
- Badges appear only for real alerts or work, and hide at zero. A collapsed Operations shows "1 incident" in red.

**Fix the root cause first.** #117/D-156 applied phone sizing at every width: the global 16px root, 44px button min-height/min-width, the codemod's 16px/24px floors, AppShell/NavItem/Curriculum/StatusToken hand edits, and #120's unscoped `--tap-primary`. Scope all of it to `@media (max-width:767px)` using `--fs-N/--bx-N/--lh-N/--tap` tokens and a mechanical `scripts/lms-type-scope.mjs` (BUILD-SPEC §8). Phone must not regress:
- every text node at 390 is ≥16px;
- every control is ≥44px, primaries 48px;
- the 390 goldens and `lms-mobile.spec.ts` stay green.

There must be no horizontal overflow at 320 to 1440.

**Decisions already made.**
- "Hidden from learners" appears in full at ≥1280, using a wider nowrap Status column. At 1024 it becomes a "Hidden" pill with a hover title. On phone cards it goes on the meta line.
- Full fixed-seat plans get grey #9AA39E seat bars. Nearly full plans get amber. Never red.
- At 1280, Curriculum Live session shows the short name with ellipsis. The full title goes in title/aria-label.
- One time-zone label everywhere: MST (America/Phoenix).
- Support can't refund, void or masquerade. Those boxes are locked with "Fixed by product rules".
- Every other permission change goes through the confirm dialog and writes one append-only audit row.
- **Review nits are must-fix.** They're already resolved in the mockup copy and refs:
  - the Cohorts Attendance "—" is muted like Replay's;
  - the phone Overview attendance labels use a fixed 124px column, so the bars align;
  - Curriculum row numbers show only when the table is ≥1100px wide (1440), which is intended.
- Console spec rules are unchanged: masquerade is Owner/Admin only, with a reason, for 15–60 min, with writes blocked; there's no secret replacement; flags are state-only; the Accelerator cap is view-only; `audit_log` is append-only.

**Stack (each PR small, ≤~1,500 non-test lines, stacked in order, each with a DECISIONS entry that logs the golden re-capture Connor approved for every console PR):**
- **R2-0:** refs + harness (above).
- **R2-1:** root-cause scoping, R2 tokens, shared primitives (Button, Pill, Status, Bar, Card, Stat, Table with container-query columns and phone cards, Tabs, Select, Modal/Confirm, Toast, Empty, Skeleton, Facts, Menu), and the new AppShell with collapsible groups. This replaces #125. Rebase `components/console/*` onto it. Enforce 404 and Denied.
- **R2-2:** Build screens (Curriculum, Module Builder, Resource Vault, Cohorts & Sessions, Announcements).
- **R2-3:** Overview, Tiers & Upgrades, Learners & Teams, Audit Log, Roles + confirm.
- **#126 (2a: API + additive `0016_staff_notes`, no UI):** keep it. Rebase it on main and re-post results. It must merge before R2-4.
- **R2-4:** Workspaces, Workspace detail, Users, User detail. This supersedes #127 and #128: port their vm, data, tests and fixtures, and redo the presentation on R2.
- **R2-5:** Search plus the ⌘K palette. This supersedes #129.
- **Spec PRs 3–10:** every remaining console screen (Masquerade, Billing, Usage, API, Jobs, Email, Incidents, Integrations, Deploys, DB, Flags, Health) is built on R2 and must hit its refs in that PR.

Once each replacement PR is open, close #125, #127, #128 and #129 with "Superseded by #N (R2 design)".

**Hard limits.**
- Don't touch: Stripe checkout or Payment Links, the seat cap (D-154), webhooks or provisioning, gating, GA/Meta, `/agreement`, www behaviour, or PR #130's files (`apps/web/src/offer/*`, `kit/kit.css`, `home/prices.ts`, `site/offers.ts`, the pricing/team-build render tests, `apps/api/test/analytics.test.ts`, `web-raw.d.ts`); append to DECISIONS.md only.
- No secrets, and never call list-variables.
- Migrations are additive only.
- `audit_log` stays append-only.
- Never self-merge.

**Merge gate (no GitHub CI).** I merge only after you post local results naming the exact head SHA: lint, typecheck, test, the full compliance suite (`pnpm gate` runs no tests), goldens, and the `parity:admin-r2` table. Then my review has to pass, and I check renders against the mockup PNGs myself. Re-post after any push.

**When done, reply with:** every PR number and title, the order to merge in, which refs each PR enforces, and anything that couldn't hit ≤0.1%, with the reason. Never mark a failing cell as passing.
