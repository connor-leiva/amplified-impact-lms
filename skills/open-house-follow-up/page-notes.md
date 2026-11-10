# Page Notes: Open House Follow-Up (/open-house-follow-up)

Skill: `open-house-follow-up`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: in the Amplified Skill Library (agent set). Every vendor fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Drop in your open house sign-in sheet and your notes, and get back a follow-up for every visitor and a recap for your sellers, with every visitor who has an agent held to a thank-you and texts only for the visitors who said yes to texts.

## Who It's For

Any agent who holds an open house: the listing agent, or a teammate or buyer's agent hosting someone else's listing. It works the same evening or a few days later, from any sign-in app's export, a Google Form, a typed list or a photo of a paper sheet. Works in Utah and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

Two things: the sign-in sheet and your notes. You don't retype anything the sheet already says.

- **Curb Hero (open house sign-in app):** open My Leads. Tap the filter icon at the top right to pick the listing. Tap the share icon at the top right and send the leads to yourself; they arrive as a CSV file. (Curb Hero Help Center, "Viewing, downloading and sharing lead data," checked 2026-11-10.)
- **Another sign-in app:** use its export or download for that listing's sign-ins (CSV or XLSX). Not checked app by app; column names vary, and the skill maps them.
- **A Google Form you use as a sign-in sheet:** open the form, select Responses, select the More icon, then "Download responses (.csv)." (Google Docs Editors Help, "View and manage form responses," checked 2026-11-10.)
- **A paper sign-in sheet:** take a clear photo of each page, flat, in good light, with every row in frame. Claude takes JPEG and PNG photos (Claude Help Center, "Uploading files to Claude," checked 2026-11-10). Not tested on real handwriting yet.
- **A typed list:** paste it into the chat: names, emails, phones, and whether each visitor has an agent or agreed to texts, if you know.
- **Your notes:** typed or dictated into your phone's notes app after the open house, pasted or attached. They are the only source for what visitors said, so the follow-ups are only as specific as the notes.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). (Claude Help Center, "Uploading files to Claude," checked 2026-11-10.)

**Texting, in one line:** only text visitors who checked a consent box that named you or your brokerage, or who told you yes and you have a record of it. A phone number on the sheet isn't consent. (Shared `outreach-rules.md`, checked 2026-11-08.)

## Install

**Claude:** as every skill page says it (D-052): download `open-house-follow-up.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the updated layout). (Claude Help Center, checked 2026-11-08 for the other skill pages.) No connectors needed.

**ChatGPT:** download `open-house-follow-up-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026. (OpenAI Help Center, as checked 2026-11-08 for the other skill pages.)

## Things to Say

- "Here's my open house sign-in export and my notes. Write my follow-ups and the seller update."
- "Saturday's open house. I typed up the sign-in sheet below. Do the follow-ups and a quick update for my sellers."
- "I held this open house for my teammate's listing. Write the update to the listing agent."
- "Photo of my sign-in sheet and my notes attached." (not tested on a real handwritten sheet)
- "Just the seller update, please."

## What Comes Back

Flags first, when they apply: how the columns were read, every visitor who has an agent (thank-you only), who can get a text and why the rest can't, visitors with no draft and why, duplicate sign-ins, placeholders, promises already due when you run it a day or more later, a teammate's listing, your own price opinion left out of the update, general mode outside Utah, and a line saying something was left out on purpose. Then a three-sentence bottom line; an agent-only visitor list (agent status, text consent, drafts, timeframe, what your notes say about the home); one section per visitor with an email under 120 words, a Title Case subject and an opt-out footer, plus a text with its consent source for visitors who said yes to texts; the seller update (or a Listing Agent Update when it's a teammate's listing) under 200 words, with the count from the sheet, what visitors liked and questioned, and no names; dated next steps; and a "Check before sending" list of every date, count, name, promise and quoted comment, with where it came from.

## What It Will Not Do

- Send, text or post anything, or write to your CRM.
- Offer to help, meet or represent a visitor who said they have an agent, or ask about their agreement. Their questions go through their agent.
- Text a visitor because their phone number is on the sheet.
- Describe a visitor, write who the home suits, or repeat a remark about who lives in the area. Schools and safety get official sources.
- Recommend a price or a price change to your sellers, or pass on your own price opinion. A visitor's comment on the price goes in as feedback only.
- Name visitors or share their contact details in the seller update.
- Invent what a visitor said, liked or asked.
- Rebuild your sign-in app's automatic thank-you or your CRM's action plans.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on every plan; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors.
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit.
- **The sign-in sheet and your notes.** Any sign-in app, a Google Form, a typed list or a photo.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer. Exporting a CSV and attaching it is easiest on a computer; a photo of a paper sheet works from a phone.
- **Cost:** nothing beyond your plans and the sign-in app you already use.
- **Privacy:** the sheet holds visitors' names, emails and phone numbers. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls > "Improve the model for everyone"), as every skill page says.

## Run / Draft / Own

- **Run:** reads every row and note, merges duplicate sign-ins, sorts each visitor by agent status and texting consent, counts for the update, and turns "Tuesday" into a date.
- **Draft:** every visitor email and text and the seller update, for you to read first.
- **Own (you):** who gets a text and the consent records, whether to contact a visitor who has an agent at all, every price conversation with your sellers, the fair housing review, and the Do Not Call scrub.

## FAQs

