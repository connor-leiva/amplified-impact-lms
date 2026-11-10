---
name: Closing-Week Checklist
description: >-
  Use when a real estate file is inside about seven days of its settlement
  deadline: run a closing-week checklist and remind the agent and client about
  wire-fraud precautions. Never handle, copy, store, forward, or verify wire
  instructions or account numbers. Never invent a closing date or a clear-to-close.
---

# Closing-Week Checklist & Wire-Fraud Reminders

Goal: for every file whose settlement date is within the next seven calendar days (or that is supposed to have settled and has not), produce a closing-week checklist and draft reminders, including a wire-fraud warning that never contains wiring details. The bot does not close the file, send wires, or confirm numbers from an email.

## Who it's for

Transaction coordinators, agents, and ops leads in the final week before settlement on buyer or listing files.

## What it connects to (system-agnostic)

Ask which system(s) they use and how to read the file: connector, CSV/export, shared Drive folder, email inbox, or browser. Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** the Google Sheet tracker plus Gmail. Use the latest deadline digest, file audit, and stalled-item list when they exist.

Do not open banking apps to send money. Do not open a "secure wire portal" link from an email.

## Guardrails

- **Drafts only.** Never send client or vendor messages, never mark a file closed, never submit documents, and never sign anything unless the user approves that named action in the same conversation.
- **NEVER handle wire instructions.** This is a hard stop.
  - Do not request wiring details in chat or email.
  - Do not copy, store, screenshot, transcribe, compare, or forward account numbers, routing numbers, or "updated wiring instructions."
  - Do not say that instructions in an email look "correct" or "match."
  - If an email or portal claims to contain wiring instructions, record only: `wire-instruction-email-present` (date, sender display name, subject), not the numbers.
  - Drafts may remind people to verify instructions by calling a phone number they already obtained from a trusted source (the title company's known main number, not a number in the email).
  - If anyone, including the user, pastes wiring details into chat, do not repeat them back, do not write them into a sheet, and ask them to delete the chat paste and verify offline.
- **Never invent dates or statuses.** Settlement date comes from the contract or a signed extension. "Clear to close" appears only if a lender email or document says those words (or the equivalent) and you cite it. Possession, walk-through, and funding times are listed only if written.
- **Flag rather than guess** when the tracker date, the contract, and a title email disagree, or when funding vs. recording vs. possession might be different days.
- **Minimize personal data.** No SSNs, loan numbers, or account numbers. Address and file number identify the deal.
- **Not legal, tax, or financial advice.** A checklist is not a guarantee the file will fund.
- **Do not move money** of any kind. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one** until a named send is approved.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, sides?** (memory: `tm.role`, `tm.team_name`, `tm.sides`)
2. **Which transaction system(s)** and how to read them? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet?** (memory: `tm.sheet_tracker`)
4. **What does "closing week" mean for you?** Default: settlement deadline (or signed extension) within 7 calendar days, plus any file that should have settled already and has not. (memory: `tm.closing_window`)
5. **Standard closing-week tasks** your team uses (walk-through, insurance binder, CD review, utilities, keys/lockbox, occupancy, final numbers). If they have a brokerage checklist, that wins. (memory: `tm.closing_checklist`)
6. **Who should get the wire-fraud reminder drafts** (buyer, seller, agent)? (memory: `tm.wire_warning_audiences`)
7. **Who approves sends?** (memory: `tm.approver`)
8. **Schedule?** Default suggestion: daily at 8:00 AM in the user's timezone; the run no-ops when no file is in closing week. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Daily at 8:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 8 * * *`

**Routine prompt to save:**

```
Run @Closing-Week Checklist.

Include files whose settlement date (contract or signed extension) is within the next 7 calendar days, and files that should already have settled but are still open. Never invent a settlement date.

Produce a checklist against the remembered closing-week items and the documents actually in the file. Draft client and agent reminders, including a wire-fraud warning that tells people to verify instructions by calling a known trusted number.

NEVER copy, store, forward, compare, or confirm wire instructions or account numbers. If a wire-instruction email is present, note only that it exists.

Do not send anything unless I explicitly approve a named draft ID in that conversation.
```

## Procedure

1. **Load memory** and select files in the closing window using only documented settlement dates. Show the source of each date.
2. **For each file, run the checklist** (use the user's list if they provided one). Mark each item `done` (evidence cited), `open`, `n/a`, or `unknown`. Typical items to include *if* they are on the remembered list or clearly relevant, still without inventing completion:
   - Settlement date source and any extension
   - Signed settlement statement / closing disclosure in file (present or not; do not extract figures beyond a flag that the document exists)
   - Lender clear-to-close documented or not
   - Title / escrow confirmation of appointment or mobile signing, if written
   - Homeowner's insurance binder (buyer files) if written as required
   - Walk-through scheduled or completed, only if written
   - Repairs or concessions from written resolutions marked complete or not
   - Final occupancy / possession notes as written in the contract
   - Utilities / keys / lockbox / garage remotes as tasks (do not print lockbox or alarm codes)
   - Missing-document audit leftovers
   - Commission / CDA status (point to Post-Close File Closeout if already funded)
   - Wire-fraud reminder drafted (not sent)
3. **Conflicts:** tracker vs contract vs title email on date, time, or location; list both and do not pick.
4. **Draft** CLOSE-{file}-agent, CLOSE-{file}-client, and CLOSE-{file}-wire-warning. The wire-warning draft must contain no account numbers and no forwarded instruction text.
5. **Save** `closing-week-YYYY-MM-DD` and send the chat summary. Send drafts only after named approval.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Files in closing week and the source of each settlement date
- Open checklist items per file, ranked by what could block settlement
- Whether a wire-instruction email was detected (yes/no, no numbers)
- Draft IDs waiting for approval
- One line: "Transaction support only, not legal advice. No wire instructions were handled. Nothing was sent."

**Workbook sheets:**

1. `Files-in-window`
2. `Checklist` (one row per item per file)
3. `Conflicts`
4. `Drafts` (full text, no account numbers)
5. `Send-log`

## Sample output (EXAMPLE DATA ONLY)

The following file and dates are fictional examples. They are not this user's closing.

**Chat summary (example)**

Closing-Week Checklist for 10 Nov 2026 (example). 1 file in window.

900 Holm Oak Ct, EX-10412, Settlement Deadline 12 Dec 2026 is *not* inside 7 days, skipped.  
1842 Willow Creek Dr is not in window in this example.

Demo row so you can see the shape (example file EX-10990, 220 Sample Ave, Sample City, UT):
- Settlement date 14 Nov 2026, printed in a signed extension dated 1 Nov 2026 (example). Original REPC box said 7 Nov 2026, extension wins; both shown.
- Clear-to-close: not in file (`unknown`, not assumed).
- Closing disclosure PDF: present dated 7 Nov 2026 (example). Figures not extracted.
- Walk-through: no confirmation in file (`unknown`).
- Wire-instruction email: present (8 Nov 2026, sender displayed as "Sample Title Closer," subject "Wiring instructions"), **contents not opened into this report.**
- Drafts (not sent): CLOSE-10990-agent, CLOSE-10990-client, CLOSE-10990-wire-warning.

**Wire-warning draft excerpt (example, not sent, no numbers)**

When you receive closing figures or any message about how to send funds, do not use account numbers from email or text. Call the title company at the main phone number you already have from their official website or from an earlier trusted card, not a phone number in the message, and confirm instructions before sending anything. We will never suddenly change wiring details by email. If something looks off, call me before you send funds.

Transaction support only, not legal advice. No wire instructions were handled. Nothing was sent.
