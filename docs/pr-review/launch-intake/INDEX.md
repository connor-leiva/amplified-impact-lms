# Review files for the launch audit's PR C (D-247): intake, sessions, reminders, v3

H-10, H-11 and H-15 at 1280 and 390, Chromium at device scale 2, reduced motion, Mountain Time.

- **Build:** the web app built as production builds it (`VITE_DATA_SOURCE=http`, `VITE_LEARNER_V2=true`, `VITE_LMS_V3` unset, so v3 is off; the v6 step page on), served by the API on its own origin.
- **Data:** a local database with the curriculum and its data steps (`db:curriculum`), and one regular learner (not the test account), the Team Owner Alex Morgan, on an AI Accelerator plan, at Thu Dec 3, 10:00 AM MT (`FIXED_NOW`), so Weeks 0 and 1 are open. Week 1 step 6's "Fill in the Finance Analyst's seat card" was given its Form > Seat card button through the Week Builder's own save, as production's needs (the data step leaves it off; see the PR).
- **How each state was made:** the failed load answers `GET /api/intake` with a 500 in the browser; the clash is real: after the page loaded, a second session saved the same question, then the page typed into it; the missing answers are a real Submit on an empty form.

| File | Screen | Width | What it shows |
|---|---|---|---|
| `intake-required-1280.png` | `/learn/week/0/intake` | 1280 | The first section: the two required questions with no marker, every other question "Optional" (the v3 drawer's marker, D-229) |
| `intake-required-390.png` | The same | 390 | The same at phone width |
| `intake-missing-1280.png` | The same, after Submit | 1280 | "Some required answers are missing." with a link to each of the six, each missing field marked (ink border, "Add an answer." with a dot), focus on the first |
| `intake-missing-390.png` | The same | 390 | The same at phone width |
| `intake-load-failed-1280.png` | The same, the load failed | 1280 | "Could not load the intake." with Retry; every field and Submit disabled, nothing to type into |
| `intake-load-failed-390.png` | The same | 390 | The same at phone width |
| `intake-conflict-1280.png` | The same, a teammate's clash (409) | 1280 | The server's words in view, what was typed still in the field (read-only, to copy) |
| `intake-conflict-390.png` | The same | 390 | The same at phone width |
| `turnin-step-1280.png` | `/learn/week/1/step/4`, v3 off | 1280 | "Submit your report by Tuesday night" with its Turn in button |
| `turnin-step-390.png` | The same | 390 | The same at phone width |
| `turnin-drawer-1280.png` | The same, Turn in clicked | 1280 | The Turn in drawer open on the step page |
| `turnin-drawer-390.png` | The same | 390 | The same at phone width |
| `seatcard-step-1280.png` | `/learn/week/1/step/6`, v3 off | 1280 | "Fill in the seat card" (the Form button) and "Turn in your checkpoint" (Turn in) |
| `seatcard-step-390.png` | The same | 390 | The same at phone width |
| `seatcard-drawer-1280.png` | The same, the seat card opened | 1280 | The owner's seat card drawer: the card's rows, Sign the seat card, Download PDF |
| `seatcard-drawer-390.png` | The same | 390 | The same at phone width |

**axe (wcag2a, wcag2aa)** on each state above, at both widths: no serious or critical violation on the intake page in any state, or on the step pages. With a drawer open, the one serious finding is M-26's, which this PR doesn't change: colour contrast on the drawer's kicker (`.fm-kick`) and, in the seat card drawer, its section number (`.fm-no`), the package's `lms.css` (D-225).
