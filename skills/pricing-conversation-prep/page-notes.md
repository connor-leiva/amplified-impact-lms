# Page Notes: Pricing Conversation Prep (/pricing-conversation-prep)

Skill: `pricing-conversation-prep`, version 1.1. Claude and ChatGPT. Every fact below was checked on 2026-11-08; sources are at the end, and the skill's own facts are in `references/comp-method.md`, `references/market-metrics.md` and `references/utah-pricing-context.md`.

## One-Line Promise

Upload your CMA and walk into the pricing conversation with a number you can defend, the story behind it, and answers to every objection your seller is likely to raise.

## Who It's For

Listing agents preparing for a listing appointment or a price reduction conversation. Built for Utah (it knows Utah is a non-disclosure state and how the Utah REPC's appraisal condition works) and works in any other state in general mode, where it uses only your files and says state rules weren't checked.

## What to Upload, and Where Each File Comes From

You need one file with sold comps that show sale prices and close dates. The rest makes it better.

- **Your CMA or comp export (required).** A CMA report as a PDF, or an MLS export as a CSV, or both.
  - **UtahRealEstate.com, CMA:** search for comparable properties (the CMA tab has Create New), select the listings, then choose CMA Report from the Reports dropdown. Create CMA Packet at the top of the page makes a basic presentation; Cloud CMA is also in the Reports dropdown and is free with your membership. Save or print the report as a PDF. (Checked against UtahRealEstate.com's "CMA Steps" and "Using the CMA Report" articles.)
  - **UtahRealEstate.com, CSV export:** from the search results, select the listings, choose Export Report from the Reports dropdown, answer the security question, pick Standard (over 100 fields) or a Custom report, choose CSV, and select Download. Up to 600 listings per export. (UtahRealEstate.com, "Exporting MLS Listings".)
  - **Flexmls MLSs (outside Utah):** run the search, click the More menu (three dots), then Export, choose Export all matches or Export selected matches, keep Generic Text Export (a .csv), enter the verification code and click Export. To save a Flexmls CMA as a PDF, click Print and choose Save as PDF. (Flexmls Help, "Export Search Results" and "Save a CMA as a PDF".)
  - **Any other MLS or CMA tool:** any PDF or CSV that lists sold, pending, active and expired comps with prices and dates works. The more columns the better: original list price, concessions, cumulative days on market, and above-grade and basement square footage separately.
- **The subject's MLS sheet or tax record (helpful).** For a new listing, the subject column of your CMA is usually enough. For a price reduction, upload the listing's MLS sheet.
- **Your showing report (price reductions).**
  - **ShowingTime:** from the UtahRealEstate.com homepage, select the ShowingTime icon, click Reports, select Listing Activity Report, and click the listing's row. Its Homeowner Version leaves out showing agent details and unpublished feedback. (UtahRealEstate.com, "ShowingTime Listing Activity Report".)
  - **Aligned Showings:** select My Listings, find the listing and select the Download Activity Report icon. It opens as a PDF. (UtahRealEstate.com, "Aligned Showings Reports".)
  - Either version works. The skill keeps showing agents' names and contact details, and any comment about people or schools, out of everything it writes for the seller.

**Privacy before you upload:** MLS exports carry agent-only remarks, lockbox codes and owner contact details. The skill keeps them out of anything client-facing, but turn off model training first if you haven't: in Claude, Settings > Privacy > Help Improve our AI models (Free, Pro, Max, Ultra; Team and Enterprise chats aren't used for training by default); in ChatGPT, Settings > Data controls > Improve the model for everyone. Check your MLS's rules on using MLS data in outside tools with your MLS or broker.

## Things to Say

- "Prep me for my listing appointment at [address]. Here's my CMA."
- "The sellers want $650,000. What can I actually defend?"
- "45 days on market and no offers. Prep the price reduction conversation. Here's the MLS sheet, comps and showing report."
- "The seller keeps quoting Zillow. Help me answer it with these comps."
- "They say their house is bigger than the neighbor's. How do I handle the square footage argument?"

## What Comes Back

A bottom line (three sentences: the price, the range, your confidence, and the pushback to expect), the three to five closest comps in a table with why each one is close and which sales were left out, a market read from your comp set with the math shown (months of supply, sale-to-list, days on market, price cuts, concessions, expired listings), the recommendation (range, a specific price, confidence, where the seller's number sits, the appraisal check, what would change it), a talk track, four to six objections with answers built on your numbers, a one-page seller pricing summary, and a "Check before sending" list tracing every number to its MLS number. In Price Reduction mode it also reads your showings and feedback.

## What It Won't Do

- Set the price. It recommends; you decide.
- Invent comps, dollar adjustments, upgrade values or market statistics, or price a home on total square footage when basements differ.
- Call its number an appraisal or promise a price, a timeline or an appraisal result.
- Put agent-only MLS fields, your seller's loan balance or net needs, showing agents' details, or comments about people, schools or safety into anything client-facing.
- Do commission or seller net math (ask your title company for a net sheet), or quote concession limits for a specific buyer (their lender confirms).
- Send anything. Drafts only.
- Price an offer for a buyer (that's Offer Strategy), respond to a low appraisal (Low Appraisal Response), compare several offers (Offer Comparison), or write the follow-up after the appointment (Appointment Follow-Up).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. Code execution ("Code execution and file creation," called "Create and edit files" in the updated layout) is on by default on Free, Pro, Max and Ultra. On Team and Enterprise, an Owner controls skills and code execution.
- **No connectors.** Gmail is optional, only to save the seller summary as a draft when you ask.
- **ChatGPT instead:** a Project, on any plan that has Projects (Free, Go, Plus, Pro). The project holds 4 files, inside Free's limit of 5 files per project. Free has separate, unpublished limits on file uploads and data analysis; ChatGPT tells you when you hit them.
- **No cost** beyond your Claude or ChatGPT plan and the MLS access you already have.

## Install

- **Claude:** download `pricing-conversation-prep.zip` and don't unzip it. Go to Customize > Skills, click +, then + Create skill, select Upload a skill, and choose the ZIP. Make sure it's toggled on, then start a new chat and attach your CMA.
- **ChatGPT:** download `pricing-conversation-prep-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Open the more options menu (•••), select Project settings, and paste the text from `paste-into-instructions.txt`, with your voice profile quick card under the last line. Add the four .md files to the project. Then start a chat in the project and attach your CMA.

## Run / Draft / Own

- **Run:** reading the CMA, MLS sheet and showing report; sorting and cleaning the comps; the math (price per above-grade square foot, concessions, sale-to-list, months of supply, days on market).
- **Draft:** the talk track, the objection answers and the seller pricing summary, for you to read and change first.
- **Own (you):** the list price and any reduction or concession, every money conversation with your seller, and the fair housing read of anything you share.

## FAQs

- **Why won't it just use price per square foot?** Because appraisers count only above-grade finished space as living area and treat the basement separately (Fannie Mae requires the ANSI Z765 standard). Total square footage makes a home with a big basement look underpriced. The skill compares above grade and basement separately, which is also how it answers sellers who say "our house is bigger."
- **What if I only have two or three sold comps?** It still gives you a range and a price, labels older or farther comps, lowers its confidence, and tells you exactly what's missing. It never fills the gap with outside numbers.
- **Will my seller see the private remarks or lockbox codes from my export?** No. Agent-only fields never go in the talk track or the seller summary. Check the "Check before sending" list anyway before you share anything.
- **Does it work outside Utah?** Yes. Outside Utah it runs in general mode: same comp method, no Utah notes, and it tells you state rules weren't checked.
- **Can it send the summary to my seller?** No. It drafts. With Gmail connected in Claude and your ask, it can save a draft for you to review and send.

## Practice Prompt

Attach both practice files (`pricing-practice-cma-report.pdf` and `pricing-practice-mls-export.csv`, from the practice ZIP) and say:

**"I have a listing appointment Thursday with Sam and Pat Pretendley at 1482 W Juniper Example Dr. They're hoping for $615,000, and Pat said Zillow shows $607,000. My CMA report and the MLS export are attached. Prep me for the pricing conversation."**

Everything in the files is made up. The sample on this page is what that prompt returned.

## Suggested Library Keywords

CMA, comps, pricing, list price, listing appointment, price reduction, price drop, overpriced listing, seller objections, Zillow, talk track, days on market, square footage, basement, appraisal, listing presentation, seller pricing summary

## Tested and Not Tested

**Tested (2026-11-08), following SKILL.md 1.1 on made-up files:**
- Eval 1, a new listing with a finished basement among comps with no basements (Utah): 8 of 8. It compared above grade and basement separately, put no dollar value on the basement, kept the range under a stale active, and answered the sellers' square footage argument with the neighbor's above-grade size and concessions. A no-skill baseline on the same files passed 0 of 8 (2 partial): it invented a "50% to 60%" basement value and upgrade adjustments, priced at a 52-day stale active, gave the wrong appraisal mechanics for Utah, and suggested repeating agent-only remarks to the sellers.
- Eval 2, a price reduction at 45 days with 11 showings and a showing report (Utah): 8 of 8 after one fix. The first run invented when a comp's price cut happened; the reference now says never to guess timing the export doesn't show. It left out a school comment and a comment about families, the showing agents' details, the lockbox code and the sellers' loan balance.
- Eval 3, a thin comp set with two recent solds, in Colorado (general mode): 8 of 8 after one fix (a derived expiration date was removed). It said state rules weren't checked, made no Utah or Colorado claims, left out a horse property, listed the missing export fields and skipped the metrics that need them.
- Practice run: 12 of 12. It is the sample on this page.
- `node scripts/skills.mjs check pricing-conversation-prep` passes.

**Not tested:**
- Real Utah Life CMAs, exports and showing reports (none provided yet), and real Cloud CMA, Flexmls, Matrix or Aligned Showings files.
- The ChatGPT Project version in ChatGPT itself (the instructions mirror the skill; the click paths are from OpenAI's help center).
- Upload on a Claude Free plan, and the Gmail draft step.
- The Cloud CMA PDF download steps (Cloud CMA's own help center wasn't reachable; any PDF of the report works).

## Sources (checked 2026-11-08)

- Skills upload path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default, and its name in the updated layout: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings ; commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (New project, ••• > Project settings, 5 files per project on Free), opened directly: https://help.openai.com/en/articles/10169521-projects-in-chatgpt
- ChatGPT data controls (Settings > Data controls > Improve the model for everyone), opened directly: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- ChatGPT Free limits on uploads and data analysis, opened directly: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- ChatGPT plans with Projects: https://chatgpt.com/pricing
- UtahRealEstate.com, Exporting MLS Listings: https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/how-to-export-listings-in-a-custom-report/
- UtahRealEstate.com, CMA Steps: https://help.utahrealestate.com/index.php/knowledge-base/cma/how-to-guides-cma/cma-steps/ and Using the CMA Report: https://help.utahrealestate.com/index.php/knowledge-base/cma/how-to-guides-cma/using-the-cma-report/
- UtahRealEstate.com, ShowingTime Listing Activity Report: https://help.utahrealestate.com/index.php/knowledge-base/showingtime/how-to-guides-showingtime/showingtime-listing-activity-report/
- UtahRealEstate.com, Aligned Showings Reports: https://help.utahrealestate.com/index.php/knowledge-base/aligned-showings/how-to-guides-aligned-showings/aligned-showings-reports/
- Flexmls Help, Export Search Results (last modified December 19, 2024): https://help.flexmls.com/en/export-search-results.html and Save a CMA as a PDF (last modified June 25, 2025): https://help.flexmls.com/en/save-a-cma-as-a-pdf.html
- Fannie Mae ANSI and above-grade rules: https://selling-guide.fanniemae.com/sel/b4-1.3-05/improvements-section-appraisal-report
