---
name: Quarterly Tax & Profit-First Set-Aside
description: >-
  Use when asked to compute a real estate agent's quarterly estimated-tax or
  profit-first set-aside from net commissions, remind them before IRS due
  dates, or propose a transfer into tax, profit, and operating buckets. Never
  give tax advice, never invent a tax rate, and never move money without the
  user's explicit approval that same conversation.
---

# Quarterly Tax & Profit-First Set-Aside

Goal: after each month's commissions (or ahead of an IRS estimated-tax date), show the user how much of their net has already been set aside for tax, profit, and operating reserves, and how much they still planned to move, using percentages they chose. This is bookkeeping support, not tax advice. The bot does not prepare Form 1040-ES and does not decide what they owe.

## Who it's for

Producing agents and team leads whose income arrives as commissions rather than a paycheck with withholding. Most useful for sole proprietors and LLC members who make quarterly estimates. S-corp owners can still use the profit-first buckets; payroll and reasonable-salary questions go to their CPA.

## What it connects to

- **QuickBooks Online connector**: Profit & Loss for the period (commission income, fee expense, owner draws), transfers to savings or tax accounts, and the balances of those accounts (name + last 4). Export a P&L and a transfer list if needed.
- **Google Drive / Sheets**: the set-aside tracker (opening balance, contributions, estimated-tax payments, remaining target).
- **Gmail (optional)**: CPA notes or reminders the user already received, never to scrape tax-return details they did not ask you to open.

This skill does not use expense reports.

## Guardrails

- **Read-only by default. Never move money.** Never transfer between accounts, never pay the IRS, never pay a state, never write a check, and never initiate an ACH.
- **A proposed transfer posts only if the user names it that conversation** ("transfer $X from operating …1842 to tax savings …3310"). Then do only that transfer and show the confirmation. A standing monthly "yes, always move the set-aside" is not enough.
- **Never invent a tax rate or an amount owed.** The user or their CPA supplies the set-aside percentages and any safe-harbor target. If they have not given a percentage, ask; do not default to 25%, 30%, or any other figure.
- **Never invent income numbers.** Pull them from QBO or from a figure the user typed. If QBO and their tracker disagree, show both.
- **Flag rather than guess** entity-level questions (S-corp payroll, state estimates, deductions). Point them to their CPA.
- **Last 4 only** on every account.
- **Not tax or legal advice.** Saying "your tracker calls for $X at your 30% remembered rate" is not the same as "you owe $X."
- **Trust funds stay out.** Never propose a set-aside from a trust or escrow account. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one** (including the IRS or their CPA) unless they approve a named draft.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories. Do not suggest a default tax percentage.

1. **Role and entity** as they describe it (sole prop, LLC, S-corp, partnership) without interpreting tax treatment. (memory: `bk.role`, `bk.entity_note`)
2. **Which QBO company?** Which account is operating, which is tax savings, which is profit, which is owners pay (if they use profit-first buckets)? Name + last 4. (memory: `bk.qbo_company`, `bk.set_aside_accounts`)
3. **Who sets the percentages, you or your CPA?** What percentages should I use for tax, profit, and operating reserve? If they do not know, ask them to get a figure from their CPA and leave the tax bucket as `not-set`. (memory: `bk.set_aside_rates`, `bk.rate_source`)
4. **What counts as "net commissions" for the formula?** Typical pattern to confirm, not to assume: commission income minus referral fees, franchise/brokerage fees, and team splits actually paid. Confirm their definition. (memory: `bk.set_aside_base`)
5. **Any already-known IRS or state estimated-tax payments this year**, and where they are recorded? (memory: `bk.estimates_paid`)
6. **CPA name**, if any. (memory: `bk.cpa_name`)
7. **Schedule?** Default suggestion: the 5th of each month at 9:00 AM in the user's timezone (after month-end numbers settle), plus an extra run 10 days before each federal quarterly due date. (memory: `bk.schedule`)

## Recommended routine

**Schedule:** Monthly on the 5th at 9:00 AM, and 10 days before each federal estimated-tax due date.

Federal estimated-tax installments for a calendar-year individual are generally due April 15, June 15, September 15, and January 15 of the following year (the next business day if the date falls on a weekend or legal holiday). Look up the live dates each run on IRS.gov (Form 1040-ES or the estimated-tax page) and do not rely on a remembered calendar if it might be stale.

