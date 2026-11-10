# Page Notes: Recruiting Prep

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-08; sources inline.

## One-Line Promise

Upload the recruit list you already have and get it back clean, de-duplicated and tiered by production, with first-touch messages for each tier; or upload one candidate's production and walk into the recruiting coffee prepared.

## Who It's For

Team leaders, recruiting directors, recruiters and appointment setters on real estate teams, in any state and at any brokerage. Built for the Forum survey's recruiting pain: lists that mix an MLS production report with a tracker someone keeps by hand, full of duplicates, old numbers and notes that shouldn't be there.

## What to Upload, and Where It Comes From

**List mode** (one or more of these; mixing them is the point):
1. **An MLS agent production report or roster export.** Every MLS builds these differently, and many teams get them through a statistics tool the MLS licenses. There is no single click path: ask your MLS's help desk how to export agent production for the last 12 months as Excel or CSV, and check your MLS's rules on using it for recruiting first (see FAQs).
   - BrokerMetrics: open the Overview or Contact Information grid, then File > Export; the file holds the agents and columns on screen. Its "all transactions" columns cover the agent's last 12 complete calendar months. Source: BrokerMetrics help, Export and Proficiency Metrics Overview View (checked 2026-11-08): https://metrics.terradatum.com/help/export.htm and https://metrics.terradatum.com/help/recruiting_overview.htm
