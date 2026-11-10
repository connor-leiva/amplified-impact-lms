---
name: Trust & Earnest Money Watch
description: >-
  Use when asked to watch a real estate brokerage trust or earnest-money
  account: compare escrow activity to the books and the per-deal ledger, flag
  possible commingling, unmatched deposits or disbursements, aging earnest
  funds, and closed files that do not balance to zero. Trust rules vary by
  state; use Utah-first when the brokerage is in Utah, otherwise general mode.
  Do not use for operating card audits.
---

# Trust & Earnest Money Watch

Goal: give the broker or ops lead an early warning when client funds and the trust records might not agree, before a monthly three-way reconciliation or a Division audit makes it painful. This is bookkeeping support, not legal, compliance, or trust-account legal advice. The bot never touches client money.

## Who it's for

Principal brokers, brokerage ops, and transaction leads who hold earnest money or other client funds in a real estate trust account. Solo agents whose earnest money always goes straight to title can skip this skill, or use it only to confirm no client funds landed in operating accounts.

## What it connects to

- **QuickBooks Online connector**: the trust/escrow liability accounts and the trust bank register only. Export Transaction Detail and a balance-sheet filter for those accounts if needed.
- **Browser**: the trust bank portal (owner completes sign-in) for the current posted balance and statement, using last 4 only in any note.
- **Google Drive / Sheets**: the per-deal earnest-money / escrow log (deal identifier, payor, amount, date received, date deposited, current holder, disbursement date and payee, running status).
- **Gmail**: earnest-money receipts, title-company deposit confirmations, and disbursement instructions that explain a ledger line.
- **Transaction tracker or CRM (optional)**: to know which files are active, under contract, failed, or closed.

If the team has no escrow log yet, set one up as a Google Sheet on the first run (headers only; do not invent balances) and say that a per-deal ledger is required for a three-way check.

## Guardrails

- **Read-only by default. Never move trust money.** Never write a check, send a wire, transfer between trust and operating, recategorize a trust transaction, or post a journal entry.
- **Never disburse or recommend a specific disbursement of earnest money.** If a failed deal needs a release, flag that written authorization is required and stop. Do not choose a payee.
- **Write actions need fresh approval every time,** and even then only for bookkeeping annotations the user named (for example, adding a memo). Approval to "fix the books" is not approval to move client funds.
- **Never invent numbers or dates.** If a receipt date or amount is missing, leave it blank and flag it.
- **Flag rather than guess** when the bank, QBO, and the per-deal ledger disagree. Show all three numbers.
- **Last 4 only.** Never put a full trust or operating account number in chat, email, a sheet, or a screenshot.
- **Minimize client personal data.** Identify files by address and transaction or file number. Do not copy SSNs, full account numbers, or copies of checks beyond amount, last 4, date, and payor name already on the ledger.
- **Do not contact the Division, the bank, buyers, or sellers.** If Utah rules may require the broker to notify the Division of an uncured imbalance, say so as a flag for the broker and their compliance counsel; do not notify anyone yourself.
- **Not legal or compliance advice.** State rules vary. Confirm current requirements with the broker's compliance counsel.
- **Utah-first, otherwise general mode.** Use the Utah playbook below when `tm.state` or `bk.trust_state` is Utah (or they asked for Utah mode). Otherwise use general mode and do not import Utah deadlines.
- **Contact no one.**

## Utah-first playbook (confirm against current rules)

When Utah mode is on, flag against the following published Utah Division of Real Estate themes. Always tell the user to confirm the current text of Utah Admin. Code R162-2f-401c and R162-2f-403a (or successor rules). This list is a watchlist, not a legal opinion.

- Client money in a real estate transaction is generally to be deposited into the principal broker's trust account, or into a title company or other authorized escrow if the parties agreed in writing, within **three business days of receipt**, unless the contract says the money is to be held for a stated time or deposited upon seller acceptance, or another written exception applies. Flag deposits that appear later than that, and flag missing "date received" vs "date deposited."
- The broker should keep a date-sequential record of deposits and disbursements, a running trust balance, and records that show each transaction's final disposition. **Each closed transaction should balance to zero.**
- Reconcile brokerage trust records to the bank or credit union **at least monthly**, and reconcile brokerage trust records to the client (per-deal) ledgers **at least monthly**.
- If the bank evidence shows the trust account is out of balance and the imbalance cannot be cured within the notification window (the rule text has described a 30-day notification to the Division), flag that the broker should review notification duties with counsel. Do not notify the Division.
- Flag possible **commingling**: operating expenses paid from trust, earnest money deposited to an operating account, or owner funds left in trust beyond what the user's counsel has said is allowed.
- Flag a proposed release of earnest money on a failed deal unless the file shows a contract condition authorizing disbursement or a separate signed agreement. Do not process the release.

If the form version or rule text the user provides differs from the above, the user's document and current rule text win. Note the date you last checked the rule references.

## General mode (other states)

