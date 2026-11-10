---
name: Post-Close File Closeout
description: >-
  Use after a real estate file has settled or recorded, or when sweeping
  recently closed files: draft the commission request or CDA, archive the
  file, draft a review request, and draft a CRM status update. Do not send,
  submit, or change CRM or MLS status until the user approves each named
  action. Never invent a close date or a commission amount.
---

# Post-Close File Closeout

Goal: finish the last mile after settlement (commission paperwork, a clean archive, a review ask, and a CRM update) without sending anything or changing statuses until the user approves each named step. This is transaction wrap-up, not the accounting tie-out (point matched deposits to Commission Tie-Out).

## Who it's for

Transaction coordinators, ops leads, and agents who keep closing files open for days because the CDA, the review request, and the CRM never quite get done.

## What it connects to (system-agnostic)

Ask which system(s) they use and how to read the closed file: connector, CSV/export, shared Drive folder, email inbox, or browser. Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** the Google Sheet tracker plus the deal's Drive folder and Gmail (title's settlement confirmation, CDA requests, brokerage commission desk).

Also:
- **CRM** (Follow Up Boss or similar): draft a stage change to Closed / Past Client; do not change it until approved.
- **MLS / listing portal (browser)**: remind the listing side to report closed/sold if it is still showing active or pending; do not click status changes until approved.
- **Commission Tie-Out skill / QBO**: if the user also has that bookkeeping skill, point them to it once a CDA and deposit exist. Do not post accounting entries here.

## Guardrails

- **Drafts only.** Never send a CDA or commission request, never email a review ask, never change CRM or MLS status, never archive/destroy a file in the transaction system, and never sign a commission form unless the user explicitly approves that named action in the same conversation.
- **Never invent a close date or a commission number.** Settlement, funding, and recording can be different days; use the word on the document you have (settlement statement, recording confirmation, title email) and cite it. Copy GCI and net amounts only from a CDA, settlement statement, or brokerage statement that is in the file. If the document is missing, leave amounts blank and flag `needs-CDA`.
- **Do not compute a split from memory** of "our usual 70/30." If you propose CDA figures, they must come from the document or from a remembered split plan the user has already attached to this file, and you must show the math. Prefer handing numbers to Commission Tie-Out for the books.
- **Never handle wire instructions.** Do not copy title or commission-wire account numbers into the CDA draft or chat. If the brokerage requires a wiring path for commission, write `see brokerage secure instructions` and nothing else.
- **Flag rather than guess** when title says "funded" but the county has not recorded, or when possession is post-closing.
- **Minimize personal data.** Address and file number identify the deal in a review request. Do not include sale price in a public review ask unless the user wants that (default: no price). No SSNs, no account numbers, no lockbox codes (and remind someone to remove the lockbox without printing the code).
- **Not legal, tax, or accounting advice.**
- **Contact no one** until a named send is approved.
- Trust account rules vary by state (Utah-first playbook, otherwise general mode). Do not request a trust disbursement except by drafting a commission/CDA form the brokerage already uses, still unsent.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, sides, brokerage?** (memory: `tm.role`, `tm.team_name`, `tm.sides`, `tm.brokerage_name`)
2. **Which transaction system(s)** and how to read them? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet and archive folder pattern?** Where should completed files be copied or moved (Drive "Closed/YYYY/…")? (memory: `tm.sheet_tracker`, `tm.archive_folder`)
4. **How are commissions requested?** Brokerage CDA form, title CDA, email to a commission desk, or another path. Where does the blank form live? (memory: `tm.cda_process`)
5. **Review request:** which platforms (Google, Zillow, a remembered link) and who the message comes from (agent vs TC)? (memory: `tm.review_channels`)
6. **CRM stage name** for a closed client and any tags (past client, sphere). (memory: `tm.crm`, `tm.crm_closed_stage`)
7. **Who approves each closeout step?** (memory: `tm.approver`)
8. **Schedule?** Default suggestion: weekdays at 2:00 PM in the user's timezone, sweeping files that settled in the last 14 days and files marked pending-close whose settlement date has passed. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekdays at 2:00 PM in the user's timezone.

