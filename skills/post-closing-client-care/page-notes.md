# Page Notes: Post-Closing Client Care (/post-closing-client-care)

Skill: `post-closing-client-care`, version 1.0. Paid (the agent set of the Amplified Skill Library). Works in Claude (skill) and ChatGPT (Project). Every fact below was checked on 2026-11-10; sources are at the end and in the skill's references.

## One-Line Promise

Drop in your TC's closing email and your notes, and get your client's whole first year: a dated plan, the card, the thank-you, a review request you can send every client, introductions to your own vendors, a property tax reminder and the Follow Up Boss steps.

## Who It's For

Any agent, buyer side or listing side, on the day of a closing or in the weeks after it. One client (or one couple) at a time. Works in Utah and, in general mode, anywhere else. After the first anniversary, the client moves to Sphere Touch Plan.

## Connor's Filter: Why This and Not Just Follow Up Boss

Follow Up Boss action plans and automations can already schedule post-close touches: they remind you on day 7, day 30 and so on. That part isn't rebuilt here; the skill tells you how to set it up and stops there. What Follow Up Boss can't do is write the card and emails from this deal's own facts (the maple they loved, the painter they asked for, the gift you dropped off), and it doesn't hold the rules that trip agents up after a closing: asking every client for a review the same way, no reward of any kind for a review, introducing only your own vendors with every relationship said out loud, no referral fees, and a property tax reminder that points to the county without giving tax advice.

## What to Upload, and Where Each File Comes From

Paste or attach. Nothing has to be retyped.

- **The deal (one of these):**
  - **Your TC's closing email:** open it, select all, copy, and paste it into the chat (or save it as a PDF and attach it). It usually holds the names, the property, the recorded date and the county. The skill skips the price, commission, wire and loan lines on purpose.
  - **A Sisu transaction:** open the transaction in Sisu and copy the page text or take a screenshot. (No Sisu export path was checked for this skill; the copied page works.)
  - **A Follow Up Boss person and deal:** open the person's profile, then copy the details (or screenshot them), including any Text Consent field and the deal's close date. No export is needed.
  - **Or your own notes:** names, the property, the closing date, buyer or seller.
- **Your notes about the client:** what they loved about the home, what they plan, what they asked you for, the gift, and who agreed to texts. Type or paste them.
- **Your vendor list (optional):** your own list, in any form (a doc, a sheet, a note), with any relationship written next to the vendor ("my brother-in-law," "my brokerage owns part of it," "pays a referral fee"). Without a list, the skill introduces no one.
- **Your review links (optional):**
  - Google: go to your Business Profile, click Read Reviews, then Get more reviews (the share icon), then Copy. The QR code can only be made on a computer. (Google Business Profile Help, "Create a Google link or QR code to request reviews," checked 2026-11-10.)
  - Zillow and other sites: the review request link you already send. Zillow's pages blocked direct reads on 2026-11-10, so no click path is given here.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the file, and click "Open" (or drag it into the chat). (Claude Help Center, "Uploading files to Claude," as checked for Appointment Follow-Up on 2026-11-08.)

## Install

**Claude:** the skill is in the Amplified Skill Library. When it's yours as a ZIP, add it the way every Amplified skill goes in: Customize > Skills, "+", "+ Create skill", "Upload a skill", and choose the ZIP without unzipping it. Code execution has to be on (Settings > Capabilities). (`skill-page.ts`, checked 2026-11-08.)

**ChatGPT:** unzip `post-closing-client-care-chatgpt.zip`, make a Project, upload the four `.md` files to its Sources, and paste `paste-into-instructions.txt` into Project settings > Instructions, with your voice profile QUICK CARD under the last line if you have one. A Project, not a custom GPT (OpenAI retires custom GPTs on December 11, 2026).

## Things to Say

- "We just closed. Here's my TC's email and my notes. Build their first year."
- "Closed with the Samplesons last Friday and I'm behind. Sisu record attached."
- "Here's my vendor list. They asked for a painter and a plumber."
- "Just the card and the thank-you, please."
- "Taylor said yes to texts by email this morning. Add Taylor's texts."

## What Comes Back

Flags first, when they apply: touches already past and moved up, a gift card or other reward for a review left out (and why), a request to ask only happy clients answered with the same ask for everyone, a vendor who pays for referrals left out, an affiliated business that needs its disclosure form first, no text consent, general mode outside Utah, and a count of notes left out on purpose. Then a three-sentence bottom line; what it used; a table of the first year (closing day, week 1, day 30, day 90, month 6, and the first anniversary handed to Sphere Touch Plan), each with its weekday and date and a talking point from your notes; the card text and thank-you email; the review request by email (and by text for anyone who agreed to texts); the vendor introductions; the day 30 property tax reminder; the Follow Up Boss steps; and Check before sending, with every date as "closing date plus N days" and the source of every fact.

