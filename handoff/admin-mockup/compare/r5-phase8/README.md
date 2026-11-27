# R-5 Phase 8, Revenue › Summary (D-269)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, at **1440**, **1280**, **1024** and **390** (the page has tables). A page is its whole length. Taken from this
branch (`claude/r5-phase8-revenue`), with the browser's clock at Thu, Dec 10, 2026, 9:30 AM MT.

## The fixture build, on the R2 reference's data

The parity world (`?parity=r2`): the reference's own figures (`REVENUE_R2` in `apps/web/src/data/parity-r2.ts`, the same
as `Revenue` in `AdminRedesign.jsx`), December holding seven seats and January created as a draft. These are the
screens `pnpm parity:admin-r2` holds to the reference (`billing` cells).

| File | What it shows |
|---|---|
| `revenue-summary-{w}.png` | All time. The five figures (Cash collected "Since Aug 2026", Still to collect "2 payments · Wed, Dec 30", Total revenue, MRR, Failed payments "Needs review"); Cash By Month, September to February, December collected under what is on its calendar, its note; the AI Accelerator card for December (its seat count of its capacity, paid in full, on two payments, refunds), the Refunds card; By Product (a row for each cohort, December and January, each billing line, Skills); Coming In, the next 60 days. The sidebar's Revenue says "3 failed" |
| `revenue-summary-this-month-{w}.png` | This month: Cash collected "Dec 1 to Dec 10", Total revenue, and By Product's Collected for December only |
| `revenue-summary-stripe-unreadable-{w}.png` | The plain fixture with `?console-state=stripe_off`: every figure that needs Stripe reads "Unavailable", never a zero; Still to collect and the cohort cards, read from the database, are still drawn. (The plain fixture's cohorts are the demo seed's: December, February and April, each at its capacity of 200.) |

## The http build, against the real API and a fake Stripe in test mode

`serve-http.sh`: a fresh database made the deploy's way (`db:migrate`, the demo seed), then `serve-http.ts`, which builds
the real API (`build()`: every route, Revenue's rules) with the Console's Stripe read client replaced by the test suite's
fake (`apps/api/test/fake-console-stripe.ts`), adds eight teams with their orders and plans, three skill purchases and the
Stripe objects behind them, and serves the http web build (`apps/web/dist`) on :4391, signed in as the Owner. No Stripe
call is made and nothing is written anywhere but that scratch database. Production's seat cap (15) is set on its cohorts.

| File | What it shows |
|---|---|
| `http-revenue-summary-{w}.png` | All time: $19,856 collected since Sep 2026 (paid invoices and two skills, less Fourth Meridian's $695 refund), $3,750 still to collect (Lantern Street's second payment, Mon, Dec 28), MRR $2,476 over 4 subscriptions, 1 failed (Tidewater, retrying Sat, Dec 12). December's card: 2 of 15, 1 team paid in full, 1 on two payments. February's card (the demo seed's February is open for enrollment). By Product per cohort and per line, with each Team Plan's people. The sidebar's Revenue says "1 failed" |
| `http-revenue-summary-this-month-{w}.png` | This month: Dec 1 to Dec 10 |

Left out of every figure, as the spec asks, and in the database on purpose: a test account's $7,500 seat and its refund
(QA Test Team), and a Utah Life agent's $37 skill. Today's Skill Purchases list (D-163's, under the page) lists every
purchase as before; it is a list, not a figure.

## How they were taken

```
pnpm --filter @ai/web build && bash handoff/admin-mockup/compare/r5-phase8/serve-http.sh   # leave it running
pnpm --filter @ai/web preview:fixture                                                    # on :4173
npx playwright test -c handoff/admin-mockup/compare/r5-phase8/shoot.config.ts shoot
```
