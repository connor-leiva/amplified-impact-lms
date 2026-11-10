# L10 Meeting Prep Guide

Part 1 is the meeting's agenda, from EOS Worldwide's own pages. Part 2 is how to read the files and build the prep. Part 3 is where each file comes from and how a goal is read.

## Part 1: The Level 10 Meeting Agenda

Last verified: 2026-11-10. Sources, each read on that date:
- EOS Worldwide, "What is a Level 10 Meeting?": https://www.eosworldwide.com/level-10-meeting
- EOS Worldwide blog, "Level 10 Meetings Explained: How EOS Meetings Create Real Execution": https://www.eosworldwide.com/blog/level-10-meeting
- EOS Worldwide blog, Ken DeWitt, "Why You Hate Meetings and What You Can Do About It (Part Two)": https://www.eosworldwide.com/blog/why-you-hate-meetings-and-what-you-can-do-about-it-part-two

None of the three pages shows a publication date. EOS, the Level 10 Meeting and their tool names belong to EOS Worldwide. This project is not affiliated with or endorsed by EOS Worldwide, Ninety or Bloom Growth.

### The Seven Sections, In Order

EOS Worldwide describes the Level 10 Meeting as a 90-minute weekly meeting that follows "the same seven-part agenda": "You meet on the same day, at the same time, follow the same agenda, start on time, and end on time." (level-10-meeting page)

| # | Section | Minutes | What happens (EOS Worldwide's words, shortened) |
|---|---|---|---|
| 1 | Segue | 5 | Reconnect as people and shift from working in the business to working on it. |
| 2 | Scorecard | 5 | "Review your weekly Measurables and identify anything that's off track." |
| 3 | Rock Review | 5 | "Check whether each Rock is on track or off track." Issues go to the Issues List rather than being solved in the review. |
| 4 | Customer and Employee Headlines | 5 | "Share important news about customers and people that everyone needs to know." |
| 5 | To-Do List | 5 | "Review last week's To-Dos and confirm what's done and not done." |
| 6 | IDS | 60 | "Identify, Discuss, and Solve the most important Issues on your Issues List." "Start with the most important Issue." |
| 7 | Conclude | 5 | "Recap new To-Dos, confirm any messages that need to be shared, and rate the meeting." |

Total: 90 minutes.

### What the EOS Worldwide Blog Adds (Ken DeWitt, Part Two)

