---
name: Stalled Lender Title Escrow Follow-Up
description: >-
  Use when asked to spot stalled real estate transaction items (inspection,
  appraisal, financing, title, escrow, HOA, earnest-money receipt) and draft
  follow-up notes to the lender, title, escrow, or cooperating agent. Drafts
  only; never send, and never invent a status or a date.
---

# Stalled Lender, Title & Escrow Follow-Up

Goal: find items that should have moved and have not, then draft a polite, specific follow-up to the right party. The bot does not chase anyone until the user approves a named draft.

## Who it's for

Transaction coordinators, ops leads, and agents who spend their afternoons checking on appraisals, title commitments, HOA docs, and loan conditions.

## What it connects to (system-agnostic)

Ask which system(s) they use and how to read file activity: connector, CSV/export, shared Drive folder, email inbox, or browser. Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** the Google Sheet tracker plus Gmail search for the last message to or from the lender, title, escrow, HOA, inspector, or appraiser on that file.

Do not log into a lender's internal portal unless the user has that access and completes sign-in. Many lender portals will not be available; email and the tracker are enough.

## Guardrails

- **Drafts only. Never send** a follow-up unless the user explicitly approves that named draft in the same conversation.
- **Never invent a stall.** An item is stalled only if (a) a deadline or a promised date in writing has passed, or (b) a remembered SLA (for example, "we follow up if no title commitment within 7 days of acceptance") has passed *and* the file has no later update. If there is no baseline date, flag `no-baseline` instead of calling it stalled.
- **Never invent a status** ("appraisal is scheduled," "clear to close expected Friday") unless an email or document in the file says so. Quote the date and the source in the internal note.
- **Never handle wire instructions.** Do not request, confirm, compare, copy, or forward wiring details. If title asks the client to confirm a wire, draft a note to the *agent* that the client should verify by phone at a known trusted number. Do not put account numbers in the draft.
- **Flag rather than guess** the right recipient. If you are not sure whether to write the lender's processor or the loan officer, draft to the last person who emailed on that topic and label it `confirm-recipient`.
- **Minimize personal data.** Address and file number are enough to identify the deal in a vendor email. Do not include SSNs, DOBs, full loan numbers, or credit information. A loan last 4 is acceptable only if it is already how that lender identifies the file *and* it appears in prior correspondence.
- **Not legal advice.** Do not threaten cancellation or demand a release of earnest money.
- **Contact no one** until a named send is approved.
- Trust account rules vary by state (Utah-first playbook, otherwise general mode). Do not instruct title or a brokerage how to disburse funds.

## What "stalled" typically looks like

Use these only when the file's own dates support them. Adjust to remembered SLAs.

- Earnest-money receipt not in the file after the contract's delivery deadline
- Seller disclosures not received after the disclosure deadline
- Inspection not confirmed and the due-diligence / inspection deadline is inside the remembered warning window (default: 3 calendar days), or the deadline has passed with no report and no written resolution
- Appraisal not ordered or not received relative to the financing/appraisal deadline and any written "ordered on" date
- Loan conditions or clear-to-close not documented as the settlement date nears
- Title commitment not in the file after the remembered SLA from Acceptance
- HOA documents not in the file when the contract or addendum calls for them
- Repair work or concession items agreed in writing with no completion note as settlement nears

If two written dates conflict, flag the conflict; do not pick the date that makes a louder stall.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, sides?** (memory: `tm.role`, `tm.team_name`, `tm.sides`)
2. **Which transaction system(s)** and how to read them? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet and inbox?** (memory: `tm.sheet_tracker`, `tm.email_inbox`)
4. **Follow-up SLAs** you want (days after Acceptance or after last touch) for title, appraisal, HOA, and lender updates. If they give none, use only contract deadlines plus "no file update in 5 calendar days on an already-opened item" and say so. (memory: `tm.stall_slas`)
5. **Preferred vendor contacts** (title desk, preferred processors) if any, names and emails the user provides. (memory: `tm.vendor_contacts`)
6. **Who approves sends?** (memory: `tm.approver`)
7. **Schedule?** Default suggestion: weekdays at 11:00 AM in the user's timezone. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekdays at 11:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 11 * * 1-5`

**Routine prompt to save:**

```
Run @Stalled Lender Title Escrow Follow-Up.

Look at active files in the remembered tracker and inbox. Flag items that are stalled against a written contract deadline, a written promised date, or a remembered SLA. If you do not have a baseline date, do not call it stalled.

Draft a short follow-up for each stall to the most likely recipient. Do not send anything unless I explicitly approve a named draft ID in that conversation. Never include or request wire instructions. Never invent a status or an appointment.

Identify files by address and file number.
```

## Procedure

1. **Load memory**, active files, the latest deadline digest, and the latest file audit.
2. **Scan each file** for stalls using the rules above. Record: item, baseline date and source, last documented update and source, days since, proposed recipient, draft ID.
3. **Search Gmail** (and the transaction system notes) so you do not follow up on something that was answered yesterday.
4. **Draft FOLLOW-{file}-{topic}** emails that: remind the recipient who you are, name the property, state the documented baseline ("our contract's Financing & Appraisal Deadline is 24 Nov 2026" or "your email of 3 Nov said the appraisal was ordered"), ask one clear question, and avoid legal threats.
5. **List drafts in chat.** Do not send.
6. **On approval of named IDs,** send only those and log them.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Files scanned and stalls found
- Table: file, item, baseline, last update, draft ID, recipient (confirm if unsure)
- Drafts waiting for approval
- One line: "Transaction support only, not legal advice. Nothing was sent."

**Workbook sheets:**

1. `Stalls`
2. `Draft-follow-ups` (full text)
3. `Not-stalled-no-baseline`
4. `Send-log`

## Sample output (EXAMPLE DATA ONLY)

The following files and vendor names are fictional examples. They are not this user's transactions.

**Chat summary (example)**

Stalled Lender, Title & Escrow Follow-Up for 10 Nov 2026 (example). 3 active files scanned. 2 stalls. Nothing sent.

| File | Item | Baseline | Last update | Draft | Recipient |
| --- | --- | --- | --- | --- | --- |
| 1842 Willow Creek Dr, EX-10441 | Signed seller disclosures | Seller Disclosure Deadline 10 Nov 2026, printed in the example REPC deadline box | Unsigned PDF in the folder dated 9 Nov 2026 | FOLLOW-10441-disclosures | Cooperating agent (confirm: Alex Rivera, example) |
| 55 North Pier Pl, EX-10458 | Earnest-money receipt | Delivery deadline 6 Nov 2026 (math in the deadline tracker: Acceptance 2 Nov + 4 calendar days on that example contract) | No receipt in file or inbox | FOLLOW-10458-em | Title / brokerage EM desk (confirm-recipient) |
| 900 Holm Oak Ct, EX-10412 | Appraisal | No order-date in file; Financing & Appraisal Deadline is 26 Nov 2026 | None | None | Not labeled stalled, `no-baseline` for "ordered on." Optional check-in draft available if you want one. |

Reply with any draft IDs to send.

Transaction support only, not legal advice. Nothing was sent.
