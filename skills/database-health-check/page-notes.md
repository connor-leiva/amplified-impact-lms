# Page Notes: Database Health Check

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-08; sources inline.

## One-Line Promise

Upload your CRM export and get a health report, a cleanup worklist your VA can work today, and the groups worth calling or emailing this month, with the messages drafted.

## Who It's For

Team leaders, owners and ops staff on real estate teams, in any state and any brokerage. Built for Follow Up Boss (10 of 12 Forum survey respondents run it) and works with other CRMs' exports. For anyone whose database has grown past what the team can see: duplicates, leads nobody called, past clients nobody has talked to in a year.

## What to Upload, and Where It Comes From

1. **Your contact export (required).**
   - Follow Up Boss: go to People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then click Yes, Export People. A CSV downloads right away. Exporting never changes your contacts. Source: Follow Up Boss help center, "Export Contacts to a Spreadsheet" (updated 2026-04-21, checked 2026-11-08): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
   - Who can export in Follow Up Boss: the Account Owner, plus anyone the owner has given Can Export (Admin > Teams, the Can Export checkbox; only the owner can grant it). The owner gets an email whenever someone exports. Run it from All People as the owner or an admin so the file holds everyone; an agent's export holds only the contacts that agent can see. Sources: "Users, Roles & Permissions" (updated 2025-09-25) https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions and "Invite and manage your team" (updated 2026-07-22) https://help.followupboss.com/hc/en-us/articles/4402370641175-Invite-and-manage-your-team, both checked 2026-11-08.
   - Tip, before you export: turn on the Last Communication and Last Activity columns (People, then Columns in the upper right, check each box). Follow Up Boss's help center doesn't say whether these come through with Export All Columns. If your file doesn't have them, the skill says so and reads dates from the calls, texts and notes in the export instead (marked approximate). Source for the Columns path: "Filtering contacts" (updated 2026-07-22) https://help.followupboss.com/hc/en-us/articles/360018863574-Filtering-contacts
   - Tip, if you use ponds: Follow Up Boss exports pond leads under the pond's lead agent and leaves out the pond name. Add the pond name as a tag before exporting if you want pond numbers. (Same export article.)
   - GoHighLevel: only admin users can export. Contacts > Smart Lists, select the contacts (Select All Contacts for everyone), then More > Export; the file holds only the columns shown in the table (Manage Fields), and the finished file waits in Contacts > Bulk Actions for 30 days. Source: HighLevel help center, "Contacts - Export as CSV" (modified 2025-12-24, checked 2026-11-08): https://help.gohighlevel.com/en/support/solutions/articles/48001238482-how-to-export-contacts-to-a-csv-in-highlevel
   - KW Command, Brivity or another CRM: export every contact with every column your CRM allows. These click paths weren't checked; point people to their CRM's help center.
2. **Closed deals (optional):** a closed-transaction export from Sisu, your brokerage's back office, or a spreadsheet with client name, email or phone, and close date. It finds past clients who aren't labeled as past clients and closed clients missing from the CRM. Sisu's export steps weren't checked for this page.
3. **Your team's rules (optional):** your stage definitions, follow-up standard and pond rules, as a PDF, doc or a sentence in the chat ("our standard is 60 days; leads go to the pond after 45"). Without them, the skill uses labeled defaults and asks.

## Things to Say

1. "Here's our Follow Up Boss export. Run a database health check and give me a plan to work it."
2. "Here's our CRM export and our closed deals from Sisu. Which past clients haven't heard from us in a year?"
3. "Clean up our CRM: give my VA a worklist of duplicates and bad stages."
4. "Our follow-up standard is 60 days and leads go to the pond after 45. Run it again with our rules."
5. "Which groups should my agents call this month, and what should they say?"

## What Comes Back

- A three-sentence bottom line: database size, the three biggest problems with counts, and the one cleanup to do first.
- A health report in counts and percentages: contacts by stage, source and agent; missing or bad emails and phones; likely duplicates; active-stage contacts gone quiet, by stage and agent; leads never contacted; past clients and sphere untouched for a year; stage problems; unassigned contacts; messy tags; how many contacts have text consent on record.
- cleanup_worklist.csv: one row per record that needs work, with the action (merge candidate, fix stage, assign agent, pond decision, fill a missing field, archive candidate) and the reason. Duplicates owned by two different agents are marked so the team, not the VA, decides who keeps the contact. It's the only file with names and phone numbers.
- Four to six re-engagement segments, each with its Follow Up Boss Smart List filter, size, owner and next move.
- Questions for your team wherever the data shows a missing rule.
- Drafts for each segment: an email, a call opener for call lists, and a text only for contacts with documented consent, for the agent to send one person at a time.
- A Check Before Sending list.

## What It Won't Do

