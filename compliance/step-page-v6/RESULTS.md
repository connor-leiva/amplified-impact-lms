# v6 step page: acceptance results (local, flag on)

Run on 20 Nov 2026 with Chrome for Testing 153.0.8010.12, device scale 1, against
`http://127.0.0.1:4300/learn/week/0/step/2`:
- the LMS built with `VITE_LEARNER_V2=true VITE_STEP_PAGE_V6=true`, http mode, served by the API on one origin;
- Postgres with `db:curriculum` plus `prepare.ts content`, and media in a local S3-compatible bucket;
- the D-202 test learner signed in with a password (`signin.mjs`) and reset before every shot (`reset-hook.mjs`).

The orientation's mp4 is not in the handoff (HANDOFF §8.9). The bucket holds a stand-in of the same length (468.87 s),
made from the poster frame, so the page learns the same duration ("7 min 49 s", "7:49").

## A. Pixel parity with the mockup (`diff/pixel-diff.mjs`)

**PASS: 22 / 22 under 0.1 %, worst 0.003 %.** These are the same numbers as the handoff's own runs (`results/report.json`).

| State | 1280 | 390 |
|---|---|---|
| default | 0.003 % | 0 % |
| hover-rail | 0.003 % | 0.0002 % |
| hover-next | 0.003 % | 0.0002 % |
| transcript-open | 0.0028 % | 0 % |
| mark-locked | 0.003 % | 0 % |
| step-done | 0.003 % | 0 % |
| know-open | 0 % | 0 % |
| acc-open-hover | 0 % | 0 % |
| hover-play | 0 % | |
| hover-chip | 0 % | |
| hover-arrow | 0 % | |
| hover-secondary | 0 % | |
| hover-mark | 0 % | |
| hover-done | 0 % | |

## B. Parity with the video (`diff/video-parity.mjs`)

**PASS: 24 / 24** (8 with the brand-motion element masked, as `reference/states.json` says). Every state's
edge and tone figures equal the handoff's `results/VIDEO-PARITY.md`, for example:
- `01-top`: 47 / 116
- `11-transcript-open`: 12 / 48
- `22-step-done`: 25 / 98
- `24-top-final`: 45 / 93

## C. Piece review (`diff/piece-review.mjs`)

The run covers 11 pieces (back link, step rail, header, video frame, chapters, transcript bar, transcript panel,
checklist, Reference, footer, sidebar). Each is shot in each of its states (rest, hover, focus-visible, pressed,
scrolled, open, checked, all checked, locked, clicked while locked, done) at 1280, 1100, 900, 720, 640 and 390 px:
274 element shots. Hover states are skipped at 640 px and under.

- **The tool itself:** the handoff's own harness against the mockup gives **274 / 274 at 0 differing pixels**
  (strict 0 too).
- **The LMS against the mockup:** **273 / 274 at 0 differing pixels.** The one exception reproduces on a rerun:

| State | Differing px | What it is |
|---|---|---|
| `1100-video-focus-visible-play` | 2 (strict 485) | The top-left and top-right corner pixels of the play pill's 2px focus ring, anti-aliased darker. The pill's geometry is the same to the thousandth of a pixel in the LMS, the harness and the mockup (`766.875, y.594, 277.125 × 56`). The same state passes at 1280 and 900, and the harness passes it with a real video loaded. Cause not found. |

Under the strict count (threshold 0), the LMS's video frame differs by up to 14 levels in every state (295 to 1,418
pixels), and nowhere else. The harness is strict 0. The only real difference in that box is that the LMS serves the
poster and video through `/api/files/course/…` and attaches the video with HlsEngine. That is the likely source,
not yet proven.
