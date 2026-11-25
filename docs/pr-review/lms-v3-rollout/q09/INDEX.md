# Q-09: What v3 Doesn't Draw, Before the Flip

All shots were taken signed in as the seeded test learner (Alex Morgan, Northline Realty, the package's made-up people), on the flag-on build (`VITE_LEARNER_V2=true VITE_LMS_V3=true VITE_DATA_SOURCE=http`). They ran against a copy of the development database, never production. Each screen is at 1280 and 390 (deviceScaleFactor 2), with `TZ=America/Chicago`.

**Each screen is checked for:**
- whether it sits in the v3 frame;
- whether it scrolls sideways at 390.

None scrolls sideways.

**What the shots needed that the seed leaves to staff** (added on the database copy only):
- **A flagged tour video in Week 0's Media** (D-252). It's a stand-in record, so the video itself doesn't load. Production shows no modal and no card until staff upload the real tour.
- **The seat card's Form buttons on Week 1 step 6.**
- **Step 1's "Send back your stack card" item and its Form > Stack card button are not in the seeded content**, so the Stack Card page was opened by its address.

| Screen | File | What it is |
|---|---|---|
| Home | `home-*.png` | Today's page, inside the v3 frame. |
| Skill Library | `skill-library-*.png` | The members' library (today's), inside the frame. |
| A skill | `skill-*.png` | The guided setup (today's), inside the frame. |
| Account | `account-*.png` | Today's Account page, inside the frame. |
| Team Hub | `team-hub-*.png` | The first portal's Team Hub, inside the frame. |
| Resource Vault | `resource-vault-*.png` | The Vault, inside the frame. Its nav row has no lock in v3, though the Vault itself opens at the first live build (C-05). |
| The Stack Card page | `stack-card-page-*.png` | **It sits flush against the sidebar, with no page gutter, and its title reads "Stack card".** connor-leiva/amplified-impact-lms#269's frame and Stack copy fixes are not in this rollout, as asked. |
| The legacy intake URL | `legacy-intake-url-*.png` | `/learn/week/0/intake` redirects to `/learn/week/0?form=intake`, and the drawer opens. |
| The intake drawer | `intake-drawer-*.png` | The v3 drawer over Week 0. |
| "How the LMS Works" on sign-in | `tour-modal-on-sign-in-*.png` | It opens on load until the learner has seen it (D-252). The video area is empty here because the file is a stand-in. |
| The pinned card on Week 0 | `week-0-pinned-tour-card-*.png` | Above the hero, once seen. |
| Turn in on Week 1 step 4 | `turn-in-week-1-step-4-*.png` | The upload drawer, over the v6 step page (the step page has no shell, D-210). |
| The seat card drawer | `seat-card-drawer-*.png` | Opened from Week 1 step 6's Fill In Your Seat Card, over the step page. |
| Community and a thread | `community-*.png`, `thread-*.png` | The v3 pages, with the package's sample threads. |
| The Schedule | `schedule-*.png` | The v3 Schedule. Every time on it reads "12:00 PM MT / 1:00 PM CT" (D-259), except the lede, which is the cohort's cadence as staff typed it. |
| A locked week | `locked-week-*.png` | Week 1, locked, "Opens Sun, Nov 29" (D-249). |
| Dark mode: Home | `dark-home-*.png` | The learner's Theme is Dark. **Home draws dark inside the light v3 frame.** The same goes for every page under the shell that isn't a v3 page (the Skill Library, a skill, Account, Team Hub, the Vault): the frame hands today's pages the learner's theme. |
| Dark mode: Week 0 | `dark-week-0-*.png` | A v3 page stays light, as C-02 says. |
