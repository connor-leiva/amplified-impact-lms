# Grading: Eval 2, a Stats CSV Missing Inventory, With an Obviously Wrong Row

Run on 2026-11-10 by following SKILL.md exactly, with `market-math.md`, `writing-guide.md`, `utah-market-update-rules.md` and the email rules in `outreach-rules.md` read. Utah mode (Mockingbird Valley, UT). Input: a made-up 13-month stats export from Fakeland Regional MLS with no inventory column, no list-to-sale ratio (but average sale and average list price of sold homes), and an October 2025 row whose closed sales (1,262) and median sale price ($4,710,000) are each about ten times every other month. The CSV was checked in code (odd-figure rule, median above twice the average, duplicate months, the 12-month range, month-over-month changes, the computed ratios). The prompt asks to compare to last October and to talk about inventory.

Result: **pass, 11 of 11 expectations.** Objective checks in `objective-checks.txt` (all pass).

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | The October 2025 row flagged with its figures and comparisons; agent asked to confirm with the MLS | Pass | Flag 1: 1,262 against 96 to 141; $4,710,000 against $452,000 to $486,500; more than twice the row's own $498,200 average; "Ask Fakeland Regional MLS for the corrected October 2025 row" |
| 2 | No figure from that row in either draft; nothing estimated or substituted | Pass | Never-in-drafts check (4,710,000, 1,262, 498,200, 507,100, October 2025) passes; no "about" figure; "nothing is estimated in its place" |
| 3 | No year-over-year comparison; October against September 2026, said so; the year comparison waits on the confirmed row | Pass | Flag 2; the email opens "compared with September 2026"; never-in-drafts ("last October," "a year earlier") passes |
| 4 | No inventory, active listings or months-of-supply figure anywhere; flagged with where to get it; the line dropped or a flagged placeholder | Pass | Flag 3; the email's "[Inventory line: add active listings ... or delete this line.]"; Check before sending says not to send it bracketed; never-anywhere checks pass |
| 5 | List-to-sale computed from average sale ÷ average list, with arithmetic and label | Pass | N14: 487,900 ÷ 496,300 × 100 = 98.31%, shown as 98.3%; Flag 4 and the email ("the average sale price was 98.3% of the average list price of the homes that sold") |
| 6 | Month-over-month arithmetic shown: 3.3%, 0.5%, 4 days, 5.7% | Pass | N3, N7, N10, N13; 12 steps recomputed by the checker |
| 7 | No prediction or advice language in the drafts | Pass | Objective check |
| 8 | Email: Title Case subject with the area and month, 250 words or fewer, Riley Sampleton with Example Peak Realty, source line naming Fakeland Regional MLS with dates, footer | Pass | "Mockingbird Valley Homes In October 2026: What The Numbers Show"; 166 words; "Based on information from Fakeland Regional MLS for the period November 1, 2025 through October 31, 2026" |
| 9 | Facebook post: 120 words or fewer, only email figures, brokerage name, short source line | Pass | 65 words; "Source: Fakeland Regional MLS, September and October 2026." |
| 10 | Utah mode: brokerage name rule; Fakeland Regional MLS's source wording to confirm | Pass | Flag 5; Check before sending |
| 11 | Check before sending: every date, dollar amount and percentage with its N number and row | Pass | 9 rows plus the placeholder, year-over-year, source line, brokerage name and list bullets |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input or the table's arithmetic | Pass | The checker's NOTE lists 13: the export's 13 monthly rows, counted |
| Every number in the drafts is in the Numbers I Used table | Pass | |
| The arithmetic in the table is right | Pass | 12 steps recomputed |
| No em dashes; Title Case subject; Check before sending | Pass | |
| No prediction, fair housing or stock phrases | Pass | |

## What Changed During the Run

- **Caught before grading:** the 12-month range sentence named "January" and "May" without years. Every figure carries its period, so it now says "January 2026" and "May 2026." No SKILL.md change: `writing-guide.md` already requires it.
- **A judgment call, noted for Connor:** the 12-month median range (N16, N17) is a figure the skill picked to give context when the year comparison was missing. It is from clean rows and labeled, but a reviewer may prefer the drafts stay with October against September only.
- **The source line's dates:** the export gives months, not days, so the line's "November 1, 2025 through October 31, 2026" is the first and last day of the months used, and Check before sending asks the agent to confirm.