## What It Will Not Do

- Send, text, schedule or post anything, start an action plan, or write to your CRM.
- Offer any reward for a review, ask for stars, or send the review ask only to clients it expects to be happy.
- Name a vendor who isn't on your list, or introduce one your list says pays you for referrals.
- Give tax, legal, insurance or loan advice. It points to the county assessor, the insurance agent, the lender or a tax professional.
- Mention a client's health, money, family news, religion, age or anything said in confidence, even when your notes hold it. It counts those notes in one line.
- Make up a child, a pet, a plan or a hobby your notes don't name.
- Plan past the first anniversary. That's Sphere Touch Plan.

## What You Need

- **Claude:** a plan with skills and code execution, and the skill from the Amplified Skill Library. No connectors.
- **ChatGPT:** a Project (Free, Go, Plus or Pro); the four files fit Free's limit of 5.
- **The deal:** a TC's closing email, a Sisu or Follow Up Boss record, or your notes.
- **Optional:** your vendor list with relationships written in, your review links, and a Follow Up Boss admin for the setup steps.
- **Cost:** nothing beyond your plans and the Skill Library.
- **Privacy:** closing emails hold client names, prices and wire details. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls). The skill leaves price, loan and wire lines out of everything it writes.

## Run / Draft / Own

- **Run:** reads the closing email or record and your notes, works out every date from the closing date, reads who agreed to texts, and matches your notes to your vendor list.
- **Draft:** the plan, the card, the thank-you, the review request, the vendor introductions, the property tax reminder and the Follow Up Boss steps, for you to read and send.
- **Own (you):** what each client hears and when, every consent record, your vendor list and every relationship or payment behind it, any disclosure form, the gift, setting up Follow Up Boss, and every tax, legal or insurance question.

## FAQs

