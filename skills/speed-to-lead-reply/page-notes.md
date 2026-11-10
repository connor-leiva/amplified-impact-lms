# Page Notes: Speed to Lead Reply (/speed-to-lead-reply)

Skill: `speed-to-lead-reply`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: in the Amplified Skill Library (agent set). Every vendor fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Paste in a new lead the second it lands, and get back a personal first reply you can send in two minutes: a text only if they agreed to texts, an email that answers what they actually asked, a call opener and voicemail, and two follow-ups.

## Who It's For

Any agent who gets online leads: from Follow Up Boss, Zillow, Realtor.com, their own website or a Facebook lead form. It works on one lead at a time, while the lead is still on their phone. Works in Utah and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

The lead, plus the listing if you have it. You don't retype anything the lead record already says.

- **Follow Up Boss new-lead notification:** copy the whole notification email (or the app alert) and paste it in, or take a screenshot. Not checked against Follow Up Boss's help center: the notification's layout varies by lead source.
- **The lead's profile in Follow Up Boss:** People > All People, then the lead's name. Copy the contact details, the inquiry, the tags, any custom fields (such as a Text Consent field) and the latest timeline entries, or take a screenshot. The timeline shows automatic texts and action plan emails that already went out. A phone number shown in orange means the lead texted STOP. (Follow Up Boss Help Center, "Export Contacts to a Spreadsheet" for the People path and "Texting Opt-in/Opt-Out" for the orange number, checked 2026-11-08 for database-health-check.)
- **A portal's lead email (Zillow, Realtor.com and others):** copy the whole email, including anything under the message, and paste it in. Not checked portal by portal. The portal's own consent wording usually isn't in the email.
- **Your website's registration:** the notification or profile, including the form's checkbox lines. The consent checkbox's exact wording is what decides whether a text gets drafted.
- **A Facebook lead form:** if your Facebook leads flow into Follow Up Boss, use that record. If not, Meta lets a Page admin download leads as a CSV from Meta Business Suite or Ads Manager (from third-party guides, not checked against Meta's help center). Include the form's disclaimer.
- **The listing:** your MLS printout or listing sheet as a PDF, or the listing pasted. Agent-only fields are fine to include; the AI keeps them out of the drafts.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). Claude takes JPEG and PNG screenshots. (Claude Help Center, "Uploading files to Claude," checked 2026-11-10 for open-house-follow-up.)

**Texting, in one line:** text only a lead whose record shows they agreed to texts from you or your brokerage, or who told you yes and you have the record. A phone number on a lead isn't consent. (Shared `outreach-rules.md`, checked 2026-11-08.)

## Install

**Claude:** as every skill page says it (D-052): download `speed-to-lead-reply.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the updated layout). (Claude Help Center, checked 2026-11-08 for the other skill pages.) No connectors needed.

**ChatGPT:** download `speed-to-lead-reply-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026. (OpenAI Help Center, as checked 2026-11-08 for the other skill pages.)

## Things to Say

- "New lead from my website. Listing sheet attached. Write my first reply."
- "Here's a Zillow lead. I don't have the listing sheet. What do I send?"
- "This lead came in at 9 PM. What can I send tonight?"
- "She told me on the phone she's fine with texts. Write the text." (the AI drafts it and asks you to keep the record)
- "Just the text, please."

## What Comes Back

Flags first, when they apply: channels that are closed (a STOP reply, Do Not Text, Do Not Call), consent that needs your broker's check, automatic messages that already went out and a running action plan (with the pause-or-let-it-run advice), a lead who has an agent, a lead outside the 8 AM to 8 PM window, a Utah Sunday or legal holiday, placeholders, general mode outside Utah, and a line saying something was left out on purpose. Then a two-sentence bottom line; the consent read (what the record says about texts, quoted, and what that allows); a first text only when consent is documented, with the consent quoted above it and "Reply STOP to opt out." at the end; a first email under 150 words that answers each question from the listing only; a call opener and a 20-second voicemail; day 1 and day 3 touches with dates, in the same channels; and a "Check before sending" list of every fact, date, promise and consent source.

## What It Will Not Do

- Send, text, call, schedule or post anything, or change Follow Up Boss: no tags, notes, stages or paused action plans. Pausing an action plan is your call, and you do it.
- Text a lead because their phone number is on the record, or text a number that replied STOP or is marked Do Not Text or Do Not Call.
- Say a home is available. It gives the status the listing shows and says you'll confirm.
- Give an opinion on schools, safety, the neighborhood or the neighbors. It points to the school district's boundary map, the state's school report card and the local police department's crime map, and offers to send the district map.
- Promise a showing. Any mention of a showing says a written buyer agreement comes first.
- Invent a feature, an HOA fee, a price opinion or urgency ("won't last"). A fact the listing doesn't show becomes "I'll find out."
- Solicit a lead who says they have an agent. They get a polite reply only.
- Mention website activity (views, saved searches), budget or financing, or anything the lead said about who will live in the home.
- Rebuild your action plans or Instant Response. It's the personal reply that sits alongside them.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on every plan; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors.
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit.
- **The lead,** pasted or as a screenshot, and the listing sheet if you have one.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer. After that it works from the Claude phone app too, which is where a new lead usually finds you: paste the notification or share a screenshot.
- **Cost:** nothing beyond your plans.
- **Privacy:** leads hold names, phone numbers and emails. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls > "Improve the model for everyone"), as every skill page says.

