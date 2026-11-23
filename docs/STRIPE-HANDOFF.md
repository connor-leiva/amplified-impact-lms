# Stripe: what the website expects from Grokbok

Updated Nov 23, 2026 for Connor's prices (D-240): Agent Plan monthly $117 with a 3-month minimum, Team Leader Insiders $169, and Amplified Insiders for Agents $79. The Nov 11 notes for Ampy's Stripe update (D-104) and the Amplified Agent Plan (D-106) still stand where this page does not replace them.

The website's side of the Stripe contract (D-073 to D-082, D-104, D-106). What each purchase gives in
the platform, offer by offer, is in `docs/LMS-DELIVERY.md`. This page lists what the code
does, so you don't build it twice, the exact spellings it reads, the settings in Railway, and the
joint tests. Nothing here changes a price, an amount or anything a customer sees. Since D-104 every
plan is bought through its Payment Link: the site's own checkout (`POST /api/checkout`) answers 410.

## 1. What the website does, so you don't build it

| Plan | What the website does |
| --- | --- |
| **Amplified AI Accelerator, paid in full** | The link opens one subscription with `cohort_founding_full` (charged today) and `membership_monthly_team_leader` ($169) trialing. After a paid purchase the webhook pins the subscription's `trial_end` to exactly `1809406800` (Tuesday, May 4, 2027, 00:00 Central; no proration), so a link's relative `trial_period_days` can never land on the wrong day. Amplified Insiders is that subscription. A subscription already on `membership_monthly` ($197) is not changed. |
| **Amplified AI Accelerator, two payments** | The installments stay their own subscription (`cohort_founding_two_pay` only). On the **second paid invoice** the webhook sets `cancel_at_period_end` = `true`, which keeps the second charge and prevents a third. For every paid two-pay purchase it creates a **separate** Insiders subscription: `membership_monthly_team_leader` ($169), `trial_end` = `1809406800`, the card from the installment subscription, metadata `ai_plan` = `membership`, `ai_option` = `monthly`, `origin`, `campaign`, `source_plan` = `cohort`, `source_option` = `two_pay`, `source_session` = the Checkout Session id, idempotency key `membership-autoroll-<checkout session id>`. It skips the customer who already has an active or trialing `membership_monthly_team_leader` or `membership_monthly` subscription, so a retried webhook never enrolls anyone twice and a buyer already on $197 is left on $197. Ending the installments never takes away Accelerator or Insiders access. |
| **Amplified Insiders, one year** | `membership_year_upfront` ($1,997, charged today) plus `membership_monthly_team_leader` ($169) on the link's 365-day trial: one year, then $169 a month until cancelled. No pin: the 365 days are the link's own. The plan is paid through day 365. Metadata `ai_plan` = `membership`, `ai_option` = `year_upfront`. A year subscription already scheduled onto `membership_monthly` ($197) is not changed. |
| **Amplified Insiders, monthly, For Team Leaders** | `membership_monthly_team_leader` ($169) from today, `ai_option` = `monthly`. A 3-month minimum: Manage Billing opens the locked portal configuration until month 3 (section 4). Replaces $197 for new buyers. |
| **Amplified Insiders for Agents** | `insiders_agent_monthly` ($79) from today on product `prod_VgSPRo9GzYscnF`, price `price_1Uf5UyLAuFJaUU8qo0ewLodu`. Metadata `ai_plan` = `insiders_agent`, `ai_option` = `monthly`. One login, agent skills at once, weekly office hours, no weekly live training, a 3-month minimum. No pinned first charge. |
| **Amplified Team Plan** | `agents_upto15_prepay3` ($1,491) or `agents_16to40_prepay3` ($2,391) today with `agents_upto15_founding` / `agents_16to40_founding` trialing; the webhook pins `trial_end` to exactly `1806814800` (Sunday, Apr 4, 2027, 00:00 Central; no proration). The links carry `ai_option` = `upto15` / `16to40` **and `billing` = `forum_prepay`**; a Team Plan session without it is recorded and not provisioned. The plan is paid through Apr 3; logins open at purchase, agent skills on Dec 14. The 3-month minimum is paid up front, so nothing is locked. |
| **Amplified Agent Plan** (D-106, D-240) | `agent_plan_monthly_117` ($117 a month) or `agent_plan_yearly` ($790 a year) on product `prod_VbjbJ10HdX1QqW`, sold on a trial with nothing due today. The webhook pins `trial_end` to exactly `1799042400` (Monday, Jan 4, 2027, 00:00 Central; no proration), only while that date is ahead. Metadata `ai_plan` = `agent_plan`, `ai_option` = `monthly` or `yearly`, no `billing`. The buyer gets one login at once; the plan is `trialing` and opens the agent skills on Jan 4, once the Jan 4 invoice is paid. The monthly plan has a 3-month minimum counted from that first charge, so a trial buyer cannot cancel in the portal until April 4, 2027. Yearly has no minimum. Members already on `agent_plan_monthly` ($79) stay on it, with no minimum added. A checkout that charges before Jan 4 means a link lost its trial: it is provisioned and logged for Connor. |
| **Amplified Skill Library** | Retired (D-104). No cart sells it; `library_upfront` is not read. |
| **AI Accelerator seats** | 15 across both links together, counted from paid orders (a refund frees one). At 15 the offer page hides both links and shows the waitlist, the log says "AI Accelerator sold out", and the website turns **both** Payment Links off through the API, with a waitlist line and metadata `ai_soldout=1` (D-154). A refund back under 15 turns on only a link it turned off, and only while `OFFER_OPEN` is on and founding prices sell. A link turned off by hand stays off. Each link's own limit of 15 stays as a backstop. |
| **Buyer tags in GHL** | Done by the website. Please don't connect Stripe to GHL or QuickBooks. |
| **The $1 `smoke_test`** | Recorded and ignored, refund included. |

