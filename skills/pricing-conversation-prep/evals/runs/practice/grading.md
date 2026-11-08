# Grading: Practice Run

Run on 2026-11-08 by following SKILL.md 1.1 exactly, on the two practice files: `pricing-practice-cma-report.pdf` (3 pages) and `pricing-practice-mls-export.csv` (11 listings). Prompt, the practice prompt on the page: "I have a listing appointment Thursday with Sam and Pat Pretendley at 1482 W Juniper Example Dr. They're hoping for $615,000, and Pat said Zillow shows $607,000. My CMA report and the MLS export are attached. Prep me for the pricing conversation."

Result: **pass, 12 of 12.** This output is `sample.md`.

## What the Practice Set Tests

| Check | Result | Evidence |
|---|---|---|
| Reads both files and compares them | Pass | "The two files agree on every listing they share"; the rambler sale appears only in the export and is caught. |
| Leaves out the different-style sale with a reason | Pass | 1299 W Maple Mock Way ($612,000) left out: a rambler whose total matches the subject's but whose above-grade area doesn't ($370.91 per above-grade sq ft against $188.31 per total). |
| Concessions shown on the solds | Pass | $7,500, $4,000 and $3,000 shown with the price after concessions. |
| Specific price, range, confidence; the sellers' number placed | Pass | $599,900 in $590,000 to $605,000, high confidence; "$615,000: $10,500 above the highest two-story sale". |
| Price band trade-off named | Pass | "stays under $600,000 ... At $609,000 or more it would leave those searches". |
| Utah notes used correctly | Pass | Zillow objection uses non-disclosure; appraisal check explains the REPC appraisal condition as a right to cancel. |
| Talk track and objections built on CMA numbers | Pass | Five objections, each with figures from the files, including the rambler "same size" argument. |
| Seller summary has no agent-only fields | Pass | 0 hits for 7720, 5512, 3381, 9034, "Lockbox", "Combo", "Tenant", "divorcing", "relocating", "801-555". |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 110 numbers; 21 not literally in the files, each arithmetic shown (ratios, price per sq ft, prices after concessions, 0.83 and 3.6 months, $10,500 and $9,900 differences) or the labeled recommendation and range. |
| No em or en dashes | Pass | 0 |
| Title Case title, bolded bottom line, "Check before sending" | Pass | "Pricing Summary For 1482 W Juniper Example Dr"; section 8. |
| No cost estimates, no protected-class language, no wire or account details | Pass | None. |

## Changes Made From This Run

- Bottom line wording tightened ("the pushback most likely to come first is Zillow's $607,000").
