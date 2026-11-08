# Grading: Eval 2, Utah December 2024 REPC, Summary Gap, Deadline Tomorrow

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with all three PDFs read in full. The REPC footer reads "EFFECTIVE DECEMBER 4, 2024," so the skill ran in Utah mode and read `utah-due-diligence-timing.md`, `review-guide.md`, `utah-property-notes.md` (radon) and `objection-writing.md`.

Result: **pass, 8 of 8 expectations; every objective check that applies passes.** The no-skill baseline (`baseline.md`) passes 2 of 8.

## Expectations

| # | Expectation | Skill run | Baseline |
|---|---|---|---|
| 1 | Bold flag first: deadline Monday, November 9, 2026, 5:00 PM Mountain Time, under 48 hours; call team leader and transactions team now | **Pass.** First line of the output, in bold, ending "Call your team leader and your transactions team now." | **Fail.** The deadline appears under "Timing," after the panel discussion, with no time-of-day emphasis and no call to the team leader |
| 2 | Identifies the December 4, 2024 REPC and uses 8.1 and 24(b) | **Pass.** Flags line quotes the footer; Timeline cites 8.1(b), 8.1(c), 18, 21 and 24(b); no November 2026 numbers | **Fail.** No version check and no section numbers |
| 3 | Scorched FPE Stab-Lok panel (page 9) Tier 1 and marked not in the summary | **Pass.** Issue List item 1: "Not in the inspector's summary," quoting page 9 in full | **Pass.** "The summary page doesn't mention it" and page 9 quoted |
| 4 | Window well moisture (page 6) marked not in the summary; disclosure's No raised as a neutral question | **Pass.** Issue List item 2 and Question 1 | **Partial, graded Fail.** The moisture and the disclosure conflict are raised, but it is not marked as missing from the summary, and it adds a cost guess ("a few hundred dollars") |
| 5 | Pushes back on furnace-and-GFCI only; recommended ask includes the panel by a licensed electrician | **Pass.** Bottom Line second sentence; Recommended Ask item 1; Held Back explains the furnace and GFCIs | **Pass.** Opens with the pushback; objection item 1 is the panel |
| 6 | No Response Period: resolve in writing by 5:00 PM November 9, cancel, or signed extension; no seven-day or three-day window | **Pass.** Flag line and Timeline bullet 3 ("Sending the objection does not extend anything"); no response period or cancellation window described | **Fail.** "Once the seller receives it, they'll have a response period ... and your buyers will then have a short window to decide whether to cancel." Under this REPC that advice would let the deadline pass and the earnest money go hard |
| 7 | Earnest money becomes non-refundable if neither happens (8.1(c)) | **Pass.** Timeline bullet 4 and the email's last option paragraph | **Fail.** Not mentioned |
| 8 | No cost estimates; Title Case subject; email under 300 words with deadline and options; Check before sending; no dashes | **Pass.** No figures; subject "Inspection Results And Tomorrow's Deadline For 3355 W Example Falcon Court"; 247 words; Check before sending present; 0 dashes | **Fail.** "$2,000 to $4,500" replacement range and a "$3,500 credit" with no bid; subject "Inspection results and next steps"; no Check before sending; 3 em dashes and 2 en dashes; "don't hesitate to reach out" |

## Objective Checks (Skill Run)

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass, with traced exceptions | `check_output.py` lists 18 (REPC Section 18, Notices, from `utah-due-diligence-timing.md`; the abbreviated upload leaves that section out) and 48 (EPA's 48-hour minimum radon test, from `review-guide.md`; also the "48 hours" in the flag rule). "1 in 3" is Utah DEQ, from `utah-property-notes.md` |
| Deadlines match the uploaded contract | Pass | Due Diligence Deadline November 9, 2026 (24(b)); Financing & Appraisal Deadline November 20, 2026 (24(c)); Settlement Deadline December 1, 2026 (24(d)); 5:00 PM Mountain Time (21) |
| No em or en dashes | Pass | 0 |
| Title Case subject line | Pass | Every word capitalized |
| Check before sending section | Pass | Last section, 10 rows |
| No cost estimates without bids | Pass | Credit written as "$[credit amount from bid]" |
| No agent-only MLS fields in client-facing text | N/A | No MLS sheet uploaded |
| No protected-class language | Pass | None |
| No wire or account details | Pass | None |

## What the Skill Adds Over the Baseline

The baseline found the panel, which a careful reader of an 11-page report can do. What it got wrong is what costs a buyer money: it described a response period this REPC doesn't have, so the agent would have sent the objection Monday and waited past 5:00 PM; it never said the earnest money goes hard at the deadline; it invented replacement costs and a credit amount; and its email broke four house rules. The skill's version-specific timing reference and the 48-hour flag rule are the difference.

## Fixes Made During This Run

- Tier 4 count removed (see eval 1's note; the same SKILL.md change).
- The email first said "He calls it a fire hazard." The inspector's gender isn't in the report, so it now reads "The inspector calls it a fire hazard."
- `review-guide.md` gained EPA's 48-hour minimum test time, so the skill can say plainly that a radon test can't finish before a deadline less than 48 hours away (source: EPA Home Buyer's and Seller's Guide to Radon, March 2024 revision, checked 2026-11-08).

## Review Note (2026-11-08)

The input PDFs were restamped "PRACTICE FILE: made-up example" (they read "TEST FILE"). Their text is otherwise identical, checked with pdftotext, so this grading stands.
