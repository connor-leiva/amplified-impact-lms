# Health Rules: Checks, Segments and the Worklist

How the analysis defines each check, how to turn a team's own rules into settings, how to pick the segments and how to write their Smart List filters. Follow Up Boss terms and facts come from fub-and-crm-exports.md (Last verified: 2026-11-08, sources there). The day counts below are defaults set here, not industry standards: label them "default" in the output and replace them with the team's own rule whenever the team has one.

## Defaults

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

## Team Rules (rules.json)

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

## The Checks

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

## Ranked Problems and the First Cleanup

The analysis ranks problems by records affected: likely duplicates, stage problems, unassigned, missing or invalid email, missing or invalid phone, active contacts gone quiet, past clients and sphere untouched, and never contacted. The bottom line names the top three as ranked, with their counts.

The first cleanup: merge duplicates first when 1% or more of records sit in merge groups, because a merge keeps one record's stage and agent and every later fix would otherwise be done twice. Otherwise start with the top-ranked problem. Say which rule applied.

## Segments

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

## The Worklist

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

## Questions for the Team

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

## Sources

Checked 2026-11-08 (the article's own last update in parentheses). The rest are listed in fub-and-crm-exports.md.

- Merge Contacts (2025-02-21): https://help.followupboss.com/hc/en-us/articles/4402372112791-Merge-Contacts
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Importing Contacts Overview (2025-07-15), for the Imported Stage and Imported Agent tags: https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview
