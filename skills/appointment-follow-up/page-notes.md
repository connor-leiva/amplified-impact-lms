# Page Notes: Appointment Follow-Up (/appointment-follow-up)

Skill: `appointment-follow-up`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Every fact below was checked on 2026-11-08; sources are at the end and in the skill's references.

## One-Line Promise

Drop in the transcript from tonight's buyer consult or listing appointment, and get back the recap email, a paste-ready Follow Up Boss note, and next steps with real dates.

## Who It's For

Any agent, buyer side or listing side, after one client appointment: a buyer consultation, a listing appointment, a pre-listing walkthrough, or a follow-up meeting, whether it happened at a kitchen table, over coffee, on Zoom or on the phone. Follow Up Boss already summarizes calls made through its own calling; this is for the appointments it never hears. Works in Utah and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

The transcript is the input. Upload it as a file or paste it into the chat. You don't need to retype anything it already says.

- **Granola, desktop app (Mac or Windows):** open the meeting note, click the transcript button (the waveform bars to the left of the "Ask anything" bar; close Chat first if it's open), then click the copy icon at the top right of the transcript panel. Paste it into the chat. On a Zoom or phone call, your side shows as "Me" and everyone else as "Them"; at a kitchen table, nearly everything shows as "Me," and the skill sorts out who said what. (Granola Help Center, "How transcription works" and "Speaker tags," checked 2026-11-08.)
- **Granola, phone app (iPhone or Android), for in-person appointments:** open the note, tap the three dots (...) at the top right, then View transcript, and share it from there. Speakers show as Speaker A, Speaker B. The phone apps are free. (Granola Help Center, "How transcription works on mobile" and "Subscriptions and billing," checked 2026-11-08.)
- **Granola connector in Claude (optional):** instead of copying, say "follow up on my appointment with [client]" and Claude reads the meeting. Reading the transcript this way needs a paid Granola plan (Business is $14 per user per month); on the free Basic plan, Claude gets notes from the last 30 days but not the transcript. (Granola Help Center, "Granola MCP," checked 2026-11-08.)
- **Zoom cloud recording:** in the Zoom web portal, go to Recordings & Transcripts > Cloud recordings > the meeting, and download the audio transcript (a .vtt file). It needs a Pro, Business, Education or Enterprise account with cloud recording and audio transcription turned on before the meeting. Claude's list of supported uploads names TXT but not VTT, so if the file won't upload, open it in any text editor and paste the text into the chat. (Zoom Support, "Using audio transcription for cloud recordings," and Claude Help Center, "Upload files to Claude," checked 2026-11-08.)
- **iPhone call recording, for phone appointments:** works on a call with one other person. During the call in the Phone app, tap the more button, then Call Recording. Both of you hear an announcement that the call is being recorded. Afterward, open Notes > Call Recordings, tap the note, tap the recording, then Copy Transcript. Not available in every country or language. (Apple Support, "Record and transcribe a call on iPhone," checked 2026-11-08.)
- **iPhone Voice Memos, for in-person appointments:** open the recording, tap the more button, then Copy Transcript. (Apple Support, "View a transcription," checked 2026-11-08.)
- **Your own notes:** paste them in. The follow-up is only as complete as the notes.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the file, and click "Open" (or drag it into the chat). (Claude Help Center, "Uploading files to Claude," checked 2026-11-08.)

**Recording, in one line:** Utah lets you record a conversation you're part of (one-party consent, Utah Code 77-23a-4), but some states, such as Washington, require everyone's consent, so when anyone on the call is in another state, ask everyone first; with questions, ask your broker.

## Install

**Claude:** download `appointment-follow-up.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. (Claude Help Center, "Use skills in Claude," checked 2026-11-08.) Code execution has to be on: Settings > Capabilities > "Code execution and file creation" (called "Create and edit files" in the updated layout). It's on by default for Free, Pro, Max and Ultra. On Team and Enterprise, an Owner turns on skills and code execution for the organization. To use Granola directly, connect it once: Customize > Connectors, click "+", and find Granola. (Claude Help Center, "Use connectors to extend Claude's capabilities," checked 2026-11-08.)

**ChatGPT:** download `appointment-follow-up-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. (OpenAI Help Center, "Projects in ChatGPT," and OpenAI's Projects docs, checked 2026-11-08.) This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026. The ChatGPT version works from pasted or uploaded transcripts.

## Things to Say

- "Here's tonight's buyer consult. Write my follow-up."
- "Recap my listing appointment with the Samplesons and give me the FUB note." (Claude with the Granola connector: no upload needed.)
- "They want to list higher than I recommended. Write a recap that keeps the price question open."
- "Zoom transcript attached. They're relocating from out of state."
- "Just the FUB note, please."
- "Make the email a Gmail draft." (Claude, only with the Gmail connector on)

## What Comes Back

Flags first, when they apply: a buyer consult with no signed buyer agreement and a tour coming up (with the date to get it signed by), a preapproval that's still pending, a promise from the appointment that's already due when you ask the next day, speakers the transcript couldn't tell apart, general mode outside Utah, a recording note when someone was in another state, and a line saying something was left out on purpose. Then a three-sentence bottom line; what it heard (priorities in the client's words, motivation, timeline, concerns, prices exactly as each person said them, every promise on both sides, with timestamps); a recap email under 200 words in your voice, with a Title Case subject and a "[Personal note: add by voice]" line; a two-sentence text when a client asked to be texted; a Follow Up Boss note with a suggested Timeframe to Move; next steps with weekdays and dates; a couple of personal-note ideas; and a "Check before sending" list of every date, price, name and promise, with where it came from.

## What It Will Not Do

- Send, text or post anything, or write to your CRM. You paste the note into Follow Up Boss yourself (the note box on the contact, then Create Note).
- Repeat a remark about who lives in a neighborhood, rule out an area for that reason, or give an opinion on schools or safety. It points to official sources.
- Write down loan balances, credit scores, income, debts, sale proceeds or health details.
- Suggest a list price or split the difference between your number and the seller's. It records each price as it was said.
- Draft or explain the terms of your buyer agreement or state a compensation figure that wasn't said.
- Rebuild Follow Up Boss's own call summaries.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors needed. Optional: the Granola connector (any Claude plan per its listing; the transcript needs a paid Granola plan) and the Gmail connector to save the email as a draft (the Help Center lists Google Workspace connectors for all users; Claude's docs list Gmail on Pro and up).
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit. A 30-minute transcript pasted as text fits comfortably.
- **A transcript source:** Granola (desktop or phone; transcripts through the connector need Business at $14 per user per month), Zoom Pro or higher with cloud recording, or an iPhone with call recording or Voice Memos transcripts where Apple offers them.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer; after that it works in chat on the web, desktop and phone apps too (Claude docs, "Extend Claude" and "How to use skills," checked 2026-11-08). Copying a Granola desktop transcript or a Zoom .vtt file is easiest on a computer.
- **Cost:** nothing beyond your plans.
- **Privacy:** transcripts hold your clients' names and personal details. Consider turning off training first. Claude: Settings > Privacy > "Help Improve our AI models" (Free, Pro, Max and Ultra; Team and Enterprise chats aren't used for training by default) (Claude Privacy Center, checked 2026-11-08). ChatGPT: Settings > Data controls > "Improve the model for everyone" (OpenAI Help Center, "Data Controls FAQ," checked 2026-11-08). Granola desktop: click your workspace name at the bottom left, then Settings > Preferences > "Use my data to improve models for everyone"; the Android app doesn't have this switch yet (Granola Help Center, "Models and training," checked 2026-11-08).

