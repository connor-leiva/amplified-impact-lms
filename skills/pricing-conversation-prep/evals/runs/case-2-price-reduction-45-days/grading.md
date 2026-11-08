# Grading: Eval 2, Price Reduction at 45 Days

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with all four references read where SKILL.md says to. The Agent Full Report and the Listing Activity Report were read as PDFs (1 and 2 pages), the comps export as a CSV (11 listings including the subject); the comp math was done in code.

Prompt: "45 days on market at 3472 S Practice Pine Dr, 11 showings and no offers. I'm meeting Kim and Avery Mockridge Tuesday to talk about a price reduction. They've told me they owe about $410,000 and they'd rather wait for spring. ..."

Result: **pass, 8 of 8** (after one fix, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Price Reduction mode; $689,900 against the solds since listing, the pending and the 52-day active; above every sale | Pass | Recommendation, "Where the home sits now": 3602 S Sample Spruce Ln "closed at $665,000 after starting at $699,900", 3376 S Pretend Poplar Way at $655,000, 3527 pending at $674,900, 3611 at $679,900; "The subject at $689,900 is above every sale and above all of them." |
| 2 | One new price at or below $674,900 in a range, tied to newest comps and bands, with confidence | Pass | $664,900 in $655,000 to $670,000; "right on the newest close ... under the $670,000 line ... $4,100 under the new $669,000 listing"; "Confidence: high" with the reason. |
| 3 | Activity read from the report | Pass | "11 completed showings in 45 days, about 1.7 a week"; "6 too high, 2 about right, 0 too low"; "45 ... median of 15"; "road noise from Example Parkway in the backyard". |
| 4 | School and family comments not quoted, paraphrased or used as themes; no showing agent names or phones | Pass | Objective check: 0 hits for "school", "famil", "comfortable", "801-555" and each showing agent's surname. The only mention is the agent-only gap note: "Two feedback comments (10/12 and 11/01) weren't about the property, so they are left out ... keep them unpublished in the homeowner version." |
| 5 | $410,000 loan balance not in talk track, objections or summary | Pass | 0 hits for "410,000" anywhere in the output. The net question is routed to a title net sheet with no figures. |
| 6 | "Wait for spring" answered without a forecast, with the three choices | Pass | "I can't tell you what spring will bring ... You have three choices: adjust now, take it off the market and relist later, or hold at $689,900 and accept those trade-offs. It's your call." |
| 7 | No agent-only field in client-facing text | Pass | 0 hits for 4417, 801-555-0143, "Remove shoes", "FHA buyer". The word "lockbox" appears once, in the agent-only "Kept out" note, with no code. |
| 8 | Numbers traced, Title Case title, Check before sending, no dashes | Pass | See objective checks. "Pricing Update For 3472 S Practice Pine Dr." |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 101 numbers; 22 not literally in the files, each arithmetic shown: ratios (95.0, 98.1, 98.5, 99.3, 99.5, 100), price per above-grade sq ft, prices after concessions, 1.7 and 6.4 (showings a week), 4,100 and 21,400 (differences), 10,000 (the pending's cut). $664,900 and the $670,000 line are labeled as the agent's call. |
| Deadlines match the uploaded contract | N/A | No contract uploaded. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | No email asked for; summary title is Title Case. |
| "Check before sending" section | Pass | Section 9, by MLS number and file. |
| No cost estimates without bids | Pass | None; no figure is put on the parkway or on a credit. |
| No agent-only MLS fields in client-facing text | Pass | As in expectation 7. |
| No protected-class language | Pass | Both comments about people and schools are left out; the parkway is described as a property feature. |
| No wire or account details | Pass | None; the loan balance is never repeated. |

## Failure Found and Fixed

- **First run:** the comp table said the pending 3527 S Practice Pine Dr "went pending 23 days after a $10,000 cut." The export shows only the original and current list price, not when the cut happened, so the 23 days was invented. It also said 3602 S Sample Spruce Ln "sold ... after 37 days" when 37 is days to contract.
- **Skill fix:** `references/market-metrics.md`, Price Cuts Among Actives, now says an export with only original and current price doesn't show when a cut happened, so never guess the timing. SKILL.md step 4 now also tells Claude to name left-out feedback comments by date only.
- **Rerun:** both lines now read from the data ("cut to $674,900, and went pending at 33 days"; "went under contract at 37 days, and sold at 95.0% of its original price"), and all eight expectations pass.

The months of supply metric was skipped because the export doesn't state its search period, as `market-metrics.md` requires, and the output says so in Flags.

## Independent Review (2026-11-08)

A reviewer ran this case from scratch with SKILL.md 1.1 and its references, before reading `output.md`. The run is `review-output.md`.

**Reviewer's run: pass, 8 of 8.** It ran Price Reduction mode in Utah and recommended $659,900 in $650,000 to $665,000 at medium confidence: five same-subdivision solds bracket the home, but none backs to Example Parkway. It showed $689,900 against 3602 S Sample Spruce Ln ($665,000 after $699,900), 3376 S Pretend Poplar Way ($655,000), the pending at $674,900 and 3611 S Sample Spruce Ln at $679,900. The activity read used 11 showings, 6 of 8 too high, 45 days against a median of 15, and the Parkway road noise as a property feature. It left the 10/12 and 11/01 comments out by date, and it skipped months of supply because no period is stated. "Wait for spring" was answered with the three choices and no forecast. Objective checks: 0 dashes, a Check before sending section, 0 hits for 4417, 801-555-0143, 410,000, "school", "type of families", any showing agent's name, "FHA buyer", "Remove shoes" or "24-hour". 27 numbers aren't literally in the files; each is shown arithmetic (ratios, price per above-grade sq ft, prices after concessions, differences) or the labeled recommendation.

**Compared with `output.md`:** both pass every expectation, and the price calls differ within reason ($659,900 against $664,900). The review found three things the builder's grading missed:
1. The talk track said "a couple mentioned the parkway noise." Only one comment (10/03) did, so the output inflated a count in client-facing text. Fixed in `output.md` ("one mentioned"). SKILL.md step 4 now says to count feedback exactly.
2. The bracket named the current list price as what the subject "shouldn't reach," not a sale. Fixed: it now names 3455 S Practice Pine Dr ($668,500). SKILL.md step 2 now says to bracket with closed sales, not list prices.
3. Confidence was "high" although no sold backs to Example Parkway, the feature buyers named. SKILL.md step 4 now says to lower confidence a step when no sold shares a feature that moves value, and `output.md` now says medium, with the reason.

With those edits, `output.md` still passes 8 of 8.

One more change, in every run here and in `sample.md`: the appraisal check no longer cites REPC section numbers or the "Financing & Appraisal Deadline." The revised REPC (footer "EFFECTIVE NOVEMBER 1, 2026") moves the appraisal condition to Section 12.2 with its own Appraisal Deadline, and both versions are in use until January 1, 2027, so a home not yet under contract gets the form-neutral version: the buyer may cancel by the contract's appraisal deadline, which is a right to cancel, not a lower price. SKILL.md step 4 now says so, and the skill ships `utah-repc.md` and `utah-repc-2026.md` (with `utah-forms-and-counters.md`, which they name).
