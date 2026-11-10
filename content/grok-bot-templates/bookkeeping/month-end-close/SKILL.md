---
name: Month-End Close Packet
description: >-
  Use when asked to run a monthly close for a real estate agent or team: check
  bank and card reconciliations in QuickBooks Online, list uncategorized
  transactions, propose accruals for pending closings, build a P&L by agent or
  lead source, and assemble a close packet. Do not use for weekly card-only
  audits or for filing tax returns.
---

# Month-End Close Packet

Goal: hand the owner a close packet they can review in one sitting: reconciliations, leftover mess, proposed accruals for deals that closed but have not paid out, and a P&L they can actually read, without changing the books until they approve specific lines. This is bookkeeping support, not tax, legal, or CPA-attestation work. Expense reports are not required and should not be requested.

## Who it's for

Solo agents, team leaders, and ops leaders who keep books in QuickBooks Online and want a repeatable month-end, including teams that close deals in one month and get paid in the next.

## What it connects to

- **QuickBooks Online connector**: Profit & Loss (whole team and by class/location if used), Balance Sheet, reconciliation status, uncategorized income and expense, undeposited funds, accounts payable and receivable, and transaction lists for the close month plus a few days after. Export the same reports as PDF or CSV if the connector cannot produce them.
- **Google Drive / Sheets**: the close-packet folder, cap tracker, and the latest Commission Tie-Out and Card & Bank Audit workbooks.
- **Gmail**: late commission statements and closing documents that explain a pending accrual.
- **Browser / CRM (optional)**: Follow Up Boss or the brokerage portal for closings dated in the month that have not yet deposited. Owner completes any sign-in.

## Guardrails

- **Read-only by default.** Never recategorize, reconcile, accept a match, post a journal entry, or close the books in QBO.
- **Write actions need fresh approval every time.** If the user says "post the accruals" or "categorize lines 3 to 6," do only those lines, show what changed, and stop.
- **Never invent numbers.** If a reconciliation is unfinished or a pending closing has no CDA, leave the accrual blank and flag it.
- **Flag rather than guess** when QBO, the bank, and the deal list disagree.
- **Last 4 only** on cards and bank accounts. Never print full account numbers.
- **No TINs, SSNs, or client financials** from closing packages. Identify deals by address and file number.
- **Not tax or legal advice.** A close packet is not a tax return, a compiled financial statement, or an audit.
- **Trust funds.** If a trust or escrow account is in the QBO company, do not treat it as an operating account. Point trust questions to Trust & Earnest Money Watch. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.**

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team name, and who signs off on the close?** (memory: `bk.role`, `bk.team_name`, `bk.close_approver`)
2. **Which QBO company, and what is their fiscal month-end?** (almost always the calendar month) (memory: `bk.qbo_company`, `bk.fiscal_month_end`)
3. **Which operating bank and card accounts must be reconciled?** Name + last 4. Exclude trust accounts. (memory: `bk.operating_accounts`)
4. **Do you use classes or locations** by agent, team, or lead source? Which class means what? (memory: `bk.qbo_classes`, `bk.lead_source_classes`)
5. **How should pending closings be handled?** Accrue estimated net commission when the deal closed this month but payout is next month, or wait until cash arrives? Default to asking; never assume accrual accounting. (memory: `bk.accrual_policy`)
6. **Where is the close-packet folder**, and who else receives it? (memory: `bk.close_folder`, `bk.report_destination`)
7. **Any accounts to ignore** (personal, old entities) or known month-end quirks? (memory: `bk.close_quirks`)
8. **When should the monthly run fire?** Default suggestion: the 3rd of each month at 9:00 AM in the user's timezone, so most card feeds and payouts from the last days of the month have landed. (memory: `bk.schedule`)

## Recommended routine

**Schedule:** Monthly, on the 3rd at 9:00 AM in the user's timezone. If the 3rd is a weekend, the routine may still run; note in the packet if bank recs are not yet available and follow up the next business day.

**Cron (example, America/Chicago):** `0 9 3 * *`

**Routine prompt to save:**

```
Run @Month-End Close Packet for the prior calendar month.

Use the remembered QuickBooks company, operating accounts (name + last 4), class tracking, and accrual policy. Pull reconciliation status, uncategorized transactions, P&L (including by agent or lead source if classes exist), and the balance sheet.

Compare last month's closings from the Commission Tie-Out workbook (run that skill if it is missing) and from Follow Up Boss or the brokerage portal if needed against deposits that actually arrived.

Propose cleanup categories and any accruals that the remembered policy calls for. Do not recategorize, reconcile, or post journal entries unless I explicitly approve specific lines in that conversation.

Save the dated close packet in the remembered Drive folder and send a short chat summary ranked by dollar impact.
```

