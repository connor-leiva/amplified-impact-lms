**Bottom line:** Your Follow Up Boss export holds 500 contacts as of 2026-11-08. The three biggest problems are 66 leads added 30+ days ago that were never contacted, 61 live contacts with a missing or invalid phone, and 54 active-stage contacts who have gone quiet for 90+ days. Merge duplicates first: 24 records (4.8%) sit in 12 merge groups, and Follow Up Boss keeps the main record's stage and agent when it merges, so stage and assignment fixes made before merging would be wasted.

## What I Used

- **File:** PRACTICE-followupboss-people-export.csv, a Follow Up Boss People export, 500 records.
- **Settings:** defaults, since no team rules were uploaded: stale after 90 days in an active stage, past clients and sphere untouched after 365 days, Lead stage flagged 60+ days after being added, never contacted if added 30+ days ago, quiet nurture after 180 days. Send me your own standards and I'll rerun with them.
- **Columns that drove the checks:** Stage, Lead Source, Assigned To, Date Added, Last Communication, Last Activity, Is Contacted, Tags, Deal Stage and Deal Close Date, Email 1 and 2, Phone 1 and 2, and the Text Consent custom field.
- **Gaps:** no record ID column, so the worklist identifies each record by its row in the file, its name and its first email or phone. Follow Up Boss exports pond leads under the pond's lead agent and leaves out the pond name; your pond leads carry a "Pond: Lantern Lake" tag, which is how I found them.

## Health Report

**Contacts by stage**

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
| Vendor | Other (guessed: please confirm) | 5 | 1.0% |
| Submitting Offers | Active client | 5 | 1.0% |
| Active Listing | Active client | 2 | 0.4% |

**Contacts by source (top 10)**

| Source | Contacts | % |
|---|---|---|
| Zillow | 88 | 17.6% |
| Website | 68 | 13.6% |
| Sphere | 63 | 12.6% |
| Import | 55 | 11.0% |
| Referral | 53 | 10.6% |
| Realtor.com | 41 | 8.2% |
| Facebook | 37 | 7.4% |
| Open House | 27 | 5.4% |
| Past Client | 23 | 4.6% |
| Homes.com | 17 | 3.4% |


**By assigned agent**

| Agent | Contacts | % | Active stage, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months |
|---|---|---|---|---|---|
| Juniper Quickfoot | 119 | 23.8% | 20 | 14 | 6 |
| Barnaby Larkspur | 112 | 22.4% | 22 | 13 | 8 |
| Rufus Tumbleweed | 97 | 19.4% | 20 | 16 | 6 |
| Odessa Fernwhistle | 87 | 17.4% | 20 | 10 | 7 |
| Marisol Pinecone | 83 | 16.6% | 11 | 13 | 7 |
| (unassigned) | 2 | 0.4% | 1 | 0 | 0 |

Rufus Tumbleweed's count includes all 15 Lantern Lake pond leads, since he's the pond's lead agent in this export.

**Contact info**

| Check | Contacts | % |
|---|---|---|
| No email | 34 | 6.8% |
| Email invalid or a placeholder | 7 | 1.4% |
| Bounced-email tag | 6 | 1.2% |
| Unsubscribed from email | 19 | 3.8% |
| No phone | 61 | 12.2% |
| Phone not a valid 10-digit US number | 8 | 1.6% |
| Do Not Call tag | 6 | 1.2% |
| Opted out of texts or consent "No" | 13 | 2.6% |
| No valid email and no valid phone | 8 | 1.6% |

These are format checks: a well-formed email or phone can still be dead.

**Likely duplicates:** 12 merge groups (24 records) share an email or phone under the same or a near-identical name; merging them all would remove 12 records. 2 more groups (4 records) share an email or phone under a different first name with the same last name: two people can share a number, so a person decides whether to keep them separate, link them as a relationship, or merge. One phone number sits on 7 different people's records, which looks like an office or lender line typed into contacts, so it's flagged for review rather than merged. 1 pair shares only a name. In 6 of the merge groups (12 records) the records have different assigned agents: a merge keeps one record's agent, so the team decides who keeps each of those contacts before ops merges (Question 7).

**Active-stage contacts with no communication in 90+ days:** 94 of 216 (43.5%): 54 gone quiet and 40 with no communication on record.

| Stage | Contacts |
|---|---|
| Lead | 57 |
| Attempted Contact | 12 |
| Showing Homes | 6 |
| Spoke with Customer | 5 |
| Listing Agreement | 4 |
| Met with Customer | 3 |
| Appointment Set | 3 |
| Under Contract | 2 |
| Submitting Offers | 2 |

