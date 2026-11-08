# Page Notes: Offer Comparison (/offer-comparison)

Skill: `offer-comparison`, version 1.0. Claude and ChatGPT. Every fact below was checked on 2026-11-08; sources are at the end. The skill's own facts are in `references/comparison-guide.md` and `references/utah-offer-comparison.md`, plus the shared files it ships with (`utah-repc.md`, `utah-repc-2026.md`, `utah-forms-and-counters.md`, `buyer-agreements.md`).

## One-Line Promise

Upload every offer your seller received, with each buyer's lender letter, and get one side-by-side page that shows what each buyer is really offering, how likely each one is to close, the top two for your seller's priorities, and a seller email you can send after a read.

## Who It's For

Listing agents with two or more offers on the table, from a weekend with two offers to a highest-and-best round with six. Built for Utah: it reads each offer's own REPC footer, so a set with some offers on the December 4, 2024 form and some on the November 1, 2026 form (normal through December 31, 2026) gets the right section numbers for each, and it knows the FHA/VA addendum, earnest money and weekend rules on both. It works in any other state in general mode, where it uses only your files and says state rules weren't checked.

## What to Upload, and Where Each File Comes From

1. **Each offer, with all its addenda (required, two or more).** Buyers' agents send these as PDF attachments, usually one signed packet per offer. Download each one as it came:
   - **Gmail:** open the message, hover over the attachment at the bottom, and click Download.
   - **Outlook (new Outlook, or Outlook on the web):** select the dropdown arrow on the attachment and select Download, or Download all for every attachment in the message.
   - Keep **each offer as its own PDF**. Claude reads checkboxes, initials and signatures from the page images only in PDFs of 100 pages or fewer, so one giant combined file can hide a missing initial. A chat holds up to 20 files.
2. **Each buyer's preapproval letter or proof of funds (expected).** Usually attached to the same email. If one is missing, the skill still runs, marks that offer "[no letter uploaded]" and drafts the question to ask for it.
3. **A seller net sheet from title (optional).** Ask your title officer to run one. Without it the skill won't estimate commissions, title fees, the payoff or prorations. With one, it uses the sheet for the offer it was run on and estimates the others from it, labeled as estimates for title to confirm.
4. **Just tell it** your seller's priorities (most money, certainty, a closing date, time to move out, fewest repairs), the day they'd accept, and any must-have dates. No form to fill in.

**Buyer letters and photos:** if an offer includes one, the skill sets it aside, notes that it was there and keeps it out of the comparison and the email. You don't need to remove it first.

