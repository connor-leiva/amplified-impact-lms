# Page Notes: Offer Strategy (/offer-strategy)

Skill: `offer-strategy`, version 1.0. Claude and ChatGPT. Every fact below was checked on 2026-11-08; sources are at the end, and the skill's own facts are in `references/offer-terms.md`, `references/comp-method.md` and `references/utah-offer-terms.md`, plus the shared Utah files it ships with (`utah-repc.md`, `utah-repc-2026.md`, `utah-forms-and-counters.md`, `utah-pricing-context.md`, `buyer-agreements.md`).

## One-Line Promise

Upload the listing's MLS sheet, your comps and your buyer's preapproval letter, and get a recommended offer, term by term, with the risk behind each term in plain dollars and an email your buyer can actually follow.

## Who It's For

Buyer's agents writing an offer, from a first-time buyer's first offer to a highest-and-best round. Built for Utah: it knows both REPC versions in use right now (the December 4, 2024 form and the November 1, 2026 form, which is the only one allowed from January 1, 2027), uses the section numbers of the form you're writing on, and knows how the FHA/VA Loan Addendum, the sale-of-home condition and seller concessions work on each. It works in any other state in general mode, where it uses only your files and says state rules weren't checked.

## What to Upload, and Where Each File Comes From

1. **The listing's MLS sheet with its price history (required).**
   - **UtahRealEstate.com:** open the listing in the Agent Full Report. Click the History link to the right of the Tax ID to open the Property Activity Report (list price and status changes, prior listings, DOM resets), then click the Adobe symbol in its top right corner for the full report as a PDF. Upload both. (UtahRealEstate.com, "View Listing History.")
   - **Flexmls MLSs (outside Utah):** open the listing, click the History link on the Detail tab, and expand the rows to see each price change (Flexmls Help, "View Listing History"). Then save the listing report and its history as a PDF from your browser; any PDF that shows the status and price history works.
   - The skill reads the agent-only remarks for strategy but never puts them in anything for your buyer.
2. **Your comps (required).** A CMA report as a PDF, or an MLS export as a CSV, with sold prices and close dates.
   - **UtahRealEstate.com, CMA:** search for comparable properties (the CMA tab has Create New), review them in the Agent Full Report, then take your chosen comps into the CMA Report. (UtahRealEstate.com, "CMA Steps.")
   - **UtahRealEstate.com, CSV export:** from the search results, select the listings, choose Export Report from the Reports dropdown, answer the security question, pick Standard or Custom, choose CSV and select Download. Up to 600 listings per export. (UtahRealEstate.com, "Exporting MLS Listings.")
   - **Flexmls:** run the search, click the More menu (three dots), then Export, choose all or selected matches, keep Generic Text Export (a .csv), enter the verification code and click Export. (Flexmls Help, "Export Search Results.")
