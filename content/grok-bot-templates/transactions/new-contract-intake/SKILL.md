---
name: New Contract Intake
description: >-
  Use when a real estate purchase contract has been ratified or the user drops
  a signed contract, counter, or addendum: parse it into the transaction
  tracker and build a task list. Utah REPC-first when the file is a Utah
  contract; otherwise general mode. Never invent dates; compute day-count
  deadlines from the contract and show the math. Do not create the file in a
  transaction system until the user approves.
---

# New Contract Intake

Goal: turn a newly ratified contract into a complete tracker row and a first task list the same day, using only what the documents say. The bot drafts the file setup; it does not open the loop, notify the broker, or email the client until the user approves those named steps.

## Who it's for

Transaction coordinators, agents, and ops leads who intake buyer or listing-side ratified contracts. Also useful when an agent forwards a signed PDF and says "get this started."

## What it connects to (system-agnostic)

Ask which system(s) they use and how to read and (later, only after approval) create a file: connector, CSV/export, shared Drive deal folder, email inbox, or browser. Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** a Google Sheet tracker plus Gmail. On the first run, create the Sheet headers if they do not exist. Proposed new rows stay `draft-only` until the user says to add them.

Also read: Gmail (incoming signed contracts and counters), Drive (deal-folder template), and optionally the CRM (Follow Up Boss or similar) to match an existing lead; do not change CRM stage until approved.

## Guardrails

- **Drafts only.** Never create a transaction-system file, never send "you're under contract" emails, never submit anything to the broker, and never sign or initial a document unless the user explicitly approves that named action in the same conversation.
- **Never invent dates, prices, names, or checkbox answers.** Blank on the contract stays blank on the tracker, with a flag.
- **Compute day-count deadlines and show the math.** Printed calendar dates are copied as written.
- **Flag rather than guess** when initials are missing, a checkbox is unmarked (IS / IS NOT contingencies), counters conflict, or Acceptance is unclear (signed but communication not documented).
- **Never handle wire instructions.** If the packet includes them, note "wire instructions present, not extracted" and leave them alone.
- **Minimize personal data.** Tracker fields: address, file number, party role (Buyer/Seller), agent names, price, earnest money *amount*, deadlines, title/lender company names. Do not copy SSNs, DOBs, phone numbers, email addresses, or full account numbers into chat. Party last names are enough if the tracker requires a name.
- **Not legal advice.** Listing tasks is not advice about termination rights.
- **Trust / earnest money:** record the delivery deadline and holder if the contract states them; do not collect or deposit funds. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.**

## Utah REPC-first vs general mode

Follow the same reading rules as Contract-to-Close Deadline Tracker:

- Read the form version in hand (a revised Utah REPC became available 1 Nov 2026; older forms may still appear). Use labeled fields; do not assume section numbers if the version differs.
- On the outgoing Utah REPC, extract the Section 24-style printed dates (Seller Disclosure, Due Diligence, Financing & Appraisal, Settlement), purchase price and earnest-money amount, included/excluded items only if needed for tasks, Financing / Appraisal / Due Diligence IS or IS NOT checkboxes, and addenda boxes that are checked.
- Compute earnest-money delivery from the day-count language actually printed (often four calendar days after Acceptance on the standard form) using that form's definition of days, and show the math. Read any earnest-money-with-title addendum before using the default language.
- General mode: extract whatever labeled deadlines and day-count clauses that contract uses. Do not apply Utah 5:00 p.m. Mountain Time or four-day earnest-money rules to a non-Utah form.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, and sides** (buyers, listings, both)? (memory: `tm.role`, `tm.team_name`, `tm.sides`)
2. **Which transaction system(s)** and how to read or create a file (connector, export, Drive folder, email, browser)? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet** URL and columns, or "create one." (memory: `tm.sheet_tracker`)
4. **Inbox** to watch for ratified contracts? (memory: `tm.email_inbox`)
5. **Form mode and state?** Utah REPC-first or general. (memory: `tm.form_mode`, `tm.state`)
6. **Deal-folder template** in Drive (optional) and naming pattern (`Address - FileNumber`)? (memory: `tm.folder_template`)
7. **Who approves creating the official file and sending intro emails?** (memory: `tm.approver`)
8. **When to sweep for new contracts?** Default suggestion: weekdays at 8:00 AM in the user's timezone, plus whenever the user drops a contract. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekdays at 8:00 AM in the user's timezone, and on-demand when a contract is dropped in chat or email.

**Cron (example, America/Chicago):** `0 8 * * 1-5`

**Routine prompt to save:**

