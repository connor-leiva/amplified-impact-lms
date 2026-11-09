# Grading: Eval 3, Thin Comp Set in General Mode (Colorado)

Run on 2026-11-08 by following SKILL.md 1.1 exactly. The subject is in Colorado, so the skill ran in general mode and did not read `utah-pricing-context.md`; it read `comp-method.md`, `market-metrics.md` and `objections.md`. The comp export (a generic MLS export with different column names: ML#, Close Price, Above Grade Finished Area, Private Remarks) was read as a CSV and the property profile as a PDF.

Prompt: "First listing appointment for me in Colorado: 4410 Example Mesa Rd in Pretendville. The seller says Zillow shows $575,000. ... Only two solds came back from the last six months. What price can I defend?"

Result: **pass, 8 of 8** (after one fix, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode stated; no Utah notes, REPC terms or Colorado disclosure claims | Pass | Flags: "General mode: state rules not checked for Colorado. Nothing here describes Colorado's contract forms, appraisal terms or whether its sale prices are public." Objective check: 0 hits for "Utah", "REPC", "non-disclosure", "public record". |
| 2 | Bottom line names two recent solds and low confidence | Pass | "with **low confidence**: only two solds closed in the last six months (4522 Example Mesa Rd at $548,000 and 3980 Pretend Butte Ln at $561,000)". |
| 3 | Anchored on the two recent solds; older labeled; horse property left out with a reason | Pass | Range "set" by $548,000 and $561,000; 5120 Sample Sage Ct and 4105 Example Mesa Rd marked "**Older**"; 2875 Fictional Fence Rd left out: "2.4 acres with a four-stall horse barn, an arena and a three-car shop ... and it's 11.5 months old." |
| 4 | Missing fields listed, metrics that need them skipped | Pass | Flags list original list price, concessions and cumulative days on market; sale-to-original, price cuts among actives and concessions are each marked skipped with the reason; the List Price column is flagged as assumed final. |
| 5 | Zillow's $575,000 placed against the solds and the 58-day active, fairly | Pass | "$14,000 above the higher recent sale ($561,000) and $27,000 above the closest one ($548,000). A very similar home at 4630 Example Mesa Rd has asked $574,900 for 58 days." The objection answer calls the estimate "a computer's best guess" and never says the site is wrong. No outside statistics. |
| 6 | One price in a range; general-mode appraisal wording, no promise | Pass | $549,900 in $545,000 to $560,000; "a buyer's contract may let them cancel or renegotiate if the appraisal comes in under the price. Read the actual terms from the contract you use in Colorado. No appraisal result is certain." |
| 7 | No private remarks in client-facing text; Title Case summary title | Pass | 0 hits for 1188, "works nights", "Septic inspection". "attorney" appears once, in the agent-only data gap line listing what was left out. The as-is estate note is in a section marked "Private note for you only." Title: "Pricing Summary For 4410 Example Mesa Rd." |
| 8 | Numbers traced, Check before sending, no dashes | Pass | See objective checks. |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 95 numbers; 20 not literally in the files, each arithmetic shown: 0.42 and 4.8 (months of supply), 8.5 and 11.5 (months since a sale), 80 (1,720 minus 1,640), ratios (97.5, 98.1, 99.3), price per above-grade sq ft, 14,000 and 27,000 (differences). The recommendation, range and $550,000 line are labeled as the agent's call. |
| Deadlines match the uploaded contract | N/A | No contract uploaded. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | Summary title is Title Case. |
| "Check before sending" section | Pass | Section 9, by ML#. |
| No cost estimates without bids | Pass | None. |
| No agent-only MLS fields in client-facing text | Pass | As in expectation 7. |
| No protected-class language | Pass | Property features only. |
| No wire or account details | Pass | None. The assessor value is named as a tax value and kept out of the conversation. |

## Failure Found and Fixed

- **First run:** the output said the expired 4290 Example Mesa Rd "expired after 95 days on July 31, 2026." The export has no off-market date; July 31 was the list date plus 95 days, a derived date presented as a fact. It also suggested "18 months" for a wider search, a figure from nowhere.
- **Fix:** the guardrail already covers it ("every date comes from the uploads"), so the output was corrected rather than the skill: the date was removed and the suggestion now says "a longer window or a larger area." The rerun passes all eight expectations. The case 2 fix to `market-metrics.md` (don't guess timing the export doesn't show) covers the same pattern.
