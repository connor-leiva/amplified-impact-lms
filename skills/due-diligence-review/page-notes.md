# Page Notes: Due Diligence Review (/due-diligence-review)

Skill: `due-diligence-review`, version 1.1. Works in Claude (skill) and ChatGPT (Project). Every fact below was checked on 2026-11-08; sources are at the end and in the skill's references.

## One-Line Promise

Upload the inspection report and the rest of the due diligence stack, and get back what matters, what to ask the seller for, how much time is really left, and an email for your buyer.

## Who It's For

Buyer's agents with a home under contract and a due diligence or inspection deadline coming up. It reads both Utah REPC versions in use right now (the December 4, 2024 form and the November 1, 2026 form). Outside Utah it works from your uploaded contract and says it didn't check state rules. It is not for listing agents answering a buyer's repair request (use Repair Request Response), reading the seller's counter or addendum to your objection (use Counter Explainer), builder contracts (New Construction Review), or appraisals (Low Appraisal Response).

## What to Upload, and Where Each File Comes From

Upload the PDFs as you received them. You don't need to type anything they already say.

- **Home inspection report (required):** the PDF your inspector emailed you or let you download from their report link. Upload the full report, not just the summary page.
- **Seller property condition disclosure:** from the listing agent, or from your transaction file. In Utah it's one of the Seller Disclosures due by the Seller Disclosure Deadline (REPC Section 7 in the December 2024 form, Section 11 in the November 2026 form).
- **HOA documents:** CC&Rs and amendments, bylaws, rules, budget, reserve study, recent minutes, and the resale or payoff letter. They usually come from the HOA's management company, through the listing agent or the title company.
- **Specialty reports:** radon, sewer scope, roof, structural or HVAC, from whoever did the test.
- **Commitment for title insurance:** from the title company.
- **The signed purchase contract and every addendum:** from your transaction file. This is where the deadline comes from.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). Up to 20 files per chat; PDFs up to 1,000 pages. (Claude Help Center, "Uploading files to Claude," checked 2026-11-08.)

## Install

