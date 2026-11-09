# Grading: Practice Files (Lot 47, Make-Believe Meadows, Utah)

Run on 2026-11-08 following SKILL.md 1.0 exactly, on the three files in `practice/`, with the practice prompt from `page-notes.md`. Output: `output.md` (also `sample.md`); objective checks: `objective-checks.txt`.

**Result: 12 of 12 checks passed. All objective checks pass.**

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | The lot hold and incentive signing deadline (5:00 PM MT November 13, 2026) is flagged with days from today | Pass | Flags, second bullet: "That's 5 days from today." Not bold, correctly, since it is more than 48 hours away. |
| 2 | Bottom line of three sentences or fewer with the top three risks and amounts | Pass | $20,337.50 at risk; $17,500 to $0 and the 30-day approval risk; arbitration, warranty waiver and the four plat items. |
| 3 | Money table: $10,000, $10,337.50, change orders, holder, nonrefundable points, the $500 fee, running totals computed | Pass | "$10,000 + $10,337.50 = $20,337.50"; "$9,500 back (computed)"; the 5.4 forfeiture called out under the table. |
| 4 | Incentive: up to $17,500, five conditions, $0 with the credit union, forfeiture, offer period; no lender advice | Pass | "The lender choice belongs to the buyers. This describes the conditions; it doesn't say which loan is better." |
| 5 | RESPA: missing Affiliated Business Arrangement Disclosure requested; PA 12.2 next to Addendum 5 and Section 9, sent to an attorney, no conclusion | Pass | RESPA points and attorney item 4. |
| 6 | PID from the plat: name, 0.015 per dollar maximum, recorded notice; 57-1-49 annual cost asked for now; no tax estimate | Pass | "Lot 47 on the plat," first bullet. |
| 7 | Lot 47's own plat issues: collapsible soils, the canal easement against the landscaping requirement, the drainage swale | Pass | Three bullets, each routed to the builder, inspector or engineer; the easement is cross-checked against PA 10.4. |
| 8 | Arbitration, implied warranty waiver and one-year filing limit to an attorney with no enforceability conclusion | Pass | Attorney items 2 and 3. |
| 9 | REPC comparison uses only the November 1, 2026 section numbers | Pass | Sections 5, 3(a) and 12.1, 3(b) and 12.2, 3(c) and 12.3, 11, 10.1 and 10.2, 19.2, 18, 20, 14. |
| 10 | The rep's promise set against PA 16.4 and 6.3, with a request to put it in writing | Pass | Builder rep question 1. |
| 11 | The credit union's "acceptable to Seller" and 30-day approval terms flagged as a deposit risk | Pass | Bottom line sentence 2; incentive section; email Next Step 2. |
| 12 | Email: Title Case subject, under 350 words, no advice on signing or lender, attorney review, wire caution without numbers, [Agent Name]; Check before sending present | Pass | Subject "What The Placeholder Peak Contract Says Before Friday"; 344 words; "the choice is yours"; "Wire money only after confirming by phone with the title company." |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | Pass. $20,337.50 and $9,500 shown with their math; November 16, November 18, December 4, December 13, 2026 and November 13, 2028 labeled as computed from an assumed November 13, 2026 Contract Date; October 24 is from the prompt; 50%, November 1, 2026 and January 1, 2027 come from the skill's REPC references. |
| Deadlines match the uploaded contract | Pass; weekdays checked in code |
| No em dashes | Pass |
| Title Case subject lines | Pass |
| "Check before sending" section | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields | Not applicable; none present |
| No protected-class language | Pass. The rental note is about recorded restrictions, not people. |
| No wire or account details | Pass. Only the instruction to confirm wiring by phone. |

## Independent Review (2026-11-08)

An independent reviewer ran the practice files from scratch with SKILL.md 1.0 and the practice prompt before reading `output.md`. That run is `review-output.md`. Graded against the 12 checks above: 12 of 12 (check 1: the lot hold flagged with 5 days, not bold; check 12: subject "Your Lot 47 Builder Contract: What To Know Before Friday," 334 words, [Agent Name], no lender advice). Objective checks clean; the checker flags the CFPB "still look for a better deal" quote in the agent-facing incentive section, which is sourced and outside the email.

Compared with `output.md`: the same findings on every check. Differences:
- The independent run compared risk of loss (REPC 24.2 lets either party cancel over 10% damage; PA 15 leaves the choice with the builder). `output.md` left it out.
- `output.md` listed the federal ILSA two-year question for the attorney even though PA 3.3 sets a 24-month outside date; the review guide asks for it only when there is no firm obligation. Harmless, left as is.
- `output.md`'s email said "Wire money only after confirming by phone with the title company." The drafting guide asks for a call to the title company "at a number they look up themselves," which is the part that stops wire fraud. Reviewer edit: the line now reads "Before wiring any money, call the title company at a number you look up yourself." Email 348 words by the checker's count. `sample.md` was refreshed to match, and `objective-checks.txt` regenerated.