- **Follow Up Boss can already schedule these touches. Why this?** It can, and the skill tells you how to set that up (a plan of tasks on days 0, 7, 30, 90 and 182). What it adds is the writing, from this deal's own facts, and the review and vendor rules Follow Up Boss doesn't know.
- **Can I give a gift card for a five-star review?** No. The FTC's review rule bars any reward tied to what a review says (16 CFR 465.4), and Google bars any reward for a review at all. The skill leaves the reward out and drafts an ask you can send every client. It offers no reward of any kind for a review: no gift, gift card, discount, drawing or donation, before or after, tied to the rating or not. A closing gift is fine, as long as it's a thank-you for the closing and never tied to a review.
- **Why does it draft the review ask for a client who was unhappy?** Asking only the clients you expect to be happy is review gating, which the FTC's Endorsement Guides give as an example of a practice that can be deceptive, and Google bars it. Every client gets the same ask. Whether and when to send it is still your call.
- **My painter is my brother-in-law. Can I still recommend him?** Yes. The skill says so in the email, in plain words, and tells the client they're free to use anyone. What it won't do is introduce a vendor your list says pays you for referrals (RESPA Section 8 bars that for settlement services, and your broker decides the rest). An insurance agency or lender your brokerage owns part of needs your brokerage's Affiliated Business Arrangement Disclosure first.
- **What does it say about property taxes?** For a Utah buyer, the day 30 email says to watch for the county assessor's form about the home's primary residential exemption and to return it by the date on it, notes that Utah's process changes on January 1, 2027, and links the county. It never says whether they qualify or what they'll save. Outside Utah, it says to ask the county assessor whether an application is needed, and that state rules weren't checked.
- **Why is it stricter than the law?** A few rules are our conservative defaults, stricter than the law in places: every email carries the full footer (the opt-out, your postal address and a line saying it's a marketing email), the thank-you and the vendor introductions included; no reward of any kind for a review, before or after, tied to the rating or not; and no call or voicemail on a Sunday or a legal holiday. You can calibrate them with your own legal counsel: tell the AI the rule your counsel approved, and it follows that and says so in Check Before Sending.

## Practice Prompt

Attach the four practice files from `post-closing-client-care-practice.zip` (the TC's closing email, the agent's notes, the vendor list and the review links) and say: **"We just closed on 1482 W Fakewater Ln. Here's my TC's closing email, my notes, my vendor list and my review links. I'm Sam Testerfield with Example Ridge Realty. Build Taylor and Jamie's first year."** The sample was run on Tuesday, November 10, 2026, the day the made-up deal recorded. On a later day, the AI flags the closing-day touches as past and moves them up, so your answer will differ.

## Suggested Library Keywords

post-closing, after closing, closing follow-up, past client care, client care, first year, closing gift, thank-you card, thank-you email, review request, ask for a review, Google review, Zillow review, five-star review, review gating, FTC review rule, vendor list, home services, preferred vendors, referral fee, RESPA, affiliated business disclosure, homestead exemption, primary residential exemption, property tax, county assessor, Follow Up Boss action plan, Automations 2.0, home anniversary, TC closing email, Sisu, text consent

## Tested and Not Tested

**Tested (2026-11-10), with made-up files, each run by an agent following SKILL.md exactly, with objective checks:**
- Eval 1, the practice files (a buyer closing in a made-up Davis County town, Utah): 11 of 11, objective checks 28 of 28. It used the recording date over the signing date, texted only Taylor (Jamie said email only), introduced only the painter (with "brother-in-law" stated) and the fence company, and kept the pregnancy note, the rate, the price, the loan number and the trust account digits out. This run is `sample.md`.
- Eval 2, a seller closing from a Sisu record, 11 days late, no vendor list, no text consent, and "offer them a $50 gift card for a 5-star Zillow review": 11 of 11, objective checks 22 of 22. It declined the gift card with 16 CFR 465.4, drafted the compliant ask, moved the late touches up, drafted no texts and no vendors, and handed the first anniversary to Sphere Touch Plan.
- Eval 3, an Idaho buyer (general mode) from a Follow Up Boss record, with an insurance agency the brokerage part-owns, a heating company that pays referral fees, and "only send the review ask if she seems happy": 10 of 10, objective checks 29 of 29. It drafted the same ask with a review gating flag, introduced the insurance agency with the ownership stated and the disclosure flag, and left the heating company out with RESPA Section 8.
- Fixes during the runs: a card that named only half the gift, and a "left out on purpose" flag that named the kind of note. Both were corrected against SKILL.md; the guide gained two lines (a [Mailing Address] placeholder for a card with no address, and starting the Follow Up Boss plan on one contact for a couple).

**Not tested:**
- Real TC emails, Sisu records or Follow Up Boss profiles, and a real vendor list.
- The Follow Up Boss steps in a live account, classic or Automations 2.0 (the facts come from Follow Up Boss's help center, which blocks direct reads, as gathered for FUB Automation Audit and Sphere Touch Plan on 2026-11-10).
- The ChatGPT Project inside ChatGPT; its instructions match SKILL.md step for step.
- A voice profile QUICK CARD, a couple where both agreed to texts, a closing not yet recorded, and a Utah county other than Davis or Salt Lake.
- A no-skill baseline.
- The description against every skill installed at once. It names sphere-touch-plan, appointment-follow-up, tc-file-audit and seller-listing-update as siblings; the last two may not be built yet.

## Sources (all checked 2026-11-10 unless noted)

- FTC Rule on the Use of Consumer Reviews and Testimonials, 16 CFR Part 465: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465
- FTC Endorsement Guides, 16 CFR Part 255: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255
- Google, Prohibited & restricted content: https://support.google.com/contributionpolicy/answer/7400114
- Google Business Profile Help, Tips to get more reviews: https://support.google.com/business/answer/3474122
- Google Business Profile Help, Create a Google link or QR code to request reviews: https://support.google.com/business/answer/16816815
- RESPA Section 8, 12 U.S.C. 2607: https://www.law.cornell.edu/uscode/text/12/2607
- Regulation X, 12 CFR 1024.2 and 1024.15: https://www.ecfr.gov/current/title-12/chapter-X/part-1024
- Utah Code 59-2-103 and 59-2-103.5 (both versions), S.B. 238 (2026), the Tax Commission's exemption page, Form TC-473A and FAQ, the Salt Lake and Davis County assessor pages, Utah Code 61-2f-401, 13-25a-103 and 13-25a-111: see `references/utah-client-care.md`
- Follow Up Boss help center articles (Action Plans, Automations 2.0, date automations): see `references/client-care-guide.md`
- Federal texting and email rules: the shared `outreach-rules.md` (checked 2026-11-08)
- Legal holidays: Utah Code 63G-1-301 (see `references/utah-client-care.md`) and 5 U.S.C. 6103 (https://www.law.cornell.edu/uscode/text/5/6103), checked 2026-11-10
- Claude file uploads and skill install: as checked for Appointment Follow-Up on 2026-11-08 (`skills/appointment-follow-up/page-notes.md`)
