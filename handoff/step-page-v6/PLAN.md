# PLAN: porting the v6 step page into the LMS

Branch `claude/step-page-v6` (worktree `/home/user/wt-v6`), off `origin/main` `4afdb6d8`. Nothing is built yet.
This plan comes from Phase 0 and Phase 1. The open questions are at the end.

## Phase 0 result (no LMS changes)
- **Chrome:** `/usr/bin/google-chrome` is Chrome for Testing **153.0.8010.12**, the same major version as `results/`. Node 22.23.
- **Test A** (`npm run diff`, harness vs mockup): **22 / 22 pass, worst 0.003 %**. Identical to `results/report.json`.
- **Test B** (`npm run video-parity -- --local mockup,harness,lms`): **72 / 72 pass**. Every state's edge and tone numbers are identical to `results/VIDEO-PARITY.md`.
- **The one 404 in both runs** is `mockup/media/w0-02-orientation-narrated-v5.mp4`, which HANDOFF §8.9 says isn't in the package. Both pages miss it the same way, and the playing video is masked.
- **No environment fixes** were needed.

## Phase 1 recon: HANDOFF §4 and §5 against the repo (`apps/web/src`)
| §4 item | In the repo | As described? |
|---|---|---|
| `routes/learn/Step.tsx` › `Player`, `vm.pills` branch | Yes, lines 102 to 180. It also draws `Crumbs`, `StepLive`, `StartHereCard`, the Claude / ChatGPT tabs (`layouts[on]`), "For this step", `BuildKit` and Still stuck. | Yes. It holds more than the mockup draws (see Q3). |
| Non-checklist branch | Yes, lines 182 to 301 | Kept untouched |
| `routes/learn/Checklist.tsx`: `ChecklistPlayer`, `ChecklistRail`, `ChecklistPills`, `playAt` | Yes (`playAt` at line 707). Mutations at 444 (`toggleChecklistItem`), 509 (`toggleStep`) and 517 (`setPref` for accordions). | Yes |
| `Glossary.tsx`: `KnowCard`, `Marked`, `RichTextView` | Yes | Yes |
| `routes/learn/Video.tsx` › `VideoView`, `HlsEngine` | `VideoView` at line 39. `HlsEngine` lives in `components/replay/HlsEngine.ts` and Video.tsx imports it. | Yes |
| `videoBlockSource`, `courseVideoUrl`, `parseCaptionCues`, `resumeAt`, `mergeSpans`, `watchedFraction` | `components/replay/source.ts`, `data/files.ts`, `packages/core/src/video.ts` | Yes |
| `Step.vm.ts` (`STEP`, `PillVM`, `CheckItemVM`, `ChecklistLayoutVM`, `AccordionVM`) | Yes. `PillVM.status` is the same `done / progress / waiting / idle`. | Yes |
| `styles/global.css`, `styles/r2.css`, `styles/geist.css` | Yes | Yes |
| `compliance/tests/e2e/tokens.spec.ts` | Yes. It asserts the exact `:root` token count against the reference (92). | Yes (see 2.2) |
| Learner shell layout for this route | `shell/learner/LearnerShell.tsx`. The step route is a child of it and gets its data through `<Outlet context>`. | Yes. A chrome-free mode is needed (2.4). |
| Feature flag mechanism | Build-time `VITE_*` flags, as `routes/learn/flag.ts` (D-177) did | Yes |
| Server rendering | None. It's a Vite SPA (no `renderToString` or `hydrateRoot`). | `useLayoutEffect` is safe. There is no first-paint server render, so no isomorphic hook is needed. |

### Checksums
- **Fonts:** the LMS serves byte-identical Geist and Geist Mono (`home/fonts/*.woff2` = `mockup/fonts/*.woff2` = `design-reference/fonts/*.woff2`, sha256 `19f9c925…` and `684ad5b5…`).
- **Brand files:** `ai-motion.css` and `ai-motion.tsx` **don't exist** in the repo yet. The package's copies in `brand/`, `src/motion/` and `mockup/` all match HANDOFF §3 (`25f4fbfb…` and `c1b8b25b…`).

### Test learner (#190)
- PR #190 is the seeded test member (D-200). D-202 added the Accelerator kind (`SEED_TEST_MEMBER_KIND=accelerator`): `users.is_test` and `early_access` open Week 0 before its dates.
- `db:curriculum:ensure` creates it on deploy from environment variables.

### Data
- The real Week 0 step 2 checklist (four items, chapters, transcript, poster) **isn't in this repo's seed**. It was entered in production through the Week Builder.
- Locally, test A needs step-2 data equal to the mockup's words. I'll write a local fixture from `src/sample-data.js` and `sample-cues.js`, test data only.
- On the deployed preview, production's step 2 must match the mockup word for word. Any mismatch there is a data fix in the builder, not code.

## Phase 2: files I'll add or change
All new step-page code sits under `apps/web/src/routes/learn/step-page/`, except the two brand files.

