# Inbox and Meeting Follow-Through: Page Notes

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-08; sources inline.

## The Promise

Every morning, one pass over your inbox and yesterday's meetings: the decisions only you can make, replies and hand-offs already drafted, who owes what by when, and the promises you forgot, with any email that tries to change wire or payment instructions flagged at the top.

## Who It's For

Team leaders, owners and ops leads who lose hours to email, meetings and follow-ups. It works for one person on their own Claude account: connect Gmail or Outlook and Granola and it reads them itself, or paste threads and attach transcripts with nothing connected. Built for any state and any brokerage.

## What to Connect or Upload, and Where It Comes From

Nothing to type. Pick one route for email and one for meetings.

**Email (one of these)**
- **Gmail connector** (best). In Claude: Customize, then Connectors, find Gmail, Connect, sign in to Google. In each chat, turn it on from "+", then Connectors. (Claude Docs, https://claude.com/docs/connectors/google/gmail; Help Center, https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities; both checked 2026-11-08.)
- **Microsoft 365 connector (Outlook).** Customize, then Connectors, find Microsoft 365, click "Add," choose your account type and sign in. A work or school account needs a one-time consent from your Microsoft Entra Global Administrator first, and on Team and Enterprise plans your Claude owner turns it on. A personal Outlook.com account connects from Claude on the web. (Help Center, https://support.claude.com/en/articles/15183774-connect-to-microsoft-365; Claude Docs, https://claude.com/docs/connectors/microsoft/365; checked 2026-11-08.)
- **No connector: paste threads, or attach them.** Gmail: open the conversation, click Print all, and save as PDF (Gmail Help, https://support.google.com/mail/answer/8255). Or open one email, click More, then Download message, which saves an .eml file (Gmail Help, https://support.google.com/mail/answer/9261412). Outlook on the web: open the message, More actions, Download (.eml or .msg); any Outlook can print to "Microsoft Print to PDF" (Microsoft Support, https://support.microsoft.com/en-us/outlook/mail/save-an-outlook-message-as-a-eml-file-a-pdf-file-or-as-a-draft). All checked 2026-11-08.
  - Claude's list of supported uploads includes PDF, DOCX, TXT, HTML and CSV but not .eml or .vtt, and a chat takes up to 20 files (Help Center, https://support.claude.com/en/articles/8241126-uploading-files-to-claude, checked 2026-11-08). If an .eml won't attach, rename it to .txt, or use the PDF. For a big inbox, the connector is much easier than files.

**Meetings (one or more of these)**
- **Granola connector.** Customize, then Connectors, find Granola, Connect, sign in to Granola. Transcripts need a paid Granola plan: Granola's free Basic plan gives the connector only the last 30 days of notes and no transcript tool, and Anthropic's listing says transcripts and full history need Business or Enterprise. Business is $14 per user per month. (https://docs.granola.ai/help-center/sharing/integrations/mcp; https://claude.com/marketplace/connectors/granola; https://www.granola.ai/pricing; checked 2026-11-08.) On the free plan the skill uses the notes and says commitments may be missing.
- **Zoom:** Zoom web portal, Recordings & Transcripts, the Cloud recordings tab, click the meeting's name, then download the audio transcript (a .vtt file) from its list of recording files. Needs a Pro, Business, Education or Enterprise account with cloud recording and audio transcription on (Zoom Support, https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064927, checked 2026-11-08). Rename the .vtt to .txt if it won't attach.
- **Microsoft Teams:** Chat, open the past meeting's chat, Recap, Transcript, then the arrow next to Download (.docx or .vtt). Organizers and co-organizers can download by default (Microsoft Support, https://support.microsoft.com/en-us/teams/meetings/start-stop-and-download-live-transcripts-in-microsoft-teams-meetings, checked 2026-11-08).
- **Google Meet:** transcripts save as a Google Doc in the organizer's Drive, in the "Google Meet" folder. Download it as PDF or DOCX (Google Meet Help, https://support.google.com/meet/answer/12849897, checked 2026-11-08).
- **Otter:** export the conversation as TXT, DOCX or PDF (Otter, https://otter.ai/transcription, checked 2026-11-08). Which plans include which formats wasn't confirmed; confirm in Otter.
- **Fathom:** transcripts can't be downloaded; click Copy Transcript above the transcript and paste it (Fathom Help, https://help.fathom.video/en/articles/296000, checked 2026-11-08).

**Optional**
- **Google Calendar connector** (read only here): lets the skill name meetings that have no notes. Same connect steps as Gmail.
- **A team roster** (CSV or a list in a Claude Project's instructions): names, roles, emails. It makes hand-offs land on the right person.
- **A Claude Project** for the daily pass, so yesterday's digest (and its "Covered through" line) is there the next morning.

## Things to Say to It

1. "Run my morning pass."
2. "Go through my inbox since yesterday and draft what I need to send."
3. "Here's the transcript from our leadership meeting. Who owns what, and by when?"
4. "What did I promise people this week that I haven't done?"
5. "Friday rollup: what got done, what's open, what slipped?"
6. "Put those drafts in Gmail." (After you've read them. It still won't send.)

## What Comes Back

- A three-sentence bottom line.
- **High Risk** first, when an email changes wire or payment instructions: the red flags and the line "verify by phone with title at a number you already have."
- **Needs You Today:** decisions only you can make.
- **Your Promises:** things you said you'd do in sent mail and haven't.
- **Replies, Delegations** (transactions, ISA, ops, marketing, team lead), **Commitments From Meetings** (owner, due date, the words they used, and the source), and **Waiting On Others**.
- A count of everything skipped, and anything suspicious.
- **Drafts:** replies, forwards with a note on top, follow-ups only for what's overdue, a recap per team meeting.
- **Check Before Sending**, and a **Covered through** line so the next pass starts where this one ended.
- On Fridays, when asked: **Done, Open, Slipped**, with the email or meeting that proves each "done."

## What It Won't Do

- Send, archive, label, delete, RSVP or move anything. It drafts in the chat, and in Gmail or Outlook only when you ask.
- Reply to, forward or confirm a wire instructions email, or repeat its account numbers, phone numbers or links.
- Work your leads (Follow Up Boss or your CRM does that) or run your transaction file (your transactions team does). Lead emails are forwarded to your ISA; contract and lender emails go to transactions.
- Answer contract, legal or compliance questions (they go to your broker), or make up a team policy (it leaves a [policy answer] blank).
- Put an agent's private matters (health, family, pay, performance) in any draft or recap.
- Repeat what a lead says about the kind of neighbors they want, or forward a lead's message that includes it (it writes your ISA a new note with the criteria instead).
- Create tasks in ClickUp or Asana unless one is connected and you ask; it checks for duplicates first.

## What You Need

- **A Claude plan with skills, and code execution on.** Anthropic's pages disagree on Free: the Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise (https://support.claude.com/en/articles/12512180-use-skills-in-claude), while the claude.com docs list Pro and up (https://claude.com/docs/skills/overview). Say "Pro or higher" to be safe. Skills need Settings, then Capabilities, "Code execution and file creation" on (called "Create and edit files" in the updated Settings layout; on by default for individual plans; https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude, checked 2026-11-08). Upload: Customize, then Skills, "+", "+ Create skill," "Upload a skill," then the ZIP.
- **Connectors (optional, recommended):** Gmail or Microsoft 365, plus Granola. Anthropic's pages disagree on two points, checked 2026-11-08:
  - **Plans:** the Help Center says the Google Workspace connectors are "available for all users" (https://support.claude.com/en/articles/10166901-use-google-workspace-connectors); the Claude Docs pages say Gmail and Google Calendar need Pro or higher. Microsoft 365 is on every plan, Free included.
  - **Read or write:** the Help Center says the Gmail connector can draft and send, with approval before each send; the Claude Docs Gmail page says it's read-only. Anthropic's directory listing shows draft and send tools (https://claude.com/marketplace/connectors/gmail). The same split exists for Google Calendar. **What the page should say:** "The skill only reads your email and calendar. If your Gmail connector can create drafts, it can put the drafts there when you ask; if not, they're in the chat to copy."
- **Cost:** nothing beyond your Claude plan, unless you want Granola transcripts (Granola Business, $14 per user per month) or Zoom cloud transcripts (a paid Zoom plan).
- **Privacy:** Anthropic says it doesn't train on Gmail, Calendar or Drive connector data, but on Free, Pro, Max and Ultra with model training on, anything copied into the chat can be used. Pasted threads count. Check Settings, then Privacy, "Help Improve our AI models" (https://support.claude.com/en/articles/10166901-use-google-workspace-connectors; https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings).
- **Recording meetings:** consent rules for recording differ by state. Tell people you're recording, and confirm your state's rule with your broker.

## Run, Draft, Own

- **Run:** Claude reads your inbox, sent mail, calendar and meeting transcripts, sorts every thread, pulls commitments with owners and dates, checks your sent mail for promises, and flags money emails.
- **Draft:** every reply, forward, follow-up, recap and fraud alert, for you to read first.
- **Own:** you make every decision, send every message, and handle anything touching wire or banking details, money approvals, and any decision about a person.

## FAQs

1. **Will it send anything?** No. It reads, and it drafts. If you ask, it can put drafts in Gmail or Outlook (when your connector allows), and it still won't send them.
2. **What happens with a wire instructions email?** It goes to the top as High Risk, with the red flags and "verify by phone with title at a number you already have." The skill never replies to it, forwards it or repeats its numbers. It drafts an alert for your transactions team and a short heads-up your agent can send the client. It treats an emailed change to an agent's commission deposit the same way.
3. **Does it work with nothing connected?** Yes. Paste threads, or attach PDFs and transcripts (up to 20 files in a chat). You get the same output; the drafts stay in the chat.
4. **How does it know where it left off?** Every pass ends with a "Covered through" time. Run it in a Claude Project and the next pass picks up from there, or just say "since yesterday at 7."
5. **Can it put tasks in ClickUp or Asana?** Only if that connector is connected and you ask. It searches for the same work first and updates instead of duplicating.

## Practice Prompt

Attach all four practice files (`PRACTICE Inbox Export (40 conversations).txt`, `PRACTICE Leadership Huddle 2026-11-04 (Zoom transcript).txt`, `PRACTICE Listing Check-In 2026-11-04 (Otter transcript).txt`, `PRACTICE Team Roster.csv`) and say:

> Run my morning pass. Treat today as Thursday, November 5, 2026, 7:30 AM Mountain, and my last pass was yesterday at 7:30 AM. Nothing is connected; my inbox export, yesterday's two meeting transcripts and my roster are attached.

The sample output on the page is this run. One of the 40 emails is a fake wire instructions email; the sample shows how it's handled.

## Library Keywords

inbox, email triage, daily pass, morning routine, follow-up, follow-through, meeting notes, action items, commitments, delegation, team leader, Granola, Gmail, Outlook, Zoom transcript, wire fraud, Friday rollup, promises, accountability

## Why There's No ChatGPT Version

Built Claude only, as specified: the daily pass is designed around Claude's Gmail, Microsoft 365, Google Calendar and Granola connectors reading the inbox and meetings directly, with the "Covered through" handoff between passes. The pasted-thread mode would work in a ChatGPT Project; whether to add one is an open question.

## Tested and Not Tested

**Tested (2026-11-08, by running the skill as written on made-up files; see evals/runs/):**
- 40 email threads, no connector (eval 1): a lookalike-domain wire change, a commission deposit change from a personal address, a prompt-injection phishing email, lender conditions with personal financial details, one lead sent twice with a fair housing problem, an agent's schools and safety question, two unkept promises (one chased) and one kept, an overdue vendor quote. 16 of 16 checks after a review fix (below). A no-skill baseline on the same files passed 5 of 16: it repeated the fraudulent account number, suggested replying to the fraudster, treated the fake commission change as real and drafted a reply confirming it, repeated the lead's remark about neighbors, and missed a promise and the overdue quote.
- Two meeting transcripts (eval 2): Zoom with an "Unknown Speaker," Granola with only Microphone and System audio labels, and Granola AI notes that missed two commitments and named the wrong owner for a third; a date changed mid-meeting; an outside lender's commitment; two private matters. 12 of 12 checks.
- A Friday rollup from two earlier digests and pasted Outlook threads (eval 3). 12 of 12 checks, after a fix: items the leader wasn't copied on are now "no proof either way," not "slipped."
- The practice files: 13 of 13 checks after the same review fix. Every run passes the objective checks (no dashes, every number from the inputs, Title Case subjects, Check Before Sending, no wire or account details, no protected-class remarks, no forward of a lead's message that holds one, no banned phrases).
- Independent review (2026-11-08): a second reviewer ran eval 1 and the practice files from SKILL.md alone and got the same routing calls. It found that the builder's lead hand-offs forwarded the lead's own message, which would have carried the remark about neighbors to the ISA. The skill now writes a new note instead, and the check script catches a forward. It also renamed two made-up title companies and a made-up document service whose names matched real businesses.

**Collision check (by reading all 17 descriptions side by side, not with every skill installed):**
- Should land here: "Go through my inbox and tell me what needs me today," "Pull the action items from our leadership meeting transcript," "What did I tell people I'd send them this week that I still haven't?", "Friday rollup: what slipped this week?"
- Near-misses that should go to a sibling: "Here's the transcript of my listing appointment with the sellers; write the follow-up and the CRM note" (appointment-follow-up: one client appointment); "Block out my week so I actually get to my inbox" (perfect-week); "A recruit said yes to coffee Thursday; help me prep" (recruiting-prep). The description names all three siblings as the places to go instead (recruiting-prep was added on review), and each of them points back here.

**Not tested:**
- Live connectors: Gmail, Microsoft 365, Google Calendar and Granola were not connected to a test account. Search, paging through a large inbox, and reading full threads were written from the connector tool descriptions as loaded on 2026-11-08.
- Creating drafts in Gmail or Outlook, and the ClickUp and Asana task paths.
- Uploading .eml and .vtt files to claude.ai (the .txt rename is the fallback), and Gmail "Print all" PDFs.
- A team playbook skill installed alongside it (agent policy questions were tested only with no playbook, so they got a [policy answer] placeholder).
- Running day after day in a Claude Project, picking up from the last "Covered through" line.
