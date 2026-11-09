# Database Health Check: Brightwater Collective

**Bottom line:** Your export holds 1,200 contacts, and the three biggest problems are 261 leads never contacted (21.8%), 194 contacts with stage problems (16.2%) and 171 with a missing or invalid phone (14.2%). Under your own 60-day standard, 283 of 477 active-status contacts (59.3%) are stale, and 213 New or Warm leads already meet your 45-day Shared Pool rule. Have your VA work the 38 merge groups first (76 records, 6.3% of the database), because a merge keeps one record's status and owner, so any fix made before merging could be lost.

## What I Used

- **File:** brightwater-crm-contacts.csv, another CRM's export (not Follow Up Boss), 1,200 records. The real header is on row 3; the two title rows above it were skipped.
- **Team rules, from your ops lead's CRM Rules doc (updated 09/15/2026):** follow-up standard 60 days (your rule, replacing the 90-day default); Shared Pool after 45 days with no contact for New and Warm (your rule); past clients and SOI touched at least once a year (your rule, 365 days); past client = Past Client status or the Closed Client label; SOI read as sphere; Closed Lost and Do Not Contact read as inactive and left out of the worklist and segments.
- **Defaults (no team rule):** a New lead still New 60 days after it was added; never contacted means added 30+ days ago with no contact on record; quiet nurture after 180 days; back on the site means a website visit in the last 30 days with no contact in 30 days.
- **Columns that drove the checks:** Lead Status as stage, Owner as agent, Last Contacted as last communication, Last Website Visit as lead activity, Labels as tags, Contact ID as record ID, Created Date as date added, Primary and Secondary Email, Mobile and Home Phone, SMS Opt-In as text consent, Email Opt-Out as email opt-out.
- **Gaps:** none reported by the run. One limit: your CRM's Last Contacted is read as real outreach. If it also updates on automated emails, the stale counts run low. Confirm with your CRM's support.

## Health Report

**By status**

| Status | Read as | Contacts | % |
|---|---|---|---|
| Long-Term Nurture | Nurture (your rules) | 279 | 23.2% |
| New | New lead (your rules) | 192 | 16.0% |
| SOI | Sphere (your rules) | 163 | 13.6% |
| Warm | Active lead (your rules) | 134 | 11.2% |
| Past Client | Past client (your rules) | 101 | 8.4% |
| (blank) | No status | 71 | 5.9% |
| Closed Lost | Inactive (your rules) | 58 | 4.8% |
| Active Buyer | Active client (your rules) | 37 | 3.1% |
| Hot | Active lead (your rules) | 37 | 3.1% |
| Investor | Not defined in your rules | 30 | 2.5% |
| In Escrow | Active client (your rules) | 28 | 2.3% |
| Appointment Booked | Active lead (your rules) | 27 | 2.2% |
| Active Seller | Active client (your rules) | 22 | 1.8% |
| Do Not Contact | Inactive (your rules) | 21 | 1.8% |

**By source (top 10):** Website 222 (18.5%); Zillow 177 (14.8%); Import 160 (13.3%); SOI 132 (11.0%); Referral 128 (10.7%); Open House 113 (9.4%); Facebook Ads 110 (9.2%); (blank) 62 (5.2%); Realtor.com 52 (4.3%); Sign Call 44 (3.7%).

**By owner**

| Owner | Contacts | % | Active status | Active, no touch 60+ days | Never contacted | Past client or SOI, no touch 12+ months |
|---|---|---|---|---|---|---|
| Pell Mossgrove | 279 | 23.2% | 115 | 69 | 60 | 24 |
| Sunny Larkfield | 272 | 22.7% | 106 | 63 | 54 | 27 |
| Booker Quillfeather | 221 | 18.4% | 86 | 49 | 40 | 23 |
| Marigold Tumbletoes | 198 | 16.5% | 83 | 49 | 50 | 18 |
| Fennick Oddsworth | 178 | 14.8% | 65 | 39 | 40 | 21 |
| (no owner) | 50 | 4.2% | 22 | 14 | 17 | 8 |
| (Shared Pool, no owner) | 2 | 0.2% | 0 | 0 | 0 | 1 |

**Contact info:** no email 77 (6.4%); email invalid or a placeholder 10 (0.8%); opted out of email 35 (2.9%); no phone 159 (13.2%); phone not a valid 10-digit US number 18 (1.5%); opted out of texts 35 (2.9%); no valid email and no valid phone 12 (1.0%). Format checks only: the run can't tell whether an inbox or line still works.

