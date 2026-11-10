# Amplified Impact: Grok Bot library templates

Scheduled Grok Bot skills for real estate agents, team leaders, and ops leaders. These are not Claude Skills and they are not expense-report tools. Each template is a `SKILL.md` the bot loads, plus a recommended routine (cron and a prompt to save).

Two collections:

1. **Bookkeeping bots**: get the books in order against QuickBooks Online. No expense reports required.
2. **Transaction management bots**: contract-to-close operations across whatever system the team already uses.

Shared rules for every skill in this folder:

- Read-only / drafts by default.
- Never post journal entries, recategorize, pay anyone, sign, send, submit to a broker, or publish to the MLS without the user's **explicit approval of named items in that same conversation**.
- Never invent numbers or dates. Show the math for any computed date or split. Flag ambiguities instead of guessing.
- Last 4 only on cards and bank accounts. Never display TINs, full account numbers, lockbox/alarm codes, or wire instructions.
- Never handle wire instructions (copy, store, forward, compare, or confirm).
- Bookkeeping and transaction support only, not tax, legal, compliance, or fair-housing advice.
- Real estate trust-account rules vary by state. Utah-first playbook when the file or brokerage is in Utah; otherwise general mode.
- Client files are identified by address and file number. Minimize personal data.

---

## 1. Bookkeeping bots

These assume most users **do not create expense reports**. The weekly card skill compares card and bank activity directly to QuickBooks Online. Journal entries are drafted, then posted only after a human approves specific lines.

### Library listing

| Title | Slug | One-line value | Who it's for | Schedule | Connectors |
| --- | --- | --- | --- | --- | --- |
| Weekly Card & Bank Audit | `card-bank-feed-audit` | Catch uncategorized charges, personal spend, duplicates, and missing receipts before they bury the books. | Agents, team leaders, ops | Weekly, Monday 8:00 AM local (`0 8 * * 1`) | QuickBooks Online, Gmail, Drive/Sheets; browser for card/bank portals if the QBO feed is stale |
| Commission Tie-Out | `commission-tie-out` | Prove every closing's deposit matches the CDA, the split, the cap, and the fees. | Producing agents, team leaders, ops | Weekly, Tuesday 9:00 AM local (`0 9 * * 2`), plus on-demand per closing | QuickBooks Online, Gmail, Drive/Sheets; browser for brokerage commission portals and Follow Up Boss |
| Team Split & Payout Journals | `team-payout-journals` | Draft the split, cap, desk-fee, and payable entries; nothing posts until someone says so. | Team leaders and ops who pay 1099 agents | Weekly, Wednesday 10:00 AM local (`0 10 * * 3`), or monthly on the 1st (`0 10 1 * *`) | QuickBooks Online, Drive/Sheets; Gmail optional |
| Month-End Close Packet | `month-end-close` | Reconciliations, uncategorized cleanup, pending-close accruals, and a P&L by agent or lead source. | Agents, team leaders, ops | Monthly, the 3rd at 9:00 AM local (`0 9 3 * *`) | QuickBooks Online, Drive/Sheets, Gmail; Follow Up Boss or brokerage portal optional |
| Trust & Earnest Money Watch | `trust-earnest-watch` | A weekly three-way check so client funds, the bank, and the per-deal ledger agree. | Brokers, brokerage ops, TCs who hold earnest money | Weekly, Friday 8:00 AM local (`0 8 * * 5`), plus month-end | QuickBooks Online, Drive/Sheets, Gmail; browser for the trust bank portal |
| 1099 Vendor & Agent Readiness | `vendor-1099-readiness` | W-9s collected and year-to-date totals watched so January is not a scramble. | Team leaders and ops who pay vendors or 1099 agents | Monthly, the 15th at 10:00 AM (`0 10 15 * *`); weekly Mondays Oct to Jan (`0 10 * * 1`) | QuickBooks Online, Drive (W-9 folder), Gmail |
| Quarterly Tax & Profit-First Set-Aside | `quarterly-tax-profit-first` | See what to move to tax, profit, and reserve after each commission month, using rates the user or their CPA set. | Producing agents and team leads | Monthly, the 5th at 9:00 AM (`0 9 5 * *`), plus ~10 days before IRS estimate dates | QuickBooks Online, Drive/Sheets |
| Lead-Source ROI | `lead-source-roi` | What was spent in QuickBooks vs what actually closed in Follow Up Boss, by source. | Agents and team leaders who buy leads or run ads | Monthly, the 5th at 10:00 AM (`0 10 5 * *`) | QuickBooks Online, Follow Up Boss (or another CRM) via browser/export, Drive/Sheets |

### Suggested library copy

**Collection intro (bookkeeping)**

> Your books should not depend on expense reports you do not have time to file. These Grok Bots run on a schedule against QuickBooks Online: they watch the card, tie out commissions, draft team payout journals, close the month, keep 1099s and tax set-asides from sneaking up on you, and show which lead sources actually pay. They flag problems and draft entries. They do not move money or change the books until you approve specific lines.

**Per-skill blurbs**

