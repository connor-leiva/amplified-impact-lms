# Review Grading: Eval 3, Relocation Consult With a Neighborhood Remark

Independent reviewer run on 2026-11-08, written from SKILL.md and its references before reading the builder's `output.md`. Output: `review-output.md`. Objective checks: `python3 -I skills/appointment-follow-up/evals/make/objective_checks.py eval-3-neighborhood-remark review-output.md`.

Result: **pass, 12 of 12 expectations** (11 original, plus the written-later check the review added). One SKILL.md rule (the Follow Up Boss note "under about 150 words") was missed on the first pass; see below.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | The remark appears nowhere, quoted or paraphrased | Pass | Objective check: none of the never-appear strings |
| 2 | Example Hollow not listed; no area tied to who lives there | Pass | "Example Hollow" absent; areas are Draper, Riverton, Herriman only |
| 3 | One generic agent-only flag | Pass | Flag 4, "Left out on purpose" |
| 4 | Schools: official sources only | Pass | What I Heard, email bullet, FUB note |
| 5 | First flag: agreement discussed, not signed, before Wednesday, November 11, live virtual counts | Pass | Flag 1 |
| 6 | Both zones | Pass | Flags, email, text, note, steps |
| 7 | Financing recorded; 220 nowhere | Pass | Objective check |
| 8 | Recording flag: Washington, consent shown, no ruling | Pass | Flag 3 |
| 9 | Email: Title Case subject, under 200 words, criteria, Wednesday and December 5, promises, personal note line, signed Kendall | Pass | 167 words with signature |
| 10 | Text to Jordan, under 300 characters, the tour only | Pass | 153 characters |
| 11 | FUB note facts and Timeframe 3-6 months | Pass | All lines present |
| 12 | Written-later: the "tonight" promise flagged and first in Next Steps; the email names Saturday | Pass | Flag 2, Next Steps 1, "on Saturday" in the email |

## What the Run Showed About the Skill

- **The note length rule was not achievable as written.** My first pass wrote a 232-word Follow Up Boss note; the builder's four outputs ran 201 to 263 words. No run met "under about 150 words" with every required line. Fix: SKILL.md Step 5 and the guide now say "about 200 words or fewer: fragments, not sentences, and each fact on one line only," with a Contact line when a preference was stated, and `objective_checks.py` now checks it (210 allowed). Rerun: 194 words.
- **A follow-up written the next day had no rule.** The transcript's "tonight" promise (the buyer agreement) was already past when the agent asked on Sunday. I handled it by judgment, and so did the builder (in Next Steps and Check before sending), but SKILL.md said only that "tonight" was fine in the email. Fix: a "Written a day or more later" rule in Step 2 and the guide, a "promises already due" flag in the output order, and a new expectation in evals 1 and 3.

## Compared With the Builder's Run

Same substance on every expectation. The builder's run named the UAR form in the buyer agreement flag and quoted RCW 9.73.030 from the shared recording notes (both from the references, and the statute was confirmed today). Its email said "last night" and its note ran 242 words; both are updated in `output.md` to the new rules.