**Likely duplicates:** 38 merge groups (76 records) share an email or phone and the same or a near-identical name; merging them all would remove 38 records. 10 groups (21 records) share an email or phone under a different first name and the same last name: likely two people in one household or a shared line, so the team decides whether to keep them separate or merge. 7 groups (14 records) match on name only and are listed for review, not merging. In 27 of the merge groups (54 records) the records have different owners: a merge keeps one record's owner, so the team decides who keeps each of those contacts before ops merges.

**Active-status contacts with no contact in 60+ days (your standard):** 283 of 477 (59.3%): 133 gone quiet and 150 with no contact on record. By status: New 118; Warm 83; Active Buyer 22; In Escrow 19; Hot 19; Appointment Booked 13; Active Seller 9. By owner: Pell Mossgrove 69; Sunny Larkfield 63; Marigold Tumbletoes 49; Booker Quillfeather 49; Fennick Oddsworth 39; no owner 14.

**Never contacted (added 30+ days ago, no Last Contacted date):** 261. By owner: Pell Mossgrove 60; Sunny Larkfield 54; Marigold Tumbletoes 50; Fennick Oddsworth 40; Booker Quillfeather 40; no owner 17. Top sources: Import 45; Zillow 40; Website 31; Open House 30; Facebook Ads 27.

**Past clients and SOI (your once-a-year rule):** 110 past clients (101 by status, 9 by the Closed Client label only), 55 with no contact in 365+ days (14 with none on record). 163 SOI, 67 with no contact in 365+ days (8 with none on record).

**Status problems:** 71 with no status; 114 still New 60+ days after being added even though they have contact on record (your rules define New as "nobody has talked to them yet"); 9 carry the Closed Client label but sit in New, Long-Term Nurture or blank; 30 in Investor, which your rules don't define. Counted once each: 194 contacts.

**Unassigned and the Shared Pool:** 46 contacts have no owner and no Shared Pool label (not counting Closed Lost and Do Not Contact). 62 carry the Shared Pool label; only 2 of them have no owner. Under your 45-day rule, 213 New or Warm leads qualify for the Shared Pool now.

**Labels:** 11 distinct labels, 3 near-duplicate groups: First-Time Buyer (58), first time buyer (58), First Time Buyer (42); Closed Client (56), closed client (29), Closed Clients (25); Move Up Seller (53), Move-Up Seller (38).

**Text consent:** SMS Opt-In shows Y for 323, N for 35, blank for 842. 318 are textable (Y, valid phone, not opted out). Every Y is a Y plus a date, with no detail on how consent was given, so the record behind it is the proof.

## Cleanup Worklist

cleanup_worklist.csv, 645 rows, one per record that needs work, sorted by priority (Closed Lost and Do Not Contact left out). Rows by action: Pond Candidate 178; Agent Follow-Up Or Pond Decision 86; Merge Candidate 76; Fill Missing Phone 68; Set Stage 66; Review New-Lead Stage 46; Assign Agent 36; Fill Missing Email 35; Review Shared Contact Info 21; Fix Invalid Phone 11; Fix Stage 8; Fix Invalid Email 7; Review Possible Duplicate (Name Only) 6; Archive Candidate 1.

