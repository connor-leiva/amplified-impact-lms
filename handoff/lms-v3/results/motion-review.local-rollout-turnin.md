# Motion review (local-rollout-turnin)

Target: http://127.0.0.1:4300/learn/week/1/step/4, http://127.0.0.1:4300/learn/week/1/step/4. Reference: the mockup. Clock 2026-11-20T21:18:00Z.
Props: every element's transition-property, transition-duration, transition-timing-function, transition-delay, animation-name, animation-duration, animation-timing-function, animation-delay, animation-iteration-count, animation-fill-mode, animation-direction, transform, opacity, at rest, hovered and pressed. Frames: each motion held at 0, 60, 120, 240, 400, 560, 900 ms of the page's own time, 0 different pixels, and the steps-done figure the same at every 10 ms. Reduced (prefers-reduced-motion and .aim-reduced): the region 50 ms and 1.2 s into each motion the same as the reference's.

| Part | View or motion | Width | Result |
|---|---|---|---|
| frames | turnin-in | 1440 | **6 different** |
| reduced | turnin-in | 1440 | **2 different** |
| frames | turnin-in | 390 | **6 different** |
| reduced | turnin-in | 390 | **2 different** |

## frames: turnin-in at 1440

- 60 ms: the target has nothing at .aim-drawer__panel
- 120 ms: the target has nothing at .aim-drawer__panel
- 240 ms: the target has nothing at .aim-drawer__panel
- 400 ms: 13617 px (sizes differ)
- 560 ms: 16785 px (sizes differ)
- 900 ms: 4920 px

## reduced: turnin-in at 1440

- prefers-reduced-motion, 50 ms after the start: one page has nothing there
- .aim-reduced, 50 ms after the start: one page has nothing there

## frames: turnin-in at 390

- 60 ms: the target has nothing at .aim-drawer__panel
- 120 ms: the target has nothing at .aim-drawer__panel
- 240 ms: the target has nothing at .aim-drawer__panel
- 400 ms: 14548 px (sizes differ)
- 560 ms: 16268 px
- 900 ms: 4777 px

## reduced: turnin-in at 390

- prefers-reduced-motion, 50 ms after the start: one page has nothing there
- .aim-reduced, 50 ms after the start: one page has nothing there

