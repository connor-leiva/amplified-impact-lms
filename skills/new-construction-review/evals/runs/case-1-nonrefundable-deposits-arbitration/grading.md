# Grading: Case 1, Nonrefundable Deposits and Binding Arbitration (Utah, To Be Built)

Run on 2026-11-08 following SKILL.md 1.0 exactly, reading the three PDFs with the Read tool and computing every sum and date in Python. Output: `output.md`. Objective checks: `objective-checks.txt` (from `evals/make/objective_checks.py`).

**Result: 10 of 10 expectations passed. All objective checks pass.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Flags first, in bold, the 12:00 PM MT November 10, 2026 expiry within 48 hours | Pass | First bullet under Flags, bold: "The lot reservation expires at 12:00 PM Mountain Time on Tuesday, November 10, 2026, two days from today," with the $44,900 due then. |
| 2 | Bottom line of three sentences or fewer naming the top three risks with amounts or dates | Pass | Three sentences: $47,400 and $62,400 nonrefundable with no financing, appraisal or inspection out; arbitration, implied warranty waiver and the one-year claim limit; no outside completion date and the 4% increase ($23,960). |
| 3 | Money table with the reservation credit, $22,500, $22,400, $15,000, Design Center placeholder, timing, holder, nonrefundable point and running totals | Pass | Money at Risk table: six rows, holder "Builder" on each, running totals "$2,500 + $22,500 = $25,000," "$25,000 + $22,400 = $47,400," "$47,400 + $15,000 = $62,400," "[50% of selections]." |
| 4 | Arbitration as written, one-year claim limit and implied warranty waiver to an attorney, no enforceability conclusion | Pass | Key Terms rows quote PSA 7.2, 7.3, 8.1 and 8.2; attorney items 2 to 4 quote Utah Code 78B-11-107(1) and 78B-2-225 and say "How that applies here is the attorney's call." |
| 5 | REPC comparison uses only the November 1, 2026 numbers and names 12.1, 12.2, 12.3 and Section 19 | Pass | "REPC 3(a), 12.1," "3(b), 12.2," "3(c), 12.3," "REPC 19.2," plus Sections 5, 11, 4 and 25, 18, 20, 14. No December 2024 section numbers anywhere. |
| 6 | Unlimited extensions and no outside date flagged; ILSA question to the attorney without saying what follows | Pass | Key Terms "No outside date and no delay remedy"; attorney item 5 quotes 15 U.S.C. 1702(a)(2) and asks "whether the lack of a firm completion obligation matters here." |
| 7 | 4% cost adjustment with the largest increase computed | Pass | "4% x $599,000 = $23,960 (computed)" in Key Terms and the bottom line. |
| 8 | Rep's promise set against the entire-agreement clause and inspection terms, with a request to put it in writing | Pass | Builder rep question 2 quotes PSA 12.1 and 4.3 and asks "Can that promise go into a signed addendum?"; the email repeats it in plain words. |
| 9 | Buyer email: Title Case subject, under 350 words, no advice to sign, attorney review, no em dashes, signed Jordan Sampleagent | Pass | Subject "What The Notreal Ridge Contract Says Before You Sign Tuesday"; 332 words; "Whether to sign is your call"; Next Step 1 is attorney review; signed "Jordan Sampleagent." |
| 10 | Check before sending lists every date, dollar amount and page reference, computed figures marked | Pass | 25-row table; $44,900, $47,400, $62,400, $23,960, $3,169.50 and the three assumed-date examples marked "Computed." |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | Pass. Not in the inputs: $23,960, $3,169.50, $44,900, $47,400, $62,400, each shown with its math. 0.25%, May 6, 2026, November 1, 2026 and January 1, 2027 come from the skill's Utah references (57-1-46 and the REPC version note), cited by name. November 17, December 10, 2026 and August 7, 2027 are labeled as computed from an assumed November 10, 2026 Contract Date. |
| Deadlines match the uploaded contract | Pass. 12:00 PM MT November 10, 2026 (Reservation); 7, 30 and 270 days and 5 days after frame notice (PSA, Deposit Schedule); weekdays checked in code. |
| No em dashes | Pass |
| Title Case subject lines | Pass |
| "Check before sending" section | Pass |
| No cost estimates without bids | Pass. No repair, tax or construction cost is estimated; only contract figures and their sums. |
| No agent-only MLS fields in client-facing text | Not applicable (no MLS sheet); none present |
| No protected-class language | Pass |
| No wire or account details | Pass |

## Notes

- The skill's Utah notes added items a generic review misses: the reinvestment fee checked against Utah Code 57-1-46, the construction lien window (38-1a-502), the DOPL license lookup, and the one-year claim clause read against 78B-2-225(3)(c).
- No fixes were needed after this run.
