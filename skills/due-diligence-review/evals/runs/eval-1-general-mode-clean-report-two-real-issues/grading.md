# Grading: Eval 1, General Mode, Clean Report With Two Real Issues

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with both PDFs read in full (pdftotext, every page). The property is in Idaho, so the skill ran in general mode and read only `review-guide.md` and `objection-writing.md`; it skipped every utah-* reference.

Result: **pass, 8 of 8 expectations; every objective check that applies passes.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode note near the top; no Utah REPC section, statute or radon statistic | Pass | Flags: "General mode: this property is in Idaho. State rules were not checked; this follows the uploaded agreement only." A search for Utah, REPC and DEQ finds nothing |
| 2 | Dryer breaker Tier 1 (page 5); crawlspace leak Tier 2 (page 7) | Pass | Issue List items 1 and 2, with the inspector's words quoted and the one-line reason for rating the leak Tier 2 when the inspector rated it Repair |
| 3 | Recommended ask is exactly the two items with trade, page and proof; six maintenance items held back with reasons | Pass | Recommended Ask items 1 and 2 (licensed electrician, licensed plumber, pages 5 and 7, "paid receipts at least 3 days before Closing" from Section 9.6), plus the standard re-inspection line. Held Back lists the six summary maintenance items and the fallen insulation batts, each with a reason |
| 4 | Timeline: November 12; Repair Request Monday November 9; response ends November 13 skipping November 11; election ends November 17; labeled for strategy | Pass | Negotiating Timeline bullets 1, 3 and 4, with Section 5's business day definition and Veterans Day named; heading line "For strategy; confirm dates with your transactions team." |
| 5 | Notes the missing seller disclosure (Section 8) and no radon or sewer scope | Pass | Flags and Documents Reviewed; Questions 1 and 4 |
| 6 | No cost or remaining-life estimates | Pass | Both items say "Cost: needs bid"; the credit option is "$[credit amount from bid]"; the roof age is the inspector's own estimate, quoted as such |
| 7 | Email: Title Case subject, bolded bottom line with decision and deadline, options, under 300 words, [Agent Name] | Pass | Subject "Inspection Results And Next Steps For 915 Example Larch Street"; bolded first line names November 12; Your Options lists all three; 247 words by wc; signed [Agent Name] |
| 8 | Check before sending lists every date, dollar amount and page reference; no dashes | Pass | 11-row table covering every date, the $5,000 earnest money, each page and the bracketed credit; dash scan 0 |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass, with traced exceptions | `check_output.py` lists 13, 16 and 17: the computed dates November 13, 16 and 17 from Sections 5, 9.3 and 9.4. Every other number is in the agreement, the report or the prompt |
| Deadlines match the uploaded contract | Pass | Inspection Period: Acceptance Date November 2 plus 10 days = November 12 (Section 9.1, 5:00 p.m. Mountain Time per Section 5). Seller Response Period: 3 business days after Monday receipt, excluding the November 11 federal holiday = November 13. Buyer election: 2 business days = November 16 and 17 |
| No em or en dashes | Pass | 0 |
| Title Case subject line | Pass | Every word capitalized |
| Check before sending section | Pass | Last section |
| No cost estimates without bids | Pass | None |
| No agent-only MLS fields in client-facing text | N/A | No MLS sheet uploaded |
| No protected-class language | Pass | The output describes the property and documents only |
| No wire or account details | Pass | None in the inputs or the output |

## Fixes Made During This Run

- The first draft gave a count of Tier 4 notes ("7 items") that was wrong (the report has 11). The count is a number no document states, so SKILL.md's output list now says Tier 4 is one line naming the notable notes, without a count. The output was updated to match.

## Review Note (2026-11-08)

The input PDFs were restamped "PRACTICE FILE: made-up example" (they read "TEST FILE"). Their text is otherwise identical, checked with pdftotext, so this grading stands.
