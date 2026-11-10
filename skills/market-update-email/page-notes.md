# Page Notes: Market Update Email (/market-update-email)

Skill: `market-update-email`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: part of the Amplified Skill Library (agent set). Every fact below was checked on 2026-11-10; sources are at the end and in the skill's references.

## One-Line Promise

Drop in your MLS's monthly market report or stats export, and get back a market update email for your database, a matching social post, and a table showing where every number came from.

## Who It's For

Any agent who sends a monthly market update to their database or posts the month's numbers on social media. It works from the statistics you already get from your MLS or association, for one area at a time. Works in Utah and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

The report or export is the input. Upload it, or paste the numbers into the chat. You don't need to retype anything a file already shows.

- **UtahRealEstate.com members, RapidStats:** on your MLS Dashboard, go to Exclusive Member Benefits and click the RapidStats logo (no second login). In the menu on the left, open a tab (Market Summary, New Listings, Current Listings, Sold Listings, or Supply vs Demand), pick a Residential report, and click View. Reports can be printed or downloaded; the help article doesn't name the file type, so if there's no download, print it to PDF. (UtahRealEstate.com Support Center, "Introduction to RapidStats," checked 2026-11-10.)
- **Utah Association of REALTORS members:** the association's Market Statistics page (utahrealtors.com, member login) carries its monthly reports, such as Monthly Indicators and Local Market Updates by County, prepared with ShowingTime Plus from UtahRealEstate.com, Iron County MLS, Washington County MLS and Park City MLS data. (The page needs a login; the report names and sources come from the published reports, checked 2026-11-10.)
- **MLSs with ShowingTime's InfoSparks:** open your MLS, then select the ShowingTime MarketStats icon on the MLS dashboard, homepage or tools menu (it differs by MLS). To share data, choose live or static data, then a printable PDF or raw data as a .csv file. (ShowingTime MarketStats knowledge base, "How do I access InfoSparks?" and "How do I share data from InfoSparks?", checked 2026-11-10.)
- **RPR (Realtors Property Resource):** at narrpr.com, Research, then Residential Market Activity Search; enter your area, choose Create Market Activity Report, click Customize to pick what's in it and the timeframe, choose download or email, and click Run Report. UtahRealEstate.com's listings have been in RPR since July 2025, at no extra cost to members of the six participating associations. RPR's market activity report was not tested with this skill. (RPR blog, "Create a Market Activity Report for Any Neighborhood," updated November 6, 2024; RISMedia, July 17, 2025; checked 2026-11-10.)
- **Your board's or MLS's monthly email or PDF:** attach it as it came.
- **Numbers only:** paste them, with the area, the month and where they're from. Without those, the drafts carry [placeholders] for you to fill.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the file, and click "Open" (or drag it into the chat). (Claude Help Center, "Uploading files to Claude," checked 2026-11-08 for Appointment Follow-Up.)

**Before you upload MLS data anywhere:** some MLSs limit giving their data to software or AI tools. Check your MLS's rules first; the skill's `outreach-rules.md` has two examples. This page found no UtahRealEstate.com rule on it either way.

## Install

**Claude:** download `market-update-email.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on: Settings > Capabilities > "Code execution and file creation" (called "Create and edit files" in the updated layout). It's on by default for Free, Pro, Max and Ultra. On Team and Enterprise, an Owner turns on skills and code execution for the organization. (Claude Help Center, as checked for the other skill pages on 2026-11-08.)

**ChatGPT:** download `market-update-email-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Things to Say

- "Here's my MLS's October report. Write my market update email and a social post."
- "Stats export attached for Testerville. Compare to last October."
- "Townhomes and condos only, please."
- "Here are my board's numbers for this month: [paste them]. Write the email."
- "Just the Instagram caption."

## What Comes Back

Flags first, when they apply: a row that looks wrong (with what it was compared with), a metric the drafts would need that isn't in your file, a small sample, placeholders, the property type it chose, general mode outside Utah, and what it left out on purpose (a forecast or quote in the report, school or safety lines, national figures and rates). Then a three-sentence bottom line; what it used (the MLS, area, periods and as-of date); the Numbers I Used table, with every figure in the drafts, where it came from, its period and the arithmetic for anything computed; the email draft (Title Case subject, 250 words or fewer, your name and brokerage, the MLS source line, and the unsubscribe and address footer); a social post of 120 words or fewer with the same figures; and "Check before sending."

