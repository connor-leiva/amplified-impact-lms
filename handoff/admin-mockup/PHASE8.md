# R-5 Phase 8: Revenue › Summary, on paper

Written before any code, as the spec asks of each phase. The spec is `ADMIN-RESTRUCTURE-SPEC.md`, "Phase 8. Revenue ›
Summary", with § 1 (December does not move), § 4 (rules for every screen) and § 6 (tests, references, done). PLAN.md
§ 10 governs: where it already decides something, this cites it and does not decide it again. The decision entry is
D-269. Built on R-5 Phase 7 (D-268, `66ef1da1`; rebased onto `main` @ `00f57261` once #288 merged), on Phase 6 (D-265), on
the audit fix-up (D-267) and the hotfix (D-266).

## What PLAN.md § 10 already decides for this phase

- **The sidebar's "N failed"** (PLAN § 8's phase notes and § 10.8, Connor's call on #270, D-253): Revenue's single row
  draws "3 failed", the count of the Failed list, the same count as the Summary's Failed payments figure. It is read from
  what Billing already holds in memory (`BillingMemo`) through a new API route, never a Stripe call per page view, and
  nothing is drawn while it is unknown.
- **Stripe is read, never written** (PLAN § 10.5, and its table of every Stripe write the code makes today). This phase
  adds no write and no Stripe object. It reads through the Console's cached client (`cachedConsoleStripe`), a fixed
  handful of list reads per load, never a call per row, order, refund or cohort (the overnight driver's rule). Every figure comes from what Billing already reads: Stripe's subscriptions,
  invoices, charges and refunds through the Console's read client (`console/stripe-read.ts`, the five Read scopes of
  `STRIPE_READ_SCOPES`), and the database's `orders`, `plans`, `skill_purchases` and `cohorts`. **No new Stripe scope is
  asked for.** The read client gains fields of objects it already reads (an invoice's `billing_reason` and the time it
  was paid; a subscription's period end, trial end and `cancel_at_period_end`), not a new kind of object.
- **Seats have one source, Enrollment** (PLAN § 10.3): a cohort card's seat count opens that cohort's Enrollment
  (Cohort › Settings), and reads the cohort's capacity (PLAN § 10.10's table: Revenue's "15 seats" card "then reads the
  cohort's cap").
- **The allowlist** (PLAN § 10.10): the one entry marked phase 8, `apps/web/src/routes/admin/Tiers.vm.ts` (Plans &
  Upgrades names December in its revenue line, `c.id === 'dec26'`), goes with the line: that line is not drawn (the
  R2 reference's Plans & Upgrades has its own description), and revenue is Revenue › Summary's now.
- **Copy** (PLAN § 10.8): the mockup's, Title Case headings, no em or en dashes, "AI Implementer"; every time
  "12:00 PM MT / 1:00 PM CT" through `fmt.mtCt`. Revenue prints days ("Wed, Dec 30"), no times.
- **Nothing cohort-specific is hard-coded** (§ 10.10): a card per cohort, read from the cohort's record.

## The screen (the mockup's `Revenue`, `ia-screens.jsx`)

Period: All time, This month (the head's select). The figures, by the spec's definitions:

| Figure | What it reads | Opens |
|---|---|---|
| Cash collected | Stripe's paid invoices (paid in the period) and the one-time skill payments (`skill_purchases`, Stripe's payment-mode checkouts, which have no invoice), less Stripe's refunds in the period (Q-25 read as net) | Payments › Invoices (the mockup's) |
| Still to collect | `acceleratorFigures`' `scheduledCents` for every cohort (orders and plans, `countedCohortSeat`), with the next date Stripe holds for a second payment | Coming in, on this page (the mockup's; Payments has no scheduled list) |
| Total revenue | Cash collected + Still to collect. Renewals are not in it | By product, on this page (the spec's) |
| MRR | `subscriptionMrr`, `MRR_STATUSES`, as today | Payments › Subscriptions |
| Failed payments | Today's Failed list: open invoices Stripe has tried | Payments › Failed payments |

- **Cash by month**: six months, the three before this one, this one and the two after (the mockup's six bars). A month
  past is what was collected; a month ahead is what Stripe already has on the calendar (each live subscription's next
  dated charge, its renewal or the end of its trial, and a two-payment seat's second payment); this month is both. The
  note under it says what the first month with something on the calendar counts and that it is not a forecast.
- **By product**: one row per cohort (the AI Accelerator's line, `BILLING_LINES`' `cohort`, by the cohort the order
  names), then the other billing lines (`billingLineOf`), then Skills (`skill_purchases`). Collected (period), Still to
  collect, Total, MRR. A paid invoice's line is its order's when it is the checkout's own invoice (`billing_reason`
  `subscription_create`), else its subscription's (its prices' lookup keys), so a full-pay seat's first invoice is the
  Accelerator's and its later Insiders renewals are Insiders'.
- **Coming in**: the next 60 days, payment by payment: renewals and first payments after a trial (each subscription's
  next charge), retries (an open invoice's next attempt), second payments.
- **A card per cohort that is selling or running** (`enrollmentOpen`, or its status word is Active): seats sold of its
  capacity, paid in full, on two payments, refunds; in place of today's one "AI Accelerator" card. The mockup's Refunds
  card (last 30 days) stays beside them.
- **Test accounts and access-group members are in none of it**: a customer whose account's owner is a test account
  (D-202, `countedCohortSeat`'s rule), or whose team is an access group's team of one (`groupTeamOfOne`, D-268), is left
  out of every Stripe figure; their skill purchases too. Comps are not revenue (D-267): they have no payment, and the
  seat figures are `countedCohortSeat`'s.
- **"Unavailable", never a zero**: when Stripe can't be read (no key, a Read permission missing, Stripe failing), every
  figure that needs Stripe says "Unavailable", and the figures read from the database (seats, Still to collect) are
  still drawn. The API answers one summary with the Stripe part marked unreadable, rather than failing the page.

## API

`GET /api/console/billing/revenue?period=all|month` (`billing.read`, a read, cached 10 minutes per period as the
summary is) and `GET /api/console/billing/failed-count` (`billing.read`: `{ failed, asOf }` from memory, null until a
summary or Revenue has been read since the server started; a refund or void forgets it). Today's
`GET /api/console/billing/summary` keeps § 7.6's shape exactly (Payments still reads its failed count).

## Core

`packages/core/src/console-revenue.ts`: the pure rules (an invoice's line, the exclusions, the months, Coming in, the
cohort figures) and the shapes, tested without Stripe. The web's view-model prints the mockup's words from them.

## References, tests and screenshots

- **R2**: the mockup's `Revenue` ported into `AdminRedesign.jsx` as Revenue › Summary (`billing` refs), on this
  reference's own data (`WS`, December at its capacity, January created as a draft), with the chart's CSS; and Revenue's
  "3 failed" on the sidebar row, which changes every ref that draws the full sidebar. Refs re-rendered; only changed ones
  copied; both manifests recomputed.
- **Tests**: core (the rules), API (the route against the fake Stripe: each figure, the exclusions, Unavailable, the
  memo count), web (the view-model, the sidebar roll-up), e2e (Revenue › Summary with axe at 1280 and 390, the period,
  every figure's target; `admin-numbers.spec.ts` walks it).
- **Screenshots**: `handoff/admin-mockup/compare/r5-phase8/` at 1440, 1280, 1024 and 390, the fixture build and the http
  build against a fake Stripe in test mode.
