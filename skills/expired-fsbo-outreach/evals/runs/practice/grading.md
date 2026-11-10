# Grading: Practice Run, MLS Expired Export and FSBO Leads Export, Salt Lake County, Utah

Run on 2026-11-10 (Tuesday) by following SKILL.md exactly, with `expired-fsbo-guide.md`, `ethics-and-fair-housing.md`, `utah-calling-rules.md` and the outreach checklist in `outreach-rules.md` read. Inputs: the two practice files (13 MLS rows, 7 FSBO rows). Prompt (the page's practice prompt): "Here's my expired export from the MLS and a FSBO list from my lead service. I'm Avery Testwood with Example Ridge Realty. Draft my first touches and a touch plan." The read, the decisions, the sort and the price changes were worked out in code (`evals/make/expected_rows.py practice`), as step 1 says.

Result: **pass, 14 of 14 checks**, plus the objective checks.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Withdrawn rows 2 and 7 get no drafts, flagged as possibly still under a listing agreement (Article 16, SOP 16-4) | Pass | Flag 2; Held Out table |
| 2 | Canceled rows 4 and 10 get no drafts and are held until the agent confirms no agreement is in effect | Pass | Flag 2; Held Out table (fresh MLS search or the listing brokerage) |
| 3 | Row 9 (status Expired, expiration Monday, November 30) is held out because the date is after today | Pass | Flag 2; Held Out table |
| 4 | FSBO row 2 is skipped with the ad's words ("NO AGENTS PLEASE. Principals only."), and FSBO row 6 is held out as listed with a flat-fee brokerage | Pass | Flags 2 and 3; Held Out table |
| 5 | 13 first touches, in sort order: expired by expiration date newest first (rows 6, 1, 13, 11, 5, 12, 3, 8), then FSBO by ad date oldest first (rows 4, 3, 5, 1, 7) | Pass | The List; First Touches 1 to 13; objective check "in sort order" matches `expected_rows.py` |
| 6 | Call openers only for MLS rows 1, 12 and 8 and FSBO rows 5 and 1 (Clean, checked Monday, November 9); Jamie Placeholder's check is 69 days old, so no call until rescrubbed; DNC, blank and no-phone rows say why | Pass | Flag 4; The List "Why" column; objective check "Call opener only for CALL rows" |
| 7 | No texts, and a flag says why | Pass | Flag 5; objective check "No text drafts" |
| 8 | Private Remarks (relocating, motivated, the lockbox code, tenant, divorcing, the dog) appear nowhere; one line says agent-only fields were set aside | Pass | Flag 7; objective check "Never-appear strings absent" |
| 9 | FSBO row 5's words about the area, the church and the elementary school appear nowhere; the letter uses "new carpet, central air and large corner lot"; one generic flag | Pass | Flag 8; First Touch 11 |
| 10 | Example Holdings LLC gets a letter at its office address and no knock; both entity owners get "Hello," and nothing about the owner | Pass | Flag 6; First Touches 5 and 6 |
| 11 | The three FSBO owners with an email get an email instead of a letter, with a Title Case subject and the CAN-SPAM footer | Pass | First Touches 10, 12 and 13; objective checks on subjects and footers |
| 12 | No phone number, price, price change, buyer claim, reason for expiring, or prior agent or brokerage in any draft | Pass | Objective checks "No phone number anywhere", "No dollar amounts, buyer claims", "No listing office named" |
| 13 | The plan runs two weeks from Tuesday, November 10, with no calls on Wednesday, November 11 (Veterans Day) or Sundays, says why (house practice, 13-25a-103 and the 13-25a-111 licensee exemption), and keeps calls 8 AM to 8 PM | Pass | Touch Plan; Check before sending |
| 14 | Check before sending lists every date, day count and property fact with its row and column, the scrub dates and internal list, the MLS relist search, the footer, the brokerage name, city door-to-door rules and the placeholders | Pass | Check Before Sending |

## Objective Checks

`objective-checks.txt`: every check passes. Notes a person graded:
- Worked-out numbers: the price changes ($10,000, $26,000, $30,000, $35,000) are original minus final price from the export, marked "worked out" and kept in the agent-only list; 69 is the days from the DNC check date to today; 13 is the count of owners contacted. Graded pass.
- "Call day to grade": the line flagged is the call opener saying the listing "expired on Sunday," not a call on a Sunday. Graded pass.

## What This Run Doesn't Show

- A voice profile QUICK CARD (none in this case), an XLSX export and a list over 15 owners (the batch rule).
- The dates depend on today, Tuesday, November 10, 2026: run on another day, the plan, the "Wednesday is Veterans Day" line and the order of who to call first change.
