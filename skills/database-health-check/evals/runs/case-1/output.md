**Bottom line:** Your Follow Up Boss export holds 5,000 contacts as of 2026-11-08. The three biggest problems are 669 leads added 30+ days ago that were never contacted, 562 live contacts with a missing or invalid phone, and 529 active-stage contacts who have gone quiet for 90+ days. Do the merge pass first: 272 records (5.4%) sit in 133 merge groups, and Follow Up Boss keeps the main record's stage and agent when it merges, so stage and assignment fixes made before merging would be wasted.

## What I Used

- **Files:** fub-people-export-5000.csv (Follow Up Boss People export, 5,000 records) and closed-transactions-2019-2026.csv (167 closed deals).
- **Settings:** all defaults, since no team rules were uploaded: stale after 90 days in an active stage, past clients and sphere untouched after 365 days, new-lead stage after 60 days, never contacted if added 30+ days ago, quiet nurture after 180 days.
- **Columns that drove the checks:** Stage, Lead Source, Assigned To, Date Added, Last Communication (for every "no touch" check), Last Activity (lead activity), Is Contacted, Tags, Deal Stage and Deal Close Date, Email 1 and 2, Phone 1 and 2, and the Text Consent custom field.
- **Gaps:** the export has no record ID column, so the worklist identifies each record by its row in this file, its name and its first email or phone. Follow Up Boss exports pond leads under the pond's lead agent and leaves out the pond name; your pond leads carry a "Pond: Lantern Lake" tag, which is how they were found.
- **Left out on purpose:** the Birthday column and every relationship column. Notes, calls and texts were not read.

## Health Report

**Contacts by stage**

| Stage | Read as | Contacts | % |
|---|---|---|---|
| Nurture | Nurture | 1,349 | 27.0% |
| Lead | New lead | 844 | 16.9% |
| Attempted Contact | Active lead | 517 | 10.3% |
| Sphere | Sphere | 493 | 9.9% |
| Trash | Inactive | 302 | 6.0% |
| Spoke with Customer | Active lead | 257 | 5.1% |
| Closed | Past client | 235 | 4.7% |
| Past Client | Past client | 223 | 4.5% |
| Rejected | Inactive | 148 | 3.0% |
| Showing Homes | Active client | 110 | 2.2% |
| Met with Customer | Active lead | 106 | 2.1% |
| Appointment Set | Active lead | 97 | 1.9% |
| Under Contract | Active client | 77 | 1.5% |
| Listing Agreement | Active client | 67 | 1.3% |
| Submitting Offers | Active client | 62 | 1.2% |
| Vendor | Other (guessed: please confirm) | 58 | 1.2% |
| Active Listing | Active client | 55 | 1.1% |

Every stage except Vendor matched Follow Up Boss's defaults or a common custom stage (Past Client, Sphere).

**Contacts by source (top 10)**

| Source | Contacts | % |
|---|---|---|
| Zillow | 825 | 16.5% |
| Sphere | 668 | 13.4% |
| Import | 637 | 12.7% |
| Website | 628 | 12.6% |
| Referral | 488 | 9.8% |
| Realtor.com | 348 | 7.0% |
| Open House | 347 | 6.9% |
| Facebook | 329 | 6.6% |
| Past Client | 236 | 4.7% |
| Homes.com | 153 | 3.1% |

Another 113 (2.3%) have no source. "Import" is the source Follow Up Boss assigns when an import file has no source column, so 637 contacts lost their original source on the way in.

**By assigned agent**

| Agent | Contacts | % | Active stage, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months |
|---|---|---|---|---|---|
| Juniper Quickfoot | 776 | 15.5% | 145 | 99 | 60 |
| Barnaby Larkspur | 769 | 15.4% | 142 | 110 | 51 |
| Odessa Fernwhistle | 682 | 13.6% | 138 | 89 | 57 |
| Desmond Puddlejump | 619 | 12.4% | 124 | 88 | 40 |
| Rufus Tumbleweed | 601 | 12.0% | 111 | 74 | 36 |
| Marisol Pinecone | 535 | 10.7% | 95 | 65 | 27 |
| Hazel Thimbleberry | 480 | 9.6% | 75 | 70 | 26 |
| Calloway Brightwater | 475 | 9.5% | 99 | 64 | 38 |
| (unassigned) | 63 | 1.3% | 10 | 10 | 5 |

All 173 pond-tagged contacts are assigned to Desmond Puddlejump, the pond's lead agent in this export, so his count includes the pond.

