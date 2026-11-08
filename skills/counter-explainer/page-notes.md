# Page Notes: Counter Explainer (/counter-explainer)

Skill: `counter-explainer`, version 1.0. Claude skill and ChatGPT Project. Every vendor and Utah fact below was checked on 2026-11-08; sources are at the end and in the skill's `references/` files.

## One-Line Promise

Upload the contract and the new counter or addendum, and see exactly what changed, including the line nobody mentioned, before your client signs.

## Who It's For

Buyer's agents and listing agents in the middle of a negotiation or a contract change: a seller's counter, a buyer's counter back, an extension, a "small" addendum after acceptance. Built on Utah's REPC (both the form effective December 4, 2024 and the revised form effective November 1, 2026). Outside Utah it still works: it reads every term and rule from your own documents and says it didn't check state rules.

## What to Upload, and Where It Comes From

Upload all of these to one chat (Claude takes up to 20 files per chat; PDFs, photos and scans all work):
1. **The new counteroffer or addendum** (required).
2. **The purchase contract** (the REPC, or your state's form).
3. **Every earlier counter or addendum**, so it can carry terms forward and catch conflicts.

Where the files come from:
- **SkySlope Forms**, if your brokerage uses it: log in to SkySlope Forms, open the file, go to the **Signed Documents** tab, select the documents, click **Download** in the lower right, and choose a download option. (SkySlope help center, checked 2026-11-08.) A counter that's still waiting on the other side downloads with only the signatures done so far. That's expected, and the skill reads it as pending.
- **Other e-signature or transaction systems** (DocuSign, Authentisign, Dotloop, zipForm and others): download the signed or sent PDF from the envelope or file. We didn't verify those vendors' click paths; use their help center.
- **An email attachment or a phone photo** of a paper counter works too. Photos should show the whole page, including the signatures and the footer.

You don't need to type anything from the documents. Just say which side you're on ("my buyers," "my sellers").

## Things to Say

- "The listing agent sent Addendum 2. What does it change, and can you draft a note to my buyers?"
- "Buyer countered back. Explain it to my sellers and give me their options. They have to answer by tomorrow night."
- "What's the deal now, with all three counters? Title is asking for the seller credit and the closing date."
- "Is there anything in this extension addendum besides the new date?"
- "Turn my sellers' answer into the changes I need to put on the counteroffer form."

## What Comes Back

A bottom line first (what changed, the change that matters most, and the response deadline with time left), then:
- the chain of documents with each one's status (accepted, countered, pending, lapsed),
- a before-and-after table of every term that changed, with any change that wasn't stated up front marked,
- the whole deal as it would stand if signed, with the math (price after seller credits, the earnest money at risk, price lines that no longer add up),
- conflicts between documents, gaps, and questions for the other agent,
- what it means for your client, the response deadline and a timeline labeled for strategy,
- options to accept, counter or let it lapse, with what happens under each,
- a client email in your voice, the requested changes in plain words for you to enter on the state-approved form, a "Take to your broker" list,
- and a "Check before sending" list of every date, dollar amount and section to verify.

## What It Won't Do

- Write contract language or clauses. It lists the changes in plain words; you fill out the approved form, and anything beyond changing a standard term goes to your broker.
- Decide whether a contract or counter is valid, or pick a winner when two documents conflict. It shows both and names who settles it.
- Recommend a price, an amount or an option. That's your client's decision, with your advice.
- Estimate net proceeds, cash to close, commissions or loan limits. It points you to a net sheet or the lender.
- Keep the official deadline calendar. Dates are for strategy; your transactions team confirms them.
- Send anything. Every email is a draft. It never asks for or repeats wire or account details.
- Compare several offers side by side (use Offer Comparison), answer a buyer's repair request (Repair Request Response), review inspection findings (Due Diligence Review) or review a low appraisal report (Low Appraisal Response).

## What You Need

- **Claude:** a plan that includes skills, with code execution on. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise, and code execution is on by default on Free, Pro, Max and Ultra. Claude's docs list Pro and up for skills, so if the upload option is missing on Free, that's why. On Team and Enterprise, an Owner controls whether members can upload skills.
- **Install:** Customize > Skills > + > Create skill > Upload a skill, then choose `counter-explainer.zip` as downloaded (don't unzip it). Make sure it's toggled on.
- **Connectors: none required.** Optional: Gmail or Microsoft 365 (Outlook), only to save the client email as a draft when you ask. Claude's Help Center says the Gmail connector can draft email; Claude's docs page for Gmail describes it as read-only. If drafting isn't offered, copy the email from the chat. Work or school Microsoft 365 accounts need an admin to turn on write tools.
- **ChatGPT instead:** a ChatGPT Project (not a custom GPT). `counter-explainer-chatgpt.zip` holds five files: paste the text of `paste-into-instructions.txt` into the Project's instructions (the more options menu, then Project settings), add the other four files to the Project's Sources tab, and attach the deal documents to each chat. ChatGPT Free allows 5 files per project, 3 file uploads per day, and, per OpenAI's pricing page, about 12 pages of text per message. So on Free, setting up the Project and attaching a full chain can take more than one day, and a contract plus several addenda may not fit in one message. Go or Plus allow 25 project files and about 40 pages per message.
- **Device:** install it from claude.ai in a browser or from the Claude desktop app. Once installed, it's saved to your account and works in chats on the web, desktop and mobile apps.
- **Accounts:** none beyond Claude or ChatGPT. The documents come from your e-signature or transaction system, or as photos or scans.
- **Cost:** none beyond your Claude or ChatGPT plan.

## Run / Draft / Own

- **Run (on its own):** reads every page, lines up every term across every version, does the date and dollar math, checks the form version and the deadlines.
- **Draft (you read it first):** the client email, the questions for the other agent, the requested changes for the form.
- **Own (stays with you, your client and your broker):** whether to accept, counter or let it lapse; every price and dollar amount; the wording on the form and anything beyond a standard term change; whether two conflicting documents are binding; wire and banking details.

## FAQs

- **Will it catch a change the other agent didn't mention?** That's what it's built for. It reads every numbered item, looks up section numbers in your own form (so "the date in Section 24(d)" becomes "the Settlement Deadline"), and puts any change that wasn't stated up front at the top. Still read the documents yourself before your client signs.
- **Does it work with the new Utah REPC?** Yes. It reads the footer on your contract. The revised REPC (footer "EFFECTIVE NOVEMBER 1, 2026") numbers its sections differently and has separate appraisal and financing deadlines; the skill uses that form's numbers when it sees that footer. As of 2026-11-08 the Utah Association of REALTORS says the new form is effective November 1, 2026 and required from January 1, 2027, while the Division of Real Estate's forms page still posted the December 4, 2024 form. Ask your broker which version your brokerage uses.
- **Can it write the counteroffer for me?** It gives you the changes in plain words, with section numbers, for you to enter on the state-approved addendum form. It won't write clause language: Utah licensees fill out approved forms, and anything new goes to the broker.
- **Is it safe to upload a client's contract?** The skill leaves account, loan and Social Security numbers out of everything it writes. On Free, Pro, Max and Ultra you can turn off model training under Settings > Privacy > Help Improve our AI models; Team and Enterprise chats aren't used for training by default. In ChatGPT, the setting is Settings > Data controls > Improve the model for everyone.
- **I'm not in Utah. Will it work?** Yes, in general mode: it takes every term, deadline, time of day and acceptance rule from your documents and tells you state rules weren't checked.

## Practice Prompt

Attach the three files from `counter-explainer-practice.zip` and say:

**"I represent the buyers on 1428 Sample Ridge Lane. The listing agent sent Addendum No. 2 and says it's just a home warranty and the washer and dryer. What does it change, and can you draft a message to my buyers? This is a practice run, so treat today as November 9, 2026."**

(Spoiler for the page, not the card: Addendum No. 2 also moves closing up a week, by section number only.)

## Suggested Library Keywords

counteroffer, counter, addendum, REPC, Utah REPC, contract changes, what changed, negotiation, settlement date, due diligence deadline, seller concessions, closing costs, extension, explain to client, buyer's agent, listing agent, transaction

## Tested and Not Tested

**Tested (2026-11-08), each graded in `evals/runs/<case>/grading.md`:**
- Practice files: 12 of 12 checks. It caught the Settlement Deadline moved by section number only, and that the new date lands on the Financing & Appraisal Deadline. This run is the page's sample.
- Eval 1, a buyer's second counter that moves Settlement and adds a $9,000 seller contribution (listing side): 15 of 15. It carried forward the terms from the sellers' counter, showed the price after the contribution ($611,000, below the buyer's first offer) and caught a Seller Disclosure Deadline that would fall on the day of acceptance.
- Eval 2, an addendum on the revised November 1, 2026 REPC described as "just the fridge and a home warranty" that also moves the Due Diligence Deadline a week earlier (buyer side): 12 of 12. A no-skill baseline on the same files passed 5 of 12: it found the date change but missed the form version, the earnest money consequence and the deal as it stands, and its email had an em dash, a non-Title-Case subject and "don't hesitate to reach out."
- Eval 3, two signed addenda that conflict on the seller credit and the closing date, in Idaho (general mode): 12 of 12. No winner picked; both conflicts quoted and routed to the broker.
- Objective checks on every run (`evals/make/objective_checks.py`): every number not in the documents is shown as computed, weekdays match the calendar, no dashes, Title Case subjects, Check before sending present, no banned phrases or account numbers.
- An independent reviewer reran eval 2 and the practice files from scratch on 2026-11-08 (`review-output.md` and `review-grading.md` in each run folder): 12 of 12 on both, with the same catches as the builder's runs.
- `node scripts/skills.mjs check counter-explainer` passes.

**Not tested:**
- Real Utah Life contracts (the fixtures are shortened, made-up copies in the layout of the state forms, not the forms themselves).
- Scanned or photographed counters, and handwritten changes.
- UAR's members-only counteroffer and addendum forms, the FHA/VA Loan Addendum, and builder or attorney-prepared contracts.
- Long chains (five or more documents).
- The ChatGPT Project version in ChatGPT itself, and Gmail or Outlook draft saving.
- A collision check with all 17 library skills installed. The reviewer checked routing by hand against every sibling description: one counter or addendum, an extension, or "where does the deal stand" lands here; several offers go to Offer Comparison; drafting the seller's answer to a repair request goes to Repair Request Response; reviewing the appraisal report itself goes to Low Appraisal Response, while an addendum that changes the price after an appraisal lands here.

## Sources (checked 2026-11-08)

- Claude skills, plans and upload path: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Chat upload limits (20 files per chat): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Gmail connector (Help Center, drafting) and Claude docs (read-only): https://support.claude.com/en/articles/10166901-use-google-workspace-connectors and https://claude.com/docs/connectors/google/gmail
- Microsoft 365 connector: https://support.claude.com/en/articles/15183774-connect-to-microsoft-365
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects, file limits and the instructions click path: https://help.openai.com/en/articles/10169521-projects-in-chatgpt (blocked to direct fetch; from search results) and https://chatgpt.com/pricing (pages of text per message)
- ChatGPT project files on the Sources tab (release note, February 23, 2026): https://help.openai.com/en/articles/6825453-chatgpt-release-notes (from search results)
- ChatGPT Free, 3 file uploads per day: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq (from search results)
- Skills available in chat on web, desktop and mobile once added: https://claude.com/docs/extend/overview
- ChatGPT training setting: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt (blocked to direct fetch; from search results)
- Custom GPT retirement: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq (from search results)
- SkySlope Forms, download signed documents: https://support.skyslope.com/hc/en-us/articles/23308101889947-Save-Documents-from-SkySlope-Forms
- SkySlope Forms, envelope downloads reflect current signatures: https://support.skyslope.com/hc/en-us/articles/30674726321947-Envelope-Actions-and-Statuses-in-SkySlope-Forms
- Revised Utah REPC (UAR announcement and clean copy): https://utahrealtors.com/realtor/review-of-repc-updates-and-changes-to-related-forms/ and https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/REPC-Final-Clean-Copy-10.14.2026-with-Watermark.pdf
- Utah Division of Real Estate, State Approved Forms: https://commerce.utah.gov/realestate/real-estate/forms/state-approved/
- Utah Code 61-2f-306 (forms a licensee may fill out): https://le.utah.gov/xcode/Title61/Chapter2F/61-2f-S306.html
- Utah Administrative Code R162-2f-401a(18) and 401b(1)(p) (changes on an approved addendum; no altering the REPC): https://adminrules.utah.gov/Rule/325
