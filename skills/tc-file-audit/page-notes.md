# Page Notes: TC File Audit

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-10; sources inline. The skill is paid (in the Amplified Skill Library), so the page shows its hero and sample with the Skill Library card; the setup words below are for the day it is free.

## One-Line Promise

Attach one transaction file's document list, the contract's key dates, your brokerage's required-document checklist and your notes, and see in one place what's missing, what's unsigned and what's due this week, with days remaining counted for you and the asks to the agent and the broker already drafted.

## Who It's For

Transaction coordinators, ops leads and team owners who keep files moving from contract to close and get them ready for broker review. Utah first (both Utah REPC versions in use through December 31, 2026); in any other state it works from the dates and documents you upload and says state rules and forms were not checked.

## Connor's Filter: What It Adds That SkySlope and Dotloop Don't

SkySlope, Dotloop, Brokermint and Lone Wolf already hold each file's checklist, flag what's required, and run broker review. The skill doesn't rebuild any of that: it creates no checklist, no task and no upload, and it approves nothing. What none of those screens gives in one place is the file crossed three ways at once: against the brokerage's own required-document list (including its conditional items, such as the lead-based paint disclosure for a home built before 1978), against the contract's dates as the signed addenda actually left them (a change signed by one side stays "proposed"), and against the TC's notes, with days remaining counted in code and the two asks drafted. That crossed view and the drafted asks are the whole product. It also screens the notes for a changed-wiring-instructions email before anything else.

## What to Upload, and Where It Comes From

**What we confirmed and what we could not.** We searched each vendor's help center on 2026-11-10. SkySlope's help center shows a way to email the Checklist's statuses (Update Agent), but no spreadsheet export of the Checklist. For Dotloop, Brokermint and Lone Wolf we found no documented export of a file's checklist or document review statuses. So the inputs are the status email, a screenshot, the page printed to PDF, or a list the TC types or pastes. Untested: a real export or screenshot from any of the four.

1. **The file's document list (required).**
   - **SkySlope:** open the property file, then the Checklist tab. Click the arrow next to Update Agent, use Include Checklist to choose the statuses, type your own email address under Add Email and click Add, then send. The email lists "the status of each Checklist item at the time of sending," with correction comments. Or screenshot the Checklist tab. Source: "MANAGE FILES: Using Update Agent" (updated 2025-12-16), https://support.skyslope.com/support/solutions/articles/156000367909 , checked 2026-11-10. SkySlope's Quick Audit statuses (Pending, Cleared, Flagged, Completed) and Smart Assist's missing-signature flag (California and Arizona): "FILE REVIEW: Quick Audit," https://support.skyslope.com/support/solutions/articles/156000366255 , checked 2026-11-10.
   - **Dotloop:** screenshot each folder of the loop, or print the page to PDF, or type the list. The Report Builder (Business+ and Teams) downloads loop data such as dates as a CSV, not each document's review status. Source: dotloop blog, "Introducing Dotloop's Newest Feature: The Report Builder" (2017), https://www.dotloop.com/blog/2017/06/new-report-builder/ , seen in a search excerpt on 2026-11-10, not opened.
   - **Brokermint (BoldTrail Back Office) and Lone Wolf:** screenshot the transaction's checklist, or type the list. Source for Brokermint's document approval on checklist tasks: "Creating & Managing Transactions and Checklists on Mobile App" (updated 2025-03-12), https://support.brokermint.com/en/articles/7126131-creating-managing-transactions-and-checklists-on-mobile-app , checked 2026-11-10.
   - **A back office or your own tracker:** export CSV or Excel, or paste it.
2. **The contract's key dates (required for the calendar).** The signed purchase contract PDF and every signed addendum, or your own key-dates summary. In Utah the deadlines are in Section 24 of the December 4, 2024 REPC or Section 4 of the November 1, 2026 REPC (sources in `references/utah-repc-deadlines.md`).
3. **Your brokerage's required-document checklist (strongly recommended).** The page from your policy manual, the broker's PDF, or the checklist template in your transaction system. In SkySlope only Auditor and Broker accounts can open Admin > Manage Checklists; ask your broker for the list. Source: "MANAGE CHECKLISTS: Using Flags and Inbox Update" (updated 2025-08-12), https://support.skyslope.com/hc/en-us/articles/360003414532 , checked 2026-11-10. Without it, the audit can't say what's missing against your brokerage's rules, and it says so.
4. **Your notes (recommended).** A notes file, a timeline, forwarded emails. Notes hold the dates no form does and the warnings, such as a changed wire instruction.

