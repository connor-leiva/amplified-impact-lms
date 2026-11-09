# Grading: Practice Run

Run on 2026-11-08 on the four practice files, following SKILL.md and its references exactly. Inputs read in full as text (pdftotext). This output, unchanged, is `sample.md`.

Prompt (the page's practice prompt): "Here's the buyer's repair addendum on 2215 W Example Hollow Ln, the inspection report, our seller disclosure and the roofer's bid. Due diligence deadline is November 17 and settlement is December 4. My sellers care most about closing on time. What should we send back?"

Result: **pass, 11 of 11 checks; 9 of 9 objective checks**, after one fix to the skill (below).

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Uses the deadlines from the message, flags that no REPC was uploaded, reads "Section 8.1(b)(ii)" as the December 4, 2024 numbering, and says there's no Response Period | Pass | "Flags"; "The Clock" |
| 2 | Flags that Addendum No. 1 wasn't uploaded and may have changed deadlines | Pass | "Flags," second bullet |
| 3 | Roof: pushes back on replacement (inspector recommended repair), compares the roofer's November 30 earliest start with the November 29 completion date, recommends the $1,240 credit for Timing | Pass | Item table row 1; "Options and Tradeoffs"; "Timing" package |
| 4 | Guardrail, garage door and discharge pipe Reasonable, needs bid, no estimates | Pass | Rows 2, 3, 5 |
| 5 | Basement: disclosed, but signed October 20, 2026, after the October 14, 2026 Offer Reference Date, so the "priced into the offer" argument is weak; counters with the inspector's own recommendation | Pass | Row 4; "Options and Tradeoffs" |
| 6 | Carpet declined as cosmetic (visibility at showings: likely, agent to confirm) | Pass | Row 6 |
| 7 | Reads the body-only rodent finding (page 9, item 9.2), which the report's summary leaves out, into the disclosure note, stated neutrally against the disclosure's "No" on pests | Pass | "Disclosure Note," fourth bullet; seller email "One More Thing" |
| 8 | Never repeats the bid's bank, routing or account details; adds the verify-by-phone line | Pass | Bids table; objective check |
| 9 | The sellers' counter is numbered Addendum No. 3 | Pass | "Response Terms" |
| 10 | Timing package first | Pass | "Timing (the sellers' stated priority), recommended" |
| 11 | Seller email under 300 words with a Title Case subject; Check before sending at the end; no dashes | Pass | 292 words; objective-checks.txt |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | $1,240, $16,800, $95.00 from the bid; dates from the addendum, report, disclosure, bid and message |
| Deadlines match the uploaded documents | Pass | November 11 (addendum); November 17 and December 4 from the message, flagged to confirm against the REPC |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | Four items say needs bid |
| No agent-only MLS fields | Pass | No MLS inputs |
| No protected-class language | Pass | "family room" is a room name from the report |
| No wire or account details | Pass | The bid's ACH details are not repeated |

## Failure Found and Fixed

The first pass's seller email ran 313 words, over the 300-word limit. `references/response-writing.md` now says to count the words before finishing and, if long, cut What I Recommend to the decisions and drop reasons the bottom line already gives. Rerun: 292 words, same content.

## Reviewer Changes (2026-11-08)

The independent review (`review-grading.md`) edited this output and `sample.md`: unbid items are no longer sized as "small," and the "Visible at showings" column no longer says "No" without support. The skill now says how to fill that column (SKILL.md step 4). The objective checks were rerun on the edited output: 9 of 9.

## Review note, 2026-11-08 (integration)

The practice output listed the stained basement carpet (page 10, item 10.1) under "Not requested", but it is the buyer's item 6 on Addendum No. 2. The line now lists only the furnace filter and the driveway cracks, in output.md and sample.md.
