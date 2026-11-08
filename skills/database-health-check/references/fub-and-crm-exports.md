# Follow Up Boss and Other CRM Exports

Last verified: 2026-11-08, against Follow Up Boss's help center (help.followupboss.com) and HighLevel's help center. Sources and each article's last-updated date are at the end. Follow Up Boss changes its screens often: when a click path here and the user's screen disagree, trust the screen and say so.

## Getting the Export (Follow Up Boss)

- Who can export: the Account Owner by default. The owner can give other users the Can Export permission (Admin > Team, the Can export column). The owner gets an email each time anyone exports.
- Run it as the owner or an admin with Can Export, from People > All People. All People holds every contact the user can see: admins see the whole account, agents see only their assigned, collaborator and pond leads.
- Steps: People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once. Exporting never removes or changes contacts.
- Without Export All Columns, the file holds the name plus the columns turned on in the current view, and only the first phone, email and address. With it, the file holds up to six of each.

## What a Follow Up Boss All-Columns Export Holds

The help center lists these columns for Export All Columns: Date Added, Name, First Name, Last Name, Stage, Lead Source, Assigned To, Last Assigned, Is Contacted, Listing Price, Tags, Email 1 (to 6) with Email - Type, Timeframe, Phone 1 (to 6) with Phone - Type, Address 1 (to 6) Street, City, State, Zip, Country and Type, Property Address, City, State, Post Code, MLS #, Price, Beds, Baths, Area and Lot, Message, Description, Notes, Calls, Texts, Background, Deal Stage, Deal Close Date, Deal Price, Campaign Source, Medium, Term, Content and Name, and Custom Fields. It adds up to four relationships per contact (spouse first) and each contact's most recent 50 calls, 50 texts and 50 notes.

What the help center does not list, so do not assume it is there:
- A contact ID column. Without one, the worklist identifies each record by its row in the file, its name and its first email or phone, which is how ops finds it with Follow Up Boss's search.
- Last Communication and Last Activity. These are People-page columns and Smart List filters. Whether they come through in an all-columns export is not stated. Use them when the file has them; otherwise the analysis falls back to the dates in the Calls, Texts and Notes columns and labels the stale checks approximate.
- The pond name. Pond leads export "with the Pond lead assignment" and the pond name is left out. Follow Up Boss suggests adding the pond name as a tag before exporting.
- A text consent field. Follow Up Boss has no built-in consent column. Teams that track consent usually use a custom field or a tag, which exports with the contact.
- Email content and call recordings (not exportable).

## Columns the Analysis Recognizes in Other CRMs

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

HighLevel (GoHighLevel), as an example of another CRM: only admin users can export; Contacts > Smart Lists, select the contacts (Select All Contacts for everyone), then More > Export; the file holds only the columns visible in the table (Manage Fields), and the finished file waits in Contacts > Bulk Actions for 30 days. Exports run per sub-account. For any other CRM, tell the user to export every contact with every column their CRM allows, and confirm the steps in that CRM's help center.

## Stages

- Follow Up Boss's default stages and definitions: Lead (not spoken to yet, the default for new people), Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract (offer accepted), Nurture, Rejected, Closed (closed deal or post-closing), Trash.
- Lead, Closed and Trash are system stages and cannot be renamed or deleted. Only the Account Owner creates, renames or deletes stages (Admin > Stages).
- Many teams add stages such as Past Client and Sphere. Follow Up Boss's default Past Clients Smart List uses the Closed stage, so a team with both Closed and Past Client stages needs a rule for which is which.
- When an import has a stage or agent name Follow Up Boss doesn't have, it adds a tag such as "Imported Stage: Warm" or "Imported Agent: Jane Doe". Leftover tags like these mean an import was never cleaned up.

## Duplicates and Merging

- Follow Up Boss deduplicates imported and web leads automatically when the email matches, or when the phone number and the first and last name all match. Duplicates still slip in through manual entry, typos, a second email or phone, and integrations.
- Merging: search the name, View List of People, select the records, Mass Actions > Merge People, choose the main contact. Up to 10 at once. The main contact keeps its name, assigned agent, assigned lender, stage and running action plan; the other records' data moves to it and those records go to the Trash stage. A merge cannot be undone.
- Two people who share a phone or email can be linked with Merge People As Relationships instead of a full merge.

