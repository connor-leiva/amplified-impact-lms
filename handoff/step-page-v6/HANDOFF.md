# Week 0 step page: brand-motion handoff (v6) for Claude Code

**Goal:** make `learn.amplifiedimpact.io/learn/week/0/step/N` look like the recorded demo
(`reference/interaction-demo.mp4`, 29 s, 1280×800) and move the way Amplified Impact Motion v1 says
(`brand/ai-motion.css`, `brand/ai-motion.tsx`, `brand/motion-tokens.json`).

**Source of truth, in this order:**

1. **How it looks:** `reference/interaction-demo.mp4` and the 24 reference images cut from it, `reference/frames/*.png`.
2. **How it moves:** the brand motion files in `brand/`, unchanged. `MOTION-MAP.md` says which brand token or
   component drives each moving thing on this page.
3. `mockup/step-2.html`: the two together. It matches all 24 video frames, except the 8 hover and done looks the brand
   changes on purpose (`npm run video-parity`, §7B), and it loads `ai-motion.css` as is.
4. `src/` (React): renders the mockup at **0 % different pixels** in 22 checks (`npm run diff`, §7A).

This file describes. It never overrides 1 to 4. If a sentence here seems to disagree with a frame or a brand file,
the frame (for looks) or the brand file (for motion) wins.

---

## 0. How to work

- **Port, don't redraw.** Copy `src/StepPage.jsx`, `src/components/*`, `src/step-page.css` and
  `src/step-page.tokens.css` into the repo. Convert to TSX and nothing else. Keep every class name, id, DOM order
  and CSS value.
- **Use the brand files as they are.** `src/motion/ai-motion.css` and `src/motion/ai-motion.tsx` are byte-identical
  copies of the brand's v1 files (sha256 below). If the LMS already has them, use its copies only if they match;
  never edit them to make this page work. Components import `RollLabel`, `SignalMark` and `useCountUp` from
  `ai-motion.tsx`.
- **Never write CSS or motion from a description** (this file included), from memory, or from a screenshot you
  took. If a value must change, change it in `mockup/step-2.html`, run `npm run css` and `npm run review`, and
  prove it with both tests.
- **Done means both tests pass against the deployed page** (§7). A state that fails is not done, however close
  it looks. Open `results/video/target-<state>.png` (video frame | your page | heat map) to see where.
- Touch only the step route, its components, its CSS and the two brand motion files (§4).

## 1. What changed

### Since v5: brand motion and the Reference dropdown
- **Motion.** All of Grok's ad-hoc timings (150 ms ease-out, lifts, blur-swaps, the mint flash, the 600 ms ring)
  are replaced by Amplified Impact Motion v1. The full table is `MOTION-MAP.md`; in short:
  - one curve (`--aim-ease`), the brand durations, and springs for presses, rolls and arrivals;
  - hover changes colour only. Nothing lifts. Primary and secondary labels roll; a secondary's outline firms to ink;
  - press squeezes to .96 in 90 ms and springs back (.84 for checkboxes, the lesson-check spec);
  - Mark step done is the brand's async button: the label rolls out, the dot lands and the ring draws;
  - the progress figure counts with its bar (720 ms); the On this page marker springs between sections;
  - blocks rise in order when the page arrives (14 px, 45 ms apart); the hairline sweep shows while the video buffers;
  - panels open on the system curve (380 ms) and close on the exit curve (200 ms);
  - reduced motion (the OS setting or `.aim-reduced` on any ancestor) lands everything on its final frame.
- **Reference dropdown.** When it's open, its header now carries a hairline and the list sits 16 px below it.
  Hovering the header to close it no longer puts the text against the darkened header.
- **Unchanged:** every colour, size, word and resting state from the video. Resting pages are pixel-identical to v5,
  except the review-only text links, which now use the brand link style.

### Since v4 (Grok's): the step rail
v4 had swapped the video's labeled step pills for compact circles, which moved the whole page up 4 px; v5 restored
the video's rail. Full diff v5 → v6: `CHANGES-v5-to-v6.diff`.

## 2. The rail and the motion, as built (read the code for the spec)