**Claude:** download `due-diligence-review.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. (Claude Help Center, "Use skills in Claude," checked 2026-11-08.) Code execution has to be on: Settings > Capabilities > "Code execution and file creation" (called "Create and edit files" in the updated layout). It's on by default for Free, Pro, Max and Ultra. On Team and Enterprise, an Owner turns on both "Cloud code execution and file creation" and "Skills" under Organization settings > Plugins & skills > Policy (on by default on Team), and can turn off member uploads, which hides the upload option. (Claude Help Center, "Use skills in Claude" and "Create and edit files with Claude," checked 2026-11-08.)

**ChatGPT:** download `due-diligence-review-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. (OpenAI Help Center, "Projects in ChatGPT," and OpenAI's Projects docs, checked 2026-11-08.) This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Things to Say

- "Here's the inspection and disclosures for 123 Main. What should we ask the seller for?"
- "Is this inspection finding a big deal?"
- "Go through the HOA docs. My buyer wants to rent it out in a couple of years."
- "Our due diligence deadline is tomorrow. What do we send?"
- "Draft the objection list and an email to my buyers."
- "Make that a Gmail draft." (Claude, only with the Gmail connector on. Claude's Help Center and the Gmail connector listing say it can create drafts; one Claude docs page calls it read only. If no draft appears, copy the email from the chat.)

## What Comes Back

A bottom line in three sentences or less, then: the documents it read (and what's missing), every finding sorted into four tiers with the report page, findings the inspector's summary left out, neutral questions for the listing agent where the documents disagree, HOA findings (assessments, rental rules, reserves, insurance, fees), a negotiating timeline labeled "for strategy; confirm dates with your transactions team," a draft objection list (recommended ask and held back, each with a reason), a buyer email under 300 words, and a "Check before sending" list of every date, dollar amount and page reference in the drafts.

If your deadline is within 48 hours, that comes first, in bold, with your three choices. In Utah it says plainly that neither REPC version has a response period: the seller has to sign the resolution by 5:00 PM Mountain Time on the Due Diligence Deadline, or the buyer cancels or gets a signed extension.

## What It Will Not Do

- Send anything, post anything, or write to your CRM. It drafts; you send.
- Estimate repair costs or remaining life. Without a bid it writes "needs bid."
- Tell your buyer whether to buy, interpret legal effect, or answer loan, insurance or health questions. It routes them to the lender, the title officer, an attorney or a certified professional.
- Draft new contract language. It writes the requested terms in plain words for you to put on your brokerage's approved form.
- Keep your official deadline calendar. Your transactions team owns that.
- Repeat loan numbers, account numbers or wiring instructions from a document.
- Comment on the people in a neighborhood, schools or safety.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors needed. The Gmail connector is optional, only to save the buyer email as a draft. Claude's official pages disagree on it: the Help Center lists Google Workspace connectors for all users and says Gmail can draft; Claude's docs list Gmail on Pro and up and call it read only. (Checked 2026-11-08.)
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit. Free also allows 3 file uploads a day and about 12 pages of text per message, so on Free, setting up the project and uploading a full stack can take more than one day (OpenAI doesn't say whether project files count toward the 3), and a long inspection report plus a disclosure and an HOA packet can run past the page limit. Go and Plus allow about 40 pages per message. (OpenAI Help Center, "Projects in ChatGPT" and "ChatGPT Free Tier FAQ," and chatgpt.com/pricing, checked 2026-11-08.)
- **Computer:** install the Claude skill from claude.ai in a browser or the Claude desktop app (Customize is in the left sidebar there). Once installed, it is saved to your account and works in chat on the web, desktop and phone apps (Claude docs, "Extend Claude" overview, checked 2026-11-08). For ChatGPT, set the project up on the web: OpenAI publishes no phone steps for creating a project or editing its instructions.
- **Cost:** nothing beyond your plan.
- **Privacy:** inspection reports carry your client's name and address. Consider turning off training first. Claude: Settings > Privacy > "Help Improve our AI models" (Free, Pro, Max and Ultra; Team and Enterprise chats aren't used for training by default) (Claude Privacy Center, checked 2026-11-08). ChatGPT: Settings > Data controls > "Improve the model for everyone" (OpenAI Help Center, "Data Controls FAQ," checked 2026-11-08). On ChatGPT's individual plans, a thumbs up or down can still send that chat for training after you opt out.

## Run / Draft / Own

- **Run:** reads every page of every document, sorts findings into tiers, cross-checks the documents, and counts the days to your deadline.
- **Draft:** the questions for the listing agent, the objection list and the buyer email, for you to read and edit first.
- **Own (you and your buyer):** whether to object, cancel or go ahead; every remedy and dollar amount; any extension; and what goes to the seller's side.

## FAQs

- **Does it work outside Utah?** Yes. It takes the deadline, any response period and what happens if you do nothing from your uploaded contract, and it says state rules weren't checked. The Utah notes only switch on for a Utah property.
- **Which Utah REPC does it use?** Whichever you upload. It reads the footer: "EFFECTIVE DECEMBER 4, 2024" or "EFFECTIVE NOVEMBER 1, 2026." The Utah Association of REALTORS says the old form can't be used starting January 1, 2027.
- **Why does it keep saying there's no response period?** Because neither current Utah REPC has one for due diligence. The seven-day response period many agents remember is in the Lead-Based Paint Addendum, for lead paint objections only. Under the REPC, sending an objection doesn't buy time; a signed resolution, a signed extension or a cancellation has to happen by 5:00 PM on the deadline.
- **Why won't it put a dollar amount on the roof?** It only uses numbers from your documents. Get a contractor's bid and it will use that number.
- **Can I trust the page numbers?** It cites the page numbers printed on the report. Check them anyway: "Check before sending" lists every one.

## Practice Prompt

Attach the five files from `due-diligence-review-practice.zip` and say: **"Pretend today is Sunday, November 8, 2026. Here's everything on 2468 Example Aspen Drive in Riverton. My buyers are Avery and Jordan Samplewood. They want to finish the rest of the basement and maybe build a detached shop in the backyard next year. What should we ask for?"** (The "pretend today" line keeps the made-up deadline from having already passed.) The sample on this page is what came back.

## Suggested Library Keywords

due diligence, inspection report, home inspection, objection, repair request, buyer's agent, seller disclosure, HOA documents, CC&Rs, reserve study, special assessment, rental cap, radon, sewer scope, title commitment, Utah REPC, due diligence deadline, buyer email

## Tested and Not Tested

**Tested (2026-11-08), with made-up files:**
- Practice run on the five practice files: 12 of 12 checks. It caught the attic finding the inspector's summary left out, both safety items, the easements against the shop plan, and the missing CC&Rs and water share evidence, and it did not repeat the seller's loan amount or loan number.
- Eval 1, an Idaho contract and a clean report with two real issues: 8 of 8. General mode, the two items only, and a timeline that skipped the Veterans Day holiday the made-up contract excludes.
- Eval 2, a Utah December 2024 REPC with the deadline tomorrow and a scorched electrical panel only in the report's body: 8 of 8. A no-skill answer to the same files passed 2 of 8: it found the panel but described a response period the REPC doesn't have, never said the earnest money goes hard at the deadline, invented repair costs and a credit amount, and broke the email rules.
- Eval 3, a Utah November 2026 REPC with an HOA rental cap and a roof assessment voted on after closing: 8 of 8, including that the REPC's "Seller pays" box wouldn't cover it, and the HOA account number never appeared.
- Independent review (2026-11-08): a second reviewer ran eval 3 and the practice files from scratch before reading the first results. Both runs passed. Both also put dates in the buyer email's Next Steps that no document gave (one draft told the buyers a roofer was coming Monday), so the skill now ties every Next Steps date to the contract or the agent's message and never announces an appointment the agent didn't mention. The sample was corrected to match.
- A written routing check: three prompts that should land here and two that belong to Repair Request Response and Counter Explainer. The description now names Counter Explainer for the seller's answer to an objection.

**Not tested:**
- Real Utah Life documents (waiting on redacted copies from Connor) and real inspection software output, which runs longer than the 7 to 11 page made-up reports.
- Scanned, image-only PDFs.
- The ChatGPT Project version in ChatGPT itself; its instructions match the Claude skill step for step.
- Creating a Gmail draft.
- The description against all 17 skills installed at once (only the written routing check above). It names repair-request-response, counter-explainer, new-construction-review and low-appraisal-response as the siblings to use instead.
- A contract with the Due Diligence box unchecked.

## Sources (all checked 2026-11-08)

- Claude file uploads: https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Claude skills, install path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Claude skills work on web, desktop and mobile once added: https://claude.com/docs/extend/overview
- Claude code execution setting and defaults: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude Google Workspace connectors: https://support.claude.com/en/articles/10166901-use-google-workspace-connectors and https://claude.com/docs/connectors/google/gmail
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Team and Enterprise not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (creating, instructions, file limits): https://help.openai.com/en/articles/10169521-projects-in-chatgpt and https://learn.chatgpt.com/docs/projects
- ChatGPT Free upload limit: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- ChatGPT pages per message and plans with Projects: https://chatgpt.com/pricing
- ChatGPT thumbs up or down after opting out: https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance
- Claude Gmail connector listing (create_draft): https://claude.com/marketplace/connectors/gmail
- ChatGPT training setting: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- Custom GPT retirement: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- Utah REPC versions and dates: see the skill's `references/utah-due-diligence-timing.md`
- help.openai.com pages block direct fetching; their facts come from Amplified's vendor check of 2026-11-08.