**Contact info**

| Check | Contacts | % |
|---|---|---|
| No email | 416 | 8.3% |
| Email invalid or a placeholder | 56 | 1.1% |
| Bounced-email tag | 60 | 1.2% |
| Unsubscribed from email | 161 | 3.2% |
| No phone | 529 | 10.6% |
| Phone not a valid 10-digit US number | 83 | 1.7% |
| Do Not Call tag | 102 | 2.0% |
| Opted out of texts or consent "No" | 136 | 2.7% |
| No valid email and no valid phone | 51 | 1.0% |

These are format checks only: a well-formed email or phone can still be dead.

**Likely duplicates**

| Type | Groups | Records |
|---|---|---|
| Same email or phone, same or near-identical name: merge candidates | 133 | 272 |
| Same email or phone, different first name, same last name: shared contact info | 24 | 48 |
| Same email or phone, different names | 6 | 12 |
| Same or near-identical name only, different contact info: review | 83 | 167 |

Merging every merge group would remove 139 records. One phone number sits on 8 different people's records; that looks like an office or lender line typed into contacts, so it is flagged for review, not merged.

**Active-stage contacts with no communication in 90+ days:** 939 of 2,192 active-stage contacts (42.8%). Of those, 529 have gone quiet (communication on record, none in 90+ days) and 410 have no communication on record.

| Stage | Contacts |
|---|---|
| Lead | 552 |
| Attempted Contact | 158 |
| Spoke with Customer | 63 |
| Showing Homes | 39 |
| Met with Customer | 29 |
| Appointment Set | 26 |
| Active Listing | 20 |
| Under Contract | 20 |
| Submitting Offers | 17 |
| Listing Agreement | 15 |

By agent, see the agent table above (Juniper Quickfoot 145, Barnaby Larkspur 142, Odessa Fernwhistle 138 lead it).

**Never contacted (Is Contacted = No, added 30+ days ago):** 669. Top sources: Zillow 124, Website 101, Import 83, Sphere 77, Referral 61.

**Past clients and sphere**

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 487 | 178 | 51 |
| Sphere | 493 | 162 | 39 |

Past clients were found by stage (Closed or Past Client, 458) and by the closed-transaction file (29 more). The closed-deal file has 167 closed deals: 147 matched a contact by email or phone, 6 matched by name only (not used to change anything), and 14 are not in the CRM at all.

**Stage problems**

| Check | Contacts |
|---|---|
| Closed deal still in an active stage | 31 |
| Matches a closed deal but not in a past client stage | 20 |
| Contacted, but still in Lead 60+ days after being added | 426 |
| Imported Stage or Imported Agent tag left from an import | 54 |
| No stage | 0 |

The 31 closed deals sit in Showing Homes 9, Under Contract 6, Active Listing 5, Attempted Contact 4, Spoke with Customer 3, Met with Customer 2 and Submitting Offers 2. In all, 781 contacts are in Lead 60+ days after being added; the 426 above were talked to and never moved, and the rest are counted under never contacted.

**Unassigned and ponds:** 63 contacts have no agent and no pond (Nurture 21, active leads 14, sphere 8, new leads 7, past clients 7, active clients 5, other 1). 173 contacts carry the pond tag.

**Near-duplicate tags:** 38 tags in use; 7 groups of near-duplicates (21 tags):

| Variants (contacts) | Total |
|---|---|
| Seller (265); Sellers (146); seller (142) | 553 |
| Open House (204); Open-House (126); Openhouse (107); open house (103) | 540 |
| Buyer (270); Buyers (129); buyer (127) | 526 |
| Past Client (185); past client (98); Past Clients (95); PastClient (71) | 449 |
| Sphere (135); sphere (65) | 200 |
| Investors (32); Investor (29); investor (23) | 84 |
| VIP (14); vip (9) | 23 |

**Text consent:** the Text Consent field shows yes for 1,309 contacts and no for 136; 3,555 are blank. 1,252 are textable (yes, valid phone, not opted out, not Do Not Call).

## Cleanup Worklist

**File:** cleanup_worklist.csv, 2,208 rows, one per record that needs work (trash and rejected left out). It is the only file with names, emails and phone numbers: share it only with the people doing the cleanup.