| Part | Look (from the video) | Motion (brand v1) |
|---|---|---|
| Step pills | 40 px, white, 1 px `line` border, title Geist 500 14 px, 24 px number circle (bone; done energy with a white check; waiting dashed ink 45 %; current forest pill) | Hover: bone fill, `line-2` border, circle turns white, 160 ms. Press .96 / spring. Marked done: the check draws. |
| Buttons | As in the video | Labels roll on hover (primary, secondary). Secondary outline firms to ink. Press .96 / spring. |
| Checkboxes | 22 px box in a 44 px target, forest halo on hover | Press .84 / spring, check draws in 240 ms after 70 ms, title settles 240 ms. |
| Mark step done | Forest, 48 px; done: mint fill, forest label | Brand async: label rolls up and out, done layer rises, 18 px mark: dot lands, ring draws once. |
| Progress | 6 px bar, "N of 4 checked" | Fills over 720 ms on the system curve; the number counts with it. |
| On this page | 2 px forest marker on the current link | The marker springs (560 ms) to the new section. |
| Reference, transcript | Header hairline when open; list 16 px below | Open 380 ms `--aim-ease`; close 200 ms `--aim-ease-exit`. |

## 3. Files

| File | What it is |
|---|---|
| `reference/interaction-demo.mp4` | The recording. The truth for how the page looks. |
| `reference/states.json` | The 24 steady moments of the video: frame range, what's on screen, the steps to get there from a fresh load, and (v6) `brandMask`, the elements the brand motion changes on purpose. |
| `reference/frames/<state>.png` | One reference image per state, the average of its frame range. `npm run frames` rebuilds them (needs ffmpeg). |
| `brand/ai-motion.css`, `brand/ai-motion.tsx`, `brand/motion-tokens.json` | Amplified Impact Motion v1 as delivered. The truth for how things move. |
| `MOTION-MAP.md` | Each moving thing on the page → the brand token or component behind it. |
| `mockup/step-2.html` + `mockup/ai-motion.css` | The page: the video's look, the brand's motion. Plus the review-only MOCKUP bar and "Text styles" section. |
| `src/StepPage.jsx` | The page. Owns checklist, step-done, video-time, buffering and scroll-spy state. Props at the top of the file. |
| `src/motion/ai-motion.css`, `src/motion/ai-motion.tsx` | The brand files, byte-identical. Load the CSS before `step-page.css`. |
| `src/components/StepRail.jsx` | The labeled step pills in the shared scroller. |
| `src/components/StepHeader.jsx` | Back link, eyebrow, H1, goal line, three tags, progress row (`useCountUp`). |
| `src/components/VideoPlayer.jsx` | 16:9 frame, poster, play pill (rolling label), buffering sweep, chapters, transcript, Back to current. |
| `src/components/useHScroller.js` | The one horizontal scroller (rail and chapters). |
| `src/components/Checklist.jsx` | Items, lesson-check motion, rolling secondary labels, Know These card (rows rise), callouts. |
| `src/components/StepFooter.jsx` | Mark step done (brand async button), Undo, the Next card. |
| `src/components/Sidebar.jsx` | On this page with the spring marker, checklist mirror, due line, For this step, Still stuck. |
| `src/components/Reference.jsx`, `Icons.jsx`, `motion.js` | Accordions, the icon sprite, reduced-motion helpers (`isReducedMotion` from the brand). |
| `src/components/ReviewSection.jsx` | **Mockup-only**, generated (`npm run review`). Do not ship. |
| `src/sample-data.js`, `src/sample-cues.js` | Props, word for word from the mockup. |
| `src/step-page.tokens.css`, `src/step-page.css` | Every value as `--sp-*` (motion as `--aim-*`); generated (`npm run css`). |
| `harness/` | esbuild build, static server, `public/`. `/harness/` is the mockup's page; **`/harness/?lms` is what the LMS ships** (no MOCKUP bar or Text styles), for rehearsing the deployed-page tests. |
| `diff/pixel-diff.mjs` | Test A: target vs mockup, 22 checks. |
| `diff/video-parity.mjs`, `diff/compare.mjs`, `diff/fixtures.mjs` | Test B: target vs the video frames. |
| `results/` | My runs: `report.json` (test A), `video/*.json` and `VIDEO-PARITY.md` (test B), and before/after images. |

Brand file checksums (sha256): `ai-motion.css` `25f4fbfb9ff4eda379af32c8135ecb22999186abf4c993edd2e1b6439ba3e054`,
`ai-motion.tsx` `c1b8b25b5504c1bf78ebaa301962e3ad7b6575ec6e4e1dee2a90f3160a13d6ea`.

Run it:
```
npm i                 # react 19, esbuild, playwright-core, pixelmatch, pngjs
npm run build         # harness/public/app.js + app.css (bundles ai-motion.css first)
npm run serve         # http://localhost:4178/harness/  and  /mockup/step-2.html
npm run diff          # test A, harness vs mockup
npm run video-parity  # test B, mockup and harness vs the video
npm run video-parity -- --local lms                              # test B on the LMS-shaped page
npm run diff -- --target "http://localhost:4179/harness/?lms"    # test A on the LMS-shaped page
```
Both tests use `/usr/bin/google-chrome` (`--chrome <path>` to change it), device scale 1, cleared localStorage per shot.