2. **Sisu Recruiting & Onboarding:** on the Recruits page, the Download icon on the right exports the recruits on screen to a spreadsheet. Source: Sisu, "Recruiting & Onboarding: Recruits Page Overview" (June 8, 2026, checked 2026-11-08): https://kb-app.sisu.co/en/articles/15361806-recruiting-onboarding-recruits-page-overview
3. **GoHighLevel:** Opportunities in the left sidebar, then the three-dot menu at the top right, then Export Opportunities; or open a Smart List and use its three-dot menu, Export. Source: HighLevel, "Opportunities FAQs" (modified 2026-04-21) and "Smart Lists in Opportunities" (checked 2026-11-08): https://help.gohighlevel.com/support/solutions/articles/155000002000-opportunities-faqs and https://help.gohighlevel.com/support/solutions/articles/155000007734-smart-lists-in-opportunities
4. **Follow Up Boss** (teams that track recruits with a stage or tag): People > All People, filter to your recruits, check the box next to Name and Select All, click Export (the downward arrow), check the box to export all columns, then Yes, Export People. The account owner can export, plus anyone the owner gives Can Export (Admin > Teams). Source: Follow Up Boss, "Export Contacts to a Spreadsheet" (updated 2026-04-21, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
5. **Your own tracker:** upload the Excel or CSV as it is. A Google Sheet: File > Download, then choose Microsoft Excel or CSV. Source: Google Docs Editors Help, "Create, view, or download a file" (checked 2026-11-08): https://support.google.com/docs/answer/49114
6. **Optional, your roster** (name, role, email, phone, MLS ID), so your own agents come off the list and each tier gets a suggested owner.
7. **Optional, your value proposition or offer document** (PDF or Word), so the angles and drafts use your real offer. If it's organized by production level, those levels become the tiers.

**Appointment mode:**
1. **The candidate's production:** their MLS agent production page or transaction list (PDF or export), or their row in a list you already ran.
2. **Your value proposition or offer document**, if you have one. Without it, everything about what the candidate likely needs is labeled general guidance.
3. **After the meeting, optional:** your notes or the transcript, to fill in the follow-up email. If Granola is connected, ask Claude to read that meeting's notes; Granola's own listing says transcripts and full meeting history need a Granola Business or Enterprise plan (checked 2026-11-08: https://claude.com/marketplace/connectors/granola).

## Things to Say

1. "Here's our MLS production report and our recruiting tracker. Clean it up, tier it, and give me first-touch messages for each tier."
2. "Here's our GoHighLevel recruiting pipeline. Our tiers: A is 20 or more closings, B is 10 to 19, C is under 10. Split them between Avery and Jordan."
3. "I'm having coffee with Dana on Thursday. Here's her MLS production page and our value proposition. Prep me."
4. "Here are my notes from coffee with Dana. Write the follow-up email."
5. "Here's our roster too. Take our own agents off and tell me who should work which tier."

## What Comes Back

**List mode:** a three-sentence bottom line; flags (the MLS rules check, placeholders, notes left out, state rules); what was merged, file by file and rule by rule, with possible duplicates for a person to check; tiers by production (your tiers, your offer document's levels, or labeled default tiers with the cut points shown); why-now signals from the data (production up or down, new production, office changes); owners by tier; one angle and first-touch email per tier, plus a text only for contacts with documented consent; organized-recruit-list.csv, one row per agent with every source row traced and no notes; and Check Before Sending.

**Appointment mode:** a bottom line; the candidate's production profile with the math shown; what agents at that level usually need (your document first, general guidance labeled); discovery questions and a don't-ask list; how your offer maps to those needs; your terms as written, word for word; likely objections answered from your documents; a follow-up email; and Check Before Sending.

## What It Won't Do

- Tier, rank or write about anyone on age, family, pregnancy, marital status, health, religion, national origin or any other personal trait, even if your notes or your message mention one. It never reads a notes column into anything.
- Project what a candidate would earn, net or take home, or compare their income with yours, even from their own numbers. It quotes your terms as written so the candidate can run their own numbers with their own advisor.
- Use or repeat an earnings, results or lifestyle claim. It flags any it finds in your documents for your broker.
- Say anything negative about a candidate's current brokerage, team or broker.
- Text anyone without documented consent, send anything, or write to Follow Up Boss, Sisu or GoHighLevel. Drafts only.
- Run sequences or reminders (your CRM does that), answer license transfer, contract or tax questions (your broker, attorney or CPA), or onboard an agent who already joined (use Team Playbook Builder).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center says skills are available on Free, Pro, Max, Ultra, Team and Enterprise and need code execution, which is on by default for Free, Pro, Max and Ultra (Settings > Capabilities > "Code execution and file creation," called "Create and edit files" in the newer settings). Claude's docs list Pro and up for custom skills, so Free is unconfirmed. Install: Customize in the left sidebar > Skills > "+" > "+ Create skill" > "Upload a skill," then upload recruiting-prep.zip and turn it on. Sources (checked 2026-11-08): https://support.claude.com/en/articles/12512180-use-skills-in-claude (modified 2026-10-30) and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- **Privacy:** recruit lists hold other agents' contact details. On Free, Pro, Max and Ultra, turn off model training before uploading: Settings > Privacy > "Help Improve our AI models." Team and Enterprise chats aren't used for training by default. Sources: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings and https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training (checked 2026-11-08).
- **Optional connectors:** Google Drive or Microsoft 365 to read your offer document, Granola for meeting notes, Gmail to save drafts when you ask. None are required.
- **ChatGPT version:** a ChatGPT Project with the four files (instructions plus list-code.md, recruiting-guide.md and outreach-rules.md) and the short text in its Instructions box. It needs data analysis, which Free has only as "Limited." Free allows 5 files per Project and 3 file uploads a day. Sources: https://chatgpt.com/pricing (read directly) and OpenAI help center articles https://help.openai.com/en/articles/10169521-projects-in-chatgpt and https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq (read only through search excerpts, because help.openai.com blocks direct reads; confirm in a browser before publishing). Turn off training in ChatGPT: Settings > Data controls > "Improve the model for everyone" (https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt).
- **Accounts:** MLS access for the production report, or the recruiting tool you already use. **Cost:** nothing beyond your Claude or ChatGPT plan.

## Run, Draft, Own

- **Run:** reads and merges every file, de-duplicates, does the production math in code, tiers, finds the signals in the data, and sorts text consent.
- **Draft:** the angles, first-touch emails and consent-only texts, the discovery questions, objection answers and the follow-up email, for you to review.
- **Own:** who to recruit and who calls them, any offer, every split, cap or fee, any banking or payment detail (the skill never asks for or repeats one), texting consent and the Do Not Call scrub, the MLS rules check, and the fair treatment review of anything that goes out.

## FAQs

**Can I upload my MLS's production report?** Check your MLS's rules first. They vary: one MLS's rules expressly allow using MLS information to recruit agents to another brokerage (Bay East, Section 12.11.1), while another bars giving MLS information to software vendors or online AI tools without a separate license (MLS Now, Rule 7.3). The skill flags this every time. Your broker can help you read your MLS's rules.

**Will it text my recruits?** It never sends anything. It drafts texts only for contacts your file shows have documented consent (a signed form or a dated opt-in) and holds anyone with a bare "yes" until you confirm a written record. Every text names you and your team and ends with "Reply STOP to opt out." Whether federal telemarketing rules reach a recruiting text isn't settled, so the drafts follow every marketing text rule anyway; state rules differ, so confirm yours with your broker.

**Why is it stricter than the law?** It uses our conservative defaults. Every email carries the full footer: the line that says it's a recruiting message, the way to opt out and your postal address. No calls or voicemails go on a Sunday or a legal holiday. A consent record that names only a portal, a lead company or "real estate professionals," and not your team or brokerage, means no text until your broker confirms it covers you. You can calibrate these with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check before sending.

**The candidate wants to know what she'd make with us. Can it run the numbers?** No. The FTC's cases treat earnings claims as material and require a reasonable basis for them, and whether that reaches a team's recruiting pitch isn't settled, so the skill stays out of it entirely, even with the candidate's own production. The skill lays out your split, cap and fees word for word so she can run her own numbers with her own advisor.

**We don't have tiers or a value proposition document.** It builds default tiers from your list's own spread and labels them as defaults, and every angle and needs statement is labeled general guidance with a placeholder for your offer. Tell it your tiers or upload your offer and it redoes them.

**Our tracker has a notes column with personal stuff in it.** The skill never reads notes into tiers, angles, drafts or the CSV. It tells you how many rows hold personal details and of what kind, never what they say, and suggests deleting them from the source.

## Practice Prompt

With both practice files attached (PRACTICE Recruit List.xlsx and PRACTICE Team Value Proposition.pdf): "Here's our recruit list (the MLS export and our own list are two tabs) and our value proposition one-pager. Organize and tier the list and draft first-touch messages. Then prep me for my coffee with Marisol Quillpocket on Tuesday, November 10 at 11."

The workbook is a made-up Bayside Example MLS production report (71 rows) plus a team tracker (31 rows) with duplicates, a pasted-twice row, an agent who changed offices, an agent at the team's own brokerage, an opt-out, consent in three forms and one personal note. The one-pager is a made-up team offer by production level with a results claim the skill should flag. Expect a result like sample.md.

## Suggested Library Keywords

recruiting, recruit list, agent recruiting, MLS production report, BrokerMetrics, Sisu Recruiting, GoHighLevel, top producers, team leader, recruiter, appointment setter, recruiting coffee, value proposition, objections, split and cap, first-touch email

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md):
- A messy 205-row mix of an MLS production report and a tracker with a roster: 12 of 12 expectations after one fix round (a made-up price illustration was removed and the guardrail tightened).
- Appointment prep for a 30-side agent with no value proposition document, where the user asked for take-home math: 10 of 10 after one fix round. A no-skill baseline on the same prompt passed 2 of 10: it projected her take-home from an assumed commission rate and drafted an email with no opt-out line.
- A GoHighLevel export with a notes column of personal details, a request to use them, team tiers and Florida contacts: 10 of 10 after one fix round.
- The practice files, both modes in one request: 12 of 12; kept as sample.md.
- The shipped list code on edge cases outside the cases: first and last name in separate columns, a totals row, an office phone shared by five agents, an "LLC" office name, a list too small for default tiers.
- An independent review on 2026-11-08 reran the GoHighLevel case (10 of 10) and the practice files (12 of 12) from the skill alone and got the same counts. It tightened two things the runs disagreed on: drafts now say nothing about the sender or team that the files don't, and agents with no production data share one email built from what the team's document says applies to everyone.

Not tested:
- A real MLS agent production report, BrokerMetrics export, Sisu recruits download or GoHighLevel export. Their exact column headers weren't available; the code maps columns by meaning and reports what it mapped, and should be checked against one real export from a Forum member before release.
- Utah Life's value proposition by production level (handoff Section 11, item 4), once Connor has it.
- The ChatGPT version inside ChatGPT, including whether a Project file can be loaded into data analysis (the instructions fall back to writing the same rules from the guide).
- Granola, Google Drive and Gmail connectors, and lists over a few hundred rows.
