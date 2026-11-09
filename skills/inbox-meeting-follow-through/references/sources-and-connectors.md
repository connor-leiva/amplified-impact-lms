# Sources, Connectors and File Formats

Last verified: 2026-11-08. Vendor features change often; when a connector behaves differently from this file, trust what the connector actually offers and tell the user.

## The Rule That Makes Every Version Work

Read only. The skill searches and reads email, calendars and meeting notes, and writes its drafts in the chat. It creates a draft in Gmail or Outlook, or a task in a task tool, only when the user asks and the connector offers that action. It never sends, archives, labels, deletes, RSVPs or moves anything. This works whether a connector can only read or can also write, which matters because Anthropic's own pages disagree on that (below).

## Email

**Gmail connector.** Anthropic's Help Center says it can search and read email, draft emails, and send, reply to and forward them, with Claude asking for approval before each send, reply or forward by default. The Claude Docs page for Gmail says the connector is read-only and can't create, send or modify email. Anthropic's connector directory lists draft and send tools. Either way, this skill only reads unless the user asks for drafts. The Help Center says attachment content isn't readable through Gmail (metadata only): name an attachment, don't summarize it.

How to search well:
- Search previews can show only the oldest messages in a thread. Open each relevant thread in full before deciding anything about it.
- Gmail search operators that help: `newer_than:2d` or `after:YYYY/MM/DD` for the window, then filter by each message's timestamp; `-category:promotions -category:social` to drop those tabs; the Sent folder for the leader's promises.

**Microsoft 365 connector (Outlook).** Available on every Claude plan. Personal Microsoft accounts can connect on Free, Pro, Max and Ultra. A work or school account needs a one-time consent from a Microsoft Entra Global Administrator, and on Team and Enterprise plans the Claude organization owner enables it first. It can search Outlook email (by date, sender, subject and other criteria), Outlook calendar, OneDrive, SharePoint and Teams chats. It can draft and send email only when the admin has enabled write tools (personal accounts get write actions once connected). Write tools can't attach files. A personal account covers Outlook email and calendar and OneDrive only (no Teams or meeting summaries), and is connected from Claude on the web.

**No connector.** Work from pasted threads or uploaded files:
- Gmail: open the email, More, Download message (an .eml file), or open the conversation and Print all, then save as PDF.
- Outlook on the web: More actions, Download (.eml or .msg). New Outlook: More actions, Save as. Any Outlook: print to "Microsoft Print to PDF."
- Claude's upload list includes PDF, DOCX, TXT, HTML and CSV but doesn't list .eml or .vtt. If one won't attach, rename it to .txt or use the PDF. A chat takes up to 20 files, so paste many short threads or combine them.

## Calendar

**Google Calendar connector.** The Help Center says it can view events, create, update and delete them, and respond to invitations; the Claude Docs page says it's read-only. This skill only reads it: list the window's meetings to match them with notes, and to resolve "before [meeting]" due dates. Never create, change or RSVP.

Plan conflict: the Help Center says the Google Workspace connectors (Gmail, Calendar, Drive) are available to all users; the Claude Docs pages say Gmail and Google Calendar need Pro, Max, Ultra, Team or Enterprise. On Team and Enterprise, an owner enables them for the organization first.

## Meeting Notes and Transcripts

**Granola connector.** Made by Granola and listed in Anthropic's connector directory. Claude sees only notes the user can already see in Granola. Granola's Basic (free) plan gives the connector personal and public notes from the last 30 days, and the transcript tool is for paid plans only; Anthropic's listing says transcripts and full meeting history need Granola's Business or Enterprise plan. Granola's pricing page lists Business at $14 per user per month and Enterprise at $35. Without transcripts, use the notes, mark the meeting "notes only," and say commitments may be missing.

Read each meeting's notes first (they list attendees), then the transcript. Granola labels transcript blocks by audio source (Microphone, System audio), not by person; see `meeting-commitments.md`.

**Uploaded transcripts:**
- Zoom: cloud recording transcripts are VTT files, on Pro, Business, Education or Enterprise accounts with cloud recording and audio transcription on. Zoom web portal: Recordings & Transcripts, Cloud recordings, click the meeting, then download the audio transcript (VTT) from its list of recording files.
- Microsoft Teams: organizers and co-organizers can download the transcript as .docx or .vtt (others only if IT allows): Chat, open the past meeting chat, Recap, Transcript, then the arrow next to Download.
- Google Meet: transcripts save as a Google Doc in the organizer's Drive, in the "Google Meet" folder. Download it as PDF or DOCX, or read it through a Google Drive connector.
- Otter: export a conversation as TXT, DOCX or PDF (Otter also offers SRT). Which plans include which formats wasn't confirmed; check in Otter.
- Fathom: transcripts can't be downloaded; use the Copy Transcript button above the transcript and paste it.

## Task Tools

ClickUp and Asana connectors are in Anthropic's directory and can create and update tasks. Use one only when the user asks, and search it for the same work before creating anything.

## Privacy Notes for the Leader

Anthropic says it doesn't train its models on Gmail, Drive or Calendar connector data, but on consumer plans (Free, Pro, Max, Ultra) with model training turned on, content copied or pasted into a chat from those sources may be used. Raw connector content isn't included in consumer training data unless it's copied into the conversation. Team and Enterprise chats aren't used for training by default. The setting is Settings, Privacy, "Help Improve our AI models."

## Sources (checked 2026-11-08)

- Use Google Workspace connectors (Help Center): https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- Gmail connector (Claude Docs): https://claude.com/docs/connectors/google/gmail
- Gmail connector listing: https://claude.com/marketplace/connectors/gmail
- Google Calendar connector (Claude Docs): https://claude.com/docs/connectors/google/calendar
- Connect to Microsoft 365 (Help Center): https://support.claude.com/en/articles/15183774-connect-to-microsoft-365
- Microsoft 365 connector (Claude Docs): https://claude.com/docs/connectors/microsoft/365
- Granola connector listing: https://claude.com/marketplace/connectors/granola
- Granola MCP help: https://docs.granola.ai/help-center/sharing/integrations/mcp
- Granola pricing: https://www.granola.ai/pricing
- Upload files to Claude (Help Center): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Gmail Help, Download and send emails as attachments: https://support.google.com/mail/answer/9261412
- Gmail Help, Print Gmail messages: https://support.google.com/mail/answer/8255
- Gmail Help, Search operators: https://support.google.com/mail/answer/7190
- Microsoft Support, Save an Outlook message as a .eml file, a PDF file, or as a draft: https://support.microsoft.com/en-us/outlook/mail/save-an-outlook-message-as-a-eml-file-a-pdf-file-or-as-a-draft
- Zoom Support, Using audio transcription for cloud recordings: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064927
- Microsoft Support, Teams transcripts: https://support.microsoft.com/en-us/teams/meetings/start-stop-and-download-live-transcripts-in-microsoft-teams-meetings
- Google Meet Help, Use Transcripts with Google Meet: https://support.google.com/meet/answer/12849897
- Otter, Transcription (export formats): https://otter.ai/transcription
- Fathom Help, Get a copy of your transcript: https://help.fathom.video/en/articles/296000
- Anthropic Privacy Center, model training: https://privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training and https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- ClickUp and Asana connector listings: https://claude.com/marketplace/connectors/clickup and https://claude.com/marketplace/connectors/asana
