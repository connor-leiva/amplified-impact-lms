# Page Notes: Seller Listing Update (/seller-listing-update)

Skill: `seller-listing-update`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: in the Amplified Skill Library (agent set). Every vendor fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Drop in this week's showing feedback, your listing numbers and your notes, and get back the weekly update for your sellers in your voice, with every number checked against last week and every comment that shouldn't reach a seller caught first.

## Who It's For

Listing agents who send their sellers a weekly update (the "Tuesday update"), and the assistants and team leads who write it for them. It works from any showing service's feedback, any portal's numbers and the agent's own notes. Works in Utah and, in general mode, anywhere else.

## Why This, When the Showing Service Already Emails the Sellers (Connor's Filter)

ShowingTime and BrokerBay can already send feedback to sellers on their own. In ShowingTime, a feedback template set to "Publish Automatically" emails each response to the seller as it arrives; BrokerBay lists "Receive automated feedback on your property" among its seller features. Zillow, Realtor.com and some MLS systems send their own seller reports too. None of that is rebuilt here. The value is the one thing those tools don't do: one personal weekly narrative across every source (the showing service, Zillow, Realtor.com, the MLS and the agent's own notes), in the agent's voice, with the arithmetic shown, the plan for next week, and the problem comments (who the buyers are, the neighbors, schools, safety) caught and flagged to the agent before they reach a seller. When the showing service publishes automatically, the skill also tells the agent that a left-out comment may already have gone out.

## What to Upload, and Where Each File Comes From

Three things: the showing feedback, the listing numbers and your notes. You don't retype anything a file already says.

- **ShowingTime:** open Reports, then Listing Activity Report, and pick the listing. Click Change Date Range and set the week. The report can be printed, emailed or downloaded as a PDF. Use the agent version. (ShowingTime help center, SmartMLS, "Showing Activity for one listing" and "Listing Activity report," checked 2026-11-10.)
- **BrokerBay:** the listing's showings and feedback, exported or copied into the chat. BrokerBay's own help center has no public article on exporting feedback, so no click path is given; any columns that arrive are read and the skill says how it read them. Not tested on a real BrokerBay export.
- **Another showing service or your own spreadsheet:** its CSV or Excel export, or a paste.
- **Zillow (Showcase listings):** open the listing, click Showcase & Media, then Performance on the left. Share Report downloads a PDF. These are totals since the listing went live, so the skill subtracts last week's total to get this week's number. (Zillow, "Showcase & Media: Listing Performance," checked 2026-11-10.)
- **Zillow (any listing):** the views and saves on the listing's own Zillow page. Zillow counts the last 30 days there, so the skill reports them as that and never compares them week to week. (Zillow Showcase FAQ, checked 2026-11-10.)
- **Realtor.com:** the Listings tab of your Realtor.com Pro dashboard (listing intelligence: search appearances, page views, shares, tour requests). (Realtor.com's agent blog, June 15, 2023, and Ohio REALTORS, January 10, 2023, both read 2026-11-10; the current menu was not checked in a live account.)
- **The MLS:** its own listing stats and days on market, as your MLS labels them. Not checked MLS by MLS.
- **Last week's numbers:** last week's update, a stats log you keep, or a line in your notes. Without them, nothing is compared.
- **Your notes:** typed or dictated: the sellers' names, what they asked, whether one of them prefers texts, anything that happened off the export, and next week's plan. The plan comes only from here.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). (Claude Help Center, "Uploading files to Claude," checked 2026-11-10 for the open house page.)

## Install

