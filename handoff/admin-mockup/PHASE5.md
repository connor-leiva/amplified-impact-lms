# R-5 Phase 5: selling a seat in a cohort, on paper

Written before any code, as the spec's Phase 5 asks ("Plan it on paper first"). Connor answered Q-21 and Q-22 (PLAN.md
§ 10.1), so nothing blocks it. Where PLAN.md § 10 already decides something, this cites it and does not decide it again.
The decision entry is D-262.

## The rule this phase works under

- December does not move (spec § 1). `december.test.ts` and its golden stay byte-identical. Before any code changes,
  Stripe writes 1 and 2, provisioning's plan dates and `invoicePaid`'s cap are captured into
  `fixtures/december/others.json` on unmodified `main` (PLAN § 10.5: "captured on `main` before any change"), twice,
  and the same capture must still match at the end.
- Nothing cohort-specific is hard-coded (PLAN § 10.10). The code never creates a Stripe price or a Payment Link (§ 10.1,
  Q-21); it reads them. Stripe writes run in test mode, in tests, against a fake.

## 1. The columns (migration `0046_cohort_selling.sql`; numbered 0046 after #282 took 0045)

Additive only, every column nullable with no default (D-173): a null reads back as an absent key, so every row made
before reads as it did.

| Column | What it holds | December's value (the data step) |
|---|---|---|
| `cohorts.founding` (boolean) | Founding, yes or no (§ 10.10) | `true` |
| `cohorts.founding_closes_at` (bigint, an instant) | When founding prices stop selling. Shown and edited as "MT / CT" through `fmt` | production's `FOUNDING_CLOSES_AT`, else `DEFAULT_FOUNDING_CLOSES_AT` |
| `cohorts.lookup_key_full` (text) | Paid in full's Stripe lookup key | `cohort_founding_full` |
| `cohorts.lookup_key_rollover` (text) | The Insiders key the full cart carries, and that two payments roll onto | `membership_monthly_team_leader` |
| `cohorts.lookup_key_two_pay` (text) | Two payments' lookup key | `cohort_founding_two_pay` |
| `cohorts.two_pay` (boolean) | Whether two payments are offered | `true` |
| `cohorts.link_full`, `cohorts.link_two_pay` (text, https) | The two Payment Link addresses (§ 10.5: they live on the cohort, not in Railway) | production's `PAYMENT_LINK_COHORT_FULL` and `PAYMENT_LINK_COHORT_TWO_PAY` |
| `cohorts.ghl_value` (text) | GoHighLevel's Cohort field value (Q-33) | `dec26` |
| `orders.cohort_id` (text) | The checkout's `ai_cohort`; null for none, which is December | stays null on every December order |

Already there and now read: `cohorts.capacity` (the seat cap, December's 15) and `cohorts.included_until` (Phase 3,
Q-22). No `price_cents` (§ 10.5: the price is read-only from Stripe). The learner's snapshot leaves every one of these
out (as it leaves out the run, D-255), so December's snapshot stays byte-identical once its values are stored.

## 2. The admin actions

All through `POST /api/admin/actions/:name`, checked with strict zod, one `audit_log` row each, written by core
(`@ai/core/cohort-selling`). The permission is the existing `billing` key of the staff matrix: Owner and Admin hold it
by default, Instructor, Content Editor and Support do not. That is the spec's "Owner and Admin only" (§ 4 rule 5) with
no new capability, as the brief asks ("pick the existing permission that fits").