By agent: Barnaby Larkspur 22, Rufus Tumbleweed 20, Juniper Quickfoot 20, Odessa Fernwhistle 20, Marisol Pinecone 11, unassigned 1.

**Never contacted (Is Contacted = No, added 30+ days ago):** 66. Top sources: Zillow 14, Referral 11, Import 8, Sphere 7. Referrals and sphere contacts nobody called are the ones to look at first.

**Past clients and sphere**

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients (Closed or Past Client stage) | 53 | 18 | 5 |
| Sphere | 37 | 16 | 5 |

**Stage problems**

| Check | Contacts |
|---|---|
| Closed deal still in an active stage (Deal Stage says closed) | 3 |
| Talked to, but still in Lead 60+ days after being added | 43 |
| Imported Stage or Imported Agent tag left from an import | 4 |
| No stage | 0 |

The 3 closed deals sit in Submitting Offers 2 and Showing Homes 1. In all, 82 contacts are in Lead 60+ days after being added; the 43 above were talked to and never moved, and the rest are counted under never contacted.

**Unassigned:** 2 (one new lead, one sphere).

**Near-duplicate tags:** 34 tags in use; 6 groups of near-duplicates:

| Variants (contacts) | Total |
|---|---|
| Seller (27); Sellers (18); seller (17) | 62 |
| Buyer (29); Buyers (19); buyer (8) | 56 |
| Past Client (23); Past Clients (12); past client (9); PastClient (8) | 52 |
| Open House (19); open house (11); Open-House (8); Openhouse (6) | 44 |
| Sphere (10); sphere (7) | 17 |
| Investors (3); investor (2); Investor (2) | 7 |

**Text consent:** Text Consent shows yes for 108 contacts and no for 13; 379 are blank. 105 are textable (yes, valid phone, not opted out, not Do Not Call). The yes values say how consent was recorded: signed buyer form 39, website form 37, open house sign in 32.

## Cleanup Worklist

**File:** cleanup_worklist.csv, 205 rows, one per record that needs work (trash and rejected left out). It's the only file with names, emails and phone numbers; share it only with whoever does the cleanup.

| Action | Rows |
|---|---|
| Agent Follow-Up Or Pond Decision | 79 |
| Fill Missing Phone | 28 |
| Review New-Lead Stage | 26 |
| Merge Candidate | 24 |
| Fill Missing Email | 16 |
| Review Shared Contact Info | 11 |
| Fix Invalid Phone | 6 |
| Fix Invalid Email | 4 |
| Fix Stage | 3 |
| Fill Missing Contact Info | 3 |
| Clean Import Tag | 3 |
| Assign Agent | 2 |

How to work it:
1. **Merge Candidate (24 rows) first.** Sort by Duplicate Group and check the record marked Suggested Main Record (most recent communication, then most complete). In Follow Up Boss: search the name, View List of People, select the records, Mass Actions > Merge People, choose the main contact. The main contact keeps its name, agent, lender and stage; the others go to Trash. It can't be undone. Where the Reason says the records have different agents, wait for the team to decide who keeps the contact. Leave Review Shared Contact Info rows for a person: two people can share a number, and Merge People As Relationships keeps the second person as a relationship on one contact instead of folding them into one person.
2. **Agent Follow-Up Or Pond Decision (79 rows).** Filter by Assigned Agent and hand each agent their rows. Anything still silent after a real attempt gets a stage or pond decision under the rule you set.
3. **Fill Missing Phone (28 rows).** Fill only from the record's own history (an inquiry, a signed form). Don't buy or append numbers to text them.

After those: Review New-Lead Stage (26 rows) and Fix Stage (3 rows), moving each to the stage that matches where the conversation is.

## Re-Engagement Segments

Six segments, in priority order. A contact can match two; work them in this order. Sizes come from the export; a shared Smart List shows each agent only their own contacts.

**1. Back On The Site (31)**
- Smart List: Last Activity was less than 30 days ago; Last Communication was more than 30 days ago; Stage excludes Trash, Rejected, Vendor. Second list for the 6 never contacted: same Last Activity filter, Last Communication is empty.
- Emailable 25, callable 29, textable 6. Juniper Quickfoot 11, Barnaby Larkspur 8, Rufus Tumbleweed 7.
- Why: they've been active in the last 30 days and nobody on the team has talked to them in 30 or more. It includes Past Client 3, and Under Contract 2 (check that those stages are current). Follow Up Boss's default Revived Prospects list is a 7-day version; this is the wider net.
- Next move: call list today, by assigned agent.

