# Reading Exports When Nothing Is Connected

Use this in step 1 (to say what to attach) and step 2 (to read it). Exports replace the connectors for planning; only step 8's build needs a live calendar.

Last verified: 2026-11-08. Sources are at the bottom. Menus change: if a path below doesn't match their screen, ask them to search the vendor's help center for "export".

## What to Ask For

One line each, so they can get it in a minute or two:
- **Google Calendar (.ics):** on a computer, open Google Calendar. On the left under "My calendars," point to the calendar, click More, then Settings and sharing, then Export calendar. One .ics file downloads. (Settings, then Import & export, then Export downloads every calendar as a .zip of .ics files.) It can't be done from the phone app, and a work account's admin can turn exporting off.
- **Outlook (classic Outlook for Microsoft 365, 2024 or 2021):** open the Calendar, select the calendar, then File, Save Calendar, More Options. Set Date Range to cover today through their end date (or Specify dates), set Detail, then OK and Save.
- **ClickUp:** open the List or Table view, click Customize (upper right), then Export. Choose All columns and CSV, then Download. To include subtasks, set Subtasks to "As separate tasks" first, and expand any collapsed groups, since collapsed groups aren't exported. A member with Edit access to the List can export it (guests can't). ClickUp's Free Forever and Unlimited plans allow five view exports in all, and its newer Core plan has List view export only as a trial, so one export of their own task view is the best use of them.
- **Todoist:** on the web, open the project, click the three dots (top right), then Import & export, then Export to CSV. Completed tasks aren't included, which is what you want here.
- **Asana:** export the project to CSV from the project's menu. Asana's menu labels weren't confirmed on 2026-11-08, so if they can't find it, they can confirm in Asana's help center or paste the list.
- **A spreadsheet:** in Google Sheets, File, Download, then Comma-separated values (.csv). An Excel file can be attached as is.
- **Anything else** (a notes app, a paper list): paste it. Never ask them to retype what's already in a file.

Attaching in Claude: Claude's help center lists CSV, TXT, JSON and XLSX among the supported upload types, and .ics isn't named. If the chat won't take the .ics, rename it to .txt (it's plain text) and attach it again. XLSX needs code execution on.

## Reading the Calendar (.ics)