| Action | Rows |
|---|---|
| Agent Follow-Up Or Pond Decision | 792 |
| Fill Missing Phone | 293 |
| Merge Candidate | 272 |
| Review New-Lead Stage | 235 |
| Fill Missing Email | 202 |
| Review Possible Duplicate (Name Only) | 94 |
| Review Shared Contact Info | 68 |
| Assign Agent | 61 |
| Fix Invalid Phone | 55 |
| Fix Stage | 46 |
| Clean Import Tag | 34 |
| Fix Invalid Email | 31 |
| Fill Missing Contact Info | 22 |
| Archive Candidate | 3 |

How to work the top three:
1. **Merge Candidate (272 rows, do these first).** Sort by Duplicate Group. For each group, open the records, check the one marked Suggested Main Record, then in Follow Up Boss search the name, View List of People, select the records, Mass Actions > Merge People and pick the main contact. The main contact keeps its name, agent, lender and stage; the others go to Trash. A merge can't be undone, so check before each one. Leave "Review Shared Contact Info" rows for a person to decide: two people can share a number, and Merge People As Relationships links them without merging.
2. **Agent Follow-Up Or Pond Decision (792 rows).** Split by Assigned Agent and hand each agent their rows. Anything still silent after the agent's attempt gets a stage or pond decision under the rule you set (see Questions).
3. **Fill Missing Phone (293 rows).** Fill only from the record's own history (an inquiry, a signed form). Don't buy or append numbers to text them.

## Re-Engagement Segments

Six segments, in priority order. A contact can match two; work them in this order. Sizes come from the export, so a shared Smart List will show each agent only their own contacts.

**1. Back On The Site (305)**
- Filter: Last Activity was less than 30 days ago; Last Communication was more than 30 days ago; Stage excludes Trash, Rejected, Vendor. Second list for the 77 never contacted: Last Activity was less than 30 days ago; Last Communication is empty.
- Emailable 266, callable 267, textable 86. Most are Juniper Quickfoot's 48, Desmond Puddlejump's 44 and Odessa Fernwhistle's 43.
- Why: they were active in the last 30 days and nobody has talked to them in 30 or more, including Closed 12 and Past Client 11: past clients back on the site. Follow Up Boss's default Revived Prospects list is a 7-day version of this; if you already work it, this is the wider net.
- Next move: call list today, by assigned agent.