**2. Past Clients, No Touch In 12+ Months (18)**
- Smart List: Stage includes Closed, Past Client; Last Communication was more than 12 months ago. Second list: Last Communication is empty (5).
- Emailable 14, callable 15, textable 0. Barnaby Larkspur 5, Marisol Pinecone 4, Juniper Quickfoot 4.
- Why: these are people the team already closed with. Follow Up Boss's default Past Clients list uses Closed and 90 days; this catches the ones a year or more past due.
- Next move: call list by assigned agent, then a personal email.

**3. Sphere, No Touch In 12+ Months (16)**
- Smart List: Stage includes Sphere; Last Communication was more than 12 months ago (second list: is empty, 5).
- Emailable 15, callable 15, textable 3. Odessa Fernwhistle 5, then three agents with 3 each.
- Next move: batch email; calls go to anyone who replies.

**4. Stalled Pipeline, No Touch In 90+ Days (53)**
- Smart List: Stage includes Lead, Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract; Last Communication was more than 90 days ago.
- Emailable 48, callable 45, textable 3. Juniper Quickfoot 13, Odessa Fernwhistle 12, Rufus Tumbleweed 11.
- Why: they were in an active conversation that stopped. It includes Showing Homes 6 and Listing Agreement 4: check those first, since either the stage is out of date or the conversation is happening outside Follow Up Boss.
- Next move: assigned agent calls this week; anything still silent gets a stage or pond decision.

**5. Never-Worked Leads (56)**
- Smart List: Last Communication is empty; Created was more than 30 days ago; Stage excludes Trash, Rejected, Vendor, Closed, Past Client, Sphere.
- Emailable 43, callable 48, textable 8. Rufus Tumbleweed 15, Barnaby Larkspur 12, Juniper Quickfoot 11. Top sources: Zillow 12, Referral 10.
- Next move: call list; a pond rule, if you adopt one, decides who works the ones the assigned agent can't.

**6. Quiet Nurture, No Touch In 180+ Days (79)**
- Smart List: Stage includes Nurture; Last Communication was more than 180 days ago (second list: is empty, 19).
- Emailable 66, callable 73, textable 20. Rufus Tumbleweed 20, Juniper Quickfoot 19, Barnaby Larkspur 17.
- Next move: batch email; replies go to the assigned agent.

For every email list add: Email is good; Tags exclude Unsubscribed and the bounced-email tag. For every text list add: Text Consent contains Yes; Phone is good; Tags exclude Do Not Call, DNC and Do Not Text. Action plans can't be applied in bulk in Follow Up Boss, so a batch email or call list is the first move; an admin can start an action plan through an automation later.

## Questions for the Team

1. **What separates Closed from Past Client?** You use both stages (30 and 23) plus four spellings of a past client tag, and Follow Up Boss's default Past Clients list only looks at Closed.
2. **When does a lead move to the Lantern Lake pond, and who works it?** 94 active-stage contacts have had no communication in 90+ days, and there's no written rule for when a lead goes to the pond.
3. **Is 90 days your follow-up standard?** It's this skill's default; give me yours and I'll rerun.
4. **What does Vendor mean?** 5 contacts sit there; I left them out of every segment.
5. **Which tag spelling stays** for Seller, Buyer, Past Client, Open House, Sphere and Investor?
6. **What does "Yes" in Text Consent mean?** 37 of the yes values say website form and 32 say open house sign in. Those count only if the form or sign-in sheet had text consent wording that names your team and the phone number. The texts below assume each yes points to a signed, written consent record.
7. **Who keeps the contact in the 6 merge groups split across agents?** Merging keeps the main record's agent, so the team makes that call, not ops.

## Nurture Drafts

For each agent to send in their own voice. [First Name] becomes the Contact First Name merge field in a Follow Up Boss template.

**1. Back On The Site**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been a little while since we talked, and I wanted to see whether a move is on your mind this year. What would help most right now?"

Email
Subject: Still Thinking About A Move?
> Hi [First Name],
>
> It's been a while since we last talked, so I wanted to check in. If a move is on your mind this year, I'm glad to help however is useful: a list of recent sales near you, a look at what's coming on the market, or answers to a few questions.
>
> Would a quick call this week help?
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Checking in: is a move on your mind this year? Happy to help with anything you need. Reply STOP to opt out."