- Change anything in your CRM: no merges, reassignments, stage changes, tags or deletes. It recommends; your team acts.
- Route leads, score leads or reassign one agent's neglected leads (Follow Up Boss and Sisu do that).
- Send anything, or draft texts for contacts without documented consent. Its texts are for an agent to send one at a time, not a mass text: Follow Up Boss says its texting is for one-to-one conversations ("Calling and Texting Compliance," updated 2025-07-18, checked 2026-11-08: https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance).
- Group contacts by age, family status or anything else the data doesn't say.
- Promise results from working a segment.
- Work a recruit list (use Recruiting Prep) or a P&L (use Team P&L Review).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center says skills work on Free, Pro, Max, Ultra, Team and Enterprise and need code execution, which is on by default for Free, Pro, Max and Ultra (Settings > Capabilities > Code execution and file creation; "Create and edit files" in the newer settings). Claude's docs list Pro and up for custom skills, so Free is unconfirmed. Sources: https://support.claude.com/en/articles/12512180-use-skills-in-claude (modified 2026-10-30) and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (modified 2026-11-05), checked 2026-11-08. Chat uploads can be up to 500 MB per file (https://support.claude.com/en/articles/8241126-uploading-files-to-claude). A big export and a long report use more of your plan's usage, since file size and conversation length count (https://support.claude.com/en/articles/9797557-usage-limit-best-practices).
- **ChatGPT version:** a ChatGPT Project with the four files. It needs data analysis, which Free has only as "Limited," and Free allows 5 files per Project and 3 file uploads a day; CSVs can be about 50 MB. Sources: https://chatgpt.com/pricing (read directly) and OpenAI help center articles read only through search excerpts (help.openai.com blocks direct reads), so confirm these in a browser before publishing.
- **CRM:** a Follow Up Boss account with export permission, or another CRM that exports contacts. No connector needed.
- **Cost:** nothing beyond your Claude or ChatGPT plan and your CRM.
- **Computer:** Follow Up Boss downloads the export to your computer as a CSV, so a computer is the easy way to get the file and attach it. The skill runs in Claude on the web or the desktop app.

## Run, Draft, Own

- **Run:** reads the export, does every count in code, finds duplicates and stage problems, sizes the segments and builds the worklist.
- **Draft:** the Smart List filters, segment plan, team questions, emails, call openers and consent-only texts, for you to review.
- **Own:** every merge, stage change, reassignment, pond move and archive; texting consent and the Do Not Call scrub; the fair housing review of every message; who gets called.

## FAQs

**Does it change anything in Follow Up Boss?** No. It never writes to your CRM, even with a connector. The worklist tells your VA what to change, and people make every change.

**Will it text my leads?** It never sends anything. It drafts texts only for contacts your export shows have consented, and only when the export has a consent field. If your consent field says a yes came from a website form or an open house sign-in, it reminds you that those count only if the form had text consent wording. Follow Up Boss has no consent column of its own, so most teams record consent in a custom field or tag. No field, no text drafts; the skill tells you how to add one.

**Our export doesn't have Last Communication. What happens?** The skill says so up front, reads the dates in the calls, texts and notes columns instead, and marks those checks approximate. Turning the Last Communication column on before exporting may bring it through.

**We're on KW Command, GoHighLevel or Brivity. Does it work?** Yes. It maps your columns by name (Lead Status, Owner, Last Contacted, and so on) and shows the map at the top of the report so you can correct it. The segment filters come back in plain words for your CRM.

**Is our client data safe?** Turn off model training before you upload real contacts: in Claude, Settings > Privacy, then turn off "Help Improve our AI models" (Anthropic Privacy Center, "How do I change my model improvement privacy settings?", checked 2026-11-08: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings). On a Team or Enterprise plan, chats aren't used for training. The report and chat show only counts and agent names; names, emails and phone numbers appear only in the worklist file. Follow Up Boss also emails your account owner after every export.

## Practice Prompt

With PRACTICE-followupboss-people-export.csv attached: "Here's our Follow Up Boss export. Run a database health check and give me a plan to work it."

The practice file is a made-up Follow Up Boss export of 500 contacts with five fictional agents, a pond tag, duplicates, missing phones, stale leads and a Text Consent custom field. Expect a result like sample.md.

## Suggested Library Keywords

CRM cleanup, database health, Follow Up Boss, FUB export, dedupe, duplicates, Smart Lists, ponds, past clients, sphere, SOI, nurture, stale leads, team leader, ops, VA worklist

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md):
- A 5,000-contact Follow Up Boss export plus a closed-deal file: 15 of 15 expectations after one fix round. The analysis ran in under a second.
- Another CRM's 1,200-contact export with different column names, two title rows and a team rules PDF: 9 of 9 after one fix round.
- A Follow Up Boss export with no consent field: 8 of 8; no texts drafted and the gap named. A no-skill baseline on the same file passed 2 of 8.
- The practice file: 12 of 12; kept as sample.md.
- Spot checks outside the cases: the same export as XLSX, and an export with the Last Communication column removed (dates read from calls, texts and notes).

Independent review (2026-11-08): a second reviewer ran case 2 and the practice file from scratch before reading these results (evals/runs/case-2/review-output.md and evals/runs/practice/review-output.md): 9 of 9 and 12 of 12, with the same counts. The review found three things the skill left unclear and fixed them: which three worklist actions to explain, duplicates owned by two different agents (now counted and sent to the team), and consent recorded as a website form or open house sign-in (now counted and flagged). It also removed one unverified Follow Up Boss claim from the sample. Every count in the earlier runs is unchanged.

Not tested:
- A real Follow Up Boss export. The practice and test files follow the column list in Follow Up Boss's help center plus two view columns; the real header row, date format and Is Contacted values should be checked against one real export (Connor's or a Forum member's) before release.
- Real KW Command, Brivity or GoHighLevel exports, and Sisu's closed-deal export format.
- The ChatGPT version inside ChatGPT, including whether a Project file can be loaded into data analysis (the instructions fall back to writing the same checks from the guide).
- Exports larger than 5,000 contacts, and a CRM connector.
