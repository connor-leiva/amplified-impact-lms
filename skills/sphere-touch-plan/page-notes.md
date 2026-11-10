# Page Notes: Sphere Touch Plan (/sphere-touch-plan)

Skill: `sphere-touch-plan`, version 1.0. Works in Claude (skill) and ChatGPT (Project). A paid skill: it is in the Amplified Skill Library (agent set), so its page shows the hero and the sample with the Skill Library card (D-082). Facts checked 2026-11-08 and 2026-11-10; sources at the end and in the skill's references.

## One-Line Promise

Upload your sphere or past client list, and get a year of touches by tier plus this week's texts, emails and call notes, each one tied to something real in your list.

## Who It's For

Any agent who wants to stay in touch with past clients and their sphere without writing "just checking in" forty times. Built for Follow Up Boss (People export) and works with another CRM's contact export or a plain spreadsheet. Works anywhere; the calling and texting rules it uses are federal, plus three states, and it says when your state's rules weren't checked.

## What to Upload, and Where It Comes From

1. **Your contact list (required).**
   - **Follow Up Boss:** People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once. Exporting never changes your contacts. Source: Follow Up Boss help center, "Export Contacts to a Spreadsheet" (updated 2026-04-21, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
   - **Who can export:** the Account Owner, plus anyone the owner gave Can Export (Admin > Teams; only the owner can grant it). The owner gets an email whenever someone exports. On a team without Can Export, ask your owner for the file of your contacts. Source: "Users, Roles & Permissions" (updated 2025-09-25, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
   - **Tip, before you export:** turn on the Last Communication column (People, then Columns in the upper right). Follow Up Boss doesn't say whether it comes through with Export All Columns; without it, the skill picks in file order and says so. Source: "Filtering contacts" (updated 2026-07-22, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360018863574-Filtering-contacts
   - **What makes it work best:** a closing date for past clients (Deal Close Date, or a Home Anniversary custom field), notes, tags for your tiers (such as Past Client, Sphere A, Sphere B), and a Text Consent custom field or tag. Follow Up Boss has no consent column of its own.
   - **Another CRM:** export every contact with every column your CRM allows. Those click paths weren't checked; see your CRM's help center.
   - **A spreadsheet:** a CSV or Excel file with names, emails, phones, how you know each person, closing dates and notes. Download a Google Sheet with File > Download > Comma-separated values (.csv) (not checked for this page; a common path).
2. **Your own cadence and tiers (optional):** say them in the chat ("past clients every month, my A list every other month"). Without them, the skill uses a labeled default.
3. **Who said yes to texts (optional):** if someone agreed to texts in writing and it isn't in the list, say so in the chat ("Hank emailed me saying texting is fine"). Keep that written record.

## Things to Say

1. "Here's my Follow Up Boss export. Build my 12-month touch plan and draft this week's touches."
2. "Who in my sphere should I reach out to this week, and what should I say?"
3. "Here's my past client spreadsheet. Any home anniversaries coming up?"
4. "Hank told me by email that texting is fine. Text him this week."
5. "Just this week's texts, please."

## What Comes Back

- Flags first: who can't be texted and why, consent values that don't count (a verbal yes) or need a check (an open house sign-in), clients in their first year after closing (sent to Post-Closing Client Care), anyone who opted out of everything, and a line that health, money or family details in your notes were left out on purpose.
- A three-sentence bottom line.
- What it used: the columns it read, today's date and this week's window, the tiers and counts.
- Your 12-month touch plan: a table of the next 12 months by tier (Past Clients, Close Sphere, Wider Sphere), with the kind of touch each month (a personal check-in, a handwritten note, a call, a home value review offer), touches a year per tier, and closing anniversaries by month.
- This week's touches: who, why now (the anniversary, a dated note, or who you've gone longest without talking to), which channel and why, and the day to send, with the math that spreads each tier over the month.
- The drafts: texts only for people with a written yes, emails for everyone else, and call notes for people with only a phone number. Each one mentions something real from your list.
- Not this week: who's later this month, who's done, who's in their first year.
- What to set up in Follow Up Boss so it does the reminding: a Text Consent field, a Smart List per tier, a yearly Home Anniversary date with an automation that starts a task for you, and an action plan of tasks per tier. You or your admin set these up; the skill changes nothing.
- A Check Before Sending list: every anniversary date and where it came from, every fact a draft mentions and its note date, the consent record for each text, the Do Not Call scrub, quiet hours, the unsubscribe link and postal address, and state rules.

## What It Won't Do

- Send, schedule or post anything, or change your CRM: no tags, stages, notes or action plans. You send each message by hand and set up Follow Up Boss yourself.
- Text anyone without a written yes in your list or your own word in the chat. A phone number isn't consent.
- Mention a health problem, money (a refinance, a layoff, a price), a divorce, a baby or anything else about family status from your notes, even when the notes say it.
- Invent a birthday, an anniversary, a kid, a pet or a hobby your list doesn't name.
- Put numbers on home values or the market.
- Clean up or audit your CRM (use Database Health Check), follow up on one appointment (Appointment Follow-Up), work open house visitors (Open House Follow-Up) or handle the first year after a closing (Post-Closing Client Care).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so Free is unconfirmed. Code execution: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the newer settings). Sources: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08). No connector needed.
- **ChatGPT version:** a ChatGPT Project with the four files. Projects are on Free, Go, Plus and Pro. A big export needs data analysis, which Free has only as "Limited" (https://chatgpt.com/pricing).
- **A list:** a Follow Up Boss export (Account Owner or Can Export), another CRM's export, or a spreadsheet.
- **Cost:** in the Amplified Skill Library; nothing beyond that and your AI plan.
- **Computer:** Follow Up Boss saves the export as a CSV on your computer, so a computer is the easy way to get the file and attach it.
- **Privacy:** your list holds names, phone numbers and notes. Turn off model training first: Claude, Settings > Privacy, "Help Improve our AI models" (https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings); ChatGPT, Settings > Data controls, "Improve the model for everyone."

## Run, Draft, Own

- **Run:** reads the list, sorts it into tiers, finds anniversaries and dated follow-ups, picks this week's contacts and works out who can get a text.
- **Draft:** the 12-month plan, the Follow Up Boss setup steps, and this week's texts, emails, call notes and card text, for you to read, change and send.
- **Own (you):** who's in which tier, every consent record and the Do Not Call scrub, setting up Follow Up Boss, what each person hears and when, and any personal detail you add.

## FAQs

**Follow Up Boss already has action plans. Why this?** Follow Up Boss reminds you when a date comes around; it doesn't decide who's due this week or write a message that mentions the pottery studio from February. The skill tells you what to set up in Follow Up Boss so it does the reminding (a yearly Home Anniversary date with an automation, Smart Lists, action plans of tasks), and it does the part Follow Up Boss can't: picking and drafting.

**Why didn't it write a text to everyone?** Texts go only to people your list shows agreed to texts in writing, or that you say agreed. That follows the federal texting rules (TCPA) and Follow Up Boss's own compliance page, which says texting is for one-to-one conversations with people who expect to hear from you. Everyone else gets an email or a call note. Add a Text Consent field from your signed records and the next run drafts texts for those people.

**Why did it leave out what I wrote in my notes?** Notes about health, money or family (a surgery, a refinance, a divorce, a baby) stay out of every draft. A message that mentions them can land badly, and some are protected under fair housing law. The skill counts them in one line so you can read them yourself and decide what to say in person.

**Does it work with a spreadsheet?** Yes. It reads your columns by name. Without a consent column it writes emails only and tells you how to add one; without a last-touch column it picks in the order of your sheet.

**What about my state's rules?** The texting, calling and email rules it uses are federal, plus Florida, Maryland and Oklahoma. It says when your state's rules weren't checked, Utah's included. Ask your broker.

**Why is it stricter than the law?** A few rules are our conservative defaults, stricter than the law in places: every email carries the full footer (the opt-out, your postal address and a line saying it's a marketing email), even a personal note to a past client; no call or voicemail on a Sunday or a federal legal holiday; and a yes that names only a portal, a lead company or "real estate professionals" gets no text until your broker confirms it covers you. You can calibrate them with your own legal counsel: tell the AI the rule your counsel approved, and it follows that and says so in Check Before Sending.

## Practice Prompt

With PRACTICE-followupboss-people-export.csv attached: "Here's my Follow Up Boss export. I'm Rowan Mockford with Pretend Peak Realty. Build my 12-month touch plan and draft this week's touches." The practice file is dated for Tuesday, November 10, 2026; the sample on this page is what came back that day. On a later date the week, the anniversaries due and the picks change.

## Suggested Library Keywords

sphere of influence, sphere, soi, past clients, past client follow up, stay in touch, touch plan, 12 month touch plan, 33 touch, database nurture, home anniversary, closing anniversary, client care, follow up boss, fub, smart list, action plan, text consent, tcpa, do not call, personal notes, check-in, referrals

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run, the practice Follow Up Boss export (34 contacts): 12 of 12 checks after one fix. Five closing anniversaries found with their days and years, one of them a sale worded as a sale; texts only for the six with a written yes; a verbal yes, a STOP, a Do Not Text and a Do Not Call each moved to email; call notes for two people with no email; two first-year clients sent to Post-Closing Client Care; six notes with health, money or family details kept out.
- Eval 1, the same export with a voice QUICK CARD and a yes to texts given in chat: 14 of 14 after one fix. The texts went to seven people, including the one the agent vouched for, with a line to keep that record; the drafts followed the card's sign-off and its no-exclamation-points rule.
- Eval 2, a 12-person Google Sheets list with no consent column, where the agent asked for texts: 11 of 11 on the first run. No texts at all, the reason, how to add a consent column, seven emails, and a check-in "after Thanksgiving" held for later in the month.
- The fix, now in the skill: never join two facts into one the note doesn't make (a note saying "grows dahlias; won a ribbon" became "your ribbon-winning dahlias" in the first draft).
- The tiers, picks and share math in every run match a code version of the rules (`evals/make/expected_picks.py`).

**Not tested:**
- A real Follow Up Boss "Export All Columns" file: whether Last Communication, Home Anniversary and a Text Consent custom field come through, and in what date format.
- Another CRM's real export, an Excel file, and lists of hundreds of contacts.
- The ChatGPT Project inside ChatGPT; its instructions match the Claude skill step for step.
- The Follow Up Boss setup steps in a live account (they come from the help center, partly through search excerpts).
- A no-skill baseline.
- The description against every other skill installed at once. It names database-health-check, appointment-follow-up, open-house-follow-up and post-closing-client-care as the siblings to use instead.

## Sources

- Follow Up Boss, Export Contacts to a Spreadsheet (2026-04-21, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Follow Up Boss, Users, Roles & Permissions (2025-09-25, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- Follow Up Boss, Filtering contacts (2026-07-22, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360018863574-Filtering-contacts
- Follow Up Boss, Calling and Texting Compliance (2025-07-18, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance
- Follow Up Boss, Automations Triggered by a Date (checked 2026-11-10 through search excerpts): https://help.followupboss.com/hc/en-us/articles/12662110564503-Automations-Triggered-by-a-Date
- Follow Up Boss, Never Miss a Birthday or Anniversary (checked 2026-11-10 through search excerpts): https://help.followupboss.com/hc/en-us/articles/360025684874-Never-Miss-a-Birthday-or-Anniversary
- The rest of the Follow Up Boss facts: `references/fub-setup.md`. Texting, calling and email rules: `references/outreach-rules.md` (shared, last verified 2026-11-08).
- Claude skills and code execution: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- ChatGPT Projects and plans: https://help.openai.com/en/articles/10169521-projects-in-chatgpt and https://chatgpt.com/pricing
- help.followupboss.com and help.openai.com block direct reads; those facts come from search excerpts or Amplified's vendor check of 2026-11-08.
