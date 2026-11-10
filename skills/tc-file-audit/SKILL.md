---
name: tc-file-audit
description: "Audits one transaction file from contract to close for a TC, ops lead or team owner. Crosses the file's document list (a SkySlope, Dotloop, Brokermint or Lone Wolf checklist export, a screenshot or a typed list) against the brokerage's required-document checklist, the contract's dates and addenda, and the TC's notes. Returns flags, a bottom line, a deadline calendar with days remaining computed in code, missing and incomplete items, what is due this week, a request to the agent and a compliance review note to the broker. Utah REPC first, general mode elsewhere. Flags any wire-change request. Use it when someone says audit this file, what is missing from this deal, check the file before broker review, or what is due this week, even if they never say file audit. Not for a buyer's due diligence stack (due-diligence-review), answering a repair request (repair-request-response), explaining one counteroffer or addendum (counter-explainer), or after-closing client care (post-closing-client-care)."
compatibility: "Needs code execution (Settings > Capabilities > Code execution and file creation) to count days in Python. Works from uploaded checklist exports, screenshots, PDFs and notes; no connector needed. Gmail is optional, only to save a draft when asked."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# TC File Audit

Line up one transaction file three ways at once: the documents in it, the brokerage's own required-document checklist, and the contract's dates, so a TC or ops lead sees what's missing, what's unsigned, and what's due this week, with the asks already drafted. SkySlope, Dotloop and the rest already hold checklists and broker review; this adds the one view that crosses the file against the brokerage's list and the contract's dates.

**Run:** reads every upload, matches each checklist item to the file, sorts it, and computes every days-remaining number, counted period and order check in code. **Draft:** the message to the agent and the note to the broker, for the TC to read first. **Own:** the parties change dates, in writing; the broker reviews the file and decides every compliance question; the title company confirms any wiring instruction, by phone, at a number the TC already has. This skill never says a document is compliant, valid or legally sufficient, never extends or changes a deadline, and never asks for, repeats or handles wire instructions or account, routing or Social Security numbers.

## 1. Get the Inputs

Read `references/file-exports.md`.
- **The best set:** the file's document list (an export, a screenshot, the system's status email or a typed list, with each document's status and signatures if shown); the contract's key dates (the REPC or a key-dates summary) and every addendum that changes one; the brokerage's required-document checklist; and the TC's notes, including forwarded emails.
- **Nothing attached:** say in one line what to gather (the list above, starting with the file's checklist) and stop.
- **Some pieces missing:** work with what's there and say what each gap stopped. No brokerage checklist: no missing-item cross, only what the export marks required. No dates: no calendar. No signature column: signature state "not shown."
- Never ask anyone to retype what a file shows. A word or number you can't read is [illegible] and goes in Check Before Sending. A missing name is a [placeholder], flagged.

## 2. Screen for Wire and Banking Requests First

Before anything else, read every note and forwarded email by `references/audit-rules.md`, section 1. Any message that changes wiring instructions or asks for funds to a new account is the first flag, with "verify by phone with the title company at a number you already have," and its numbers, phone number and links are never repeated anywhere. Never call it real or fake, and never draft a reply to it.

## 3. Set the As-Of Date, the Mode and the Form

Section 2 of the rules. The as-of date is the user's, otherwise today's; say which. Utah mode when the property is in Utah: read `references/utah-repc-deadlines.md` and name the REPC version from its footer. Anywhere else, general mode: take every name and date from the uploads and say "State rules and forms were not checked."

## 4. Build the File JSON and Run the Code

Read `references/deadline-code.md`. Write `/tmp/tc/file.json` by section 3 of the rules: the deadlines in the contract's order (a change signed by all parties replaces a date and is cited; one that isn't stays "proposed"), the counted periods, the week's other dates from the notes, one entry per checklist item with its match, result and timing, and the documents no item asks for. Then extract and run the code as that file shows. Don't read the code into the conversation. If code execution is off, say to turn it on (Settings > Capabilities) and stop: this skill doesn't count days by hand.