## Run / Draft / Own

- **Run:** reads the whole transcript, works out who said what, turns "next Saturday" into a date, and checks for a buyer agreement and preapproval.
- **Draft:** the recap email, the text, the Follow Up Boss note and the next steps, for you to read and edit first.
- **Own (you):** every price and money decision, the buyer agreement and its terms, whether to text a client, what goes into your CRM, and any fair housing judgment.

## FAQs

- **Granola already drafts follow-up emails. Why this?** Granola's follow-up emails (paid plans, Gmail only) are general purpose. This one is built for real estate: it flags a missing buyer agreement before a tour, keeps prices exactly as each person said them, writes the Follow Up Boss note with a Timeframe to Move, keeps fair housing remarks and loan balances out of your records, and lists everything to check before you send.
- **My transcript just says "Me" and "Them" (or "Speaker A").** That's normal. Two people on one laptop share a label, and an in-person meeting recorded on a laptop puts everyone on "Me." The skill works out who said what from context and tells you when it can't, especially for prices and promises.
- **Does it work outside Utah?** Yes. It runs in general mode: the buyer agreement check follows NAR's policy and your broker, and it says state rules weren't checked. The Utah notes (UAR buyer agreement forms, Utah's recording rule) switch on only for a Utah appointment.
- **Why won't it put the client's comment about the neighborhood in my notes?** Your notes and emails are your own written statements, and a CRM note is a lasting record your team can read. Federal and Utah fair housing law both reach statements that express a preference based on protected classes, so the skill keeps your record to property features and tells you, without repeating it, that it left a remark out. Fair housing questions go to your broker.
- **Is it okay to record my appointments?** In Utah, you can record a conversation you're part of. Some states require everyone's consent, so when anyone's in another state, ask everyone first. The skill notes where the transcript shows you asked. Questions go to your broker.

## Practice Prompt

Attach the practice transcript from `appointment-follow-up-practice.zip` and say: **"This is my buyer consult with Morgan and Casey Testwood from tonight. I'm Riley Sampleton. Write my follow-up."** The sample on this page is what came back.

## Suggested Library Keywords

appointment follow-up, buyer consultation, buyer consult, listing appointment, recap email, thank-you email, follow-up email, Follow Up Boss note, FUB, CRM note, Granola, Zoom transcript, call recording, Voice Memos, transcript, next steps, buyer agreement, preapproval, Timeframe to Move, fair housing, voice profile

## Tested and Not Tested

**Origin:** the skill started from Connor's own listing appointment follow-up skill. His voice, name and sign-off were replaced with the user's voice profile and name; nothing of his ships.

**Tested (2026-11-08), with made-up transcripts:**
- Practice run, a move-up buyer consult on Zoom recorded in Granola (both buyers on one laptop): 12 of 12 checks. It flagged the unsigned buyer agreement before Saturday's tour, kept the preapproval amount out of the email, left out a family member's health detail and the townhome balance, sorted texts for Casey and email for Morgan, and caught that the DocuSign email will go to the buyer who said "I never check email."
- Eval 1, a first-time buyer over coffee on Granola for iPhone, preapproval pending, buyer agreement never mentioned: 9 of 9 after one fix. It caught a line Granola labeled with the wrong speaker.
- Eval 2, a listing appointment in Mesa, Arizona (general mode) recorded at the kitchen table, sellers wanting $575,000 against a $539,900 recommendation, with a voice QUICK CARD: 10 of 10 after one fix. It kept each price with who said it, never proposed a number, and left out the loan balance.
- Eval 3, a Zoom relocation consult from Washington with a remark about who lives in a neighborhood and a schools question: 11 of 11 after one fix. A no-skill answer to the same prompt passed 2 of 11: it put a paraphrase of the remark, tied to the neighborhood's name, into the CRM note, recorded the down payment amount, missed the buyer agreement deadline before the video tour and the recording question, and broke the email rules.
- The fixes, now in the skill: every day named in an email carries its date; client texts stay two sentences on the next step, with any email heads-up moved to Next Steps; clients are called by name, never an assumed he or she.
- Independent review (2026-11-08): a second reviewer reran Eval 3 and the practice file from scratch and got the same results (12 of 12 each). It found that no run could meet the note's old 150-word limit (runs came in at 201 to 263 words), so the Follow Up Boss note is now "about 200 words or fewer" and checked; and that a follow-up written the next day needed a rule, so promises due "tonight" or "today" are now flagged to confirm, and the email names the appointment day instead of "yesterday." Evals 1 and 3 each gained a check for it, and both pass.

**Not tested:**
- Real transcripts from Utah Life agents (waiting on redacted copies from Connor), real Granola copy-paste output (the practice file follows the connector's labels: Microphone and System audio), and Otter or Fathom exports.
- The Granola connector reading a live meeting, and creating a Gmail draft.
- The ChatGPT Project in ChatGPT itself; its instructions match the Claude skill step for step.
- Transcripts over an hour long, and appointments in a language other than English.
- The description against all 17 skills installed at once. It names pricing-conversation-prep, recruiting-prep and inbox-meeting-follow-through as the siblings to use instead.

## Sources (all checked 2026-11-08)

- Granola, How transcription works: https://docs.granola.ai/help-center/taking-notes/transcription
- Granola, Speaker tags: https://docs.granola.ai/help-center/taking-notes/speaker-attribution
- Granola, How transcription works on mobile: https://docs.granola.ai/help-center/ios/transcription
- Granola, MCP (plans and transcript access): https://docs.granola.ai/help-center/sharing/integrations/mcp
- Granola, Subscriptions and billing: https://docs.granola.ai/help-center/managing-your-account/subscriptions-and-billing
- Granola, Follow-up emails: https://docs.granola.ai/help-center/taking-notes/follow-up-emails
- Granola, Exporting notes: https://docs.granola.ai/help-center/sharing/exporting-notes
- Granola, Models and training: https://docs.granola.ai/help-center/consent-security-privacy/model-training
- Granola, When to use AI notetaking (consent): https://docs.granola.ai/help-center/consent-security-privacy/getting-consent
- Zoom, Using audio transcription for cloud recordings: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064927
- Apple, Record and transcribe a call on iPhone: https://support.apple.com/guide/iphone/record-and-transcribe-a-call-iph57c6590e9/ios
- Apple, View a transcription (Voice Memos): https://support.apple.com/guide/iphone/view-a-transcription-iph00953a982/ios
- Follow Up Boss, Call Transcripts and Summaries: https://help.followupboss.com/hc/en-us/articles/23799926737687
- Follow Up Boss, Team Mentions (the note box and Create Note): https://help.followupboss.com/hc/en-us/articles/4402379946007
- Follow Up Boss, Timeframe to Move: https://help.followupboss.com/hc/en-us/articles/27096493859735
- Utah Code 77-23a-4 (recording): https://le.utah.gov/xcode/Title77/Chapter23A/77-23a-S4.html
- Washington RCW 9.73.030 (all-party consent example): https://app.leg.wa.gov/RCW/default.aspx?cite=9.73.030
- Fair housing: 42 U.S.C. 3604 (https://www.law.cornell.edu/uscode/text/42/3604) and Utah Code 57-21-5 (https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html)
- Buyer agreements: see the shared `buyer-agreements.md` (NAR MLS Policy Statement 8.13 and UAR forms)
- Claude file uploads: https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Claude skills, install path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Claude skills on each device (added on web or desktop, used on mobile too): https://claude.com/docs/extend/overview and https://claude.com/docs/skills/how-to
- Claude code execution setting and defaults: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude connectors: https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities and the Granola listing at https://claude.com/marketplace/connectors/granola
- Claude Google Workspace connectors: https://support.claude.com/en/articles/10166901-use-google-workspace-connectors and https://claude.com/docs/connectors/google/gmail
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Team and Enterprise not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects: https://help.openai.com/en/articles/10169521-projects-in-chatgpt and https://learn.chatgpt.com/docs/projects
- ChatGPT plans with Projects: https://chatgpt.com/pricing
- ChatGPT training setting: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- Custom GPT retirement: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- help.openai.com pages block direct fetching; their facts come from Amplified's vendor check of 2026-11-08.
