# Stripe: what the website expects from Grokbok

Nov 10, 2026 · for Grokbok, from the website team · send with *Stripe Setup: Handoff for Grokbok* (Nov 9)

Your handoff from Connor covers everything inside Stripe. The website is built against it on branch
`claude/busy-darwin-xsmr2o` and tested against a stand-in for Stripe. This page lists the few places
where the code needs one exact spelling from you, what to send back, and the joint tests with what
the website should show for each. Nothing here changes a price, an amount or anything a customer sees.

Send it to Grokbok **on Tuesday, Nov 10**, before the test-mode Payment Links are made, because
section 2 sets their custom field keys.

## 1. What the website already does, so you don't build it

| Your handoff says | The website does it here |
| --- | --- |
| Two-pay ends after the second payment | When a two-pay purchase completes, the webhook sets `cancel_at` to the end of the second paid month (no proration). Within a minute, the subscription shows its cancellation date: your test 11. A two-pay it could not date is ended at the second payment instead. |
| Agent first charge on exactly Jan 26 | When an agent purchase completes, the webhook moves `trial_end` to Tue, Jan 26, 2027, 9:00 am Central (15:00 UTC), with no proration. Your test 12. |
| The library's $197 from day 31 | The site's own checkout puts `library_upfront` and `membership_monthly` on one subscription with a 30-day trial. If your library Payment Link can only carry `library_upfront`, the webhook starts the $197 itself, 30 days out, on the saved card, or by emailed invoice when there is none. Tell Connor which you built. |
| The cohort's later $197 | The webhook creates a `membership_monthly` subscription trialing until May 3, 2027, on the card saved at checkout, but only for buyers who ticked its box. You create nothing for it. |
| Tag buyers in GHL | Done by the website. Please don't connect Stripe to GHL. |
| The $1 `smoke_test` | Recorded and ignored. It creates no order, account or tag. Its refund is ignored too. |

## 2. Exact spellings the code reads

**Lookup keys and price metadata:** exactly as in your section 5. The code asks Stripe for these six
keys and nothing else: `cohort_founding_full`, `cohort_founding_two_pay`, `library_upfront`,
`membership_monthly`, `agents_upto15_founding`, `agents_16to40_founding`.

**Payment Link metadata** (your section 6): `ai_plan`, `ai_option`, `origin` = `payment_link`,
`campaign` = `forum`. The webhook reads `ai_plan` and `ai_option` to know what was bought; a link
without them is recorded and ignored.

**Payment Link custom fields.** Stripe lets you set a *key* for each custom field, separate from its
label. The webhook reads them by key, so please use exactly these keys:

| Field (label as you word it) | Type | Key | Values |
| --- | --- | --- | --- |
| Company or team name | Text | `company` | |
| Which CRM does your team use? (cohort links) | Dropdown | `crm` | option values `follow_up_boss` and `other` (labels "Follow Up Boss" and "Other") |
| Number of agents (agent links) | Number | `agents` | |

The terms checkbox on the links is read too: a ticked box records that the buyer accepted
`/agreement`.

**After payment:** `https://www.amplifiedimpact.io/offer/welcome?session_id={CHECKOUT_SESSION_ID}`,
braces included. The page is built. Until it is deployed, keep Stripe's own confirmation page, as
your handoff says.

## 3. Webhook endpoint and key

- **URL:** `https://learn.amplifiedimpact.io/api/stripe/webhook`. The nine events in your section 7, no more.
- **API version:** the account default is fine. The code reads both the current shape (2025-03-31 and later) and the older one, so it works either way. Please still write the version in your report.
- **Answers:** 200 for an event it handled, or one it already handled. **400** for a bad signature. **503** while `STRIPE_WEBHOOK_SECRET` is not set in Railway (Stripe retries). **500** when handling failed (Stripe retries; the event's id is in the website's log). A 500 or 503 in your test 13 is worth reporting with its event id.
- **Restricted key `website-checkout`:** your section 7 list is what the code uses. The refund handler looks up which subscription a refunded payment belonged to through Invoices (read). If a joint test fails with a permission error, add only the permission it names, as you planned.

## 4. What to send back, and where it goes

| From you | To | Becomes |
| --- | --- | --- |
| Live Payment Link URLs, one per founding cart and the library | Connor (they are public) | Railway variables `PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY`, `PAYMENT_LINK_LIBRARY`, `PAYMENT_LINK_AGENTS_UPTO15`, `PAYMENT_LINK_AGENTS_16TO40`. The offer page shows them only when its own checkout is unavailable. |
| Test-mode URLs of the same links | Connor | The same variables in the staging environment, for the joint tests |
| Whether the library link has both prices | Connor | Nothing to change; it decides which path the webhook takes |
| The restricted key and the signing secret | Connor reveals them himself | `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Railway. Never in chat. |
| The endpoint's API version | Your report | |

Connor also sets `OFFER_OPEN=true` when the carts open. `FOUNDING_CLOSES_AT` defaults to
`2026-11-15T23:59:00-06:00`, the same instant you deactivate the founding links.

## 5. Joint tests (your section 10, 11 to 15), and what the website shows

Run these once Connor says the website is on the test key.

| # | You do | The website should show |
| --- | --- | --- |
| 11 | Buy two-pay through its link with `4242` | Within a minute: the subscription shows a cancellation date two months after the purchase, at the end of the month the second payment covers, and its metadata gains `order_id` |
| 12 | Buy an agent plan through its link | Within a minute: trial end is Jan 26, 2027, 15:00 UTC; the subscription's metadata gains `order_id` |
| 13 | Check every endpoint delivery | All 2xx. A 503 means the signing secret is not in Railway yet. |
| 14 | After-payment redirect on each link | `/offer/welcome` says "Confirming your payment", then within seconds "Welcome to the" and the plan's name |
| 15 | Buy a plan through `https://<test site>/forum` with `4242` | The PaymentIntent (cohort in full) or the subscription carries `ai_plan`, `ai_option`, `origin` = `offer`, `campaign` = `forum` and `order_id` |

Two more that need you and the website together, worth a minute each:

- **The library through the site** with `4242`: $2,000 charged today and a $197 subscription trialing 30 days (your test 3, through the site's checkout instead of the link).
- **A full refund of a test library purchase**: the website ends the plan and cancels the trialing $197, so the subscription shows as cancelled within a minute.

## 6. Not built yet on the website (nothing for you to do now)

- Opening the customer portal from the platform (later; until then, cancelling is by email to admin@amplifiedimpact.io, which the agreement says).
- Coupons for the library and VIP credits, cohort two's prices and the bootcamp: they come with their carts in January and March, as your handoff says.
