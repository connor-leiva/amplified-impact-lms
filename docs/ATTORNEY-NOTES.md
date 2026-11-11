# Questions for the attorney: the Subscription Agreement

Prepared 2026-11-11 for the attorney's review. Nothing here changes `/agreement`
(`apps/web/src/legal/agreement.ts`, version `2026-11-12`); only the attorney's wording does. Each item
quotes the agreement exactly, then says what the website, the thank-you page and the checkout say
today.

## 1. The Amplified Agent Plan and "30 days' notice"

**The agreement, Section 5 ("Cancelling, and What You Keep"):**

> You can cancel a monthly membership yourself, at any time, in the billing portal linked from your
> Skill Library page, with 30 days’ notice. Cancelling stops the next charge. Your plan stays open to
> the end of the period you paid for.

**The Agent Plan everywhere else:**

- **Price and first charge:** $79 a month or $790 a year. Nothing is charged until Monday, January 4, 2027.
- **The Agent Plan page and the pricing page:** "Cancel anytime."
- **The thank-you page after checkout:** "$79 a month, or $790 a year. Cancel anytime." and "If you
  cancel, you keep what you’ve downloaded."
- **Manage Billing:** opens Stripe's billing portal with cancelling **on** for the Agent Plan. It has
  no minimum term. Cancelling stops the next charge, and the plan stays open to the end of the paid
  period.

**Why it matters:** the agreement has **no Agent Plan section**. Section 2 lists the Amplified Skill
Library, the Amplified AI Accelerator, Amplified Insiders and the Amplified Team Plan. So an Agent
Plan buyer on monthly billing could read Section 5's "with 30 days’ notice" as applying to them,
while every other page says "Cancel anytime."

**Questions:**

1. Does Section 5's 30 days' notice apply to the Agent Plan? If not, should the agreement say so?
2. Should Section 2 have an Agent Plan entry, and Section 3 its charges: $79 a month or $790 a year,
   first charge January 4, 2027, cancel anytime, keep what was downloaded?

## 2. Other lines that no longer match the offer (for the same review)

These come from the same comparison. They are listed so one review can cover them; none was changed.

| The agreement says | The site and checkout say today |
| --- | --- |
| Accelerator: "eight weekly live builds for cohort one starting Tuesday, December 1, 2026" | Builds are Wednesdays at 1:00 PM Central, starting **Wednesday, December 2, 2026** |
| Insiders after the Accelerator: "starting Monday, May 3, 2027 for cohort one" | "starting **Tuesday, May 4, 2027**" (the date Stripe is set to) |
| Team Plan: "Nothing today. The monthly price starting Tuesday, January 26, 2027" | "Today covers your first 3 months, January 4 to April 3, 2027." Monthly billing starts **Sunday, April 4, 2027** |
| Team Plan minimum: "three monthly payments, starting January 26, 2027", cancel before the third payment by writing to the contact address | The first three months are paid at checkout, and the plan carries no separate minimum after them |
| "Amplified Skill Library": "the library price today, then the monthly membership starting on day 31" | That product is retired. It is now **Amplified Insiders**: $1,997 a year, or $197 a month with a 3-month minimum |

`docs/SPRING-PLAN.md` ("Agreement conflicts") lists the earlier set of these from Spring's plan.

## Not a question

The contact address for legal notices stays `admin@amplifiedimpact.io` on `/agreement`, `/terms` and
`/privacy`, so all three match (Ampy, 2026-11-11). Customer support on the site is
`support@amplifiedimpact.io`.
