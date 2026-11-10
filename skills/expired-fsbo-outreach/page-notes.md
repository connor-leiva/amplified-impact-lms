# Page Notes: Expired and FSBO Outreach (/expired-fsbo-outreach)

Skill: `expired-fsbo-outreach`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Paid: in the Amplified Skill Library (agent set). Every vendor and legal fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Drop in your expired list or your FSBO list, and get a personal first letter or email for every owner you may contact, built from that listing's own facts, with a call opener only where the number was scrubbed against Do Not Call, a door-knock note, and a two-week touch plan.

## Who It's For

Any agent who prospects expired listings or for-sale-by-owner homes: from an MLS export of expireds, a lead service's export (REDX, Vulcan7, Landvoice) or a list they made from yard signs and ads. Works in Utah and, in general mode, anywhere else.

## Why This and Not the Lead Service's Scripts (Connor's Filter)

REDX, Vulcan7 and Landvoice already supply the lists, the scripts and the dialers. This skill doesn't rebuild any of that. What it adds is a personal first touch for each owner from that listing's own facts (when it expired, how long it was listed, the features the FSBO ad lists), and compliance checked row by row: it holds out every listing that may still be under a listing agreement, gives a call opener only to numbers shown scrubbed against Do Not Call, writes no texts without written consent, and skips the FSBO ad that said no agents. Say so on the page.

## What to Upload, and Where Each File Comes From

One list per run, or both together. You don't retype anything.

- **Your MLS's expired search:** search the MLS for Expired listings in your area and date range, and export the results to CSV or Excel. Statuses like Withdrawn or Canceled can stay in; the AI holds them out. The export's click path wasn't confirmed in UtahRealEstate.com's help center (it shows a client export only). Owner names, mailing addresses and phones usually come from tax records or a data service added to the export; the AI reads them when they're there.
- **Landvoice:** open one of your lists, then Print/Export in the top menu, then CSV. Landvoice says it marks every phone number on the National Do Not Call Registry. (Landvoice blog, "Product Update," June 23, 2022, checked 2026-11-10.)
- **REDX:** leads arrive in Vortex, REDX's lead manager; use its export. The click path wasn't confirmed in REDX's help pages; a review describes Vortex and REDX's DNC labels (The Close, "REDX Review," checked 2026-11-10).
- **Vulcan7:** Vulcan7 says agents can export leads and that DNC filtering is built in; the click path wasn't confirmed (Vulcan7's expired leads page, checked 2026-11-10).
- **Your own list:** a spreadsheet or a pasted list with the address, the owner, the phone if you have it, where you found it, what the ad says, and the date. Without a Do Not Call column, there are no call openers until you scrub.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the files, and click "Open" (or drag them into the chat). (Claude Help Center, "Uploading files to Claude," as checked 2026-11-10 for /open-house-follow-up.)

**Calling, in one line:** call only numbers your list marks as not on the Do Not Call Registry (checked within 31 days) or that you scrubbed yourself against the Registry and your team's internal list. Expired and FSBO owners are covered when you call to list their home.

## Install