### 2.1 Brand motion files (byte-identical, checksum-tested)
- `apps/web/src/components/motion/ai-motion.css` and `ai-motion.tsx`, copied from `src/motion/`.
- A unit test asserts both sha256 values from HANDOFF §3, so nobody can edit them.
- Lint, typecheck and the CSS colour check must leave them unchanged. If eslint or `tsc` flag the brand `.tsx`, the fix is a scoped override in the eslint and tsconfig settings for that one file, never an edit.

### 2.2 Tokens and CSS
- `routes/learn/step-page/step-page.tokens.css` and `step-page.css`, verbatim, imported as **global** stylesheets (not modules).
- They load once from the step route, after `ai-motion.css`.
- `tokens.spec.ts`: `ai-motion.css` sets `--aim-*` on `:root`. If the spec sees them, I add them to its reference list, as HANDOFF §4.1 says. I won't move them into `[data-step-page]`.
- `scripts/check-css-colors.mjs` only scans `*.module.css` and the www folders, so the two global files aren't caught. `lms-type-floor` (the 16 px phone floor, D-156) may flag `step-page.css`: HANDOFF §8.4 notes 13 to 15 px phone text. If it does, the fix is a scoped exemption for this file, recorded in DECISIONS, not a CSS change (Q7).

### 2.3 Components (JSX to TSX only: same class names, ids, DOM order and CSS)
`StepPage.tsx` (beside `Step.tsx`, as HANDOFF §4.2 says), and in `step-page/`:
- `StepRail.tsx`, `StepHeader.tsx` (with `BackLink`), `VideoPlayer.tsx`, `Checklist.tsx`, `Reference.tsx`
- `StepFooter.tsx` (`MarkDone`, `NextCard`), `Sidebar.tsx`, `Icons.tsx`, `motion.ts`, `useHScroller.ts`

Not shipped: `ReviewSection.jsx` (`MockFlag`, `ReviewSection`), the `mockFlag` and `review` props, and the `styles` jump. The tests add these back themselves (`diff/fixtures.mjs`). `sample-data.js` and `sample-cues.js` go to test fixtures only.

### 2.4 The route without app chrome, behind the flag
- **Flag:** a new build-time `VITE_STEP_PAGE_V6`.
  - It's off by default and stays off in `.env.fixture`, so every existing test and golden is unchanged.
  - A separate flag-on fixture build serves the parity tests locally.
  - The deployed preview sets it. Production doesn't.
- **`Step.tsx` › `Player`:** with the flag on and `vm.pills` set, render `<StepPageV6 …mapped props>` instead of today's pills branch. The non-checklist branch is untouched.
- **`LearnerShell.tsx`:** with the flag on and the route being a checklist step, render only `<Outlet context={ctx}/>`, with no sidebar, top bar or drawer.
  - The decision comes from a pure helper in `Step.vm.ts`: does this week have checklist steps? That's the same test that sets `vm.pills`.
  - The data context is unchanged. `MasqueradeRoot` still wraps it.
  - The staff "Previewing as…" bar lives in the shell's top bar, so it would disappear on this route (Q4).

### 2.5 Props ← real loaders (HANDOFF §5)
`layout = vm.layouts[on]`, where `on` is the current path tab.

| v6 prop | From |
|---|---|
| `week`, `n` | `vm.week`, the current pill's `n` |
| `back`, `railLabel`, `pills[]` | `vm.back`, `vm.railLabel`, `vm.pills` (`PillVM`: same status words; `on`, `href`, `title`) |
| `eyebrow`, `title`, `lede` | `vm.eyebrow`, `vm.title`, `vm.lede` |
| `tags[]` | `[{clock, layout.time}, {users, layout.role}, {cal, layout.due}]`, skipping any that are null |
| `video` | `layout.videos[0]`: `id`, `title`, `poster`, `chapters`, `durationS`, `sectionLength` / `clock` (`watchLength`), `playLabel`, `cues` (`parseCaptionCues`), src through `videoBlockSource` / `courseVideoUrl`, and `autoCheckItem` / `autoAt` from the item with an `autoLabel` |
| `items[]` | `layout.items`. `action` maps to `play` (`playLabel`, `playSeconds`), `card` (`card` terms), `calendar` (`IcsEvent`) or `link`. Callouts carry over. |
| `accordions[]` | `layout.accordions` (`index`, `title`, `body`, `open`) |
| `stepDone`, `next`, `due` | `vm.mark.done`, `layout.next`, `layout.due` |
| `jumps[]` | `layout.jumps`, without `styles` |
| `forStep[]` | `asideRows(vm.aside, on)`, mapped to `{ id, icon, title, meta, view, copyText }` |
| `help[]` | `vm.help.email` (icon `mail`), `vm.help.officeHours` (icon `radio`) |
| `labels` | `STEP` plus `scrollStepsLeft` "Scroll steps left" and `scrollStepsRight` "Scroll steps right". Any label the mockup has and `STEP` lacks is added to `STEP` with the mockup's exact words. |
| `checks` | `{ [item.id]: item.checked }` |

