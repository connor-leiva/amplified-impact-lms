# Page Notes: New Construction Review (/new-construction-review)

Skill: `new-construction-review`, version 1.0. Claude and ChatGPT. Every fact below was checked on 2026-11-08; sources are at the end, and the skill's own facts are in `references/review-guide.md`, `references/lender-incentives-respa.md` and `references/utah-new-construction.md`, plus the shared files it ships with (`utah-repc.md`, `utah-repc-2026.md`, `utah-forms-and-counters.md`, `utah-property-notes.md`, `buyer-agreements.md`).

## One-Line Promise

Upload the builder's purchase agreement and its addenda before your buyer signs, and get the money at risk step by step, every term the builder wrote differently from a resale contract, the incentive's real conditions, and the questions to ask the builder and an attorney.

## Who It's For

Buyer's agents with a client buying a new build: a to-be-built home on a lot, a home under construction, or a finished spec or quick move-in home. Built for Utah: it compares the builder's form with the Utah REPC (the November 1, 2026 form, which is the only one allowed from January 1, 2027, or the December 4, 2024 form if your brokerage still uses it), and it knows Utah's public infrastructure district disclosure, construction lien timing, defect claim time limits and reinvestment fee cap. It works in any other state in general mode, where it uses only your documents, says state rules weren't checked, and still applies the federal rules (RESPA on builder-affiliated lenders, and the federal land sales act's two-year completion exemption).

## What to Upload, and Where Each File Comes From

1. **The builder's purchase agreement (required)**, with every addendum and exhibit: the incentive or promotion addendum, option or design selections, deposit schedule, lot reservation, and any Affiliated Business Arrangement Disclosure. Ask the builder's sales consultant for the complete document as one PDF, with every addendum and exhibit, before your buyer signs. If the builder sent it for e-signature, still ask for the full PDF rather than working from the signing screen. Builders often refer to documents they deliver later (a warranty booklet "at Closing," the CC&Rs); the skill lists each one that's missing so you can ask for it now.
2. **Plat notes or a special district disclosure (recommended).** The recorded plat's general notes show easements, soils notes and any special district. Ask your title officer for the recorded plat and the documents listed in the title commitment, or get the plat from the county recorder by the entry number the contract gives. Outside Utah, the builder may hand you a district disclosure (in the eval, Colorado's metro district); upload it as is.
3. **HOA documents and the title commitment (optional),** if you have them.
4. **Just tell it** what the sales rep promised, which lender your buyer wants, when you registered the buyer with the builder, and the signing or lot hold deadline. No form to fill in.

