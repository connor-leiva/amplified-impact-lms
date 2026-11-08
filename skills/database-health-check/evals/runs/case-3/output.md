**Bottom line:** Your Follow Up Boss export holds 800 contacts as of 2026-11-08. The three biggest problems are 109 leads added 30+ days ago that were never contacted, 84 live contacts with a missing or invalid phone, and 80 active-stage contacts who have gone quiet for 90+ days. Merge duplicates first: 40 records (5.0%) sit in 20 merge groups, and Follow Up Boss keeps the main record's stage and agent when it merges, so stage and assignment fixes made before merging would be wasted.

**About texts:** I didn't write any. This export has no field showing which contacts agreed to get texts from your team: no consent column, no consent tag. A phone number in Follow Up Boss isn't consent, so every group below gets an email and, where it fits, a call opener instead. How to fix it is in Questions for the Team; once the field exists, run this again and the text drafts come back for the contacts who said yes.

## What I Used

- **File:** fub-people-export-no-consent.csv, a Follow Up Boss People export, 800 records.
- **Settings:** defaults, since no team rules were uploaded: stale after 90 days in an active stage, past clients and sphere after 365 days, Lead stage flagged 60+ days after being added, never contacted if added 30+ days ago, quiet nurture after 180 days.
- **Columns that drove the checks:** Stage, Lead Source, Assigned To, Date Added, Last Communication, Is Contacted, Tags, Deal Stage and Deal Close Date, Email 1 and 2, Phone 1 and 2.
- **Gaps:** no text consent field (texts withheld); no Last Activity column, so the Back On The Site group (people active on your website whom nobody has called) couldn't be built; no record ID column, so the worklist uses each record's row in the file, name and first email or phone. Follow Up Boss exports pond leads under the pond's lead agent without the pond name; no pond tags were found.

## Health Report

**Contacts by stage**

| Stage | Read as | Contacts | % |
|---|---|---|---|
| Nurture | Nurture | 217 | 27.1% |
| Lead | New lead | 129 | 16.1% |
| Attempted Contact | Active lead | 87 | 10.9% |
| Sphere | Sphere | 73 | 9.1% |
| Trash | Inactive | 49 | 6.1% |
| Spoke with Customer | Active lead | 41 | 5.1% |
| Closed | Past client | 41 | 5.1% |
| Past Client | Past client | 32 | 4.0% |
| Under Contract | Active client | 29 | 3.6% |
| Rejected | Inactive | 27 | 3.4% |
| Showing Homes | Active client | 18 | 2.2% |
| Appointment Set | Active lead | 17 | 2.1% |
| Met with Customer | Active lead | 12 | 1.5% |
| Vendor | Other (guessed: please confirm) | 10 | 1.2% |
| Active Listing | Active client | 9 | 1.1% |
| Listing Agreement | Active client | 6 | 0.8% |
| Submitting Offers | Active client | 3 | 0.4% |

**Contacts by source (top 10)**

| Source | Contacts | % |
|---|---|---|
| Zillow | 130 | 16.2% |
| Sphere | 102 | 12.8% |
| Website | 97 | 12.1% |
| Import | 95 | 11.9% |
| Referral | 88 | 11.0% |
| Facebook | 57 | 7.1% |
| Realtor.com | 53 | 6.6% |
| Open House | 50 | 6.2% |
| Past Client | 48 | 6.0% |
| Homes.com | 26 | 3.2% |

"Import" is what Follow Up Boss records when an import file has no source column, so 95 contacts lost their original source.

**By assigned agent**

| Agent | Contacts | % | Active stage, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months |
|---|---|---|---|---|---|
| Clementine Rook | 246 | 30.8% | 42 | 26 | 18 |
| Ivo Saltmarsh | 230 | 28.8% | 50 | 34 | 14 |
| Pascal Wickerby | 179 | 22.4% | 24 | 27 | 13 |
| Delphine Ashgrove | 138 | 17.2% | 31 | 22 | 6 |
| (unassigned) | 7 | 0.9% | 1 | 0 | 0 |

**Contact info**

| Check | Contacts | % |
|---|---|---|
| No email | 60 | 7.5% |
| Email invalid or a placeholder | 9 | 1.1% |
| Bounced-email tag | 9 | 1.1% |
| Unsubscribed from email | 27 | 3.4% |
| No phone | 81 | 10.1% |
| Phone not a valid 10-digit US number | 9 | 1.1% |
| Do Not Call tag | 11 | 1.4% |
| No valid email and no valid phone | 3 | 0.4% |