**2. Past Clients, No Touch In 12+ Months**

No text: none of these 18 shows a yes in Text Consent.

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been too long, and I wanted to say thanks again and see how the house is treating you. Is there anything about the home or the market I can help with?"

Email
Subject: Thinking Of You And Your Home
> Hi [First Name],
>
> It's been a while, and I wanted to thank you again for trusting me with your move. I hope the home has been good to you.
>
> If it would help, I'm happy to put together a home value review or answer any questions about the market. And if someone you know is thinking about buying or selling, I'd be glad to talk with them.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**3. Sphere, No Touch In 12+ Months**

Email
Subject: A Quick Hello From [Agent Name]
> Hi [First Name],
>
> I realized it's been far too long since I reached out, so this is just a hello. How have you been?
>
> If real estate questions ever come up for you or someone you know, I'm always glad to help.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been too long, just saying hello! How have you been? Reply STOP to opt out."

**4. Stalled Pipeline**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. When we last talked you were looking at a move, and I didn't want to lose track of you. Has anything changed with your plans?"

Email
Subject: Are Your Plans Still The Same?
> Hi [First Name],
>
> When we last talked, you were planning a move, and I want to make sure I'm still helpful. Have your plans changed?
>
> If you're still looking, I'm happy to pick up where we left off. If the timing has moved, just reply "later" and I'll check back when it suits you.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Are your moving plans still on, or has the timing changed? Either way is fine, I just want to help when it's useful. Reply STOP to opt out."

**5. Never-Worked Leads**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. You reached out to us a while back and I'm sorry we didn't follow up sooner. Are you still looking, and what can I help with?"

Email
Subject: Following Up On Your Home Search
> Hi [First Name],
>
> You reached out to us a while back, and I'm sorry we didn't follow up sooner. If you're still looking, I'd be glad to help: I can send listings that fit what you want or answer any questions.
>
> What would help most?
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Sorry for the slow follow-up on your home search. Still looking? I'm glad to help. Reply STOP to opt out."

**6. Quiet Nurture**

Email
Subject: Still Interested In Hearing From Me?
> Hi [First Name],
>
> It's been a while since we were in touch, and I want to make sure these emails are still useful to you.
>
> If you'd like help with a move, now or later, just reply and tell me what you're looking for. If you'd rather not hear from me, the link below takes you off the list.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Are you still thinking about a move? If so, I'm glad to help whenever you're ready. Reply STOP to opt out."

## Check Before Sending

- **Segment sizes and filter values** against Follow Up Boss before sending: Back On The Site 31 (Last Activity under 30 days, Last Communication over 30 days), Past Clients 18 and Sphere 16 (12+ months), Stalled Pipeline 53 (90+ days), Never-Worked Leads 56 (added 30+ days ago, Last Communication empty), Quiet Nurture 79 (180+ days). If a Smart List count is far off, fix the filter first.
- **Stage and tag names in the filters:** Closed, Past Client, Sphere, Nurture, Vendor, Trash, Rejected, the ten active stages, Unsubscribed, Do Not Call, DNC, Do Not Text, and the exact text of your bounced-email tag.
- **Text consent:** every contact on a text list has a consent record that names your team or brokerage and the phone number. Text Consent = Yes in the export points to it; the record is the proof. Confirm what the field means with your broker. A website form or an open house sign-in counts only if it had text consent wording.
- **Texts one at a time:** each text is a starting point the assigned agent makes their own and sends to one person at a time. Follow Up Boss says its texting is for one-to-one conversations, not mass or drip texting.
- **Do Not Call:** scrub every call list and text list against the National Do Not Call Registry and your internal list before use. Follow Up Boss has no built-in scrub.
- **Quiet hours:** calls and texts between 8 a.m. and 8 p.m. in the recipient's time zone, and no calls or voicemails on a Sunday or a legal holiday.
- **Emails:** the unsubscribe link works; [Sender Postal Address] is your real address; Admin > Company in Follow Up Boss shows the right company information, since its own unsubscribe footer uses it.
- **Placeholders:** [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Unsubscribe Link], [Sender Postal Address].
- **State rules** for texting and calling where you and your contacts are: confirm with your broker or an attorney.
- **Worklist:** 205 rows hold names and phone numbers; share it only with the people doing the cleanup. Nothing in Follow Up Boss was changed.

Files: cleanup_worklist.csv and health_report.md.
