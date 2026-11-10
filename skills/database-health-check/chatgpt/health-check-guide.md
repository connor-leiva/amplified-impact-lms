# Database Health Check Guide

Three parts: Follow Up Boss and other CRM exports; the health rules (checks, team rules, segments, worklist); and how to write the nurture drafts. Consent and opt-out rules are in outreach-rules.md.

## Follow Up Boss and Other CRM Exports

Last verified: 2026-11-08, against Follow Up Boss's help center (help.followupboss.com) and HighLevel's help center. Sources and each article's last-updated date are at the end. Follow Up Boss changes its screens often: when a click path here and the user's screen disagree, trust the screen and say so.

### Getting the Export (Follow Up Boss)

- Who can export: the Account Owner by default. Only the owner can give other users the Can Export permission (Admin > Teams, the Can Export checkbox). The owner gets an email each time anyone exports.
- Run it as the owner or an admin with Can Export, from People > All People. All People holds every contact the user can see: admins see the whole account, agents see only their assigned, collaborator and pond leads.
- Steps: People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once. Exporting never removes or changes contacts.
- Without Export All Columns, the file holds the name plus the columns turned on in the current view, and only the first phone, email and address. With it, the file holds up to six of each.

### What a Follow Up Boss All-Columns Export Holds

The help center lists these columns for Export All Columns: Date Added, Name, First Name, Last Name, Stage, Lead Source, Assigned To, Last Assigned, Is Contacted, Listing Price, Tags, Email 1 (to 6) with Email - Type, Timeframe, Phone 1 (to 6) with Phone - Type, Address 1 (to 6) Street, City, State, Zip, Country and Type, Property Address, City, State, Post Code, MLS #, Price, Beds, Baths, Area and Lot, Message, Description, Notes, Calls, Texts, Background, Deal Stage, Deal Close Date, Deal Price, Campaign Source, Medium, Term, Content and Name, and Custom Fields. It adds up to four relationships per contact (spouse first) and each contact's most recent 50 calls, 50 texts and 50 notes.

What the help center does not list, so do not assume it is there:
- A contact ID column. Without one, the worklist identifies each record by its row in the file, its name and its first email or phone, which is how ops finds it with Follow Up Boss's search.
- Last Communication and Last Activity. These are People-page columns and Smart List filters. Whether they come through in an all-columns export is not stated. Use them when the file has them; otherwise the analysis falls back to the dates in the Calls, Texts and Notes columns and labels the stale checks approximate.
- The pond name. Pond leads export "with the Pond lead assignment" and the pond name is left out. Follow Up Boss suggests adding the pond name as a tag before exporting.
- A text consent field. Follow Up Boss has no built-in consent column. Teams that track consent usually use a custom field or a tag, which exports with the contact.
- Email content and call recordings (not exportable).

### Columns the Analysis Recognizes in Other CRMs

The analysis maps columns by name, case and punctuation ignored. These are the names it looks for, not a claim about any one vendor's export:

| What | Header names it accepts |
|---|---|
| Record ID | ID, Contact ID, Person ID, Lead ID, Record ID, CRM ID, Client ID |
| Name | Name, Full Name, Contact Name, Lead Name, or First Name plus Last Name |
| Stage | Stage, Lead Stage, Status, Lead Status, Contact Status, Pipeline Stage, Lifecycle Stage |
| Source | Lead Source, Source, Origin, Contact Source |
| Agent | Assigned To, Assigned Agent, Agent, Owner, Contact Owner, Lead Owner, Assigned User |
| Date added | Date Added, Created, Created Date, Date Created, Created At, Date Entered |
| Last communication | Last Communication, Last Contacted, Last Contact Date, Last Touch, Date Last Contacted |
| Lead activity | Last Activity, Last Website Visit, Last Visit, Last Engagement |
| Emails and phones | Email, Email Address, Primary Email, Email 1 to 6; Phone, Mobile, Cell, Home Phone, Phone 1 to 6 |
| Tags | Tags, Labels, Groups, Lists |
| Consent and opt-outs | any column naming SMS or text with consent or opt in; text or SMS with opt out; DND; Email Opt Out; Unsubscribed; Do Not Call or DNC |

