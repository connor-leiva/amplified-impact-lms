# R-5 Phase 2: no screen moved (D-254)

Phase 2 changes no screen: it is core and API. These are its screenshots at 1280 and 390, taken to show that.

The fixture build (`pnpm --filter @ai/web build:fixture`) of `main` @ 038cd39 and of this branch, served side by side,
each page opened with the same persona and the same instant (`?as=…&now=2026-12-02T19:30:00.000Z`, Wed, Dec 2 at
12:30 PM MT), Chromium 1243, device scale 2. Each pair was compared with pixelmatch at threshold 0. **Every pair is
identical: 0 pixels differ.** The files here are this branch's; `main`'s are the same bytes on screen.

| File | Page | Persona | 0 px differ |
|---|---|---|---|
| `owner-home-1280.png`, `owner-home-390.png` | The learner portal's Dashboard | Team owner | yes, both |
| `owner-sessions-1280.png`, `owner-sessions-390.png` | Sessions (the learner snapshot, scoped by `scopeSnapshot`) | Team owner | yes, both |
| `agent-home-1280.png`, `agent-home-390.png` | The Dashboard | Agent | yes, both |
| `admin-cohorts-1280.png`, `admin-cohorts-390.png` | Cohorts & Sessions | Admin | yes, both |
| `admin-curriculum-1280.png`, `admin-curriculum-390.png` | Curriculum | Admin | yes, both |
| `admin-course-settings-1280.png`, `admin-course-settings-390.png` | Course settings | Admin | yes, both |

Not here: the course pages (`/course`, `/course/week-1`). The fixture build has no course API, so on `main` and on this
branch alike they say "Your course didn't load"; a picture of that proves nothing. What a learner's course is, byte for
byte, is `apps/api/test/december.test.ts`'s job: `GET /api/course` and the learner snapshot for every kind of viewer at
twelve instants, unchanged, with January in the same database.