- **My sign-in app already sends an automatic thank-you text. Why this?** That text is the same for everyone. This writes a personal follow-up for each visitor from your notes, keeps visitors with an agent to a thank-you, checks text consent visitor by visitor, and writes the seller update. If your app already texted everyone, skip the texts here and send the emails.
- **Why does a visitor with an agent only get a thank-you?** The REALTOR Code of Ethics (Article 16) bars soliciting another agent's client, and its Standards of Practice route dealings with that client through their agent. Utah's licensing rules also bar trying to take on a client you know is already represented. So the AI thanks them and sends their questions to their agent. Questions go to your broker.
- **Can I text everyone who left a phone number?** No. Marketing texts need the person's consent, and a number on a sign-in sheet isn't consent. A checked consent box whose wording named you or your brokerage counts, or a yes you can show. Everyone else gets an email. Every text ends with "Reply STOP to opt out."
- **Why won't it write "perfect for a young family"?** Federal and Utah fair housing law bar statements that show a preference about who should live in a home. The AI describes the home and leaves out how your notes describe visitors.
- **Does it work outside Utah?** Yes, in general mode: the represented-visitor rule, fair housing and federal texting rules still apply, and it tells you your state's rules weren't checked. The Utah notes (the licensing rule and Utah's Sunday and holiday limits on solicitation calls) switch on only for a Utah open house.

## Practice Prompt

Attach both practice files from `open-house-follow-up-practice.zip` and say: **"Here's the sign-in export and my notes from my open house. I'm Riley Sampleton with Example Peak Realty, the listing agent. Write my follow-ups and the seller update."** The sample on this page is what came back on Tuesday, November 10, 2026, two days after the made-up open house, so it says "on Sunday" and flags the promises already due. Run on another day, those flags change with the date.

## Suggested Library Keywords

open house, open house follow-up, open house sign-in sheet, sign in sheet, sign-in export, Curb Hero, Google Form, visitor follow-up, thank-you email, open house feedback, seller update, listing agent update, represented buyer, buyer's agent, text consent, TCPA, Reply STOP, fair housing, same-day follow-up

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run, a Sunday open house in Sandy, Utah, from a sign-in app export (11 sign-ins, 10 visitors) and the agent's notes, run two days later: 13 of 13 checks. Two visitors with agents got thank-yous only, one question routed to the buyer's agent; texts went only to the three visitors who consented and had a phone number; a phone-only visitor got no draft; notes describing visitors and who the home suits, and a question about who lives nearby, were left out; the agent's "drop to 589" note stayed out of the seller update; the counts matched the sheet.
- Eval 1, a twilight open house in Mesa, Arizona (general mode), from a Google Form export, hosted for a teammate's listing: 12 of 12 after one fix (the update ran 203 words and was tightened to 194). It read the long consent sentence as the consent column, held a visitor whose "agent is my cousin, nothing signed" to a thank-you, wrote the update to the listing agent instead of the sellers, kept a remark about who is moving in out of everything, and gave the 8 PM send window.
- Eval 2, a typed list from a Saturday open house in Lehi, Utah, with one represented visitor and no texting consent recorded, run three days later: 9 of 9. No texts at all, a thank-you only for the represented visitor with the HOA question routed to their agent, no draft for a phone-only visitor, and counts that match the sheet.
- Objective checks on every run: no em or en dashes, Title Case subjects, email bodies under 120 words with the opt-out footer, texts only for consented visitors and 320 characters or fewer with "Reply STOP to opt out.", no solicitation words in a represented visitor's draft, no visitor names in the update, every number in the inputs or marked as a resolved date.

**Not tested:**
- A photo of a real handwritten sign-in sheet, and a multi-page sheet.
- Real exports from Curb Hero or any other sign-in app (the practice export follows the columns these apps commonly ask; Curb Hero's help center doesn't list its CSV columns), and an XLSX export.
- More than 12 visitors. A 40-visitor open house makes a long answer; asking for it in two halves may be needed.
- The ChatGPT Project in ChatGPT itself; its instructions match the skill step for step.
- A visitor who wrote "do not contact" on the sheet, and a voice profile QUICK CARD (no case had one).
- The description against every skill installed at once. It names appointment-follow-up, speed-to-lead-reply, sphere-touch-plan and seller-listing-update as the siblings; the last three are being built at the same time.
- No no-skill baseline was run.

## Sources

- Curb Hero Help Center, "Viewing, downloading and sharing lead data" (checked 2026-11-10): https://intercom.help/block-party/en/articles/2849017-viewing-downloading-and-sharing-lead-data
- Curb Hero Help Center, "Getting started with the top rated digital open house sign in" (checked 2026-11-10): https://intercom.help/block-party/en/articles/2944795-getting-started-with-the-top-rated-digital-open-house-sign-in
- Google Docs Editors Help, "View and manage form responses" (checked 2026-11-10): https://support.google.com/docs/answer/139706
- Claude Help Center, "Uploading files to Claude" (checked 2026-11-10): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- NAR Code of Ethics, Article 16, effective January 1, 2026 (checked 2026-11-10): https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/the-code-of-ethics-article-16
- Utah Admin. Code R162-2f-401b (checked 2026-11-10): https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401b
- Utah Code 13-25a-103 (checked 2026-11-10): https://le.utah.gov/xcode/Title13/Chapter25A/C13-25a-S103_2022050420220504.html
- Fair housing: 42 U.S.C. 3604 (https://www.law.cornell.edu/uscode/text/42/3604) and Utah Code 57-21-5 (https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html), checked 2026-11-10
- Texting and email rules: the shared `outreach-rules.md` (TCPA, the FCC's rules and CAN-SPAM, checked 2026-11-08)
- Install steps, plans and training switches: as on the other skill pages (`skill-page.ts`, D-052), checked 2026-11-08
