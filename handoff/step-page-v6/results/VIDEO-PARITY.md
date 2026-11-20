# Video parity results (v6)

`node diff/video-parity.mjs` replays each steady moment of `reference/interaction-demo.mp4` and compares the screen with the video frame.
Numbers are the worst region in px for **edge / tone** (limits 120 / 150, `diff/compare.mjs`). Run on 19 Nov 2026, Chrome 153, 1280×800.
`*` = the element whose look Amplified Impact Motion v1 changes on purpose is masked (reason in the last column); test A checks it against the mockup.

| State | Video frames | What's on screen | v6 mockup | v6 harness (React) | LMS-shaped harness (`?lms`) | Masked for brand motion |
|---|---|---|---|---|---|---|
| `01-top` | 1–19 (0.04–0.76 s) | Top of the page on load. Labeled step pills, step 1 done, step 2 current, step 5 waiting. | pass (47 / 116) | pass (47 / 116) | pass (47 / 116) |  |
| `02-top-hover-step-4`* | 43–51 (1.72–2.04 s) | Pointer on step 4: bone fill, darker border, 1 px lift, white number circle. | pass (47 / 117) | pass (47 / 117) | pass (47 / 117) | brand v1: hover no longer lifts the pill or adds a shadow |
| `03-watch-hover-play`* | 70–89 (2.80–3.56 s) | Scrolled to the player. Pointer on the poster: the play pill lifts and darkens. | pass (31 / 74) | pass (31 / 74) | pass (31 / 74) | brand v1: the play pill no longer lifts, grows or deepens its shadow; its label rolls |
| `04-chapter-hover-0-15`* | 98–105 (3.92–4.20 s) | Pointer on the 0:15 chapter chip. | pass (31 / 77) | pass (31 / 77) | pass (31 / 77) | brand v1: hover no longer lifts the chip or adds a shadow |
| `05-chapter-hover-next` | 132–133 (5.28–5.32 s) | Pointer on the chapters' right arrow. | pass (31 / 76) | pass (31 / 76) | pass (31 / 76) |  |
| `06-chapters-page-2` | 146–155 (5.84–6.20 s) | After one click on the right arrow (snapped, left arrow and fade appear). | pass (31 / 76) | pass (31 / 76) | pass (31 / 76) |  |
| `07-chapters-page-3` | 169–178 (6.76–7.12 s) | After a second click on the right arrow. | pass (31 / 76) | pass (31 / 76) | pass (31 / 76) |  |
| `08-chapters-page-3-rest` | 187–192 (7.48–7.68 s) | Same, pointer off the row. | pass (31 / 76) | pass (31 / 76) | pass (31 / 76) |  |
| `09-chapter-3-31-playing` | 211–254 (8.44–10.16 s) | Clicked the 3:31 chapter: chip turns forest (pointer still on it), row centers it, the video plays. | pass (31 / 75) | pass (31 / 75) | pass (31 / 75) |  |
| `10-hover-show-transcript` | 262–265 (10.48–10.60 s) | Pointer on Show transcript (ghost button tint). | pass (31 / 75) | pass (31 / 75) | pass (31 / 75) |  |
| `11-transcript-open` | 274–280 (10.96–11.20 s) | Transcript open: 296 px panel, the 3:14 row current, the spoken phrase highlighted. | pass (12 / 48) | pass (12 / 48) | pass (12 / 48) |  |
| `12-transcript-scrolled` | 289–299 (11.56–11.96 s) | Page scrolled down to the transcript; the pointer now rests on a transcript row. | pass (30 / 85) | pass (30 / 85) | pass (30 / 85) |  |
| `13-checklist` | 365–394 (14.60–15.76 s) | Scrolled to Your checklist (On this page follows). | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) |  |
| `14-hover-open-words`* | 400–409 (16.00–16.36 s) | Pointer on Open the five words. | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) | brand 02: the outline firms to ink (no bone fill, no lift); the label rolls |
| `15-checked-words` | 439–453 (17.56–18.12 s) | Checked Know these five words (the box keeps its hover halo). | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) |  |
| `16-checked-live-build` | 471–480 (18.84–19.20 s) | Checked Save the first live build. | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) |  |
| `17-hover-ask-us`* | 484–492 (19.36–19.68 s) | Pointer on Ask us (arrow nudges). | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) | brand 02: the outline firms to ink (no bone fill, no lift); the label rolls |
| `18-checked-questions` | 517–528 (20.68–21.12 s) | Checked Write down your questions. | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) |  |
| `19-checked-all` | 545–546 (21.80–21.84 s) | Checked Watch the video: 4 of 4. | pass (32 / 99) | pass (32 / 99) | pass (32 / 99) |  |
| `20-footer-ready` | 561–588 (22.44–23.52 s) | Scrolled to the footer: Mark step done is ready; the pointer rests on the last box. | pass (25 / 95) | pass (25 / 95) | pass (25 / 95) |  |
| `21-hover-mark`* | 595–600 (23.80–24.00 s) | Pointer on Mark step done. | pass (25 / 97) | pass (25 / 97) | pass (25 / 97) | brand 01: no lift or bigger shadow; the label rolls |
| `22-step-done`* | 611–634 (24.44–25.36 s) | Marked done: label swaps to Step done, energy ring, Undo, Next card cue. | pass (25 / 98) | pass (25 / 98) | pass (25 / 98) | brand 03: Step done shows the mark (dot in ring) instead of a check |
| `23-hover-next-card`* | 651–669 (26.04–26.76 s) | Pointer on the Next card: lifts, bar grows, arrow nudges. | pass (25 / 98) | pass (25 / 98) | pass (25 / 98) | brand v1: the Next card no longer lifts; Step done shows the mark |
| `24-top-final` | 694–723 (27.76–28.92 s) | Back at the top: 4 of 4 checked, step 2 shows its check. | pass (45 / 93) | pass (45 / 93) | pass (45 / 93) |  |

**Totals:** v6 mockup 24/24, v6 harness 24/24, LMS-shaped harness 24/24 (8 of them with a brand-motion element masked).

Unmasked, the 8 starred states fail only at the masked element, which is how the brand motion differs from Grok's video: no hover lifts or hover shadows, a secondary outline that firms to ink, and the done mark.
