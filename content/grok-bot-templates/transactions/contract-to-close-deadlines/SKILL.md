---
name: Contract-to-Close Deadline Tracker
description: >-
  Use when asked to track real estate contract-to-close deadlines or send a
  daily digest of inspection, appraisal, financing, due diligence, disclosure,
  earnest-money, and settlement dates. Utah REPC-first when the file is a Utah
  contract; otherwise general mode. Never invent a date; compute from the
  contract or amendment and show the math.
---

# Contract-to-Close Deadline Tracker

Goal: every morning, tell the agent or TC which contract deadlines are overdue, due today, or due in the next few days, using only dates written in the contract and addenda or computed from a day-count clause with the math shown. Drafts and tracker updates only, nothing is sent or submitted until the user approves a named action.

## Who it's for

Transaction coordinators, producing agents, team leaders, and ops leaders who manage active buyer or listing files from ratification to settlement.

## What it connects to (system-agnostic)

Teams use different transaction systems. On the first run, ask which of these they use and **how this bot should read each one**: connector, CSV/export dropped in a folder, shared Drive deal folder, email inbox, or browser (owner completes sign-in).

Examples, not requirements: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback if they have no transaction system, or the system cannot be read:** a Google Sheet tracker plus Gmail is the system of record. Create the Sheet on the first run if needed (headers only) and write proposed row updates there as drafts until the user approves.

Also use Gmail for amendments and extension addenda that change dates. Optional CRM (Follow Up Boss or similar) for the active-deal list only; the contract wins over the CRM if they disagree.

## Guardrails