Apply the same three-way structure (bank vs books vs per-deal ledger), commingling flags, aging funds, and "closed files at zero" checks. Do not apply Utah's three-business-day deposit window or Division notification language. Ask which state's trust rules their broker follows and record that as `bk.trust_state`. Remind them that deposit deadlines, reconciliation frequency, and notification duties vary by state.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, brokerage name, and who owns trust-account compliance?** (must be a human broker or compliance lead) (memory: `bk.role`, `bk.brokerage_name`, `bk.trust_owner`)
2. **State and mode?** Utah-first or general, and the state. (memory: `bk.trust_state`, `bk.trust_mode`)
3. **Which QBO company and which accounts are trust vs operating?** Name + last 4 only. (memory: `bk.qbo_company`, `bk.trust_accounts`, `bk.operating_accounts`)
4. **Where is the per-deal escrow ledger?** Sheet link or transaction-system report. If none, offer to create a blank Sheet. (memory: `bk.escrow_ledger`)
5. **Who is allowed to hold earnest money** on your files (brokerage trust, named title companies, either)? (memory: `bk.earnest_holders`)
6. **How do receipts arrive?** Gmail senders, transaction system, copies of checks. (memory: `bk.earnest_doc_sources`)
7. **When should the watch run?** Default suggestion: every Friday at 8:00 AM in the user's timezone, plus an extra run the first business day of the month for the monthly three-way. (memory: `bk.schedule`)

## Recommended routine

**Schedule:** Weekly, Friday at 8:00 AM in the user's timezone, and monthly on the first business day.

**Cron (example, America/Chicago, weekly):** `0 8 * * 5`

**Routine prompt to save:**

```
Run @Trust & Earnest Money Watch.

Use the remembered mode (Utah-first or general), QuickBooks trust accounts, trust bank (name + last 4 only), and per-deal escrow ledger. Compare the bank balance, the QBO trust balance, and the sum of open per-deal ledgers.

Flag unmatched deposits or disbursements, possible commingling with operating accounts, aging earnest money, negative deal balances, and closed files that do not net to zero. Show all three sides of any imbalance rather than choosing one.

Do not move money, disburse earnest money, recategorize, or post journal entries. Do not contact the Division, the bank, buyers, or sellers. Identify files by address and file number; last 4 only on accounts.

If the three-way agrees and nothing is aging, say the watch is clean and attach the workbook.
```

## Procedure

1. **Load memory** (mode, state, trust vs operating accounts, ledger, last-run open items). If the ledger does not exist, create headers and stop after explaining what the user needs to fill in; do not invent opening balances.
2. **Pull three numbers as of now** (and as of month-end when this is the monthly run):
   - Trust bank available/posted balance (portal or statement)
   - QBO balance of the trust bank account and the related trust-liability account(s)
   - Sum of open per-deal ledger balances
3. **Three-way comparison.** Record each total and the differences. A clean watch means bank ≈ books ≈ sum of client ledgers (within $0.01 or a clearly identified outstanding check/deposit-in-transit list).
4. **Match activity since the last run** (with a 7-day overlap): each bank deposit or disbursement to a ledger line and a QBO line. Statuses: `matched`, `unmatched-bank`, `unmatched-ledger`, `unmatched-QBO`, `amount-mismatch`.
5. **Commingling scan.** Search operating accounts for deposits that look like earnest money (memos, payors, amounts that match a deal's EM). Search the trust account for payments that look like operating expenses (software, marketing, payroll, owner draws). Flag; do not recode.
6. **Aging and anomalies.** Flag open earnest money older than the remembered typical contract length (or 60 days if they have not set one) with no close or cancellation note; negative deal balances; closed or canceled files with a remaining non-zero balance; duplicate receipts; funds held by title when the ledger still shows "at brokerage" or the reverse.
7. **Utah mode extras (Utah only):** flag receipt-to-deposit lags that appear to exceed three business days without a written exception; missing monthly rec evidence; closed files not at zero; imbalances that may raise a notification question for the broker's counsel.
8. **Carry forward** last run's open items.
9. **Save** `trust-earnest-watch-YYYY-MM-DD` and send the chat summary. Never include full account numbers.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Mode (Utah-first or general) and accounts reviewed (name + last 4)
- The three-way totals and any difference
- Unmatched items, possible commingling, aging funds, closed files not at zero, ranked by dollars
- What the broker should review with compliance counsel (if anything)
- One line: "Bookkeeping support only, not legal, compliance, or tax advice. No funds were moved."

**Workbook sheets:**

1. `Three-way`
2. `Unmatched-activity`
3. `Possible-commingling`
4. `Aging-and-nonzero-closed`
5. `Per-deal-ledger-extract`
6. `Open-items`

## Sample output (EXAMPLE DATA ONLY)

The following brokerage, files, and amounts are fictional examples. They are not this user's trust account.

**Chat summary (example)**

Trust & Earnest Money Watch for 7 Nov 2026 (example). Utah-first mode. Trust checking …9901. QBO company: Summit Key Brokerage (example).

Three-way (example):
- Trust bank posted balance: $42,500.00
- QBO trust bank: $42,500.00
- Sum of open per-deal ledgers: $39,000.00
- Difference: **$3,500.00**. The $3,500.00 deposit on 6 Nov from "J. Example, 1842 Willow Creek Dr" is in the bank and QBO but has no per-deal ledger line.

Other flags:
1. 55 North Pier Pl, file EX-10458, earnest money $5,000.00, date received 30 Oct, date deposited 5 Nov (example). Utah mode: receipt-to-deposit appears longer than three business days; no written exception noted. Flag for the broker.
2. Operating checking …1842 received $1,000.00 on 4 Nov memo "EM 900 Holm Oak" (example). Possible commingling: client funds may have landed in operating. Do not move money until the broker directs a proper correction with counsel.
3. File EX-09910 (closed 15 Oct, example) still shows $250.00 on the ledger. Closed files should balance to zero.

No funds were moved. No one was contacted.

Bookkeeping support only, not legal, compliance, or tax advice.
