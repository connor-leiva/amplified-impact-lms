# Review files for the Week 0 Is Open email and the welcome email fixes

Every email here is what the server sent to the allowlisted test address (`accelerator-test@amplifiedimpact.io`, a
local user named Dana Rivera) through the new Console test sends, read back from the test outbox. The server ran
locally with `NODE_ENV=test` (outbox only, nothing left the machine) over a database migrated through 0042, seeded,
and given the course with `db:curriculum:ensure`, so Week 0 is the stored Week 0: due Mon, Nov 30, 2026, 12:00 PM MT,
titled Foundations, eight steps, a six-row baseline table. Session 1 was set to Wed, Dec 2, 2026, 12:00 PM MT, 90
minutes. No switch was flipped: the confirm was opened and cancelled.

- **How.** Playwright, Chromium, device scale factor 2, full page, at 1280 and 390 wide. Geist and Geist Mono from
  Google Fonts. The wordmark's hosted URL was served from `apps/web/public/brand/`, the same file.
- **The GIF.** A browser plays it, so each capture served one frame as a still: frame 0 (what Outlook desktop shows)
  and the last, settled frame, both taken from `apps/web/public/brand/week0-confetti.gif` itself.

| File | What it shows |
|---|---|
| `png/week0-open-frame0-1280.png` | Week 0 Is Open, GIF on frame 0 |
| `png/week0-open-frame0-390.png` | The same on a phone: each time breaks after the slash, never inside Central's range |
| `png/week0-open-settled-1280.png` | Week 0 Is Open, GIF on its settled last frame |
| `png/week0-open-settled-390.png` | The same on a phone |
| `png/cohort-welcome-1280.png` | The #241 welcome, fixed: the white wordmark on the black band, "Finish Week 0 by Mon, Nov 30", six tasks, "Start Week 0 · Foundations", MT / CT on every clock |
| `png/cohort-welcome-390.png` | The same at 390. It is wider than the phone, as it is on main: the § 8.1 React shell's fixed 560px column (measured 592px on main and here) |
| `png/flags-switch-off-1280.png` | Environment Flags: `week0_open_email` Off under the welcome switch, and its test-send card |
| `png/flags-switch-off-390.png` | The same on a phone |
| `png/flags-confirm-1280.png` | The switch's confirm (cancelled) |
| `png/flags-test-sent-1280.png` | A test send's success: the toast shows the subject |
| `png/flags-test-sent-390.png` | The same on a phone |