**Cron (example, America/Chicago, monthly):** `0 9 5 * *`

**Optional reminder crons:** `0 9 5 4 *`, `0 9 5 6 *`, `0 9 5 9 *`, and `0 9 5 1 *` (the 5th of April, June, September, and January), which land about 10 days before the usual due dates.

**Routine prompt to save:**

```
Run @Quarterly Tax & Profit-First Set-Aside.

Use the remembered QuickBooks company, account nicknames (last 4 only), net-commission definition, and the set-aside percentages I (or my CPA) gave you. Do not invent a tax rate.

Compute this period's base, apply those percentages, subtract amounts already transferred to the tax / profit / reserve accounts, and show what is left to move. Look up the next IRS estimated-tax due date and how many days away it is.

Propose transfers as drafts. Do not move money, pay the IRS, or recategorize anything unless I explicitly approve a named transfer in that conversation.

If I have not set a tax percentage, ask for it and compute only the buckets I have set.
```

## Procedure

1. **Load memory.** If `bk.set_aside_rates` has no tax percentage, ask for it and continue only with buckets that are set.
2. **Look up the next federal (and, if they asked, state) estimated-tax due date.** State the source. Count days remaining.
3. **Compute the period base** from QBO using `bk.set_aside_base`. Show the math in the open (example shape only: commission income − referral fees − franchise fees − agent splits paid = base). If a line in that formula is missing or unclear, stop that line at blank and flag it.
4. **Apply remembered percentages** to the base. Show `base × rate = target` for each bucket.
5. **Subtract already-moved amounts** for the same period (and year-to-date, separately) by looking at transfers into the tax / profit / reserve accounts and any owner draws they asked to count. Show remaining-to-move per bucket. Never let a negative remaining turn into a "transfer back" suggestion unless they ask what the overage is.
6. **Year-to-date view.** Sum targets, transfers, and any recorded estimated-tax payments. If they gave a CPA safe-harbor or annual target, compare to it; if they did not, do not invent one.
7. **Propose transfers** (from operating to each bucket) as `TX-1`, `TX-2`, … with from-account last 4, to-account last 4, amount, and memo. Status `draft-only`.
8. **Save** `tax-profit-first-YYYY-MM-DD` and send the chat summary with an approval prompt for named transfers only.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Period covered and the definition of net commissions you used, with the arithmetic
- Remembered rates and who set them
- Target, already moved, remaining for each bucket
- Next IRS due date, source, and days remaining
- Proposed transfers (not executed)
- One line: "Bookkeeping support only, not tax or legal advice. This is not an amount you officially owe."

**Workbook sheets:**

1. `Summary`
2. `Base-calculation`
3. `Bucket-targets`
4. `Proposed-transfers`
5. `YTD-and-due-dates`
6. `Open-items`

## Sample output (EXAMPLE DATA ONLY)

The following income, percentages, and accounts are fictional examples. They are not this user's books and not a recommended tax rate.

**Chat summary (example)**

Quarterly Tax & Profit-First Set-Aside for October 2026 (example).

Base (from QBO, example definition: commission income − referral − franchise − splits paid):
- Commission income $42,150.00
- Referral fees $1,375.00
- Franchise fees $2,529.00
- Agent splits paid $8,940.00
- **Base = $29,306.00**

Remembered rates (set by the user on 2 Oct 2026, example, not advice): tax 30%, profit 10%, operating reserve 5%.

| Bucket | Math | Target | Already moved | Remaining |
| --- | --- | --- | --- | --- |
| Tax savings …3310 | $29,306.00 × 30% | $8,791.80 | $5,000.00 | $3,791.80 |
| Profit …2299 | $29,306.00 × 10% | $2,930.60 | $0.00 | $2,930.60 |
| Reserve …4402 | $29,306.00 × 5% | $1,465.30 | $0.00 | $1,465.30 |

Next federal estimated-tax date looked up for this example: 15 Jan 2027 (confirm on IRS.gov / Form 1040-ES on each live run). Days remaining depend on the day you run it.

Proposed, not executed:
- TX-1 $3,791.80 from operating …1842 to tax savings …3310
- TX-2 $2,930.60 from operating …1842 to profit …2299
- TX-3 $1,465.30 from operating …1842 to reserve …4402

Reply with the transfer IDs you want executed (for example, TX-1 only) and I will move only those.

Bookkeeping support only, not tax or legal advice. This is not an amount you officially owe.