Tip: crop or leave out anything with a bank account, a routing number or a Social Security number. The audit never needs them, and it leaves them out of everything it writes.

## Things to Say

1. "Audit this transaction file as of today: what's missing, what's unsigned, and what's due this week?"
2. "Check the Quail Lane file against our brokerage checklist before it goes to broker review."
3. "What's due this week on this deal?"
4. "Just the deadline calendar, please, with days remaining."
5. "Draft the email to the agent asking for what's missing."

## What Comes Back

- Flags first: any message asking to send funds to a new account (always first, with "verify by phone with the title company at a number you already have," and none of its numbers repeated), missing items past due, deadlines inside 3 days, date changes not signed by every party, odd dates (a closing before due diligence), an export older than your as-of date, general mode.
- A bottom line of three sentences: how many items are missing and incomplete, the nearest deadline with its days remaining, and the one thing to chase first.
- What it used, including what each missing input stopped.
- A deadline calendar: each deadline's date and weekday, days remaining from your as-of date (computed in code), its source, and the signed addendum that changed it; a change not signed by everyone listed as proposed, with the date in effect kept.
- Missing items (on your checklist, not in the file), incomplete items (unsigned, initials or pages missing, as the export shows) and anything unclear, each with its due date.
- Due this week: past due first, then each day in order.
- A message to the agent asking for the missing items, and a note to the broker for compliance review, both drafts.
- Check Before Sending: every date with its source and arithmetic, every status with its row, every name and dollar amount. Plus `tc_dates.md`, the arithmetic.

## What It Won't Do

- Say a document, signature or file is compliant, valid or legally sufficient. Your broker reviews the file.
- Interpret the contract or say what a missed deadline means for anyone.
- Extend, move or recompute a deadline. It lists what the signed documents say and who decides.
- Handle, ask for or repeat wire instructions or account, routing or Social Security numbers, or say whether a wire email is real.
- Create a checklist, a task or an upload, or change anything in SkySlope, Dotloop or anywhere. It never sends anything.
- Review a buyer's due diligence stack (Due Diligence Review), answer a repair request (Repair Request Response), explain one counteroffer or addendum (Counter Explainer), or handle after-closing client care (Post-Closing Client Care).

## What You Need

- **Claude:** a plan with skills and code execution on (Settings > Capabilities > Code execution and file creation, called "Create and edit files" in the newer settings), which the skill uses to count every day. The shared plan wording applies: Claude's help center lists skills on every plan, Claude's docs list Pro and up, so Free is unconfirmed. Sources as on the other skill pages: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08 for D-068).
- **ChatGPT version:** a ChatGPT Project with four files (instructions.md, which downloads as tc-file-audit-instructions.md, tc-file-audit-guide.md, deadline-code.md and utah-repc-deadlines.md), plus paste.txt in the Instructions box. It needs data analysis to run the day-count code; ChatGPT's free plan has data analysis only as "Limited." Not run inside ChatGPT.
- **Your transaction system:** a login that can see the file's checklist. No connector.
- **Cost:** nothing beyond your Claude or ChatGPT plan.

## Run, Draft, Own

- **Run:** reads every upload, matches each checklist item to the file, sorts it, and counts every day in code.
- **Draft:** the message to the agent and the note to the broker.
- **Own:** the parties change dates, in writing; the broker reviews the file and decides every compliance question; the title company confirms any wiring instruction, by phone, at a number you already have.

## FAQs

**Doesn't SkySlope (or Dotloop) already do this?** It holds the checklist and runs broker review, one file screen at a time. It doesn't cross the file against your brokerage's own list, the contract's dates as the signed addenda left them, and your notes in one view, with days remaining counted and the asks drafted. That's what this adds.

