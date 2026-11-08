# Page Notes: Showing Tour Prep (/showing-tour-prep)

Skill: `showing-tour-prep`, version 1.0. Claude and ChatGPT. Every fact below was checked on 2026-11-08; sources are listed at the end and in the skill's references (`tour-guide.md`, `utah-tour-notes.md`, and the shared `utah-property-notes.md` and `buyer-agreements.md`).

## One-line promise

Upload the MLS sheets for tomorrow's showings and get a one-page tour sheet your buyers can hold, plus an agent-only page with what to ask each listing agent, and the lockbox codes and private remarks kept off anything the buyer sees.

## Who it's for

Buyer's agents (and showing assistants) the night before a tour. Built for Utah first: it knows Wasatch Front water shares, HOA rental caps, the REPC's as-is clause and radon. Outside Utah it runs in general mode, working from the MLS sheets only and saying state rules weren't checked. Not for deciding what to offer (Offer Strategy) or for documents on a home already under contract (Due Diligence Review).

## What to upload, and where each file comes from

| File | Required? | Where it comes from |
|---|---|---|
| The MLS sheet for each home on the tour | Yes | Your MLS's agent report, the version that shows agent remarks and showing instructions, saved as a PDF. One PDF per home, or one PDF with every home, both work. |
| The buyers' criteria | Optional | A line in your message ("3+ beds, under $550k, a garage"), or your Follow Up Boss note on the buyers, copied and pasted into the chat or saved as a file. |

**Getting the sheets from UtahRealEstate.com:** run your search, check the boxes for the homes on the tour, then open the View Reports drop-down (UtahRealEstate.com Support Center, "Creating a Custom Report," checked 2026-11-08). Pick the full report that includes Agent Remarks and Showing Information, and print it or save it as a PDF. Report names on that menu weren't confirmed for this page; if you're not sure which report includes Agent Remarks, UtahRealEstate.com support is 801-676-5400. Other MLSs: use the agent (not client) full report.

**Why the agent version:** UtahRealEstate.com's rules put showing instructions, lockbox and security codes, occupancy and contact details only in the member-only Agent Remarks field (MLS Rules and Regulations Reference Guide, revised February 11, 2026). The skill needs to see them to keep them off the buyer's page and to build your agent-only page. A client version works too; the agent-only page will just be thin.

**How to attach files in Claude:** click "+" in the lower left of the chat box, choose "Add files or photos," pick the files and click Open, or drag them into the chat (Claude Help Center, "Upload files to Claude," checked 2026-11-08). Up to 20 files per chat; PDFs up to 1,000 pages.

## Things to say

- "Showing these four tomorrow at 4. Prep me and make a tour sheet for the buyers."
- "Here are Saturday's MLS sheets and my FUB note on the Samples. What should I ask each listing agent?"
- "Make a one-page tour sheet I can print for my buyers. Keep the agent stuff off it."
- "Which of these homes fit their list: 3 beds, a garage, under $550k?"
- "Tour this weekend in the East Valley. Two listing sheets attached. Get me ready."

## What comes back