```
Run @New Contract Intake.

Sweep the remembered inbox and transaction system for newly ratified contracts since the last run. For each new fully signed contract (or any contract I drop in chat), extract the fields into a proposed tracker row and a first task list.

Use Utah REPC-first rules when the document is a Utah REPC; otherwise general mode. Never invent a date or a checkbox. Show the math for any day-count deadline. Flag missing initials, unmarked contingencies, and unclear Acceptance.

Do not create the file in Dotloop, SkySlope, or any other system, and do not send client or vendor email, unless I explicitly approve that named file in that conversation.
```

## Procedure

1. **Load memory.** Ask for any missing system or form-mode answers.
2. **Find new ratified contracts** not already in the tracker: inbox attachments, transaction-system files in an unsigned-to-signed state, Drive uploads, or documents the user just attached.
3. **Confirm ratification.** Look for signatures of both sides and evidence of Acceptance/communication if the form requires it. If it looks like an unsigned offer or an unaccepted counter, stop and label it `not-yet-ratified`. Do not intake it as live.
4. **Extract fields** (leave blanks; do not fill from MLS or memory):
   - Property address and, if present, tax ID or parcel (only if printed)
   - File or offer-reference date
   - Purchase price and earnest-money amount and form (check, wire, other), amount only, no account numbers
   - Who holds earnest money, if stated
   - Buyer-side vs listing-side relative to the user's team
   - Representing agent names
   - Title / escrow company and lender names if filled
   - Printed deadline dates
   - Day-count clauses, with math
   - Contingency checkboxes (Due Diligence, Appraisal, Financing, sale of buyer's property, etc.) exactly as marked; flag unmarked
   - Checked addenda list
   - Settlement/possession notes that are actually written
5. **Build a proposed tracker row** and a **task list** that depends on side and marked contingencies. Typical buyer-side first tasks (include only if relevant to what the contract actually says): open the file (pending approval), send introductions (draft only), diary every extracted deadline, collect earnest-money receipt, order or confirm inspection if Due Diligence is in play, confirm seller disclosures are expected by their printed date, confirm appraisal/financing contacts if those conditions are marked IS. Typical listing-side first tasks: confirm seller disclosures deadline, deliver disclosures, notify listing platform of pending status (draft only), coordinate access for inspections. Do not add tasks that assume a contingency the contract marked IS NOT.
6. **Propose, do not execute:** tracker row, Drive folder from the template, transaction-system file, and intro emails. Each item gets an ID (INTAKE-row, INTAKE-folder, INTAKE-file, INTAKE-email-client, INTAKE-email-title).
7. **Save** `new-contract-intake-YYYY-MM-DD-address` and send the chat summary with an approval prompt for named IDs.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Address, file/reference, side, price, earnest-money amount (example shape)
- Acceptance status and any `acceptance-unclear` flag
- Deadline table with source and math
- Contingencies as marked
- Task list
- Proposed actions waiting for approval (not done)
- One line: "Transaction support only, not legal advice. No dates were invented."

**Workbook sheets:**

1. `Extracted-fields`
2. `Date-math`
3. `Proposed-tracker-row`
4. `Task-list`
5. `Draft-emails` (unsent)
6. `Flags`

## Sample output (EXAMPLE DATA ONLY)

The following contract details are fictional examples. They are not this user's file.

**Chat summary (example)**

New Contract Intake, 1842 Willow Creek Dr, Sample City, UT, file EX-10441 (example). Utah REPC (example version). Side: buyer. Status: both signature blocks signed; Acceptance communication is noted in the accompanying email dated 2 Nov 2026 (example), treated as Acceptance 2 Nov 2026, flagged for you to confirm.

- Purchase price: $685,000.00 (printed)
- Earnest money: $5,000.00, form: check (printed); holder: brokerage trust (printed)
- Due Diligence condition: IS (checked)
- Appraisal condition: IS (checked)
- Financing condition: IS (checked)
- Addenda checked on the example form: FHA/VA (not checked), none others marked; flag if you expected more

Deadlines:
| Deadline | Date | Source |
| --- | --- | --- |
| Earnest money delivery | 6 Nov 2026 by 5:00 p.m. MT | Math: Acceptance 2 Nov 2026 (Mon) + 4 calendar days starting the day after Acceptance (3 Nov=1 … 6 Nov=4), from the 4-day language printed on this example REPC |
| Seller Disclosure Deadline | 10 Nov 2026 by 5:00 p.m. MT | Printed in the deadline box |
| Due Diligence Deadline | 13 Nov 2026 by 5:00 p.m. MT | Printed in the deadline box |
| Financing & Appraisal Deadline | 24 Nov 2026 by 5:00 p.m. MT | Printed in the deadline box |
| Settlement Deadline | 4 Dec 2026 by 5:00 p.m. MT | Printed in the deadline box |

Proposed, not done: INTAKE-row (Sheet), INTAKE-folder, INTAKE-file (transaction system), INTAKE-email-client, INTAKE-email-title.

Reply with the IDs you want me to execute.

Transaction support only, not legal advice. No dates were invented.
