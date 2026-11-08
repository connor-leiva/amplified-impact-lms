# Grading: Eval 3, Utah November 2026 REPC, HOA Rental Cap and Pending Special Assessment

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with all three PDFs read in full. The REPC footer reads "EFFECTIVE NOVEMBER 1, 2026," so the skill ran in Utah mode with the new form's section map from `utah-due-diligence-timing.md`, plus `review-guide.md`, `utah-property-notes.md` (rental restrictions, reinvestment fees, radon) and `objection-writing.md`.

Result: **pass, 8 of 8 expectations; every objective check that applies passes.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | November 1, 2026 REPC identified; numbering 12.1, 4(b), 8.2, 8.3(a); deadline November 17, 2026, 5:00 PM MT, 9 days; no response period | Pass | Flags quote the footer and list the sections; Bottom Line and Timeline give "Tuesday, November 17, 2026," "9 days" and "No response period"; no December 2024 numbers appear |
| 2 | Rental cap full (6 of 30, 20%), 4 on waitlist, 12-month minimum, nothing under 30 days; plan not assured; waitlist; no grandfathered status | Pass | HOA Findings, Rentals: all figures with pages; "Morgan would start with no rental status"; "depends on a slot opening; nothing in the packet says when" |
| 3 | $4,200 assessment, vote December 15 after the December 11 Settlement Deadline, 8.2 Seller box doesn't cover it as written; recommended ask has a $4,200 credit or written agreement | Pass | Bottom Line; HOA Findings, "Who pays under the REPC" quotes 8.2's "as approved, prior to the Settlement Deadline"; Recommended Ask item 2, with a no-double-pay clause |
| 4 | Reserves ($21,500 vs $58,000, 31%, roofs 0 to 2 years) and the 38% premium increase as questions; insurance agent for master versus owner coverage | Pass | HOA Findings, "Roofs and reserves" ("questions to ask, not a verdict") and "Insurance"; Question 5 |
| 5 | $2,490 is 0.6% of $415,000, above 0.5%, to title to confirm, never called unlawful, buyer's cost under 8.3(a) | Pass | HOA Findings, "Fees at closing"; a search for "unlawful" or "illegal" finds nothing; the $350 setup fee is noted as the buyer's too |
| 6 | Bedroom 2 smoke alarm Tier 1 and in the ask; roof referred to the HOA | Pass | Issue List item 1; Recommended Ask item 1; Held Back, "Roof condition ... the HOA maintains the roof" |
| 7 | Owner account number absent | Pass | `check_output.py --forbid ECT-0014-55817`: not present; no long digit runs |
| 8 | Email: Title Case subject, under 300 words, options without telling the buyer whether to buy; Check before sending; no dashes | Pass | Subject "Inspection And HOA Review For 77 Example Cove Lane, Unit 14"; 281 words by wc; Your Options lists all three; Check before sending present; 0 dashes |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass, with traced exceptions | `check_output.py` lists .25, .5, 2010, 57 and 46 (Utah Code 57-1-46's 0.5% and 0.25% caps and the March 16, 2010 date, from `utah-property-notes.md`), 48 (EPA's 48-hour radon test minimum, `review-guide.md`) and 10 (November 10, the day after a Monday, November 9 delivery). 9 days is November 17 minus November 8. 0.6% is in the packet and equals $2,490 divided by $415,000 |
| Deadlines match the uploaded contract | Pass | 4(a) November 6, 4(b) November 17, 4(c) November 24, 4(d) December 1, 4(e) December 11, all 2026 |
| No em or en dashes | Pass | 0 |
| Title Case subject line | Pass | Every word capitalized |
| Check before sending section | Pass | Last section, 11 rows |
| No cost estimates without bids | Pass | The only dollar figures come from the packet or the REPC; the smoke alarm says "needs bid" |
| No agent-only MLS fields in client-facing text | N/A | No MLS sheet uploaded |
| No protected-class language | Pass | The rental discussion covers the CC&Rs and statute only; exemptions are listed as the CC&Rs list them, with applicability sent to an attorney |
| No wire or account details | Pass | The payoff statement's account number and wire warning are not repeated |

## Fixes Made During This Run

- The first draft's buyer Next Steps had the request going out Monday before the buyer's answer was due Wednesday. Reordered so the buyer answers by Monday and the request goes out early.
- The first draft said the reinvestment cap applies "for covenants recorded on or after May 6, 2026" only. It now also says the same 0.5% cap applied before that change to covenants recorded on or after March 16, 2010, which is what makes the 2016 covenant a question for title (from `utah-property-notes.md`).
- Removed "likely minor" from the smoke alarm's cost line, and the Tier 4 count (same SKILL.md change as eval 1).