An .ics file is plain text in the iCalendar format (RFC 5545). Read it with a script, never by eye.
- Unfold first: a line that starts with a space continues the line above it.
- Each event runs from BEGIN:VEVENT to END:VEVENT. The fields that matter: SUMMARY (title), DTSTART and DTEND, RRULE (the repeat rule), EXDATE (skipped dates), RECURRENCE-ID (one moved or changed date of a series, matched by UID; it replaces that date), STATUS (drop CANCELLED), ORGANIZER, ATTENDEE (with PARTSTAT: ACCEPTED, TENTATIVE, DECLINED or NEEDS-ACTION), TRANSP (TRANSPARENT shows as free), LOCATION and DESCRIPTION.
- Times come three ways: with TZID=Area/City (local time in that zone), ending in Z (UTC), or VALUE=DATE (an all-day date). Convert everything into their working zone (Python's zoneinfo does this).
- Expand repeating series through the end date. Python's dateutil (rrulestr) handles RRULE and EXDATE; use the icalendar package if it's installed. Then apply RECURRENCE-ID overrides and drop cancelled dates.
- Google exports usually carry X-WR-CALNAME (the calendar's name) and X-WR-TIMEZONE (its own zone). These are non-standard X- properties, so don't count on them; when X-WR-TIMEZONE is there and differs from their working zone, give them the time zone note from step 2.
- An export holds the calendar's whole history. Keep today through the end date.

Sorting, as in step 2:
- Fixed: an ATTENDEE other than them, or an ORGANIZER that isn't them. Their address is the calendar's own; when unsure, it's the organizer on their solo events.
- Events they declined (their PARTSTAT is DECLINED) aren't part of their week. Mention one only if it matters.
- An invite with only them listed, another organizer and NEEDS-ACTION is a broadcast invite: ask whether they're going.
- All-day events (days off, holidays, contract deadlines) go to Dates that drive the blocks, not onto the week board.
- An export is a snapshot. Say its date (the newest DTSTAMP or LAST-MODIFIED is a fair guide) and note that step 8 re-reads the live calendar.

## Reading the Task List (CSV or Spreadsheet)

Exports name columns differently. Match by meaning:

| Meaning | ClickUp | Todoist | Asana | A spreadsheet |
|---|---|---|---|---|
| Title | Task Name | CONTENT (rows where TYPE is task) | Name | Task, Title |
| Due | Due Date (milliseconds, a dated text or ISO, whichever format they picked at export), plus Due Date Text when it's there | DATE, DEADLINE | Due Date | Due |
| Owner | Assignees, as a bracketed list | RESPONSIBLE | Assignee | Owner, Who |
| Estimate | Time Estimated (milliseconds, or 10h 5m or 10:05 by the export's time format), plus Time Estimated Text when it's there | DURATION with DURATION_UNIT (minutes) | none by default | Hours, Estimate |
| Area | List Name, Folder Name, Space Name | the section rows above it (TYPE is section) | Project Name | Area, Category |
| Done | Status | left out (completed tasks aren't exported) | Completion Date | Status, Done |
| Parent | Parent ID | INDENT (2 or more is a subtask) | Parent Task | none |

- Skip any lines above the header row (a title, a banner) and blank rows.
- Keep their open tasks: assigned to them, not done or closed, and overdue or due on or before the end date. List undated tasks on their own ("No due date: date it, park it or drop it"). A task due soon after the end date isn't counted, but if it needs real hours before then (a course, a big report), name it in Dates that drive the blocks.
- A repeating task counts once for each date it falls on from today through the end date. Todoist writes the repeat as words in DATE ("every friday", "every weekday") and its export drops the start date, so expand it from today and say you did.
- Count hours once: when a parent and its subtasks both carry estimates, use the subtasks.
- Read every date in their working zone. ClickUp's text dates carry their own offset.
- Only the columns' meanings are general. Never invent a due date, an estimate or an owner the file doesn't have; estimates you add are labeled as yours.

## Sources (checked 2026-11-08)

- Google Calendar Help, "Export events from your Google Calendar": https://support.google.com/calendar/answer/37111
- Microsoft Support, "Export an Outlook calendar to Google Calendar" (applies to Outlook for Microsoft 365, 2024, 2021): https://support.microsoft.com/en-us/outlook/export-an-outlook-calendar-to-google-calendar
- ClickUp Help, "Export List and Table views" (updated 2026-09-19; the Normal, ISO or POSIX date format and the 10h 5m or hh:mm time format are chosen at export): https://help.clickup.com/hc/en-us/articles/6310174308631-Export-List-and-Table-views
- ClickUp Help, "Export task data" (column list, updated 2026-10-19): https://help.clickup.com/hc/en-us/articles/6310551109527-Export-task-data
- ClickUp Help, "Import and export feature availability and limits" (five view exports on Free Forever and Unlimited; List view export a trial on Core; who can export, updated 2026-10-28): https://help.clickup.com/hc/en-us/articles/30782347809815-Import-and-export-feature-availability-and-limits
- Todoist Help, "Import or export a project as a CSV file in Todoist" (column guide, export steps, completed tasks left out, a repeating date's start date not saved; updated 2026-11-05): https://www.todoist.com/help/articles/import-or-export-a-project-as-a-csv-file-in-todoist-YC8YvN
- Asana, "Export Asana projects to CSV for custom reporting" (an older Asana post; its column list, not its menu labels): https://asana.com/inside-asana/export-to-csv
- Google Docs Editors Help, "Create, view, or download a file" (File, Download): https://support.google.com/docs/answer/49114
- Claude Help Center, "Upload files to Claude" (supported types): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- RFC 5545, Internet Calendaring and Scheduling Core Object Specification (iCalendar), sections 3.3.10 (RRULE), 3.8.5.1 (EXDATE) and 3.8.8.2 (X- properties): https://www.rfc-editor.org/rfc/rfc5545.txt
