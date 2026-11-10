# TC File Audit: Guide

Two parts: where each input comes from, then the rules for the audit. Read both on every request.

## Part 1: Where Each Input Comes From

Last verified: 2026-11-10

What a TC, ops lead or owner can hand the audit, and where each piece comes from. Use it to say in one line where to get a missing piece. Never ask anyone to retype what a file already shows.

### The Transaction File's Document List

The audit needs, for each document in the file: its name, whether it is uploaded, its review status if the system shows one, the date added, and its signature state if the system shows one. Any of these shapes works:
- a checklist or document export (CSV or Excel), from the transaction system or the brokerage's back office
- a screenshot of the file's checklist or document list, or the page printed to PDF
- an email the system sent with the checklist's status
- a list typed or pasted from the screen

What we confirmed in each vendor's help center, and what we could not:

**SkySlope.** Each property file has a Checklist tab. From it, "Update Agent" sends an email with a link to the Checklist and "the status of each Checklist item at the time of sending," including correction comments. Click the arrow next to Update Agent to choose which statuses to include ("Include Checklist") and to add your own email address ("Add Email"), so a TC or admin can send the status list to themselves and forward or paste it. An admin's Quick Audit shows statuses Pending, Cleared, Flagged and Completed; Flagged means SkySlope's Smart Assist found missing signatures or initials (the article says Smart Assist is available in California and Arizona). Agents can filter the Checklist by status, such as Required. We found no help article for exporting the Checklist as a spreadsheet. Sources: "MANAGE FILES: Using Update Agent" (updated 2025-12-16), https://support.skyslope.com/support/solutions/articles/156000367909 ; "FILE REVIEW: Quick Audit", https://support.skyslope.com/support/solutions/articles/156000366255 ; "SkySlope: Insider Hacks for Agents" (updated 2025-05-22), https://support.skyslope.com/support/solutions/articles/156000366431 ; all read 2026-11-10.

**Dotloop.** Dotloop's Report Builder (Business+ and Teams) downloads a CSV of loop data, which holds loop details such as dates, not each document's review status. Document review statuses show in the loop's folders. We found no current dotloop help article for exporting a loop's document list or review statuses, so a screenshot of the loop's folders, the page printed to PDF, or a typed list is the input. Source: dotloop blog, "Introducing Dotloop's Newest Feature: The Report Builder" (2017), https://www.dotloop.com/blog/2017/06/new-report-builder/ , found 2026-11-10 in a search excerpt, not opened; menu names may have changed.

**Brokermint (BoldTrail Back Office).** Checklist tasks can require document approval, and a reviewer approves or rejects each document. We found no help article for exporting a transaction's checklist. Screenshot the transaction's checklist or type the list. Source: Brokermint help center, "Creating & Managing Transactions and Checklists on Mobile App" (updated 2025-03-12), https://support.brokermint.com/en/articles/7126131-creating-managing-transactions-and-checklists-on-mobile-app , read 2026-11-10.

**Lone Wolf (Transact and back office).** Lone Wolf describes custom checklists and broker file review. We found no help article for exporting a file's checklist. Screenshot it or type the list.

**Any other back office or the TC's own tracker** (a spreadsheet, a project tool): export it as CSV or Excel, or paste it.

Column names differ by system ("Status," "Review Status," "Signed," "Signatures"). Read them as they come; never rename a status. Statuses like Accepted, Approved, Completed or Cleared are the system's or the reviewer's words, quoted as theirs.

### The Contract's Key Dates

- **The contract itself** (the signed REPC PDF, every page), plus every signed counteroffer and addendum. In Utah, the deadlines are in Section 24 of the December 4, 2024 form or Section 4 of the November 1, 2026 form (see `utah-repc-deadlines.md`).
- **Or a key-dates summary**: the TC's own page, the transaction system's dates screen, or a typed list. A summary is only as good as its typing: list it as the source and say the signed contract controls.
- **Every addendum that changes a date,** with who signed it and when. An addendum that isn't in the uploads can't be cited; if the notes mention one, ask for it.

### The Brokerage's Required-Document Checklist