## Tags Follow Up Boss Adds Itself

Follow Up Boss adds some tags automatically: Unsubscribed (when someone unsubscribes from marketing email), a bounced-email tag, the city and zip of inquiry addresses, lead source tags, and a deleted agent's name on that agent's old leads. Its own tag suggestions include Past Client, Do Not Call, Do Not Text and Do Not Email. Tags are limited to 64 characters. Admin > Tags lists every tag and how many contacts use it.

## Ponds

- A pond is a shared group of leads any member of that pond can see and claim. Ponds need an account with more than one user. Owners and admins create them (Admin > Ponds) and pick a Pond Lead, whose name stands in as the assigned agent for action plans, notifications and other systems.
- Ways in: Mass Actions > Assign Pond on selected people; Lead Flow rules that send a source's new leads straight to a pond; or an automation using the Reassign action. Agents claim a lead by assigning it to themselves.
- Follow Up Boss's own best practices: set office rules for working pond leads, use the pond for unresponsive or cold leads, and share Smart Lists that surface pond leads who are active again.
- The skill recommends pond rules. People move the leads.

## Smart Lists

- Create one: People > All People > Filters, add filters, then + New List, name it, choose who to share it with, Save List. Sharing a list shares the filters, not the contacts: each person sees only the matching contacts they already have access to, so an agent's count can be lower than the size in this report.
- Each added filter narrows the list (the help center's example: one filter includes the Sphere tag, another excludes the Buyer tag). To catch "never contacted" as well as "not in 12 months," make a second list using Last Communication is empty.
- Filter names used in this skill's segment criteria: Stage, Tags, Source, Created, Agent, Pond, Last Communication, Last Activity, Last Call, Last Text, Last Email, Email, Phone, Timeframe, Deal Stage, Deal Close Date and custom fields.
- Filter conditions: is empty, is not empty, contains, does not contain, is good, is bad (for Email and Phone), include any or all, exclude any or all, was less than, was more than (minutes to years), is less than, is greater than, is between.
- Default and Best Practice lists every account gets, with their filters: Important, Qualify: Needs Contact, Revived Prospects (Last Activity less than 7 days ago, Created more than 10 days ago, Last Communication more than 7 days ago, Stage includes Attempted Contact, Spoke with Customer, Lead, Nurture), Met/Appt Set, Potential Prospects, Under Contract, Current Clients, four Nurture lists by Timeframe, and Past Clients (Stage includes Closed, Last Communication more than 90 days ago). When a segment overlaps one of these, say so: the team may already have the list.

## Next Moves in Follow Up Boss

- Call List: select contacts or a Smart List on People, click the Calling List phone icon. Needs Follow Up Boss calling and the desktop app. Follow Up Boss has no built-in Do Not Call scrubbing; its help center points to an integration for that.
- Batch Email: select contacts, click the Batch Email icon. Sends from the user's connected email, up to 10,000 emails per user per day, one email per address even when duplicates are selected. Follow Up Boss adds its own unsubscribe footer to batch and action plan emails, using the company information in Admin > Company. Its own tip before a batch: exclude the Unsubscribed tag and filter to good emails.
- Action plans cannot be applied in bulk. To start one on existing contacts, an owner or admin sets up an automation (Admin > Automations); otherwise it is applied one contact at a time. For a whole segment, a batch email or a call list is the practical first move.
- Merge fields such as Contact First Name are picked from the Merge Fields menu in a template. Drafts in this skill use [First Name]; swap in the merge field when building the template.

## Consent Facts From Follow Up Boss

- Contacts who text STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT are opted out of texts from every Follow Up Boss number on the account. Their number shows in orange on the profile. The help center does not say whether that status appears in an export, so treat texts as blocked unless the team's own consent field says yes.
- Follow Up Boss asks whoever imports a file to confirm opt-in consent. That confirmation is not a per-contact consent record and is not an export column.
- Follow Up Boss's compliance page says leads need consent before the first text and that a website form is not an opt-in unless it has opt-in wording. This skill follows the stricter rule in outreach-rules.md: no documented consent, no text.

## Sources

All checked 2026-11-08. The date in parentheses is the article's own last update.

- Export Contacts to a Spreadsheet (2026-04-21): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Users, Roles & Permissions (2025-09-25): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
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
