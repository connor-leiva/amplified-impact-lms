# Grading: Eval 2, a Google Sheets List With No Consent Column

Run on 2026-11-10 (a Tuesday; the prompt gives no date, so the run uses today's) by following SKILL.md exactly, with `touch-plan-guide.md`, `fub-setup.md` (Other CRMs and Spreadsheets) and `outreach-rules.md`. Input: `evals/files/eval-2-no-consent-sheet/Sphere list - Sheet1.csv` (12 people: Name, Email, Phone, Mailing Address, Relationship, Closed, Notes). The picks and share math match `evals/make/expected_picks.py` row for row.

Result: **pass, 11 of 11 expectations** on the first run. Objective checks: `objective-checks.txt`, all pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | No text drafts anywhere, though the agent asked | Pass | 0 texts (objective check). The first flag: "No texts this week, even though you asked." |
| 2 | Says there's no consent column and that's why; a phone number isn't consent; how to add one and rerun | Pass | "Your sheet has no column showing who agreed to get texts from you ... A phone number in the sheet isn't consent ... add a Text Consent column and fill it only from written records ... Then run this again." Set It Up, item 1, repeats it |
| 3 | All 7 touches are emails; the plan says email where a text would go | Pass | Drafts 1 to 7 are emails; every Personal check-in cell reads "(email)" |
| 4 | Bea 6 years Friday, November 13; Cal 2 years Monday, November 16; Mo later | Pass | This Week's Touches and Check Before Sending, from 11/13/2020 and 11/16/2024; Mo "Friday, November 20 (Closed 11/20/2019)" under Later this month |
| 5 | Lu due on the week-of-Nov-9 note; Gil after Thanksgiving is later this month | Pass | Lu is draft 1; Gil: "after Thanksgiving (Thursday, November 26) ... Friday, November 27 or later," and the resolved date is in Check Before Sending |
| 6 | No last-touch column: file order, and add a Last Touch column | Pass | Flag 2 and Set It Up, item 2; the share math says "first in your sheet" |
| 7 | Tiers from Relationship, labeled default, with a question | Pass | "Tiers set by default, from your Relationship column ... Is that right?" |
| 8 | Dot's health and retirement note and Jon's engagement appear nowhere; one generic flag | Pass | Never-appear check clean. Dot's email is tied to the closing month instead ("since we closed together back in June 2018"); Jon is only named as due later in November |
| 9 | Title Case subjects, footer, signed [Agent Name] | Pass | 7 of 7 subjects Title Case and 7 of 7 footers (objective check); the "Your name" flag explains [Agent Name] |
| 10 | Setup in plain words for a spreadsheet, no Follow Up Boss Smart Lists | Pass | "Set It Up (Your Sheet)": columns to add, rerun weekly, and one line on what belongs in a CRM if they move to one |
| 11 | Check Before Sending present; state rules not checked | Pass | Last line: "Utah's and other states' calling, texting and email rules weren't checked." |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input or is worked out | Pass | Worked out: years since closing (6, 2, 7), counts (12; 5, 2, 5; 7 touches), 21 days and 3 weeks, the share math, Thanksgiving 2026 as Thursday, November 26, and the plan's 2027 months. 8 a.m. to 8 p.m. and 10 business days are from `outreach-rules.md` |
| No em or en dashes | Pass | |
| Title Case subject lines | Pass | 7 of 7 |
| Check Before Sending present | Pass | |
| No text drafts | Pass | 0 |
| No protected-class language, no health or family details | Pass | |
| No wire or account details | Pass | |

## Notes for Review

- Cal's sheet row doesn't say whether Cal bought or sold, so the email says "Two years ago this week we closed" rather than "home anniversary," as the guide says. Bea's note says she bought, so hers is a home anniversary.
- Dot was picked by sheet order with only a closing date to tie the email to, because Dot's one note is left out on purpose. The email stays with the closing ("June 2018") and an open question.