### 2.6 Mutations and video
- **`onCheck(id, on)`:**
  - For a learner, it calls the existing `toggleChecklistItem` only when the server's state differs (the mutation toggles). A staff preview uses the existing local toggle.
  - `useMutate`'s toast and snapshot refetch handle a failure, so a refused write resets the box.
- **`onStepDone(on)`:** the UI first, then `toggleStep` when `vm.mark.done !== on`.
- **Video:**
  - `VideoPlayer` renders `<video ref={videoRef} id="video">`.
  - A hook ports the engine part of `VideoView` unchanged: `HlsEngine` attaches to that element; `resumeAt`; and the watched-span tracking (`mergeSpans`, `watchedFraction`) feeding `saveVideoProgress`.
  - HLS `waiting` and `playing` drive the buffering sweep through the events `StepPage` already listens to.
- **Transcript:** its open state stays under `localStorage['w{week}s{n}-transcript']`.

## Phase 3 and the order of work
Phase 2 follows your order: brand files, then tokens and CSS, StepRail, StepHeader, VideoPlayer, Checklist, Reference, StepFooter, Sidebar, and finally StepPage and the route. After each piece I commit, then run that piece's checks.

Locally:
- the flag-on fixture build with the step-2 fixture;
- the test learner seeded into local Postgres with D-202's kind, so http mode has a real session;
- a reset script that puts that learner at step 1 done, step 5 waiting, nothing checked on step 2 and no video progress, before every run;
- the storage state from a real password sign-in.

`diff/piece-review.mjs` as you specify. I'll write it once I have the rest of Phase 3 (Q1).

## Open questions (blocking)
1. **The prompt was cut off** in Phase 3 C ("`#pills-hs`: at the start (right arrow and fade), scrolled"). I need the rest of C's pieces and states, D, E, and anything after.
2. **Scope.** The opening says the whole LMS should be refined with these elements: this page, then the rest of the setup builder's pages, then the rest of the LMS. The hard rules say to touch only the step route, its components, its CSS, the two brand files and the route's layout. Recommendation: this branch does the step route only. All eight Week 0 steps render through the same `StepPage`, so they update together where their content is covered (Q3). The wider LMS refinement comes in follow-up PRs once this one passes. Confirm?
3. **Content the mockup never draws.** Other Week 0 steps use things step 2 doesn't have:
   - the Claude / ChatGPT path tabs;
   - step 1's Start Here card;
   - `StepLive`;
   - download, copy and invite actions;
   - sub-checks, waiting and optional items;
   - leading callouts, extra content blocks, multiple videos, accordion tables and links, rich text;
   - glossary underlines in titles;
   - the operator's count;
   - the build kit.

   The rules forbid styling from description. Recommendation: with the flag on, a step uses v6 only when every piece of its content is something the v6 components draw; any other step keeps today's player. Each extra piece then gets designed in `mockup/step-2.html` first.
4. **Landmarks.** The repo's CLAUDE.md requires `aside[aria-label="Primary"]`, a `header` with `nav[aria-label="Breadcrumb"]`, and `main` on every page. The v6 page has `main`, a `header` without a breadcrumb `nav`, and an aside labelled "On this step". The chrome-free route also drops the shell's bar, so a staff preview loses its "Previewing as…" line. Recommendation: allow the exception for this route, with a DECISIONS entry. Confirm?
5. **The 90 % auto-check.** v6 checks "Watch the video" on the client when the playhead passes 90 %, so seeking to the end would check it. The LMS rule (D-191, `saveVideoProgress`) checks it when 90 % of the video has actually been watched. Recommendation: keep the server's rule. The page shows the check when the server's auto-check comes back, which is a behaviour change only, with no pixel difference. Or follow v6 exactly?
6. **The deployed preview and its session.** `<PREVIEW_URL>` and `<AUTH_JSON>` are placeholders. I can't deploy or set Railway variables. Who deploys the flagged preview (an environment with `VITE_STEP_PAGE_V6=true` and the D-202 test learner's variables)? Who gives me the test learner's saved session? And how do I reset that learner on the preview before each run? There's no learner-side mutation that clears video progress. Recommendation: a one-line SQL reset that you or Railway runs, kept as a script in this folder.
7. **Exemptions CI will need.** If `lms-type-floor` (16 px phone floor) or eslint or `tsc` reject the verbatim CSS or the brand `.tsx`, I'll add file-scoped exemptions and record them in DECISIONS. I won't change the files. OK?
8. **The handoff folder in the repo.** Commit `handoff/step-page-v6/` (about 13 MB: 8.6 MB of frames and a 1.8 MB mp4, without `node_modules` and the harness build) so CI and others can re-run the tests? Or keep it outside the repo?
