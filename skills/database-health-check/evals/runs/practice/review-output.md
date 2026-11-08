# Database Health Check: Practice Export

**Bottom line:** Your Follow Up Boss export holds 500 contacts, and the three biggest problems are 66 leads never contacted (13.2%), 61 contacts with no valid phone (12.2%) and 54 active-stage contacts who have gone quiet for 90+ days (10.8%). Merge duplicates first: 24 records (4.8%) sit in 12 merge groups, and Follow Up Boss keeps the main record's stage and agent when it merges, so stage and assignment fixes made before merging can be lost.

## What I Used

- **File:** PRACTICE-followupboss-people-export.csv, a Follow Up Boss People export, 500 records (header on row 2, under the practice-file line).
- **Settings, all defaults (no team rules uploaded):** active-stage contacts are stale after 90 days with no communication; past clients and sphere after 365 days; a contact still in Lead 60 days after it was added; never contacted means Is Contacted = No and added 30+ days ago; quiet nurture after 180 days; back on the site means lead activity in the last 30 days and no communication in 30 days. Send your follow-up standard and pond rules and I'll rerun with them.
- **Columns that drove the checks:** Stage, Lead Source, Assigned To, Date Added, Last Communication, Last Activity (the lead's own activity, used only for Back On The Site), Is Contacted, Tags, Deal Stage, Deal Close Date, Email 1 and 2, Phone 1 and 2, and the Text Consent custom field.
- **Gaps:** no record ID column, so the worklist finds each record by its row in the file, its name and its first email or phone (search the name in Follow Up Boss). Follow Up Boss exports pond leads under the pond's lead agent and leaves out the pond name; this file has 15 contacts tagged "Pond: Lantern Lake," all under Rufus Tumbleweed, so his counts include pond leads. No closed-transaction file was uploaded, so past clients come from stages and tags only.

## Health Report

**By stage**

| Stage | Read as | Contacts | % |
|---|---|---|---|
| Nurture | Nurture | 134 | 26.8% |
| Lead | New lead | 87 | 17.4% |
| Attempted Contact | Active lead | 45 | 9.0% |
| Trash | Inactive | 38 | 7.6% |
| Sphere | Sphere | 37 | 7.4% |
| Closed | Past client | 30 | 6.0% |
| Past Client | Past client | 23 | 4.6% |
| Spoke with Customer | Active lead | 20 | 4.0% |
| Rejected | Inactive | 17 | 3.4% |
| Showing Homes | Active client | 14 | 2.8% |
| Under Contract | Active client | 12 | 2.4% |
| Met with Customer | Active lead | 12 | 2.4% |
| Appointment Set | Active lead | 10 | 2.0% |
| Listing Agreement | Active client | 9 | 1.8% |
| Vendor | Other (a guess: confirm) | 5 | 1.0% |
| Submitting Offers | Active client | 5 | 1.0% |
| Active Listing | Active client | 2 | 0.4% |

**By source (top 10):** Zillow 88 (17.6%); Website 68 (13.6%); Sphere 63 (12.6%); Import 55 (11.0%); Referral 53 (10.6%); Realtor.com 41 (8.2%); Facebook 37 (7.4%); Open House 27 (5.4%); Past Client 23 (4.6%); Homes.com 17 (3.4%).

**By agent**

| Agent | Contacts | % | Active stage | Active, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months |
|---|---|---|---|---|---|---|
| Juniper Quickfoot | 119 | 23.8% | 52 | 20 | 14 | 6 |
| Barnaby Larkspur | 112 | 22.4% | 49 | 22 | 13 | 8 |
| Rufus Tumbleweed (includes the pond) | 97 | 19.4% | 43 | 20 | 16 | 6 |
| Odessa Fernwhistle | 87 | 17.4% | 42 | 20 | 10 | 7 |
| Marisol Pinecone | 83 | 16.6% | 29 | 11 | 13 | 7 |
| (unassigned) | 2 | 0.4% | 1 | 1 | 0 | 0 |

**Contact info:** no email 34 (6.8%); email invalid or a placeholder 7 (1.4%); Bounced Email tag 6 (1.2%); Unsubscribed 19 (3.8%); no phone 61 (12.2%); phone not a valid 10-digit US number 8 (1.6%); Do Not Call tag 6 (1.2%); opted out of texts 13 (2.6%); no valid email and no valid phone 8 (1.6%). Format checks only.

**Likely duplicates:** 12 merge groups (24 records) share an email or phone and the same or a near-identical name; merging them all removes 12 records. 2 groups (4 records) share an email or phone under a different first name and the same last name: the team decides whether to keep them separate, merge them as relationships, or merge. 1 pair matches on name only, for review. One phone number sits on 7 records; it's treated as a shared line (an office or lender number, for example), not a duplicate. In 6 of the merge groups (12 records) the records have different agents: a merge keeps the main record's agent, so the team decides who keeps each of those contacts.

**Active-stage contacts with no communication in 90+ days:** 94 of 216 (43.5%): 54 gone quiet and 40 with no communication on record. By stage: Lead 57; Attempted Contact 12; Showing Homes 6; Spoke with Customer 5; Listing Agreement 4; Met with Customer 3; Appointment Set 3; Under Contract 2; Submitting Offers 2. By agent: Barnaby Larkspur 22; Rufus Tumbleweed 20; Juniper Quickfoot 20; Odessa Fernwhistle 20; Marisol Pinecone 11; unassigned 1.

**Never contacted (Is Contacted = No, added 30+ days ago):** 66. By agent: Rufus Tumbleweed 16; Juniper Quickfoot 14; Barnaby Larkspur 13; Marisol Pinecone 13; Odessa Fernwhistle 10. Top sources: Zillow 14; Referral 11; Import 8; Sphere 7.

**Past clients and sphere:** 53 past clients (Closed and Past Client stages), 18 with no communication in 12+ months (5 with none on record). 37 sphere, 16 with no communication in 12+ months (5 with none on record).

**Stage problems:** 3 contacts have a closed deal in the export but still sit in an active stage (Submitting Offers 2, Showing Homes 1). 43 are still in Lead 60+ days after being added even though they have communication on record. 4 carry an "Imported Agent: Former Agent" tag left from an import. Both Closed (30) and Past Client (23) are in use as past-client stages.

**Unassigned and ponds:** 2 contacts have no agent and no pond. 15 carry the pond tag and export under Rufus Tumbleweed, the pond's lead agent.

**Tags:** 34 distinct tags, 6 near-duplicate groups: Seller (27), Sellers (18), seller (17); Buyer (29), Buyers (19), buyer (8); Past Client (23), Past Clients (12), past client (9), PastClient (8); Open House (19), open house (11), Open-House (8), Openhouse (6); Sphere (10), sphere (7); Investors (3), investor (2), Investor (2).

**Text consent:** the Text Consent custom field shows yes for 108, no for 13, blank for 379. 105 are textable (yes, valid phone, not opted out, not Do Not Call). The yes values say how consent was recorded: signed buyer form 39, website form 37, open house sign in 32.

## Cleanup Worklist

cleanup_worklist.csv, 205 rows, one per record that needs work, sorted by priority (Trash and Rejected left out). Rows by action: Agent Follow-Up Or Pond Decision 79; Fill Missing Phone 28; Review New-Lead Stage 26; Merge Candidate 24; Fill Missing Email 16; Review Shared Contact Info 11; Fix Invalid Phone 6; Fix Invalid Email 4; Fix Stage 3; Fill Missing Contact Info 3; Clean Import Tag 3; Assign Agent 2.

How ops works the first cleanup, then the two other actions with the most rows:
1. **Merge Candidate (24 rows, first):** search the name in Follow Up Boss, View List of People, select the records in the Duplicate Group, then Mass Actions > Merge People and pick the main contact (the worklist marks a suggested one). The main contact keeps its name, agent, lender, stage and running action plan; the others go to Trash. A merge can't be undone, so check both records first. Where the Reason says the records have different agents, wait for the team to decide who keeps the contact. Leave the 11 Review Shared Contact Info rows for a person: keep separate, Merge People As Relationships, or merge.
2. **Agent Follow-Up Or Pond Decision (79 rows):** hand each agent their rows; anything still silent after a real attempt gets a stage or pond decision under the team's rules.
3. **Fill Missing Phone (28 rows):** fill only from the record's own history (an inquiry, a signed form). Don't buy or append numbers to text them.

Then Review New-Lead Stage (26), Fix Stage (3: closed deals still in Submitting Offers or Showing Homes), Assign Agent (2) and the rest.

## Re-Engagement Segments

Follow Up Boss Smart List filters (People > All People > Filters, then + New List). For the email version of each list, add: Email is good; Tags exclude Unsubscribed and Bounced Email. For the text version, add: Text Consent contains Yes; Phone is good; Tags exclude Do Not Call, DNC and Do Not Text. A contact can match two segments; work them in this order.

**1. Back On The Site.** Filter: Last Activity was less than 30 days ago; Last Communication was more than 30 days ago; Stage excludes Trash, Rejected. Second list for the never-contacted ones: same Last Activity, Last Communication is empty. Follow Up Boss's default Revived Prospects list is a 7-day version of this, so you may already have it. Size 31: emailable 25, callable 29, textable 6. Most owned by Juniper Quickfoot 11, Barnaby Larkspur 8, Rufus Tumbleweed 7. Why: they've been active in the last 30 days and nobody has talked to them in 30; 6 have no communication on record. Next move: call list today, by agent.

**2. Past Clients, No Touch In 12+ Months.** Filter: Stage includes Closed, Past Client; Last Communication was more than 12 months ago. Second list: Last Communication is empty. Follow Up Boss's default Past Clients list uses Closed and 90 days; this one adds Past Client and a longer gap. Size 18 (1 also in segment 1): emailable 14, callable 15, textable 0. Most owned by Barnaby Larkspur 5, Marisol Pinecone 4, Juniper Quickfoot 4. Why: a year or more of silence with people you've closed with. Next move: call list by agent, then a personal email.

**3. Sphere, No Touch In 12+ Months.** Filter: Stage includes Sphere; Last Communication was more than 12 months ago (second list: is empty). Size 16: emailable 15, callable 15, textable 3. Most owned by Odessa Fernwhistle 5. Next move: batch email, then calls to anyone who replies.

**4. Stalled Pipeline, No Touch In 90+ Days.** Filter: Stage includes Lead, Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract; Last Communication was more than 90 days ago. Size 53 (6 in earlier segments): emailable 48, callable 45, textable 3. Stages: Lead 17, Attempted Contact 12, Showing Homes 6, Spoke with Customer 5, Listing Agreement 4, Met with Customer 3, Appointment Set 3, Under Contract 2. Most owned by Juniper Quickfoot 13, Odessa Fernwhistle 12, Rufus Tumbleweed 11. Why: they were in an active conversation. Next move: the assigned agent calls this week; anyone still silent gets a stage or pond decision under the team's rules.

**5. Never-Worked Leads.** Filter: Last Communication is empty; Created was more than 30 days ago; Stage excludes Trash, Rejected, Closed, Past Client, Sphere, Vendor. Size 56 (3 in earlier segments): emailable 43, callable 48, textable 8. Stages: Lead 40, Nurture 16. Most owned by Rufus Tumbleweed 15, Barnaby Larkspur 12, Juniper Quickfoot 11. Top sources: Zillow 12, Referral 10. Why: they asked about something and nobody followed up. Next move: call list; if the team uses the pond for these, the pond rule decides who works them.

**6. Quiet Nurture, No Touch In 180+ Days.** Filter: Stage includes Nurture; Last Communication was more than 180 days ago (second list: is empty). Size 79 (24 in earlier segments): emailable 66, callable 73, textable 20. Most owned by Rufus Tumbleweed 20, Juniper Quickfoot 19, Barnaby Larkspur 17. Next move: batch email; replies go to the assigned agent.

Action plans can't be applied in bulk in Follow Up Boss. For a whole segment, a call list or a batch email is the practical first move; an owner or admin can start an action plan through an automation.

## Questions for the Team

1. **Closed or Past Client?** Both stages are in use (30 and 23), and the Past Client tag is spelled four ways. Which stage means a past client, and should the other be retired?
2. **Vendor:** 5 contacts sit in a Vendor stage, read as "other" by guess and left out of the segments. Is that right?
3. **Lead stage:** 43 contacts are still in Lead 60+ days after being added, with communication on record. Should agents move them when they first talk?
4. **Pond rule:** 94 active-stage contacts have no communication in 90+ days, and there's no written pond rule in what I have. After how many days without contact does a lead go to the Lantern Lake pond or to Nurture?
5. **Unassigned:** 2 contacts have no agent and no pond. Who owns them?
6. **Tags:** which spelling stays in each of the 6 near-duplicate groups?
7. **Import tag:** 4 contacts still carry "Imported Agent: Former Agent." Who should own them now?
8. **Split merges:** 6 merge groups (12 records) have records under different agents. Who keeps each contact when ops merges?

## Nurture Drafts

For each agent to send in their own voice. In Follow Up Boss templates, swap [First Name] for the Contact First Name merge field. Texts go only to the Text Consent version of each list, one person at a time from the assigned agent: Follow Up Boss says its texting is for one-to-one conversations, not mass or drip texting. Follow Up Boss adds its own unsubscribe footer to batch emails from the company information in Admin > Company; keep one working opt-out and check that address is real.

### 1. Back On The Site

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been a little while since we talked, so I wanted to check in. Is there anything on the real estate side I can help with right now?"

**Email**
Subject: Checking In From [Team or Brokerage Name]

Hi [First Name],

It's been a little while since we talked, so I wanted to check in. If you're weighing a move or want to know what homes near you have sold for lately, I'm glad to put that together.

Would a quick call this week help?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (Text Consent list only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been a bit since we talked. Anything real estate related I can help with right now? [Agent Phone]. Reply STOP to opt out.

### 2. Past Clients, No Touch In 12+ Months

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been too long since I checked in after we worked together. How's the house treating you?" If they're curious, offer a home value review.

**Email**
Subject: How Is The House Treating You?

Hi [First Name],

It's been too long since I checked in. Thank you again for trusting me with your move.

If you ever want to know what your home might be worth today, I'm happy to put together a home value review. And if a question about the house comes up, I'm here.

How has the home been treating you?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text:** none. No one in this segment has Text Consent on record.

### 3. Sphere, No Touch In 12+ Months

**Email**
Subject: A Quick Hello

Hi [First Name],

It's been a while, and you came to mind. I hope things are good with you.

If a real estate question ever comes up for you or someone you know, I'm glad to help, even if it's just a quick answer.

What's new with you?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (Text Consent list only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. You came to mind and I wanted to say hello. What's new with you? Reply STOP to opt out.

### 4. Stalled Pipeline, No Touch In 90+ Days

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. We talked a while back about your plans and I didn't want to drop the ball. Has anything changed, and do you still want help?" Make "not right now" an easy answer.

**Email**
Subject: Are Your Plans Still The Same?

Hi [First Name],

We talked a while back about your plans, and I didn't want you to think I'd forgotten. Has anything changed?

If you still want help, I'm ready when you are. If the timing moved, that's fine too. Reply and I'll check back later instead.

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (Text Consent list only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Checking in on your plans. Still want help, or should I check back later? Either is fine. Reply STOP to opt out.

### 5. Never-Worked Leads

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. You reached out to us a while ago, and I'm sorry nobody followed up sooner. Are you still looking for help with a move?"

**Email**
Subject: Following Up On Your Question

Hi [First Name],

You reached out to us a while back, and I'm sorry it took this long to follow up.

If you're still thinking about buying or selling, I'd be glad to help: answer questions, send recent sales in the area you're watching, or set up a short call. If your plans changed, just reply and let me know.

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (Text Consent list only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. You reached out a while back and I'm sorry for the slow follow-up. Still want help with a move? [Agent Phone]. Reply STOP to opt out.

### 6. Quiet Nurture, No Touch In 180+ Days

**Email**
Subject: Still Want Updates From Me?

Hi [First Name],

It's been a while since we were in touch. When you're ready to think about a move, I can send a short list of recent sales near you. Want me to?

If you'd rather not hear from me, reply "not interested" and I'll stop.

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (Text Consent list only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Want a short list of recent sales near you? Happy to send one. Reply STOP to opt out.

## Check Before Sending

- **Counts and filter values:** sizes 31, 18, 16, 53, 56 and 79; textable 6, 0, 3, 3, 8 and 20; day limits 30, 90, 180 and 12 months; stages Closed, Past Client, Sphere, Nurture, Vendor and the ten active stages; tags Unsubscribed, Bounced Email, Do Not Call, DNC. Build each Smart List and check its count is close to the size here; sharing a list shares the filters, so an agent sees only their own contacts.
- **Placeholders:** [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Agent Phone], [Unsubscribe Link], [Sender Postal Address].
- **Text consent:** every contact on a text list has a consent record that names your team or brokerage and the phone number. Your Text Consent field records consent as a signed buyer form (39), a website form (37) or an open house sign in (32): a website form or sign-in sheet counts only if it had text consent wording. Follow Up Boss's own compliance page says a website form is not an opt-in without it.
- **Texts one at a time:** each text is a starting point the agent makes their own and sends to one person at a time.
- **Do Not Call:** scrub every call and text list against the National Do Not Call Registry and your internal list. Follow Up Boss has no built-in scrub.
- **Quiet hours:** calls and texts between 8 a.m. and 8 p.m. in the contact's time zone.
- **Email:** the unsubscribe link works, and the postal address in Admin > Company is real.
- **State rules:** confirm with your broker or an attorney.
- **Fair housing:** read every message before it goes out.

cleanup_worklist.csv and health_report.md are attached. The worklist holds names, emails and phone numbers: share it only with the people doing the cleanup.