| Action | Audit action | What it saves |
|---|---|---|
| `saveCohortPrice` | `cohort.price_save` | The three lookup keys and whether two payments are offered (the mockup's price dialog). No amount: the dialog shows Stripe's (Q-30) |
| `saveCohortEnrollment` | `cohort.enrollment_save` | Founding, its close (date and time in MT), the two Payment Link addresses, the seat cap, the GoHighLevel value |
| `openCohortEnrollment` | `cohort.enrollment_open` | `draft` (or a closed `live`) to `enrolling`, refused with "Before It Opens"'s first line not done |
| `closeCohortEnrollment` | `cohort.enrollment_close` | `enrolling` to `live`: no new sale; no one already in is touched |

- **Open is refused until Before It Opens is done** (§ 10.3: one function answers the checklist and the refusal). The
  two Stripe lines become doable: "Stripe price found for each lookup key" is done when Stripe has an active price
  under every key the cohort sells (read through the price cache, `PriceBook`); "Payment Links entered" is done when
  each link the cohort sells through is entered and, read from Stripe (Payment Links: Read, which D-154 gave the
  restricted key), carries `ai_cohort` naming this cohort. With no key, or a key that may not read links, the line says
  so and is not done.
- **December keeps its answer.** `/api/mutate/openEnrollment` stays the reference's mutation, word for word
  ("Only a draft cohort can open for enrollment." for December), as Phase 3 left it.
- **Close** moves `enrolling` to `live` and nothing else. `live` and `enrolling` are both "under way" for the reminders
  (`jobs/due.ts`), and the status words are derived (D-255), so no learner sees a change.
- **Seat cap edits** refuse a number below the seats already sold. Included time stays Phase 3's field and freeze.
- **New cohort** prefills the GoHighLevel value with Phase 4's month and two-digit year (`ghlCohortValue`, "jan27"), and
  its "Start from" lists every cohort that is not archived, not December by id. A new cohort copies the source's seat
  cap, founding and two payments, never its keys, links or GoHighLevel value.

## 3. How a checkout finds its cohort

- A Payment Link's metadata is copied onto its Checkout Session by Stripe. A cohort's links carry `ai_cohort=<cohort
  id>` (set in Stripe by Connor or Spring, with `ai_plan` and `ai_option`); the webhook stores it on the order
  (`orders.cohort_id`). **No `ai_cohort` means December, forever**, so a December link already in an inbox still works.
- An `ai_cohort` that names no cohort is not provisioned: the order is recorded as paid, the error names the order for
  Connor, and staff provision it by hand (`provision --order`), as every other unprovisioned order today.
- **Provisioning reads the cohort's record**: the plan's `cohort_id`, its `starts_at` (the later of now and the
  cohort's first live build), and its `paid_through` and `live_until` (the start of the included-time day in
  America/Chicago, `includedUntilAt`). That is `initialPlanDates` with the cohort sold (§ 10.10). December's
  included-time end, 2027-05-04, starts at the constant's instant, so its plan dates are byte-identical (§ 10.5).
- **The team's `users.cohort_id` follows**: the owner and everyone on the team are written into the cohort the new plan
  is for, so Community and files (plans) and the snapshot and join (`users.cohort_id`) agree (D-261 item 9).
- **Q-23, answered (Connor, Nov 26, 2026): a team is in one cohort at a time, and the newest purchase decides.** The
  newest purchase is the team's newest cohort plan that has not ended, by when it was bought (`plans.created_at`, set
  when the checkout is provisioned; `cohortOfPlans`). It decides whichever cohort starts first: a January team that
  later buys through a December link is in December. A purchase that is not a cohort seat (a membership, a skill) moves
  no one, and a refunded seat (its plan ended) no longer counts as a purchase. The move is written to the audit log
  (`cohort.team_moved`, from and to), and the team's progress and files stay (they are keyed by team and week).
- A sale in a cohort that is not open (a link still live in Stripe after Close) is placed and logged for Connor; a paid
  checkout is never refused (D-154's rule for the 16th seat).

## 4. Seats per cohort, and the link switch

- `cohortSeatsSold(db, cohortId)` counts `cohort` plans not ended, not a test account's (D-202), whose `plans.cohort_id`
  is that cohort (§ 10.5). The cap is the cohort's `capacity`.
- **The switch (write 5, D-154) runs per cohort**: each cohort's own links, at its own seats, with its own sold-out line.
  December's links stay the ones D-154 named (`PAYMENT_LINK_ID_*`, else the two live ids), so its calls are
  byte-identical. Another cohort's are found from its stored addresses with a read (`paymentLinks.list`, Payment Links:
  Read). A link reopens only while `OFFER_OPEN` is on, its cohort's enrollment is open, and its founding (if founding)
  has not closed.
- **The sold-out line** reads the cohort's cap and founding: December's stays "All 15 founding seats are taken. Join the
  waitlist at amplifiedimpact.io/offer to hear first about the next cohort." A cohort that is not founding drops the
  word "founding" (new copy, flagged).
- **Founding closes per cohort**: a cohort's founding carts close at its own `founding_closes_at`. `FOUNDING_CLOSES_AT`
  now closes only the Team Plan's founding carts (§ 10.10, "Not cohort-specific").
- **Revenue's card and Health's cap** read the cohort's `capacity`: December's "15 seats. Product rule, view only." is
  unchanged. Both stay December's card until Phase 8 (Revenue per cohort) and Phase 9 (Health per selling cohort).

## 5. The Stripe writes (§ 10.5's table)

