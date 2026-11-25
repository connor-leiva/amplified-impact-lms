# Review files for D-252 ("How the LMS Works": the sign-in tour modal and Week 0's pinned card)

Playwright captures from `compliance/tests/e2e/learn-v2-tour.spec.ts` on the flag-on fixture build (`pnpm e2e:learn`),
signed in as the agent persona at 12:05 PM MT on Wed, Dec 9, 2026, at device scale 2:

```bash
TOUR_REVIEW_DIR=$PWD/docs/pr-review/lms-tour node scripts/with-env.mjs LEARNER_V2=1 npx playwright test -c compliance/playwright.config.ts --project=e2e-learn learn-v2-tour --trace off
```

**A fixture block, not the production video.** The player plays the suite's own two-second test mp4
(`compliance/tests/e2e/assets/two-seconds-vp9.mp4`, the one `learn-v2-video.spec.ts` plays), with a two-cue vtt and a
placeholder poster the spec renders, so the length reads 0:02. The real tour (6:29) is uploaded in the Week Builder
after the deploy; nothing of it is in the repository.

"v3" is the LMS v3 frame, which draws for a test learner (`v3On`) whatever the build flag says; the others are
today's learner frame.

| File | What | Width |
|---|---|---|
| `modal-1280.png` | The modal on sign-in, captions showing, the chapters, Watch Later and I've Seen It | 1280 |
| `modal-390.png` | The same on a phone: the whole screen, video 16:9, buttons stacked at the foot | 390 |
| `modal-v3-1280.png` | The modal over the v3 frame | 1280 |
| `modal-v3-390.png` | The modal over the v3 frame, on a phone | 390 |
| `week0-card-1280.png` | Week 0's pinned card, above Start Here on today's week page | 1280 |
| `week0-card-390.png` | The same on a phone | 390 |
| `week0-card-v3-1280.png` | Week 0's pinned card above the Hero on v3's week page | 1280 |
| `week0-card-v3-390.png` | The same on a phone | 390 |
