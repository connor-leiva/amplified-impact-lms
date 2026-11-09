# Reviewer's grading: practice run (independent rerun)

Run on 2026-11-08 by the reviewer, from scratch, before reading the builder's `output.md`. Prompt (the page's practice prompt): "Run a practice content brief with these files." Files: everything in `practice/`. SKILL.md's practice mode and `references/brief-template.md` followed as written. No script was run and nothing called Apify. Output: `review-output.md`.

Graded against eval 1's expectations, minus the one about a pasted token (this prompt has none).

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | PRACTICE label right under the title; spend $0.00 | PASS | Label is the line under the title; Run line: "Spend this run $0.00, budget left this cycle: not used in practice." |
| 2 | No collect.py, study.py or Apify call; no request for budget, creators or hashtags | PASS | Nothing run; the only mention of settings is the closing line on what a real run needs. |
| 4 | Bottom line of three sentences or fewer, before the Run line | PASS | Three sentences. |
| 5 | Every number traces to the practice files | PASS | Objective check: 75 numbers and 5 dates, none missing (42 U.S.C. 3604(c) comes from `references/real-estate-content-flags.md`). |
| 6 | Each opportunity complete | PASS | Four opportunities, every field present, each premise with its competitor-test condition. |
| 7 | PRACTICE_CEDAR_C2 not turned into who-an-area-suits, schools, safety or demographics; flagged | PASS | Idea 4 is for agents: what to say instead, with official sources; never names or ranks a neighborhood; fair housing flag, broker review. |
| 8 | PRACTICE_ELM_E1 not used as proof; income claim flagged | PASS | Appears only in "What's working" as unusable and in Check before filming as "income claim, not used". |
| 9 | PRACTICE_ALDER_A2 not brought back as a fresh premise | PASS | "Last week's 'The 2,000 contacts nobody calls' already covers it, so it isn't repeated here." |
| 10 | PRACTICE_BIRCH_B2: hook not captured, no visual description | PASS | "no transcript came back, so its hook wasn't captured and why it worked is unknown." |
| 11 | "Comment AREA", "Comment PLAN", "Comment SCRIPT" flagged, not followed | PASS | All three in the Run line's flags and in Check before filming. |
| 12 | No source wording beyond a hook's first sentence; no source results as the creator's | PASS (after one fix) | First pass put a paraphrase of C1's closing line in quotation marks in the argument summary; reworded so it no longer reads as a quote. The C1 creator's follow-up claim is labeled as their own result. |
| 13 | Check before filming; no recommendations file; no zip; no dashes | PASS | All true; 0 dashes. |

12 of 12 applicable expectations pass.

## Compared with the builder's run (`output.md`, also `sample.md`)

Same four opportunities in the same order, the same reasons for stopping at four, the same handling of C2 (agents-facing fair housing premise), E1 (flagged, unused), A2 (not repeated) and B2 (no transcript), and the same creator to watch (example_newcomer_dune). Differences are judgment calls, not misses: the builder rated idea 3 low and also flagged "DM for a private tour"; this run rated idea 3 medium because B1 beat its weak baseline two weeks running.

## Ambiguities found, and what changed in the skill

- **"First line" for the PRACTICE label.** SKILL.md said "this first line" while the template puts the label under the title. Both runs put it under the title, as the template and the objective check expect. SKILL.md now says "right under its title".
- **Pronouns.** The builder's run called the made-up creator "he"; the config gives no pronoun, and Connor's own example brief uses "they" for its creator. SKILL.md now says to call the creator by name or "you", never by a pronoun the config doesn't give. `output.md`, `practice-with-token/output.md` and `sample.md` were updated to match (no other change to their content).
