# Review files for the session reminders in the learner emails' design (D-250)

`session-24h` and `session-1h` as the transport sends them, rendered by the template registry (`renderEmail`), for
Session 1, the Map Your Spend Live Build, Wed, Dec 2, 2026, 12:00 PM MT, 90 minutes, to a learner named Dana.
Every time is Mountain Time first and Central Time after it: "Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT".

- **Subjects.** "Tomorrow: Session 1 · Map Your Spend Live Build · Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM
  CT" and "Starting in 1 hour: Session 1 · Map Your Spend Live Build · Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to
  2:30 PM CT".
- **How.** Playwright, Chromium, device scale factor 2, full page, at 1280 and 390 wide. Geist and Geist Mono loaded
  from Google Fonts, as in an inbox that loads them. The wordmark's hosted URL
  (`https://learn.amplifiedimpact.io/brand/amplified-impact-wordmark-on-dark.png`) was served from
  `apps/web/public/brand/`, the same file.

| File | Email | Width | What it shows |
|---|---|---|---|
| `session-24h-1280.png` | 24 hours before | 1280 | "We Build Together Tomorrow": Connor's note, the session and its time in MT / CT, View the Session, his sign-off |
| `session-24h-390.png` | The same | 390 | The same, on a phone: the time breaks after the slash, each zone's half on its own line |
| `session-1h-1280.png` | 1 hour before | 1280 | "Starting in an Hour": the note, the session and its time, Join Session, "See you there," / "Connor" |
| `session-1h-390.png` | The same | 390 | The same, on a phone |
