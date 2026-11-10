# Where Each File Comes From

Last verified: 2026-11-10, against each vendor's help center (sources under each tool). Menu labels change; if a step doesn't match, the vendor's article is the authority.

## Ninety

All exports: Owners, Admins, Managers and Team Members can export from the tools they can see; Observers cannot ("Printing and Exporting Scorecards," updated 2026-09-16). Ninety's "Data Export and Print Options" article (2026-09-16) says Scorecard exports need Manager, Admin or Owner. If Export is missing, ask an admin.

| What | Steps | File | What's in it |
|---|---|---|---|
| Scorecard | **Data** in the left navigation, pick the team, the **Weekly** tab, a **Date Range** that covers 13 weeks, the **...** at the far right of the toolbar, **Export as CSV** | CSV | KPI group, Status, Title, Description, Owner, Goal, Average, Total, then one column per period, **newest on the left** |
| Rocks | **Rocks**, pick the team, **...** at the far right of the filter bar, **Download Excel** | XLSX, tabs Rocks and Milestones | Rocks: Owner, Title, Description, Due Date, Status, Level, Team, Attachment Names, Completed On (Date), Link, Created Date, Archived Date |
| To-Dos | **To-Dos**, pick the team, the **Download** icon at the far right of the filter bar. To include archived to-dos, turn the **Archive** toggle on first | XLSX | Owner, Title, Description, Due Date, Repeating Cadence, Team, Attachments, Completed On, Link, Create Date, Archive Date |
| Issues | **Issues**, pick the team, the **Download** button on the filter bar | XLSX, one tab for short-term and one for long-term issues | Owner, Title, Description, Type, Priority, Team, Who, and dates (the help center's versions list slightly different columns) |
| Headlines | **Headlines**, pick the team, the **Download** button on the filter bar | XLSX | Not listed in the article |

Sources: "Printing and Exporting Scorecards," https://help.ninety.io/en/articles/14306054-printing-and-exporting-scorecards ; "Data Export and Print Options in Ninety," https://help.ninety.io/en/articles/14324178-data-export-and-print-options-in-ninety ; "Exporting Rocks to a Spreadsheet" (2026-04-24), https://intercom.help/ninety/en/articles/14442542-exporting-rocks-to-a-spreadsheet ; "Exporting To-Dos to a Spreadsheet" (2026-06-11), https://help.ninety.io/en/articles/14306128-exporting-to-dos-to-a-spreadsheet ; "Exporting Issues to a Spreadsheet," https://help.ninety.io/en/articles/14306235-exporting-issues-to-a-spreadsheet (read through search excerpts). All checked 2026-11-10.

What this means for the prep:
- The scorecard's newest week is on the left, and the current week is often there with every cell empty. The code sorts weeks by date and leaves out a week with no numbers at all ("not entered yet"), so last week is the one reviewed.
- Ignore the Average and Total columns: the prep counts only the week cells.
- Ninety's article doesn't say whether an export with Archive on also holds open to-dos. If the to-do file shows only open to-dos (no Completed On dates) or only completed ones, export the other view too and attach both. The code takes both files and drops exact duplicates.
- Long-term issues are on their own tab. The prep lists them apart and leaves them out of this week's suggested order.

## Bloom Growth (formerly Traction Tools)

Traction Tools renamed itself Bloom Growth in October 2022 (Bloom Growth, "A letter to our community about Traction Tools and Bloom Growth," https://www.bloomgrowth.com/blog/a-letter-to-our-community-about-traction-tools-and-bloom-growth). Bloom Growth calls rocks Quarterly Priorities or Goals, the issues list O&O (Issues), and the scorecard KPIs or Metrics.

- **One meeting's data:** **Meetings list** in the left navigation, hover over the meeting name and click the three dots (or open the meeting and click the three dots by the agenda), then **Export All** (or **More Actions**). It downloads a ZIP with O&O (Issues).csv, Quarterly Priorities (Goals).csv, KPI (Metrics).csv, To-Dos, MeetingRatings.csv, MeetingSummary.csv and Headlines. Unzip it and attach the files.
- **Just the scorecard:** the menu at the top right of a KPI tile, **Export**, pick the frequency and dates in **Export KPIs**, then **Export**.
- **Everything (admins):** the organization name at the bottom left, **Organization Settings**, **Company Data**.

Source: Bloom Growth, "Exporting Data," https://help.bloomgrowth.com/en/exporting-data (no date on the page), checked 2026-11-10. The article doesn't list the columns inside each CSV, so the code finds them by name and shows which column it used for what. Check that table on the first run.

## A Spreadsheet (Google Sheets or Excel)

Any layout with one row per measurable and one column per week works, with a Goal column (and an Owner column, so empty cells can go to their owner). A long layout with one row per measurable per week (Measurable, Week, Value, Goal, Owner) works too. In Google Sheets, File, Download, Microsoft Excel (.xlsx) keeps every tab; a CSV holds only the tab that is open (not checked against Google's help center). One workbook with Scorecard, Rocks, To-Dos and Issues tabs can be attached once: the code picks each tab by its name and header.

## Pasted Text

Rocks, to-dos, issues and headlines pasted into the chat work. Save them to a file as written (a CSV for a table, a text file for headlines) and pass that file to the code, so every count still comes from the code. Never retype or tidy what was pasted.

## How a Goal Is Read

The code reads each measurable's own goal, in this order:
1. goals.json, when the user said which way a goal runs.
2. A symbol or words in the goal cell: `>=` or "at least" or "60+" (at least), `<=` or "or less" (at most), `>`, `<`, `=`, or a range ("10 to 20").
3. A direction column (Goal Direction, Operator, Rule): `>=`, "Higher is better", `<=`, "Lower is better" and the like.
4. Nothing says: read as **at least**, marked **ASSUMED**. The skill then checks every assumed one (see `prep-rules.md`).