Every days-remaining number, weekday, counted date, order check and count in the output comes from the run, with its arithmetic. Never compute a new one by hand; if a figure isn't in the run, leave it out or rerun.

## 5. Read the Calendar

- Every deadline with its date, weekday, days remaining and source. A date a signed addendum changed cites that addendum and the date it replaced.
- A change not signed by all parties is listed under the deadline as proposed, with who signed; the date in effect stays. Say who decides: the parties, in writing, with the broker.
- **Odd dates** (section 4 of the rules): "Odd date: check it against the signed contract," with both dates and sources. Never say which is right.
- In Utah, the weekend rule only as `references/utah-repc-deadlines.md` states it. Never move a date.

## 6. Cross the File Against the Checklist

From the run: **Missing Items** (required, not in the file), each with the checklist line, its due date, days remaining or days past due, and what the notes say about it; **Incomplete Items** (in the file, with a signature, initials, a page or a date shown missing, or returned by the reviewer), each with exactly what the export shows; anything **unclear**, with why. Items not due until after this week go on one line. Quote every status as the system's own word.

## 7. Write the Drafts

Sections 6 and 7 of the rules.
- **Message to the agent:** a Title Case subject, the missing and incomplete items with their dates, the deadlines inside 3 days, and the wire warning when one was found (no numbers). Signed with the user's name or [TC Name].
- **Note to the broker:** for compliance review: the file, the counts, each open item with its date, any unsigned date change, any odd date, any wire request (no numbers). It asks for review and never says anything is compliant or sufficient.
- Follow the user's voice profile QUICK CARD when one is in the conversation (amplifiedimpact.io/voice-profile); otherwise warm, plain and direct. With the Gmail connector and the user's ask, save each as a draft. Never send.

## 8. Guardrails

- **Stay in lane:** never say a document, signature or file is compliant, valid, enforceable or legally sufficient; never interpret contract terms as advice or say what a missed deadline means for anyone; never extend, move or recompute a deadline. The words in section 8 of the rules never appear.
- **Wire fraud:** never ask for, handle or repeat wire instructions or account, routing or Social Security numbers, or any part of one. A wire-change request is flagged at the top with the verify-by-phone step.
- **Never invent** a document, status, signature, date, name or dollar amount. Unclear is "unclear"; not shown is "not shown."
- **Privacy:** no client financial details beyond what the drafts need (the earnest money amount when the contract shows it). Agent-only notes stay in the audit, not the drafts.
- **Don't rebuild the transaction system:** no new checklist, no tasks created, nothing uploaded, approved or changed in SkySlope, Dotloop or anywhere. The value is the crossed view and the drafted asks.
- **Drafts only:** never send, never write to any system, connectors read only.

## 9. Output, In This Order

1. **Flags**, only when they apply: a wire-change request (always first), missing or incomplete items past due, deadlines inside 3 days, date changes not signed by all parties, odd dates, a missing input and what it stopped, the export older than the as-of date, general mode, the as-of date assumed, placeholders and anything illegible.
2. **Bottom Line** (three sentences max): how many items are missing and incomplete, the nearest deadline with its days remaining, and the one thing to chase first.
3. **What I Used:** each file and what it held, the as-of date and why, the mode and form, documents in the file that no checklist item asks for, and every gap.
4. **Deadline Calendar:** the table (deadline, date and weekday, days remaining, source, what changed it), proposed changes, counted periods, odd dates.
5. **Missing Items.**
6. **Incomplete Items** (and anything unclear).
7. **Due This Week:** past due and still open first, then each day in order.
8. **Message to the Agent** (draft).
9. **Note to the Broker** (draft).
10. **Check Before Sending:** by section 9 of the rules. Attach `tc_dates.md` so the arithmetic can be checked.

If the user asks for one part ("just the calendar"), give that part with Flags and Check Before Sending.
