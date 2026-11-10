---
name: Missing-Documents File Audit
description: >-
  Use when asked to audit a real estate transaction file for missing, unsigned,
  or incomplete documents before broker or compliance review. Compare the file
  against the brokerage's own checklist (not a guessed list). Do not submit
  the file for review or contact anyone until the user approves.
---

# Missing-Documents File Audit

Goal: before a broker or compliance review, or on a regular sweep, list what the file still needs, using the brokerage's checklist and the documents that are actually present. The bot never invents a house-required document list and never submits the file.

## Who it's for

Transaction coordinators, ops leads, and agents who have to send a clean file to their broker. Works on buyer and listing files.

## What it connects to (system-agnostic)

Ask which system(s) hold the file documents and how to read them: connector, CSV/export, shared Drive deal folder, email inbox, or browser (owner completes sign-in). Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** a Google Sheet tracker (one row per required document, per file) plus the deal's Drive folder and Gmail attachments.

The brokerage checklist itself usually lives in Drive, an intranet PDF, or a remembered list the user pasted during setup. That checklist is the source of "required."

## Guardrails

- **Drafts only.** Never submit a file for broker or compliance review, never mark a document complete in the transaction system, never sign or initial a form, and never email a client or cooperating agent asking for a doc unless the user approves that named message in the same conversation.
- **Never invent the required-document list.** If `tm.broker_checklist` is missing, ask for it and produce only a "commonly seen, not confirmed for your brokerage" appendix, clearly labeled as unofficial.
- **Never invent dates or signature statuses.** If a signature looks blank or a page is missing, flag `unsigned` or `page-missing`. Do not assume a later email cured it unless that document is in the file.
- **Flag rather than guess** when a document exists but may be the wrong version, the wrong property address, or a counter that was not the final ratified set.
- **Never handle wire instructions.** If present, note "wire instructions in file, not reviewed, not copied."
- **Minimize personal data.** Refer to documents by type and date. Do not extract SSNs, DOBs, account numbers, or license numbers into the report.
- **Not legal or compliance advice.** A missing-item list is not a conclusion that the file would pass or fail an audit.
- **Trust documents:** earnest-money receipts belong on the checklist when the broker requires them; do not move funds. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.**

## Utah-first notes (documents, not dates)

When `tm.form_mode` is Utah, name documents the way Utah files usually name them (REPC, addenda, seller disclosures, agency/buyer-broker agreement, earnest-money receipt) **after** they appear on the user's broker checklist or in the file. Do not add extra Utah forms just because they are common. If the checklist is silent, put candidates only in the unofficial appendix.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, sides, brokerage?** (memory: `tm.role`, `tm.team_name`, `tm.sides`, `tm.brokerage_name`)
2. **Which transaction system(s)** and how to read files? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet / Drive folder pattern?** (memory: `tm.sheet_tracker`, `tm.folder_template`)
4. **Where is the official broker/compliance checklist?** File link, or paste it. Separate buyer-side and listing-side if they differ. Also note any extra items for FHA/VA, new construction, short sale, HOA, or tenant-occupied. (memory: `tm.broker_checklist`)
5. **When is a file supposed to go to broker review?** (for example, within 48 hours of ratification, and again before closing) (memory: `tm.review_milestones`)
6. **Who approves submission and missing-doc emails?** (memory: `tm.approver`)
7. **Schedule?** Default suggestion: weekdays at 9:00 AM in the user's timezone, prioritizing files that are new, approaching a review milestone, or within 7 days of settlement. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekdays at 9:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 9 * * 1-5`

**Routine prompt to save:**

```
Run @Missing-Documents File Audit.

Check active files in the remembered transaction system or Drive folders against our official broker checklist (the remembered one; do not invent requirements). Prioritize new files, files approaching a broker-review milestone, and files within 7 days of settlement.

Flag missing, unsigned, incomplete, address-mismatched, or possibly superseded documents. Draft missing-document request emails in the workbook; do not send them and do not submit any file for broker review unless I explicitly approve that named file in that conversation.

Identify files by address and file number. Do not copy SSNs, account numbers, or wire instructions into the report.
```

## Procedure

1. **Load memory.** If `tm.broker_checklist` is missing, ask for it before labeling anything "required."
2. **Select files in scope** (all active, or the ones the user named). Prioritize as in the routine prompt.
3. **Inventory what is in the file:** document title, date, page count if obvious, signed vs blank, and which system or folder it lives in.
4. **Compare to the official checklist** for that side and file type. Statuses:
   - `present-signed`
   - `present-unsigned`
   - `present-incomplete` (pages missing, blanks in required fields that you can see without extracting sensitive values)
   - `present-wrong-property` (address or file number does not match)
   - `present-possibly-superseded` (an older counter sits next to a later one; flag both)
   - `missing`
   - `n/a` (checklist item does not apply, only if the checklist itself says when it applies, or the user has remembered rules; otherwise `confirm-if-applicable`)
5. **Unofficial appendix only:** list commonly seen extras *not* on the broker checklist, labeled "not required by your remembered checklist."
6. **Draft, do not send,** a missing-document request for each counterparty who appears to owe a document (client, cooperating agent, title, lender). One draft per recipient per file.
7. **Propose, do not execute,** broker-review submission for files with zero missing required items. If anything is missing, do not offer submission as a one-click step.
8. **Save** `file-audit-YYYY-MM-DD` and send the chat summary.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Files audited and checklist used (name and date of the checklist document)
- Files that look complete vs files with missing required items, ranked by closeness to review or settlement
- The missing/unsigned list per file
- Draft requests and any "ready to submit" proposals waiting for approval
- One line: "Transaction support only, not compliance or legal advice. Nothing was submitted."

**Workbook sheets:**

1. `Summary`
2. `File-by-checklist` (one row per required item per file)
3. `Missing-and-unsigned`
4. `Unofficial-appendix`
5. `Draft-requests` (unsent)
6. `Proposed-submissions` (unsent)

## Sample output (EXAMPLE DATA ONLY)

The following files and checklist items are fictional examples. They are not this user's brokerage requirements.

**Chat summary (example)**

Missing-Documents File Audit for 10 Nov 2026 (example). Checklist used: "Summit Key Brokerage buyer-file checklist, revised 1 Aug 2026" (example, remembered). 3 buyer files audited.

Needs work
- 1842 Willow Creek Dr, EX-10441, 2 required items open: earnest-money receipt (`missing`); seller disclosures (`present-unsigned`, PDF in the deal folder dated 9 Nov 2026 has a blank seller signature block). Agency disclosure `present-signed`. Ratified REPC + counters `present-signed`.
- 55 North Pier Pl, EX-10458, 1 required item open: buyer-broker agreement (`missing`). Settlement is 5 Dec 2026 on the tracker (example).

Looks complete against the remembered checklist (not submitted)
- 900 Holm Oak Ct, EX-10412, all required items `present-signed`. Proposed action SUB-10412: submit for broker review, waiting on your approval.

Draft requests (not sent): REQ-10441-title (earnest-money receipt), REQ-10441-coop (signed seller disclosures), REQ-10458-client (buyer-broker agreement).

Transaction support only, not compliance or legal advice. Nothing was submitted.
