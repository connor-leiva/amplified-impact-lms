# R-5 Phase 5, selling a seat in a cohort (D-262)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, America/Denver, at **1280** and **390**. A page is its whole length; a dialog is the viewport with the dialog
open. Taken from this branch (`claude/r5-phase5-selling`, from `main` @ e5032e2).

## The admin's selling screens (fixture build)

The launch database (`compliance/lib/launch-db.ts`): § 9.5's seed and every one-time data step the deploy runs,
Phase 5's `2026-11-27-december-selling` among them, with production's two cohort Payment Link variables set to test
addresses, so December's selling values are stored on its record. `now` is Fri, Nov 27, 2026, 12:00 PM MT. January is
Connor's (six weeks, Tuesday build and Thursday office hours at 12:00 PM MT, Week 1 Sun, Jan 3), made in that database
through the real actions with every Before It Opens line done but its two Stripe lines
(`compliance/lib/selling-world.ts`). The fixture build has no Stripe: its facts answer December's three prices, and for
January the keys and links a test stores as made in Stripe (`FIXTURE_FACTS_KEY`). In http mode the API asks Stripe,
read only.

| File | What it shows |
|---|---|
| `december-settings-{1280,390}.png` | December › Settings: Enrollment says what it sells today. Open; 0 of 15 taken; $7,500; two payments, $3,750 at checkout and $3,750 one month later (Stripe's interval); founding until Mon, Nov 30 · 11:59 PM MT / Tue, Dec 1, 12:59 AM CT; 2 of 2 Payment Links; GoHighLevel dec26. Close enrollment, Change the price, Edit enrollment |
| `december-price-{1280,390}.png` | "Price for a Seat in the December 2026 Cohort": its three lookup keys, each with Stripe's price under it, and Q-30's sentence word for word. No typed price |
| `december-enrollment-{1280,390}.png` | "Enrollment for the December 2026 Cohort": founding and its close (MT), the two Payment Link addresses, the seat cap, GoHighLevel's value |
| `december-overview-{1280,390}.png` | December › Overview: This Cohort's Shape gains its Price row, "$7,500, or two payments" |
| `new-cohort-{1280,390}.png` | New cohort: Start from lists any cohort (here the one there is, December) |
| `january-settings-{1280,390}.png` | January › Settings before its price: Closed; Price Not set; two payments offered (copied from December), "Set its price to see Stripe’s schedule"; founding, no close set; Payment Links Not set; GoHighLevel jan27, prefilled from its start |
| `january-open-refused-{1280,390}.png` | Open enrollment refused, with its reason, in its dialog: "Stripe price found for each lookup key: None yet. Prices and Payment Links are made in Stripe." The button is off |
| `january-price-typed-{1280,390}.png` | Set the price with January's keys typed in: "Save to look it up in Stripe." under each |
| `january-price-{1280,390}.png` | The same dialog after Save price: Stripe's price under each key, and the two-payment schedule as Stripe holds it |
| `january-enrollment-{1280,390}.png` | Edit enrollment: founding closes Thu, Dec 31 at 11:59 PM MT, January's two links, and the line saying a link sells January only when its Stripe metadata says `ai_cohort = <its id>` |
| `january-before-it-opens-{1280,390}.png` | January › Overview: Before It Opens 10 of 11, its two Stripe lines done with what Stripe holds ("$7,500, or two payments · 15 seats", "Both entered. Each names this cohort in Stripe.") |
| `january-open-ready-{1280,390}.png` | Open enrollment, ready: no refusal; "From now on, a team that buys a seat is placed in this cohort, up to 15 seats …" |
| `january-settings-open-{1280,390}.png` | After Open enrollment: Open, and Close enrollment |
| `january-close-{1280,390}.png` | Close enrollment: "No new team can buy a seat in this cohort. The 0 already in it are not affected." and its warning, "This doesn’t turn off its Payment Links. Turn them off in Stripe by hand: a link left on still sells seats in this cohort." |
| `january-settings-closed-{1280,390}.png` | After Close enrollment: Closed again |

`shoot.spec.ts` takes them: `pnpm --filter @ai/web preview:fixture`, then
`npx playwright test -c handoff/admin-mockup/compare/r5-phase5/shoot.config.ts shoot`.

The same screens are in the R2 reference's port (`design-reference/admin-redesign-r2/ref/`: cohort-settings,
cohort-overview, january-settings and the new january-price, january-enrollment, january-open and cohort-close), where
`pnpm parity:admin-r2` holds the app to them on the R2 parity snapshot.

## December's offer page and Revenue, this branch against main (http build, real API)

Two databases made the deploy's way, one with `main` @ e5032e2's code (extracted with `git archive`) and one with this
branch's: `db:migrate`, the launch seed (`seed.ts --launch`), then `db:curriculum:ensure`, which runs every one-time data
step the code holds (this branch's includes `2026-11-27-december-selling`, which wrote December's ten values and skipped
nothing). Both servers ran with the same environment: `NODE_ENV=test`, `FIXED_NOW=2026-11-27T19:00:00.000Z`,
`OFFER_OPEN=true`, every cart's Payment Link variable set to a test address, no Stripe key. Each served its own
`apps/web/dist` (`VITE_DATA_SOURCE=http`), and the browser's clock was fixed to the same instant.

| File | What it shows |
|---|---|
| `december-offer-{1280,390}.png` | `/offer` from this branch. **0 px differ from main** at both widths (pixelmatch, threshold 0) |
| `revenue-summary-{1280,390}.png` | Revenue › Summary as the Owner: the AI Accelerator card's seat cap ("15 seats. Product rule, view only.") and "0 of 15" now read December's record. **0 px differ from main** at both widths |

Byte for byte as well: `/offer`, `/api/offer`, `/forum`, the seven sales pages (`/pricing`, `/team-build`, `/teams`,
`/agents`, `/free`, `/about`, `/insiders`) and both calendar files (`/calendar/builds.ics`, `/calendar/office-hours.ics`)
answered the same bytes from both servers, and the two builds' `offer.html` and `offer-welcome.html` are identical.

Revenue draws its cards only with Stripe connected. With no key both servers say "Stripe isn't connected", so for these
two shots each database was served once more through `build()` with a fake, empty console Stripe in test mode and
December's three prices (the API tests' `fakeConsoleStripe`; a scratch script, not committed). Nothing called Stripe.

`offer.spec.ts` takes and compares them (its header gives the four servers' addresses).

## What to look at

- December's card says exactly what the code sold before Phase 5: those values are now its stored settings, and every
  December output is unchanged (`apps/api/test/december.test.ts` and `fixtures/december/others.json`).
- The price is Stripe's, never typed: the dialog takes lookup keys and shows what Stripe holds under each.
- January opens only once its keys and links are found in Stripe, each link naming January; the refusal says which line
  is not done.
- Close enrollment stops new sales for the cohort; its teams stay. It does not turn its Payment Links off in Stripe
  (D-262 lists this for Connor).