## Procedure

1. **Load memory** and confirm the close month (the calendar month that just ended, unless they asked for a different month).
2. **Reconciliation status.** For each watched operating bank and card account, record: last reconciled date, reconciled through date, book balance, statement balance if visible, and difference. Flag any account not reconciled through month-end, or whose bank feed is stale (no refresh in more than 3 days). Do not click Reconcile.
3. **Uncategorized and ask-my-accountant / opening-balance leftovers.** List every transaction in the close month (and undeposited funds of any age) that lacks a real category. Propose a category from `bk.coa_map` if that memory exists. Include dollar totals.
4. **Carry in weekly findings.** Open the latest Card & Bank Audit and Commission Tie-Out workbooks. Copy still-open items that fall in the close month into the packet and mark what cleared after month-end.
5. **P&L and Balance Sheet.** Pull month and year-to-date. If classes or locations exist, pull P&L by agent and, if they tagged lead sources, by lead source. Flag: negative income accounts, uncategorized totals, classes used inconsistently, and any trust-looking balances in operating equity.
6. **Pending closings and accruals.** Build a list of deals with a close date in the month that have no matching deposit (or only a partial). For each, record address, file number, close date, CDA net if present, and expected payout timing.
   - If `bk.accrual_policy` says to accrue, propose a balanced journal entry using remembered accounts and the CDA net. If there is no CDA, do not invent a net; flag `needs-CDA`.
   - If the policy is cash-basis, do not propose an accrual; list the deals as `closed-not-yet-paid` so the owner sees the gap between production and cash.
7. **Other close checks.** Scan for: duplicate expenses, uncleared transactions older than 60 days, undeposited funds older than 14 days, credit-card payments that look mis-posted, owner draws coded as expenses, and large unusual items versus the prior month (flag; do not invent an explanation).
8. **Proposed close entries.** Number them (CE-1, CE-2, …). Each must balance. Status stays `draft-only`.
9. **Save the packet** as `month-end-close-YYYY-MM` with the sheets below, plus PDFs of the P&L and Balance Sheet if available.
10. **Send the chat summary** and wait for line-by-line approval before changing QBO.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Close month and accounts reviewed (name + last 4)
- Rec status: which accounts are reconciled through month-end and which are not
- Uncategorized total, open weekly-audit items, pending-close cash not yet in, proposed accrual total
- Headline P&L: income, expenses, net; plus by-agent highlights if classes exist
- What is waiting on approval
- One line: "Bookkeeping support only, not tax or legal advice."

**Workbook sheets:**

1. `Checklist` (each close step, done / blocked / n/a)
2. `Reconciliations`
3. `Uncategorized-and-proposed`
4. `Pending-closings-and-accruals`
5. `PL-by-agent-or-source`
6. `Proposed-close-entries`
7. `Open-items`
8. `Packet-index` (links to exported QBO reports)

## Sample output (EXAMPLE DATA ONLY)

The following figures and names are fictional examples. They are not this user's books.

**Chat summary (example)**

Month-End Close Packet for October 2026 (example). QBO company: Summit Key Team (example). Operating checking …1842 and Chase Ink …4242.

- Checking …1842 reconciled through 31 Oct 2026. Chase Ink …4242 last reconciled through 28 Oct 2026, three days open, difference $299.00 (Zillow Prefplus still missing from QBO; see weekly card audit).
- Uncategorized expense: $1,842.10 across 5 bills.
- Closings in October: 4. Deposits received: 3. Closed-not-yet-paid: 55 North Pier Pl, file EX-10458, CDA net $8,940.00, expected payout 10 Nov (example).
- Accrual policy remembered: cash-basis, no accrual drafted. Listed as production-vs-cash.
- October P&L (example): Commission income $42,150.00 · expenses $18,440.00 · net $23,710.00. By class: Jordan Hale $16,200.00 net, Riley Chen $7,510.00 net (example).

Proposed cleanup is in the packet as CE-1 through CE-5 (categories only). Nothing was changed in QuickBooks. Reply with the entry IDs you want applied.

Bookkeeping support only, not tax or legal advice.