- **Drafts only.** Never send a client or vendor email, never submit a file to broker review, never change a date in the transaction system, and never sign or initial a document unless the user explicitly approves that named action in the same conversation.
- **Never invent dates.** If a deadline is blank, unreadable, or conflicts across documents, leave it blank and flag it.
- **Compute and show the math** whenever a date comes from a day count ("4 calendar days after Acceptance") rather than a printed calendar date. Show the start date, the day-count rule, the intermediate count, and the resulting date and time.
- **Printed calendar dates win over folklore.** If Section 24 (or the form's deadline box) already prints a calendar date, use that date. Do not back into a "typical" inspection period.
- **Flag rather than guess** when two documents disagree, when Acceptance is unclear, or when an addendum might override the original.
- **Never handle wire instructions.** Do not copy, store, forward, or verify account numbers. If an email appears to contain wiring instructions, note that it exists and tell the user to verify offline at a known trusted number. Point closing-week files to the Closing-Week Checklist skill.
- **Minimize personal data.** Identify files by address and file number. Do not copy SSNs, DOBs, loan numbers, or full account numbers.
- **Not legal advice.** A deadline digest is not an interpretation of someone's rights to cancel or a recommendation to cancel.
- **Trust / earnest money.** Tracking the earnest-money *deadline* is in scope; moving or disbursing funds is not. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.**

## Utah REPC-first mode

When the file is a Utah Real Estate Purchase Contract (or they set `tm.form_mode` to Utah), read **the form version in hand**. A revised Utah REPC became available 1 Nov 2026; prior forms may still appear for a time. Do not assume section numbers if the version in front of you differs; use the labeled fields on that document.

On the widely used outgoing Utah REPC, look for:

- **Acceptance** (defined on that form; commonly, signature plus communication to the other side). If only a signature date is present and communication is not documented, flag `acceptance-unclear` and do not silently treat the signature date as Acceptance.
- **Section 24-style deadline box**, typically filled in as calendar dates:
  - Seller Disclosure Deadline
  - Due Diligence Deadline (this is also the usual inspection / objection deadline unless an addendum sets a different one)
  - Financing & Appraisal Deadline
  - Settlement Deadline
- **Earnest money delivery**: the standard form has often required delivery no later than four (4) calendar days after Acceptance, and given the brokerage a further period after receipt to deposit into the trust account. Read the number of days on *this* contract and any "Deposit Earnest Money with Title Company" (or similar) addendum. Do not assume four days if the document says something else.
- **Time-is-of-the-essence / "days" definition** on that form. On the outgoing form this has meant calendar days counted beginning the day *after* the triggering event, deadlines at 5:00 p.m. Mountain Time, and no automatic weekend or holiday rollover. If the form in hand says that, apply it and show it. If it is silent or different, follow the document and flag the ambiguity. Do not move a deadline off a weekend unless the contract says to.

Addenda (FHA/VA, seller financing, subject-to-sale of buyer's property, HOA, well/septic, and extensions) can add or replace dates. Read them. When an extension changes a deadline, show old date → new date and cite the extension.

## General mode (other states and other forms)

Do not import Utah's 5:00 p.m. Mountain Time rule, four-day earnest-money rule, or Section 24 names. Search the contract and addenda for labeled deadlines (examples: inspection/option period, due diligence, appraisal, loan/financing contingency, title review, HOA document review, earnest money, closing/settlement). Use that contract's own definition of days (calendar vs business) and show the math. If the contract does not define days, flag `day-count-undefined` and do not pick one.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, and sides you manage** (buyers, listings, both)? (memory: `tm.role`, `tm.team_name`, `tm.sides`)
2. **Which transaction system(s)** and how should I read each (connector, CSV/export, shared Drive folder, email, browser)? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet**: URL and what each column means, or "create one." (memory: `tm.sheet_tracker`)
4. **Which inbox** holds fully signed contracts, counters, and extensions? (memory: `tm.email_inbox`)
5. **Form mode:** Utah REPC-first or general? Default state? (memory: `tm.form_mode`, `tm.state`)
6. **Who approves outgoing messages and system writes?** (memory: `tm.approver`)
7. **Daily digest time and timezone?** Default suggestion: 7:30 AM daily in the user's timezone. (memory: `tm.schedule`, `tm.timezone`)

## Recommended routine

**Schedule:** Daily at 7:30 AM in the user's timezone.

**Cron (example, America/Chicago):** `30 7 * * *`

**Routine prompt to save:**

```
Run @Contract-to-Close Deadline Tracker.

Read active files from the remembered transaction system (or the fallback Google Sheet and inbox). Use Utah REPC-first rules when the contract is a Utah REPC; otherwise general mode.

Refresh deadlines from the fully signed contract and any signed amendments or extensions. Never invent a date. If a date is computed from a day count, show the math. If two documents disagree or Acceptance is unclear, flag both sides.

Send a short daily digest: overdue, due today, due in the next 3 calendar days, then the rest of the week. Identify files by address and file number.

Do not send client or vendor messages, and do not change dates in the transaction system, unless I explicitly approve a named action in that conversation.
```

## Procedure

1. **Load memory.** If system or form mode is missing, ask before continuing.
2. **Build the active-file list** from the transaction system, Sheet, inbox, or CRM, limited to files that are under contract and not yet closed or cancelled.
3. **For each file, collect governing documents:** ratified contract, counters, addenda, and any extension. If the signed contract is not available, flag `missing-contract` and skip date invention.
4. **Extract written dates** (deadline box / labeled fields) and **day-count clauses**. For each computed date, write a math line, for example: `Acceptance 2026-11-02 (Mon, as written) + 4 calendar days starting the day after Acceptance (Tue=1, Wed=2, Thu=3, Fri=4) = 2026-11-06 by 5:00 p.m. MT per the form's "days" section.` Replace every piece with what *this* contract actually says.
5. **Reconcile with the tracker.** Propose row updates (`draft-only`) where the tracker is blank or stale. If the tracker and the contract disagree, flag rather than overwrite.
6. **Classify each deadline** as `overdue`, `due today`, `due in 1 to 3 calendar days`, `due this week`, or `later`. Include earnest-money delivery, seller disclosures, due diligence / inspection, financing, appraisal (together or separate as the form writes them), settlement, and any extra addendum dates.
7. **Draft, do not send,** any reminder messages the digest suggests. Park them in the workbook.
8. **Save** `deadline-digest-YYYY-MM-DD` and send the chat digest.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat digest (short):**

- Mode (Utah REPC-first or general) and number of active files
- Overdue / due today / due in 3 days, each with address, file number, deadline name, date and time, source (section or addendum), and math if computed
- Conflicts and missing contracts
- Draft reminders waiting for approval (not sent)
- One line: "Transaction support only, not legal advice. No dates were invented."

**Workbook sheets:**

1. `Digest`
2. `All-deadlines`
3. `Date-math`
4. `Conflicts-and-gaps`
5. `Draft-reminders` (unsent)
6. `Proposed-tracker-updates` (unapplied)

## Sample output (EXAMPLE DATA ONLY)

The following addresses, file numbers, and dates are fictional examples. They are not this user's files.

**Chat digest (example)**

Contract-to-Close Deadline Tracker for Tue 10 Nov 2026, 7:30 AM America/Chicago (example). Utah REPC-first. 4 active files.

Overdue
- 55 North Pier Pl, EX-10458, Earnest money delivery was 6 Nov 2026 by 5:00 p.m. MT. Math: Acceptance 2 Nov 2026 (Mon, as written on the REPC) + 4 calendar days starting the day after Acceptance (3 Nov=1 … 6 Nov=4), using the 4-day delivery language printed on that example contract. No receipt in the file.

Due today
- 1842 Willow Creek Dr, EX-10441, Seller Disclosure Deadline 10 Nov 2026 by 5:00 p.m. MT, copied from the deadline box on the example REPC (a printed calendar date, no math). Disclosures not yet marked received.

Due in the next 3 calendar days
- 1842 Willow Creek Dr, EX-10441, Due Diligence Deadline 13 Nov 2026 by 5:00 p.m. MT, printed in the deadline box. Inspection report is in the file; no written resolution or cancellation note yet (flag only, not legal advice).

Conflicts
- 900 Holm Oak Ct, EX-10412, Tracker settlement date 5 Dec 2026 vs signed extension dated 4 Nov 2026 moving Settlement to 12 Dec 2026. Not overwritten. Reply "apply EX-10412 settlement update" if you want the tracker changed.

No messages were sent.

Transaction support only, not legal advice. No dates were invented.
