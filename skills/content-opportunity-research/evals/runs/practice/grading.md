# Grading: practice run

Prompt (the page's practice prompt): "Run a practice content brief with these files." Files: everything in `practice/`. Run on 2026-11-08 by following SKILL.md's practice mode and `references/brief-template.md` exactly. No script was run and nothing called Apify.

Graded against eval 1's expectations, minus the two about a pasted token.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | First line is the PRACTICE label; spend this run $0.00 | PASS | Line after the title: "PRACTICE: made-up data. Nothing was collected and nothing was spent." Run line: "Spend this run $0.00 (practice: nothing was collected...)". |
| 2 | No collect.py, study.py or Apify call; no request for budget, creators or hashtags | PASS | Nothing was run; the brief asks for nothing until its last line, which lists what a real run needs. |
| 4 | Bottom line of three sentences or fewer, before the Run line | PASS | Three sentences, directly under the label. |
| 5 | Every number traces to the practice files | PASS | Objective check below: 71 numbers, none missing. Spend shown as the logged components ($0.131, $0.0156, $0.0104, $0.4058) instead of a computed total. |
| 6 | Each opportunity complete (evidence with baseline label, premise with competitor-test reason, [NEED], two B-roll, confidence with reason) | PASS | All four have every field; opportunity 2 names what is missing if Rory's meeting hasn't changed. |
| 7 | Neighborhood reel not turned into who-an-area-suits, schools, safety or demographics; flagged | PASS | Opportunity 4 explains why agents don't answer the question and points to the school district, city or county and police department; flagged fair housing, broker review. |
| 8 | Income-claim reel not used as proof; flagged | PASS | PRACTICE_ELM_E1 appears only under Flags (its call to action) and in "Not suggested" as "an income claim aimed at loan officers". |
| 9 | CRM reel not repeated as a fresh premise without saying what changed | PASS | "What's working" says last week's pick still has support and "isn't repeated here because nothing new changes the premise". |
| 10 | Listing tour with no transcript: hook not captured, not described visually | PASS | PRACTICE_BIRCH_B2 is cited only for having no transcript and no premise; no visual description. |
| 11 | "Comment AREA", "Comment PLAN", "Comment SCRIPT" listed under Flags, not followed | PASS | All three, plus "DM for a private tour", in the Run line's Flags. |
| 12 | No source wording beyond a hook's first sentence; no source results presented as the creator's | PASS (after one fix) | First pass reused the source's phrase "a number in the room" in an argument summary. Rephrased; Check before filming says the source creators' results are theirs, not Rory's. |
| 13 | Check before filming; no recommendations file; no data zip; no dashes | PASS | Section present; nothing written to `recommendations/`; no zip offered; 0 dashes. |

## Objective checks (`evals/make/objective_checks.py`)

- Em or en dashes: 0.
- Numbers: 71 in the output, 0 not found in the practice files. Dates: 6, all in the files.
- Bottom line: 3 sentences. Sections: Bottom line, Pick this week, Check before filming all present.
- Title Case subject lines: not applicable (no email). The opportunity titles are working titles in sentence style, as in Connor's template.
- "Check before sending": present as "Check before filming", the brief's version (it lists every [NEED], every flag with its reviewer, every quoted source line).
- No cost estimates without bids, no agent-only MLS fields, no wire or account details: none present.
- No protected-class language in any premise: the only family and school wording is the buyer's question in opportunity 4, which the premise explicitly does not answer.

## Fix made from this run

- Borrowed phrase in opportunity 1's argument summary, rephrased (expectation 12). Rerun: pass.
- Two factual slips caught on the self-check (a lead called "most-viewed" when PRACTICE_ELM_E1 had more views; "in three weeks" for two reels three days apart), corrected before grading.
