# Admin redesign R2-1a: before and after (D-160)

Removed in the next commit, so none of this merges into `main`.

- **before**: the fixture build of R2-0's head (`dc79ce6`), where D-156's phone sizing applies at every width.
- **after**: the fixture build of this branch, where it applies only under 768px.

App shots are taken with `lms-mobile.spec.ts`'s own setup (fixture mode, live phase, light theme, the clock frozen at Dec 7, 2026, 10:42 AM CT), viewport only: 1280 × 900 and 390 × 844.
The 390 before and after files are byte-identical on all four screens: the phone does not change.

| Screen | 1280 before | 1280 after | 390 before | 390 after |
|---|---|---|---|---|
| Learner dashboard (agent) | ![](learner-dashboard-1280-before.png) | ![](learner-dashboard-1280-after.png) | ![](learner-dashboard-390-before.png) | ![](learner-dashboard-390-after.png) |
| Team Hub (owner) | ![](learner-team-hub-1280-before.png) | ![](learner-team-hub-1280-after.png) | ![](learner-team-hub-390-before.png) | ![](learner-team-hub-390-after.png) |
| Admin overview | ![](admin-overview-1280-before.png) | ![](admin-overview-1280-after.png) | ![](admin-overview-390-before.png) | ![](admin-overview-390-after.png) |
| Admin curriculum | ![](admin-curriculum-1280-before.png) | ![](admin-curriculum-1280-after.png) | ![](admin-curriculum-390-before.png) | ![](admin-curriculum-390-after.png) |

## Goldens, 1440 (reference renders from the pinned container)

| Scenario | before (R2-0) | after (this branch) |
|---|---|---|
| `dash-agent-live` page | ![](golden-dash-agent-live-page-1440-before.png) | ![](golden-dash-agent-live-page-1440-after.png) |
| `admin-overview` page | ![](golden-admin-overview-page-1440-before.png) | ![](golden-admin-overview-page-1440-after.png) |
