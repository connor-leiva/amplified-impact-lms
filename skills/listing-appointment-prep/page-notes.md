# Page Notes: Listing Appointment Prep (/listing-appointment-prep)

Skill: `listing-appointment-prep`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: in the Amplified Skill Library (agent set). Every fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Drop in your first-call notes, the seller's questionnaire and your listing presentation, and walk into the listing appointment with a one-page plan, the right questions, a marketing plan built for this house, a seller net sheet at your own price scenarios, and plain answers to "why you" and "what's your commission."

## Who It's For

Any listing agent the day before a listing appointment, solo or on a team. It covers everything except the price: price scenarios come from you, and the CMA work belongs to Pricing Conversation Prep. Works in Utah and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

Attach what you have. Nothing is required except something about the seller; whatever is missing becomes a marked placeholder, and nothing is filled in from guesswork.

- **Your first-call notes:** in Follow Up Boss, open the contact's profile and click the Notes tab on the timeline, which shows every note on the profile. Copy the note and paste it into the chat. (Follow Up Boss Help Center, "Lead Profile Overview," checked 2026-11-10.) If the call went through Follow Up Boss's own calling, its transcript and summary are on the timeline too (Follow Up Boss Help Center, "Call Transcripts and Summaries," checked 2026-11-08 for Appointment Follow-Up). Your own typed notes work the same way.
- **The seller questionnaire:** your own form, as the seller returned it (a PDF, a scan or an email reply).
- **The county record:** your county assessor's or recorder's parcel page for the address, printed or saved as PDF. Not checked county by county; every county site differs.
- **Prior MLS history:** the property's listing history from your MLS, printed to PDF. Not checked MLS by MLS.
- **Your marketing menu or listing presentation:** your own document (PDF, slides or text). It's the only place the skill takes services, vendors, stats, testimonials and your fee from.
- **Your numbers:** a page from your MLS production report or your presentation, with the period it covers. Team numbers are labeled as the team's.
- **A title or escrow fee sheet:** ask your title or escrow officer for a seller fee sheet or rate card for your county.
- **In your message:** the price scenarios you want on the net sheet, your fee and listing terms if they aren't in your presentation, and anything else you know.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). (Claude Help Center, "Uploading files to Claude," as checked 2026-11-10 for Open House Follow-Up.)

## Install

**Claude:** as every skill page says it (D-052): download `listing-appointment-prep.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on (Settings > Capabilities > "Code execution and file creation", "Create and edit files" in the updated layout); the skill uses it for the net sheet math. No connectors needed.

**ChatGPT:** download `listing-appointment-prep-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026. (OpenAI Help Center, as checked 2026-11-08 for the other skill pages.)

## Things to Say

- "Listing appointment Thursday with the Practicetons. Here's my FUB note, their questionnaire and my listing presentation. Prep me. Net sheet at $749,000 and $775,000."
- "I have a listing appointment tomorrow at 5:30. Everything's attached. My fee is 2.75%, six-month listing."
- "Just the net sheet, please, at these two prices."
- "They're going to ask what my commission is. Help me answer it. My fee is 2.5%."
- "They want to wait for spring, and her cousin is an agent. Help me with both."

## What Comes Back

Flags first, when they apply: missing inputs and placeholders, no price scenarios or fee given, conflicts between files (square footage from each source, with Utah's rule that the listing agreement names the source), an owner on title nobody mentioned or a decision maker who isn't on title, general mode outside Utah, and a line saying something was left out on purpose. Then a three-sentence bottom line; a one-page appointment plan with clock times; 8 to 12 questions that fill the gaps (motivation, timeline, what they need, who decides, the home, other options); a marketing plan built only from your menu, item by item, with the fact about the house that earns each one and what was left out; a seller net sheet at your scenarios with a source on every line, payoffs as the seller stated them, title charges read from the fee sheet, every open item as a placeholder, the math shown, and "Estimate, Not a Closing Statement" at the top; answers to six non-price objections in your words; what to bring; and a Check Before Sending list of every date, dollar amount, stat and quote with where it came from.

## What It Will Not Do

- Set, suggest or react to a list price, or use Zillow, the seller's number, the assessor's value or the last sale as a scenario. That's Pricing Conversation Prep.
- Call any commission standard, typical or usual, state another agent's rate, or repeat a rate the seller heard. It explains your own terms as you give them.
- Invent a service, vendor, stat, testimonial, sale or fee. Missing pieces stay placeholders.
- Criticize another agent, a brokerage or a seller's plan to sell on their own.
- Repeat a remark about who lives in or is moving into a neighborhood, or a claim about schools or safety.
- Ask for or repeat loan or account numbers. A payoff amount the seller gave is fine.
- Estimate taxes on the sale, or call the net sheet anything but an estimate.
- Send anything or write to your CRM.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on every plan; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors.
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit.
- **Your files:** notes, the questionnaire, your presentation, and a fee sheet from your title or escrow company if you can get one.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer.
- **Cost:** nothing beyond your plans.
- **Privacy:** seller questionnaires hold names, phone numbers and loan details. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls > "Improve the model for everyone"), as every skill page says.