- **Weekly Card & Bank Audit.** Most real estate teams never file an expense report. This bot compares the card and the operating account to QuickBooks every Monday, finds uncategorized spend, duplicates, personal charges, and missing receipts in Gmail, and proposes categories on a real-estate chart of accounts.
- **Commission Tie-Out.** Each closing should have one story: the CDA, the split, the cap, the franchise and referral fees, and the deposit. This bot finds the variance before it becomes an awkward conversation.
- **Team Split & Payout Journals.** After the tie-out, the bot drafts the journal entries and agent payables for the period, including cap crossings and desk fees, and waits. Nothing posts without your say-so that week.
- **Month-End Close Packet.** Reconciliations, leftover uncategorized items, deals that closed this month but pay next month, and a P&L by agent or lead source, in one packet.
- **Trust & Earnest Money Watch.** For brokerages that hold client funds. A weekly three-way view of the trust bank, QuickBooks, and the per-deal ledger, with commingling and aging-funds flags. Utah-first, with a general mode for other states.
- **1099 Vendor & Agent Readiness.** Photographers, TCs, stagers, coaches, and 1099 agents: who you paid, who sent a W-9, and who is over the IRS threshold. The bot does not file the forms and never displays a TIN.
- **Quarterly Tax & Profit-First Set-Aside.** Commission months are lumpy. Using percentages you or your CPA choose (the bot will not invent a tax rate), it shows what to move into tax, profit, and reserve accounts, and how close the next IRS estimate date is.
- **Lead-Source ROI.** Zillow, Google, Facebook, open houses, sphere: spend from QuickBooks next to closed units, volume, and GCI from Follow Up Boss. Untagged spend and sourceless closings get called out. GCI is never estimated.

### Which bookkeeping skills to make free

**Recommended free pair:**

1. **Weekly Card & Bank Audit**: the best hook. Every agent with a business card feels the pain the first Monday. It teaches the bot habit, proves the QuickBooks connection, and does not require split plans or trust accounts.
2. **Quarterly Tax & Profit-First Set-Aside**: the emotional hook for producing agents. It converts naturally into Commission Tie-Out and Month-End Close (paid).

Hold as paid: Commission Tie-Out, Team Split & Payout Journals, Month-End Close Packet, Trust & Earnest Money Watch, 1099 Vendor & Agent Readiness, and Lead-Source ROI. Those need deeper setup and are the ones a team will buy as standalone products.

Alternative second free if you want something seasonal: **1099 Vendor & Agent Readiness** (especially October to January). Slightly narrower audience than the tax set-aside.

---

## 2. Transaction management bots

Contract-to-close operations for teams that do not all use the same software. Every skill asks once which system they use (Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email) and how the bot should read it (connector, CSV/export, shared Drive folder, email inbox, or browser). If nothing else works, the fallback is a **Google Sheet tracker plus email**.

Utah REPC-first when the file is a Utah contract (read the form version in hand; a revised REPC became available 1 Nov 2026). Otherwise general mode. Deadlines are copied from printed dates or computed from a day-count clause with the math shown. The bot never invents a date.

### Library listing

| Title | Slug (under `transactions/`) | One-line value | Who it's for | Schedule | How it reads files |
| --- | --- | --- | --- | --- | --- |
| Contract-to-Close Deadline Tracker | `contract-to-close-deadlines` | A daily digest of overdue, due-today, and upcoming contract deadlines, with the date math visible. | TCs, agents, ops | Daily 7:30 AM local (`30 7 * * *`) | Transaction system as configured, or Sheet + Gmail; amendments from email |
| New Contract Intake | `new-contract-intake` | Parse a ratified contract into the tracker and a first task list the same day. | TCs, agents, ops | Weekdays 8:00 AM (`0 8 * * 1-5`), plus on-demand | Inbox / Drive / transaction system; writes *proposed* tracker rows only |
| Missing-Documents File Audit | `missing-documents-audit` | Compare each file to *your* broker checklist before anyone submits it for review. | TCs, ops, agents | Weekdays 9:00 AM (`0 9 * * 1-5`) | Transaction system or Drive folder vs the remembered brokerage checklist |
| Weekly Client & Agent Status Updates | `weekly-status-updates` | Draft the weekly client note and the internal agent note; you approve what goes out. | TCs and agents | Weekly, Monday 10:00 AM (`0 10 * * 1`) | Tracker + latest deadline digest; CRM for preferred names/channels only |
| Stalled Lender, Title & Escrow Follow-Up | `stalled-item-follow-up` | Spot stalled appraisal, title, financing, HOA, and earnest-money items and draft the chase email. | TCs, ops, agents | Weekdays 11:00 AM (`0 11 * * 1-5`) | Tracker + Gmail last-touch search |
| Closing-Week Checklist | `closing-week-checklist` | A seven-day checklist plus a wire-fraud reminder that never touches wire instructions. | TCs, agents, ops | Daily 8:00 AM (`0 8 * * *`); no-ops when no file is in window | Tracker + file documents; never banking apps |
| Listing-to-Live Launch Checklist | `listing-to-live` | Get a listing from signed agreement to live without missing disclosures, photos, remarks, sign, or lockbox. | Listing agents and listing coordinators | Weekdays 8:00 AM (`0 8 * * 1-5`) for pre-launch files | MLS via browser (no publish), listing file system or Drive, Sheet fallback |
| Post-Close File Closeout | `post-close-file-closeout` | Draft the CDA, archive the file, draft the review ask, and draft the CRM update after settlement. | TCs, ops, agents | Weekdays 2:00 PM (`0 14 * * 1-5`) | Transaction system, Drive archive folder, Gmail, CRM; points to Commission Tie-Out for the deposit |

