# Building the Calendar

Read this in step 8, after the clear yes. The three rules in SKILL.md (no invites, hands off other people's meetings, don't delete their events) come first; this file is how to follow them with the tools.

Last verified: 2026-11-08. Sources are at the bottom.

## The Google Calendar Connector's Settings

Checked against the connector's own tool definitions in a Claude session on 2026-11-08. Tool names and fields can change: if a field below isn't in the tool you have, read the tool's description and keep the same intent.

- **list_events:** pass `timeZone` (their IANA zone), `pageSize` 250 (the maximum) and follow `pageToken` with each `nextPageToken`.
- **create_event:** `summary`, `startTime` and `endTime` as local times with no offset and no trailing Z, plus `timeZone`. Repeats go in `recurrenceData` as RFC 5545 strings (`RRULE:...`, `EXDATE;TZID=...:...`).
- **notificationLevel:** `NONE` on every create, update and delete. Left unset, all three treat it as `ALL`, so leaving it out can email every guest.
- **attendees:** never set, and never `addedAttendees` on an update. Leave `addGoogleMeetUrl` off.
- **Reminders:** `useDefaultReminders: false` with no `overrideReminders` gives a block no reminders. Left out, the calendar's default reminders apply. For an evening or weekend block they asked to be reminded of: `overrideReminders: [{"method": "popup", "minutes": 10}]`.
- **availability:** `AVAILABILITY_FREE` for reserve and growth blocks; leave the default (busy) on everything else.
- **colorId:** one per area, from Google's event color palette, matching the plan page.
- **No repeat rule on update_event:** the update tool has no recurrence field, so it can't end a series early or change how it repeats. To change a series, delete it and create a new one. Deleting a series removes every date of it, past ones included: say so before they say yes.
- **eventType:** leave it unset (a regular event). Never `FOCUS_TIME` or `OUT_OF_OFFICE`: Google's focus time declines new and existing meetings by default, and out of office events have decline settings too, so either one can answer other people's invitations for them.

## Repeat Rules

- A block that repeats weekly: `RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261218T160000Z`. When the start time carries a time zone, RFC 5545 requires UNTIL in UTC (ending in Z). Work it out with code: the last occurrence's local start time in their zone, converted to UTC, so a daylight saving change can't cut off the last date.
- Every other week: add `INTERVAL=2`, and start the series on the right week (Week A or Week B).
- Skipped dates: `EXDATE;TZID=America/Denver:20261126T090000`, one per date, with the same local start time as the series.
- When a block's job changes partway, end one series and start another; don't edit single dates.
- Before the batch, create one series, list it back with list_events, and count its dates against the plan.

## When the Connector Can't Create Events: An Import File

Use this when no calendar connector is connected, when the one they have only reads, or when they'd rather add the blocks themselves. Anthropic's own pages disagree on whether the Google Calendar connector can create events, so don't promise a build until a create works.

Make one .ics file of the approved blocks, after the same Before the calendar review and the same clear yes:
- `BEGIN:VCALENDAR`, `VERSION:2.0`, a `PRODID`, and a `VTIMEZONE` for their zone (the icalendar package can build one; otherwise write its STANDARD and DAYLIGHT parts from zoneinfo). RFC 5545 asks for a VTIMEZONE for every TZID used.
- One `VEVENT` per series or single block: a unique `UID`, `DTSTAMP`, `DTSTART;TZID=...`, `DTEND;TZID=...`, `RRULE` and `EXDATE` as above, `SUMMARY`, and a `DESCRIPTION` with the block's job and the closing tag "From your plan (made by Claude on [date]). Solo block: no guests, no invites."
- `TRANSP:TRANSPARENT` on reserve and growth blocks (shown as free).
- Never an `ORGANIZER`, `ATTENDEE` or alarm line.
- Check the file with a script before you hand it over: every series expands to the dates the plan expects, and nothing lands on a fixed meeting.

Tell them how to import it into its own calendar, so one delete undoes it all:
1. **Make a calendar for it (Google Calendar, on a computer):** on the left, next to "Other calendars," click Add other calendars, then Create new calendar. Name it (for example, "Perfect Week") and click Create calendar.
2. **Import:** Settings, then Import & export, then Select file from your computer. Pick the .ics file, choose the new calendar (the default is their primary calendar), then Import. Google doesn't import guests or conference data from a file.
3. **Undo:** Settings, click that calendar's name in the left column, then Remove calendar, Delete, and Delete permanently. Only the owner can, and it removes the calendar for anyone it's shared with.
4. **Outlook.com or Outlook on the web:** Calendar, Add calendar, Upload from file, Browse, pick the .ics, then choose the calendar and Import.

An imported file is a one-time copy: later changes happen in their calendar, or by deleting that calendar and importing a new file. Don't count on per-area colors surviving the import; the plan page keeps them.

## Sources (checked 2026-11-08)

- The Google Calendar connector's tool definitions (create_event, list_events, update_event, delete_event), read in a Claude session on 2026-11-08.
- Anthropic's directory listing for the Google Calendar connector (says it can create and update events; lists create_event): https://claude.com/marketplace/connectors/google-calendar
- Claude Help Center, "Use Google Workspace connectors" (says the connector can create, update and delete events, for all users): https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- Claude Docs, Google Calendar connector (says it is read-only, on Pro, Max, Ultra, Team and Enterprise): https://claude.com/docs/connectors/google/calendar
- Google Calendar Help, "Use focus time in Google Calendar" (declines new and existing meetings by default): https://support.google.com/calendar/answer/11190973
- Google Calendar Help, "Set your working hours" (out of office decline settings): https://support.google.com/calendar/answer/7638168
- Google Calendar Help, "Import events to Google Calendar": https://support.google.com/calendar/answer/37118
- Google Calendar Help, "Create a new calendar": https://support.google.com/calendar/answer/37095
- Google Calendar Help, "Delete or unsubscribe from a calendar": https://support.google.com/calendar/answer/37188
- Microsoft Support, "Import or subscribe to a calendar in Outlook.com or Outlook on the web": https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web
- Google Calendar API, Colors resource (the event color palette behind colorId): https://developers.google.com/workspace/calendar/api/v3/reference/colors
- RFC 5545 (iCalendar), sections 3.3.10 (RRULE and UNTIL), 3.6.5 (VTIMEZONE) and 3.8.5.1 (EXDATE): https://www.rfc-editor.org/rfc/rfc5545.txt