**2. Past Clients, No Touch In 12+ Months (178)**
- Filter: Stage includes Closed, Past Client; Last Communication was more than 12 months ago. Second list: Last Communication is empty (51).
- Emailable 160, callable 153, textable 43. Juniper Quickfoot 30, Odessa Fernwhistle 27, Barnaby Larkspur 26.
- Why: these are people the team already closed with. The ones in Lead (9), Nurture (6) and Attempted Contact (4) are past clients only by the closed-deal file; fix their stage first (they're Fix Stage rows on the worklist) or the filter won't catch them. Follow Up Boss's default Past Clients list uses Closed and 90 days.
- Next move: call list by assigned agent, then a personal email.

**3. Sphere, No Touch In 12+ Months (162)**
- Filter: Stage includes Sphere; Last Communication was more than 12 months ago. Second list: Last Communication is empty (39).
- Emailable 143, callable 144, textable 45. Juniper Quickfoot 30, Odessa Fernwhistle 30, Barnaby Larkspur 25.
- Next move: batch email; calls go to anyone who replies.

**4. Stalled Pipeline, No Touch In 90+ Days (527)**
- Filter: Stage includes Lead, Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract; Last Communication was more than 90 days ago.
- Emailable 441, callable 457, textable 138. Juniper Quickfoot 89, Barnaby Larkspur 76, Odessa Fernwhistle 75.
- Why: they were in an active conversation that stopped. It includes Active Listing 18 and Under Contract 17: check those first, because either the stage is out of date or the conversation is happening outside the CRM.
- Next move: assigned agent calls this week; anything still silent gets a stage or pond decision.

**5. Never-Worked Leads (581)**
- Filter: Last Communication is empty; Created was more than 30 days ago; Stage excludes Trash, Rejected, Vendor, Closed, Past Client, Sphere.
- Emailable 488, callable 477, textable 131. Barnaby Larkspur 96, Juniper Quickfoot 81, Desmond Puddlejump 80. Top sources: Zillow 117, Website 90, Import 63.
- Next move: call list; if you adopt a pond rule, it decides who works the ones the assigned agent can't.

**6. Quiet Nurture, No Touch In 180+ Days (863)**
- Filter: Stage includes Nurture; Last Communication was more than 180 days ago. Second list: Last Communication is empty (190).
- Emailable 748, callable 723, textable 203. Barnaby Larkspur 136, Juniper Quickfoot 131, Desmond Puddlejump 123.
- Next move: batch email; replies go to the assigned agent.

For every email list add: Email is good; Tags exclude Unsubscribed and the bounced-email tag. For every text list add: Text Consent contains Yes; Phone is good; Tags exclude Do Not Call, DNC and Do Not Text. Never send a text to a list without the Text Consent filter. Action plans can't be applied in bulk in Follow Up Boss, so a batch email or call list is the first move; an admin can start an action plan through an automation later.

## Questions for the Team

1. **What separates Closed from Past Client?** You have 235 contacts in Closed and 223 in Past Client, plus four spellings of a past client tag. Follow Up Boss's default Past Clients list only looks at Closed.
2. **When does a lead move to the pond, and who works it?** 939 active-stage contacts have had no communication in 90+ days, and 173 contacts carry the Lantern Lake pond tag, but there's no written rule for when a lead goes there.
3. **Is 90 days your follow-up standard for active stages?** It's this skill's default; give me your number and I'll rerun.
4. **What does Vendor mean?** 58 contacts sit there. I read it as vendors and left them out of every segment.
5. **Should the 14 closed deals missing from the CRM be added as past clients?** The 6 that matched only by name need a person to check.
6. **Who owns the 63 unassigned contacts?**
7. **Which tag spelling stays** for Seller, Open House, Buyer, Past Client, Sphere, Investor and VIP?
8. **What does "Yes" in Text Consent mean?** Texts below assume it marks a signed, written consent record that names your team and the phone number.

## Nurture Drafts

Drafts for each agent to send in their own voice. [First Name] becomes Follow Up Boss's Contact First Name merge field in a template.

**1. Back On The Site**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been a little while since we talked, and I wanted to see whether you're thinking about a move this year. What would be most useful to you right now?"

Email
Subject: Still Thinking About A Move?
> Hi [First Name],
>
> It's been a while since we last talked, so I wanted to check in. If a move is on your mind this year, I'm glad to help however is useful: a list of recent sales near you, a look at what's coming on the market, or just answers to a few questions.
>
> Would a quick call this week help?
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Checking in: are you thinking about a move this year? Happy to help with anything you need. Reply STOP to opt out."

**2. Past Clients, No Touch In 12+ Months**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been too long, and I wanted to say thanks again and see how the house is treating you. Is there anything about the home or the market I can help with?"

Email
Subject: Thinking Of You And Your Home
> Hi [First Name],
>
> It's been a while, and I wanted to say thank you again for trusting me with your move. I hope the home has been good to you.
>
> If it would help, I'm happy to put together a home value review or answer any questions about the market. And if a friend or family member is thinking about buying or selling, I'd be glad to talk with them.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (Text Consent filtered list only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been too long! How's the house treating you? If a home value review would help, just say the word. Reply STOP to opt out."

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

- **Segment sizes and filter values** against Follow Up Boss before sending: Back On The Site 305 (Last Activity under 30 days, Last Communication over 30 days), Past Clients 178 (12+ months), Sphere 162 (12+ months), Stalled Pipeline 527 (90+ days), Never-Worked Leads 581 (added 30+ days ago, Last Communication empty), Quiet Nurture 863 (180+ days). If a Smart List count is far off, fix the filter first.
- **Stage and tag names in the filters:** Closed, Past Client, Sphere, Nurture, Vendor, Trash, Rejected, the ten active stages, Unsubscribed, Do Not Call, DNC, Do Not Text, and the exact text of your bounced-email tag.
- **Text consent:** every contact on a text list has a consent record that names your team or brokerage and the phone number. Text Consent = Yes in the export is the pointer, not the proof. Confirm what the field means with your broker.
- **Do Not Call:** scrub every call list and text list against the National Do Not Call Registry and your internal list before use. Follow Up Boss has no built-in scrub.
- **Quiet hours:** calls and texts between 8 a.m. and 8 p.m. in the recipient's time zone.
- **Emails:** the unsubscribe link works; [Sender Postal Address] is your real address; Admin > Company in Follow Up Boss shows the right company information, since its own unsubscribe footer uses it.
- **Placeholders:** [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Unsubscribe Link], [Sender Postal Address].
- **State rules** for texting and calling where you and your contacts are: confirm with your broker or an attorney.
- **Worklist:** 2,208 rows hold names and phone numbers; share it only with the people doing the cleanup. Nothing in your CRM was changed.

Files: cleanup_worklist.csv and health_report.md.
