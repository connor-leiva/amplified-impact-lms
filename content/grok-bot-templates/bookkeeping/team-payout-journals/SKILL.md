---
name: Team Split & Payout Journals
description: >-
  Use when asked to draft journal entries or payables for a real estate team's
  agent splits, cap tracking, desk fees, or team-lead overrides for a pay
  period. Draft only; never post, pay, or recategorize without the user's
  explicit approval that same conversation. Do not use for employee payroll
  tax filings or expense reports.
---

# Team Split & Payout Journals

Goal: turn this period's tied-out commissions into a clear set of proposed QuickBooks Online journal entries and agent payables (splits, cap crossings, desk fees, and team-lead overrides included) and wait for a human to approve each posting. Most teams do not collect expense reports; this skill starts from closings and deposits, not from reimbursements.

## Who it's for

Team leaders and ops leaders who pay 1099 agents or track a house split inside a team LLC. Solo agents without a team can skip this skill unless they need to book a split with a partner.

## What it connects to

- **QuickBooks Online connector**: chart of accounts, vendors (agents), classes or locations, bills/payables, and journal entries (read always; write only after explicit approval). Export Transaction List or a P&L by class if needed.
- **Google Drive / Sheets**: split-plan sheet, cap tracker, and the latest Commission Tie-Out workbook.
- **Gmail**: payout confirmations or agent payment requests, if the team uses them.
- **Browser**: brokerage commission portal or Follow Up Boss, only to confirm which deals closed and who was the listing or buyer's agent. Owner completes any sign-in.

This skill does not use expense reports and does not run payroll (no W-2 withholdings, no payroll tax deposits).

## Guardrails

- **Draft only until the user approves specific lines, every time.** Never post a journal entry, never create or send a bill payment, never recategorize a deposit, and never Venmo, ACH, or write a check. A previous "yes, this is our template" is not permission to post this period.
- After approval, post or create **only** the named entries, then show what was written and stop.
- Prefer putting proposed entries in the workbook first. Creating a *draft* (unposted) journal entry in QBO still needs explicit approval that run.
- **Never invent numbers or split percentages.** If an agent's plan or cap progress is missing, skip that agent and ask. Do not reuse another agent's split.
- **Flag rather than guess** when the CDA, the deposit, and the split plan disagree. Do not "true up" silently.
- **Last 4 only** on bank accounts. Never display full account numbers.
- **Do not display TINs** (SSN or EIN) for agents even if QBO has them. "Vendor on file" and "W-9 on file: yes/no" are enough; point 1099 questions to Vendor & Agent 1099 Readiness.
- **Not tax, legal, or employment-status advice.** Whether someone should be 1099 vs W-2, and how cap or desk fees are taxed, is for the user and their CPA.
- **Trust funds.** Never draft an entry that pulls from a trust or escrow account to pay an agent. If payout money appears to sit in trust, flag it. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.** Do not email agents their proposed payout unless the user explicitly asks you to send a named message.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team name, and who approves postings?** (memory: `bk.role`, `bk.team_name`, `bk.je_approver`)
2. **Which QBO company?** Entity type as they describe it (team LLC, brokerage, sole prop) without interpreting tax treatment. (memory: `bk.qbo_company`, `bk.entity_note`)
3. **Pay period:** weekly after brokerage payday, twice a month, or monthly? Which weekday or date, and in what timezone? Default suggestion: Wednesday 10:00 AM, after the Tuesday commission tie-out. (memory: `bk.pay_cadence`, `bk.schedule`)
4. **Which operating account pays agents?** Name + last 4. Confirm it is not a trust account. (memory: `bk.payout_account`)
5. **QBO accounts to use** for: commission income, franchise/brokerage fee expense, referral fee expense, agent split payable (or contractor expense), team-lead override, desk-fee income or offset, cap true-up, owner draw. (memory: `bk.commission_accounts`)
6. **Classes or locations by agent?** (memory: `bk.qbo_classes`)
7. **Each agent's plan:** legal vendor name in QBO, split with the team, sliding scale if any, cap amount and anniversary, post-cap split, team-lead override, desk fee (amount and cadence), current cap progress source. (memory: `bk.split_plans`, `bk.cap_tracker`)
8. **How should payouts be represented?** Journal entry only, bill + payment, or journal entry plus a separate payment run the user makes themselves. (memory: `bk.payout_method`)
9. **Is there a Commission Tie-Out workbook or folder** to treat as the source of deals? (memory: `bk.tie_out_source`)

If Commission Tie-Out has not been run for the period, offer to run it first. Do not draft payout entries from memory of the deals.

## Recommended routine

**Schedule:** Weekly, Wednesday at 10:00 AM in the user's timezone (or the morning after their brokerage payday). Monthly teams: 10:00 AM on the 1st.

**Cron (example, America/Chicago, weekly):** `0 10 * * 3`

**Cron (example, monthly):** `0 10 1 * *`

**Routine prompt to save:**

```
Run @Team Split & Payout Journals for this real estate team.

Use the latest Commission Tie-Out workbook (run that skill first if it is missing for this period) and the remembered split plans, cap tracker, desk fees, and QuickBooks accounts.

Draft proposed journal entries and agent payables for the current pay period: agent splits, team-lead overrides, cap crossings, desk fees, franchise or referral amounts that still need to be split out of the deposit, and amounts already paid if I recorded them.

Put the draft in the dated workbook. Do not post journal entries, create payments, or recategorize anything in QuickBooks unless I explicitly approve specific lines in that conversation.

Identify agents by name and deals by address and file number. Do not include TINs or full bank account numbers.

If there are no payouts this period, say so in one line.
```

