# Motion review (local-rollout)

Target: http://127.0.0.1:4300/learn/week/0, http://127.0.0.1:4300/learn/schedule, http://127.0.0.1:4300/learn/community, http://127.0.0.1:4300/learn/community/2. Reference: the mockup. Clock 2026-11-20T21:18:00Z.
Props: every element's transition-property, transition-duration, transition-timing-function, transition-delay, animation-name, animation-duration, animation-timing-function, animation-delay, animation-iteration-count, animation-fill-mode, animation-direction, transform, opacity, at rest, hovered and pressed. Frames: each motion held at 0, 60, 120, 240, 400, 560, 900 ms of the page's own time, 0 different pixels, and the steps-done figure the same at every 10 ms. Reduced (prefers-reduced-motion and .aim-reduced): the region 50 ms and 1.2 s into each motion the same as the reference's.

| Part | View or motion | Width | Result |
|---|---|---|---|
| props | week | 1440 | all the same |
| frames | arrival | 1440 | all 0 |
| frames | filter-operator | 1440 | **7 different** |
| reduced | filter-operator | 1440 | **4 different** |
| frames | accordion-open | 1440 | **7 different** |
| reduced | accordion-open | 1440 | **4 different**; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | accordion-close | 1440 | **7 different** |
| reduced | accordion-close | 1440 | **4 different**; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | rail-collapse | 1440 | all 0 |
| reduced | rail-collapse | 1440 | the same as the mockup |
| frames | rail-expand | 1440 | all 0 |
| reduced | rail-expand | 1440 | the same as the mockup |
| frames | calendar-open | 1440 | **7 different** |
| reduced | calendar-open | 1440 | **4 different** |
| frames | calendar-close | 1440 | **7 different** |
| reduced | calendar-close | 1440 | **4 different** |
| frames | form-in | 1440 | **4 different** |
| reduced | form-in | 1440 | **4 different** |
| frames | form-out | 1440 | **3 different** |
| reduced | form-out | 1440 | the same as the mockup |
| props | schedule | 1440 | all the same |
| frames | schedule-calendar-open | 1440 | **7 different** |
| reduced | schedule-calendar-open | 1440 | **4 different** |
| props | community | 1440 | all the same |
| frames | compose-in | 1440 | **1 different** |
| reduced | compose-in | 1440 | the same as the mockup |
| props | thread | 1440 | all the same |
| frames | reply-focus | 1440 | all 0 |
| reduced | reply-focus | 1440 | the same as the mockup |
| props | week | 390 | all the same |
| frames | arrival | 390 | all 0 |
| frames | filter-operator | 390 | all 0 |
| reduced | filter-operator | 390 | the same as the mockup |
| frames | accordion-open | 390 | **3 different** |
| reduced | accordion-open | 390 | **2 different**; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | accordion-close | 390 | **5 different** |
| reduced | accordion-close | 390 | **2 different**; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | calendar-open | 390 | **7 different** |
| reduced | calendar-open | 390 | **4 different** |
| frames | calendar-close | 390 | **7 different** |
| reduced | calendar-close | 390 | **4 different** |
| frames | nav-menu-open | 390 | **7 different** |
| reduced | nav-menu-open | 390 | **4 different** |
| frames | form-in | 390 | **4 different** |
| reduced | form-in | 390 | **4 different** |
| frames | form-out | 390 | **3 different** |
| reduced | form-out | 390 | the same as the mockup |
| props | schedule | 390 | all the same |
| frames | schedule-calendar-open | 390 | **7 different** |
| reduced | schedule-calendar-open | 390 | **4 different** |
| props | community | 390 | all the same |
| frames | compose-in | 390 | **1 different** |
| reduced | compose-in | 390 | the same as the mockup |
| props | thread | 390 | all the same |
| frames | reply-focus | 390 | all 0 |
| reduced | reply-focus | 390 | the same as the mockup |

## frames: filter-operator at 1440

- 0 ms: 2439 px
- 60 ms: 3220 px
- 120 ms: 3347 px
- 240 ms: 3071 px
- 400 ms: 3070 px
- 560 ms: 3079 px
- 900 ms: 3079 px

## reduced: filter-operator at 1440

- prefers-reduced-motion, 50 ms after the start: 3079 px
- prefers-reduced-motion, 1.2 s after the start: 3079 px
- .aim-reduced, 50 ms after the start: 3079 px
- .aim-reduced, 1.2 s after the start: 3079 px

## frames: accordion-open at 1440

- 0 ms: 473 px
- 60 ms: 473 px
- 120 ms: 473 px
- 240 ms: 473 px
- 400 ms: 473 px
- 560 ms: 473 px
- 900 ms: 473 px

## reduced: accordion-open at 1440

- prefers-reduced-motion, 50 ms after the start: 473 px
- prefers-reduced-motion, 1.2 s after the start: 473 px
- .aim-reduced, 50 ms after the start: 473 px
- .aim-reduced, 1.2 s after the start: 473 px

## frames: accordion-close at 1440

- 0 ms: 473 px
- 60 ms: 473 px
- 120 ms: 473 px
- 240 ms: 473 px
- 400 ms: 473 px
- 560 ms: 473 px
- 900 ms: 473 px

## reduced: accordion-close at 1440

- prefers-reduced-motion, 50 ms after the start: 473 px
- prefers-reduced-motion, 1.2 s after the start: 473 px
- .aim-reduced, 50 ms after the start: 473 px
- .aim-reduced, 1.2 s after the start: 473 px

## frames: calendar-open at 1440