**Cron (example, America/Chicago):** `0 14 * * 1-5`

**Routine prompt to save:**

```
Run @Post-Close File Closeout.

Sweep files that have a documented settlement, funding, or recording event in the last 14 days, and files whose settlement date has passed but are still marked open. Never invent a close date or a commission amount.

For each file, draft (do not send) the commission request or CDA using figures only from documents in the file, propose an archive action, draft a review request with no sale price unless I asked for one, and draft a CRM status update.

Do not send, submit, archive, or change CRM or MLS status unless I explicitly approve that named action ID in that conversation. Never include wire instructions or lockbox codes.
```

## Procedure

1. **Load memory** and find files in the closeout window. Confirm the close with a document or a title email; if the tracker says "closed" but there is no evidence, flag `close-unconfirmed` and do not send review requests.
2. **For each confirmed file, check:**
   - Evidence of settlement / funding / recording (cite the source and the date word it uses)
   - CDA or commission request: present-submitted, present-unsent, or missing
   - Commission figures available from a document (copy, do not invent)
   - File completeness leftover from Missing-Documents File Audit
   - Archive: documents already in the remembered archive folder or not
   - CRM stage vs remembered closed stage
   - MLS / listing status if this was a listing (active/pending vs closed)
   - Review request already sent or not (look in send-log and Gmail)
   - Physical wrap-up tasks: lockbox/sign pickup (no codes), key return
3. **Draft actions with IDs:**
   - CDA-{file}: filled from documents, or a request to title/commission desk with blanks for any missing figure
   - ARCHIVE-{file}: what to copy where
   - REVIEW-{file}: short thank-you + remembered review link, no price by default
   - CRM-{file}: proposed stage/tag change
   - MLS-{file}: proposed status reminder for listing files
   - TIEOUT-{file}: a note to run Commission Tie-Out once the deposit hits
4. **All drafts stay unsent.** Chat lists IDs and blockers (`needs-CDA`, `close-unconfirmed`).
5. **On named approval:** execute only those IDs, log them, and stop.
6. **Save** `post-close-YYYY-MM-DD`.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Files in the closeout window and how close was confirmed
- Per file: CDA status, archive status, CRM status, review status, leftover docs
- Draft IDs waiting for approval
- One line: "Transaction support only, not legal or tax advice. Nothing was sent or changed."

**Workbook sheets:**

1. `Closeout-board`
2. `CDA-drafts` (no account numbers)
3. `Review-drafts`
4. `CRM-and-MLS-proposals`
5. `Archive-plan`
6. `Send-log`

## Sample output (EXAMPLE DATA ONLY)

The following file and amounts are fictional examples. They are not this user's closing.

**Chat summary (example)**

Post-Close File Closeout for 10 Nov 2026 (example). 1 file confirmed closed, 1 unconfirmed.

1842 Willow Creek Dr, EX-10441 (example)
- Close evidence: title email dated 9 Nov 2026 saying "funded and recorded 9 Nov 2026" (example). Settlement statement also in the folder.
- CDA: missing. Settlement statement shows total brokerage commission $18,500.00 (printed). Team split is **not** computed here because no split plan is attached to this file; CDA-10441 is a request draft with the printed GCI and blanks for the desk to complete, not an invented net.
- Archive: deal folder is still in Active/; proposed ARCHIVE-10441 to Closed/2026/1842-Willow-Creek-EX-10441
- CRM: still "Under Contract" in the example, proposed CRM-10441 → Past Client
- Review: not sent; REVIEW-10441 drafted with the remembered Google review link, no sale price
- TIEOUT-10441: run Commission Tie-Out when the deposit hits operating

55 North Pier Pl, EX-10458, tracker says settlement 8 Nov 2026 but there is no title confirmation or statement in the file. `close-unconfirmed`. No review draft offered.

Nothing was sent. Reply with IDs to execute (for example, REVIEW-10441 and CRM-10441).

Transaction support only, not legal or tax advice. Nothing was sent or changed.
