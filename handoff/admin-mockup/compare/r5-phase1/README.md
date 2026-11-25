# R-5 Phase 1, the frame, beside the mockup (D-253)

The app's fixture build on the left (`?as=admin&parity=r2&now=2026-12-10T16:30:00.000Z`: the R2 reference's own data, at its
"now"), `handoff/admin-mockup/dist/index.html` on the right, 16 px apart on the mockup's stage grey. Both rendered alike:
Chromium 1243 at DPR 1 with the R2 renderer's flags and the container's fonts (D-239, D-253). A page is its whole frame
(as `pnpm parity:admin-r2` captures it); an open menu, the palette and the drawer are the viewport.

The mockup draws the approved design with its own sample data, and its tabs hold the new screens of later phases; this
phase wraps today's pages. So the frame (the sidebar, the page's head and tabs, the crumbs, the picker, the palette) is
what to compare; a tab's own page is today's until its phase.

| File | App | Mockup |
|---|---|---|
| `sidebar-overview-{1440,1280,1024,390}.png` | Overview (`/admin`): five single rows, the hairline, Operations and Access; the rail at 1024 | "Overview (today)" |
| `sidebar-operations-{1440,1280,1024}.png` | System Health (`/admin/health`): Operations open, System Health first | System Health |
| `drawer-390.png` | The phone's drawer, on Cohort › Schedule | Cohort › Schedule |
| `rail-flyout-1024.png` | The rail with Operations' fly-out | the same |
| `program-curriculum-{1440,1280,1024,390}.png` | Program › Curriculum (`/admin/program`) | Program › Curriculum |
| `program-course-settings-{1280,390}.png` | Program › Course settings (`/admin/program/course`) | Program › Course settings |
| `program-vault-{1440,1280,1024,390}.png` | Program › Resource Vault (`/admin/program/vault`) | Program › Resource Vault |
| `program-week-{1280,390}.png` | A week: today's Module Builder (`/admin/program/weeks/m1`), crumb `Admin / Program / Curriculum / Marketing AI Employee` | Program › a week |
| `cohort-schedule-{1440,1280,1024,390}.png` | Cohort › Schedule (`/admin/cohort/dec26/schedule`) | Cohort › Schedule |
| `cohort-people-{1440,1280,1024,390}.png` | Cohort › People: Learners & Teams, its tabs a segmented control | Cohort › People |
| `cohort-community-{1440,1280,1024,390}.png` | Cohort › Community (D-238) | Cohort › Community |
| `cohort-announcements-{1440,1280,1024,390}.png` | Cohort › Announcements | Cohort › Announcements |
| `cohort-picker-open-{1280,390}.png` | The picker in the Cohort page's title, open | the same |
| `switcher-open-1280.png` | The sidebar's switcher, open | the same |
| `people-everyone-{1440,1280,1024,390}.png` | People › Everyone: Users (`/admin/people`) | People › Everyone |
| `people-teams-{1440,1280,1024,390}.png` | People › Teams: Workspaces (`/admin/people/teams`) | People › Teams |
| `people-masquerade-{1280,390}.png` | People › Masquerade | People › Masquerade |
| `people-team-{1280,390}.png` | A team (`/admin/people/teams/ws_northshore`): way back "Teams", crumb `Admin / People / Teams / Northshore Group` | People › a team |
| `revenue-summary-{1440,1280,1024,390}.png` | Revenue › Summary: Billing's own Summary (`/admin/revenue`) | Revenue › Summary |
| `revenue-payments-{1440,1280,1024,390}.png` | Revenue › Payments: Billing's lists as the segmented control (`/admin/revenue/payments`) | Revenue › Payments |
| `revenue-plans-{1440,1280,1024,390}.png` | Revenue › Plans & upgrades: Tiers & Upgrades (`/admin/revenue/plans`) | Revenue › Plans & upgrades |
| `revenue-usage-{1440,1280,1024,390}.png` | Revenue › Usage | Revenue › Usage |
| `palette-{1280,390}.png` | The ⌘K palette with "people" typed: the pages and the tabs | the same |

Expected differences, each in D-253:

- **Roll-ups.** The mockup's Cohort "3 waiting" counts its Community threads; the parity fixture's shell counts none (as
  D-238 left it), so the app's Cohort row and Community tab show no count here. Production's do. The mockup's Revenue "3
  failed" is not drawn: no count Billing holds in memory can be read without a Stripe call.
- **What a tab holds.** Today's pages, until their phases: the mockup's new Curriculum, a week and Course settings
  (Phase 6), Cohort's Overview, Schedule, Submissions and Settings (Phases 3 and 7), People's Everyone, Teams and Utah
  Life (Phase 7) and Revenue's Summary (Phase 8). The mockup's Cohort tabs include Overview, Submissions and Settings, and
  People's Utah Life (the palette's "People › Utah Life" too); this phase draws a tab once its page exists.
- **The Cohort page's head** is the picker alone; the mockup's status, shape line, Preview and menu wait for Phases 3
  and 5. Its picker lists "New cohort…" (Phase 3).
- **Program's tile** is 32 px (the program logo's own floor), the mockup's 28; **the picker on a phone** is 44 px tall (the
  phone's target floor), the mockup's 36.
- **People's tabs** carry no counts (the mockup's are Phase 7's).
- **Data.** Each side's own sample data: the mockup's Overview here is "before start", its Payments add Northline Realty
  and Sample Team, its weeks and sessions are its January-ready sample, and so on. The words of the frame are the same.