## Procedure

1. **Load memory** and the latest Commission Tie-Out workbook for the period. If tie-out is missing or has open variances, list those variances first. Draft payout lines only for deals with a matched deposit, or clearly mark any draft that depends on an unmatched deal as `blocked-on-tie-out`.
2. **List deals in scope** with address, file number, agent, GCI, CDA net, QBO deposit, and remaining variance.
3. **Compute each agent's period activity** from the remembered plan and the documents:
   - Deal-level split (pre-cap and post-cap portions if the cap tracker says this period crosses)
   - Team-lead override or house share
   - Desk fee for the period (skip if already collected some other way; ask if unclear)
   - Referral and franchise amounts that should have been booked against the deposit
   - Anything already paid to the agent this period (search QBO bills/payments/checks to that vendor)
4. **Propose entries**, using only remembered accounts. Typical pattern (adapt to their chart; do not invent accounts):
   - If a deposit was booked 100% to Commission Income, propose a reclass that moves franchise fees, referral fees, and the agent's share into the right expense and payable accounts, by class if they use classes.
   - If they pay agents with bills: propose one bill per agent for the period net, dated the payout date, memo listing file numbers.
   - If they already paid an agent outside QBO, propose the recording entry and flag it as `already-paid-needs-recording`, not as a new payment.
5. **Balance check.** Every proposed journal entry must balance (total debits = total credits). If it does not, stop and flag the error; do not post an unbalanced entry.
6. **Cap tracker preview.** Show opening cap progress, this period's contribution, and closing progress as a preview. Do not write the tracker until approved.
7. **Call out blockers:** missing split plan, missing W-9 (informational), unmatched deposit, possible trust-account source, or a variance over $1.00.
8. **Save the workbook** `team-payout-journals-YYYY-MM-DD` and send the chat summary with an explicit approval prompt: "Reply with the entry IDs you want posted (for example, JE-1 and BILL-2) and I will post only those."
9. **If the user approves named entries:** apply only those in QBO, refresh the report with posted document numbers, and stop. If anything fails, leave the rest unposted and report the error.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Pay period and number of deals
- Total proposed agent payables, team/house share, desk fees, franchise/referral reclasses
- Blockers and variances
- A compact list of proposed entries (ID, date, purpose, debit total, credit total, status `draft-only`)
- The approval prompt
- One line: "Bookkeeping support only, not tax or legal advice. Nothing has been posted."

**Workbook sheets:**

1. `Summary`
2. `Deal-computations`
3. `Proposed-journal-entries` (one row per line: entry ID, date, account, debit, credit, memo, class, agent, deal file)
4. `Proposed-bills-or-payables`
5. `Cap-tracker-preview`
6. `Blockers`
7. `Approval-log`

## Sample output (EXAMPLE DATA ONLY)

The following agents, deals, percentages, and amounts are fictional examples. They are not this user's books and not a recommended split.

**Chat summary (example)**

Team Split & Payout Journals for 3 to 9 Nov 2026 (example). Source: Commission Tie-Out workbook dated 10 Nov 2026 (example). Two matched deals; one deal blocked on a missing deposit.

Proposed totals (not posted):
- Agent payables: $13,365.00
- Team/house share: $5,835.00
- Franchise fee reclass: $1,287.00 (example rate, from the CDA)
- Desk fees to record: $200.00

Proposed entries:
- JE-1: 6 Nov, reclass Willow Creek deposit $12,450.00 into franchise expense, Jordan Hale payable, and team share. Debits equal credits at $12,450.00.
- JE-2: 5 Nov, **blocked** on 900 Holm Oak Ct $375.00 referral variance. No draft until tie-out is clean.
- BILL-1: Jordan Hale, $8,715.00 period net (Willow Creek split minus $100 example desk fee).
- BILL-2: Riley Chen, **blocked**: 55 North Pier Pl has no QBO deposit yet.

Cap preview (example): Jordan Hale $4,200 remaining before cap after this period. Riley Chen unchanged.

Reply with the entry IDs you want posted (for example, JE-1 and BILL-1) and I will post only those.

Bookkeeping support only, not tax or legal advice. Nothing has been posted.

**Proposed journal entry JE-1 (example, not posted)**

| Line | Account | Debit | Credit | Memo | Class |
| --- | --- | --- | --- | --- | --- |
| 1 | Commission income | $3,735.00 | | Reclass team share, 1842 Willow Creek Dr EX-10441 (example) | Team |
| 2 | Franchise fee expense | $747.00 | | Franchise per CDA (example) | Team |
| 3 | Agent split expense | $8,715.00 | | Jordan Hale 70% after franchise, net of $100 desk fee (example plan) | Jordan Hale |
| 4 | Desk fee income | | $100.00 | November desk fee (example) | Jordan Hale |
| 5 | Commission income | | $12,450.00 | Offset original deposit booking (example) | Team |
| 6 | Agent payable, Jordan Hale | | $8,715.00 | To be paid from operating …1842 | Jordan Hale |

(The example lines above are illustrative of shape; the live draft must use the user's actual accounts and must balance.)