**Privacy before you upload:** offers and lender letters carry buyers' financial details. Turn off model training first if you haven't: in Claude, Settings > Privacy > Help Improve our AI models (Free, Pro, Max and Ultra; Team and Enterprise chats aren't used for training by default); in ChatGPT, Settings > Data controls > Improve the model for everyone. Never upload wire instructions; the skill won't use them.

## Things to Say

- "Four offers came in on [address]. My sellers want the most money and need to close by [date]. Which two should we focus on?"
- "Here are the offers and the net sheet title ran on the first one. Which nets my seller the most?"
- "Two of these escalate. Where do they actually land?"
- "One buyer didn't send a preapproval. Compare them anyway and tell me what to ask for."
- "My sellers chose highest and best. Draft the note to the buyers' agents."

## What Comes Back

Flags first (missing pages, signatures and initials, missing letters, set-aside buyer letters, form versions, the first offer to lapse), then a three-sentence bottom line with the top two for your seller's priorities and the dollar difference. Then the offer set, a side-by-side table with every term and its section number on that offer's own form (price, concessions, price after concessions, what each offer asks the seller to pay, earnest money and the last day each buyer can walk away with it, loan, appraisal and gap coverage, every deadline with its weekday, sale of the buyer's home, escalation, possession, the letter), the escalation math straight from each clause, a certainty-versus-price read, gaps to take to your broker, questions for each buyer's agent, counter options, a seller email, and a "Check before sending" list tracing every number to its file and page.

## What It Won't Do

- Decide for your seller. It ranks the offers for the priorities you give it; your seller chooses.
- Estimate a net without a title net sheet, or invent commissions, title fees, payoffs or closing costs.
- Rewrite or draft an escalation clause, a counteroffer clause or any contract language. Requested changes come back in plain words for the approved form.
- Rule on whether an offer with a missing page, signature or initial is valid. That goes to your broker.
- Read, summarize or weigh a buyer's letter or photos.
- Share one buyer's terms with another, or tell you to counter several buyers at once without your broker.
- State a loan program's concession cap. The buyer's lender confirms it.
- Keep the official deadline calendar. Its dates are for strategy; confirm them with your transactions team.
- Send anything. Drafts only.
- Explain one counter or addendum (that's Counter Explainer), write a buyer's offer (Offer Strategy), answer a repair request (Repair Request Response), price a listing (Pricing Conversation Prep) or answer a low appraisal (Low Appraisal Response).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. Code execution ("Code execution and file creation," called "Create and edit files" in the updated layout) is on by default on Free, Pro, Max and Ultra. On Team and Enterprise, an Owner controls skills and code execution.
- **No connectors.** Gmail is optional, only to save the seller email as a draft when you ask (Claude's Help Center says the Gmail connector can draft; one Claude docs page calls it read-only, so if drafting isn't offered, copy the email instead).
- **ChatGPT instead:** a Project, on any plan that has Projects (Free, Go, Plus, Pro). The project holds 4 files, inside Free's limit of 5. A four-offer set is a lot for ChatGPT Free, which allows 3 file uploads a day and about 12 pages of text per message (Go and Plus allow about 40), so use Go or Plus, or Claude, for a full offer set. Attach the offers in the chat, not as project files: OpenAI says PDFs added as project files are read as text only. OpenAI's help pages disagree on when ChatGPT reads images inside a PDF, so in ChatGPT check every initial and signature line yourself.
- **No cost** beyond your Claude or ChatGPT plan.

## Install

- **Claude:** download `offer-comparison.zip` and don't unzip it. Go to Customize > Skills, click +, then + Create skill, select Upload a skill, and choose the ZIP. Make sure it's toggled on, then start a new chat and attach your offers.
- **ChatGPT:** download `offer-comparison-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Open the more options menu (•••), select Project settings, and paste the text from `paste-into-instructions.txt`, with your voice profile quick card under the last line. Add the four .md files to the project's Sources. Then start a chat in the project and attach your offers.

## Run / Draft / Own

- **Run:** reading every page of every offer, addendum and letter; lining up the terms; the math (price after concessions, what each offer asks the seller to pay, escalation results, earnest money at risk, days and weekdays for every deadline, net estimates from a title net sheet); flagging missing pages, signatures, initials and letters.
- **Draft:** the ranking, the questions for each buyer's agent, the counter options, the highest-and-best note and the seller email, for you to read and change first.
- **Own (you, your seller and your broker):** which offer to accept, counter or reject, and every price and dollar amount (your seller); the advice (you); missing signatures, validity, escalation write-ups, sharing a competing offer as proof and any counter to more than one buyer (your broker); the net (title); the official dates (your transactions team). Wire and banking details never come into it.

## FAQs

- **Will it tell my sellers which offer to take?** No. It names the top two for the priorities you give it and shows exactly what your sellers trade between them, in dollars, dates and certainty. They decide.
- **Can it tell me what my sellers will net?** Only from a title net sheet. Without one it shows the price after concessions and the price less what each offer asks the sellers to pay, clearly labeled "not a net." With one, it uses the sheet for the offer it was run on and estimates the rest from it, for title to confirm.
- **How does it handle escalation clauses?** It quotes the clause, applies it exactly as written (which offers count, whether it measures price or a defined net, the cap) and shows the math. When two clauses point at each other or the wording can be read two ways, it shows both results and sends the question to your broker. It never rewrites the clause.
- **What if a buyer sends a love letter?** The skill sets it aside, notes it was there, and keeps it out of the comparison and the email. Letters often carry personal details about the buyers, which is a fair housing risk if they sway the choice.
- **Which REPC does it use?** Each offer's own. Until December 31, 2026 an offer set can mix the December 4, 2024 and November 1, 2026 forms, and the section numbers differ (separate Appraisal and Financing Deadlines and a seller closing-cost line on the new form). From January 1, 2027, it flags any offer still on the old form.

## Practice Prompt

Attach all eight practice files from the practice ZIP (`01 Offer - Testcase - 1457 E Imaginary Aspen Way.pdf` through `08 Preapproval Letter - Samplewright.pdf`) and say:

**"Four offers came in on 1457 E Imaginary Aspen Way and I'm meeting my sellers, Jamie and Alex, tomorrow morning. They care most about the deal actually closing, they need to close by Friday, December 18 because they're buying out of state, and they'd like two days after recording to move out. If they accept, it'll be Monday, November 9. All four offers and their letters are attached. Which ones should they focus on?"**

The set has an escalation with a cap (missing one buyer's signature on the addendum), a cash offer with a 7-day due diligence period, an FHA offer with $12,000 in concessions, and a sale-of-home offer with a buyer letter tucked in as its last page. Everything in the files is made up. The sample on this page is what that prompt returned.

## Suggested Library Keywords

multiple offers, compare offers, offer comparison, highest and best, which offer should my seller take, escalation clause, escalation addendum, appraisal gap, cash offer, FHA offer, seller concessions, sale of home contingency, earnest money, proof of funds, preapproval letter, net sheet, seller net, backup offer, counteroffer, REPC, new REPC 2026, listing agent, seller email, love letter

## Tested and Not Tested

**Tested (2026-11-08), following SKILL.md 1.0 on made-up files:**
- Eval 1, four offers on both REPC forms (an escalation measured against a defined net, cash with stale and short proof of funds, an FHA offer with a 2020 addendum on a 2026 REPC and its concession written twice, and a sale-of-home offer missing page 4 of 6 with a separate letter and photo), with the agent asking "what will they net?" and no net sheet: 10 of 10. It computed the escalation from the clause's own net definition ($647,500), refused to estimate a net and said why, flagged the addendum mismatch without ruling, marked the missing page's terms unknown, moved a Saturday Settlement Deadline to Monday under the 2026 form, and kept the buyer letter out entirely. A no-skill baseline on the same files passed 0 of 10 (3 partial): it invented a 3% commission and 1% closing costs to estimate nets, escalated on the wrong figure (overstating it by $9,000), missed the missing page and the addendum mismatch, and repeated the buyer letter's personal details to the agent as something that "may resonate."
- Eval 2, three offers on the 2026 REPC, one with no lender letter and one whose letter is old, expires before closing and tops out below the price, with a title net sheet run on the first offer: 10 of 10. It used the sheet for that offer and estimated the other two by changing only the percentage and offer-term lines, held the flat lines with notes, read an unchecked financing box as the form's 50% default, and moved a Sunday earnest money date to Monday.
- Eval 3, an Idaho offer set with two escalation clauses that each count "any other offer": 9 of 9 after one fix (a missing sentence comparing one cap with its letter). General mode named no Utah rule, showed both escalation readings ($433,000 and $433,500, or $439,000 and $438,000) and sent the question to the broker.
- Practice run: 12 of 12. It is the sample on this page.
- One skill fix came out of testing: twice, a seller email said "I've asked" for something before any request went out. SKILL.md now says the email makes no claim that a request already went out.
- `node scripts/skills.mjs check offer-comparison` passes.

**Not tested:**
- Real Utah Life offer packets (none provided yet): scanned or photographed pages, handwritten changes, and e-signature certificates from real signing platforms.
- A PDF over 100 pages, where Claude reads text only.
- The ChatGPT Project version in ChatGPT itself, and whether ChatGPT sees initials and checkboxes in chat-attached PDFs on each plan.
- Upload on a Claude Free plan, and the Gmail draft step.
- Collision check against all 17 skills installed together (the description names its four nearest siblings).
- Not verified anywhere: the terms of the Utah Association of REALTORS members-only forms (multiple offers addendum, backup contract addendum, subject to sale addendum, short-term lease-back); the skill reads them from the attached document and sends questions to the broker. Whether the REPC's "legal holiday" means the days in Utah Code 63G-1-301 is written as "confirm with your broker."

## Sources (checked 2026-11-08)

- Skills upload path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default, and its name in the updated layout: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude file limits (20 files per chat; images in PDFs read only up to 100 pages): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings ; commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Gmail connector can draft (Help Center): https://support.claude.com/en/articles/10166901-use-google-workspace-connectors ; read-only (Claude docs): https://claude.com/docs/connectors/google/gmail
- Gmail, download an attachment (open the message, hover over the attachment, click Download): https://support.google.com/mail/answer/30719
- Outlook, save attachments (new Outlook: dropdown arrow, Download or Download all; Outlook on the web: Download or Download all): https://support.microsoft.com/en-us/outlook/mail/open-save-and-edit-attachments-received-in-outlook
- ChatGPT Projects (New project, ••• > Project settings, 5 files per project on Free): https://help.openai.com/en/articles/10169521-projects-in-chatgpt ; project files on the Sources tab: https://help.openai.com/en/articles/6825453-chatgpt-release-notes and https://learn.chatgpt.com/docs/projects
- ChatGPT Free limits (3 file uploads a day; separate data analysis limits): https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq ; pages of text per message by plan, and plans with Projects: https://chatgpt.com/pricing
- ChatGPT PDFs as project files read as text only, and the plan question on images in PDFs: https://help.openai.com/en/articles/10416312-visual-retrieval-with-pdfs-faq and https://help.openai.com/en/articles/8555545-file-uploads-faq (the two pages disagree; help.openai.com blocks automated reads, so these were checked through search results)
- ChatGPT data controls (Settings > Data controls > Improve the model for everyone): https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- Custom GPTs retire December 11, 2026 (why this is a Project): https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- Utah REPC, December 4, 2024: https://commerce.utah.gov/wp-content/uploads/2023/03/purchase-contract.pdf ; November 1, 2026 (UAR clean copy): https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/REPC-Final-Clean-Copy-10.14.2026-with-Watermark.pdf ; UAR notice: https://utahrealtors.com/realtor/review-of-repc-updates-and-changes-to-related-forms/
- Utah legal holidays: https://le.utah.gov/xcode/Title63G/Chapter1/C63G-1-S301_2026050620260506.html
- Utah Division of Real Estate on multiple offers (Q3 2011 newsletter): https://commerce.utah.gov/wp-content/uploads/2023/04/newsletter_q3-2011.pdf
- NAR Code of Ethics, Standards of Practice 1-6, 1-7, 1-15: https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice ; NAR consumer guide to multiple offers: https://nar.realtor/sites/default/files/2025-03/consumer-guide-navigating-multiple-offers-2025-03-26.pdf ; NAR on buyer letters: https://www.nar.realtor/news/real-estate-news/law-and-ethics/give-buyer-clients-solid-reasons-to-skip-love-letters