### Suggested library copy

**Collection intro (transactions)**

> Deadlines do not care which software your team picked. These Grok Bots watch the contract, Utah REPC or otherwise, and draft the next move: intake, missing docs, client updates, vendor follow-ups, closing week, listing launch, and file closeout. They work with Dotloop, SkySlope, Brokermint, Lone Wolf, Paperless Pipeline, Open to Close, or a shared spreadsheet and an inbox. They draft. You approve anything that goes out or gets submitted.

**Per-skill blurbs**

- **Contract-to-Close Deadline Tracker.** Every morning: what is overdue, due today, and due in the next three days. Printed contract dates are copied; day-count deadlines show the math. Conflicting addenda are flagged, not "fixed."
- **New Contract Intake.** Drop in a ratified contract. The bot extracts price, earnest money, contingencies, and deadlines, proposes the tracker row, and builds the first task list for the buyer or listing side.
- **Missing-Documents File Audit.** Against your brokerage's checklist, not a guessed national list, so broker review is a submit, not a scavenger hunt.
- **Weekly Client & Agent Status Updates.** A calm client email and a tighter internal note, written from documented facts only. Nothing is sent until you say which draft.
- **Stalled Lender, Title & Escrow Follow-Up.** If the appraisal, title commitment, HOA docs, or earnest-money receipt should have moved and has not, the bot drafts the chase. It will not invent a stall or a status.
- **Closing-Week Checklist.** Walk-through, clear-to-close, CD, keys, and a wire-fraud warning that tells people to call a known trusted number. The bot will never copy, store, or confirm wiring instructions.
- **Listing-to-Live Launch Checklist.** Photos, disclosures, remarks (facts only), sign, lockbox (no codes in the report), and coming-soon rules, before anyone hits publish.
- **Post-Close File Closeout.** After funding or recording: draft the commission request or CDA from documents in the file, archive the folder, draft a review request, and draft the CRM change to Past Client.

### Which transaction skills to make free

**Recommended free pair:**

1. **Contract-to-Close Deadline Tracker**: the daily habit and the clearest "this bot has my back" moment. It works from a spreadsheet if the team has no transaction system yet.
2. **New Contract Intake**: the natural companion. Agents feel the value the first time they forward a ratified PDF and get a task list back.

Hold as paid: Missing-Documents File Audit, Weekly Client & Agent Status Updates, Stalled Lender/Title/Escrow Follow-Up, Closing-Week Checklist, Listing-to-Live Launch Checklist, and Post-Close File Closeout. Those are the standalone products a TC-backed team will pay for, and they depend on the tracker the two free skills start.

---

## How a member uses a template

1. Connect QuickBooks Online for any bookkeeping skill; connect Gmail and Drive when the skill asks. Save bank, card, MLS, and transaction-system logins in the vault; the bot should not see secret values in chat.
2. Start a chat, @-mention the skill, and answer the setup questions one at a time. Answers are stored as memories (`bk.*` for bookkeeping, `tm.*` for transactions).
3. Save the recommended routine (cron plus the prompt printed in each `SKILL.md`).
4. Run it once by hand the same day so the first workbook exists.
5. Approve write-actions line by line when a run proposes them.

Transaction skills that send nothing until approval still create a dated workbook of drafts each run, so a missed Monday does not lose the text.

---

## File map

```
content/grok-bot-templates/
  README.md
  bookkeeping/
    card-bank-feed-audit/SKILL.md
    commission-tie-out/SKILL.md
    team-payout-journals/SKILL.md
    month-end-close/SKILL.md
    trust-earnest-watch/SKILL.md
    vendor-1099-readiness/SKILL.md
    quarterly-tax-profit-first/SKILL.md
    lead-source-roi/SKILL.md
  transactions/
    contract-to-close-deadlines/SKILL.md
    new-contract-intake/SKILL.md
    missing-documents-audit/SKILL.md
    weekly-status-updates/SKILL.md
    stalled-item-follow-up/SKILL.md
    closing-week-checklist/SKILL.md
    listing-to-live/SKILL.md
    post-close-file-closeout/SKILL.md
```

Each `SKILL.md` includes YAML frontmatter (`name` + trigger `description`), who it is for, connectors or read methods, setup questions and memory keys, a recommended cron and the exact routine prompt to save, the step-by-step procedure, the output format, hard guardrails, and a sample report labeled **EXAMPLE DATA ONLY**.
