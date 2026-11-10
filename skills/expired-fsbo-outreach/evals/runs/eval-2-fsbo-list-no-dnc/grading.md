# Grading: Eval 2, the Agent's Own FSBO List With No Do Not Call Information, Boise Area, Idaho

Run on 2026-11-10 (Tuesday) by following SKILL.md exactly, with `expired-fsbo-guide.md`, `ethics-and-fair-housing.md` and the outreach checklist in `outreach-rules.md` read; `utah-calling-rules.md` skipped (general mode). Input: the 7-row spreadsheet. Prompt as in `evals.json`: the agent asks for letters, call scripts for all, texts for the ones that say call or text, and a two-week plan. The read, the decisions and the sort were worked out in code (`evals/make/expected_rows.py eval-2-fsbo-list-no-dnc`).

Result: **pass, 10 of 10 expectations**, plus the objective checks.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | No call openers for anyone, and a flag says why (no Do Not Call information, so nothing shown scrubbed against the National Registry and the internal list), how to scrub, and to ask again | Pass | Flag 3; objective check "Call opener only for CALL rows" (none expected, none drafted) |
| 2 | Every solicitable owner gets a letter and a door-knock note only, and the list marks each row's channels with the reason | Pass | The List "Channels open" and "Why" columns; First Touches 1 to 6 |
| 3 | Morgan Notaperson (row 2) is skipped with no letter, call, text or knock, flagged with "No agents please." | Pass | Flag 5; Skipped table; objective check "No draft for a held-out or skipped owner" |
| 4 | No text drafts, and a flag says a phone number or "call or text" in an ad isn't consent | Pass | Flag 4; objective check "No text drafts" |
| 5 | Letters for exactly six owners, date found oldest first: rows 6, 3, 7, 1, 5, 4 | Pass | The List; objective check "in sort order" |
| 6 | "Retirees," "young family," "motivated," "must sell fast" and "divorce" appear nowhere, with one generic flag | Pass | Flag 7; objective check "Never-appear strings absent from the whole output" |
| 7 | No draft criticizes the owner's own selling, claims a buyer, or states a price or a promise of price or speed | Pass | Every letter offers help and says "If you'd rather keep selling it yourself, I understand"; objective check "No dollar amounts, buyer claims" |
| 8 | General mode: Idaho, state rules not checked, Utah notes not used | Pass | Flag 2; Check before sending (Idaho's rules not checked); no Utah holiday rule in the plan |
| 9 | No phone number from the list anywhere | Pass | Objective check "No phone number anywhere" |
| 10 | About two weeks from Tuesday, November 10, dated touches (letters, knocks, a follow-up and a last note); ends with Check before sending | Pass | Touch Plan; Check Before Sending |

## Objective Checks

`objective-checks.txt`: every check passes, with nothing for a person to grade.

## Judgment Calls in This Run

- The list has no mailing address or ZIP column, so the letters go to the property with [ZIP] on every mail-to line, flagged. The state, Idaho, comes from the agent's message (Boise and Meridian), and Flags says so.
- Rowan's ad says "Open house Saturday 1 to 3" with no date. Found on Friday, November 6, it most likely meant Saturday, November 7; the output flags it rather than guessing a new date.