**Claude:** as every skill page says it (D-052): download `expired-fsbo-outreach.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on: Settings > Capabilities > "Code execution and file creation" ("Create and edit files" in the updated layout). No connectors needed.

**ChatGPT:** download `expired-fsbo-outreach-chatgpt.zip` and unzip it. Select New project in the sidebar and name it. Upload the four `.md` files to the project's Sources. Open the project's more options menu (•••) > Project settings and paste the contents of `paste-into-instructions.txt` into the instructions box, with your voice profile QUICK CARD under the last line if you have one. This is a Project, not a custom GPT: OpenAI retires custom GPTs on December 11, 2026.

## Things to Say

- "Here's my expired export from the MLS. Draft my first touches and a touch plan."
- "My FSBO list from REDX is attached. Write the letters and a two-week plan."
- "I scrubbed these numbers against the Do Not Call Registry and our team's list this morning. Add call openers for the ones that came back clear."
- "Just the letters, please."
- "Here's the next batch."

## What Comes Back

Flags first, when they apply: how the columns were read, every row held out (Withdrawn, Canceled, Temporarily Off Market, relisted, dates that disagree, a FSBO listed with a flat-fee brokerage) with the reason, FSBO ads that said no agents, who can get a call and why the rest can't, no texts and why, entity owners, anything you asked for that it left out (criticizing the last agent, claiming a buyer), agent-only MLS fields set aside, and general mode outside Utah. Then a three-sentence bottom line; the list for you alone, sorted by the export's own facts (expiration date and days on market for expireds, the ad date for FSBOs) with the price change worked out and each row's open channels; a first touch for every owner you may contact (a letter, or an email with an unsubscribe footer when the list has an email), a call opener only where calling is allowed, and a door-knock note; a dated touch plan of three or four touches over two weeks; and a "Check before sending" list of every date, day count and fact with its row and column, the scrub dates, the MLS relist search and the placeholders.

## What It Will Not Do

- Send, mail, dial, text or write to your CRM.
- Draft for a Withdrawn, Canceled or Temporarily Off Market listing, a relisted address, or a FSBO ad that says no agents.
- Write a call opener for a number nobody scrubbed, or a text without written consent. A phone number on a list is never consent.
- Say why a listing expired, criticize or name the prior agent or brokerage, claim a buyer, or name a price or promise one.
- Use private remarks, showing or lockbox details, or anything about the owner (a move, a divorce, a trust, tenants, money).
- Describe the owner or the people in an area, or repeat an ad's words about who a home suits.
- Repeat any phone number.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on every plan; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. No connectors.
- **ChatGPT:** a Project. Projects are on Free, Go, Plus and Pro, and Free allows 5 files per project, so the 4 files fit.
- **Your list:** an MLS export, a lead service's export, or your own spreadsheet. A Do Not Call column (or your own scrub) is what turns calls on.
- **Device:** add the skill once from claude.ai or the Claude desktop app on a computer. Exporting a list is easiest on a computer.
- **Cost:** nothing beyond your plans, your MLS and the lead service you already use.
- **Privacy:** the list holds owners' names, addresses and phone numbers. Turn off training first (Claude: Settings > Privacy; ChatGPT: Settings > Data controls > "Improve the model for everyone"), as every skill page says. Confirm your MLS allows putting its export into an AI tool.

## Run / Draft / Own

- **Run:** reads every row, decides who may be contacted, marks each row's channels and why, sorts by the export's own facts, works out price changes, and dates the plan around Sundays and Utah holidays.
- **Draft:** every letter, email, call opener, door-knock note and follow-up note, for you to read first.
- **Own (you):** the Do Not Call scrub and your internal list, any texting consent, the fresh MLS search for relists, every price conversation, whether to knock, the fair housing review, and every send. Ethics questions go to your broker; calling and texting law to your broker or an attorney.

## FAQs

- **REDX (or Vulcan7, or Landvoice) already gives me scripts. Why this?** The scripts are the same for everyone. This writes a first touch for each owner from that listing's own facts, and checks every row: what may still be under a listing agreement, which numbers were scrubbed, which ad said no agents. Keep using your dialer for the calls it allows.
- **Why won't it write to a Withdrawn or Canceled listing?** A Withdrawn listing is still under a listing agreement in UtahRealEstate.com's own definition, and the REALTOR Code of Ethics (Article 16 and Standard of Practice 16-4) bars soliciting a listing that's exclusively listed with another broker. A Canceled listing is often re-entered by the same brokerage, so it waits until you confirm no agreement is in effect.
- **Why didn't I get call openers?** A call to list someone's home is a telephone solicitation, and the Do Not Call rules cover expired and FSBO owners. Calls go only to numbers your list marks as not on the Registry (checked within 31 days) or that you scrubbed against the Registry and your team's list. Scrub, tell the AI, and it adds the openers.
- **Can I call on Sunday in Utah?** Utah's law limits solicitation calls on Sundays and Utah legal holidays (Utah Code 13-25a-103), but it exempts a licensed agent acting within the license (13-25a-111). The plan still keeps Sundays and Utah holidays call-free, so one rule covers everyone on the team, licensed or not. Ask your broker if you want to change that.
- **Why won't it say the last agent overpriced it?** The list doesn't say why a home didn't sell, and the Code of Ethics bars misleading statements about other agents (Article 15). The letters stay on the home and on what you'd do.
- **Does it work outside Utah?** Yes, in general mode: the federal Do Not Call, texting and email rules, the Code of Ethics and fair housing still apply, and it tells you your state's rules weren't checked.

## Practice Prompt

Attach both practice files from `expired-fsbo-outreach-practice.zip` and say: **"Here's my expired export from the MLS and a FSBO list from my lead service. I'm Avery Testwood with Example Ridge Realty. Draft my first touches and a touch plan."** The sample on this page is what came back on Tuesday, November 10, 2026. The plan and the call days depend on the date you run it (that week, Wednesday, November 11 was Veterans Day, so no calls), and a DNC check date in the file counts as stale once it is more than 31 days old, so a later run changes who gets a call opener.

## Suggested Library Keywords

expired listings, expireds, expired listing letter, expired letters, FSBO, for sale by owner, FSBO letters, prospecting letters, listing leads, REDX, Vulcan7, Landvoice, Vortex, MLS export, door knocking, door-knock, cold calling, call script, Do Not Call, DNC scrub, TCPA, touch plan, withdrawn, canceled, Article 16, seller leads

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run (an MLS expired export of 13 rows and a FSBO leads export of 7 rows, Salt Lake County, Utah): 14 of 14 checks. Two Withdrawn, two Canceled and one Expired row with a future date held out; a "NO AGENTS PLEASE" FSBO skipped and a flat-fee MLS FSBO held out; 13 first touches in sort order; call openers only for the 5 numbers marked Clean within 31 days (one Clean number checked 69 days earlier got none); no texts; private remarks (a lockbox code, a move, a divorce, tenants) and a FSBO ad's words about the area left out; an LLC that mails elsewhere got no knock; no calls on Veterans Day or Sundays.
- Eval 1 (an expired export from Utah County, scrubbed by the agent, who asked to say the homes were overpriced, to claim buyers, and to text every cell): 12 of 12. A relist caught by the same address showing as Active; Withdrawn, Canceled and Temporarily Off Market held out; both requested angles and the texts left out and flagged; call openers for the three numbers marked N only.
- Eval 2 (an agent's own FSBO list from the Boise area with no Do Not Call information at all, in general mode): 10 of 10. No call openers and no texts, with the reasons; letters and door-knocks only; the "No agents please" owner skipped; ad wording about retirees, a young family and a divorce left out.
- Objective checks on every run: no em or en dashes, no phone number anywhere, owner emails only on their own email's To line, no texts, the right owners in the right order, call openers and knock notes only where allowed, letters 150 words or fewer, email footers, no prices, buyer claims or listing office names in the drafts, every number in the input or marked as worked out.

**Not tested:**
- Real exports from an MLS, REDX, Vulcan7 or Landvoice (the practice columns follow what these commonly carry; none publishes its export columns in the pages checked), and an XLSX export.
- More than 15 owners (the batch rule), a voice profile QUICK CARD, and an owner email on an expired export.
- The ChatGPT Project in ChatGPT itself; its instructions match the skill step for step.
- The description against every skill installed at once. It names speed-to-lead-reply, sphere-touch-plan, listing-appointment-prep and open-house-follow-up as siblings; speed-to-lead-reply and listing-appointment-prep are being built at the same time.
- No no-skill baseline was run.

## Sources

- UtahRealEstate.com Support Center, "Quick Guide to MLS Listing Statuses" (checked 2026-11-10): https://help.utahrealestate.com/index.php/knowledge-base/listing-input-photos/how-to-guides-listing-input-photos/quick-guide-to-mls-listing-statuses
- UtahRealEstate.com, Rules and Regulations Reference Guide, revised February 11, 2026 (checked 2026-11-10): https://help.utahrealestate.com/wp-content/uploads/2026/02/URE-Rules-and-Regulations-Reference-Guide-Effective-02-11-26.pdf
- Landvoice, "Product Update," June 23, 2022 (checked 2026-11-10): https://www.landvoice.com/blog/product_update_nsjune22
- Vulcan7, expired listing leads page (checked 2026-11-10): https://www.vulcan7.com/?p=28635
- The Close, "REDX Review" (checked 2026-11-10): https://theclose.com/redx-review/
- Florida Realtors, "What Realtors Need to Know About 'Do Not Call' Rules," updated February 9, 2026 (checked 2026-11-10): https://floridarealtors.org/law-ethics/library/do-not-call
- NAR, "Telemarketing and Cold Calling" (checked 2026-11-10): https://www.nar.realtor/telemarketing-cold-calling
- NAR Code of Ethics, Article 16 and its Standards of Practice, and the 2026 Code (Articles 12 and 15), effective January 1, 2026 (checked 2026-11-10): https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/the-code-of-ethics-article-16 and https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- Utah Code 13-25a-102, 103, 107.2, 108 and 111 (checked 2026-11-10): https://le.utah.gov/xcode/Title13/Chapter25A/13-25a.html
- Utah Code 63G-1-301, legal holidays (checked 2026-11-10): https://le.utah.gov/xcode/Title63G/Chapter1/63G-1-S301.html
- Utah Admin. Code R162-2f-401h (checked 2026-11-10): https://www.law.cornell.edu/regulations/utah/Utah-Admin-Code-R162-2f-401h
- Fair housing: 42 U.S.C. 3604 (https://www.law.cornell.edu/uscode/text/42/3604) and Utah Code 57-21-5 (https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html), checked 2026-11-10
- 18 U.S.C. 1725, mailboxes (checked 2026-11-10): https://www.law.cornell.edu/uscode/text/18/1725
- Federal calling, texting and email rules: the shared `outreach-rules.md` (TCPA, the FCC's rules and CAN-SPAM, checked 2026-11-08)
- Install steps, plans and training switches: as on the other skill pages (`skill-page.ts`, D-052), checked 2026-11-08