| # | Write | Phase 5 |
|---|---|---|
| 1 | `subscriptions.update` after a checkout (`trial_end` pinned for the full cart) | The pin is the order's cohort's included-time end, not `INSIDERS_FIRST_CHARGE_AT` |
| 2 | `subscriptions.create`, two payments' Insiders | Trials to the cohort's included-time end, on the cohort's rollover key |
| 3, 4 | `cancel_at_period_end`, refunds | Unchanged |
| 5 | `paymentLinks.update`, the seat cap | That cohort's links only (above) |
| 6 | Billing's staff refunds and voids | Unchanged |

`invoicePaid` caps a period end at the plan's cohort's included-time end (it read the pin before). A test scans every
source file and fails on `prices.create`, `paymentLinks.create` or `products.create`.

## 6. The offer page, its welcome page and the calendar files

- **The cohort on sale** is the cohort whose enrollment is open (`enrolling`, not archived). **With two or more open,
  the next cohort to start sells (Connor, Nov 26, 2026)**: of the open cohorts whose `start` is still ahead, the
  soonest (`cohortOnSale(db, now)`). So with December and January both open, the page sells December until December
  starts (its `start`, Wed, Dec 2, 2026, 1:00 PM CT), then January, without closing December first. When every open
  cohort has already started there is no next one, and the one that started last sells (flagged in D-262). One open
  cohort sells whether or not it has started, as December does today. With none open, the Accelerator's two carts read
  "closed" (the waitlist). A database with no December row at all (most API test databases) reads December's built-in
  values, as before.
- The page's cohort facts come from that cohort: founding open or closed and its deadline, its seats (sold, total,
  left), its two links, and two payments only when offered. `GET /api/offer` keeps its exact shape.
- **Calendar files**: a cohort's public builds and office-hours files are `/calendar/builds.ics?cohort=<id>` and
  `/calendar/office-hours.ics?cohort=<id>`; the welcome page links the order's cohort's (the cohort on sale while the
  order is still confirming). The bare paths stay December's: a changed UID duplicates every event in a subscribed
  calendar (PLAN § 5.3). Flagged.

## 7. Each constant and December branch in § 10.10