- 0 ms: 6313 px
- 60 ms: 7467 px
- 120 ms: 7913 px
- 240 ms: 8401 px
- 400 ms: 8415 px
- 560 ms: 8454 px
- 900 ms: 8454 px

## reduced: calendar-open at 1440

- prefers-reduced-motion, 50 ms after the start: 8454 px
- prefers-reduced-motion, 1.2 s after the start: 8454 px
- .aim-reduced, 50 ms after the start: 8454 px
- .aim-reduced, 1.2 s after the start: 8454 px

## frames: calendar-close at 1440

- 0 ms: 9255 px
- 60 ms: 9255 px
- 120 ms: 8663 px
- 240 ms: 7268 px
- 400 ms: 7309 px
- 560 ms: 7268 px
- 900 ms: 7268 px

## reduced: calendar-close at 1440

- prefers-reduced-motion, 50 ms after the start: 7268 px
- prefers-reduced-motion, 1.2 s after the start: 7268 px
- .aim-reduced, 50 ms after the start: 7268 px
- .aim-reduced, 1.2 s after the start: 7268 px

## frames: form-in at 1440

- 240 ms: 2382 px
- 400 ms: 26784 px
- 560 ms: 28288 px
- 900 ms: 28239 px

## reduced: form-in at 1440

- prefers-reduced-motion, 50 ms after the start: 28239 px
- prefers-reduced-motion, 1.2 s after the start: 28239 px
- .aim-reduced, 50 ms after the start: 28239 px
- .aim-reduced, 1.2 s after the start: 28239 px

## frames: form-out at 1440

- 0 ms: 28239 px
- 60 ms: 26509 px
- 120 ms: 18740 px

## frames: schedule-calendar-open at 1440

- 0 ms: 767 px
- 60 ms: 767 px
- 120 ms: 767 px
- 240 ms: 767 px
- 400 ms: 767 px
- 560 ms: 767 px
- 900 ms: 767 px

## reduced: schedule-calendar-open at 1440

- prefers-reduced-motion, 50 ms after the start: 767 px
- prefers-reduced-motion, 1.2 s after the start: 767 px
- .aim-reduced, 50 ms after the start: 767 px
- .aim-reduced, 1.2 s after the start: 767 px

## frames: compose-in at 1440

- 400 ms: 8 px

## frames: accordion-open at 390

- 0 ms: 487 px
- 60 ms: 475 px
- 120 ms: 1339 px

## reduced: accordion-open at 390

- prefers-reduced-motion, 50 ms after the start: 818 px
- .aim-reduced, 50 ms after the start: 818 px

## frames: accordion-close at 390

- 120 ms: 473 px
- 240 ms: 487 px
- 400 ms: 487 px
- 560 ms: 487 px
- 900 ms: 487 px

## reduced: accordion-close at 390

- prefers-reduced-motion, 1.2 s after the start: 487 px
- .aim-reduced, 1.2 s after the start: 487 px

## frames: calendar-open at 390

- 0 ms: 1467 px
- 60 ms: 1467 px
- 120 ms: 1467 px
- 240 ms: 1467 px
- 400 ms: 1467 px
- 560 ms: 1467 px
- 900 ms: 1467 px

## reduced: calendar-open at 390

- prefers-reduced-motion, 50 ms after the start: 1467 px
- prefers-reduced-motion, 1.2 s after the start: 1467 px
- .aim-reduced, 50 ms after the start: 1467 px
- .aim-reduced, 1.2 s after the start: 1467 px

## frames: calendar-close at 390

- 0 ms: 1467 px
- 60 ms: 1467 px
- 120 ms: 1467 px
- 240 ms: 1467 px
- 400 ms: 1467 px
- 560 ms: 1467 px
- 900 ms: 1467 px

## reduced: calendar-close at 390

- prefers-reduced-motion, 50 ms after the start: 1467 px
- prefers-reduced-motion, 1.2 s after the start: 1467 px
- .aim-reduced, 50 ms after the start: 1467 px
- .aim-reduced, 1.2 s after the start: 1467 px

## frames: nav-menu-open at 390

- 0 ms: 347 px
- 60 ms: 347 px
- 120 ms: 347 px
- 240 ms: 347 px
- 400 ms: 347 px
- 560 ms: 347 px
- 900 ms: 347 px

## reduced: nav-menu-open at 390

- prefers-reduced-motion, 50 ms after the start: 347 px
- prefers-reduced-motion, 1.2 s after the start: 347 px
- .aim-reduced, 50 ms after the start: 347 px
- .aim-reduced, 1.2 s after the start: 347 px

## frames: form-in at 390

- 240 ms: 6130 px
- 400 ms: 25647 px
- 560 ms: 26511 px
- 900 ms: 26496 px

## reduced: form-in at 390

- prefers-reduced-motion, 50 ms after the start: 26496 px
- prefers-reduced-motion, 1.2 s after the start: 26496 px
- .aim-reduced, 50 ms after the start: 26496 px
- .aim-reduced, 1.2 s after the start: 26496 px

## frames: form-out at 390

- 0 ms: 26496 px
- 60 ms: 24990 px
- 120 ms: 16044 px

## frames: schedule-calendar-open at 390

- 0 ms: 763 px
- 60 ms: 763 px
- 120 ms: 763 px
- 240 ms: 763 px
- 400 ms: 763 px
- 560 ms: 763 px
- 900 ms: 763 px

## reduced: schedule-calendar-open at 390

- prefers-reduced-motion, 50 ms after the start: 763 px
- prefers-reduced-motion, 1.2 s after the start: 763 px
- .aim-reduced, 50 ms after the start: 763 px
- .aim-reduced, 1.2 s after the start: 763 px

## frames: compose-in at 390

- 120 ms: 1 px