The website never passes `payment_method_types` (cards and wallets stay dynamic), never turns on
`automatic_tax` (David decides), and never puts a trial on a Price.

## 2. Exact spellings the code reads

**Lookup keys:** `cohort_founding_full`, `cohort_founding_two_pay`, `membership_year_upfront`,
`membership_monthly`, `membership_monthly_team_leader`, `agents_upto15_prepay3`, `agents_16to40_prepay3`,
`agents_upto15_founding`, `agents_16to40_founding`, `agent_plan_monthly`, `agent_plan_monthly_117`,
`agent_plan_yearly`, `insiders_agent_monthly`. `membership_monthly` and `agent_plan_monthly` stay so a
subscription already on them still reads. New rollovers and new monthly carts use the $169 and $117 keys.

**Payment Link metadata:** `ai_plan`, `ai_option`, `origin` = `payment_link`, `campaign` = `forum`, and
on the Team Plan links `billing` = `forum_prepay`, on the link and on `subscription_data`. A link
without `ai_plan` and `ai_option` is recorded and ignored. The Agent Plan's links say `ai_plan` =
`agent_plan` (never `agents`, which is the Team Plan) and `ai_option` = `monthly` or `yearly`, with no
`billing`.

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
  the portal login page. **Plus Payment Links: Read and Write** (D-154, live and test), so the 15-seat
  cap can turn the two AI Accelerator links off and on. Without them the log says "Stripe refused
  (403)" once an hour and the cap retries every minute; the offer page still hides the buttons.
- **Railway variables Connor sets** (none of them is a secret except the first two):

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | the restricted key, pasted by Connor |
| `STRIPE_WEBHOOK_SECRET` | the endpoint's signing secret, pasted by Connor |
| `STRIPE_PORTAL_LOGIN_URL` | the portal login page, e.g. `https://billing.stripe.com/p/login/test_cNidRa4SweAI39X3mocEw00` in test mode |
| `STRIPE_PORTAL_CONFIG_LOCKED` | the id (`bpc_…`) of a second portal configuration with `subscription_cancel` off (section 4) |
| `PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY` | the AI Accelerator's two links |
| `PAYMENT_LINK_INSIDERS_YEAR`, `PAYMENT_LINK_INSIDERS_MONTHLY` | Amplified Insiders' two links |
| `PAYMENT_LINK_TEAM_UPTO15_PREPAY`, `PAYMENT_LINK_TEAM_16TO40_PREPAY` | the Team Plan's two prepay links. `PAYMENT_LINK_LIBRARY` and `PAYMENT_LINK_AGENTS_*` are no longer read |
| `PAYMENT_LINK_AGENT_MONTHLY`, `PAYMENT_LINK_AGENT_YEARLY` | the Amplified Agent Plan's two links (D-106). Monthly is the $117 link. The code reads only these names, never a URL |
| `PAYMENT_LINK_INSIDERS_AGENT_MONTHLY` | Amplified Insiders for Agents, $79 a month (D-240) |