**Privacy before you upload:** builder contracts carry your buyer's names and sometimes loan details. Turn off model training first if you haven't: in Claude, Settings > Privacy > Help Improve our AI models (Free, Pro, Max, Ultra; Team and Enterprise chats aren't used for training by default); in ChatGPT, Settings > Data controls > Improve the model for everyone. The skill leaves loan and account numbers out of everything it writes and never repeats wiring instructions.

## Things to Say

- "My buyers want to sign this builder contract by Friday. What should I flag before they do?"
- "The builder is offering $15,000 if they use the builder's lender. My buyers have a credit union preapproval. Explain the incentive and what to ask."
- "Here's the purchase agreement and the plat. Is there a special district on this lot, and what does it cost?"
- "The sales rep says they'll fix anything our inspector finds. Is that in the contract?"
- "What does this builder contract lack compared with the REPC?"
- "This one's in Colorado. Same review, please."

## What Comes Back

A bottom line with the top three risks and their dollar amounts or dates; the documents it read (and the ones the contract refers to that you didn't upload); a money-at-risk table showing every deposit, option and change order payment, who holds it, when it turns nonrefundable and the running total; every key term as the contract writes it, with the page (price and escalation, completion and delays, change orders, inspection rights, walkthrough, warranty, arbitration, financing and appraisal, HOA, special districts, agent registration, default); the incentive's conditions with the dollar difference and the RESPA questions; what the builder's form lacks next to the REPC, section by section; the lot, HOA and district notes; questions for the builder's rep; a short list for a real estate attorney; key dates labeled for strategy; a buyer email; and "Check before sending," tracing every number to its page.

## What It Won't Do

- Give legal advice, say a clause is enforceable or unenforceable, or draft contract language. Contract changes go to a real estate attorney; the skill writes the list for one.
- Tell your buyer which lender to use, say whether an incentive is worth it, or compare rates. It describes the conditions and the dollar difference in the documents; the buyer's lenders lay out the full cost, and the buyer decides.
- Say a builder violated RESPA. It turns RESPA's rules into questions and attorney items.
- Estimate a tax, a district levy, a repair or an upgrade cost. Every number comes from your documents or is shown as math on them.
- Tell your buyer whether to sign.
- Keep the official deadline calendar. Its dates are for strategy; confirm them with your transactions team.
- Repeat wiring instructions or account numbers.
- Send anything. Drafts only.
- Review an inspection report, including a pre-drywall or final inspection on a new build (that's Due Diligence Review), recommend offer terms from an MLS sheet and comps (Offer Strategy), explain one counteroffer on a REPC (Counter Explainer) or answer a low appraisal (Low Appraisal Response).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. Code execution ("Code execution and file creation," called "Create and edit files" in the updated layout) is on by default on Free, Pro, Max and Ultra. On Team and Enterprise, an Owner controls skills and code execution.
- **No connectors.** Gmail is optional, only to save the buyer email as a draft when you ask. Claude's Help Center says the Gmail connector can draft email; Claude's docs page for Gmail calls it read-only. If drafting isn't offered, copy the email from the chat.
- **ChatGPT instead:** a Project, on any plan that has Projects (Free, Go, Plus, Pro). The project holds 4 files, inside Free's limit of 5 files per project.
- **No cost** beyond your Claude or ChatGPT plan. The attorney review the skill recommends is the buyer's own cost and choice.

## Install

- **Claude:** download `new-construction-review.zip` and don't unzip it. Go to Customize > Skills, click +, then + Create skill, select Upload a skill, and choose the ZIP. Make sure it's toggled on, then start a new chat and attach your files.
- **ChatGPT:** download `new-construction-review-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Open the more options menu (•••), select Project settings, and paste the text from `paste-into-instructions.txt`, with your voice profile quick card under the last line. Add the four .md files to the project's Sources tab. Then start a chat in the project and attach the builder's documents. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Run / Draft / Own

- **Run:** reading every page of the contract, addenda, plat and disclosures; building the money table; the date and dollar math; comparing the form with the REPC or the standard protections; checking the RESPA points.
- **Draft:** the questions for the builder's rep, the attorney list and the buyer email, for you to read and change first.
- **Own (you, your buyer, their attorney and lender):** whether to sign, every dollar and option choice, the lender choice, any change to the contract (the attorney), loan terms and incentive limits (the lender), title, lien and district questions (the title company), and wiring (only with the title company directly).

## FAQs

- **Can the builder make my buyer use its lender?** RESPA allows a builder to refer buyers to a lender or title company it owns only under conditions, including a written Affiliated Business Arrangement Disclosure with estimated charges and no requirement to use that provider. An optional, true discount for using it isn't treated as a requirement. Separately, a seller may not require a buyer to buy title insurance from a particular title company as a condition of the sale. The skill checks the documents against those rules and lists anything that looks like a requirement for the attorney; it doesn't decide whether a rule was broken.
- **What's a public infrastructure district?** In Utah, a special district that can levy a property tax on property inside it to repay bonds for public infrastructure. It shows up in a plat note or a recorded notice. Since May 6, 2026, the seller must disclose the expected annual cost at or before closing; the skill tells you to ask for that number before your buyer signs.
- **Does it work with the new Utah REPC?** Yes. It compares the builder's form with the November 1, 2026 REPC by default (required from January 1, 2027) and uses the December 4, 2024 form's section numbers only if you say your brokerage still uses it.
- **Will it tell my buyer not to sign?** No. It shows what's at risk and what's different, recommends attorney review before signing, and leaves the decision with your buyer.
- **Does it work outside Utah?** Yes, in general mode: the same review from your documents, a standard list of buyer protections instead of the REPC, the federal rules, and a note that state rules weren't checked.

## Practice Prompt

Attach all three practice files (`01 New Home Purchase Agreement - Lot 47 Make-Believe Meadows.pdf`, `02 Preferred Lender Incentive Addendum - Lot 47.pdf` and `03 Final Plat Notes - Make-Believe Meadows Phase 2.pdf`, from the practice ZIP) and say:

**"My buyers, Casey and Morgan Practiceton, want to sign Placeholder Peak Homes' contract for Lot 47 in Make-Believe Meadows before the lot hold runs out Friday. They'd rather use their credit union than the builder's lender. I registered them at the sales center on their first visit, October 24. The sales rep told them the builder 'always fixes anything the inspector finds.' We're in Utah. Can you review the purchase agreement, the incentive addendum and the plat notes and draft an email to them? Today is November 8, 2026."**

Everything in the files is made up. The sample on this page is what that prompt returned.

## Suggested Library Keywords

new construction, builder contract, new build, to-be-built, spec home, quick move-in, lot reservation, builder purchase agreement, builder incentive, preferred lender, builder's lender, RESPA, affiliated business disclosure, earnest money, nonrefundable deposit, design center, upgrades, change orders, pre-drywall inspection, builder warranty, arbitration, public infrastructure district, PID, special district, metro district, plat, HOA, REPC, buyer email

## Tested and Not Tested

**Tested (2026-11-08), following SKILL.md 1.0 on made-up files, each graded in `evals/runs/<case>/grading.md`:**
- Eval 1, a Utah to-be-built home with $62,400 in nonrefundable deposits paid to the builder, binding arbitration before an arbitrator the builder picks, a one-year claim limit, unlimited completion extensions, a 4% price escalation and a sales rep's verbal promise, with the signing deadline two days out: 10 of 10. It flagged the deadline first, built the money table with running totals, compared the form with the November 2026 REPC section by section, sent the arbitration, warranty waiver, claim limit and federal two-year completion question to the attorney list without legal conclusions, and set the rep's promise against the contract's "no oral statements" clause.
- Eval 2, a Utah quick move-in with a $20,000 incentive tied to the builder's lender and title company ($5,000 otherwise) and an unsigned Affiliated Business Arrangement Disclosure: 9 of 9. It showed the $15,000 difference and every condition, never advised on the loan, and caught that the purchase agreement has the buyers buy the lender's title policy from the builder's affiliate while the disclosure says they aren't required to use it, quoted next to RESPA Section 9 for the attorney. A no-skill baseline on the same files passed 1 of 9: it told the buyers the bigger incentive "wins," declared the arrangement legal, missed the title clause, the unsigned disclosure and the missing warranty guide, and wrote an email with em dashes, "Great news" and "don't hesitate to reach out."
- Eval 3, a Colorado to-be-built home inside a metropolitan district: 9 of 9. General mode with no Utah references; the district's levies, bonds and fees as the disclosure states them, its own tax example quoted rather than a new estimate, and the real numbers routed to the county, the title company and the district.
- Practice run: 12 of 12. It is the sample on this page.
- Independent review (2026-11-08): a second reviewer ran eval 1 and the practice files from scratch before reading these results, and both runs passed every check (`evals/runs/<case>/review-output.md`). The review added two checks to the skill (whether a refund on builder default covers option and design payments or only "deposits," and a date-triggered price increase read next to the builder's own completion estimate), fixed the sample email's wiring line to say to call the title company at a number you look up yourself, and tightened the description so offer terms from comps, inspection reports and low appraisals go to the sibling skills.
- Objective checks on every run (`evals/make/objective_checks.py`): every number not in the documents is shown as computed, weekdays match the calendar, no dashes, Title Case subjects, Check before sending present, no banned phrases, account numbers, cost estimates or loan advice.
- `node scripts/skills.mjs check new-construction-review` passes.

**Not tested:**
- Real builder contracts (none provided yet). The fixtures are shortened, made-up forms; real builder agreements run longer, and the skill reads every page, but long scanned contracts weren't tried.
- The UAR members-only New Construction REPC and Change Order Addendum (their terms weren't reviewed).
- The ChatGPT Project version in ChatGPT itself (the instructions mirror the skill; the click paths are from OpenAI's help center).
- Upload on a Claude Free plan, and the Gmail draft step.
- A collision check with all 17 skills installed. The reviewer checked routing by reading every sibling description against five prompts: three that belong here (a builder contract before signing, a builder incentive addendum with a preferred lender, a plat with a special district on a to-be-built lot) and two that don't (what to offer on a spec home listed in the MLS, which goes to Offer Strategy; a pre-drywall inspection report on a new build under contract, which goes to Due Diligence Review). The description now names Offer Strategy, Due Diligence Review, Counter Explainer and Low Appraisal Response. This was reasoned from the descriptions, not run with every skill installed.
- Not verified anywhere: other state special district rules (general mode says state rules weren't checked), loan program limits on builder incentives beyond Fannie Mae's guide (the lender confirms), and whether a particular builder arrangement complies with RESPA (an attorney's call).

## Sources (checked 2026-11-08)

- Skills upload path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default, and its name in the updated layout: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Gmail connector (Help Center, drafting) and Claude docs (read-only): https://support.claude.com/en/articles/10166901-use-google-workspace-connectors and https://claude.com/docs/connectors/google/gmail
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings ; commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (New project, ••• > Project settings, 5 files per project on Free): https://help.openai.com/en/articles/10169521-projects-in-chatgpt (from search results; blocked to direct fetch)
- ChatGPT project files on the Sources tab (release note, February 23, 2026): https://help.openai.com/en/articles/6825453-chatgpt-release-notes and https://learn.chatgpt.com/docs/projects
- ChatGPT data controls (Settings > Data controls > Improve the model for everyone): https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt (from search results)
- Custom GPT retirement: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq (from search results)
- ChatGPT plans with Projects: https://chatgpt.com/pricing
- RESPA Sections 8 and 9: https://www.law.cornell.edu/uscode/text/12/2607 and https://www.law.cornell.edu/uscode/text/12/2608
- Regulation X, affiliated business arrangements and "required use": https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-B/section-1024.15 and https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-A/section-1024.2
- CFPB, Contact multiple lenders: https://www.consumerfinance.gov/owning-a-home/explore/contact-multiple-lenders/
- Interstate Land Sales Full Disclosure Act exemptions: https://www.law.cornell.edu/uscode/text/15/1702
- Utah Code 57-1-49 (PID annual cost disclosure) and Title 17D, Chapter 4: https://le.utah.gov/xcode/Title57/Chapter1/57-1-S49.html and https://le.utah.gov/xcode/Title17D/Chapter4/17D-4.html
- Utah REPC, November 1, 2026 (UAR clean copy): https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/REPC-Final-Clean-Copy-10.14.2026-with-Watermark.pdf ; December 4, 2024: https://commerce.utah.gov/wp-content/uploads/2023/03/purchase-contract.pdf ; UAR notice: https://utahrealtors.com/realtor/review-of-repc-updates-and-changes-to-related-forms/
