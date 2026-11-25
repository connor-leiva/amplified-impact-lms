# Review files for D-253 (Week 0: the intake's intro in its lines, the learner frame, the Stack Card)

Playwright, Chromium, device scale 2, at 1280 and 390 wide.

## Learner screens

From `compliance/tests/e2e/learn-v2-week0-intake-stack.spec.ts` on the flag-on fixture build (`pnpm e2e:learn`), signed
in as the owner persona (Alex Morgan, Team Owner) at 10:30 AM MT on Wed, Nov 25, 2026:

```bash
WEEK0_REVIEW_DIR=$PWD/docs/pr-review/week0-intake-stack node scripts/with-env.mjs LEARNER_V2=1 npx playwright test -c compliance/playwright.config.ts --project=e2e-learn learn-v2-week0-intake-stack --trace off
```

**Fixture content, not the live week.** The course is the deployed seed (with D-243's AI Implementer step) and the
seeded intake and stack card. Two things are set by the spec:

- The intake intro is written for the spec, in the new format: two paragraphs (the first with a line break), then
  "Three words you'll see a lot:" and a three-item list with each word in bold. Its words come from the seed's intro,
  D-243's line and the seeded glossary. The live intro is whatever staff typed in the Week Builder.
- Step 1's items are set for the spec, as Connor sets them in the builder after the deploy: "Fill in your intake"
  (Form > Intake) and "Send back your stack card" (Form > Stack card).

The reads are answered as the API would. The Stack Card's rows are what the intake prefills (`prefillStack`), and Send
Back answers with `sentAt` at the spec's clock. "v3" is the LMS v3 frame, which draws for a test learner (`v3On`).

| File | What | Width |
|---|---|---|
| `intake-page-1280.png` | `/learn/week/0/intake` in the learner frame: two paragraphs, a bulleted list with bold words, the form in a 760px column | 1280 |
| `intake-page-390.png` | The same on a phone: one 16px gutter, no double padding | 390 |
| `intake-drawer-v3-1280.png` | v3's form drawer (`/learn/week/0?form=intake`) with the same intro, drawn the same way | 1280 |
| `intake-drawer-v3-390.png` | The same drawer on a phone | 390 |
| `step1-stack-button-1280.png` | Week 0 step 1: "Send back your stack card" with the Form > Stack card button, "Open Your Stack Card" (it opens the Stack Card page) | 1280 |
| `step1-stack-button-390.png` | The same step on a phone, the whole page | 390 |
| `stack-before-1280.png` | `/learn/week/0/stack`: "Stack Card" in the learner frame, before Send Back, the whole page | 1280 |
| `stack-before-390.png` | The same on a phone | 390 |
| `stack-after-1280.png` | After Send Back: the button says "Sent Back" and the page "Sent back Wed, Nov 25, 10:30 AM MT / 11:30 AM CT" | 1280 |
| `stack-after-390.png` | The same on a phone | 390 |

## Console

Console > Workspaces > a team > View stack card, against the real API (`NODE_ENV=test`, `FIXED_NOW` 10:31 AM MT on
Wed, Nov 25, 2026) on a local development database migrated and loaded with `seedForDatabase('live')`. Staff were
signed in as the seed's Owner (Casey Lin) through `/api/test/session`, and two cards were written straight to
`team_stack_card` for the capture: Northline Realty Team's, sent back at 10:30 AM MT, and Harbor & Pine Group's, not
sent. The capture script was a one-off and isn't committed.

| File | What | Width |
|---|---|---|
| `console-stack-sent-1280.png` | Each row with its who, then "Sent back Wed, Nov 25, 10:30 AM MT / 11:30 AM CT" | 1280 |
| `console-stack-sent-390.png` | The same on a phone: the text wraps inside the card | 390 |
| `console-stack-not-sent-1280.png` | A card saved but not sent: "Not sent back yet" | 1280 |
| `console-stack-not-sent-390.png` | The same on a phone | 390 |

The Intake card's title overlapping "View intake" at 390 is the same on `main`; this change doesn't touch it.
