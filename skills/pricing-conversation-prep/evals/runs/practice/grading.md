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

## Independent Review (2026-11-08)

A reviewer ran the practice prompt from scratch with SKILL.md 1.1, before reading `output.md` or `sample.md`. The run is `review-output.md`.

**Reviewer's run: pass, 12 of 12.** It recommended $599,900 in $590,000 to $605,000 at high confidence, flagged and left out the rambler that appears only in the export ($370.91 against $188.31 per sq ft), showed concessions and prices after concessions, computed 3.6 months of supply from the stated six-month window, placed $615,000 and Zillow's $607,000 against the sales, and kept every agent-only field out (0 hits for 7720, 5512, 3381, 9034, the tenant's name and phone, "divorc", "relocat", "Offers reviewed", "inspection due", "Multiple offers"). 0 dashes; every number not in the files is shown arithmetic or the labeled recommendation.

**Compared with `output.md`:** the same price, range and confidence. The review changed two things in `output.md` and `sample.md`:
1. The Zillow answer said "sites like that don't have the actual closed prices." Whether a site gets MLS sold data in Utah couldn't be confirmed from a primary source, and two runs (this one and case 1) asserted it, so `references/objections.md` now says an estimate "may not have" those prices and never to say it doesn't. Both runs and the reviewer's run now use "may not have."
2. "Why This Price" said $599,900 "puts you in front of every buyer searching up to $600,000, while two higher-priced homes are still waiting for offers." Nothing in the files shows whether those listings have offers, and "every buyer" overstates it. It now reads "keeps you in searches capped at $600,000, while two higher-priced homes are still on the market."

One more change, in every run here and in `sample.md`: the appraisal check no longer cites REPC section numbers or the "Financing & Appraisal Deadline." The revised REPC (footer "EFFECTIVE NOVEMBER 1, 2026") moves the appraisal condition to Section 12.2 with its own Appraisal Deadline, and both versions are in use until January 1, 2027, so a home not yet under contract gets the form-neutral version: the buyer may cancel by the contract's appraisal deadline, which is a right to cancel, not a lower price. SKILL.md step 4 now says so, and the skill ships `utah-repc.md` and `utah-repc-2026.md` (with `utah-forms-and-counters.md`, which they name).
