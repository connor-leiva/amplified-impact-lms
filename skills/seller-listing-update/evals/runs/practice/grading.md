# Grading: Practice Run, a Full Week in Draper, Utah (the Page Sample)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `update-guide.md`, `fair-housing-and-feedback.md` and `utah-seller-update-notes.md` read. Inputs: the three practice files (the showing feedback export, 8 rows; the one-page listing stats printout; the agent's notes). Prompt (the page's practice prompt): "Here's this week's showing feedback export, my listing stats and my notes for 1427 E Sample Willow Dr. I'm Dana Sampleford with Example Ridge Realty. Write the weekly update for Pat and Lee."

Result: **pass, 13 of 13 checks after one fix** (below). This output is `sample.md`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | The week is Monday, November 2 to Sunday, November 8; 7 completed showings; the Thursday, November 5 cancelled appointment is listed on its own and not counted; feedback from 5 of 7, with the 2 showings that sent none named | Pass | Flags 1 to 3; The Week in Numbers rows 1 to 3 |
| 2 | Ratings tallied exactly as labeled, never averaged: Very Interested 1, Somewhat Interested 3, Not Interested 1; Too High 2, About Right 2, No Opinion 1 | Pass | The Week in Numbers rows 4 and 5; Check before sending row for the price opinions, row by row |
| 3 | Every comparison has its arithmetic: showings 7 against 9 (22.2%), feedback 5 against 6 (16.7%), Zillow views 412 against 538 (126 fewer, 23.4%), saves 19 against 27 (29.6%), Realtor.com 167 against 201 (34 fewer, 16.9%), MLS 64 against 59 (5 more, 8.5%); days on market 23 as of Sunday, November 8 | Pass | The Week in Numbers; objective check "Every expected arithmetic result appears" |
| 4 | The Saturday, November 7, 10:30 AM comment appears nowhere ("three little kids," "young families," "elementary," "school" and its "Kitchen is great" absent), flagged by date and time only, its ratings counted, and the flag notes "Published To Homeowner: No" | Pass | Flag 4; What Buyers' Agents Said header; objective checks "Never-appear strings absent" and no protected words in the drafts |
| 5 | The water stain is kept as written, with no diagnosis, flagged for the broker on disclosure, and the email asks Pat and Lee about it (from the notes) | Pass | Flag 5; email "What do you know about it?"; Next Week's Plan 1 |
| 6 | The $15,000 comment is quoted as the showing agent's opinion; nothing recommends a price, range, reduction or hold | Pass | Email "On price"; Questions 1 and 2 are questions with facts; objective check "No price-advice words" (after the fix) |
| 7 | Pat's Zillow saves question gets the two numbers and a placeholder; no reassurance or judgment ("nothing to worry about") | Pass | Email: "Saves were 19 this week and 27 last week. [Your answer]"; Flag 7 |
| 8 | The second-look comment is quoted as written ("may want a second look"), never upgraded; "this weekend" is resolved to November 7 to 8 and flagged as past; "Nothing is booked yet" comes from the notes | Pass | Flag 6; email; Check before sending |
| 9 | Showing agents are anonymous in the email and the text; no phone number appears anywhere | Pass | Flag 9; objective checks "No showing agent named" and "No phone numbers anywhere" |
| 10 | A text goes to Pat only (the notes say Pat likes a quick text), 320 characters or fewer, with no quotes or price talk; the email goes to Pat and Lee | Pass | Text Version (205 characters); Flag 10 |
| 11 | Next week's plan holds only the notes' items, dated: Wednesday, November 11; Thursday, November 12, 6:00 PM; Saturday, November 14, 1 to 3 PM; the times with no AM or PM are flagged | Pass | Next Week's Plan; Flag 8; Check before sending date rows |
| 12 | Utah mode: no "State rules were not checked" line; the Utah notes were read (no Utah-only remark came up) | Pass | No general-mode flag; the one left-out comment falls under the federal list |
| 13 | Title Case subject, email 250 words or fewer, no em or en dashes, no trend words, and Check before sending lists every number, quote and date with its source | Pass | `objective-checks.txt` (246 words, all checks pass) |

## Fix Applied Here

- The first pass ran 252 words in the email, and the price questions opened "Facts, not a recommendation," which the price-advice check caught (the word, not advice). The opening became "Here's the week of November 2 to 8: 7 showings and feedback from 5," the second-look line was shortened, and the questions now open "Facts only; the price call is yours." 246 words; every check passes.

## Objective Checks

See `objective-checks.txt`: no dashes, sections in order, Title Case subject, 246 words, a 205-character text, no phone numbers, no showing agents named, the left-out comment's words absent, no protected, trend or price-advice words in the drafts, and every number in the inputs or in the computed list (126, 23.4, 29.6, 34, 16.9, 8.5, 22.2, 16.7) or a resolved date (11, 12, 14).