When a CRM has no last-communication column but has Last Activity, the analysis uses it and says to confirm that the CRM's Last Activity counts agent outreach. In Follow Up Boss, Last Activity is the lead's own activity (inquiries, website visits), never the team's outreach, so it is used only for the Back On The Site segment.

Columns the analysis ignores on purpose: anything naming a birthday, age, credit, income, loan, account or routing number, Social Security number, marital status, children, gender, race, religion, disability or veteran status, plus every relationship column. It reads Notes, Calls and Texts only for dates.

HighLevel (GoHighLevel), as an example of another CRM (help article modified 2025-12-24): only admin users can export; Contacts > Smart Lists, select the contacts (Select All Contacts for everyone), then More > Export; the file holds only the columns visible in the table (Manage Fields), and the finished file waits in Contacts > Bulk Actions for 30 days. Exports run per sub-account. For any other CRM, tell the user to export every contact with every column their CRM allows, and confirm the steps in that CRM's help center.

### Stages

- Follow Up Boss's default stages and definitions: Lead (not spoken to yet, the default for new people), Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract (offer accepted), Nurture, Rejected, Closed (closed deal or post-closing), Trash.
- Lead, Closed and Trash are system stages and cannot be renamed or deleted. Only the Account Owner creates, renames or deletes stages (Admin > Stages).
- Many teams add stages such as Past Client and Sphere. Follow Up Boss's default Past Clients Smart List uses the Closed stage, so a team with both Closed and Past Client stages needs a rule for which is which.
- When an import has a stage or agent name Follow Up Boss doesn't have, it adds a tag such as "Imported Stage: Warm" or "Imported Agent: Jane Doe". Leftover tags like these mean an import was never cleaned up.

### Duplicates and Merging

- Follow Up Boss deduplicates imported and web leads automatically when the email matches, or when the phone number and the first and last name all match. Duplicates still slip in through manual entry, typos, a second email or phone, and integrations.
- Merging: search the name, View List of People, select the records, Mass Actions > Merge People, choose the main contact. Up to 10 at once. The main contact keeps its name, assigned agent, assigned lender, stage and running action plan; the other records' data moves to it and those records go to the Trash stage. A merge cannot be undone.
- For two people who share a phone or email, Merge People As Relationships combines the records into one contact and keeps the second person as a relationship on it, instead of folding them into one person.

### Tags Follow Up Boss Adds Itself

Follow Up Boss adds some tags automatically: Unsubscribed (when someone unsubscribes from marketing email), a bounced-email tag, the city and zip of inquiry addresses, lead source tags, and a deleted agent's name on that agent's old leads. Its own tag suggestions include Past Client, Do Not Call, Do Not Text and Do Not Email. Tags are limited to 64 characters. Admin > Tags lists every tag and how many contacts use it.

### Ponds

- A pond is a shared group of leads any member of that pond can see and claim. Ponds need an account with more than one user. Owners and admins create them (Admin > Ponds) and pick a Pond Lead, whose name stands in as the assigned agent for action plans, notifications and other systems.
- Ways in: Mass Actions > Assign Pond on selected people; Lead Flow rules that send a source's new leads straight to a pond; or an automation using the Reassign action. Agents claim a lead by assigning it to themselves.
- Follow Up Boss's own best practices: set office rules for working pond leads, use the pond for unresponsive or cold leads, and share Smart Lists that surface pond leads who are active again.
- Recommend pond rules. People move the leads.

### Smart Lists

