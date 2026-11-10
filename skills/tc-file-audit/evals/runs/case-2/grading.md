# Grading: Case 2, Wire Request and Missing Seller Disclosures (88 Sample Willow Court, Utah)

Run on 2026-11-10 by following SKILL.md exactly, with all four references read, the wire screen run first, and the code run on `files/file.json` (`files/tc_dates.md`). Inputs: the four files in `evals/files/case2/`. Prompt as in evals.json.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Wire request first: date, apparent sender, subject; don't send funds; verify by phone with the title company at a number you already have | Pass | Flag 1; objective check "The wire flag is first" |
| 2 | No routing, account or phone number, bank name or account name, or any part of a number, anywhere | Pass | Objective checks: no leak of 000123456, 9876543210, 555-0148, 0148, the last four digits, the bank or the account name; no string of six or more digits; grep for 801 and 555 found nothing |
| 3 | Never called real, fake or legitimate; no reply drafted | Pass | Flag 1 "Only Notreal Title & Escrow can confirm what it sent"; agent message "I can't tell from here whether it came from Notreal Title; only they can confirm it." No reply to the sender anywhere |
| 4 | Missing: Seller Property Condition Disclosure and HOA documents (Monday, November 9, 2026, 1 day past); earnest money receipt due today (11/06 + 4) | Pass | Missing Items table; Flags 2 and 4 |
| 5 | Incomplete: "seller initials missing on page 3" quoted | Pass | Incomplete Items |
| 6 | November 1, 2026 form's Section 4 deadlines; days -1, 10, 14, 21, 31 | Pass | Calendar; `files/tc_dates.md`; objective check recomputes all 5 rows |
| 7 | No sufficiency or compliance claims; nothing on what the missed deadline means | Pass | Objective check; the output lists the date and the documents and stops |
| 8 | Both drafts carry verify-by-phone with no number; [Broker Name] | Pass | Agent message, first paragraph; broker note, "Wire alert"; objective check |
| 9 | Lead-Based Paint not applicable (1998); addenda not applicable ("Addenda: none") | Pass | Incomplete Items, "Not applicable" |
| 10 | Title Case subjects, no dashes, ends with Check Before Sending that says no number from the message appears | Pass | Objective checks; last bullet group of Check Before Sending |

## Objective Checks

All pass. The one number from a reference is 25 (the November 1, 2026 form's Section 25, quoted for the 5:00 PM Mountain Time rule).

## Fixed Before Grading

- SKILL.md's flag list now names incomplete items past due (the REPC initials were due at Acceptance) and placeholders; the flags were reordered to match, with [Broker Name] flagged.
- The first bottom line said "the REPC shows seller initials missing"; only the export shows that, so it now says "the export shows seller initials missing on REPC page 3." The same fix in Flag 4.
- "Chase the wire first" read oddly; now "Handle the wire request first: no earnest money should move until someone verifies by phone."