## Run / Draft / Own

- **Run:** reads every file, lists each fact with its source, finds conflicts and owners on title, turns "Thursday" into a date, matches your menu to the house, and does the net sheet math in code.
- **Draft:** the plan, the questions, the marketing plan, the net sheet and the objection answers, for you to read and change first.
- **Own (you):** every price and scenario, your fee and its negotiation, the listing agreement, what the seller offers a buyer's agent (the seller's decision), the fair housing call, and the real payoff (the lender's statement, through title).

## FAQs

- **Why won't it suggest a list price?** Price belongs to the CMA and to you. Pricing Conversation Prep builds the range and the talk track from your comps. This skill uses only the scenarios you give it, so nothing on the net sheet reads as a promise of a price.
- **Why won't it say what a normal commission is?** Broker commissions are not set by law and are fully negotiable. Since August 17, 2024, NAR's MLS policy requires listing agreements to say so, conspicuously, and any payment to a buyer's agent needs the seller's written approval, with the amount, in advance. So the AI explains your fee as you state it and leaves every other number out.
- **Why is it stricter than the law?** It uses our conservative defaults. When commission comes up, it uses NAR's disclosure wording, "Broker commissions are not set by law and are fully negotiable," and never says or hints at a set or typical rate. You can calibrate this with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check Before Sending.
- **Can I give the net sheet to my seller?** Yes, once you've checked it. Every line says where it came from, it's titled an estimate, not a closing statement, and its footer says the real numbers come from the title company's closing statement and the lender's payoff statement.
- **What if I don't have a marketing menu or a fee sheet?** It still works. The marketing plan holds only the services you named in your notes or message, and the net sheet shows your fee, the payoff and placeholders for everything else, left out of the totals. Nothing is filled in from general knowledge.
- **Does it work outside Utah?** Yes, in general mode: NAR's policy, the Code of Ethics and federal fair housing still apply, and it tells you your state's rules weren't checked. The Utah notes (the UAR listing agreement, Utah's square footage source rule, the net listing ban and Utah's fair housing classes) switch on only for a Utah property.
- **My seller said something about who's moving into the neighborhood.** The AI leaves it out of everything and never uses it as a reason to sell. Federal and Utah fair housing law bar inducing a sale with talk about who is moving in. Questions go to your broker.

## Practice Prompt

Attach all five practice files from `listing-appointment-prep-practice.zip` and say: **"Listing appointment with Dana and Lee Practiceton on Thursday. I'm Riley Sampleton with Example Peak Realty. Prep me. For the net sheet, use $749,000 and $775,000, and show a buyer's agent line at 2% as an option."** The sample on this page is what came back on Tuesday, November 10, 2026, so "Thursday" became Thursday, November 12. Run on another day, the AI resolves "Thursday" to the next one, and the dates in the plan change with it.

## Suggested Library Keywords

listing appointment, listing presentation, listing appointment prep, seller appointment, pre-listing, seller net sheet, net sheet, estimated proceeds, title fee sheet, commission, what's your commission, buyer's agent compensation, NAR settlement, listing agreement, marketing plan, marketing menu, seller questionnaire, Follow Up Boss note, FSBO, wait for spring, objection handling, why you, county record, MLS history, square footage, fair housing

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run, a Cottonwood Heights, Utah two-story with all five files and two scenarios: 12 of 12 checks, 18 of 18 objective checks. It flagged Lee's mom, who weighs in but isn't on title, listed the three square footage numbers with Utah's source rule, kept the menu's paid ads but dropped their audience by who people are, kept Dana's Zillow number and the assessor's value out of the net sheet, matched the net sheet to the math script to the cent, and never repeated the commission rate Dana had heard.
- Eval 1, a 1972 Murray, Utah rambler with a team's plan, a different title company and an optional credit: 14 of 14 and 18 of 18. It caught a one-third owner on title the sellers never mentioned, left out open houses and drone photos with reasons, flagged the moving truck's 50-mile limit, labeled the team's numbers as the team's, added the lead-based paint disclosure, and left out a remark about who is moving into the neighborhood and a bank account.
- Eval 2, a Meridian, Idaho house with no menu and no fee sheet (general mode): 12 of 12, and 17 objective checks plus one resolved date graded by hand. The marketing plan held only the two services the agent named, the net sheet used only the fee, the payoff and placeholders, and the commission answer gave the agent's 2.5% without the neighbor's rates.
- Each run was graded against its expectations, with fixes recorded in its grading.md: one misattributed quote, one echoed word about rates, and one source cited to the wrong file.

**Not tested:**
- Real Follow Up Boss notes, real county records, real MLS history printouts and real Utah title fee sheets (the practice files follow their usual shape).
- A listing presentation as slides or a long PDF (the menus here were Markdown files).
- The ChatGPT Project in ChatGPT itself; its instructions match the skill step for step.
- A voice profile QUICK CARD, more than two price scenarios, a Utah home with an HOA, and a seller who has already signed with another agent.
- No no-skill baseline was run.
- The description against every skill installed at once. It names pricing-conversation-prep, appointment-follow-up, seller-listing-update, listing-description-writer and expired-fsbo-outreach as the siblings; seller-listing-update and expired-fsbo-outreach are being built at the same time.

## Sources

- NAR, Summary of MLS Policy Changes (Policy Statements 7.23, 8.11, 8.12, 8.13; effective August 17, 2024), checked 2026-11-10: https://cms.nar.realtor/sites/default/files/2024-09/mls-policy-changes-summary-2024-09-08.pdf
- NAR, Home Sellers: Here's What the NAR Settlement Means for You, checked 2026-11-10: https://www.nar.realtor/sites/default/files/documents/settlement-resource-for-home-sellers-2024-07-02.pdf
- NAR, What the NAR Settlement Means for Home Buyers and Sellers, checked 2026-11-10: https://www.nar.realtor/the-facts/what-the-nar-settlement-means-for-home-buyers-and-sellers
- NAR, 2026 Code of Ethics and Standards of Practice (Articles 12, 15, 16; Standards of Practice 1-3, 12-7, 15-2), checked 2026-11-10: https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- UAR, UAR forms update (the revised Exclusive Right to Sell Listing Agreement and Agency Disclosure), checked 2026-11-10: https://utahrealtors.com/realtor/uar-forms-update/
- UAR, UAR Forms Update, November 2024, checked 2026-11-10: https://utahrealtors.com/?p=32549
- UAR, NAR Lawsuit Settlement: Utah FAQs and Resources, checked 2026-11-10: https://utahrealtors.com/realtor/nar-lawsuit-settlement-utah-faqs-and-resources/
- Utah Admin. Code R162-2f-401a and R162-2f-401b (Cornell LII copies), checked 2026-11-10: https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401a and https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401b
- Utah Code 57-21-5 (effective May 6, 2026), checked 2026-11-10: https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html
- 42 U.S.C. 3604, checked 2026-11-10: https://www.law.cornell.edu/uscode/text/42/3604
- EPA, Real Estate Disclosures about Potential Lead Hazards (updated May 27, 2026), checked 2026-11-10: https://www.epa.gov/lead/real-estate-disclosures-about-potential-lead-hazards
- Follow Up Boss Help Center, Lead Profile Overview, checked 2026-11-10: https://help.followupboss.com/hc/en-us/articles/9538400649495-Lead-Profile-Overview
- Follow Up Boss Help Center, Call Transcripts and Summaries, checked 2026-11-08: https://help.followupboss.com/hc/en-us/articles/23799926737687
- Claude Help Center, Uploading files to Claude: https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Install steps, plans and training switches: as on the other skill pages (`skill-page.ts`, D-052), checked 2026-11-08
