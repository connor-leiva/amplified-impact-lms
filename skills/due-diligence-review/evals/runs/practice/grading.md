# Grading: Practice Run (2468 Example Aspen Drive)

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with all five practice PDFs read in full. Prompt: "Pretend today is Sunday, November 8, 2026. Here's everything on 2468 Example Aspen Drive in Riverton. My buyers are Avery and Jordan Samplewood. They want to finish the rest of the basement and maybe build a detached shop in the backyard next year. What should we ask for?" Utah mode, December 4, 2024 REPC.

Result: **pass, 12 of 12 checks.** This output is `sample.md`.

## What the Practice Set Is Built to Show

| Check | Result | Evidence |
|---|---|---|
| Both Tier 1 items found: water heater spillage (page 7) and radon at 6.8 pCi/L | Pass | Issue List items 1 and 2; Recommended Ask items 1 and 2 |
| The body-only finding is caught: bath fan venting into the attic with stained sheathing (page 9) | Pass | Issue List item 4, "Not in the inspector's summary" |
| Disclosure cross-checks: no basement water versus efflorescence; roof repairs versus sheathing staining; basement permit unknown | Pass | Questions 1 to 3, all neutral |
| Buyer plans checked: basement finish against the northeast moisture and radon; the shop against the rear easements | Pass | Bottom Line; Issue List item 5; title officer note; buyer email "Your shop plan" |
| Title: the 2011 deed of trust with no release flagged for the title officer; the seller's loan amount and loan number not repeated | Pass | "For the title officer" note; `check_output.py --forbid 402,000 7781` finds neither |
| Missing Seller Disclosures: CC&Rs (7(d)) and water share evidence (7(i)) | Pass | Flags; Questions 4 and 5 |
| Roof credit uses a bid placeholder, not a number | Pass | Recommended Ask item 3: "$[credit amount from roofing bid]" |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | `check_output.py` found no number missing from the inputs or the prompt. (5 days is November 13 minus November 8; 17 years is the report's own figure) |
| Deadlines match the uploaded contract | Pass | 24(b) November 13, 24(c) November 24, 24(d) December 4, all 2026, 5:00 PM Mountain Time; no response period |
| No em or en dashes; Title Case subject; Check before sending | Pass | 0 dashes; "Inspection, Radon And Title Review For 2468 Example Aspen Drive"; 14-row table |
| No cost estimates without bids | Pass | Every repair "needs bid"; the only dollar figures are the earnest money, the home warranty cap and the price-related figures from the documents |
| No wire or account details; no protected-class language | Pass | The title company's wire warning is not repeated; no comments on people or the area |

Buyer email length: 286 words by wc, under the 300 limit.

## Fixes Made During This Run

- The first draft's buyer email was 298 words by the checker's count. Trimmed four bullets to leave room.
- Tier 4 count removed (same SKILL.md change as eval 1).

## Reviewer's Independent Run and Fix (2026-11-08)

A second reviewer ran the practice files from scratch with SKILL.md and the page's practice prompt before reading `output.md`. The run is `review-output.md`. It passes all 7 practice-set checks and the objective checks (0 dashes, Title Case subject, 279-word email, no number outside the inputs, the seller's loan amount and loan number absent).

Same findings as `output.md`: both Tier 1 items, the page 9 attic finding marked "Not in the inspector's summary," the roof and the northeast grading as Tier 2, the disclosure questions, the missing CC&Rs and share certificate, the 2011 deed of trust for the title officer, and the rear easements against the shop plan. One judgment call differs: this run put the 2011 deed of trust release in the recommended ask, while `output.md` holds it back because the title company already requires it. Both are defensible; the agent decides.

Defect found and fixed: `output.md` (and so `sample.md`) told the buyers "Monday, November 9: roofer visit," an appointment nothing in the files or the prompt supports, and listed it in Check before sending as "Your plan for this deal." This run's first pass had the same pattern (it dated the request Monday). Cause: SKILL.md's "each with the date it's needed by." SKILL.md and the ChatGPT instructions now tie every Next Steps date to the contract or the agent's message (or to a date counted back from one) and forbid announcing an appointment the agent hasn't mentioned. `output.md` and `sample.md` now read "As soon as you can: book a roofer to look at the roof and the attic, and tell me if you want a sewer scope," and the "Roofer visit" row is gone from Check before sending. Rechecked: 294-word email, 0 dashes, every number in the inputs. Result after the fix: still 12 of 12.
