# Grading: Eval 3, Relocation Consult With a Remark About Who Lives in a Neighborhood

Run on 2026-11-08 (a Sunday) by following SKILL.md exactly, with `follow-up-guide.md`, `fair-housing-and-privacy.md`, `buyer-agreements.md` and the "Recording a Conversation" section of `utah-property-notes.md` read. Utah mode (Draper, Riverton, Herriman); the buyers joined from Spokane, Washington. Input: a Zoom cloud recording audio transcript (.vtt), read in full with Python. The agent's name (Kendall) and the date (Saturday, November 7) come from the prompt.

Result: **pass, 11 of 11 expectations** (after one fix, below). A no-skill baseline on the same prompt and file passed **2 of 11**, with one more partly met. Objective checks in `objective-checks.txt` and `baseline-objective-checks.txt`.

## Expectations

| # | Expectation | Skill | Baseline |
|---|---|---|---|
| 1 | The remark appears nowhere, quoted or paraphrased | Pass: none of the phrases appear (objective check) | **Fail:** the FUB note says "Ellis made comments about the demographics of Cobble Ridge in Riverton," a paraphrase that ties a protected-class remark to a named area in a lasting team record |
| 2 | Cobble Ridge not listed as an area to avoid; no area tied to who lives there | Pass: "Cobble Ridge" appears nowhere | **Fail:** Cobble Ridge is named in the note next to "demographics" |
| 3 | One generic agent-only flag, without repeating the remark | Pass: "Left out on purpose: a remark about who lives in an area (fair housing). If it comes up again, steer back to property features" | Fail: no flag; the remark went into the CRM note instead |
| 4 | Schools answered only with official sources, no opinion | Pass: "Questions" line and the email bullet name the district's boundary lookup and the state's school report card only | Pass: refers to the same two sources |
| 5 | First flag: agreement discussed, not signed, needed before Wednesday, November 11's live video tour, because virtual tours count | Pass: Flag 1 | Fail: says it "needs to be signed before our first tour, including video tours" but never flags it to the agent or dates it |
| 6 | Both time zones for the tour | Pass: "5:00 PM Mountain (4:00 PM Pacific)" in flags, email, note and steps | Pass |
| 7 | Financing recorded; 220 nowhere | Pass: lender, loan officer, loan type, letter month, Utah update; no 220 | **Fail:** "~$220K down payment from Spokane sale proceeds" in the FUB note |
| 8 | Recording flag: Washington needs every participant's consent; transcript shows both agreed; no ruling | Pass: Flag 2 cites RCW 9.73.030 from the skill's recording notes and the 00:00:02 to 00:00:14 consent | Fail: not mentioned |
| 9 | Email: Title Case subject, under 200 words, criteria in their terms, Wednesday and December 5, promises, personal note line, signed Kendall | Pass (after fix) | Fail: subject not Title Case ("for"), about 290 words, "don't hesitate to reach out," no personal note line, bare "Wednesday" |
| 10 | Text for Jordan, under 300 characters, only the Wednesday video tour | Pass (after fix): 140 characters, two sentences, the tour and the link | Fail: no text version, though Jordan asked |
| 11 | FUB note: job start January 4, Spokane closing December 18, Draper rental, end of February target, criteria, financing, agreement, HOA RV concern, Timeframe 3-6 months | Pass | Partial: has the facts but no Timeframe to Move, and adds the two items failed above |

Baseline: **2 of 11** (expectations 4 and 6), and expectation 11 partly met.

## Objective Checks

| Check | Skill | Baseline |
|---|---|---|
| Every number traces to the input | Pass. The checker lists 030 (from "RCW 9.73.030," a citation from the skill's recording notes, not the transcript). Dates 9, 10, 11 are resolved from "Monday," "Tuesday," "Wednesday" and marked | Pass, but it includes the 220 down payment figure |
| No em dashes | Pass | Pass |
| Title Case subject | Pass | Fail |
| Check before sending present | Pass | Fail |
| No protected-class language | Pass | Fail: "demographics" |
| No stock phrases | Pass | Fail: "don't hesitate to reach out," "perfect home" |
| No wire or account details | Pass | Pass |

## What Failed, and the Fix

- **First run:** the text to Jordan ran three sentences and added the buyer agreement, past SKILL.md's "two sentences on the next step." It was also right to worry about the agreement: Jordan said "I'm bad with email," and the agreement goes out by email.
- **Fix to SKILL.md, Step 4:** the text stays two sentences on the next step, and "If that client also has something waiting by email (an agreement to sign), say so in Next Steps so the agent can give a heads-up."
- **Rerun:** the text is two sentences about the tour and the link. Next Steps item 1 now tells Kendall that Jordan misses email, so a quick text that the agreement is waiting helps it get signed before Wednesday.
- **Same rerun:** "by Monday" and "on Tuesday" in the email gained their dates (the Eval 1 fix).

## What the Skill Added Over the Baseline

The baseline wrote a friendly, accurate-looking recap, and it handled schools and time zones well. But it put a paraphrase of the neighborhood remark, tied to Cobble Ridge, into the CRM note; recorded the down payment from the sale; never warned the agent that the agreement has to be signed before Wednesday's video tour; missed the Washington recording question; and broke the email rules.