| Today | Phase 5 |
|---|---|
| `initialPlanDates`: `dec26`, `COHORT_ONE.firstBuildAt`, `COHORT_ONE_LIVE_UNTIL` | The cohort sold: its id, its first live build, its included-time end |
| Writes 1 and 2, `invoicePaid`'s cap: `INSIDERS_FIRST_CHARGE_AT` | The cohort's included-time end |
| `COURSE_OPENS_AT`; `cohortOpensAt` and `opensAtOf` answering December by id | Every cohort's first live build, read the same way; the data step checks December's reads back as D-153's instant and names it if not. The browser keeps D-153's instant for the default cohort only while its snapshot holds no session (before the preview): on the allowlist |
| `FOUNDING_CLOSES_AT` for every founding cart | The cohort's founding close; the variable closes only the Team Plan's |
| `COHORT_SEATS`: the cap, `SOLD_OUT_MESSAGE`, the offer's seats, Billing's and Health's caps | The cohort's `capacity` |
| `PAYMENT_LINK_COHORT_*` | The cohort's stored addresses (December reads the variables while its record holds none) |
| `CARTS['cohort-*'].items` | The cohort's lookup keys |
| Which cohort the offer page, its welcome page and the calendar files sell | The cohort on sale (above) |
| The marketing pages: deadline, seat dots, Insiders date | Deadline and seats already come from `GET /api/offer`, which now answers for the cohort on sale; the home page's dots follow its `seats.total`. The kit's seat meter (no script) and the Insiders date stay built, on the allowlist: moving them changes a built page or `GET /api/offer`'s shape, which December's golden pins |
| GoHighLevel's `dec26` by id | The stored value; with none, the month and two-digit year of its start (which is `dec26` for December) |
| Week 0 Is Open's December label and body words | The cohort's name, sent only when it reads differently from December's words, so December's data is unchanged; a cohort that is not founding drops "founding" (new copy) |
| The digest's D-110 rule by id | A cohort laid out from a stored shape names its next meeting; December has none stored (Q-28), so no id is needed |
| New cohort's `SOURCE_COHORT_ID` | Any cohort not archived |
| The mirror of December's run onto its modules, December's words in its course, its derived shape, `sessionKind` by id | Stay (Phase 6, Q-28, Connor's call), on the allowlist |

## 8. The data step and its rollback

`2026-11-27-december-selling` (`planDecemberSellingV1` in `packages/core/seed/december-selling-v1.ts`), after Phase 3's
`2026-11-26-december-run` in `apps/api/src/db/data-migrations.ts`. It copies founding (true), the founding close (the
production environment's `FOUNDING_CLOSES_AT` as the deploy reads it, else the default), the three lookup keys, the two
Payment Link addresses (`PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY`, as `readOfferConfig` reads them),
two payments offered (true), `included_until` 2027-05-04 and the GoHighLevel value "dec26".

- **D-175's rule.** It writes a field only when it is unset and the value written reads back exactly as the code reads
  it today (the included-time day's instant is `INSIDERS_FIRST_CHARGE_AT`; a link is the address `readOfferConfig`
  produces). A field already set, a variable that is unset or not an https address, a cap that is not 15, or a first
  live build that is not D-153's instant is left alone and named in the step's summary.
- **Rollback.** `undoDecemberSellingV1` clears exactly the fields the step wrote, so every read falls back to the
  constants and variables, which hold the same values. In SQL: `update cohorts set founding = null,
  founding_closes_at = null, lookup_key_full = null, lookup_key_rollover = null, lookup_key_two_pay = null,
  two_pay = null, link_full = null, link_two_pay = null, ghl_value = null, included_until = null where id = 'dec26';`
  and `delete from data_migrations where id = '2026-11-27-december-selling';` to let it run again. `audit_log` keeps its
  rows (it is append-only).
- **No gap on deploy.** Railway's Pre-deploy Command runs `db:migrate` and then `db:curriculum:ensure`, which runs every
  data step, before the new version takes traffic; a failing step stops the deploy and the old version keeps serving.
  So the code never serves with the columns empty in production. The fallback (December reads the constants and the
  variables while its record holds none) stays anyway, for a field the step leaves alone and for every test database.

## 9. The hard-code check

`scripts/check-cohort-hardcodes.mjs`, added to `pnpm lint` (CI's quality job runs it). It reads the runtime code
(`apps/api/src`, `apps/web/src`, `packages/core/src`; not tests, seeds or comments) and fails on:

- a comparison to `DEFAULT_COHORT_ID` or `ACCELERATOR_COHORT_ID` (`===`, `!==`, `eq(…)`, `case`);
- the literal `'dec26'` anywhere;
- a date literal (`'2026-12-02…'`, `Date.UTC(2027, …)`).

…unless the line is on `scripts/cohort-hardcodes.allow.json`. Each entry names its file, the text it matches, how many
times, its reason and the phase that removes it. A second list holds what is not cohort-specific and never moves (the
Team Plan's and Agent Plan's dates, agreement and API versions, fixtures), each with its reason (§ 10.10's "Not
cohort-specific"). An entry that no longer matches anything fails the check too, so the list can only shrink. Proved by
planting a violation and seeing it fail, then removing it.

## 10. What gets tested

- **December**: `december.test.ts` and its golden unchanged; `others.json`'s new capture (writes 1 and 2, plan dates,
  the cap) matching; a sabotage (one value moved on purpose) failing it, then reverted.
- **Core** (`cohort-selling.test.ts`): reading a cohort's selling settings with and without stored values, plan dates
  per cohort, the pin, the sold-out line, the offer's cohort on sale (none, one, two open: the next to start, before
  and after the first starts; three open; both started), Q-23's newest purchase in either order, Before It Opens' Stripe
  lines, the four actions (permission, audit, refusals), the data step (writes, leaves alone, names) and its rollback.
- **API** (`cohort-selling.test.ts`, the fake Stripe in test mode): the spec's Done-when, as tests: a checkout through
  a January link provisions a January team Phase 4 serves (its course, sessions and Community are January's); a
  checkout through a December link provisions what it does today; the seat after January's last behaves as December's
  16th (logged, January's links off, December's untouched). Also: the actions over HTTP (403 without `billing`, one
  audit row, 422 refusals), the facts route's Stripe lines, the offer selling December then January with both open,
  Q-23's move both ways (December to January, and January back to December) with its audit row, the data step against a
  database of production's shape, and that nothing calls `prices.create` or `paymentLinks.create`.
- **Web**: the Enrollment card's view-model, its dialogs; e2e for Settings › Enrollment, the price dialog, Open
  enrollment refused and then ready, and Close enrollment.
- **The R2 reference**: the mockup's Enrollment card, Open enrollment, the price dialog (with Q-30's sentence) and the
  Close enrollment dialog, rendered as refs with parity cells; every ref of an unchanged screen byte-identical.
