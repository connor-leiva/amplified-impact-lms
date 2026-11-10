---
name: Weekly Card & Bank Audit
description: >-
  Use when asked to audit a real estate agent's or team's business credit card
  or bank feed against QuickBooks Online: match charges to the books, flag
  uncategorized or duplicate transactions, separate personal vs business spend,
  find missing receipts in Gmail, and propose categories on a real estate chart
  of accounts. Do not use for employee expense-report audits; this skill does
  not require or look for expense reports.
---

# Weekly Card & Bank Audit

Goal: give an agent, team leader, or ops lead a short, dollar-ranked list of bookkeeping exceptions on their cards and operating accounts each week, plus proposed categories they can approve. This is bookkeeping support, not an expense-report review. Most real estate teams never file expense reports; compare the card and bank activity directly to QuickBooks Online (QBO).

## Who it's for

Real estate agents, team leaders, and ops leaders whose operating books live in QuickBooks Online. Useful whether the user is a solo agent with one card or a team with several cards and an operating checking account.

## What it connects to

- **QuickBooks Online connector**: bank and card feed transactions, registers, uncategorized income/expense, chart of accounts, classes or locations if they use them. If the connector cannot list a feed, export Transaction Detail by Account or a CSV from QBO.
- **Gmail**: search for merchant receipts and invoices (PDFs and images) that match unmatched charges.
- **Browser**: card or bank portals (Amex, Chase, Capital One, and similar) only when the QBO feed looks incomplete or a charge is missing from QBO. Ask the owner to complete any sign-in or one-time code.
- **Google Drive / Sheets**: save the dated workbook and, if they already keep a receipt folder, check there too.

Do not require Ramp, Brex, Expensify, Coupa, or any expense-report tool. If the user happens to have one, ignore it unless they explicitly ask to include it.

## Guardrails

- **Read-only by default.** Never recategorize, match, accept, exclude, or edit a transaction in QBO. Never post a journal entry. Never move money, pay a card, or transfer between accounts.
- **Write actions need fresh approval every time.** If the user later says "go ahead and categorize these," apply only the lines they named, then stop and show what changed. Do not treat a past "yes" as standing permission.
- **Never invent numbers.** If an amount, date, or merchant is unreadable, leave it blank and flag it.
- **Flag rather than guess.** When two sources disagree, show both sides. When a category is unclear, propose one and mark it `proposed`, never `applied`.
- **Last 4 only.** Never put full card or bank account numbers in chat, email, a sheet, or a screenshot. Use the account name plus the last four digits.
- **No secrets, no TINs, no card PANs.** Never paste login passwords, verification codes, or government IDs into chat or files.
- **Minimize personal details.** Merchant and amount are enough. Do not copy client names, phone numbers, or addresses off a receipt into the report unless they are required to identify the charge.
- **Not tax or legal advice.** Category suggestions are bookkeeping hints. The user or their CPA decides what is deductible.
- **Trust funds stay out of this skill.** If a charge or deposit looks like earnest money or a trust-account item, flag it and point the user to the Trust & Earnest Money Watch skill. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.** Do not email merchants, agents, or the CPA.

## Setup questions (ask once, then remember)

Ask these one at a time on the first run. Save the answers as memories under the keys below, and reuse them every week. If a memory is missing later, ask only for that gap.

1. **What should I call you, and what's your role?** (agent, team leader, ops, bookkeeper) (memory: `bk.role`, `bk.display_name`)
2. **Which QuickBooks Online company should I use?** (memory: `bk.qbo_company`)
3. **Which cards and operating bank accounts should I watch?** Name plus last 4 only. Exclude trust or escrow accounts. (memory: `bk.operating_accounts`)
4. **What does personal vs business look like on these cards?** Examples: a spouse's name on a charge, known personal merchants, a home-improvement store used for both. (memory: `bk.personal_rules`)
5. **Is there a receipt threshold?** (for example: keep a receipt above $75; always keep one for client gifts and meals) (memory: `bk.receipt_threshold`)
6. **Which Gmail account and subject/sender patterns hold receipts?** Any shared Drive receipt folder? (memory: `bk.receipt_sources`)
7. **Do you track classes or locations in QBO** (by agent, by team, by property)? (memory: `bk.qbo_classes`)
8. **Any category pitfalls we should watch?** (coaching vs education, client gifts vs meals, lead-gen platforms coded to "advertising," auto vs travel) (memory: `bk.category_pitfalls`)
9. **Who should receive the weekly summary?** Chat only, or also email / Slack / a shared Sheet. (memory: `bk.report_destination`)
10. **What timezone and weekday should the weekly run use?** Default suggestion: Monday 8:00 AM in the user's timezone, so weekend card postings have landed. (memory: `bk.schedule`)