**Likely duplicates:** 20 merge groups (40 records) share an email or phone under the same or a near-identical name; merging them would remove 20 records. 4 more groups (8 records) share an email or phone under a different first name with the same last name, for a person to decide. One phone number sits on 7 different people's records, which looks like an office or lender line, so it's flagged for review rather than merged. 3 groups (6 records) share only a name. In 6 of the merge groups (12 records) the records have different assigned agents, so the team decides who keeps each contact before ops merges (Question 7).

**Active-stage contacts with no communication in 90+ days:** 148 of 351 (42.2%): 80 gone quiet, 68 with no communication on record. By stage: Lead 88, Attempted Contact 25, Spoke with Customer 11, Showing Homes 8, Under Contract 6, Appointment Set 4, Met with Customer 3, Active Listing 1, Listing Agreement 1, Submitting Offers 1. By agent: Ivo Saltmarsh 50, Clementine Rook 42, Delphine Ashgrove 31, Pascal Wickerby 24, unassigned 1.

**Never contacted (Is Contacted = No, added 30+ days ago):** 109. Top sources: Referral 21, Zillow 15, Website 14, Sphere 13, Realtor.com 11. Referrals and sphere contacts that nobody called are the ones to look at first.

**Past clients and sphere**

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients (Closed or Past Client stage) | 73 | 19 | 3 |
| Sphere | 73 | 32 | 10 |

**Stage problems:** 3 closed deals still sit in Under Contract (the Deal Stage says closed); 57 contacts were talked to but are still in Lead 60+ days after being added (118 are in Lead that long in all; the rest are counted under never contacted); 4 contacts carry an Imported Stage or Imported Agent tag left from an import.

**Unassigned:** 7 (Nurture 3, active leads 2, active clients 2).

**Near-duplicate tags:** Buyer (45), Buyers (30), buyer (17); Seller (35), Sellers (30), seller (21); Open House (32), Openhouse (22), open house (18), Open-House (9); Past Client (32), past client (15), Past Clients (15), PastClient (9); Sphere (23), sphere (11); Investor (5), Investors (3), investor (3).

## Cleanup Worklist

**File:** cleanup_worklist.csv, 323 rows, one per record that needs work. It's the only file with names, emails and phone numbers; share it only with whoever does the cleanup.

| Action | Rows |
|---|---|
| Agent Follow-Up Or Pond Decision | 127 |
| Fill Missing Phone | 49 |
| Merge Candidate | 40 |
| Review New-Lead Stage | 31 |
| Fill Missing Email | 31 |
| Review Shared Contact Info | 15 |
| Fix Invalid Email | 8 |
| Assign Agent | 7 |
| Fix Invalid Phone | 7 |
| Fix Stage | 3 |
| Review Possible Duplicate (Name Only) | 3 |
| Clean Import Tag | 1 |
| Fill Missing Contact Info | 1 |

How to work the top three:
1. **Merge Candidate (40 rows) first.** Sort by Duplicate Group and check the Suggested Main Record. In Follow Up Boss: search the name, View List of People, select the records, Mass Actions > Merge People, choose the main contact. It can't be undone, and the other records go to Trash. Where the Reason says the records have different agents, wait for the team to decide who keeps the contact.
2. **Agent Follow-Up Or Pond Decision (127 rows).** Hand each agent their rows; anything still silent after a real attempt gets a stage change or a pond decision under a rule you set.
3. **Fill Missing Phone (49 rows).** Fill only from the record's own history.

## Re-Engagement Groups

Five groups; the sixth (people back on your website) needs a Last Activity column. A contact can match two; work them in this order. Each agent's Smart List shows only their own contacts.

**1. Past Clients, No Touch In 12+ Months (19)**
- Smart List: Stage includes Closed, Past Client; Last Communication was more than 12 months ago. Second list for the 3 never contacted: Last Communication is empty.
- Emailable 15, callable 18. Clementine Rook 9, Pascal Wickerby 5, Delphine Ashgrove 3. Follow Up Boss's default Past Clients list uses Closed and 90 days.
- Next move: call list by assigned agent, then a personal email.

**2. Sphere, No Touch In 12+ Months (32)**
- Smart List: Stage includes Sphere; Last Communication was more than 12 months ago (second list: is empty, 10).
- Emailable 27, callable 28. Ivo Saltmarsh 12, Clementine Rook 9, Pascal Wickerby 8.
- Next move: batch email; calls to anyone who replies.