- Create one: People > All People > Filters, add filters, then + New List, name it, choose who to share it with, Save List. Sharing a list shares the filters, not the contacts: each person sees only the matching contacts they already have access to, so an agent's count can be lower than the size in this report.
- Each added filter narrows the list (the help center's example: one filter includes the Sphere tag, another excludes the Buyer tag). To catch "never contacted" as well as "not in 12 months," make a second list using Last Communication is empty.
- Filter names used in the segment criteria: Stage, Tags, Source, Created, Agent, Pond, Last Communication, Last Activity, Last Call, Last Text, Last Email, Email, Phone, Timeframe, Deal Stage, Deal Close Date and custom fields.
- Filter conditions: is empty, is not empty, contains, does not contain, is good, is bad (for Email and Phone), include any or all, exclude any or all, was less than, was more than (minutes to years), is less than, is greater than, is between.
- Default and Best Practice lists every account gets, with their filters: Important, Qualify: Needs Contact, Revived Prospects (Last Activity less than 7 days ago, Created more than 10 days ago, Last Communication more than 7 days ago, Stage includes Attempted Contact, Spoke with Customer, Lead, Nurture), Met/Appt Set, Potential Prospects, Under Contract, Current Clients, four Nurture lists by Timeframe, and Past Clients (Stage includes Closed, Last Communication more than 90 days ago). When a segment overlaps one of these, say so: the team may already have the list.

### Next Moves in Follow Up Boss

- Call List: select contacts or a Smart List on People, click the Calling List phone icon. Needs Follow Up Boss calling and the desktop app. Follow Up Boss has no built-in Do Not Call scrubbing; its help center points to an integration (CallAction) for that.
- Batch Email: select contacts, click the Batch Email icon. Sends from the user's connected email, up to 10,000 emails per user per day, one email per address even when duplicates are selected. Follow Up Boss adds its own unsubscribe footer to batch and action plan emails, using the company information in Admin > Company. Its own tip before a batch: exclude the Unsubscribed tag and filter to good emails.
- Action plans cannot be applied in bulk. To start one on existing contacts, an owner or admin sets up an automation (Admin > Automations); otherwise it is applied one contact at a time. For a whole segment, a batch email or a call list is the practical first move.
- Merge fields such as Contact First Name are picked from the Merge Fields menu in a template. The drafts use [First Name]; swap in the merge field when building the template.

### Consent Facts From Follow Up Boss

- Contacts who text STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT are opted out of texts from every Follow Up Boss number on the account. Their number shows in orange on the profile. The help center does not say whether that status appears in an export, so treat texts as blocked unless the team's own consent field says yes.
- Follow Up Boss asks whoever imports a file to confirm opt-in consent. That confirmation is not a per-contact consent record and is not an export column.
- Follow Up Boss's compliance page says leads need consent before the first text and that a website form is not an opt-in unless it has opt-in wording. The stricter rule in outreach-rules.md applies here: no documented consent, no text. When the team's consent field says how consent was recorded (a website form, an open house sign-in sheet), that form or sheet counts only if it had text consent wording.
- The same page says Follow Up Boss texting is for one-to-one conversations with people who expect to hear from you, not mass or drip texting, and warns against importing a list and texting it or pasting the same text lead by lead. So a segment's text draft is a starting point the assigned agent makes their own and sends one at a time, never a blast to the whole list. For a large list, call or email instead.

### Sources

All checked 2026-11-08. The date in parentheses is the article's own last update.

- Export Contacts to a Spreadsheet (2026-04-21): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Users, Roles & Permissions (2025-09-25; exporting permission is owner only): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- Invite and manage your team (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4402370641175-Invite-and-manage-your-team
- People Overview (2025-03-06): https://help.followupboss.com/hc/en-us/articles/360018115954-People-Overview
- Smart Lists Overview (2026-07-22): https://help.followupboss.com/hc/en-us/articles/1500008374882-Smart-Lists-Overview
- Filter Definitions (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360025651313-Filter-Definitions
- Filtering contacts (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360018863574-Filtering-contacts
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Best Practice: Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360012324054-Best-Practice-Smart-Lists
- Changing a Lead Stage (2026-07-06): https://help.followupboss.com/hc/en-us/articles/360012456793-Changing-a-Lead-Stage
- Custom Stages (2024-07-05): https://help.followupboss.com/hc/en-us/articles/4402370671767-Custom-Stages
- Importing Contacts Overview (2025-07-15): https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview
- Lead Deduplication (2025-05-06): https://help.followupboss.com/hc/en-us/articles/11460704008855-Lead-Deduplication
- Merge Contacts (2025-02-21): https://help.followupboss.com/hc/en-us/articles/4402372112791-Merge-Contacts
- Mass Actions (2025-02-20): https://help.followupboss.com/hc/en-us/articles/4402372268567-Mass-Actions
- Tags (2025-09-25): https://help.followupboss.com/hc/en-us/articles/360015171474-Tags
- Auto-tags (2024-08-19): https://help.followupboss.com/hc/en-us/articles/4402372137111-Auto-tags
- Phone Number Labels (2025-09-15): https://help.followupboss.com/hc/en-us/articles/4402372233495-Phone-Number-Labels
- Lead Ponds Overview (2024-11-15): https://help.followupboss.com/hc/en-us/articles/360048829034-Lead-Ponds-Overview
- Lead Ponds: Moving Leads to a Pond (2024-11-15): https://help.followupboss.com/hc/en-us/articles/4422920700439-Lead-Ponds-Moving-Leads-to-a-Pond
- Lead Ponds: Viewing Ponds (2025-02-21): https://help.followupboss.com/hc/en-us/articles/4422921401239-Lead-Ponds-Viewing-Ponds
- Lead Ponds: Claiming a Lead From a Pond (2025-02-21): https://help.followupboss.com/hc/en-us/articles/4422921898391-Lead-Ponds-Claiming-a-Lead-From-a-Pond
- Best Practice: Ponds (2024-11-15): https://help.followupboss.com/hc/en-us/articles/15870286726167-Best-Practice-Ponds
- Using Automations with Ponds (2024-07-10): https://help.followupboss.com/hc/en-us/articles/360057991893-Using-Automations-with-Ponds
- Lead Flow Directly to Pond (2024-11-15): https://help.followupboss.com/hc/en-us/articles/4402383518743-Lead-Flow-Directly-to-Pond
- Teams (2025-09-25): https://help.followupboss.com/hc/en-us/articles/4402370600983-Teams
- Batch Emailing Overview (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014273993-Batch-Emailing-Overview
- Best Practice: Batch Emailing (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014495774-Best-Practice-Batch-Emailing
- Call Lists (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014082414-Call-Lists
- Action Plans Overview (2025-02-25): https://help.followupboss.com/hc/en-us/articles/1500008539982-Action-Plans-Overview
- How to Use Merge Fields (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014569454-How-to-Use-Merge-Fields
- Texting Opt-in/Opt-Out (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360022160813-Texting-Opt-in-Opt-Out
- Unsubscribing from Marketing Emails (2025-02-25): https://help.followupboss.com/hc/en-us/articles/11469480193687-Unsubscribing-from-Marketing-Emails
- Calling and Texting Compliance (2025-07-18): https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance
- HighLevel, How to Export Contacts to a CSV: https://help.gohighlevel.com/en/support/solutions/articles/48001238482-how-to-export-contacts-to-a-csv-in-highlevel

Not confirmed here (say "confirm with Follow Up Boss support" or "confirm with your CRM's support" if it matters): whether Last Communication, Last Activity or custom date columns come through in an all-columns export; whether a contact's text opt-out status is in the export; the exact text of the bounced-email auto-tag; any other CRM's column names.

## Health Rules: Checks, Segments and the Worklist

How the analysis defines each check, how to turn a team's own rules into settings, how to pick the segments and how to write their Smart List filters. Follow Up Boss terms and facts come from the exports part of this guide (Last verified: 2026-11-08, sources there). The day counts below are defaults set here, not industry standards: label them "default" in the output and replace them with the team's own rule whenever the team has one.

### Defaults

| Setting | Default | Meaning |
|---|---|---|
| stale_days | 90 | an active-stage contact with no communication for this long is stale |
| past_client_days | 365 | a past client or sphere contact with no communication for this long is untouched |
| new_lead_days | 60 | a contact still in a new-lead stage this long after it was added |
| never_contacted_days | 30 | added this long ago with no communication on record (or Is Contacted = No) |
| nurture_quiet_days | 180 | a nurture contact with no communication for this long |
| back_on_site_days | 30 | lead activity this recent while the last communication is older than this |
| recent_close_days | 365 | a deal that closed this recently should not sit in an active stage |
| archive_days | 730 | no valid email or phone and no communication this long: archive candidate |
| shared_key_limit | 5 | an email or phone on more records than this is a shared line, not a duplicate |

### Team Rules (rules.json)

Build rules.json only from the team's documents or the user's message, never from a guess. Leave out any key the team didn't set. Example from a team document that says "every lead gets a touch every 60 days; New or Warm leads with no contact in 45 days go to the Shared Pool; past clients carry the Closed Client label":

```json
{"stale_days": 60, "pond_after_days": 45, "pond_stages": ["New", "Warm"], "pond_tags": ["Shared Pool"],
 "past_client_tags": ["Closed Client"], "sphere_tags": ["SOI"],
 "stage_classes": {"Warm": "active_lead", "Long-Term Nurture": "nurture", "SOI": "sphere"},
 "columns": {"stage": "Lead Status"}}
```

- stage_classes maps the team's stage names to one of: new, active_lead, active_client, nurture, past_client, sphere, inactive (trash, rejected, dead, do not contact), other (vendors, agents, partners).
- columns overrides the column map when the analysis picked the wrong column (keys: id, name, first, last, stage, source, agent, pond, created, last_comm, last_activity, is_contacted, tags, deal_stage, deal_close, emails, phones, consent).
- consent: {"tags": ["Text OK"]} when the team records consent with a tag.
- pond_after_days and pond_stages turn stale leads into "Pond Candidate" rows in the worklist.

### The Checks

- **Database size:** every row in the file. Percentages use all rows. Trash and rejected contacts are counted but left out of the worklist, the segments and the contact-info problem counts.
- **Stage reading:** each stage name is read from the team's rules, then Follow Up Boss's defaults and common custom stages, then a keyword guess. Guessed or unrecognized stages go in Questions for the Team.
- **Missing or invalid email:** no email in any email column, or one that fails a format check or is a placeholder (noemail@, none, test@, example.com). Format only: it can't tell whether an inbox exists.
- **Missing or invalid phone:** no phone, or one that is not a valid 10-digit US number after removing punctuation and a leading 1. Format only.
- **Likely duplicates:** records joined by a shared email or phone. Same or near-identical names (one letter apart, or one name a short form of the other) are merge candidates. A shared email or phone under a different first name with the same last name is "shared contact info": two people can share a number, so the team decides whether to keep them separate, link them as a relationship, or merge. An email or phone on more than 5 records is a shared line (an office, a lender, an agent's own number) and is never treated as a duplicate. Same or near-identical names with different contact info are listed for review only.
- **Suggested main record in a merge group:** the most recent communication, then the most complete record, then the oldest. In Follow Up Boss the main record keeps its stage and agent, so the team should check both before merging.
- **Merge groups split across agents:** a merge group whose records have different assigned agents. Merging keeps one record's agent, so it decides who keeps the contact. Report the count, mark those rows in the worklist, and leave the call to the team (a Question for the Team). Never pick the agent.
- **Stale active-stage contacts:** new, active-lead and active-client stages with no communication for stale_days or none on record. Reported by stage and by agent. For the ranked problems, the ones with some communication on record count as "gone quiet" and the ones with none count under Never Contacted, so nothing is counted twice.
- **Never contacted:** Is Contacted = No when the export has it, otherwise no communication on record, for contacts added more than never_contacted_days ago and not in trash or other stages.
- **Past clients and sphere:** past client = a past-client stage (Follow Up Boss Closed counts), a past-client tag, or a match by email or phone to a closed deal in an uploaded transaction file. Sphere = a sphere stage or tag, if not already a past client. Untouched = no communication in past_client_days or none on record. Needs a last-communication date; without one, say the check could not run.
- **Stage problems:** a closed deal (the export's Deal Stage shows closed, or a matched transaction) within recent_close_days while the contact sits in an active stage; a matched closed transaction while the contact sits in a new, nurture, active-lead or blank stage (a past client not labeled); a past-client tag on a contact in a new, nurture or blank stage; no stage; a contact in a new-lead stage more than new_lead_days after it was added that has communication on record (talked to, stage never updated); stage names nobody defined; leftover "Imported Stage" or "Imported Agent" tags. A closed deal more than recent_close_days ago with an active stage is repeat business, not an error.
- **Unassigned:** no agent and no pond, not in trash. In Follow Up Boss, pond leads export under the pond's lead agent, so they never look unassigned and they inflate that agent's count. Say so whenever the pond lead's count looks high.
- **Near-duplicate tags:** tags that match after ignoring case, spaces, punctuation, "&" versus "and" and a trailing s, plus tags one letter apart. Report the variant groups with counts and suggest one name for each; merging tags is the team's call.
- **Transaction file matches:** by email or phone first. A match by name alone is reported but never used to change a stage. Closed deals that match nobody in the export are past clients missing from the CRM: report the count.

### Ranked Problems and the First Cleanup

The analysis ranks problems by records affected: likely duplicates, stage problems, unassigned, missing or invalid email, missing or invalid phone, active contacts gone quiet, past clients and sphere untouched, and never contacted. The bottom line names the top three as ranked, with their counts.

The first cleanup: merge duplicates first when 1% or more of records sit in merge groups, because a merge keeps one record's stage and agent and every later fix would otherwise be done twice. Otherwise start with the top-ranked problem. Say which rule applied.

### Segments

Use the analysis's segment candidates, in its order, four to six of them. Skip one with fewer than 10 contacts unless that leaves fewer than four; if fewer than four exist, show what exists and say why. A contact can match two segments; work them in the order listed. For each segment give: the name; the Smart List filter; the size from the run with how many are emailable, callable and textable with documented consent; who owns them (the agents with the most); why it matters, from the data; and the next move.

Filters below are in Follow Up Boss terms. Fill the bracketed values from the run (the team's actual stage and tag names). For another CRM, write the same logic in plain words and tell the user to build it with their CRM's filters.

| Segment | Filter (Follow Up Boss) | Next move |
|---|---|---|
| Back On The Site | Last Activity was less than [30] days ago; Last Communication was more than [30] days ago; Stage excludes Trash, Rejected. Second list for never contacted: Last Communication is empty. Follow Up Boss's default Revived Prospects list is a 7-day version of this. | Call list today, by assigned agent |
| Past Clients, No Touch In 12+ Months | Stage includes [past client stages] (or a second list: Tags include [past client tags]); Last Communication was more than 12 months ago. Second list: Last Communication is empty. Follow Up Boss's default Past Clients list uses Closed and 90 days. | Call list by assigned agent, then a personal email |
| Sphere, No Touch In 12+ Months | Stage includes [sphere stage] (or Tags include [sphere tags]); Last Communication was more than 12 months ago | Batch email, then calls to anyone who replies |
| Stalled Pipeline | Stage includes [active stages]; Last Communication was more than [stale_days] days ago | Assigned agent calls this week; anything still silent gets a stage or pond decision under the team's rules |
| Never-Worked Leads | Last Communication is empty; Created was more than [30] days ago; Stage excludes Trash, Rejected, [past client and sphere stages] | Call list; if the team uses ponds, the pond rule decides who works them |
| Quiet Nurture | Stage includes Nurture; Last Communication was more than [180] days ago | Batch email to re-engage; replies go to the assigned agent |

Add to the email version of every filter: Email is good; Tags exclude Unsubscribed and any bounced-email tag. Add to the text version: the team's consent field shows yes (custom field contains or includes the yes value, or Tags include the consent tag); Phone is good; Tags exclude Do Not Text and Do Not Call. Never build a text list without a consent filter.

### The Worklist

One row per record that needs work (trash and rejected left out), sorted by priority. Columns: Priority, Row In Export, Record ID, Name, Email, Phone, Assigned Agent, Stage, Action, Reason, Other Fixes, Duplicate Group, Suggested Main Record. It is the only output with names, emails and phone numbers.

| Priority | Action | What ops does |
|---|---|---|
| 1 | Merge Candidate | Check both records, pick the main record (suggested one marked), merge in the CRM. When the reason says the records have different agents, wait for the team to decide who keeps the contact. In Follow Up Boss: Mass Actions > Merge People, up to 10 at once, cannot be undone |
| 1 | Review Shared Contact Info | Decide: keep separate, link as a relationship, or merge |
| 2 | Fix Stage / Set Stage | Move to the right stage under the team's definitions |
| 3 | Assign Agent | Assign an agent or pond under the team's routing rules |
| 4 | Pond Candidate | Only when the team has a pond rule: move it under that rule |
| 4 | Agent Follow-Up Or Pond Decision | The agent follows up, or the team decides on a stage or pond change |
| 4 | Review New-Lead Stage | Talked to but still in a new-lead stage: update the stage |
| 5 | Fix Invalid Email or Phone, Fill Missing Email, Phone or Contact Info | Fix from the record's own history, or leave it |
| 5 | Clean Import Tag | Set the real stage or agent, then remove the tag |
| 6 | Archive Candidate | No way to reach and no communication in 2+ years: the team decides whether to move it to Trash |
| 7 | Review Possible Duplicate (Name Only) | Look before merging: same name does not mean same person |

### Questions for the Team

Ask only where the data shows a missing rule, and say what in the data raised it. Typical triggers:
- Both Closed and Past Client stages (or a stage plus a tag) in use: what counts as a past client?
- Guessed or unrecognized stages: what does each mean?
- Many stale active-stage contacts and no pond rule: after how many days without contact does a lead move to the pond or to Nurture?
- No consent field: where does the team record text consent?
- Consent recorded as a website form or a sign-in sheet: did that form or sheet have text consent wording that names the team and the number?
- Unassigned contacts: who owns them?
- Merge groups split across agents: who keeps each contact when ops merges?
- Near-duplicate tags: which spelling stays?
- Closed deals missing from the CRM: should they be added as past clients?

### Sources

Checked 2026-11-08 (the article's own last update in parentheses). The rest are listed in the exports part of this guide.

- Merge Contacts (2025-02-21): https://help.followupboss.com/hc/en-us/articles/4402372112791-Merge-Contacts
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Importing Contacts Overview (2025-07-15), for the Imported Stage and Imported Agent tags: https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview

## Nurture Drafts

How to write the drafts for each segment. Read outreach-rules.md too: its checklist governs every text and email here. This is not legal advice; consent questions go to the broker or an attorney.

Last verified: 2026-11-08. The Follow Up Boss details here (its automatic unsubscribe footer and Admin > Company, merge fields, no built-in Do Not Call scrub) come from its help center: Unsubscribing from Marketing Emails, https://help.followupboss.com/hc/en-us/articles/11469480193687-Unsubscribing-from-Marketing-Emails ; How to Use Merge Fields, https://help.followupboss.com/hc/en-us/articles/360014569454-How-to-Use-Merge-Fields ; Call Lists, https://help.followupboss.com/hc/en-us/articles/360014082414-Call-Lists . More sources are in the exports part of this guide.

### What Each Segment Gets

| Segment next move | Drafts |
|---|---|
| Call list | A call opener, a follow-up email, and a text only if the segment has a consent filter |
| Email campaign | An email, and a text only if the segment has a consent filter |

When the export has no consent field (no consent column and no consent tag), write no texts for any segment. Say so once, plainly: "No text drafts: this export has no field showing which contacts agreed to get texts. Add one (in Follow Up Boss, a custom field such as Text Consent with the date and source), fill it from your records, and run this again." Never infer consent from a phone number, a lead source or a past deal.

### Rules for Every Draft

- Write for the assigned agent to send in their own voice. Follow the user's voice profile when one is in the conversation. Without one: warm, plain, direct.
- Placeholders only, never a real contact's name or details: [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Agent Phone], [Unsubscribe Link], [Sender Postal Address]. Note that in Follow Up Boss, [First Name] becomes the Contact First Name merge field.
- Base the reason for reaching out on the relationship and its history in general terms (it's been a while; you worked together; they asked about homes before). Never mention what tracking shows: no "I saw you looking at homes on our site," no viewed addresses, no saved searches.
- Offer something useful and specific to real estate without numbers you don't have: a home value review, a list of recent sales near them, answers about the market, help with a question. No market statistics, no prices, no rates, no claims about values or timelines, no promises.
- For a referral ask, say "someone you know," not "friends and family."
- Describe services and properties, never people. No words about age, family, children, marriage, retirement, health, religion, national origin or any protected class, and nothing like "growing family," "empty nest" or "downsizing" unless the contact used it first (the export can't tell you). No comments on schools, safety or who lives in an area.
- No stock phrases: "stunning," "dream home," "don't hesitate to reach out," "I hope this email finds you well," "just touching base."
- Emails: a Title Case subject that says what the email is (never "RE:" or "FWD:" when it isn't a reply); 120 words or fewer; short paragraphs; one clear ask. End with the sign-off, then this footer:
  "To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name]."
  Note for Follow Up Boss users: batch and action plan emails get Follow Up Boss's own unsubscribe footer automatically, from the company information in Admin > Company. Keep one working opt-out; check that Admin > Company shows the real postal address. Keep the line that says it is a marketing email in every email either way (a conservative default).
- Texts: a starting point the assigned agent makes their own and sends one at a time to people on the consent list, never a blast to the whole segment. Follow Up Boss's compliance page says its texting is for one-to-one conversations, not mass or drip texting, and warns against pasting the same text lead by lead (Calling and Texting Compliance, https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance). For a large list, call or email first. 300 characters or fewer, one question, no links unless the user supplies one. Start by naming the sender: "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]." Include [Agent Phone] if the text comes from a number the contact may not know. End with "Reply STOP to opt out." Only for the consent-filtered list.
- Call openers: two or three sentences the agent can say naturally, then one open question and a soft next step. Name the agent and team in the first sentence. No script that pressures or misleads.

### Segment Notes

- **Back On The Site:** they may be starting to look again. Keep it a light, open offer of help; the agent calls first, today.
- **Past Clients, No Touch In 12+ Months:** the relationship is the reason. Thank them, offer a home value review or a question answered, ask how the home is treating them.
- **Sphere, No Touch In 12+ Months:** personal and low-key. No hard ask. One easy reply prompt.
- **Stalled Pipeline:** they were in an active conversation. Ask whether the plan changed and whether they still want help. Make it easy to say "not now."
- **Never-Worked Leads:** they asked about something and nobody followed up. Apologize briefly for the delay without excuses, then offer help.
- **Quiet Nurture:** a re-engagement email with one useful offer and a clear way to say "not interested."

### Check Before Sending (Drafts)

List these every time, for the user to confirm:
- Every placeholder is filled, and Follow Up Boss merge fields replace [First Name] and agent fields where the team uses templates.
- Texts: each contact on the consent-filtered list has a consent record that names the team or brokerage and the phone number. The field in the export says yes; the record itself is the proof. When the run shows consent recorded as a website form or an open house sign-in, that form or sheet counts only if it had text consent wording. Consent that names only a portal, a lead company or "real estate professionals," not the team or brokerage, means no texts until the broker confirms it covers the team (a conservative default).
- Texts go out one at a time from the assigned agent, not as a mass text.
- The list is scrubbed against the National Do Not Call Registry and the team's internal do-not-call list before any call list or text. Follow Up Boss has no built-in scrub.
- Texts and calls go out between 8 a.m. and 8 p.m. in the recipient's time zone. No calls or voicemails on a Sunday or a legal holiday: move them to the next day that is neither (a conservative default).
- The unsubscribe link works and the postal address is real.
- The Smart List count in the CRM is close to the size in this report before sending; if it is far off, the filter needs a fix.
- State rules where the team and its contacts are: confirm with your broker or an attorney.
