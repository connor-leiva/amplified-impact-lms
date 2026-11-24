# Review files: Week 1 opens Sun, Nov 29 (D-248, the Week 0 launch audit's H-3)

Each screen before (main at `1d23037`) and after this branch, at 1280 and 390 wide.

- **Build.** The production flags: `VITE_DATA_SOURCE=http`, `VITE_LEARNER_V2=true`, `VITE_LMS_V3` and `VITE_STEP_PAGE_V6` unset. It was built with `vite build --mode parity` (which only skips the learner-v2 CI guard) and served by the API on one origin.
- **Database.** A fresh local database each time: `db:migrate`, then `db:curriculum` (the seed and its one-time data steps, as a new deploy runs them). Then the cohort's Preview opens set to Wed, Nov 25, 2026, 12:00 PM MT, which the audit's B-1 asks the owner to set in production.
- **Account.** The regular buyer this branch's `db:smoke-buyer` creates: paid in full, active, not a test account, no early access. It is signed in through `/api/auth/login`.
- **How they were taken.** Chromium, deviceScaleFactor 2, time zone America/Denver, reduced motion. The API ran under `FIXED_NOW` and the page clock was fixed to the same instant.
- **Clocks.**
  - Thu, Nov 26, 2026, 2:00 PM MT: the preview is open, and Week 1 has not opened.
  - `nov29-*`: Sun, Nov 29, 12:05 PM MT.
  - `unchanged-*`: Tue, Nov 24, 8:00 PM MT.

| File | Screen | Width | What it shows |
|---|---|---|---|
| `before-home-1280.png`, `after-home-1280.png` | Home, top through the first row of cards | 1280 | The Week 1 card and the sidebar go from "Opens Dec 2" to "Opens Nov 29". The countdown stays on the Dec 2 Live Build ("Goes live in 5 days 22 hrs 0 min, Wed, Dec 2 · 12:00 PM MT (1:00 PM CT)"), and so does the top bar's Next live build. |
| `before-home-390.png`, `after-home-390.png` | The same page | 390 | The same, on a phone: the countdown is unchanged, and the Week 1 card reads "Opens Nov 29". |
| `nov29-home-1280.png`, `nov29-home-390.png` | Home after Week 1 opens | 1280, 390 | Sun, Nov 29, 12:05 PM MT. Week 1 is open ("Not started", no lock). The countdown still counts to the Dec 2 Live Build (2 days 23 hrs 55 min). There is no Join button, and the Resource vault stays locked. |
| `before-start-here-1280.png`, `after-start-here-1280.png` | Week 0 page, the Start Here card | 1280 | The line now names Week 1's opening, Sun, Nov 29, 2026, 12:00 PM MT. It used to name the first live build, Wed, Dec 2. The due date is unchanged. |
| `before-start-here-390.png`, `after-start-here-390.png` | The same card | 390 | The same. |
| `before-intake-1280.png`, `after-intake-1280.png` | Week 0 Intake, the heading and intro | 1280 | The intro's last date changes from "before the live builds start on Wednesday, December 2" to "before Week 1 opens on Sunday, November 29". |
| `before-intake-390.png`, `after-intake-390.png` | The same | 390 | The same. |
| `before-week1-1280.png`, `after-week1-1280.png` | Week 1's page while locked | 1280 | "Opens Wed, Dec 2 · 12:00 PM MT · Week 1" becomes "Opens Sun, Nov 29 · 12:00 PM MT · Week 1". The date comes from the week's Opens. |
| `before-week1-390.png`, `after-week1-390.png` | The same | 390 | The same. |
| `unchanged-prelaunch-1280.png`, `unchanged-prelaunch-390.png` | Skill Library, the pre-launch welcome (where a buyer lands before the preview opens) | 1280, 390 | **Not changed by this PR.** It shows what a regular buyer reads tonight, before Preview opens: "Live sessions start Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT). Your course and your skills open then." See the PR's "Left as it is". This branch's build renders it byte for byte as main does. |

The owner's manual step, on the same local build:

| File | Screen | Width | What it shows |
|---|---|---|---|
| `admin-week1-opens-1280.png` | Admin › Build › Curriculum › Week 1 · Where the Money Goes (Module Builder) › Edit details | 1280 | The field the owner changes in production: **Opens (MT)** set to 11/29/2026, with **Time** 12:00 PM. It is taken as a local Owner, after Week 1 was put back to Dec 2 to match production. After Done and Save changes, the Settings card reads "Opens: Sun, Nov 29 · 12:00 PM MT". |

Week 1's date moves in a new database only. The release plan is a one-time data step, so production keeps Dec 2 until the owner changes it in the Module Builder (the PR's "What you must do by hand").
