# Page Notes: Listing Description Writer (/listing-description-writer)

Skill: `listing-description-writer`, version 1.0. Works in Claude (skill) and ChatGPT (Project). In the Amplified Skill Library (paid) unless Connor names it free. Every fact below was checked on 2026-11-10 unless it says otherwise; sources are at the end and in the skill's references.

## One-Line Promise

Attach your listing worksheet and the seller's notes, and get MLS public remarks, two headlines and a social caption written only from what the documents say, with every line about people instead of the home caught and rewritten.

## Who It's For

Listing agents (and the assistants who enter listings) writing the public remarks and launch post for a new listing, or checking remarks, a headline idea or a seller's wish list before it goes public. Works in Utah (UtahRealEstate.com's remarks and public marketing rules, Utah's brokerage name rule and fair housing classes) and, in general mode, anywhere else.

## What to Upload, and Where Each File Comes From

You don't retype anything. Attach what you already have; the more of it, the better.

- **Your listing worksheet or MLS input sheet.** Your brokerage's listing input worksheet, or a printout or PDF of the listing input screen before you submit it. Not checked: the exact menu path for printing a draft listing in UtahRealEstate.com. If you can't find it, ask your office or UtahRealEstate.com support.
- **The seller's notes.** The seller questionnaire, an email from the seller, or your notes from the listing appointment. Paste an email straight into the chat.
- **A feature list or the seller disclosure's updates.** Whatever lists updates with years.
- **The county record (optional).** Your county assessor's parcel page, printed to PDF. Salt Lake County's search is at apps.saltlakecounty.gov/assessor/new/query.cfm and looks up by address or parcel number (found 2026-11-10; the click path inside it was not checked). The skill uses it to catch square footage and year conflicts.
- **Wording you already have (optional).** An old description, your headline idea, or remarks you wrote. The skill reviews it for fair housing and checks every claim in it against the documents.
- **The MLS's character limit.** Tell it the Public Remarks limit if you know it. If you don't, it keeps the remarks under 1,000 characters (a working target, not an MLS rule) and flags the limit to confirm. UtahRealEstate.com's reference guide doesn't state its limit, and we didn't find it in any official source.

How to attach files in Claude: click the "+" button in the lower left of the chat box, choose "Add files or photos," pick the file, and click "Open" (or drag it into the chat). (Claude Help Center, "Uploading files to Claude," as checked for Appointment Follow-Up on 2026-11-08.)

## Install

**Claude:** download `listing-description-writer.zip` and don't unzip it. Go to Customize > Skills, click "+", then "+ Create skill", then "Upload a skill", and choose the ZIP. Make sure it's toggled on. Code execution has to be on (Settings > Capabilities, "Code execution and file creation"); the skill uses it to count characters. (The shared setup in `skill-page.ts`, checked 2026-11-08.)

**ChatGPT:** download `listing-description-writer-chatgpt.zip` and unzip it. Make a Project named Listing Description Writer, upload the four `.md` files to its Sources, and paste `paste-into-instructions.txt` into the Project's Instructions box, with your voice profile QUICK CARD under the last line if you have one. A Project, not a custom GPT. (The shared ChatGPT setup in `skill-page.ts`.)

## Things to Say

- "Here's my listing worksheet and the seller's notes. Write the MLS remarks, headlines and an Instagram caption."
- "Keep the public remarks under 1,000 characters. I'm [name] with [brokerage]."
- "Here are the remarks I wrote. Check them for fair housing and anything the worksheet doesn't support."
- "The seller sent this email with what they want said. What can I use, and how do I explain the rest?"
- "Just the Facebook caption, please. It goes live Friday."

## What Comes Back

Flags first: placeholders, the character limit to confirm, claims not used until you confirm them (a roof year the disclosure doesn't give, a drive time nobody measured, an HOA amenity that's only planned), conflicts between your documents (both numbers and where each came from), the Utah public marketing timing when a sign or post comes before the MLS date, and general mode outside Utah. Then a three-sentence bottom line; the Fair Housing Review (each flagged phrase quoted once, where it came from, why, and a rewrite); the public remarks with the character count; two Title Case headlines with counts; a social caption ending with your name and brokerage; Facts I Used, with the source of each; and Check before sending.

## What It Will Not Do

- Post anything, enter anything in the MLS, or write to a CRM.
- Add a feature, finish, square footage, upgrade, view, distance, commute time, school or HOA amenity the documents don't state.
- Use private remarks, showing instructions, lockbox codes, occupancy, owner names or the seller's reasons for selling in anything public.
- Say who a home suits, name a school or a place of worship, or make a safety or neighborhood claim.
- Suggest a list price or call the price good (that's Pricing Conversation Prep).
- Decide a fair housing question. It flags and explains; you and your broker decide.

## What You Need

- **Claude:** a plan with skills and code execution, as every skill page says (the help center lists skills on every plan, the developer docs on Pro and up). No connectors.
- **ChatGPT:** a Project. The four files fit Free's limit.
- **Your documents:** a listing worksheet or MLS input sheet; the seller's notes or a feature list. The county record and your own wording are optional.
- **Cost:** nothing beyond your plans.
- **Privacy:** worksheets hold owner names, phone numbers and lockbox codes. Turn off training first (the shared setup steps), and share the drafts, never the chat.

## Run / Draft / Own

- **Run:** reads every page, builds a fact sheet with a source for each fact, sets aside agent-only fields, compares the worksheet with the county record, counts characters with code, and runs the fair housing review on its own drafts and on your wording and the seller's.
- **Draft:** the public remarks, two headlines, the social caption and every rewrite, for you to read, edit and paste.
- **Own (you):** every fact with the seller, the MLS's limit and rules, the list price, when marketing starts (in Utah, a sign or post starts UtahRealEstate.com's one-business-day clock), whether to post, and the final fair housing call with your broker.

