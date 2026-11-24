# Review files for the cohort welcome's copy and layout fixes

The cohort welcome as the server sent it to the allowlisted test address (`accelerator-test@amplifiedimpact.io`, a
local user named Dana Rivera) through the Console's welcome test send, read back from the test outbox. The server ran
locally with `NODE_ENV=test` (outbox only, nothing left the machine) over a database migrated through 0042, seeded,
and given the course with `db:curriculum:ensure`; Session 1 was set to Wed, Dec 2, 2026, 12:00 PM MT, 90 minutes. No
switch was flipped.

- **How.** Playwright, Chromium, device scale factor 2, full page, at 1280 and 390 wide. The wordmark's hosted URL was
  served from `apps/web/public/brand/`, the same file.
- **Measured.** At 390 the page is 390px wide and the card 358px (the page's 16px gutters each side); before this
  change it was 592px (`docs/pr-review/week0-open/png/cohort-welcome-390.png` on main). At 1280 the card is 600px.

| File | What it shows |
|---|---|
| `png/cohort-welcome-1280.png` | Subject "Your Access to the December 2026 Cohort Is Live", heading "Welcome! Week 0 Starts Now", "December 2026 Cohort Starts …", footer "…enrolled in the December 2026 Cohort.", times MT / CT |
| `png/cohort-welcome-390.png` | The same on a phone: the card fits the screen, nothing scrolls sideways |