How ops works the first cleanup, then the two other actions with the most rows:
1. **Merge Candidate (76 rows, first):** open the records in each Duplicate Group, check which has the right status and owner, and merge into the one marked Suggested Main Record = Yes unless the other is clearly better. Check how your CRM merges first (which record's status and owner survive). Where the Reason says the records have different owners, wait for the team to decide who keeps the contact. Leave the 21 Review Shared Contact Info rows for a person.
2. **Pond Candidate (178 rows):** New or Warm leads with no contact in 45+ days. Ops moves them to the Shared Pool under your rule, after the merges.
3. **Agent Follow-Up Or Pond Decision (86 rows):** active statuses past your 60-day standard that the pool rule doesn't cover. Hand each owner their rows.

Then Set Stage (66) and Fix Stage (8): give each blank record a status under your definitions, and move Closed Client contacts to Past Client.

## Re-Engagement Segments

Filters are written in plain words: build each one with your CRM's own filters. Every email list also excludes Email Opt-Out = yes and invalid emails. Every text list adds SMS Opt-In starts with Y, a valid mobile number, and excludes anyone who replied STOP. A contact can match two segments; work them in this order.

**1. Back On The Site.** Filter: Last Website Visit in the last 30 days; Last Contacted more than 30 days ago or empty; Lead Status is not Closed Lost or Do Not Contact. Size 46: emailable 41, callable 38, textable with documented consent 13. Most are owned by Booker Quillfeather 12, Sunny Larkfield 9, Marigold Tumbletoes 9. Why: they're active on your site and 11 have no contact on record. Next move: call list today, by owner.

**2. Past Clients, No Touch In 12+ Months.** Filter: Lead Status is Past Client, or Labels include Closed Client (all three spellings until they're merged); Last Contacted more than 12 months ago or empty. Size 55 (5 also in segment 1): emailable 50, callable 52, textable 19. Most owned by Sunny Larkfield 14, Fennick Oddsworth 12, Booker Quillfeather 10. Why: your rule says once a year, and 14 have no contact on record at all. Next move: call list by owner, then a personal email.

**3. SOI, No Touch In 12+ Months.** Filter: Lead Status is SOI; Last Contacted more than 12 months ago or empty. Size 67 (3 in earlier segments): emailable 64, callable 60, textable 16. Most owned by Pell Mossgrove 15, Sunny Larkfield 13, Booker Quillfeather 13. Why: same once-a-year rule. Next move: batch email, then calls to anyone who replies.

**4. Stalled Pipeline, No Touch In 60+ Days.** Filter: Lead Status is New, Warm, Hot, Appointment Booked, Active Buyer, Active Seller or In Escrow; Last Contacted more than 60 days ago. Size 134 (3 in earlier segments): emailable 122, callable 115, textable 28. Statuses: Warm 50, New 43, Active Buyer 12, In Escrow 10, Hot 9, Active Seller 6, Appointment Booked 4. Most owned by Pell Mossgrove 38, Sunny Larkfield 34, Booker Quillfeather 23. Why: these people were in a real conversation, and your standard is 60 days. Next move: the owner calls this week; New and Warm leads still silent go to the Shared Pool under your rule, and the rest get a status decision.

**5. Never-Worked Leads.** Filter: Last Contacted is empty; Created Date more than 30 days ago; Lead Status is not Closed Lost, Do Not Contact, Past Client or SOI. Size 239 (9 in earlier segments): emailable 218, callable 186, textable 55. Most owned by Pell Mossgrove 54, Sunny Larkfield 52, Marigold Tumbletoes 47. Top sources: Import 40, Zillow 37, Website 28. Why: nobody has talked to any of them. Next move: call list; New and Warm leads go to the Shared Pool under your 45-day rule if their owner can't work them.

**6. Quiet Nurture, No Touch In 180+ Days.** Filter: Lead Status is Long-Term Nurture; Last Contacted more than 180 days ago or empty. Size 205 (65 in earlier segments): emailable 187, callable 166, textable 53. Most owned by Sunny Larkfield 59, Pell Mossgrove 46, Marigold Tumbletoes 33. Why: nurture only works if someone touches it; 62 have no contact on record. Next move: batch email; replies go to the owner.

## Questions for the Team

1. **Blank status:** 71 contacts have no Lead Status. Who sets it, and what should a record with no status default to?
2. **Investor:** 30 contacts sit in Investor, which the CRM Rules doc doesn't define. Is it an active status, nurture, or something else (a vendor or partner list)?
3. **New that isn't new:** 114 contacts are still New 60+ days after they came in, but have contact on record. Your rules say New means nobody has talked to them. Should ops move them to Warm or Long-Term Nurture, or does the owner decide?
4. **Closed Client label on the wrong status:** 9 contacts carry Closed Client but sit in New, Long-Term Nurture or blank. Should ops move them to Past Client, as section 4 of your rules implies?
5. **No owner:** 46 contacts have no owner and no Shared Pool label. Who owns them, and does the Shared Pool rule apply to leads with no owner?
6. **Owner on pool leads:** 62 contacts carry Shared Pool, and only 2 have no owner. When ops moves a lead to the pool, should the owner be cleared?
7. **Pool rule beyond New and Warm:** your 45-day rule covers New and Warm only. Hot (19), Appointment Booked (13), Active Buyer (22), Active Seller (9) and In Escrow (19) contacts are past your 60-day standard. What happens to those?
8. **Label spellings:** which spelling stays for First-Time Buyer, Closed Client and Move Up Seller?
9. **Duplicates with two owners:** 27 merge groups (54 records) have records owned by different agents. Who keeps the contact when ops merges?

## Nurture Drafts

Written for the owner to send in their own voice. [First Name] becomes your CRM's first-name merge field. Texts go only to the SMS Opt-In = Y version of each list, one person at a time from the owner, never as a mass text.

### 1. Back On The Site

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been a while since we talked, and I wanted to check in. Is there anything on the real estate side I can help you with right now?" If yes, offer a short call or a list of recent sales near them.

**Email**
Subject: Checking In From [Team or Brokerage Name]

Hi [First Name],

It's been a while since we talked, so I wanted to check in. If you're weighing a move, or just want to know what homes near you have sold for lately, I'm glad to put that together for you.

Would a quick call this week be useful?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been a while! Is there anything real estate related I can help you with right now? [Agent Phone]. Reply STOP to opt out.

### 2. Past Clients, No Touch In 12+ Months

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. I realized it's been too long since I checked in after we worked together. How is the house treating you?" Then offer a home value review if they're curious.

**Email**
Subject: How Is The House Treating You?

Hi [First Name],

It's been too long since I checked in, and I wanted to say thank you again for trusting me with your move.

If you're ever curious what your home might be worth today, I'm happy to put together a home value review. No strings. And if a question about the house or the market comes up, I'm here.

How has the home been treating you?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been too long! How is the house treating you? Happy to run a home value review anytime. [Agent Phone]. Reply STOP to opt out.

### 3. SOI, No Touch In 12+ Months

**Email**
Subject: A Quick Hello

Hi [First Name],

It's been a while, and you came to mind. I hope things are good on your end.

If a real estate question ever comes up for you or someone you know, I'm always glad to help, even if it's just a quick answer.

What's new with you?

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. You came to mind and I wanted to say hello. What's new with you? Reply STOP to opt out.

### 4. Stalled Pipeline

**Call opener:** "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. We talked a while back about your plans, and I didn't want to drop the ball. Has anything changed, and do you still want my help?" Make it easy to say "not right now."

**Email**
Subject: Are Your Plans Still The Same?

Hi [First Name],

We talked a while back about your plans, and I didn't want you to think I'd forgotten. Has anything changed?

If you still want help, I'm ready when you are. If the timing has moved, that's completely fine. Just let me know and I'll check back later instead.

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Checking in on your plans. Still want help, or should I check back later? Either is fine. Reply STOP to opt out.

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

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. You reached out a while back and I'm sorry for the slow follow-up. Still want help with a move? [Agent Phone]. Reply STOP to opt out.

### 6. Quiet Nurture

**Email**
Subject: Still Want Updates From Me?

Hi [First Name],

It's been a while since we were in touch. When you're ready to think about a move, I can send a short list of recent sales near you so you have a feel for the market. Want me to?

If you'd rather not hear from me, reply "not interested" and I'll stop.

[Agent Name]
[Team or Brokerage Name]

To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

**Text (SMS Opt-In = Y only):** Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Want a short list of recent sales near you? Happy to send one. Reply STOP to opt out.

## Check Before Sending

- **Counts and filters:** segment sizes 46, 55, 67, 134, 239 and 205; textable 13, 19, 16, 28, 55 and 53; day limits 30, 60, 180 and 12 months; status values Past Client, SOI, New, Warm, Hot, Appointment Booked, Active Buyer, Active Seller, In Escrow, Long-Term Nurture, Closed Lost, Do Not Contact; label Closed Client in all three spellings. Build each list in your CRM and check its count is close to the size here before sending; if it's far off, the filter needs a fix.
- **Placeholders:** [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Agent Phone], [Unsubscribe Link], [Sender Postal Address]. Every one filled before anything goes out.
- **Text consent:** each contact on a text list has an SMS Opt-In record that names your team or brokerage and the phone number. The Y in the export points to the record; the record is the proof.
- **Texts one at a time:** each text is a starting point the owner makes their own and sends to one person at a time. For a large list, call or email first.
- **Do Not Call:** scrub every call and text list against the National Do Not Call Registry and your internal do-not-call list. Your export has no Do Not Call column.
- **Quiet hours:** calls and texts between 8 a.m. and 8 p.m. in the contact's time zone.
- **Email:** the unsubscribe link works, and the postal address is real.
- **State rules:** where your team and contacts are, confirm with your broker or an attorney.
- **Fair housing:** read every message before it goes out.

cleanup_worklist.csv and health_report.md are attached. The worklist holds names, emails and phone numbers: share it only with the people doing the cleanup.
