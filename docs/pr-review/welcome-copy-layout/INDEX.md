# Review files for the cohort welcome in the Week 0 Is Open email's design

The cohort welcome as the server sent it to the allowlisted test address (`accelerator-test@amplifiedimpact.io`, a
local user named Dana Rivera with no password yet, so the set-password line shows) through the Console's welcome test
send, read back from the test outbox. The server ran locally with `NODE_ENV=test` (outbox only, nothing left the
machine) over a database migrated through 0042, seeded, and given the course with `db:curriculum:ensure`: Week 0 is
the stored Week 0 (due Mon, Nov 30, 2026, 12:00 PM MT, titled Foundations, eight steps, a six-row baseline table).
Session 1 was set to Wed, Dec 2, 2026, 12:00 PM MT, 90 minutes, and a "How the LMS Works" tour was flagged in Week 0's
Media, as it will be once Connor uploads the video (D-252); without it, the list has no tour row. No switch was flipped.

- **How.** Playwright, Chromium, device scale factor 2, full page, at 1280 and 390 wide. Geist and Geist Mono from
  Google Fonts. The wordmark's hosted URL was served from `apps/web/public/brand/`, the same file.
- **The GIF.** A browser plays it, so each capture served one frame as a still: frame 0 (what Outlook desktop shows)
  and the last, settled frame, both taken from `apps/web/public/brand/week0-confetti.gif` itself.
- **Measured.** At 390 the page is 390px wide and the panel goes edge to edge, as the Week 0 email's does; at 1280
  the panel is 600px.

| File | What it shows |
|---|---|
| `png/cohort-welcome-frame0-1280.png` | The welcome, GIF on frame 0 |
| `png/cohort-welcome-frame0-390.png` | The same on a phone: each time breaks after the slash, never inside Central's range |
| `png/cohort-welcome-settled-1280.png` | The welcome, GIF on its settled last frame |
| `png/cohort-welcome-settled-390.png` | The same on a phone |
