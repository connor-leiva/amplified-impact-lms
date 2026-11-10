# Grading: Practice Run, Sampleton County Report and Export (the Page Sample)

Run on 2026-11-10 by following SKILL.md exactly, with `market-math.md`, `writing-guide.md`, `utah-market-update-rules.md` and the email rules in `outreach-rules.md` read. Utah mode (Sampleton County, Utah). Inputs: the practice report PDF (2 pages) and the practice stats export CSV (26 rows), both made up. The CSV was checked in code (duplicate and missing months, odd figures, the October rows against the PDF, the 2026 year-to-date sums). Prompt (the page's practice prompt): "Here's my MLS's October report for Sampleton County and the stats export. I'm Riley Sampleton with Example Peak Realty. Write my October market update email and a social post."

Result: **pass, 12 of 12 checks.** This output is `sample.md`. Objective checks in `objective-checks.txt`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Both files read; the output says whether they agree | Pass | What I Used: the export's October 2025 and October 2026 rows match page 1 for both property types, and its January to October 2026 sums match the report's year-to-date counts (4,872 and 3,198) |
| 2 | Leads with single-family and says why; one line on townhomes and condos | Pass | Flag 1 (301 against 109 closed sales); the email's townhome and condo sentence |
| 3 | The Board's forecast quote is in neither draft and is flagged without repeating it | Pass | Flag "Left out on purpose"; neither draft mentions rates, spring or the rush (objective check: no prediction words) |
| 4 | Months of supply computed only because the report gives none, with arithmetic and the label | Pass | N14 (1,198 ÷ 301 = 3.98, shown as 4.0) and N15 (1,046 ÷ 318 = 3.29, shown as 3.3); the email says "At October's pace of sales" |
| 5 | List-to-sale ratio as the report gives it, change in points | Pass | N16 to N18: 97.6% and 98.4%, 0.8 points lower; the email describes it as the share of final list price, the report's definition |
| 6 | Every percent change shows arithmetic that matches the report | Pass | N3, N7, N13, N21 each end "matches the report"; the checker recomputed 15 arithmetic steps, all right |
| 7 | Fakeburg (6 and 3 sales) is out of the drafts and flagged as a small sample | Pass | Flag "Small sample"; never-in-drafts check (13.3, 612,000, Fakeburg) passes |
| 8 | No prediction, advice or fair housing words in the drafts | Pass | Objective checks; the summary line is past tense ("was higher," "took longer," "had more listings") |
| 9 | Email: Title Case subject, 250 words or fewer, Riley Sampleton and Example Peak Realty, source line with its period, footer | Pass | "Sampleton County Homes In October 2026: What The Numbers Show"; 175 words with the sign-off; "Based on information from Example Peaks MLS for the period October 1, 2025 through October 31, 2026"; opt-out, [Sender Postal Address], marketing line |
| 10 | Post: 120 words or fewer, only figures in the email, brokerage name, source line | Pass | 72 words; $505,000, 3.3%, 38, 31, 1,198, 14.5% all in the email; "Riley Sampleton, Example Peak Realty"; "Source: Example Peaks MLS, October 2025 and October 2026." |
| 11 | Utah mode: brokerage name rule; the MLS's own source rule not checked, with UtahRealEstate.com's wording as the example | Pass | Flag "Utah mode"; Check before sending (Rule 13.1 wording; brokerage name against the Division's records) |
| 12 | Check before sending lists every date, dollar amount and percentage with its N number and page | Pass | 10 rows plus the source line, brokerage name, placeholders and list |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input or the table's arithmetic | Pass | The checker's NOTE lists 13 and 13.1: "13 months" is the count of the export's monthly rows, and Rule 13.1 is UtahRealEstate.com's rule number, from `utah-market-update-rules.md` |
| Every number in the drafts is in the Numbers I Used table | Pass | |
| The arithmetic in the table is right | Pass | 15 steps recomputed |
| No em or en dashes | Pass | |
| Title Case subject | Pass | |
| Check before sending present | Pass | |
| No prediction or fair housing words in the drafts | Pass | "single-family" is a property type and is not counted |
| No wire or account details | Pass | |

## Notes

- The month-over-month figures in the export (September 2026) were not used: the report's year-over-year comparison was clean, and the guide prefers it.
- Not tested here: a report where the PDF and CSV disagree. The rule (flag both, use neither until confirmed) is in `market-math.md`.