## 4. Repo files to replace or modify (apps/web/src)

Class names and ids are the mockup's, one for one. They're also the selectors the tests use: `#pills .stp[data-n]`,
`#chaps .chip`, `#next`, `#ttoggle`, `#know-btn`, `.item .box-btn`, `#mark`, `#video`, `#reference summary`.

1. **Brand motion files.** Add `ai-motion.css` as a global stylesheet loaded **before** `step-page.css`, and
   `ai-motion.tsx` where shared client components live (it's `'use client'`, React 18+, no dependencies). If the LMS
   already ships them, check the checksums above. `ai-motion.css` sets `--aim-*` on `:root` by design; if
   `compliance/tests/e2e/tokens.spec.ts` rejects new `:root` properties, add the `--aim-*` tokens to its reference.
   Don't move them into `[data-step-page]`.
2. **`routes/learn/Step.tsx` › `Player`**, the `vm.pills` branch: replace its JSX with `<StepPage>` converted to TSX
   (`StepPage.tsx` beside it, components in `routes/learn/step-page/`). Keep the non-checklist branch.
   If v4's compact-circle `StepRail` or v5's components were already shipped, replace them with v6's.
3. **`routes/learn/Checklist.tsx`**: `ChecklistPlayer`, `ChecklistRail`, `ChecklistPills` are superseded by
   `Checklist.jsx`, `Sidebar.jsx`, `StepRail.jsx`. Keep `playAt`, `KnowCard`/`Marked`/`RichTextView` (Glossary.tsx)
   and the mutation code (`useMutate`, `toggleStep`, check marks, confirm, undo); call them from `onCheck` / `onStepDone`.
4. **`routes/learn/Video.tsx` › `VideoView`**: replace its markup with `VideoPlayer.jsx`. Keep `HlsEngine` and attach
   it to the `<video ref={videoRef}>` that `VideoPlayer` renders. Keep `videoBlockSource`, `courseVideoUrl`,
   `parseCaptionCues`, `resumeAt`, `mergeSpans`/`watchedFraction` and the poster `<img class="vposter">`. HLS stalls
   fire `waiting`, which shows the buffering sweep; `playing` hides it.
5. **CSS**: import `step-page.tokens.css` and `step-page.css` once from the step route as **global** stylesheets, after
   `ai-motion.css`. Not CSS Modules (with a module, wrap each class in `:global()`).
6. **`styles/global.css`** overrides are already countered inside `[data-step-page]`.
7. **No app chrome on this route.** `.page` is max 1280 px with 24/32/64 padding, grid `1fr 288px`.
8. **Don't pass `mockFlag` or `review`**, and drop `styles` from `jumps`. The tests add those review-only pieces back
   themselves before comparing (§7).

## 5. Props ← real loaders

Unchanged from v5 (see `src/StepPage.jsx`): `step.back`, `railLabel`, `pills[]` (PillVM), `eyebrow`/`title`/`lede`,
`tags[]`, `video` (VideoBlock: `poster`, `chapters`, `cues`, `durationS`, `sectionLength`, `clock`, `playLabel`,
`autoCheckItem`, `autoAt`), `items[]` (CheckItemVM with `action` mapped to play/card/calendar/link), `accordions[]`,
`stepDone`, `next`, `due`, `jumps[]`, `forStep[]`, `help[]`; `checks`, `onCheck`, `onStepDone`, `onProgress`; and
`labels` = `STEP` in Step.vm.ts plus `scrollStepsLeft` "Scroll steps left" and `scrollStepsRight` "Scroll steps right".
The transcript open state persists under `localStorage['w{week}s{n}-transcript']`.

## 6. Tokens

- **Colour, space, radius, type: 48 `--sp-*` tokens** in `src/step-page.tokens.css`, set on
  `html:has([data-step-page]), [data-step-page]`. Shared ones fall back to `styles/r2.css` values (`--sp-forest`,
  `--sp-energy`, `--sp-energy-bright`, `--sp-surface`, `--sp-black`). `--sp-ink-45` is the waiting step's dashed circle.
- **Motion: the brand's `--aim-*` tokens** from `ai-motion.css`: `--aim-ease`, `--aim-ease-exit`, `--aim-ease-spring`
  (a `linear()` spring with a cubic-bezier fallback), `--aim-dur-press` 90, `-quick` 160, `-exit` 200, `-base` 240,
  `-move` 380, `-land` 400, `-draw` 420, `-spring` 560, `-fill` 720 ms, `--aim-rise` 14 px, `--aim-stagger` 45 ms.
  v5's `--sp-ease-out` and `--sp-t-press/-ui/-reveal` are gone.

## 7. Acceptance tests

Deploy behind the flag, then run both against the deployed page with a saved session for the test learner.

### A. Pixel parity with the mockup
```
node diff/pixel-diff.mjs --target https://learn.amplifiedimpact.io/learn/week/0/step/2 --storage-state <auth.json>
```
22 checks. At 1280 and 390 wide, full page: `default`, `hover-rail`, `hover-next`, `transcript-open`, `mark-locked`,
`step-done`, `know-open`, and `acc-open-hover` (viewport). At 1280 only, viewport: `hover-play`, `hover-chip`,
`hover-arrow`, `hover-secondary`, `hover-mark`, `hover-done`. Each must be **< 0.1 %** (pixelmatch threshold 0.1,
antialiasing ignored). Every hover and click waits 800 ms so springs settle.

### B. Parity with the video
```
node diff/video-parity.mjs --target https://learn.amplifiedimpact.io/learn/week/0/step/2 --storage-state <auth.json>
```
Replays the 24 steady moments of the recording and compares each screen with its frame, blurred and region-based
(`diff/compare.mjs`): **edge** (σ1.6, Δ > 22, fail if a region > 120 px) catches anything moved, resized or missing;
**tone** (σ4, Δ > 7, fail if a region > 150 px) catches a different fill or tint.

Masked, so not compared with the video: the playing video (course media), and in 8 states (marked `*`) the
element whose look the brand motion changes on purpose: the hovered step pill, play pill, chapter chip, secondary
buttons, Mark step done and the Next card, and the done mark (`brandMask` and `brandWhy` in `reference/states.json`).
Test A checks those elements against the mockup.

### For both tests
- **Test learner only** (the seeded account, #190), never a real buyer. The tests tick real boxes and mark the step
  done. Reset it before each run: step 1 done, step 5 waiting, nothing checked on step 2, no video progress.
- **Review-only fixtures** (MOCKUP bar, "Text styles (review)" link and section) are added to the deployed page
  before comparing (`diff/fixtures.mjs`).
- **The page's arrival rise** takes about 0.8 s; both tests wait 1.2 s after load.

## 8. Decide before shipping

1. **Brand motion vs the video.** Where the brand's motion system and Grok's video disagree, v6 follows the brand:
   no hover lifts or hover shadows, rolling labels, secondary outlines that firm to ink, the mark in Step done, no
   mint flash, and a rise when the page arrives (so a fresh load's first 0.8 s differ from the video). Colours stay
   the video's, including the forest primary's darker hover (the brand's light-theme hover target, Forest, is already
   this button's resting colour).
2. **"Copy transcript" shows while the transcript is closed**, as in the video. The fix is one line,
   `.tbar [hidden]{display:none}`.
3. **Case.** The video uses sentence case for chrome and chapter labels; the Nov 19 decision noted by Grok was Title
   Case for step titles and chapter labels. Either is a data change; Title Case won't match the video.
4. **16 px phone floor** (D-156): the mockup uses 13 to 15 px for some phone text. Changes only test A's phone checks.
5. **Phone rail number-only** is included but off (`<StepPage railPhone="number">`).
6. **New learner copy**: "Play the orientation", "Back to current", "Checks itself at 90%", "Scroll steps left/right",
   the mark-card lines.
7. **Mockup-only content** must not go live: MOCKUP bar, "Text styles (review)" link and section (`ReviewSection.jsx`).
8. **Dark theme** isn't styled. `ai-motion.css` carries dark/light values for `--aim-action-hover` and `--aim-scrim`;
   this page doesn't use either.
9. **The orientation video file** isn't in this package. Drop `w0-02-orientation-narrated-v5.mp4` into `mockup/media/`
   to watch it in the mockup; the LMS plays its own stream.

## 9. Results (my runs, Chrome 153, 19 Nov 2026)

- **Test A**, harness vs mockup: 22 / 22 pass, worst 0.003 % (one speck in the review-only Week Builder dropdown).
  On the LMS-shaped page (`/harness/?lms`, fixtures added by the test): 22 / 22 pass, worst 0.003 %.
- **Test B**, against the video: mockup 24 / 24, harness 24 / 24, LMS-shaped page 24 / 24 (8 states with one
  brand-motion element masked). State by state: `results/VIDEO-PARITY.md`.
- **Rest state vs v5:** pixel-identical apart from the review-only text links. Rolling labels, the async button layers
  and the spring marker don't move a pixel at rest.
- **Reduced motion** (OS setting, or `.aim-reduced` on `<html>`): a page 120 ms after load and Step done 60 ms after
  the click are identical to the settled screens.
- Before/after of the Reference dropdown: `results/reference-dropdown-before-after.png`.
