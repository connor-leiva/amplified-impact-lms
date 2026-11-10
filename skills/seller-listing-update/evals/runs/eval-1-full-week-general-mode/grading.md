# Grading: Eval 1, a Full Week in Meridian, Idaho (General Mode, BrokerBay-Style Export)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `update-guide.md` and `fair-housing-and-feedback.md` read (the Utah notes skipped: general mode). Inputs: the BrokerBay-style export (10 rows), the stats log (11 rows) and Harper's notes. Prompt as in `evals.json`.

Result: **pass, 13 of 13 expectations**, plus the objective checks.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode (Idaho), state rules not checked, no Utah rule cited | Pass | Flag 1; no Utah citation anywhere |
| 2 | The October 31 showing is outside the week, left out of every count and listed in Flags | Pass | Flag 2 ("BB-40211, left out of every count"); Check before sending, showings row |
| 3 | 8 completed showings (the declined November 3 appointment listed separately), feedback from 6 of 8, interest 5: 1, 4: 1, 3: 2, 2: 2 with no average, price Priced Right 3, Too High 2, none given 1 | Pass | Flag 4; The Week in Numbers rows 1 to 5 ("None (not averaged)") |
| 4 | Zillow Showcase totals turned into weekly counts with the subtraction shown: 418 (1,702 minus 1,284) against 464 (1,284 minus 820), 46 fewer, 9.9%; saves 14 against 11, 3 more, 27.3% | Pass | Flag 6; The Week in Numbers rows 6 and 7; Check before sending rows; objective check "Every expected arithmetic result appears" |
| 5 | The listing page's 1,190 views labeled as the last 30 days and not compared; Realtor.com's 143 not compared; MLS views 58 against 71, 13 fewer | Pass | Flag 6; table rows 8 to 10; the email says "1,190 views over the last 30 days" and gives 143 with nothing in parentheses |
| 6 | The safety comment (November 5) and the religion comment (November 7, 10:00 AM) appear nowhere; each flagged by date and time only; their ratings counted | Pass | Flag 7; objective check "Never-appear strings absent" ("safe at night," "break-in," "Muslim," "mosque," "480"); Check before sending row with their ratings |
| 7 | The November 6 comment trimmed: "might write an offer this week" quoted exactly, the financing sentence cut and flagged, nothing says an offer is coming | Pass | Flag 8; the email quotes it with "..." and leaves [Offer update, if any]; "lender" absent (objective check) |
| 8 | Showing agents named in the email because the notes ask; no phone numbers; no buyer named | Pass | Flag 10; email "Agents who showed it" and "What they said"; objective check "No phone numbers anywhere" |
| 9 | Harper's own price view in no seller draft and flagged; no price advice; "Around 470" only as the showing agent's quoted opinion | Pass | Flag 9 (without repeating the number); "474,900," "474" and "holiday buyers" absent (objective check); Questions are facts and questions; Check before sending notes "470" is as written |
| 10 | Jo's HOA question answered only from the inputs: no feedback mentioned the HOA | Pass | Flag 11; email "Jo, you asked about the HOA: none of this week's feedback mentioned it." |
| 11 | A text to Jo only, 320 characters or fewer, no quotes or price talk; the email to Sam and Jo | Pass | Text Version (231 characters); email "Hi Sam and Jo" |
| 12 | Next week holds only the notes' three items: Tuesday, November 10 (today), Wednesday, November 11, 10 to 12 with AM and PM flagged, Thursday, November 12 | Pass | Next Week's Plan; Flags 12 and 13 |
| 13 | Title Case subject, 250 words or fewer, no dashes, no trend or forecast words, Check before sending with every number, source and arithmetic | Pass | `objective-checks.txt` (221 words; every check passes) |

## Notes for a Reviewer

- The email names Jamie Testford and Drew Samplestone among the agents who showed it, because the notes ask for the agents who came through. Their comments are not in it. If Sam and Jo ask what those two said, that's the agent's conversation with the broker's guidance (Flag 7).
- "Oct 26 to Nov 1" in the table header is the Monday to Sunday week that the log's 11/01 rows close; the objective check lists 26 as a resolved date.
- The skill quoted "Around 470" as written and did not turn it into $470,000. Check before sending says so.

## Objective Checks

See `objective-checks.txt`: all 16 pass.
