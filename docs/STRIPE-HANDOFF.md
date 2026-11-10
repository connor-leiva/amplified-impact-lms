# Stripe: what the website expects from Grokbok

Updated Nov 10, 2026 · for Grokbok, from the website team · goes with *Stripe Setup: Handoff for Grokbok* (Nov 9) and the Stripe-side billing requirements (Nov 10)

The website's side of the Stripe contract is on `main` (D-073 to D-082). This page lists what the code
does, so you don't build it twice, the exact spellings it reads, the settings Connor puts in Railway,
and the joint tests. Nothing here changes a price, an amount or anything a customer sees.

## 1. What the website does, so you don't build it

| Plan | What the website does |
| --- | --- |
| **Amplified AI Accelerator, paid in full** | Its own checkout opens one subscription with `cohort_founding_full` (charged today) and `membership_monthly` trialing with `trial_end` = `1809320400` (Monday, May 3, 2027, 00:00 Central), `payment_method_collection` = `always`. After a paid purchase from the site or the Payment Link, the webhook pins the subscription's `trial_end` to exactly `1809320400` (no proration), so a link's relative `trial_period_days` can never land on the wrong day. Amplified Insiders is that subscription. |
| **Amplified AI Accelerator, two payments** | The installments stay their own subscription (`cohort_founding_two_pay` only). On the **second paid invoice** the webhook sets `cancel_at_period_end` = `true`, which keeps the second charge and prevents a third. For every paid two-pay purchase, site or link, it creates a **separate** Insiders subscription: `membership_monthly`, `trial_end` = `1809320400`, the card from the installment subscription, metadata `ai_plan` = `membership`, `ai_option` = `monthly`, `origin`, `campaign`, `source_plan` = `cohort`, `source_option` = `two_pay`, `source_session` = the Checkout Session id, idempotency key `membership-autoroll-<checkout session id>`. It skips the customer who already has an active or trialing `membership_monthly` subscription, so a retried webhook never enrolls anyone twice. Ending the installments never takes away Accelerator or Insiders access. |
| **Amplified Skill Library** | `library_upfront` plus `membership_monthly` with `trial_period_days` = `30` (the $197 on day 31). That is correct for the library and is not the May 3 date. If a library link can only carry `library_upfront`, the webhook starts the $197 itself, 30 days out. |
| **Amplified Team Plan** | `trial_end` = `1800943200` (Tuesday, Jan 26, 2027, 00:00 Central) at checkout, and the webhook pins a Payment Link's trial to exactly that instant (no proration). The 3-month minimum is a contract term: see section 4. |
| **Buyer tags in GHL** | Done by the website. Please don't connect Stripe to GHL or QuickBooks. |
| **The $1 `smoke_test`** | Recorded and ignored, refund included. |

The website never passes `payment_method_types` (cards and wallets stay dynamic), never turns on
`automatic_tax` (David decides), and never puts a trial on a Price.

## 2. Exact spellings the code reads

**Lookup keys:** `cohort_founding_full`, `cohort_founding_two_pay`, `library_upfront`,
`membership_monthly`, `agents_upto15_founding`, `agents_16to40_founding`. Nothing else.

**Payment Link metadata:** `ai_plan`, `ai_option`, `origin` = `payment_link`, `campaign` = `forum`, on
the link and on `subscription_data`. A link without `ai_plan` and `ai_option` is recorded and ignored.

**Payment Link custom fields.** The webhook reads each by key, with fallbacks, then by a word in its
label:

| Field | Keys the code accepts | Values |
| --- | --- | --- |
| Company or team name | `company_or_team_name` (the live test links), `company`, `team_name` | text |
| Which CRM does your team use? | `crm`, `which_crm`, `which_crm_does_your_team_use` | `followupboss`, `follow_up_boss` or `fub` read as Follow Up Boss; anything else is "other" |
| Number of agents | `agents`, `number_of_agents`, `agent_count` | a number |

**Please tell Connor the agents field's exact key on the live agent links.** The website could not read
the Stripe account to check it. Any of the keys above works, and a label containing "agents" also works.