## Run / Draft / Own

- **Run:** reads the whole lead record and the listing, quotes what the record says about texts, sorts the lead, and works out the send times and the day 1 and day 3 dates.
- **Draft:** the text, the email, the call opener, the voicemail and the touches, for you to read and send.
- **Own (you):** whether to text at all and the consent records, the Do Not Call check, every price and availability answer, the buyer agreement, any change to Follow Up Boss (pausing an action plan), and the fair housing call.

## FAQs

- **Follow Up Boss already sends an automatic first message. How does this work alongside it?** The automatic message is the same for every lead; this answers what this lead asked, from the listing, with the consent read first. If your account uses Follow Up Boss's Instant Response for that lead source and you text first, Follow Up Boss skips its automatic first text, so the lead gets one first text, not two (Follow Up Boss Help Center, "Instant Response," from search excerpts). If it already went out, your text says you're writing personally. For an action plan that's running on the lead: pause it on the lead in Follow Up Boss so its drip emails don't land between your personal touches, or let it run and send this reply right after it. Your admin can also set action plans to pause automatically when a lead responds, which Follow Up Boss's help center recommends. The AI only advises: it never pauses or changes anything.
- **The lead gave me their phone number. Why no text?** Marketing texts need the person's consent, and a phone number isn't consent. A checked box or a consent line that covers texts and names you or your brokerage counts, or a yes you can show. Every text ends with "Reply STOP to opt out." A lead who replied STOP, or is marked Do Not Text or Do Not Call, never gets a text, even if an older form said yes.
- **Zillow (or another portal) says the buyer agreed to be contacted. Can I text them?** The portal's own consent wording usually isn't in the lead email, and it may name the portal or "real estate professionals" rather than you. Ask your broker whether it covers your texts. If it does, tell the AI, and it drafts the text.
- **They asked "Is it a safe area, and how are the schools?" Why won't it answer?** Federal and Utah fair housing law reach statements that show a preference about who lives in an area. So the AI gives no opinion, names no schools and points to public sources: the school district's boundary map, the state's school report card (in Utah, the Utah School Report Card) and the local police department's crime map. Fair housing questions go to your broker.
- **They asked to see it Saturday. Why doesn't it book the showing?** Since August 17, 2024, NAR's MLS policy has required a signed written agreement with a buyer before touring a home, in person or by live video. Answering their questions doesn't need one. So the reply offers to set it up and says the buyer agreement comes first. In Utah, the agreement usually is UAR's Exclusive Buyer-Broker Agreement and Agency Disclosure; confirm with your broker. Outside Utah, it says state rules weren't checked.

## Practice Prompt

Attach two practice files from `speed-to-lead-reply-practice.zip` (the website registration for Avery Testington and the listing sheet for 4120 S Placeholder Pines Ln) and say: **"Here's a new lead that just came in from my website, and the listing sheet for the home they asked about. I'm Riley Sampleton with Example Peak Realty. Write my first reply."** The sample on this page is what came back on Tuesday, November 10, 2026, the day the made-up lead came in, so day 1 is Wednesday, November 11, which is Veterans Day, a Utah legal holiday. Run on a later day, the AI flags that the lead came in earlier and dates the touches from your today, so your answer will differ from the sample. The other two practice leads (a portal inquiry with no consent line, and a Facebook lead who already has an agent) are there to try next.

## Suggested Library Keywords

speed to lead, new lead, lead reply, first reply, first response, online lead, internet lead, zillow lead, realtor.com lead, website lead, idx registration, facebook lead, lead form, follow up boss, fub, action plan, instant response, text consent, tcpa, reply stop, do not call, call script, voicemail script, lead follow-up, buyer agreement, fair housing, schools, is it available

## Tested and Not Tested