**Claude:** as every skill page says it (D-052): download `seller-listing-update.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the updated layout). No connectors needed. Optional: Gmail, only to save the email as a draft when you ask (not tested).

**ChatGPT:** download `seller-listing-update-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the three `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Things to Say

- "Here's this week's showing feedback, my listing stats and my notes. Write the weekly update for my sellers."
- "Weekly update for the Mocklers. ShowingTime report and my Zillow numbers attached. Last week's numbers are in my notes."
- "Only two showings and no feedback this week, and my seller asked if we should drop the price. Write the update."
- "Name the showing agents this time; my sellers want to know who came through."
- "Just the email, please."

## What Comes Back

Flags first, when they apply: the week used, rows outside it, showings with no feedback, no last-week numbers, Zillow totals or 30-day counts, inputs that disagree, comments left out for fair housing (by date and time only, and whether the showing service already published them), trimmed comments, a possible defect a showing agent reported, the sellers' price question, your own price view left out, placeholders, times with no AM or PM, and general mode outside Utah. Then a three-sentence bottom line; the week in numbers, with this week, last week (only when you gave it), the change with the arithmetic, and the source of every number; what buyers' agents said, by theme, with exact counts and exact quotes and no buyers named; questions for your price conversation (facts only, for you); the seller email (a Title Case subject, 250 words or fewer); a text for a seller who prefers texts (320 characters or fewer); next week's plan from your notes, dated; and a "Check before sending" list of every number, quote and date with where it came from.

## What It Will Not Do

- Send, text or post anything, or write to your CRM or showing service.
- Invent a showing, a comment, a number or a trend. A week with no feedback says so.
- Recommend a price, a range, a reduction or holding, or call the price right or wrong. A seller's price question goes to you with the facts; the price conversation is yours (Pricing Conversation Prep prepares it from a CMA).
- Pass on what a comment says about the buyers, the neighbors, schools or safety. The whole comment is left out and flagged to you.
- Name buyers, or share showing agents' phone numbers. Showing agents are named only when you ask.
- Diagnose a defect a showing agent mentions. It's quoted as written, and disclosure questions go to your broker.
- Add anything to next week's plan that your notes don't say.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on every plan; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors.
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 3 files fit.
- **This week's feedback, your numbers and your notes.** Any showing service, any portal.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer. Downloading a showing report is easiest on a computer.
- **Cost:** nothing beyond your plans and the showing service you already use.
- **Privacy:** feedback exports carry showing agents' names and phone numbers. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls > "Improve the model for everyone"), as every skill page says.

## Run / Draft / Own

- **Run:** reads every row and number, sets the week, counts showings, feedback and ratings, does the arithmetic against last week, groups comments by theme, and sets aside the comments that can't go to a seller.
- **Draft:** the seller email and the text, for you to read first.
- **Own (you):** the price conversation and any price recommendation, which feedback your sellers hear (the left-out comments included, with your broker), whether to name showing agents, next week's plan, disclosure questions a comment raises, and every send.

## FAQs

- **My showing service already emails my sellers the feedback. Why this?** It sends each response as it arrives, word for word. This writes one weekly update across the showing service, Zillow, Realtor.com, the MLS and your notes, in your voice, with the numbers checked against last week and next week's plan. It also catches the comments that shouldn't reach a seller, and tells you when one may already have gone out. If you want to stop that, ShowingTime can hold feedback for your review before it's published; ask your broker.
- **Why won't it tell my sellers whether to lower the price?** Price is your call and your sellers', made from a CMA, not from a week of feedback. The update gives the price opinions and comments exactly as they came in, and puts the facts in front of you as questions. Pricing Conversation Prep turns an updated CMA into that conversation.
- **Why did it leave out a showing agent's comment?** It said something about who the buyers are, who lives nearby, the schools or safety. Federal and Utah fair housing law bar statements that show a preference about who should live in a home, and the REALTOR Code of Ethics says not to volunteer the racial, religious or ethnic makeup of a neighborhood. Your update is your own written statement, so the whole comment stays out, and you get its date and time to decide with your broker. Its interest and price ratings still count.
- **Why are my Zillow numbers different from what I see on the listing page?** Zillow's listing page counts the last 30 days. Zillow's Showcase performance counts from the day the listing went live. The skill turns Showcase totals into weekly numbers by subtracting, shows the math, and never compares a 30-day count week to week.
- **Does it work outside Utah?** Yes, in general mode: fair housing and everything else still apply, and it tells you your state's rules weren't checked. In Utah it also leaves out comments about sexual orientation, gender identity and source of income, which Utah adds to the federal list.

## Practice Prompt

Attach the three files from `seller-listing-update-practice.zip` and say: **"Here's this week's showing feedback export, my listing stats and my notes for 1427 E Sample Willow Dr. I'm Dana Sampleford with Example Ridge Realty. Write the weekly update for Pat and Lee."** The sample on this page is what came back on Tuesday, November 10, 2026, for the made-up week of Monday, November 2 to Sunday, November 8. Run on another day, the dates in next week's plan still resolve from the notes, but "today" changes.

## Suggested Library Keywords

seller update, weekly seller update, weekly listing update, tuesday update, listing report, seller report, showing feedback, showing feedback recap, showingtime, brokerbay, listing activity report, zillow views, zillow saves, realtor.com views, days on market, price feedback, price reduction question, listing agent, fair housing, seller communication

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run, a full week in Draper, Utah, from a showing feedback export (8 appointments, 7 showings, 5 with feedback), a one-page stats printout with last week's numbers and the agent's notes: 13 of 13 checks after one fix (the email ran 252 words and was tightened to 246). The comment about the buyers' kids, the neighbors and the elementary school was left out and flagged by date and time, with its ratings counted; the water stain stayed in as written with a disclosure flag; every comparison showed its arithmetic; Pat's question got the numbers and a placeholder, not reassurance. It is `sample.md`.
- Eval 1, a full week in Meridian, Idaho (general mode), from a BrokerBay-style export with a 1 to 5 interest scale, a showing outside the week, a declined appointment, Zillow Showcase totals since listed and a 30-day count: 13 of 13. Weekly Zillow numbers were worked out by subtraction, the safety and religion comments were left out, the financing sentence was trimmed, showing agents were named because the notes asked, and the agent's own price view stayed out.
- Eval 2, a thin week in Lehi, Utah: two showings, no feedback, no last-week numbers, and the seller asking "Should we drop the price?": 8 of 8. No invented feedback or change, the 30-day Zillow numbers labeled as such, the price question sent to the agent with facts only and a placeholder in the email.
- Objective checks on every run: no em or en dashes, sections in order, Title Case subject, email 250 words or fewer, text 320 characters or fewer and only when a seller prefers texts, no phone numbers, showing agents named only when asked, the left-out comments' words absent, no protected-class, school, safety, trend or price-advice words in the drafts, every arithmetic result present, and every number in the inputs or the computed and resolved-date lists.

**Not tested:**
- A real ShowingTime Listing Activity Report PDF, a real BrokerBay export, a real Zillow Showcase report PDF and a real Realtor.com report. The practice files follow the fields these tools document; their exact layouts were not seen.
- More than 10 showings in a week, and more than one week of feedback in one file (ShowingTime suggests a month or less per report).
- The ChatGPT Project in ChatGPT itself; its instructions match the skill step for step.
- A voice profile QUICK CARD, a Gmail draft, and a comment that falls only under Utah's extra classes.
- The description against every skill installed at once. It names open-house-follow-up, pricing-conversation-prep, listing-description-writer and listing-appointment-prep as siblings; listing-appointment-prep is being built at the same time and was not available here.
- No no-skill baseline was run.

## Sources

- ShowingTime (SmartMLS help center), "Showing Activity for one listing" (checked 2026-11-10): https://showings.smartmls.com/hc/en-us/articles/13119990394139-Showing-Activity-for-one-listing
- ShowingTime (SmartMLS help center), "Listing Activity report" (checked 2026-11-10): https://showings.smartmls.com/hc/en-us/articles/13119952850843-Listing-Activity-report
- ShowingTime (SmartMLS help center), "Allow seller to get feedback as soon as showing agent sends it" (checked 2026-11-10): https://showings.smartmls.com/hc/en-us/articles/13119987520155-Allow-seller-to-get-feedback-as-soon-as-showing-agent-sends-it
- BrokerBay, Seller Features (checked 2026-11-10): https://www.brokerbay.com/mls/seller-features
- ARMLS, "Giving ShowingTime Feedback to Sellers" (publish automatically or hold for review; checked 2026-11-10): https://armls.com/giving-showingtime-feedback-sellers
- Zillow, "Showcase & Media: Listing Performance" (checked 2026-11-10): https://grow.zillow.com/help-article/showcase-media-listing-performance
- Zillow, Showcase performance FAQ (checked 2026-11-10): https://grow.zillow.com/showcase-performance
- Realtor.com, "How to Use Listing Intelligence to Keep Clients Up to Date" (June 15, 2023; read 2026-11-10): https://realtormarket.wpengine.com/?p=5155
- Ohio REALTORS, "Now available: enhanced listing intelligence from Realtor.com" (January 10, 2023; read 2026-11-10): https://www.ohiorealtors.org/blog/1729/now-available-enhanced-listing-intelligence-from-realtorcom
- Fair housing: 42 U.S.C. 3604 (https://www.law.cornell.edu/uscode/text/42/3604) and Utah Code 57-21-5, version effective May 6, 2026 (https://le.utah.gov/xcode/Title57/Chapter21/C57-21-S5_2026050620260506.html), checked 2026-11-10
- NAR Code of Ethics and Standards of Practice, effective January 1, 2026, Standard of Practice 10-1 (checked 2026-11-10): https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- Install steps, plans and training switches: as on the other skill pages (`skill-page.ts`, D-052), checked 2026-11-08