## FAQs

- **Why did it leave out something the seller told me?** Because another document contradicts it or leaves it open (the disclosure gives no roof year), nobody measured it (a drive time), it isn't built yet (a planned HOA amenity), or it describes people instead of the home. Each one is listed with what would let you add it back.
- **Why won't it say "walking distance" or "great schools"?** Fair housing law reaches statements in ads that indicate a preference based on a protected class, and "walking distance" assumes how a buyer gets around. The skill states the measured distance instead, and points school and safety questions to the school district and the police department. Some items on its list are style cautions rather than violations, and it says which.
- **What's the character limit?** It depends on your MLS. Tell it yours. UtahRealEstate.com's rules guide doesn't state one, so the skill flags it to confirm in the listing input screen or with Member Services (801-676-5400, Ext. 2).
- **Can I post the caption before the listing is on the MLS?** In Utah, a post or a yard sign is public marketing, and UtahRealEstate.com's Clear Cooperation and Public Marketing Rule then requires the listing on the MLS within one business day. The skill flags it when your dates don't line up. Ask your broker.
- **Does it work outside Utah?** Yes, in general mode: the federal fair housing rules and the same agent-only exclusions, and a flag that your state's and MLS's rules weren't checked.

## Practice Prompt

Attach the practice worksheet from `listing-description-writer-practice.zip` and say: **"Here's my listing worksheet for Example Aspen Way, with the sellers' notes. Write the MLS remarks, headlines and an Instagram caption."** The sample on this page is what came back.

## Suggested Library Keywords

listing description, MLS remarks, public remarks, property description, listing copy, listing headline, Instagram caption, Facebook caption, just listed post, coming soon, seller questionnaire, seller notes, listing worksheet, MLS input, character limit, fair housing, walking distance, family friendly, primary bedroom, UtahRealEstate.com, clear cooperation, agent remarks, private remarks

## Tested and Not Tested

**Tested (2026-11-10), with made-up files:**
- Practice run, a Sandy rambler with a three-page worksheet (public fields, agent-only fields, the sellers' notes): 10 of 10 checks, 21 of 21 objective checks. It caught the agent's own headline idea and two seller lines, cut a church and a "young family" line without repeating them, left the 2021 roof out because the disclosure gives no year, and flagged that the Friday Coming Soon sign means the listing must be on the MLS by Monday, three days before the planned go-live.
- Eval 1, a normal Lehi two-story with a county record that disagrees on the finished basement: 10 of 10, 20 of 20 objective checks. Remarks at 833 of 1,000 characters; the conflict flagged with both numbers; a "5 minutes to I-15" drive time left out.
- Eval 2, a Salt Lake City condo with a seller email full of problems: 10 of 10, 21 of 21 objective checks. It flagged "empty nesters or young professionals, no kids," "very safe neighborhood" and "walking distance," rewrote the last as the worksheet's measured 0.3 miles, and left out a rooftop deck the HOA has only approved.
- One rule changed during the evals: the seller's plain facts (a carpet year, a fence year) are used and marked for the agent to confirm, while claims another document contradicts or leaves open, unmeasured distances, conflicting sizes and plans are held back.

**Not tested:**
- Real listing worksheets and seller questionnaires from Utah Life agents.
- The ChatGPT Project inside ChatGPT; its instructions are built from SKILL.md by `evals/make/build_chatgpt.py`.
- A listing outside Utah (general mode), a listing with an agent's full draft remarks pasted in, another agent's listing, new construction, land or a rental.
- A no-skill baseline on the same files.
- The description against all the library's skills installed at once.

## Sources (all checked 2026-11-10 unless noted)

- UtahRealEstate.com, Rules and Regulations Reference Guide (revised February 11, 2026): https://help.utahrealestate.com/wp-content/uploads/2026/02/URE-Rules-and-Regulations-Reference-Guide-Effective-02-11-26.pdf
- Utah Code 61-2f-401(12), advertising and the brokerage name (effective 10/1/2026): https://le.utah.gov/xcode/Title61/Chapter2F/61-2f-S401.html
- Utah Code 57-21-5, Utah Fair Housing Act (effective 5/6/2026): https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html
- 42 U.S.C. 3604(c): https://www.law.cornell.edu/uscode/text/42/3604
- 24 CFR 100.75: https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100/subpart-B/section-100.75
- NorthstarMLS, "Ensuring Fair Housing in Real Estate Listing Public Remarks" (April 30, 2024): https://northstarmls.com/insights/ensuring-fair-housing-in-real-estate-listing-public-remarks/
- Salt Lake County Assessor parcel search (found by search; not opened): https://apps.saltlakecounty.gov/assessor/new/query.cfm
- Claude and ChatGPT setup: the shared steps in `apps/web/src/guides/skill-page.ts` (checked 2026-11-08) and Appointment Follow-Up's page notes (Claude file uploads, checked 2026-11-08).
- Not used: HUD's 1995 advertising guidance memo, which is no longer on HUD's website.