- **Scorecard:** a missed target isn't explored in this section: "If you didn't meet a key target, don't ask why at this point." It goes to the Issues List.
- **Rock Review:** each person responsible for a Rock says whether it is "on track" to be completed this quarter. Anything "off track" goes to the Issues List without discussion. This is why the prep never sets a status: the owner gives it.
- **Headlines:** issues raised in a headline go to the Issues List rather than being discussed.
- **To-Dos:** last week's to-dos are checked off as done or not. "A 90% completion rate is the minimum acceptable." The prep may quote this once, as the article's standard, next to the team's rate. It never applies it to one person.
- **IDS:** the team picks the "three most urgent Issues" and numbers them 1 to 3. The prep's order is only a suggestion for that choice.
- **Conclude:** each person rates the meeting from 1 to 10.
- To-dos that come out of IDS are owned "for the next seven days" (EOS Worldwide's "Level 10 Meetings Explained" post). The prep counts last week's to-dos as those due in the 7 days up to the meeting.

### Words Used in the Prep

- **Measurable:** one weekly number on the scorecard, with an owner and a goal.
- **Rock:** a priority for the quarter, with one owner.
- **Issue:** anything on the Issues List, for the team to IDS.
- **To-Do:** a seven-day action item with one owner.
- **Drop down:** move something to the Issues List (a missed number, a rock its owner calls off track, a headline with a problem in it). The team does this in the meeting; the prep only lists what could be dropped.

### Timing Rules for the Agenda

- With a start time, give each section its clock time ("9:05 AM to 9:10 AM"). Without one, give minutes only and put [Start Time] in the heading.
- Never shorten or reorder the sections, and never add one. If the user's own agenda differs (a team that runs a 60-minute L10, or adds a section), use theirs as given and say it differs from EOS Worldwide's published agenda.

## Part 2: Prep Rules

Last verified: 2026-11-10. The agenda and the EOS terms are in Part 1 of this guide, with their sources. Everything else here is this project's own rule for reading the files, not an EOS rule, and the prep says so where it matters.

### The Scorecard

- **The week reviewed** is the newest week column with at least one number, on or before the meeting date. A newer column with every cell empty is "not entered yet" and is left out. Say which week was reviewed in What I Used. If the user names a different week, rerun with `--week`.
- **A miss** is a number on the wrong side of that measurable's own goal, read as Part 3 (How a Goal Is Read) says. Write each miss as the number, then the goal in words: "7 against at most 5." Never compare against another measurable's goal, an average, last quarter or a benchmark.
- **An empty cell stays empty.** Show "(empty)", mark it for its owner, and list every empty cell in the 13 weeks with measurable, owner and week. Never fill one with zero, the last value, an average, the Average or Total column, or a guess, even when asked. An empty cell is neither a hit nor a miss, and it is left out of the miss count ("5 of 12 weeks with a number").
- **A cell that isn't a number** ("see notes," "TBD") is shown as written and goes to its owner like an empty cell.
- **Assumed directions:** for each goal the run marks ASSUMED, look at the measurable's name. If the name says lower is better (minutes, hours, days, time to, response time, cost, cost per, expenses, cancellations, fall-throughs, errors, complaints), write goals.json with "at most" for it, rerun, and say so in What I Used. Otherwise keep "at least." Either way, list each one under Check Before Sending as "direction not in the file: read as at least (or at most); confirm with the owner."
- **The 13-week view** is only the count of misses and empty cells per measurable. No trend words ("declining," "struggling," "getting worse"), no averages the file didn't hold, no forecasts.
- **Possible drop-downs:** each measurable missed this week. EOS drops a missed number to the Issues List without discussing it; the team decides in the meeting. List them; never add them to the Issues List.

### Rocks

- Repeat each rock's status exactly as the file gives it ("On Track," "Off-Track," "Done," "Complete"). An empty status is "no status given," every time.
- Never set, change, guess or hint at a status: not from milestones, a completed date, the due date, the issues list, the scorecard, the user's message ("it's probably fine") or anything else. Only the owner says. A Completed On date with no status is shown as a fact in its own column, still "no status given."
- If the user says in the conversation what an owner reported ("Moss told me it's on track"), use it and label it "as [user] reported, not in the file."
- Possible drop-downs: each rock its owner gave as off track (the status word as written).

### To-Dos

- **Counted:** to-dos due in the 7 days up to and including the meeting date (EOS to-dos are seven-day items). With no due date column, every to-do in the file counts. Older open to-dos are listed as carried over; done ones from before the window are left out; to-dos due after the meeting are "not due yet."
- **Done:** a status of Done, Complete, Completed, Yes, True or a check, or a Completed On date. Any other status is not done. An empty status is "no status given": left out of the rate, named, and sent to its owner. Never mark one done or not done.
- **Completion rate:** done divided by the counted to-dos that have a status, with the arithmetic written out every time: "9 done / 11 with a status = 81.8%." One decimal. If any had no status, say how many were left out.
- One reference only, quoted as the source's standard: an EOS Worldwide blog post calls a 90% completion rate "the minimum acceptable." Compare the team's rate to it in one plain sentence. Never give a rate for one person, and never call anyone's to-dos late, slipping or behind; the list shows done or not done next to each owner, and the meeting does the rest.

### The Issues List and the Suggested IDS Order

- List every short-term issue as written in the file, with owner, date added and any priority the team set. Long-term issues go in a separate short list, out of this week's order.
- Never add, merge, split, reword or drop an issue. A possible drop-down from the scorecard, rocks or headlines is listed apart, labeled "not on the list: the team decides."
- **Suggested order (a suggestion; the team picks its top three in the meeting).** Sort by these tiers, and give each issue its reason in a few words from the files:
  1. **A dated client, contract or money deadline in the issue's own words** (an inspection or closing date, a client asking to cancel by a date, a renewal or price change on a date). Soonest date first.
  2. **Tied to this week's numbers or rocks:** the issue names or plainly describes a measurable missed this week (name it and the miss) or a rock its owner gave as off track (quote the status). Oldest added date first.
  3. **Everything else.** Oldest added date first.
- If the file has a priority or rank the team set, show it in its own column and say the team's ranking stands; the suggestion sits beside it.
- Mark the first three "suggested top three." Never mark an issue unimportant or suggest closing, solving or assigning one. The order is about the issue, never about the person who owns it.

### Headlines

- List them as given, under Customer and Employee when the file or message says which.
- Leave out a health, family-medical, pay, HR or legal detail about a person, even when a headline carries it, and keep the rest of the headline ("Rosemary is out Friday; Juniper is covering her showings."). Add one line: "A personal detail in one headline was left out; its owner can share it." Never repeat the detail anywhere else in the output.
- A headline that names a problem is a possible drop-down; list it with the others.

### The Note to Owners (Draft)

Write it only when something is missing or needs an owner's word: an empty or non-number scorecard cell in the 13 weeks, a rock with no status, a counted to-do with no status, or a goal direction the prep had to assume. One short message the user sends before the meeting:
- A Title Case subject, such as "Scorecard Numbers And Rock Status Needed Before Tuesday's L10."
- One line per owner: what's missing, by measurable and week, rock title or to-do title, with this week's gaps first and older empty cells from the 13 weeks after them, and any assumed goal direction as a yes or no question. Ask only for the number, the status or the direction. No reasons, no comments on anyone's work, and no deadline the user didn't give.
- Sign with the user's name or [Your Name]. Follow the user's voice profile when one is in the conversation; otherwise plain and friendly.

### Check Before Sending

Before the prep goes to the team:
- The week reviewed and the meeting date and start time.
- Every miss: the number, the goal and its direction, with the measurable's row.
- Every empty cell and every cell that isn't a number, by owner and week.
- Every assumed goal direction, to confirm with its owner.
- Every rock status as given, and every "no status given."
- The completion rate's arithmetic and which to-dos were left out and why.
- Every date in the suggested IDS order's reasons, against the issue's own words.
- Any headline detail left out.

## Part 3: Where Each File Comes From

Last verified: 2026-11-10, against each vendor's help center (sources under each tool). Menu labels change; if a step doesn't match, the vendor's article is the authority.

### Ninety

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

### Bloom Growth (formerly Traction Tools)

Traction Tools renamed itself Bloom Growth in October 2022 (Bloom Growth, "A letter to our community about Traction Tools and Bloom Growth," https://www.bloomgrowth.com/blog/a-letter-to-our-community-about-traction-tools-and-bloom-growth). Bloom Growth calls rocks Quarterly Priorities or Goals, the issues list O&O (Issues), and the scorecard KPIs or Metrics.

- **One meeting's data:** **Meetings list** in the left navigation, hover over the meeting name and click the three dots (or open the meeting and click the three dots by the agenda), then **Export All** (or **More Actions**). It downloads a ZIP with O&O (Issues).csv, Quarterly Priorities (Goals).csv, KPI (Metrics).csv, To-Dos, MeetingRatings.csv, MeetingSummary.csv and Headlines. Unzip it and attach the files.
- **Just the scorecard:** the menu at the top right of a KPI tile, **Export**, pick the frequency and dates in **Export KPIs**, then **Export**.
- **Everything (admins):** the organization name at the bottom left, **Organization Settings**, **Company Data**.

Source: Bloom Growth, "Exporting Data," https://help.bloomgrowth.com/en/exporting-data (no date on the page), checked 2026-11-10. The article doesn't list the columns inside each CSV, so the code finds them by name and shows which column it used for what. Check that table on the first run.

### A Spreadsheet (Google Sheets or Excel)

Any layout with one row per measurable and one column per week works, with a Goal column (and an Owner column, so empty cells can go to their owner). A long layout with one row per measurable per week (Measurable, Week, Value, Goal, Owner) works too. In Google Sheets, File, Download, Microsoft Excel (.xlsx) keeps every tab; a CSV holds only the tab that is open (not checked against Google's help center). One workbook with Scorecard, Rocks, To-Dos and Issues tabs can be attached once: the code picks each tab by its name and header.

### Pasted Text

Rocks, to-dos, issues and headlines pasted into the chat work. Save them to a file as written (a CSV for a table, a text file for headlines) and pass that file to the code, so every count still comes from the code. Never retype or tidy what was pasted.

### How a Goal Is Read

The code reads each measurable's own goal, in this order:
1. goals.json, when the user said which way a goal runs.
2. A symbol or words in the goal cell: `>=` or "at least" or "60+" (at least), `<=` or "or less" (at most), `>`, `<`, `=`, or a range ("10 to 20").
3. A direction column (Goal Direction, Operator, Rule): `>=`, "Higher is better", `<=`, "Lower is better" and the like.
4. Nothing says: read as **at least**, marked **ASSUMED**. The prep then checks every assumed one (see Part 2 of this guide).