**After payment:** `https://www.amplifiedimpact.io/offer/welcome?session_id={CHECKOUT_SESSION_ID}`.

## 3. Webhook, keys and Railway settings

- **Endpoint:** `https://learn.amplifiedimpact.io/api/stripe/webhook`, the nine events already on
  `we_1Ua95OLxFcHWRPVcBPkZysAu`. After the deploy, confirm the next test event shows a successful
  delivery. A 503 means `STRIPE_WEBHOOK_SECRET` is not in Railway yet; a 500 carries an event id in the
  website's log and Stripe retries it.
- **Restricted key `website-checkout`:** the section 7 permissions, **plus Customer portal: Write**, so
  the platform's Manage Billing button can open a portal session. Without it, the button falls back to
  the portal login page.
- **Railway variables Connor sets** (none of them is a secret except the first two):

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | the restricted key, pasted by Connor |
| `STRIPE_WEBHOOK_SECRET` | the endpoint's signing secret, pasted by Connor |
| `STRIPE_PORTAL_LOGIN_URL` | the portal login page, e.g. `https://billing.stripe.com/p/login/test_cNidRa4SweAI39X3mocEw00` in test mode |
| `STRIPE_PORTAL_CONFIG_LOCKED` | the id (`bpc_…`) of a second portal configuration with `subscription_cancel` off (section 4) |
| `PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY`, `PAYMENT_LINK_LIBRARY`, `PAYMENT_LINK_AGENTS_UPTO15`, `PAYMENT_LINK_AGENTS_16TO40` | the fallback links |

## 4. The billing portal and the commitments

Members cancel themselves in the portal, at period end, with 30 days' notice, and keep every skill
already released. The platform's **Manage Billing** button opens a portal session for the account's
owner.

The default portal configuration (`bpc_1Ua95PLxFcHWRPVcr16wkYQM`) lets anyone cancel any subscription.
Two buyers must not cancel early: a two-pay buyer before the second payment, and a Team Plan inside its
3-month minimum. So:

- **Please create a second portal configuration with `subscription_cancel` off** and send Connor its
  `bpc_…` id for `STRIPE_PORTAL_CONFIG_LOCKED`. Manage Billing opens that configuration for those two
  buyers and the default one for everyone else.
- The public login URL always opens the default configuration; Stripe cannot hide the cancel button per
  product there. A Team Plan cancelled inside its minimum still owes the remaining payments under the
  agreement (section 4 of `/agreement`); the website logs it for Connor to follow up.

## 5. Live Payment Link trials

Payment Links take only a relative `trial_period_days`. Recalculate it on the morning you create or
update each live link (your table: 172 to 169 for Insiders, 75 to 72 for the Team Plan, Nov 12 to 15).
The webhook pins every purchase to the fixed dates anyway, so a buyer who pays a day after the link was
last updated still hits May 3 or Jan 26.

**Until the webhook is deployed and accepting signed events, the two-pay link bills $3,750 every month
and never starts Insiders.** Don't send buyers to it before the first successful delivery.

## 6. Joint tests, and what the website should show

| # | You do | The website should show |
| --- | --- | --- |
| 11 | Buy two-pay through its link with `4242` | Within a minute, a second subscription for `membership_monthly`, trialing to May 3, 2027, with `source_session` set. After the second paid invoice (test clock), the installment subscription shows `cancel_at_period_end`. |
| 11b | Buy the Accelerator in full through its link | Within a minute, `trial_end` on its subscription is exactly `1809320400` |
| 12 | Buy a Team Plan through its link | Within a minute, `trial_end` is exactly `1800943200`, and the metadata gains `order_id` |
| 13 | Every endpoint delivery | All 2xx |
| 14 | After-payment redirect on each link | `/offer/welcome` says "Confirming your payment", then "Welcome to the" and the plan's name |
| 15 | Buy a plan through `/forum` with `4242` | The subscription carries `ai_plan`, `ai_option`, `origin` = `offer`, `campaign` = `forum` and `order_id` |
| 16 | Manage Billing as a two-pay buyer before payment 2 | The portal opens with no cancel button (once the locked configuration exists) |
