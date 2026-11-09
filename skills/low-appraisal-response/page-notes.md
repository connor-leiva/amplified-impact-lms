# Page Notes: Low Appraisal Response (/low-appraisal-response)

Skill: `low-appraisal-response`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Every fact below was checked on 2026-11-08; sources are at the end and in the skill's references.

## One-Line Promise

Upload the appraisal that came in under your contract price, and get back what the report got wrong (if anything), whether a reconsideration of value is worth asking for, each side's options, your real deadline, and the drafts to send.

## Who It's For

Buyer's agents and listing agents with a home under contract and an appraisal below the price. It reads both Utah REPC versions in use right now (the December 4, 2024 form and the November 1, 2026 form) and the Utah FHA/VA Loan Addendum. Outside Utah it works from your uploaded contract and says it didn't check state rules. It handles conventional (Fannie Mae and Freddie Mac), FHA and VA loans. It is not for setting a list price or a price reduction (use Pricing Conversation Prep), appraisal terms in a new offer (Offer Strategy), a repair request (Repair Request Response) or what a counteroffer changes (Counter Explainer).

## What to Upload, and Where Each File Comes From

Upload the files as you received them. You don't need to type anything they already say.

1. **The appraisal report, every page (required for the review).** The lender has to give the buyer a copy of each appraisal "promptly upon completion, or three business days prior to consummation," whichever is earlier (Regulation B, 12 CFR 1002.14). Buyer's agents: ask your buyer to forward the PDF from the lender's email or portal. Listing agents: ask the buyer's agent for it; under the November 1, 2026 REPC a buyer who cancels over the appraisal has to send the seller "a complete copy of the appraisal" anyway. If all you have is a Notice of Appraised Value or the lender's email, the skill still does the gap, the deadline and the options, and tells you the review needs the full report.
2. **The signed purchase contract and every addendum (required for the deadline).** From your transaction file. Include the FHA/VA Loan Addendum and any addendum with a seller credit or an appraisal gap term.
3. **Comps (recommended).** A CMA report as a PDF, or an MLS export as a CSV, with sold prices and close dates. Include sales up to and after the appraisal's effective date; the skill sorts out which ones count.
   - **UtahRealEstate.com, CMA:** search for comparable properties (the CMA tab has Create New), review them in the Agent Full Report, then take your chosen comps into the CMA Report. (UtahRealEstate.com, "CMA Steps.")
   - **UtahRealEstate.com, CSV export:** from the search results, select the listings, choose Export Report from the Reports dropdown, answer the security question, pick Standard (over 100 fields) or Custom, choose CSV and download. Up to 600 listings per export. (UtahRealEstate.com, "Exporting MLS Listings.")
   - **Flexmls MLSs (outside Utah):** run the search, click the More menu (three vertical dots), then Export, choose Export all matches or Export selected matches, and keep Generic Text Export (a .csv). To save a Flexmls CMA as a PDF, click Print and choose Save as PDF. (Flexmls Help, "Export Search Results" and "Save a CMA as a PDF.")
   - **Any other MLS or CMA tool:** any PDF or CSV that lists the sales with prices, close dates, above-grade and basement square footage separately, and concessions.
4. **The subject's MLS sheet (helpful),** especially when the dispute is about square footage, basement finish or bedroom counts. A permit or receipts for updates help too.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). Up to 20 files per chat; PDFs up to 1,000 pages. (Claude Help Center, "Uploading files to Claude," checked 2026-11-08.) In ChatGPT, attach the deal's files to a chat inside the project; the project's Sources hold only the four instruction files.