- The brokerage's own list of what every file must hold and by when: a page from the policy manual, a PDF or document the broker hands out, or the checklist template in the transaction system.
- In SkySlope, only Auditor and Broker accounts can create and manage checklists (click your name, then Admin, then Manage Checklists). A TC without that access asks the broker for the list. Source: "MANAGE CHECKLISTS: Using Flags and Inbox Update" (updated 2025-08-12), https://support.skyslope.com/hc/en-us/articles/360003414532 , read 2026-11-10.
- Without the brokerage's list, the audit can still read the dates and what the export marks as required, but it can't say what the brokerage requires. Say so and ask for the list.

### The TC's Notes

Anything the TC keeps: a notes file, a timeline, forwarded emails, a text thread copied out. Notes often hold the dates no form does (an appraisal appointment, a promise from the agent) and the warnings (a changed wire instruction). Read them all, top to bottom.

## Part 2: Audit Rules

How the audit reads the file, sorts every checklist item, reads the dates, screens for wire requests, and writes the two drafts. The brokerage's checklist and the signed documents decide; these rules only say how to line them up.

### 1. The Wire and Banking Screen (Run It First)

Read every note, forwarded email and text in the inputs before anything else. A message is a **wire-change request** when it does any of these:
- says wiring instructions, bank details or an account changed, or gives "new," "updated" or "corrected" instructions
- asks anyone to send earnest money, closing funds or proceeds to an account, especially "today," "urgently" or a new one
- asks for an account, routing or Social Security number, or asks to confirm one by reply, link or a phone number it supplies
- tells the reader not to call the old number, or to use only the number in the message

When one is found:
- It is the first flag, above everything: "A message in the notes asks to send the earnest money to a new account. Don't send or forward any funds or banking details. Verify by phone with the title company at a number you already have." Name the message by its date, its apparent sender's company and its subject only.
- **Never repeat** its routing number, account number, account name, bank name, phone number, link or reply-to address, anywhere in the output, including Check Before Sending. Write "the numbers in that email" instead. Never write any part of a number (no last four digits).
- Never call the message fake or real. The title company confirms it, by phone, at a number the TC already has (the number on the title company's first contact, its opening package, or its website looked up separately), never one from the message.
- Never draft a reply to the sender. The message to the agent and the note to the broker each carry the warning in one or two sentences, with no numbers.
- The same rule covers any wire, account, routing or Social Security number anywhere in the inputs, even in an ordinary document: leave it out and say "a number in [document] was left out."

### 2. The As-Of Date, the Mode and the Form

- **As-of date:** the date the user gives ("as of Friday," "it's November 10"); otherwise today's date. Say which in What I Used. A weekday the user names without a date resolves to the next one on or after today; say so.
- **Export date:** when a file name or the export says when it was pulled, and that is before the as-of date, say statuses may have changed since.
- **Utah mode** when the property is in Utah: read `utah-repc-deadlines.md`. **General mode** anywhere else: take every deadline's name and date from the uploads, use no section numbers, and say: "State rules and forms were not checked."
- **Form:** in Utah, name the REPC version from its footer, as the uploads show it. Not shown: say so.

### 3. Building the File JSON

Write `file.json` in the shape `deadline-code.md` shows. Every value comes from the uploads or the user's message.

**Deadlines.** One entry per contract deadline, in the contract's own order, with the date in effect and its source (file and line, row or page). Then:
- A change **signed by all parties** (the export or the document shows every signature) replaces the date: put the old date and its source under "was," and cite the change as the source of the new date.
- A change **not signed by all parties**, or whose signatures the uploads don't show, does not replace the date. Put it under "proposed" with who signed and when. The calendar keeps the earlier date and says: "Addendum No. 2 would change this to [date]; it shows [signatures]. Until every party signs, the date above stands, per the documents shown. The parties decide, in writing; confirm with your broker."
- A date only in the notes ("closing moved to the 11th") is not a deadline. List it as "the notes say," and ask for the signed change.

**Counted periods.** Anything the contract counts in calendar days from an event (earnest money, funding and Recording), from the event's date in the uploads. Business days are never counted in code (the code doesn't know holidays): list a business-day period as written ("within 3 business days of 11/02") and say it wasn't computed.

**Dated.** Upcoming dates from the notes or documents that matter this week: an appraisal appointment, a promised objection, an inspection. Each with its source.

