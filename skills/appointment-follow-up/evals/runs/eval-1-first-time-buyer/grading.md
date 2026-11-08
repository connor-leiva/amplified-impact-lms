# Grading: Eval 1, First-Time Buyer, Preapproval Pending, No Buyer Agreement Mentioned

Run on 2026-11-08 (a Sunday) by following SKILL.md exactly, with `follow-up-guide.md`, `fair-housing-and-privacy.md` and `buyer-agreements.md` read where SKILL.md says to (Utah mode: Murray, Midvale, Taylorsville, Millcreek). Input: the Granola for iPhone transcript, read in full with Python. Prompt: "Can you do my follow-up from yesterday's coffee with Quinn?..." No agent name anywhere, so the email is signed [Agent Name].

Result: **pass, 9 of 9 expectations** (after one fix, below). Objective checks in `objective-checks.txt`.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | First flag: no buyer agreement mentioned; sign before Saturday, November 14, 11:00 AM; live video tours count | Pass | Flag 1: "Buyer agreement: never came up... showings are set for Saturday, November 14, at 11:00 AM... A live video tour counts as a tour too." Names the UAR form and says to confirm the version with the broker |
| 2 | Preapproval flag: Sample State Credit Union, Pat Notreal, two pay stubs and two months of statements, Quinn sending Monday, November 9 | Pass | Flag 2, word for word, plus the down payment assistance check |
| 3 | What Pat needs is attributed to Quinn, and the label is called out | Pass | Flag 3: the Speaker A line "is Quinn talking about Quinn's own loan application, so it's treated as Quinn's" |
| 4 | Email: Title Case subject, under 200 words, priorities in Quinn's terms, [Personal note: add by voice] last | Pass | "Next Steps Before Saturday's Showings"; about 155 words with signature; the four priorities as Quinn said them; the line sits right above [Agent Name] |
| 5 | Email confirms Wednesday, November 11 evening and Saturday, November 14 at 11:00 AM, and lists the promises | Pass (after fix) | "Let's talk Wednesday evening, November 11..."; "Saturday, November 14, at 11:00 AM"; bullets for the second lender, top five by Monday, November 9, the lender checklist and the HOA questions |
| 6 | Signed [Agent Name]; no "touch base" | Pass | Signature [Agent Name]; Flag 4 explains why; "touch base" appears only as a transcript quote in Check before sending |
| 7 | 712 and 31,000 nowhere | Pass | Objective check: absent. The flag says only "the credit and debt figures Quinn shared" |
| 8 | FUB note: motivation, timeline, criteria, financing, buyer agreement "Not discussed," concerns, next step, follow-up; Timeframe 3-6 months | Pass | Every labeled line present; "Suggested Timeframe to Move: 3-6 months" with the reason under it |
| 9 | Check before sending: resolved dates with their words; names to confirm | Pass | Rows for Monday, Wednesday evening, next Saturday and Tuesday (November 3), each with the quoted words; Quinn Mockridge, Pat Notreal, Sample State Credit Union, Pepper |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input | Pass | The checker lists 14 (November 14), which is resolved from "next Saturday" and marked so in Check before sending. 9, 11 and 3 (November 9, 11 and 3) are resolved the same way. $400,000 is "under 400," read as thousands and marked |
| Deadlines match the uploaded contract | N/A | No contract in this case |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | None |
| No agent-only MLS fields in client-facing text | N/A | No MLS input |
| No protected-class language | Pass | Checker found none |
| No wire or account details | Pass | |

## What Failed, and the Fix

- **First run:** the email said "Let's talk Wednesday evening" and "by Monday" with no dates. SKILL.md asked for the next step's weekday and date but didn't say every day named in the email needs its date, so a bare weekday slipped through. An email sent a day late would point to the wrong Monday.
- **Fix to SKILL.md, Step 4:** "Every day named in the email carries its date ('by Monday, November 9'), never 'tomorrow' or a bare weekday... 'Tonight' or 'today' for the appointment itself is fine; Check before sending flags it."
- **Rerun:** the email now reads "by Monday, November 9," "on Monday, November 9" and "Wednesday evening, November 11." Expectation 5 passes.
- **Also changed during the run:** the first draft called Quinn "she." The transcript never shows Quinn's pronouns (only Pat's), so SKILL.md Step 2 now says "Names, not pronouns," and the output uses Quinn's name throughout.