Also remember a **chart of accounts mapping** (`bk.coa_map`) from common real estate spend to their actual QBO accounts. Build it from their QBO chart on the first run, then confirm:

| Common spend | Typical QBO account to propose (confirm theirs) |
| --- | --- |
| Zillow, Realtor.com, OpCity, Homes.com | Lead generation / advertising |
| Facebook, Instagram, Google Ads | Lead generation / advertising |
| Photography, video, drone, listing copy | Marketing production |
| Signs, riders, postcaps, print flyers | Signs and print |
| Lockbox, Supra, SentriLock | Lockboxes and showing tools |
| Showami or showing services | Showing services |
| MLS, board, NAR, association dues | Dues and memberships |
| E&O, general liability, cyber | Insurance |
| Brokerage desk fee, franchise fee, brand fee | Brokerage and franchise fees |
| Transaction coordinator | Transaction coordination |
| CRM, Follow Up Boss, Lone Wolf, Dotloop | Software and technology |
| Coaching, masterminds, courses | Coaching and education |
| Client gifts, closing gifts | Client gifts |
| Meals with clients or partners | Meals (separate from gifts) |
| Gas, tolls, car wash, mileage apps | Auto and travel |
| Staging rental or staging consult | Staging |
| Referral fees paid to other agents | Referral fees paid |

If an account does not exist in their chart, propose creating it; do not create it.

## Recommended routine

**Schedule:** Weekly, Monday at 8:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 8 * * 1`

**Routine prompt to save:**

```
Run @Weekly Card & Bank Audit for this real estate team.

Cover activity since the last successful run, with a 7-day overlap so nothing at the boundary is missed. Use the remembered QuickBooks company, operating cards and bank accounts (name + last 4 only), personal-vs-business rules, receipt threshold, and chart-of-accounts mapping.

Pull the card and bank feeds from QuickBooks Online. If a feed looks incomplete, open that card or bank portal in the browser (owner completes any sign-in) or export a CSV.

Search Gmail (and the remembered Drive folder) for receipts that match unmatched or uncategorized charges.

Produce the dated workbook and a short chat summary ranked by dollar impact. Propose categories; do not recategorize, match, or move money unless I explicitly approve specific lines in that conversation.

