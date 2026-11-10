---
name: Commission Tie-Out
description: >-
  Use when asked to tie out a real estate closing's commission: match a closing
  disclosure, CDA, or brokerage commission statement to the deposit in
  QuickBooks Online, check agent, team, brokerage, franchise, cap, and referral
  splits, and flag variances. Also use for the weekly sweep of last week's
  closings. Do not use for general card-feed audits or payroll.
---

# Commission Tie-Out

Goal: for each closing in the period, prove that the money that hit the bank matches the closing documents and the team's split plan, and list every dollar that does not. This is bookkeeping support, not tax, legal, or broker-compliance advice.

## Who it's for

Producing agents checking their own deposits, team leaders checking agent deals, and ops leaders who reconcile brokerage payouts each week. Works for a single closing or a weekly batch.

## What it connects to

- **QuickBooks Online connector**: deposits, undeposited funds, commission income, referral-fee expense, franchise/brokerage fees, agent payables, and classes or locations by agent. Export Transaction List or Deposit Detail if the connector cannot filter by date or memo.
- **Gmail**: closing disclosures, CDAs (commission disbursement authorizations), brokerage paycheck stubs or commission statements, title-company wires, and referral invoices.
- **Google Drive / Sheets**: the split-plan sheet, cap tracker, and any folder where the team drops CDAs.
- **Browser**: brokerage back office or commission portal (examples: KW Command, eXp, Compass, Fathom, or the team's brokerage site) and, if needed, Follow Up Boss for the closed-deal list. Ask the owner to complete any sign-in or one-time code.

This skill does not use expense reports.

## Guardrails

- **Read-only by default.** Never recategorize a deposit, never post or edit a journal entry, never create a bill or payment, and never move money.
- **Write actions need fresh approval every time.** Drafts of proposed entries belong in the workbook until the user names the lines they want posted.
- **Never invent numbers.** If a page of the CDA or closing statement is missing, flag the gap. Do not compute a split from memory of "what we usually do" when the deal's CDA is absent.
- **Flag rather than guess.** When the CDA, the brokerage statement, the bank deposit, and the split plan disagree, show each source and the variance. Do not pick a winner.
- **Last 4 only** on bank accounts and cards. Never print a full account number from a closing disclosure.
- **Minimize closing-package personal data.** Identify a deal by address and file or CDA number. Do not copy Social Security numbers, birth dates, full bank account numbers, or loan numbers into the report. Buyer and seller names are optional; prefer address plus file number.
- **Not tax or legal advice.** Cap, franchise, and 1099 treatment are presented as the numbers on the documents, not as conclusions about taxability.
- **Trust funds.** If earnest money or other client funds appear to have landed in an operating account, flag a possible commingling issue and point to Trust & Earnest Money Watch. Trust account rules vary by state (Utah-first playbook, otherwise general mode). Do not disburse or recommend disbursing trust money.
- **Contact no one.** Do not email title, the brokerage commission desk, or the other agent.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role and team name?** (memory: `bk.role`, `bk.display_name`, `bk.team_name`)
2. **Which QBO company, and which operating account receives commission deposits?** Name + last 4. (memory: `bk.qbo_company`, `bk.commission_deposit_account`)
3. **Which QBO income and expense accounts** should commissions, referral fees paid, franchise/brand fees, brokerage fees, and agent-payable amounts use? (memory: `bk.commission_accounts`)
4. **Do you use classes or locations by agent?** (memory: `bk.qbo_classes`)
5. **Where do commission documents arrive?** Gmail senders (title companies, brokerage commission desk), a Drive folder, and/or a brokerage portal name. (memory: `bk.commission_doc_sources`)
6. **What is the split plan for each agent?** Split with the team or brokerage, any sliding scale, cap amount, what happens after cap, team-lead override or house split, desk fees taken at payout. Store this in `bk.split_plans` and, if they have a Sheet, remember its link as `bk.split_plan_sheet`. Never invent a default split.
7. **Franchise or brand fee?** Percentage or flat amount, and whether it is calculated on GCI, adjusted GCI, or something else. (memory: `bk.franchise_rules`)
8. **How do referral fees work?** Who pays them (before or after the team split), and where the invoices live. (memory: `bk.referral_rules`)
9. **Cap tracking:** where is year-to-date cap progress kept (QBO, a Sheet, the brokerage portal)? (memory: `bk.cap_tracker`)
10. **How often does the brokerage pay?** Per closing, weekly, or twice a month, and which weekday. (memory: `bk.pay_cadence`)
11. **Timezone and weekly run time?** Default suggestion: Tuesday 9:00 AM so Monday's deposits and statements have posted. (memory: `bk.schedule`)

If split plans differ by agent, remember each agent separately. If a deal names an agent with no remembered plan, stop and ask; do not borrow another agent's plan.

## Recommended routine

**Schedule:** Weekly, Tuesday at 9:00 AM in the user's timezone, plus on-demand when the user drops a CDA or says a deal just closed.

**Cron (example, America/Chicago):** `0 9 * * 2`

**Routine prompt to save:**

```
Run @Commission Tie-Out for this real estate team.

Tie out every closing and commission deposit since the last successful run, with a 7-day overlap. Use the remembered QuickBooks company, commission deposit account (name + last 4), split plans, cap tracker, franchise rules, and document sources.

Gather closed deals from Follow Up Boss or the brokerage portal if needed (owner completes any sign-in). Match each CDA / closing statement / brokerage commission statement to the deposit in QuickBooks Online.

Check splits, cap, franchise or brokerage fees, referral fees, and team-lead or agent splits against the remembered plans. Flag every variance in dollars. Identify deals by address and file number; do not copy SSNs, loan numbers, or full bank account numbers into the report.

Produce the dated workbook and a short chat summary ranked by variance. Do not recategorize deposits or post journal entries unless I explicitly approve specific lines in that conversation.

If the week is clean, say so in one line and attach the workbook.
```

## Procedure

1. **Load memory** (company, deposit account, split plans, cap, franchise and referral rules, doc sources, last-run date, open items). Ask only for gaps.
2. **Build the deal list** for the window (last run through today, plus 7 days of overlap; first run: last 30 days):
   - Closed or pending-payout deals from Follow Up Boss or the brokerage portal
   - Commission statements and CDAs that arrived in Gmail or Drive
   - Deposits in QBO to the remembered commission account, plus undeposited funds that look like commissions
3. **Collect source documents** per deal: CDA or brokerage commission statement (required), closing disclosure or settlement statement if needed to confirm sale price or commission rate, referral invoices, and the bank deposit. If a required document is missing, add the deal to `missing-documents` and do not invent the split.
4. **Read the documents** and record, leaving blanks rather than guessing:
   - Property address and file or CDA number
   - Close date and payout date
   - Sale price and gross commission (GCI) as printed
   - Adjustments printed on the CDA (franchise, brand, brokerage desk, E&O takeoffs, transaction fees)
   - Referral fees and who they are payable to
   - Net amount the team or agent should receive
   - Agent name(s) on the deal and any listed co-op split
5. **Find the deposit in QBO.** Match on exact amount first, then amount ± $1.00 (common rounding) and a date within 10 days, then memo or address. Statuses:
   - `matched`: deposit equals expected net
   - `partial`: deposit is only one side of a split payout or a draw against a later true-up
   - `amount-variance`: deposit found but does not equal expected net
   - `missing-deposit`: documents exist, no deposit yet
   - `unmatched-deposit`: money in QBO with no document
6. **Recompute the split from the remembered plan** using only numbers found on the documents:
   - Start from printed GCI
   - Subtract printed referral fees in the order the user's referral rules specify
   - Subtract printed franchise / brand / brokerage fees using remembered calculation basis
   - Apply the agent's split and any team-lead override
   - Apply cap: if the cap tracker says this deal crosses the cap, compute pre-cap and post-cap portions separately and flag it for review
   - Subtract remembered desk fees only if the user's plan says they come out at payout
   - Compare the computed net to both the CDA net and the QBO deposit
7. **Flag variances** of more than $1.00 (or the user's remembered tolerance). Common causes to label, not to assume: cap applied incorrectly, referral taken on the wrong side of the split, franchise fee on GCI vs adjusted GCI, missing co-broke, chargebacks, or a deposit that bundled two deals.
8. **Cap tracker.** Read current progress. Show this deal's contribution and the implied remaining cap. Do not write back to the tracker unless the user approves that update.
9. **Categorization hints (propose only).** If the deposit landed in Uncategorized Income or was not split out to fee expense and agent payable, propose the QBO lines. Do not enter them.
10. **Carry forward** open items (`resolved` / `still open` / `user dismissed`).
11. **Save a dated workbook** `commission-tie-out-YYYY-MM-DD` and send the chat summary.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Period covered and how many deals were tied out
- Dollar totals: documented net, deposited net, total variance
- Deals with a variance, missing deposit, unmatched deposit, or missing document, ranked by dollar impact
- Cap notes (anyone who crossed or is near cap)
- What is waiting on approval
- One line: "Bookkeeping support only, not tax or legal advice."

**Workbook sheets:**

1. `Summary`
2. `Deal-tie-out` (one row per deal)
3. `Variances`
4. `Missing-documents`
5. `Unmatched-deposits`
6. `Cap-and-fees`
7. `Proposed-QBO-lines`
8. `Open-items`

Deal-row fields: address, file/CDA number, close date, agent, sale price, GCI, referral fees, franchise/brokerage fees, computed team/agent net, CDA net, QBO deposit date and amount (account last 4), variance, status, notes. No SSNs, loan numbers, or full account numbers.

## Sample output (EXAMPLE DATA ONLY)

The following closing, names, and amounts are fictional examples. They are not this user's books.

**Chat summary (example)**

Commission Tie-Out for 3 to 9 Nov 2026 (example). Three closings, two deposits in operating checking …1842.

- Documented net to the team: $28,140.00
- Deposited: $21,765.00
- Total variance to review: $6,375.00

Needs attention:
1. 1842 Willow Creek Dr, file EX-10441 (example), CDA net $12,450.00 vs QBO deposit $12,450.00 on 6 Nov. Match. Split matches Jordan Hale's remembered 70/30 plan after a $747.00 franchise fee (example rate).
2. 55 North Pier Pl, file EX-10458 (example), CDA net $8,940.00. No deposit in QBO yet. Brokerage statement in Gmail says payout date 10 Nov; carry forward.
3. 900 Holm Oak Ct, file EX-10412 (example), CDA net $6,750.00 vs QBO deposit $7,125.00 on 5 Nov. Variance +$375.00. Referral invoice for $375.00 is on the CDA but no referral-fee expense was booked; deposit looks like it came in gross of that referral.

Cap: Jordan Hale is $4,200 below the remembered annual cap after the Willow Creek deal (example). No one crossed cap this week.

Nothing was changed in QuickBooks.

Bookkeeping support only, not tax or legal advice.

**Deal-tie-out (example)**

| Address | File | Agent | GCI | Referral | Franchise (example) | Computed net | CDA net | QBO deposit | Variance | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1842 Willow Creek Dr, Sample City, UT | EX-10441 | Jordan Hale | $18,500.00 | $0.00 | $747.00 | $12,450.00 | $12,450.00 | $12,450.00 on 6 Nov, …1842 | $0.00 | Matched |
| 55 North Pier Pl, Sample City, UT | EX-10458 | Riley Chen | $14,200.00 | $1,000.00 | $852.00 | $8,940.00 | $8,940.00 | None | $8,940.00 | Missing deposit |
| 900 Holm Oak Ct, Sample City, UT | EX-10412 | Jordan Hale | $9,000.00 | $375.00 | $540.00 | $6,375.00 | $6,750.00 | $7,125.00 on 5 Nov, …1842 | +$375.00 | Amount variance, referral not booked |