3. **Your buyer's preapproval letter (recommended).** Ask the lender for the current letter. If it shows a loan or account number, the skill leaves it out; better still, ask the lender for a version without them. The CFPB notes that lenders use "prequalification" and "preapproval" differently and that neither is a guaranteed loan offer, so the skill reports what the letter says was verified.
4. **Just tell it** what the listing agent told you (offer deadline, highest and best, the seller's dates), your buyer's top number, your usual earnest money, and which REPC form you're on. No form to fill in.

**Privacy before you upload:** MLS sheets carry agent-only remarks and lockbox codes, and lender letters carry your buyer's financial details. Turn off model training first if you haven't: in Claude, Settings > Privacy > Help Improve our AI models (Free, Pro, Max, Ultra; Team and Enterprise chats aren't used for training by default); in ChatGPT, Settings > Data controls > Improve the model for everyone. Check your MLS's rules on using MLS data in outside tools with your MLS or broker.

## Things to Say

- "My buyers want to write on [address]. Here's the MLS sheet, my CMA and their preapproval. What should we offer?"
- "Highest and best is due Monday at 6. My FHA buyers can go to $510,000. Should they waive the appraisal or escalate?"
- "This one's been sitting 60 days with two price cuts. How far under list can we go, and how much can we ask for in closing costs?"
- "My buyer wants to waive the appraisal to stand out. Is that a good idea with her letter?"
- "We're on the new November 2026 REPC. Which boxes do I check and what deadlines do I write?"

## What Comes Back

A bottom line (the recommended price, the three terms that matter most, and how competitive the offer is), a read of where the listing stands (days on market against the comps, price cuts, the listing agent's instructions) with a Competitive, Balanced or Buyer Leverage call, the closest comps in a table with the supported range and a specific offer price, every term in a table with a reason and the section number on your form (price, earnest money, due diligence, appraisal and financing deadlines, settlement, possession, appraisal and financing protection, concessions, sale of home, escalation, FHA repairs, lead-based paint when it applies), the dates counted from Acceptance and labeled for strategy, a risk ledger showing what each competitive term gives the seller and risks for your buyer in dollars, questions for the listing agent, a buyer email, and a "Check before sending" list tracing every number.

## What It Won't Do

- Decide for your buyer. It recommends; your buyer decides the price and every term.
- Recommend waiving an appraisal or financing protection without showing the dollar risk and saying the lender must confirm the cash, or recommend it at all when the letter shows the cash isn't there.
- Tell an FHA or VA buyer that checking "no appraisal condition" is a real waiver. The FHA/VA Loan Addendum keeps their right to walk if the price is over the appraised value.
- Draft escalation or appraisal-gap clauses. Utah has no state-approved escalation form; the language comes from your brokerage's approved addendum, and your broker reviews it.
- Write or use a buyer "love letter." It advises against one, and nothing about your buyer's family or background goes into the plan.
- Quote a "typical" due diligence length, earnest money amount or concession cap. Those come from your files, your team leader or the lender.
- Put agent-only MLS remarks, lockbox codes, loan or account numbers in anything your buyer sees, or reveal your buyer's top number to the listing side.
- Keep the official deadline calendar. Its dates are for strategy; confirm them with your transactions team.
- Send anything. Drafts only.
- Price a listing (that's Pricing Conversation Prep), compare offers a seller received (Offer Comparison), explain a counter (Counter Explainer), review a builder's contract on a new build (New Construction Review), prep a showing tour (Showing Tour Prep) or answer a low appraisal under contract (Low Appraisal Response).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. Code execution ("Code execution and file creation," called "Create and edit files" in the updated layout) is on by default on Free, Pro, Max and Ultra. On Team and Enterprise, an Owner controls skills and code execution.
- **No connectors.** Gmail is optional, only to save the buyer email as a draft when you ask.
- **ChatGPT instead:** a Project, on any plan that has Projects (Free, Go, Plus, Pro). The project holds 4 files, inside Free's limit of 5 files per project. OpenAI's Free tier FAQ says Free users can upload 3 files a day, so on Free, adding the project's four files and attaching your three working files can take more than one day. Data analysis on Free has its own limit, which OpenAI doesn't publish; ChatGPT tells you when you hit it.
- **No cost** beyond your Claude or ChatGPT plan and the MLS access you already have.

## Install

- **Claude:** download `offer-strategy.zip` and don't unzip it. Go to Customize > Skills, click +, then + Create skill, select Upload a skill, and choose the ZIP. Make sure it's toggled on, then start a new chat and attach your files.
- **ChatGPT:** download `offer-strategy-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Open the more options menu (•••), select Project settings, and paste the text from `paste-into-instructions.txt`, with your voice profile quick card under the last line. Add the four .md files in the project's Sources section (project files moved there from Project settings in February 2026). Then start a chat in the project and attach your files.

## Run / Draft / Own

- **Run:** reading the MLS sheet, price history, comps and preapproval letter; sorting the comps; the math (days on market against the comp set, sale-to-list, price per above-grade square foot, prices after concessions, the appraisal gap, the dates from Acceptance).
- **Draft:** the term table, the risk ledger, the questions for the listing agent and the buyer email, for you to read and change first.
- **Own (you and your buyer):** the price and every term, every waiver, the earnest money and concession amounts, any escalation (with your broker), and every money conversation. The lender confirms the cash and the concession limit; your transactions team owns the official dates.

## FAQs

- **Should my buyer waive the appraisal to win?** That's your buyer's choice. The skill shows the gap in dollars (your offer minus the highest closed sale) against the cash their letter shows, and it won't recommend a waiver unless the lender confirms the cash. For FHA and VA, it explains why "waiving" doesn't really change anything for the seller.
- **Which REPC does it use?** The one you tell it you're writing on. Until December 31, 2026 that can be the December 4, 2024 form or the November 1, 2026 form; from January 1, 2027 only the new one. The section numbers differ (the new form has separate Appraisal and Financing Deadlines and a seller closing-cost line in Section 2.2), and the skill never mixes them.
- **Will it write an escalation clause?** No. It gives you the numbers (start, increment, cap) and tells you to use your brokerage's approved addendum with your broker's review. Utah has no state-approved escalation form.
- **What if I don't have a preapproval letter yet?** It still recommends the terms, uses placeholders for anything the lender has to answer (days for the appraisal and loan, concession limits), and tells you what to ask.
- **Does it work outside Utah?** Yes, in general mode: same comp method and risk ledger, plain term names, no Utah sections, and a note that state rules weren't checked.

## Practice Prompt

Attach all three practice files (`01 MLS Agent Full Report - 2286 E Pretend Poppy Ln.pdf`, `02 CMA Export - 2286 E Pretend Poppy Ln.csv` and `03 Preapproval Letter - Riley and Jordan Exampleton.pdf`, from the practice ZIP) and say:

**"My buyers, Riley and Jordan Exampleton, want to write on 2286 E Pretend Poppy Ln. We're on the new November 2026 REPC. Their top number is $565,000. The listing agent says there are no offers yet and they're reviewing as they come in. Our team usually puts down $5,000 earnest money. If we get acceptance Tuesday, November 10, what should we offer? The MLS sheet, CMA export and their preapproval letter are attached."**

Everything in the files is made up. The sample on this page is what that prompt returned.

## Suggested Library Keywords

offer, write an offer, buyer offer, offer price, how much over list, under list, multiple offers, highest and best, escalation clause, appraisal gap, waive appraisal, earnest money, due diligence period, seller concessions, closing costs, FHA offer, sale of home contingency, REPC, new REPC 2026, preapproval letter, comps, risk ledger, buyer email

## Tested and Not Tested

**Tested (2026-11-08), following SKILL.md 1.0 on made-up files:**
- Eval 1, a 3-day-old listing priced at the top of the comps, four offers in a highest-and-best round, an FHA buyer, the December 4, 2024 REPC: 8 of 8. It recommended a price inside the buyers' limit with the $7,000 gap to the highest sale shown, explained that the FHA/VA Loan Addendum keeps the buyers' right to walk so a "waiver" isn't one, gave escalation numbers without drafting a clause, used only 2024 section numbers, and caught the 1971 build's lead-based paint window. A no-skill baseline on the same files passed 0 of 8 (2 partial): it recommended waiving the appraisal or a $10,000 gap guarantee with no lender check, drafted its own escalation clause, told the buyers the agent-only "seller prefers conventional or cash," suggested a buyer letter, and priced off total square footage.
- Eval 2, a 60-day listing with two price cuts, a sale-of-home buyer, the November 1, 2026 REPC: 8 of 8 after fixing three arithmetic and wording slips in the first draft. It recommended below list with a Section 2.2 concession at the lender's estimate, kept the sale-of-home condition with Section 3(d) and the addendum, built separate Appraisal and Financing Deadlines from the letter, and moved a Sunday Financing Deadline to Monday because the new form's weekend rule doesn't cover it. A line now tells the skill to check every "highest" or "closest" claim and every subtraction in code.
- Eval 3, an Idaho buyer who wanted to waive the appraisal at $485,000 with about $3,800 in reserves, a loan number on the letter, and a buyer letter about her family: 8 of 8 after one fix (general mode now says nothing about Utah at all). It recommended against the waiver with the $15,000 gap shown, kept the loan number and the letter's contents out, and flagged that the preapproval expires before a 30-day close.
- Practice run: 12 of 12 after one fix (the highest sale was misread). It is the sample on this page.
- Independent review (2026-11-08): a reviewer ran Eval 2 and the practice files from scratch before reading the builder's outputs. Both passed (8 of 8 and 12 of 12), with the same position calls as the builder's runs and recommended prices within $2,000 of them. The review found that two buyer emails asked for answers by an hour that wasn't in the inputs ("Monday At 3:00 PM", "Monday At 6:00 PM"); the skill now uses the offer deadline, the agent's timing or a [time] placeholder, and the sample on this page was updated. It also added New Construction Review to the description's list of skills this one is not for, told the skill to set financing and settlement dates after a buyer's home sale can close when the loan depends on it, and corrected one source attribution (the NAR article on buyer letters).
- Routing, written out (not run with all 17 skills installed): three prompts that should land here (an FHA buyer asking what to offer from an MLS sheet and comps; a highest-and-best round asking whether to escalate or waive the appraisal; a 75-day listing with three cuts asking how far under list the buyers can go) and near-misses that belong elsewhere (several offers on the agent's own listing go to Offer Comparison; the seller's counter to the buyers' offer goes to Counter Explainer; a builder's purchase agreement on a spec home goes to New Construction Review).
- `node scripts/skills.mjs check offer-strategy` passes.

**Not tested:**
- Real Utah Life MLS sheets, CMAs and lender letters (none provided yet), and real Flexmls, Matrix or Cloud CMA files.
- The ChatGPT Project version in ChatGPT itself (the instructions mirror the skill; the click paths are from OpenAI's help center).
- Upload on a Claude Free plan, and the Gmail draft step.
- Collision check with all 17 skills installed together (the description names its six nearest siblings).
- Not verified anywhere: a primary source for typical Utah due diligence lengths, FHA, VA and USDA concession limits, and the terms of the UAR members-only addenda (sale of buyer's property, closing costs, short-term leaseback). The skill writes these as placeholders or "confirm with your broker, team leader or lender."

## Sources (checked 2026-11-08)

- Skills upload path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default, and its name in the updated layout: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings ; commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (New project, ••• > Project settings, 5 files per project on Free): https://help.openai.com/en/articles/10169521-projects-in-chatgpt
- ChatGPT project files in the Sources section: https://learn.chatgpt.com/docs/projects (and the February 23, 2026 release note: https://help.openai.com/en/articles/6825453-chatgpt-release-notes)
- ChatGPT data controls (Settings > Data controls > Improve the model for everyone): https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- ChatGPT Free limits (3 file uploads per day; data analysis limit not published): https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- ChatGPT plans with Projects: https://chatgpt.com/pricing
- UtahRealEstate.com, View Listing History (Agent Full Report, History link, Property Activity Report): https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/how-to-view-the-listing-history/
- UtahRealEstate.com, CMA Steps: https://help.utahrealestate.com/index.php/knowledge-base/cma/how-to-guides-cma/cma-steps/
- UtahRealEstate.com, Exporting MLS Listings: https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/how-to-export-listings-in-a-custom-report/
- Flexmls Help, View Listing History: https://help.flexmls.com/en/view-listing-history.html ; Export Search Results (last modified December 19, 2024): https://help.flexmls.com/en/export-search-results.html
- CFPB, prequalification versus preapproval letters: https://www.consumerfinance.gov/ask-cfpb/whats-the-difference-between-a-prequalification-letter-and-a-preapproval-letter-en-127/
- Utah REPC, December 4, 2024: https://commerce.utah.gov/wp-content/uploads/2023/03/purchase-contract.pdf ; November 1, 2026 (UAR clean copy): https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/REPC-Final-Clean-Copy-10.14.2026-with-Watermark.pdf ; UAR notice: https://utahrealtors.com/realtor/review-of-repc-updates-and-changes-to-related-forms/
- FHA/VA Loan Addendum (2020): https://commerce.utah.gov/wp-content/uploads/2023/03/fha-va-loan-addendum.pdf ; (November 1, 2026, UAR copy): https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/FHA_VA-Addendum-Proposed-Watermarked.pdf ; HUD amendatory clause: https://www.hud.gov/sites/dfiles/SFH/documents/amendatory_clause_model_document.pdf
- NAR on buyer letters: https://www.nar.realtor/news/real-estate-news/law-and-ethics/give-buyer-clients-solid-reasons-to-skip-love-letters