If nothing is new, send one line saying the week is clean and attach the workbook anyway.
```

## Procedure

1. **Load memory.** Read the remembered company, accounts, rules, mapping, last-run date, and open items. If setup is incomplete, ask only the missing questions before continuing.
2. **Set the window.** From the last successful run through today, plus 7 days of overlap. On the first run, use the last 30 days and say so.
3. **Pull QBO activity** for each watched card and operating bank account: date, merchant/payee, amount, QBO category (or Uncategorized), cleared status, memo, class/location, and QBO transaction id. Note any account whose bank feed has not refreshed in more than 3 days.
4. **Optional portal check.** If the feed looks stale or a known statement balance disagrees with QBO, open the card or bank portal (owner completes sign-in) and compare recent posted transactions to QBO. Record gaps as `missing-from-QBO`. Never store a full account number.
5. **Forward match (card/bank → QBO).** Each posted card or bank charge should appear in QBO with the same amount and a date within a few days. Mark:
   - `matched`: same amount, plausible date, same merchant family
   - `uncategorized`: in QBO but sitting in Uncategorized Expense/Income or asking to be reviewed
   - `missing-from-QBO`: on the card or bank, not in QBO
   - `amount-mismatch`: same merchant and date, different amount
   - `possible-duplicate`: same merchant and amount twice within 14 days
6. **Reverse check (QBO → card/bank).** List operating outflows in QBO on those accounts that have no matching posted charge. Skip transfers between owned operating accounts, credit-card payments, payroll, loan payments, and owner draws if they are clearly labeled. Rank the rest by amount.
7. **Personal vs business.** Apply remembered rules. Flag charges that look personal (or mixed) so the user can recode them to owner draw / owner contribution / personal due-to-owner, or split them. Do not recode them.
8. **Receipts.** For each unmatched, uncategorized, or above-threshold charge, search Gmail and the receipt folder by merchant, amount, and a date window of a few days on either side. Mark `receipt found`, `receipt missing`, or `receipt unreadable`. Do not require an expense report.
9. **Propose categories.** For every uncategorized or miscoded line, propose a QBO account (and class, if they use classes) from `bk.coa_map`. If two accounts could fit, list both and flag it. Never apply the category.
10. **Carry forward** open items from the last run. Mark each `resolved`, `still open`, or `user dismissed`.
11. **Save a dated workbook** (Drive or local export) named like `card-bank-audit-YYYY-MM-DD` with the sheets listed below.
12. **Send the chat summary.** If nothing material is new, one clean-week sentence plus the workbook link is enough.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Period covered and accounts reviewed (name + last 4)
- Counts and dollar totals: reviewed, matched, uncategorized, missing from QBO, personal/mixed, missing receipts, duplicates
- Top exceptions ranked by dollar impact (merchant, date, amount, why it matters, proposed category)
- Feed-health notes (stale feeds, portal disagreements)
- What is waiting on the user's approval (nothing is changed until they say so)
- One line: "Bookkeeping support only, not tax or legal advice."

**Workbook sheets:**

1. `Summary`
2. `Uncategorized-and-proposed`
3. `Missing-from-QBO`
4. `QBO-without-feed-match`
5. `Duplicates`
6. `Personal-or-mixed`
7. `Missing-receipts`
8. `Open-items`
9. `All-lines` (the raw extracted activity)

Each exception row should include: date, account (name + last 4), merchant, amount, QBO category, proposed category, receipt status, match status, notes. No full account numbers.

## Sample output (EXAMPLE DATA ONLY)

The following numbers, merchants, and names are fictional examples so a new user can see the shape of a report. They are not this user's books.

**Chat summary (example)**

Weekly Card & Bank Audit for 3 to 9 Nov 2026 (example). Reviewed Summit Key Team operating checking …1842 and Chase Ink …4242.

- 41 transactions, $8,416.22 reviewed
- 33 matched and categorized
- 5 uncategorized, $1,842.10
- 1 charge on the card missing from QBO, $299.00 (Zillow Prefplus, 7 Nov)
- 2 possible personal/mixed, $186.44
- 3 missing receipts above the $75 example threshold, $612.00
- 0 duplicates

Largest items to review:
1. $899.00: Facebook Ads, 5 Nov, Uncategorized Expense → proposed Lead generation / advertising (class: Team). Receipt found in Gmail.
2. $299.00: Zillow Prefplus, 7 Nov, posted on Chase Ink …4242, not yet in QBO.
3. $214.50: "THE HOME DEPOT #4401", 8 Nov, flagged mixed use per your personal-vs-business rules (home project vs. listing supplies). Receipt found; line items are mixed.
4. $142.18: Uber Eats, 6 Nov, flagged possible personal; no client name in the memo.

Nothing was changed in QuickBooks. Reply with the line numbers you want me to categorize or split and I will do only those.

Bookkeeping support only, not tax or legal advice.

**Exceptions table (example)**

| Date | Account | Merchant | Amount | In QBO? | Current category | Proposed category | Receipt | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-05 | Chase Ink …4242 | Facebook Ads | $899.00 | Yes | Uncategorized Expense | Lead generation / advertising | Found | Needs category |
| 2026-11-07 | Chase Ink …4242 | Zillow Prefplus | $299.00 | No | None | Lead generation / advertising | Found | Missing from QBO |
| 2026-11-08 | Chase Ink …4242 | The Home Depot #4401 | $214.50 | Yes | Supplies | Split: listing supplies / owner draw | Found | Mixed use |
| 2026-11-06 | Chase Ink …4242 | Uber Eats | $142.18 | Yes | Meals | Owner draw (if personal) or Meals | Missing | Possible personal |
