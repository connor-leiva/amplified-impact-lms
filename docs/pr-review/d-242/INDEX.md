# Review files for D-242 (a Form button says what it does)

Playwright captures of `/learn/week/0/step/1`, signed in as the seeded test learner (D-200, D-202, so the LMS v3
drawer path), at device scale 2. Local stack only: Postgres, `db:curriculum`, `compliance/lms-v3/prepare.ts content`
and `reset.sql`, the web build in http mode served by the API (`compliance/lms-v3/README.md`, Local run).

Week 0 step 1's checklist was written into that local database in the shape production's has (commit `a9db2962`):
the intake reached through its kit file's Download (`intake-form`), Invite your operator, and a Form › Stack card
button with no label of its own. That content is not part of this change.

| File | Build | Width |
|---|---|---|
| `week0-step1-1280-before.png` | `main` @ `40483f54` | 1280 |
| `week0-step1-1280-after.png` | this branch | 1280 |
| `week0-step1-390-before.png` | `main` @ `40483f54` | 390 |
| `week0-step1-390-after.png` | this branch | 390 |
| `week0-step1-390-before-checklist.png` | `main`, the checklist alone | 390 |
| `week0-step1-390-after-checklist.png` | this branch, the checklist alone | 390 |
| `week0-step1-1280-after-drawer.png` | this branch, after a click on "Open and Submit the Intake Form" | 1280 |
