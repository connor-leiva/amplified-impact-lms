# Grading: Practice Run, Cottonwood Heights Listing Appointment (the Page Sample)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `prep-guide.md`, `net-sheet.md`, `objections.md`, `nar-and-federal-rules.md` and `utah-listing-appointment.md` read (Utah mode). Inputs: the five practice files (first-call notes, seller questionnaire PDF, county record and MLS history PDF, marketing menu, title fee sheet PDF). Prompt (the page's practice prompt): "Listing appointment with Dana and Lee Practiceton on Thursday. I'm Riley Sampleton with Example Peak Realty. Prep me. For the net sheet, use $749,000 and $775,000, and show a buyer's agent line at 2% as an option."

Result: **pass, 12 of 12 checks.** This output is `sample.md`. Objective checks: 18 of 18 (`objective-checks.txt`).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Utah mode; "Thursday" resolved to Thursday, November 12, 2026 at 6:30 PM; about an hour, with an agenda from 6:30 to 7:30 | Pass | Appointment Plan; objective check "Agenda ... 60 of 60 minutes" |
| 2 | Pat (Lee's mom) is flagged: part of the decision, joining by FaceTime, not on title; Dana and Lee sign (joint tenants on the county record) | Pass | Flag 1; Questions 6 |
| 3 | Square footage from each source (county 3,040 finished, 2016 MLS 3,090, questionnaire about 3,300) with Utah's rule that the listing agreement names the source; no total stated | Pass | Flag 2; Questions 8; What to Bring |
| 4 | The marketing plan uses only menu items, each with the fact that earns it: drone (0.24 acres, backs the open space trail), showings by text (2 hours' notice), open houses only with the sellers' OK; twilight and the HOA packet left out with reasons | Pass | Marketing Plan table and "Left out, and why" |
| 5 | Menu item 16's audience by who people are is dropped (ads about the house only) and flagged; the wording isn't repeated | Pass | Flag 3; Marketing Plan row 16; "young famil" absent (objective check) |
| 6 | Net sheet at exactly $749,000 and $775,000; 2.5% fee ($18,725.00, $19,375.00); owner's policy from the bands ($2,120.00, $2,224.00); per-sale and per-lien charges for two liens; payoffs $318,000 and $24,500 as Dana stated; nets $384,800.00 and $410,046.00, and $369,820.00 and $394,546.00 with the optional 2% line | Pass | Net sheet; objective checks "columns" and "totals match net_sheet_math.py" |
| 7 | Open items are labeled placeholders outside the totals; the footer says estimate, not a closing statement; taxes go to a CPA; the "around 300" goal is compared in plain numbers | Pass | Open items; "Your goal"; footer |
| 8 | No list price: Dana's 812 and 800, the assessor's value and the 2016 sale are not used as scenarios or advice; price goes to pricing-conversation-prep | Pass | Flag 4; agenda's price block; objective check "No list price recommended" |
| 9 | The commission answer gives Riley's 2.5% to Example Peak Realty at closing, says negotiable and not set by law, makes the buyer's brokerage the sellers' written choice, and doesn't repeat the 6% or call any rate usual or standard | Pass | Objection Answers; objective checks "No rate called standard..." and never-appear "6%" |
| 10 | Why You uses only the menu's numbers (11 sold, 19 days, 99.1%, January 1 to October 31, 2026) and the two supplied testimonials; the cousin and FSBO answers don't criticize anyone; the spring answer makes no seasonal claim | Pass | Objection Answers and their source lines |
| 11 | Left out: the loan number, the school and "who it suits" remarks, and the 2016 agent-only remarks (lockbox), with one generic flag | Pass | Flag 6; never-appear strings (4471, top rated, perfect for, lockbox) absent |
| 12 | Check Before Sending lists every date, dollar amount, percentage, stat and quoted fact with its source, plus the open placeholders | Pass | Check Before Sending (25 rows) |

## Objective Checks

All 18 pass. The number check found every number in the inputs, the computed net sheet lines or the references (162 and 401 are the Utah rule citation R162-2f-401b; August 17, 2024 is NAR's effective date from `nar-and-federal-rules.md`).

## Fixes Applied Here

- The first draft's "wait for spring" answer said "Lee told me you don't want to pay for two places." The first call was with Dana, and the note records it as Lee's wish. Now "Lee would rather not pay for two places."
- The first draft's commission answer said "a rate you'd heard was usual." It didn't repeat the number, but it echoed the word. Now "You mentioned a number you'd heard: there isn't a set rate." The objection reference already said not to repeat the rate.
- The cousin answer first opened "Morgan is family." Accurate, but the protected-class scan flags the word in client-facing text, so it now says "Morgan is Lee's cousin."
