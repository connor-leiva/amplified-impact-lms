# Grading: Practice Run, Move-Up Buyer Consult on Zoom (the Page Sample)

Run on 2026-11-08 by following SKILL.md exactly, with `follow-up-guide.md`, `fair-housing-and-privacy.md`, `buyer-agreements.md` and the "Recording a Conversation" section of `utah-property-notes.md` read. Input: the practice Granola transcript (agent on "Microphone," both buyers on "System audio"). Prompt (the page's practice prompt): "This is my buyer consult with Morgan and Casey Testwood from tonight. I'm Riley Sampleton. Write my follow-up."

Result: **pass, 12 of 12 checks** (after the Eval 1 and Eval 3 fixes were applied here too). This output is `sample.md`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Buyer agreement flagged: discussed, not signed, needed before Saturday, November 14, 10:00 AM | Pass | Flag 1, with the three-month term stated only as Riley described it and no compensation figure |
| 2 | Preapproval flag carries the condition (assumes the townhome sells first); the 690,000 amount appears only in the FUB note | Pass | Flag 2; "What I Heard" says the amount is in the FUB note only; email has no loan figure |
| 3 | Speakers worked out: Morgan at 0:25 and 1:40, Casey at 0:42 and 4:36; texts to Casey and email to Morgan, not the reverse | Pass | Flag 3 and the Contact line; the 4:40 "That's Casey" turn read correctly |
| 4 | The health detail about the family member is left out; the need is written as features | Pass | No "hip" anywhere (objective check); criteria read "main-floor bedroom with full bath nearby; no-step or one-step entry" |
| 5 | The townhome balance (180) is left out | Pass | Objective check |
| 6 | The safety and schools questions get official sources only | Pass | "Questions" line; email bullet with [Add links]; FUB note "pointed to official sources" |
| 7 | Email: Title Case subject, under 200 words, priorities in their words, Tuesday, November 10, 6:30 PM and Saturday, November 14, 10:00 AM, every promise with its date, personal note line, signed Riley | Pass (after fix) | "Next Steps: Tuesday At The Townhome And Saturday's Tour"; about 185 words with signature; "Monday, November 9," "Thursday, November 12" |
| 8 | Text to Casey: two sentences, under 300 characters, the next step only | Pass (after fix) | 140 characters |
| 9 | FUB note: every labeled line, the home to sell, contact preferences, Timeframe 3-6 months | Pass | All present |
| 10 | Next steps dated, including the townhome range prep (pricing-conversation-prep) and a heads-up that DocuSign comes by email to Casey, who doesn't check email | Pass | Steps 1 and 5 |
| 11 | Check before sending: every resolved date with its words, every price, every name to confirm | Pass | 17 rows |
| 12 | No em dashes, no stock phrases, no wire or account details, no protected-class words | Pass | `objective-checks.txt`; the checker's 14 is November 14, resolved from "Saturday" and marked |

## Fixes Applied Here

- The email's bare "tomorrow," "on Thursday" and "before Saturday" became "Monday, November 9," "Thursday, November 12" and "Saturday, November 14" (the Eval 1 fix).
- The text to Casey dropped its third sentence about the agreement; that heads-up moved to Next Steps item 1 (the Eval 3 fix). Casey said "I never check email," and DocuSign arrives by email, so the agent is told to text a heads-up.

## Review Update (2026-11-08)

An independent review reran the practice file from scratch (`review-output.md`, `review-grading.md`, 12 of 12). This output, and `sample.md`, were updated:
- The note was cut from 263 to 209 words for the new "about 200 words or fewer" rule, and the current HOA dues (285 a month), which the follow-up doesn't need, came out of it and out of Check before sending.
- Next Steps item 4 read "No day was set; with the recap works." It now reads "sending them with the recap works."
- `objective-checks.txt` was regenerated with the new note-length check. Still 12 of 12.
