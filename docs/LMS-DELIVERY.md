# LMS delivery: what each purchase gives on learn.amplifiedimpact.io

Updated Nov 11, 2026 (DECISIONS.md D-106). The code is the source of truth: `packages/core/src/offer.ts`
(the catalog), `apps/api/src/billing/` (the webhook, provisioning and the access rule) and the end to end
tests in `apps/api/test/offer.test.ts` ("every offer, end to end").

## The path

1. A buyer pays on a Stripe Payment Link. Stripe sends `checkout.session.completed` to
   `https://learn.amplifiedimpact.io/api/stripe/webhook`. The webhook checks the signature, records the
   event once, and reads the link's metadata (`ai_plan`, `ai_option`, `billing`) into a cart.
2. The order is `paid`, or `trialing` when nothing was due today (the Agent Plan before Jan 4).
3. Provisioning finds the account by the buyer's email (lower case), or makes it: a team with the buyer
   as its Team Owner, an account, and one plan for the order. A second purchase by the same email lands
   on the same account and team. Seats and tier only ever go up.
4. The owner's invite (the `team-invite` email, a 7-day link) is held until `INVITES_FROM` (Mon, Nov 16,
   2026, 8:00 AM Central), then the billing loop sends it. After that day it goes at once. While the
   platform runs in fixture mode every invite is held.
5. Stripe sends the buyer to `/offer/welcome?session_id=...`. The page waits for the webhook, then shows
   the plan's name, what was charged, when the login arrives, the intake form and Manage Billing.
6. `/api/skills` (the `/skill-library` screen) opens each skill by one rule: free, or a plan that covers
   its set, has started (`starts_at`) and is paid through its release date.

## The offers

| Offer | Stripe metadata (`ai_plan` / `ai_option` / `billing`) | Lookup keys | Env var | LMS entitlement (plan kind, skill sets, seats) | Email (invite timing) | Unlock date | First charge / pin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Amplified AI Accelerator, in full | `cohort` / `full` / none | `cohort_founding_full`, `membership_monthly` | `PAYMENT_LINK_COHORT_FULL` | `cohort`, owner_ops and agent, 2 seats (owner and ops lead), cohort `dec26`, paid and live through May 4, 2027 | Invite held to Nov 16, then at once | At purchase | $7,500 today. `trial_end` pinned to 1809406800 (Tue, May 4, 2027): Amplified Insiders on the same subscription |
| Amplified AI Accelerator, two payments | `cohort` / `two_pay` / none | `cohort_founding_two_pay` | `PAYMENT_LINK_COHORT_TWO_PAY` | Same as in full | Same | At purchase | $3,750 today and in a month, then the installments end. A separate Insiders subscription trials to 1809406800 |
| Amplified Insiders, one year | `membership` / `year_upfront` / none | `membership_year_upfront`, `membership_monthly` | `PAYMENT_LINK_INSIDERS_YEAR` | `membership`, owner_ops, 2 seats, paid through day 365 | Same | At purchase | $1,997 today. The link's own 365-day trial, not pinned |
| Amplified Insiders, monthly | `membership` / `monthly` / none | `membership_monthly` | `PAYMENT_LINK_INSIDERS_MONTHLY` | `membership`, owner_ops, 2 seats, paid a month at a time, 3-month minimum (locked portal) | Same | At purchase | $197 today, then monthly. No pin |
| Amplified Team Plan, up to 15 agents | `agents` / `upto15` / `forum_prepay` | `agents_upto15_prepay3`, `agents_upto15_founding` | `PAYMENT_LINK_TEAM_UPTO15_PREPAY` | `agents`, agent, 16 seats (15 agents and the owner), paid through Apr 4, 2027 | Same | Logins at purchase, agent skills Dec 14, 2026 | $1,491 today. `trial_end` pinned to 1806814800 (Sun, Apr 4, 2027) |
| Amplified Team Plan, 16 to 40 agents | `agents` / `16to40` / `forum_prepay` | `agents_16to40_prepay3`, `agents_16to40_founding` | `PAYMENT_LINK_TEAM_16TO40_PREPAY` | `agents`, agent, 41 seats, paid through Apr 4, 2027 | Same | Logins at purchase, agent skills Dec 14, 2026 | $2,391 today. Pinned to 1806814800 |
| Amplified Agent Plan, monthly | `agent_plan` / `monthly` / none | `agent_plan_monthly` | `PAYMENT_LINK_AGENT_MONTHLY` | `agent_plan`, agent, 1 seat (the buyer, Agent tier), `trialing` and paid through nothing until the Jan 4 invoice is paid | Same | Login at purchase, agent skills Jan 4, 2027, once the first charge is paid | $79 on Jan 4, 2027. `trial_end` pinned to 1799042400 (Mon, Jan 4, 2027, 00:00 Central) |
| Amplified Agent Plan, yearly | `agent_plan` / `yearly` / none | `agent_plan_yearly` | `PAYMENT_LINK_AGENT_YEARLY` | Same, paid a year at a time | Same | Same | $790 on Jan 4, 2027. Pinned to 1799042400 |