**Privacy before you upload:** appraisals carry the buyers' names, and MLS exports carry agent-only remarks and lockbox codes. The skill keeps loan numbers, agent-only fields and codes out of everything it drafts, but turn off model training first if you haven't: in Claude, Settings > Privacy > "Help Improve our AI models" (Free, Pro, Max and Ultra; Team and Enterprise chats aren't used for training by default); in ChatGPT, Settings > Data controls > "Improve the model for everyone." On ChatGPT's individual plans, a thumbs up or down can still send that chat for training after you opt out. Check your MLS's rules on using MLS data in outside tools with your MLS or broker.

## Install

**Claude:** download `low-appraisal-response.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. (Claude Help Center, "Use skills in Claude," checked 2026-11-08.) Code execution has to be on: Settings > Capabilities > "Code execution and file creation" (called "Create and edit files" in the updated layout). It's on by default for Free, Pro, Max and Ultra. On Team and Enterprise, an Owner turns on both "Cloud code execution and file creation" and "Skills" under Organization settings > Plugins & skills > Policy (on by default on Team), and can turn off member uploads, which hides the upload option.

**ChatGPT:** download `low-appraisal-response-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. (OpenAI Help Center, "Projects in ChatGPT," and OpenAI's Projects docs, checked 2026-11-08.) This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Things to Say

- "The appraisal on [address] came in at [value]. We're at [price]. I'm the buyer's agent. Here's the appraisal and the REPC. What are our options?"
- "I'm the listing agent. The buyer's appraiser used comps three miles away. Here's the report and my CMA. What do I tell my sellers?"
- "Is there anything in this appraisal worth a reconsideration of value, or is it solid?"
- "My buyers want to fight a VA appraisal. Put together a reconsideration."
- "The lender called about a Tidewater. Which sales should we send?"
- "Make the client email a Gmail draft." (Claude, only with the Gmail connector on. Claude's Help Center and the Gmail connector listing say it can create drafts; one Claude docs page calls it read only. If no draft appears, copy the email from the chat.)

## What Comes Back

A bottom line in three sentences or less, then: the deadline (bold if it's within 48 hours) with the contract section, the time and what a cancellation needs; the gap with the math, including any appraisal gap term you already agreed to; a fact check of the subject against the report's own sketch and photos and the MLS; the report's own adjustment rates applied to any corrected fact, labeled as arithmetic, not a value; a comparable review; up to five better closed sales from your CMA, dated on or before the effective date, plus the sales left out and why; a Strong, Some or Weak call on the grounds; each side's options with tradeoffs; the reconsideration request in your loan program's format (buyer's side) or a data package for the buyer's agent (listing side); a client email; a note to the other agent; and a "Check before sending" list tracing every number, date and page reference to its source.

When the report is well supported, it says so plainly and doesn't pad a request.

## What It Will Not Do

- Contact the appraiser, draft anything addressed to the appraiser, or name a value the appraiser should reach. Facts and sales go to the lender through its reconsideration process.
- Promise the value will change, or criticize the appraiser.
- Invent sales, adjustments, rates or market statistics. Every number comes from your files.
- Decide anything about price or money. It lays out reduce, split, cover the gap and cancel; you and your client decide.
- Compute a loan amount, quote a concession cap or say how much cash your buyer needs exactly. The lender confirms those.
- Draft new contract language. A price change goes on your approved addendum, and appraisal gap language comes from your brokerage's form.
- Keep the official deadline calendar. Its dates are for strategy; confirm them with your transactions team.
- Put agent-only MLS fields, lockbox codes, loan or account numbers, or your client's bottom line in anything the other side or your client sees.
- Send anything. Drafts only.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors needed. The Gmail connector is optional, only to save a draft. Claude's official pages disagree on it: the Help Center lists Google Workspace connectors for all users and says Gmail can draft; Claude's docs list Gmail on Pro and up and call it read only.
- **ChatGPT instead:** a Project, on any plan that has Projects (Free, Go, Plus, Pro). The project holds 4 files, inside Free's limit of 5 files per project. Free allows 3 file uploads a day and about 12 pages of text per message, so on Free a long appraisal plus a contract and a CMA may need to go in over more than one message or day. Go and Plus allow about 40 pages per message.
- **Computer:** install the Claude skill from claude.ai in a browser or the Claude desktop app. Once installed, it works in chat on the web, desktop and phone apps. For ChatGPT, set the project up on the web: OpenAI publishes no phone steps for creating a project or editing its instructions.
- **Cost:** nothing beyond your Claude or ChatGPT plan and the MLS access you already have.

## Run / Draft / Own

- **Run:** reads every page, checks the subject's facts against the report's own sketch and photos and your MLS data, reviews the comparables, filters your CMA by the effective date, and does the gap math and the day count.
- **Draft:** the reconsideration request (or the listing-side data package), the client email and the note to the other agent, for you to read and edit first.
- **Own (you and your client):** whether to request a reconsideration (the buyer, as borrower, sends it), every price and money decision, any extension, the official deadline calendar (your transactions team), and anything about the appraiser beyond facts (your broker and the lender).

## FAQs

- **Can I call the appraiser?** Don't. Regulation Z lists asking an appraiser to consider more comparable sales or to correct errors as permitted, but it bars pressure of any kind, and the conventional and FHA processes run requests through the lender, and FHA's handbook says the appraiser discusses value only with the underwriter or FHA staff. The skill sends everything through the lender.
- **Can the seller's side ask for a reconsideration?** Not directly. The buyer is the borrower and sends the request. The listing agent can give the buyer's agent facts and sales for the buyer to pass along, and the skill drafts that package.
- **Can the buyer just get a new appraisal or switch lenders?** It depends on the loan. FHA bars the lender from ordering another appraisal "to achieve an increase in value"; VA allows no duplicate appraisal while the Notice of Value is valid; on a conventional loan the lender decides. Ask the loan officer.
- **Does the lender's review stop the contract clock?** No. In Utah the buyer's right to cancel over the appraisal ends at 5:00 PM Mountain Time on the contract deadline. If the review won't finish in time, get an extension signed first or decide by then.
- **Does it work outside Utah?** Yes. It takes the appraisal condition and deadline from your uploaded contract and says state rules weren't checked. The loan program rules (Fannie Mae, Freddie Mac, FHA, VA) are national.

## Practice Prompt

Attach the three files from `low-appraisal-response-practice.zip` and say: **"Pretend today is Sunday, November 8, 2026. I represent the buyers, Jordan and Casey Example, on 4127 W Practice Ridge Dr. The appraisal came back at $612,000 on our $640,000 contract, and their lender is Make-Believe Mortgage Co. Here's the appraisal, the REPC with its addendum, and my CMA export. What are our options, and is there anything worth sending to the lender?"** (The "pretend today" line keeps the made-up deadline from having already passed.) The sample on this page is what came back.

## Suggested Library Keywords

low appraisal, appraisal came in low, appraisal gap, reconsideration of value, ROV, appraisal appeal, appraisal rebuttal, Notice of Appraised Value, VA Notice of Value, Tidewater, FHA appraisal, conventional appraisal, comparable sales, basement square footage, above grade, gross living area, appraisal deadline, Utah REPC, appraisal condition, buyer's agent, listing agent

## Tested and Not Tested

**Tested (2026-11-08), with made-up files:**
- Practice run on the three practice files: 10 of 10 checks. It found the two comparables whose basements were counted as above-grade area (their grid square footage equals the MLS above-grade plus basement total), picked three closer sales in the subject's subdivision that closed before the effective date, applied the made-up appraisal gap term (and caught that a value that moves only part of the way could end the buyers' right to cancel), and kept the lockbox code and private remarks out.
- Eval 1, a Utah November 2026 REPC with the Appraisal Deadline two days out and a report whose grid calls a 980 sq ft finished basement unfinished while its own sketch and photos show it finished: 10 of 10. A no-skill answer to the same files passed 1 of 10: it told the agent to contact the appraiser, asked the lender for a value near the price, promised the value would come up, gave the cash to cover the gap as a flat figure without the lender, and missed the deadline's time, the complete-copy rule and the $4,000 a later financing cancellation would cost.
- Eval 2, the listing side of an FHA deal on the December 2024 REPC, with comparables 2.14 to 3.42 miles away and closer sales in the CMA: 9 of 9, including FHA's current reconsideration rule (the 2024 borrower-initiated rules were rescinded in March 2025), the FHA/VA Loan Addendum's walk-away right, and the sellers' bottom line kept out of the data package.
- Eval 3, a well-supported VA appraisal in Idaho where the buyers wanted to fight it: 9 of 9. General mode, a plain "well supported" call, no padded request, VA's process and the cash rule for paying over reasonable value.
- A written routing check against the other descriptions: "The appraisal came in $20,000 short, what now?", "The lender says the VA appraiser called a Tidewater" and "Can we appeal this appraisal?" land here; "Should my buyer offer to cover an appraisal gap?" (a new offer) belongs to Offer Strategy, "The seller sent an addendum dropping the price to the appraised value, what changes?" belongs to Counter Explainer, and "Our buyer walked after a low appraisal, what should we relist at?" belongs to Pricing Conversation Prep. The description scopes the triggers to "an agent with a home under contract" and names Offer Strategy (appraisal terms in a new offer) and Pricing Conversation Prep (a list or relist price) as the places to go instead.
- An independent review (2026-11-08) reran the practice files and Eval 2 from the skill alone and matched every check. It found one error, now fixed: the skill said covering the gap raises the buyer's cash by "at least the gap." It doesn't have to. The lender figures the loan-to-value on the lower of price and appraised value, so the buyer brings more cash, borrows a larger share of the value, or both, and the loan officer gives the figure. The drafts now say that.
- Every run passed the scripted checks: no em or en dashes, Title Case subjects, a "Check before sending" section, no agent-only fields or codes, no protected-class language, no criticism of the appraiser or promised value change, and every dollar amount traced to the files or shown as arithmetic.

**Not tested:**
- Real appraisals from Utah Life (waiting on redacted copies from Connor), real lender ROV forms, and real appraisal software output, which runs longer than the 8-page made-up reports.
- A report in the redesigned UAD 3.6 format from a real lender (the made-up files imitate both layouts), and scanned, image-only PDFs.
- The ChatGPT Project version in ChatGPT itself; its instructions match the Claude skill step for step.
- Creating a Gmail draft.
- The description against all 17 skills installed at once. It names Pricing Conversation Prep, Offer Strategy, Repair Request Response and Counter Explainer as the siblings to use instead.
- A contract with the appraisal condition unchecked, a cash buyer, a USDA loan, and a "subject to" repairs appraisal.

## Sources (all checked 2026-11-08)

- Claude file uploads: https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Claude skills, install path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Claude skills work on web, desktop and mobile once added: https://claude.com/docs/extend/overview
- Claude code execution setting and defaults: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude Google Workspace connectors: https://support.claude.com/en/articles/10166901-use-google-workspace-connectors and https://claude.com/docs/connectors/google/gmail
- Claude Gmail connector listing (create_draft): https://claude.com/marketplace/connectors/gmail
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Team and Enterprise not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (creating, instructions, file limits): https://help.openai.com/en/articles/10169521-projects-in-chatgpt and https://learn.chatgpt.com/docs/projects
- ChatGPT Free upload limit: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- ChatGPT pages per message and plans with Projects: https://chatgpt.com/pricing
- ChatGPT training setting: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- ChatGPT thumbs up or down after opting out: https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance
- Custom GPT retirement: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- UtahRealEstate.com, CMA Steps: https://help.utahrealestate.com/index.php/knowledge-base/cma/how-to-guides-cma/cma-steps/
- UtahRealEstate.com, Exporting MLS Listings: https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/how-to-export-listings-in-a-custom-report/
- Flexmls Help, Export Search Results: https://help.flexmls.com/en/export-search-results.html and Save a CMA as a PDF: https://help.flexmls.com/en/save-a-cma-as-a-pdf.html
- Regulation B, the buyer's copy of the appraisal (12 CFR 1002.14): https://www.ecfr.gov/current/title-12/chapter-X/part-1002/section-1002.14
- Reconsideration of value rules (Fannie Mae, Freddie Mac, FHA, VA), Regulation Z valuation independence, second appraisals and report formats: see the skill's `references/rov-programs.md`
- Utah REPC versions, the appraisal condition and the FHA/VA Loan Addendum: see the skill's `references/utah-appraisal.md`
- help.openai.com pages block direct fetching; their facts come from Amplified's vendor check of 2026-11-08.
