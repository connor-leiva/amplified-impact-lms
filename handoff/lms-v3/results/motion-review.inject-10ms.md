# Motion review (inject-10ms)

Target: the local harness. Reference: the mockup. Clock 2026-11-20T21:18:00Z. Injected on the target: `:root{--aim-dur-quick:170ms}`.
Props: every element's transition-property, transition-duration, transition-timing-function, transition-delay, animation-name, animation-duration, animation-timing-function, animation-delay, animation-iteration-count, animation-fill-mode, animation-direction, transform, opacity, at rest, hovered and pressed. Frames: each motion held at 0, 60, 120, 240, 400, 560, 900 ms of the page's own time, 0 different pixels, and the steps-done figure the same at every 10 ms. Reduced (prefers-reduced-motion and .aim-reduced): the region 50 ms and 1.2 s into each motion the same as the reference's.

| Part | View or motion | Width | Result |
|---|---|---|---|
| props | week | 1440 | **173 different** |
| frames | arrival | 1440 | all 0 |
| frames | filter-operator | 1440 | all 0 |
| reduced | filter-operator | 1440 | the same as the mockup |
| frames | accordion-open | 1440 | all 0 |
| reduced | accordion-open | 1440 | the same as the mockup; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | accordion-close | 1440 | all 0 |
| reduced | accordion-close | 1440 | the same as the mockup; still moving at 50 ms (as the mockup): prefers-reduced-motion on the target, prefers-reduced-motion on the reference, .aim-reduced on the target, .aim-reduced on the reference |
| frames | rail-collapse | 1440 | **1 different** |
| reduced | rail-collapse | 1440 | the same as the mockup |
| frames | rail-expand | 1440 | all 0 |
| reduced | rail-expand | 1440 | the same as the mockup |
| frames | calendar-open | 1440 | all 0 |
| reduced | calendar-open | 1440 | the same as the mockup |
| frames | calendar-close | 1440 | all 0 |
| reduced | calendar-close | 1440 | the same as the mockup |
| frames | form-in | 1440 | all 0 |
| reduced | form-in | 1440 | the same as the mockup |
| frames | form-out | 1440 | all 0 |
| reduced | form-out | 1440 | the same as the mockup |

## props: week at 1440

- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: button#sh-group.sh-link.sh-group transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: a.sh-link.sh-week transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span.sh-wn transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: span#sh-marker.sh-marker.live transition-duration: target "0.56s, 0.56s, 0.17s", reference "0.56s, 0.56s, 0.16s"
- rest: a.sh-link transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: button#sh-collapse.sh-link.sh-collapse transition-duration: target "0.17s, 0.17s", reference "0.16s, 0.16s"
- rest: button.wk-btn.wk-btn-ghost transition-duration: target "0.56s, 0.17s, 0.17s, 0.17s", reference "0.56s, 0.16s, 0.16s, 0.16s"
- rest: button.wk-btn.wk-btn-ghost transition-duration: target "0.56s, 0.17s, 0.17s, 0.17s", reference "0.56s, 0.16s, 0.16s, 0.16s"
- rest: a transition-duration: target "0.17s", reference "0.16s"
- rest: a#wk-go.wk-btn.wk-btn-accent transition-duration: target "0.56s, 0.17s, 0.17s, 0.17s", reference "0.56s, 0.16s, 0.16s, 0.16s"
- rest: button.wk-seg-b transition-duration: target "0.17s", reference "0.16s"
- rest: button.wk-seg-b transition-duration: target "0.17s", reference "0.16s"
- rest: button.wk-seg-b transition-duration: target "0.17s", reference "0.16s"
- rest: a.wk-step transition-duration: target "0.17s", reference "0.16s"
- rest: a.wk-step transition-duration: target "0.17s", reference "0.16s"
- rest: a.wk-step transition-duration: target "0.17s", reference "0.16s"
- rest: a.wk-step transition-duration: target "0.17s", reference "0.16s"
- rest: a.wk-step transition-duration: target "0.17s", reference "0.16s"
- … and 133 more

## frames: rail-collapse at 1440

- 240 ms: 1496 px