Every link also carries `origin` = `payment_link`, and the Forum links `campaign` = `forum`. A Team Plan
session without `billing` = `forum_prepay` is from an older link: recorded, logged, not provisioned.
The webhook pins only a date still ahead, since Stripe refuses a past `trial_end`.

## After the purchase

| Event | What the LMS does |
| --- | --- |
| `invoice.paid` | One more payment. The plan is `active` and paid through the invoice's period (never past a pin on a first invoice with a trial line). The Agent Plan's Jan 4 invoice is what opens its skills |
| `invoice.payment_failed` | The plan is `past_due`, the buyer is tagged `payment-failed`. Access already paid for stays; the Agent Plan's first charge failing opens nothing |
| Cancel (`customer.subscription.deleted`) | Cancel and keep: `paid_through` stays, live sessions end with the paid period, the buyer is tagged `membership-ended`. A plan cancelled inside a minimum is logged for Connor |
| Full refund (`charge.refunded`) | The plan ends with its access, its subscriptions are cancelled, the buyer is tagged `refunded`. A refunded Accelerator frees its seat |
| Accelerator roll-on | May 4, 2027: the first $197 Insiders invoice carries the Accelerator plan a month on (both sets, live sessions). Cancelling Insiders before then keeps the Accelerator to May 4. A buyer who already holds Insiders is not enrolled twice |

## GHL buyer tags

`offer-buyer`, `plan-<kind>` (`plan-cohort`, `plan-membership`, `plan-agents`, `plan-agent-plan`), then
how they pay: `pay-full`, `pay-two`, `pay-year` (Insiders' year), `pay-monthly` (Insiders or the Agent
Plan monthly), `pay-yearly` (the Agent Plan yearly). Follow-ups add `payment-failed`, `membership-ended`,
`refunded` and `event-forum-nov-2026`. New in D-106: `plan-agent-plan` and `pay-yearly`.

D-134 adds marketing aliases beside those, which stay as they are: `ai-buyer-accelerator`,
`ai-buyer-insiders`, `ai-buyer-agent-plan` and `ai-buyer-team-plan` (one per plan bought),
`ai-refunded` beside `refunded`, `ai-canceled` beside `membership-ended`, `ai-lead-free-skills` on a
sign-up for any of the five free skills, and `lms-logged-in` after a learner's first sign-in. The
README's "GoHighLevel" section has the rest.

## The solo agent

An Agent Plan buyer is the Team Owner of a team of one, at Agent tier. The account model needs a team:
the plan reaches the buyer's login through it, and Manage Billing belongs to the account's owner. Agent
tier means no Team Hub (the owner view is the Team Plan's). Their skills come from the plan, which opens
the agent set. A buyer who also holds a Team tier plan stays Team tier.

## Not delivered yet

- **Agent coaching.** No coaching sessions exist in the LMS. The portal lists cohort `dec26`'s builds
  to every buyer (all are placed in that cohort), and the join route checks the tier, not the plan.
- **The $37 single skill.** No cart, price or lookup key exists.
- **The Team Plan's seats in the Team Hub.** Built (D-081, D-120): the owner adds up to the plan's 15
  or 40 Sales Agents (`seatCaps`; an operations lead, if added, takes one of those seats). Still no
  skill usage view for owners.
- **An agent already on a team** who buys the Agent Plan is recorded and paid but not provisioned
  (`member-of-another-team`): staff sort it out.
- **Fixture-exact tests.** The sessions in the tests follow the metadata contract above, not Stripe
  sandbox objects. Ampy's sandbox Payment Links or `stripe-log.md` would let them match exactly.
