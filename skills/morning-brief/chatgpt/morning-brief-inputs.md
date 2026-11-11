# Inputs: What Each One Is and Where It Comes From

The operator refreshes these at a fixed time each morning; the brief reads what is there. Any input can be pasted instead of attached. Last verified: 2026-11-11 (the click paths below were checked on the dates given with each).

## 1. This Week's Numbers (any one is enough)

- **Lead-Source ROI summary.** The Lead-Source ROI Grok Bot template (amplifiedimpact.io/lead-source-roi) runs on the 5th of each month and saves a dated workbook, `lead-source-roi-YYYY-MM`, in Google Drive, with a short chat summary. Attach the chat summary or the workbook's Summary sheet. It is monthly: in the first days of a month, last month's report may not exist yet, which is not stale. Two months old is stale.
- **FUB Pipeline Review.** The output of the FUB Pipeline Review skill (amplifiedimpact.io/fub-pipeline-review), run on this week's Follow Up Boss exports. Attach or paste the whole output, or at least its bottom line and its "needs a decision this week" list. It is weekly: older than seven days is stale.
- **The team's weekly scorecard.** A spreadsheet, or a Ninety or Bloom Growth scorecard export (the same files L10 Meeting Prep reads). Only the latest week is used, with each measurable against the goal as the scorecard gives it.

The brief never recomputes these. It quotes them with their source and period.

## 2. The Current Task Register

One task destination, the one the team already uses. Columns the brief reads, under any of these names:

| What | Column names it recognizes |
|---|---|
| The work | Task, Task Name, Name, Title, Item |
| Owner | Owner, Assignee, Assignees, Assigned To, Responsible |
| Due date | Due, Due Date, Due Date Text, Deadline, Due By |
| Status | Status, State, Done, Completed |
| Definition of done | Done When, Definition of Done, Acceptance, Finished When |
| Source and notes | Source, Notes, Task Content, Description, Comments |
| When it was updated | Updated, Date Updated, Last Updated, Modified |

Where the export comes from:
- **ClickUp:** open the List or Table view, click Customize (upper right), then Export, then All columns, CSV, Download. ClickUp's Free Forever and Unlimited plans allow five view exports in all. Source: ClickUp Help, "Export List and Table views," https://help.clickup.com/hc/en-us/articles/6310174308631-Export-List-and-Table-views (checked 2026-11-08, as on the Perfect Week page). ClickUp writes assignees in brackets, "[Pip Larkhaven]"; that is the name.
- **Asana:** export the project to CSV from the project's menu. Asana's current menu labels were not confirmed (its help center did not load for checking on 2026-11-08); confirm in Asana's help center.
- **A Google Sheet:** File, Download, Comma-separated values (.csv). Source: Google Docs Editors Help, https://support.google.com/docs/answer/49114 (checked 2026-11-08). An Excel file attaches as it is.
- **A pasted list:** one task per line, with the owner, the due date and the status, in any order the user writes them.
- **A connector:** a ClickUp or Asana connector that is already connected is read, never written to.

## 3. One Transcript, Notes or Email Thread (optional)

One meeting or one thread per run, and only one the user is allowed to share. The transcript is the source of truth; an AI meeting summary (Granola, Zoom, Otter, Fathom or Teams notes) can drop an owner or change a date, so when both are attached, read the transcript. Granola labels transcript audio as "Microphone" and "System audio," not by person: work out the speaker from names and answers, and say when an owner rests on an inferred speaker.

## 4. Today's Calendar (optional, only if it is already there)

- **Google Calendar export (.ics):** on a computer, open Google Calendar. On the left under "My calendars," point to the calendar, click More, then Settings and sharing, then Export calendar. Source: Google Calendar Help, "Export events from your Google Calendar," https://support.google.com/calendar/answer/37111 (checked 2026-11-08). If ChatGPT won't take the .ics file, rename it to .txt.
- **A connected Google Calendar**, read only, or **today's meetings pasted** as a list.
- Only today's events are used: to say when a decision can be made (a pipeline meeting at 10:00 AM) or that today is full. The brief never moves, creates or declines an event.

## 5. The Team Roster (optional)

Names and roles, as a CSV or pasted. It tells a team member from an outside party and matches first names to people. Without it, the brief uses the names as written and says it had no roster.

## Attaching Files

Start the chat inside this project and attach the files in the message box, or paste the text. Files that stay the same every day (the roster) can go on the project's Sources tab instead.

## What Not to Attach

Only what the brief needs. Leave out bank details, tax IDs, identity documents, full transaction files and personnel records. Redact a transcript's client financial details before attaching it.
