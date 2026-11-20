# Motion map: step page × Amplified Impact Motion v1

Every moving thing on the step page, and the brand token or component that now drives it.
`ai-motion.css` and `ai-motion.tsx` are the brand's files, unchanged; the page loads them first and uses
their tokens (`--aim-*`), keyframes and self-contained classes (`aim-roll`, `aim-mark`, `aim-async`,
`aim-sweep`, `aim-rise`). Colours stay as in the video; only how things move changes.

| Element | Before (v5, Grok's polish) | Now (brand v1) | Brand source |
|---|---|---|---|
| Every colour, border, opacity change | 150 ms ease-out | `--aim-dur-quick` 160 ms, `--aim-ease` | tokens |
| Buttons, chips, step pills, arrows: hover | 1 px lift + bigger shadow | Colour change only; nothing lifts | 01, 02 |
| Primary and secondary button labels | Static | Label rolls on hover and focus (`.aim-roll`) | 01, 02 |
| Secondary buttons: hover | Bone fill, darker border, lift | Outline firms to ink | 02 |
| Press (buttons, chips, pills, arrows, play pill) | scale .97, 150 ms | scale .96 in `--aim-dur-press` 90 ms, springs back on release (`--aim-ease-spring`, 560 ms) | 01 `.aim-press` |
| Checkbox | scale .9 press; check draws 240 ms; item flashes mint | Press squeezes to .84, springs back; check draws 240 ms after 70 ms; title settles 240 ms; no flash | 11 lesson check |
| Progress bar and "N of 4 checked" | Fill 450 ms; number jumps | Fill `--aim-dur-fill` 720 ms on `--aim-ease`; the number counts up with it (`useCountUp`) | 12 |
| Mark step done → Step done | Label blur-swap, check draw, 600 ms energy ring | Async button: label rolls up and out, done layer rises, the dot lands and the ring draws once | 03 `.aim-async` |
| Step 2 pill when marked done | Number blur-swaps to a check | The check draws (lesson tier) | 11, 13 |
| "Check off 3 more…" line, Undo row | Instant | Message arrival, 240 ms (`aim-msg-in`) | 07 |
| On this page: current section | Instant inset stripe | One marker springs to the current link | 10 `.aim-nav__marker` |
| Page arrival | None | Blocks rise 14 px in order, 45 ms apart, on a spring; once per load | foundations `.aim-rise` |
| Know these five words, opened | Instant | Rows rise in order | `.aim-rise` |
| Transcript panel, Reference accordion | Open 240 ms ease-out, close 180 ms ease-in | Open `--aim-dur-move` 380 ms on `--aim-ease`; close `--aim-dur-exit` 200 ms on `--aim-ease-exit` | tokens |
| Chevrons | 200 ms | `--aim-dur-base` 240 ms | tokens |
| Back to current | 4 px fade, 200 ms | Rises 14 px on the spring; leaves in 200 ms on the exit curve | 06 |
| Next card | 2 px lift, shadow; bar 200 ms | Fill lightens; bar grows `--aim-dur-move` 380 ms (an underline); arrow nudges on the spring | tokens |
| Video buffering after play or a chapter jump | Nothing | Hairline sweep along the bottom of the frame, the one loader | foundations `.aim-sweep` |
| Text links (review section only) | Underline thickens | Line draws in from the left, leaves to the right | 02 `.aim-link` |
| Reduced motion | OS setting only | OS setting or `.aim-reduced` on any ancestor; everything lands on its final frame | reduced |

Not used here (no matching element on the step page): logo intro, splash, header loader, drawer, toast, text field,
skeleton, notification bell, AI Employee run, upload.

Kept as the page's colour decisions (from the video): forest primary with its darker forest hover. The brand's
light-theme hover target is Forest, which is already this button's resting colour.