**Tested (2026-11-10), with made-up files, by an agent following the skill exactly:**
- Practice run, a website registration in Riverton, Utah with a checked consent box, a running action plan, and a listing sheet: 10 of 10 checks after two fixes (a 55-word voicemail cut to 48; a day 3 text and voicemail that mentioned Saturday's showing without the buyer agreement line). The text quotes the consent; the email answers the basement-entrance and fence questions from the listing only; the brother, the dog, the saved search's price range, the agent remarks and the school names stay out; Saturday's showing waits on a buyer agreement. It is `sample.md`.
- Eval 1, a website lead in Herriman, Utah at 7:05 AM with a Text Consent field, an automatic Lead Flow text already sent, and a listing sheet: 11 of 11. Text and call held to 8:00 AM; the HOA fee and the main-level bedroom answered from the listing with no word about the lead's mother or stairs; the day 1 call moved off Veterans Day because the consent covers texts only.
- Eval 2, a portal lead in Meridian, Idaho (general mode) with no consent line asking "is it still available, is it a safe area, and how are the schools?": 11 of 11 after one fix (the email named the topic as "safety"; it now says "your questions about the area," and the skill says so). No text anywhere; public sources only; no availability claim; tomorrow's showing waits on a buyer agreement.
- Eval 3, a returning lead in Ogden, Utah whose March consent line was overridden by an August STOP reply and a Do Not Call tag, where the agent asks for a text: 6 of 6. No text, no call, email only, and it says why; the gas line question gets "I'll find out" because the listing shows an electric range.
- Two extra runs on the other practice leads: the portal inquiry (6 of 6: no HOA fee invented, no price opinion, the holiday call moved) and the Facebook lead who has an agent (5 of 5: one polite email, no call, no touches).
- Objective checks on every run: no em or en dashes, Title Case subjects, texts only when consent is documented (320 characters or fewer, the sender, "Reply STOP to opt out."), no calls when calls are closed, voicemails 50 words or fewer, email length limits and footers, no availability claims, no opinion or protected-class words in the drafts, no website activity, and every number in the inputs or marked as a worked-out date.

**Not tested:**
- Real Follow Up Boss notifications and profiles, real Zillow, Realtor.com or Homes.com lead emails, and a real Facebook lead export. The practice files are realistic, not copies; their exact layouts were not checked.
- Screenshots of a lead (every run used pasted text), and a phone-only workflow.
- A CHECK FIRST consent line (a portal line naming "real estate professionals"), a seller lead asking for a home value, and a lead whose message is in a language other than English.
- A voice profile QUICK CARD (no case had one).
- The ChatGPT Project in ChatGPT itself; its instructions match the skill step for step.
- No no-skill baseline was run, and no second reviewer reran the cases.

## Sources

- Follow Up Boss Help Center, "Texting Opt-in/Opt-Out" (checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360022160813-Texting-Opt-in-Opt-Out
- Follow Up Boss Help Center, "Calling and Texting Compliance" (checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance
- Follow Up Boss Help Center, "Export Contacts to a Spreadsheet" (the People path, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Follow Up Boss Help Center, "Instant Response" (checked 2026-11-10 through search excerpts; the help center blocks direct reads): https://help.followupboss.com/hc/en-us/articles/360014173813-Instant-Response
- Follow Up Boss Help Center, "Action Plans Overview" (the automatic pause when a lead responds; checked 2026-11-10 through search excerpts): https://help.followupboss.com/hc/en-us/articles/1500008539982-Action-Plans-Overview
- NAR, Written Buyer Agreements 101 (checked 2026-11-10): https://www.nar.realtor/the-facts/written-buyer-agreements-101
- NAR, Consumer Guide to Open Houses and Written Agreements (checked 2026-11-10): https://www.nar.realtor/the-facts/consumer-guide-to-open-houses-and-written-agreements
- Utah Admin. Code R162-2f-401a and R162-2f-401b (checked 2026-11-10): https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401a and https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401b
- Utah Code 13-25a-102 and 13-25a-103 (checked 2026-11-10): https://le.utah.gov/xcode/Title13/Chapter25A/C13-25a-S102_2024050120240501.html and https://le.utah.gov/xcode/Title13/Chapter25A/C13-25a-S103_2022050420220504.html
- Utah Code 63G-1-301, legal holidays (checked 2026-11-10): https://le.utah.gov/xcode/Title63G/Chapter1/63G-1-S301.html
- Fair housing: 42 U.S.C. 3604 (https://www.law.cornell.edu/uscode/text/42/3604) and Utah Code 57-21-5 (https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html), checked 2026-11-10
- Utah School Report Card, Utah State Board of Education (checked 2026-11-10): https://reportcard.schools.utah.gov/
- Facebook lead downloads: third-party guides only (for example https://leadsync.me/blog/download-leads-from-facebook/), not Meta's help center
- Claude Help Center, "Uploading files to Claude" (checked 2026-11-10 for open-house-follow-up): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Texting and email rules: the shared `outreach-rules.md` (TCPA, the FCC's rules and CAN-SPAM, checked 2026-11-08)
- Install steps, plans and training switches: as on the other skill pages (`skill-page.ts`, D-052), checked 2026-11-08