**Items.** One entry per item on the brokerage's checklist (one per document when an item covers several, such as "every addendum"). For each:
- **found:** the document in the file it matches, with its row or line. Match by meaning, not spelling ("SPCD" is the Seller Property Condition Disclosure). A match you're not sure of is "unclear," with why.
- **result**, exactly one:
  - **in file:** uploaded, and signed as the checklist asks, or signatures not required. A review status (Pending Review, Submitted) doesn't change this; quote it.
  - **missing:** the checklist requires it (including a conditional item whose condition the uploads show is met, such as "built before 1978" with a 1974 year built) and the file doesn't hold it: no row, or a row marked not uploaded, empty or Required.
  - **incomplete:** in the file, but the export or document shows a signature, initials, a date or pages missing ("Buyers only," "initials missing on page 3"), or the reviewer rejected or returned it. Say exactly what is shown.
  - **unclear:** the uploads can't settle it (a conditional item whose condition isn't shown; a match you're not sure of; a signature state not shown when the checklist asks for one).
  - **not applicable:** a conditional item whose condition the uploads show is not met (built 1998, "only if built before 1978"), or one that applies only if something happens that hasn't (an objection not yet sent). Say why.
- **due:** the checklist's timing, as a deadline's name, a counted period's name or a date. No timing on the checklist: leave it empty.

**Extra.** Documents in the file that no checklist item asks for. One line in What I Used.

Never invent a document, a status, a signature or a date. If the export doesn't show signatures, the signature state is "not shown," never "signed."

### 4. Odd Dates

The code flags a deadline earlier than one the contract lists above it, or earlier than Acceptance, and a proposed change that would be out of order. Label each one "Odd date: check it against the signed contract" in Flags and in the calendar, name both dates and their sources, and stop there: never say which date is wrong, never pick one, never compute a corrected one. Ask the agent which document shows the intended date, and ask the broker to review. A deadline on a weekend is not odd: say the weekday, and in Utah apply only what `utah-repc-deadlines.md` says.

### 5. Due This Week

From the as-of date through the six days after it (seven days in all). Everything dated in that window: deadlines, counted periods, dates in the notes, and every missing, incomplete or unclear item due in it, in date order, each with its weekday, date and days remaining. Deadlines inside 3 days are flagged. Items already past due and still open go first, under their own line.

### 6. The Message to the Agent (Draft)

- To the agent on the file, by first name, from the TC (the user's name or [TC Name]). A Title Case subject line naming the property and the ask, such as "Missing Documents for 1487 Example Quail Lane".
- Short: one line on why, then the missing items, then the incomplete items, each with what's missing and the date it was due or is due (weekday and date, from the documents), then the deadlines inside 3 days. Ask for each item by name.
- When a wire-change request was found: one line, "Please tell the buyers not to send any funds to new instructions. Verify by phone with the title company at a number you already have." No numbers.
- Never say a deadline was or will be extended, never say what happens if one is missed, never say a document is fine. Follow the user's voice profile when one is in the conversation; otherwise warm, plain and direct. No em dashes.

### 7. The Note to the Broker (Draft)

- To the managing broker (the name on the checklist, or [Broker Name]), for compliance review. Title Case subject line.
- What it holds: the file (property, side, form), the as-of date, the counts (in file, missing, incomplete, unclear), each missing and incomplete item with its due date, any proposed date change not signed by all parties, any odd date, any weekend question the form raises, and any wire-change request (described without numbers, with the verify-by-phone step taken or to take).
- It asks the broker to review; it never says the file, a document or a signature is compliant, valid, complete or sufficient, and never recommends what the broker should decide. Status words are quoted as the system's ("the export shows Accepted").

### 8. Words the Audit Never Uses About a Document, Date or File

Compliant, compliance-ready, valid, legally sufficient, enforceable, binding, "good to go," "all set," "approved" (except quoting a system's status), "extended" (unless quoting a fully signed change), "you can," "you must," "the buyer may cancel," "the seller can keep." The audit lists what the documents say and who decides.

### 9. Check Before Sending

Before either draft goes out, list:
- every date in the drafts and the calendar: the date, its weekday, its source (file and line, row or page) and its days-remaining arithmetic from the code ("2026-11-12 - 2026-11-10 = 2")
- every document name and status quoted, with its row
- every signature state, with its row
- every dollar amount, with its source
- every name, with where it was spelled
- every placeholder, and anything not shown in the uploads (initials on every page, a signature state)
- in a file with a wire-change request: "No account, routing or phone number from that message appears above," and the verify-by-phone step