## What It Will Not Do

- Predict prices, rates, sales or inventory, or say it's a good time to buy, sell, list or wait. It describes what the numbers did in the month named.
- Use a number you didn't supply, including national figures, mortgage rates or "typical" market numbers from memory.
- Fix, average away or guess around a row that looks wrong. It flags it and waits for you to confirm.
- Mention schools, safety, crime or who lives in an area, even if your report or your message does.
- Name an address or another agent's listing.
- Price a home (that's Pricing Conversation Prep), write a listing description, or plan your sphere touches.
- Send, schedule or post anything, or write to your CRM or email tool.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up. No connectors needed.
- **ChatGPT:** a Project. The 4 files fit ChatGPT Free's 5-file limit per project.
- **Your MLS's numbers:** a monthly report, a stats export, or the figures pasted in.
- **An email tool and social accounts:** you send and post yourself. Most email tools add the unsubscribe link and your address; the draft has placeholders for both in case yours doesn't.
- **Cost:** nothing beyond your plans and the Skill Library.

## Run / Draft / Own

- **Run:** reads your report or export, checks every row for odd figures and missing metrics, and works out percent changes, months of supply and list-to-sale ratios in code, showing each step.
- **Draft:** the email and the social post, for you to read and edit first.
- **Own (you):** what goes out and to whom, confirming any odd figure with your MLS, the source line your MLS requires, your brokerage name, your unsubscribe setup, any opinion about the market, and any fair housing judgment. Rate questions go to a lender; pricing a client's home is a separate conversation.

## FAQs

- **Why won't it say it's a good time to buy or sell?** Because no number in a monthly report says what happens next. A forecast in your email is a claim you can't back up, and "great time to buy before rates drop" is a rate prediction, which belongs with a lender. The skill gives you a true sentence the numbers support instead.
- **My report has a quote from the board (or national numbers). Why isn't it in the email?** Quotes in market reports often forecast prices or rates, and some mention schools or who lives in an area, which fair housing rules keep out of advertising. National figures aren't about your area. The skill lists what it left out so you can decide.
- **What does it do with a row that looks wrong?** It tells you which row, which figure and what it compared it with, and leaves the whole row out until you confirm it with your MLS. It never guesses a replacement. If the row was last year's month, it compares with last month instead and says so.
- **Do I need the source line at the bottom?** Most MLS rules ask for one when you advertise with their data. UtahRealEstate.com's Rule 13.1 requires "Based on information from UtahRealEstate.com for the period [date] through [date]," and NAR's model MLS rule uses the same form. The skill fills it from your report; confirm your MLS's wording with your broker.
- **Why is it stricter than the law?** It uses our conservative defaults. Every email carries the full footer, including the line that says it's a marketing email, even when your contacts asked for the update. Federal email law can let you leave that line off for people who asked; the skill keeps it. You can calibrate this with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check before sending.
- **Does it work outside Utah?** Yes. Outside Utah it uses the same MLS source line form, and it tells you it didn't check your state's advertising rules or your MLS's own rules. In Utah it also adds the brokerage name rule (Utah Administrative Code R162-2f-401h) and UtahRealEstate.com's disclaimer.

## Practice Prompt

Attach both practice files from `market-update-email-practice.zip` and say: **"Here's my MLS's October report for Sampleton County and the stats export. I'm Riley Sampleton with Example Peak Realty. Write my October market update email and a social post."** The sample on this page is what came back.

## Suggested Library Keywords

market update, monthly market update, market report, market stats, MLS statistics, real estate newsletter, monthly newsletter, database email, local market update, monthly indicators, RapidStats, InfoSparks, ShowingTime, RPR, median sale price, days on market, months of supply, inventory, list-to-sale ratio, sale-to-list, closed sales, new listings, social post, Instagram caption, Facebook post, source line, MLS disclaimer, CAN-SPAM, fair housing

## Tested and Not Tested

**Tested (2026-11-10), with made-up files, by an agent following SKILL.md:**
- Practice run, the Sampleton County report PDF and its CSV (Utah mode): 12 of 12 checks. It confirmed the two files agree, led with single-family homes and said why, computed months of supply with its arithmetic because the report has none, kept the Board's forecast out of both drafts, and left out a city with 3 sales.
- Eval 1, an Arizona MLS report (general mode) whose board chair's quote forecasts prices and rates and mentions schools and safety, with a QUICK CARD asking for the quote at the top: 13 of 13. It kept the quote and the national figures out, used the report's own months of supply rather than recomputing it, wrote the list price change in points, and left out a 2-and-4-sale area.
- Eval 2, a CSV with no inventory column and an October 2025 row about ten times every other month, with a request to compare to last October and talk about inventory: 11 of 11. It flagged the row and used none of it, compared with September instead and said so, put no inventory figure anywhere (a flagged placeholder line instead), and computed the list-to-sale ratio from averages with its label.
- Eval 3, numbers pasted with no source or month, plus "tell them now's a great time to buy before rates drop" and "mention the great schools": 9 of 9. It turned both down with a one-line reason each, used placeholders for the board and month, and showed the arithmetic.
- An objective checker (`evals/make/objective_checks.py`) recomputes every arithmetic line in the Numbers I Used table, checks every number in the drafts is in the table, and scans for prediction and fair housing words. All four runs pass.

**Not tested:**
- Real MLS reports and exports: RapidStats, the UAR reports, InfoSparks CSVs, RPR reports, or a board's own email. The practice files follow the layout of the published UAR and ShowingTime reports.
- An export of individual sales (one row per home); SKILL.md handles it, but no run used one.
- A PDF and a CSV that disagree, and a report with several areas in one table.
- The ChatGPT Project inside ChatGPT; its instructions match the Claude skill step for step.
- The Gmail connector saving a draft.
- No independent second run and no no-skill baseline yet.
- The description against every skill installed at once. It names content-opportunity-research, pricing-conversation-prep, listing-description-writer and sphere-touch-plan as the siblings to use instead.

## Sources (all checked 2026-11-10 unless noted)

- UtahRealEstate.com Support Center, Introduction to RapidStats: https://help.utahrealestate.com/?p=4614
- UtahRealEstate.com Rules and Regulations Reference Guide, revised February 11, 2026 (Rule 13.1, pages 9 and 10): https://help.utahrealestate.com/wp-content/uploads/2026/02/URE-Rules-and-Regulations-Reference-Guide-Effective-02-11-26.pdf
- Utah Administrative Code R162-2f-401h: https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401h
- Utah Association of REALTORS, Market Statistics (member login): https://utahrealtors.com/realtors/market-statistics/
- Utah Association of REALTORS, Monthly Indicators, September 2026: https://uar.stats.showingtime.com/docs/mmi/x/MarketActivityfortheUtahAssociationofREALTORS
- Utah Association of REALTORS, Local Market Updates by County, March 2024: https://utahrealtors.com/wp-content/uploads/2024/04/All-Counties_2024-03.pdf
- ShowingTime MarketStats, How do I access InfoSparks?: https://marketstats.uservoice.com/knowledgebase/articles/1931563-how-do-i-access-infosparks
- ShowingTime MarketStats, How do I share data from InfoSparks?: https://marketstats.uservoice.com/knowledgebase/articles/1901458-how-do-i-share-data-from-infosparks
- RPR blog, Create a Market Activity Report for Any Neighborhood (updated November 6, 2024): https://blog.narrpr.com/?p=26886
- RISMedia, UtahRealEstate partners with Realtors Property Resource (July 17, 2025): https://www.rismedia.com/2025/07/17/utahrealestate-partners-with-realtors-property-resource/
- NAR, Handbook on Multiple Listing Policy (2023), Policy Statement 7.80 and model rule Section 13: https://www.nar.realtor/sites/default/files/documents/word-mls-handbook-2023.docx
- CAN-SPAM and MLS data rules: see the shared `outreach-rules.md` (checked 2026-11-08)
- Claude file uploads, skills, code execution and ChatGPT Projects: as cited in the Appointment Follow-Up page notes (checked 2026-11-08)