## 4. The billing portal and the commitments

Members cancel themselves in the portal, at period end, with 30 days' notice, and keep every skill
already released. The platform's **Manage Billing** button opens a portal session for the account's
owner.

The default portal configuration (`bpc_1Ua95PLxFcHWRPVcr16wkYQM`) lets anyone cancel any subscription.
These buyers must not cancel early: a two-pay buyer before the second payment, an Amplified Insiders
monthly member (Team Leader or Agent) inside the 3-month minimum, and an Agent Plan monthly member
inside the 3-month minimum counted from the first paid charge (April 4, 2027 for a trial buyer). A
grandfathered $79 Agent Plan has no minimum. The Team Plan's minimum is paid at checkout. So:

- **Please create a second portal configuration with `subscription_cancel` off** and send Connor its
  `bpc_…` id for `STRIPE_PORTAL_CONFIG_LOCKED`. Manage Billing opens that configuration for those two
  buyers and the default one for everyone else.
- The public login URL always opens the default configuration; Stripe cannot hide the cancel button per
  product there. A plan cancelled inside its minimum still owes the remaining payments; the website
  logs it for Connor to follow up.

## 5. Live Payment Link trials

Payment Links take only a relative `trial_period_days`. The webhook pins every AI Accelerator-in-full,
Team Plan and Agent Plan purchase to the fixed dates (May 4, Apr 4 and Jan 4, 2027), so a buyer who pays
a day after the link was last updated still hits them. It needs `STRIPE_SECRET_KEY` to do so. Insiders'
365 days are not pinned. A pin already past is skipped: an Agent Plan bought after Jan 4 keeps whatever
its link sells.

**Until the webhook is deployed and accepting signed events, the two-pay link bills $3,750 every month
and never starts Insiders.** Don't send buyers to it before the first successful delivery.

## 6. Joint tests, and what the website should show

| # | You do | The website should show |
| --- | --- | --- |
| 11 | Buy two-pay through its link with `4242` | Within a minute, a second subscription for `membership_monthly`, trialing to May 4, 2027, with `source_session` set. After the second paid invoice (test clock), the installment subscription shows `cancel_at_period_end`. |
| 11b | Buy the Accelerator in full through its link | Within a minute, `trial_end` on its subscription is exactly `1809406800` |
| 12 | Buy a Team Plan through its link | Within a minute, `trial_end` is exactly `1806814800`, and the metadata gains `order_id` |
| 12b | Buy Insiders for a year, then monthly | Each makes an account with an Amplified Insiders plan; the monthly one's Manage Billing opens the locked configuration |
| 13 | Every endpoint delivery | All 2xx |
| 14 | After-payment redirect on each link | `/offer/welcome` says "Confirming your payment", then "Welcome to the" and the plan's name |
| 15 | Buy a plan through its link from `/forum` with `4242` | The subscription carries `ai_plan`, `ai_option`, `origin` = `payment_link` and `order_id` |
| 16 | Manage Billing as a two-pay buyer before payment 2 | The portal opens with no cancel button (once the locked configuration exists) |
| 17 | Buy the Agent Plan, monthly then yearly, through its links with `4242` | Nothing charged today. Within a minute, `trial_end` is exactly `1799042400` and the metadata gains `order_id`; `/offer/welcome` says "Amplified Agent Plan" and "Nothing is charged until Monday, January 4, 2027". With a test clock past Jan 4, the $117 or $790 invoice is paid and the agent skills open. Monthly Manage Billing stays locked until April 4, 2027. |