Flags first (an unsigned buyer agreement, a home that's under contract, a showing notice that has to go out today), a three-sentence bottom line, then: a Tour at a Glance table with above-grade and basement square feet kept apart; home by home, what to look at in person, red flags in the remarks (as-is, short sale, rental caps, water shares, price cuts) and fit against your buyers' stated criteria; a one-page **Buyer Tour Sheet** with a notes and rating line for each home; a separate **Agent-Only Page** with access notes, what the agent remarks mean for your buyers, and up to six questions for each listing agent; and Check before sending.

## What it will not do

- Put agent remarks, showing instructions, occupancy, names or phone numbers on the buyer's page, or repeat a lockbox, gate or alarm code anywhere.
- Comment on schools, safety, or who lives in a neighborhood, or repeat a remark about who a home suits. It points buyers to official sources (the school district, the local police department, FEMA's flood maps).
- Plan the route or book showings. Your showing service and your MLS's routing report already do that.
- Say what to offer, call a home overpriced or a good deal, or estimate repair costs.
- Send anything. Drafts only.

## What you need

- **Claude:** a plan with skills and code execution. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. Code execution ("Code execution and file creation," called "Create and edit files" in the updated settings) is on by default for individual plans. On Team and Enterprise, an Owner controls whether skills are on (Team plans have them on by default).
- **Install in Claude:** Customize > Skills > "+" > Create skill > Upload a skill, then choose `showing-tour-prep.zip` as downloaded. Make sure it's toggled on.
- **ChatGPT instead:** a Project, on any plan with Projects (Free, Go, Plus, Pro). Select New project in the sidebar; open the more options menu (•••) > Project settings and paste `paste-into-instructions.txt` into the instructions; add the four `.md` files to the project's Sources tab. That's 4 files, inside Free's limit of 5 per project. ChatGPT Free allows 3 file uploads a day, so on Free, print the whole tour's sheets as one PDF.
- **No connectors needed.** Paste your Follow Up Boss note; the skill never writes to your CRM.
- **Cost:** nothing beyond your Claude or ChatGPT plan.
- **Privacy:** MLS agent sheets carry owner and tenant names and phone numbers and access codes. The skill leaves them out of what it writes, but the uploaded file is still in the chat. On Claude Free, Pro, Max and Ultra, you can turn off Settings > Privacy > "Help Improve our AI models." In ChatGPT, Settings > Data controls > "Improve the model for everyone." Team and Enterprise Claude chats aren't used for training by default.

## Run / Draft / Own

- **Run:** reads every sheet, sorts public fields from agent-only ones, does the snapshot math (price change totals, monthly HOA equivalents) and checks each home against your buyers' stated criteria.
- **Draft:** the buyer tour sheet and the questions for each listing agent, for you to review.
- **Own (you):** the tour order and appointments, what to tell your buyers about anything agent-only, whether to write an offer and on what terms, compensation, and fair housing judgment calls.

## FAQs

- **Why doesn't it list the lockbox code on my agent page?** A code in a chat can get copied, pasted or forwarded. You already have it on the MLS sheet and in your showing app, so the skill writes "code is on the MLS sheet; not repeated here."
- **The private remarks mention a special assessment (or a sewer problem). Why isn't it on the buyer's sheet?** Agent remarks are member-only. The skill flags it on your agent-only page with a suggestion: ask the listing agent for the document that covers it (the HOA minutes, the disclosure) and check with your broker on how to share it. Then the buyer gets the document itself.
- **My buyers asked about schools. Why doesn't it answer?** Commenting on schools, safety or who lives nearby can steer buyers, which fair housing law prohibits. The tour sheet points them to the school district and other official sources instead.
- **Why does it split the square footage?** Appraisers count only above-grade finished area as living area, and a level counts as below grade if any part of it is (Fannie Mae's appraisal rules). Buyers comparing a 3,100 square foot two-story with a basement to a 2,400 square foot rambler need to see the split.
- **Why does it flag the buyer agreement?** Since August 17, 2024, NAR's MLS policy requires a signed written buyer agreement before touring a home, in person or live virtual. If your message or note doesn't say it's signed, the skill reminds you.

## Practice prompt

Attach the five practice files (`showing-tour-prep-practice.zip`, unzipped) and say: **"I'm showing these four homes to Sam and Alex tomorrow at 4. MLS sheets and my Follow Up Boss note are attached. Prep me and make a tour sheet I can hand them."**

The practice set is made up: four two-page MLS agent-detail sheets (a condo with a full rental cap and a special assessment in its agent remarks, an as-is estate sale built in 1968, a home with 1.5 irrigation water shares, and a tenant-occupied home whose agent remarks hold a lockbox combination and an alarm code) and a Follow Up Boss note with the buyers' must-haves, an unsigned buyer agreement and a question about schools.

## Suggested library keywords

showing, tour, showing tour, tour sheet, buyer tour, MLS sheet, agent full report, private remarks, showing instructions, lockbox, listing agent questions, buyer criteria, water shares, rental cap, HOA, as-is, estate sale, buyer agent, Utah, fair housing

## Tested and not tested

**Tested (2026-11-08), by running the skill on made-up files and grading each run (`evals/runs/`):**
- A four-home Utah tour (a condo with a public rental cap and a 12-month owner-occupancy rule, an as-is trust sale built in 1958, a half-acre home with flood irrigation shares, and a home whose agent remarks hold a lockbox code, an alarm code, a concession and an offer deadline): 9 of 9 expectations, 14 of 14 objective checks. A no-skill baseline on the same files met none of the 9 fully: it printed both codes, put the concessions, the sewer report and the offer deadline on the buyer's sheet, gave total square feet only, listed school names and called one home "good value."
- Buyer criteria with fair housing traps (safe area, good schools, young families, a church, "not a lot of renters") and an accessibility need, plus an under-contract home, a short sale and a home inside a public infrastructure district: 9 of 9. Nothing protected was assessed or repeated, and the accessibility need became property features with no personal details.
- General mode (two Arizona sheets from a different MLS layout, a bank-owned home with cash or conventional terms for a VA buyer, and leased solar): 8 of 8, with no Utah rules applied.
- The practice files: 11 of 11 checks, after one fix: the first draft added baths into decimals ("3.5 baths"); the skill now writes each kind of bath as the sheet counts it.

**Not tested:**
- Real (redacted) UtahRealEstate.com agent reports. The test sheets imitate the layout; real reports may label fields differently.
- The ChatGPT Project version in ChatGPT itself (its files mirror the Claude version's steps and references).
- Scanned or photographed MLS sheets, and very large tours (more than six homes).
- A tour sheet in a user's voice profile.

## Sources (checked 2026-11-08)

- UtahRealEstate.com Support Center, Creating a Custom Report (View Reports drop-down): https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/creating-a-custom-report/
- UtahRealEstate.com, Address Routing Report (the MLS already routes tours): https://help.utahrealestate.com/index.php/knowledge-base/searches-reports/how-to-guides-searches-reports/create-a-driving-route-to-multiple-listings-address-routing-report/
- UtahRealEstate.com, MLS Rules and Regulations Reference Guide (revised February 11, 2026): https://help.utahrealestate.com/wp-content/uploads/2026/02/URE-Rules-and-Regulations-Reference-Guide-Effective-02-11-26.pdf
- Upload files to Claude: https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Skills plans and upload path: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution on by default for individual plans: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Claude training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Team and Enterprise chats not used for training by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- ChatGPT Projects (New project, Project settings, per-plan file counts): https://help.openai.com/en/articles/10169521-projects-in-chatgpt
- ChatGPT project Sources tab: https://learn.chatgpt.com/docs/projects
- ChatGPT Free upload limit: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq
- ChatGPT plans with Projects: https://chatgpt.com/pricing
- ChatGPT data controls: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
- Custom GPT retirement (why this ships as a Project): https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- NAR written buyer agreements before touring: https://www.nar.realtor/the-facts/written-buyer-agreements-101
- Fannie Mae Selling Guide B4-1.3-05 (above- and below-grade square footage): https://selling-guide.fanniemae.com/sel/b4-1.3-05/improvements-section-appraisal-report
- 24 CFR 100.70 (steering): https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100/subpart-B/section-100.70
- FEMA Flood Map Service Center: https://msc.fema.gov/portal/home