**3. Stalled Pipeline, No Touch In 90+ Days (79)**
- Smart List: Stage includes Lead, Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract; Last Communication was more than 90 days ago.
- Emailable 72, callable 70. Clementine Rook 27, Ivo Saltmarsh 25, Delphine Ashgrove 16.
- It includes Under Contract 5 and Showing Homes 8: check those first; the stage may be out of date.
- Next move: assigned agent calls this week.

**4. Never-Worked Leads (96)**
- Smart List: Last Communication is empty; Created was more than 30 days ago; Stage excludes Trash, Rejected, Vendor, Closed, Past Client, Sphere.
- Emailable 80, callable 79. Ivo Saltmarsh 28, Clementine Rook 25, Pascal Wickerby 23. Top sources: Referral 16, Zillow 15, Website 14.
- Next move: call list.

**5. Quiet Nurture, No Touch In 180+ Days (142)**
- Smart List: Stage includes Nurture; Last Communication was more than 180 days ago (second list: is empty, 29).
- Emailable 127, callable 122. Clementine Rook 46, Pascal Wickerby 36, Ivo Saltmarsh 34.
- Next move: batch email; replies go to the assigned agent.

For every email list add: Email is good; Tags exclude Unsubscribed and the bounced-email tag. Action plans can't be applied in bulk in Follow Up Boss, so a batch email or call list comes first.

## Questions for the Team

1. **Where do you record text consent?** Nothing in this export shows it. Add a custom field in Follow Up Boss (for example, Text Consent, holding "Yes" plus the date and where it was given), fill it only from signed records that name your team and the phone number, then export and run this again. Your broker can confirm what your records need to show.
2. **What's your follow-up standard and pond rule?** 148 active-stage contacts have had no communication in 90+ days, and there's no written rule for when a lead moves to Nurture or a pond.
3. **What separates Closed (41) from Past Client (32)?** Follow Up Boss's default Past Clients list only looks at Closed.
4. **What does Vendor mean?** 10 contacts sit there; I left them out of every group.
5. **Who owns the 7 unassigned contacts?**
6. **Which tag spelling stays** for Buyer, Seller, Open House, Past Client, Sphere and Investor?
7. **Who keeps the contact in the 6 merge groups split across agents?** Merging keeps the main record's agent, so the team makes that call, not ops.

## Nurture Drafts

Emails and call openers only, for each agent to send in their own voice. [First Name] becomes the Contact First Name merge field in a Follow Up Boss template.

**1. Past Clients**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been too long, and I wanted to say thanks again and see how the house is treating you. Anything I can help with?"

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

**2. Sphere**

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

**3. Stalled Pipeline**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. When we last talked you were planning a move, and I didn't want to lose track of you. Has anything changed?"

Email
Subject: Are Your Plans Still The Same?
> Hi [First Name],
>
> When we last talked, you were planning a move. Have your plans changed?
>
> If you're still looking, I'm happy to pick up where we left off. If the timing has moved, reply "later" and I'll check back when it suits you.
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**4. Never-Worked Leads**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. You reached out to us a while back and I'm sorry we didn't follow up sooner. Are you still looking?"

Email
Subject: Following Up On Your Home Search
> Hi [First Name],
>
> You reached out to us a while back, and I'm sorry we didn't follow up sooner. If you're still looking, I'd be glad to help with listings that fit what you want or any questions.
>
> What would help most?
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**5. Quiet Nurture**

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

## Check Before Sending

- **Group sizes and filter values** against Follow Up Boss before sending: Past Clients 19 and Sphere 32 (12+ months), Stalled Pipeline 79 (90+ days), Never-Worked Leads 96 (added 30+ days ago, Last Communication empty), Quiet Nurture 142 (180+ days).
- **No texts** go to any of these groups until a consent field exists and each contact's consent record is on file.
- **Do Not Call:** scrub every call list against the National Do Not Call Registry and your internal list first; Follow Up Boss has no built-in scrub. 11 contacts already carry a Do Not Call tag.
- **Quiet hours:** calls between 8 a.m. and 8 p.m. in the recipient's time zone.
- **Emails:** a working unsubscribe link, your real postal address, and the right company information in Admin > Company (Follow Up Boss uses it in its own unsubscribe footer).
- **Placeholders:** [First Name], [Agent Name], [Team or Brokerage Name], [Brokerage Name], [Unsubscribe Link], [Sender Postal Address].
- **State rules** for calling and email where you and your contacts are: confirm with your broker or an attorney.
- **Worklist:** 323 rows with names and phone numbers. Nothing in Follow Up Boss was changed.

Files: cleanup_worklist.csv and health_report.md.