**Will it tell me the file is ready for closing?** No. It lists what's in the file, what's missing and what's unsigned, as your export shows them, and asks your broker to review. It never says anything is compliant or sufficient.

**An addendum moves closing but only the buyers signed. Which date does it use?** The date in the signed contract. The new date shows as proposed, with who signed, until every party signs. The parties decide, in writing, with your broker.

**What if a wire email shows up in my notes?** It's flagged first, with "verify by phone with the title company at a number you already have." The audit never repeats the email's numbers and never says whether it's real.

**Does it work outside Utah?** Yes, in general mode: it takes every deadline and date from what you upload and says state rules and forms were not checked.

## Practice Prompt

With the four practice files attached: "Audit this transaction file as of November 10, 2026: what's missing, what's unsigned, and what's due this week?"

The practice files are a made-up Utah buyer file (1487 Example Quail Lane, Faketown, Utah; Pinwheel Home Team, Sample Summit Realty): a checklist export CSV with document name, required, status, uploaded date and signed; a one-page REPC key-dates summary PDF marked PRACTICE and not a real form; the brokerage's required-document checklist (.md); and the TC's notes (.txt). Look for the two missing items (the earnest money receipt and the lead-based paint disclosure for a 1974 home), the unsigned Addendum No. 2 (buyers only, so the Settlement Deadline stays December 4), and the Due Diligence Deadline 2 days away. The prompt names the as-of date, so the days remaining match sample.md whenever you run it. Expect a result like sample.md.

## Suggested Library Keywords

transaction coordinator tc file audit transaction file checklist compliance review broker review missing documents unsigned addendum signatures initials skyslope dotloop brokermint lone wolf contract to close deadlines key dates repc utah due diligence deadline settlement deadline seller disclosure deadline earnest money receipt wire fraud ops lead team owner

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md):
- The practice set (eval 1): 10 of 10 expectations and every objective check, kept as sample.md. Utah mode, the December 4, 2024 REPC, four files including a PDF.
- Case 2, a Utah file on the November 1, 2026 REPC whose notes hold a forwarded email asking to send the earnest money to "our new account" with routing, account and phone numbers, plus missing seller disclosures: 10 of 10. The wire request is the first flag with the verify-by-phone line, no number or bank name appears anywhere, the email is never called real or fake, and the days remaining (-1, 10, 14, 21, 31) are right.
- Case 3, an Idaho file in general mode with a closing date before the inspection objection deadline and no brokerage checklist: 7 of 7. The odd date is labeled and not changed, and the business-day earnest money period is not counted.
- The objective checker recomputes every weekday next to a date, every written-out date difference and every deadline row's days remaining, and looks for leaked wire numbers and never-say words.

Not tested:
- A real SkySlope, Dotloop, Brokermint or Lone Wolf export, screenshot or status email (every input was made up), and a scanned or handwritten contract.
- A real signed REPC PDF as the only date source (the practice and case 2 use a key-dates summary and a typed list).
- The ChatGPT version inside ChatGPT; Claude Free; the Gmail draft option.
- A no-skill baseline and an independent second run.

## Calls Left Open for Connor

- **The "this week" window** is the as-of date and the six days after it, and "inside 3 days" is 1 to 3 days out. Both are the builder's choices (the JSON can change them).
- **Conditional items:** the skill applies a conditional checklist item (built before 1978, HOA) only when the uploads show the condition, and calls an "only if the buyers object" item not applicable until an objection is in the notes. Confirm that's how your TCs read them.
- **Checklist status words** (Accepted, Pending Review) are quoted as the system's own and never counted as broker approval of anything.
- **Wire screen wording:** the flag and both drafts use "verify by phone with the title company at a number you already have," and the skill never says whether a message is real. Confirm the wording your brokerage uses.
- **Vendor exports:** none confirmed beyond SkySlope's Update Agent email. One real redacted export or screenshot from each system you use would close this.
- **The sibling post-closing-client-care** is named in the "Not for" line from the assignment; confirm its slug when that skill lands.
