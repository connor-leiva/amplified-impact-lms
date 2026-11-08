**Bottom line:** Your CRM export holds 1,200 contacts as of 2026-11-08, checked against your team's own rules (60-day follow-up, 45-day Shared Pool, past client means Past Client status or the Closed Client label). The three biggest problems are 261 leads added 30+ days ago that nobody has contacted, 194 contacts with status problems (71 have no status at all), and 171 live contacts with a missing or invalid phone. Merge duplicates first: 76 records (6.3%) sit in 38 merge groups, and a merge keeps one record's status and owner, so fixing statuses before merging would be wasted work.

## What I Used

- **File:** brightwater-crm-contacts.csv, 1,200 records. It isn't a Follow Up Boss export, so columns were mapped by name. The two title lines above the header were skipped.
- **Columns:** Lead Status as the stage, Owner as the agent, Last Contacted as the last communication, Last Website Visit as lead activity, Created Date, Labels as tags, Primary and Secondary Email, Mobile and Home Phone, SMS Opt-In as text consent, Email Opt-Out, and Contact ID as the record ID.
- **Your rules, from the CRM rules document (updated 09/15/2026):** stale after 60 days for New, Warm, Hot, Appointment Booked, Active Buyer, Active Seller and In Escrow; New or Warm leads with no contact for 45 days are Shared Pool candidates; past clients are Past Client status or the Closed Client label; SOI is sphere; past clients and SOI get a touch once a year (365 days). Closed Lost and Do Not Contact are left out of everything.
- **Defaults, because your document doesn't set them:** never contacted if added 30+ days ago, New status flagged 60+ days after being added, quiet nurture after 180 days.
- **Gaps:** none that stopped a check. Notes Count was not used.

## Health Report

**Contacts by status**

| Status | Read as | Contacts | % |
|---|---|---|---|
| Long-Term Nurture | Nurture | 279 | 23.2% |
| New | New lead | 192 | 16.0% |
| SOI | Sphere | 163 | 13.6% |
| Warm | Active lead | 134 | 11.2% |
| Past Client | Past client | 101 | 8.4% |
| (blank) | No status | 71 | 5.9% |
| Closed Lost | Inactive | 58 | 4.8% |
| Active Buyer | Active client | 37 | 3.1% |
| Hot | Active lead | 37 | 3.1% |
| Investor | Not in your rules | 30 | 2.5% |
| In Escrow | Active client | 28 | 2.3% |
| Appointment Booked | Active lead | 27 | 2.2% |
| Active Seller | Active client | 22 | 1.8% |
| Do Not Contact | Inactive | 21 | 1.8% |

**Contacts by source (top 10)**

| Source | Contacts | % |
|---|---|---|
| Website | 222 | 18.5% |
| Zillow | 177 | 14.8% |
| Import | 160 | 13.3% |
| SOI | 132 | 11.0% |
| Referral | 128 | 10.7% |
| Open House | 113 | 9.4% |
| Facebook Ads | 110 | 9.2% |
| (blank) | 62 | 5.2% |
| Realtor.com | 52 | 4.3% |
| Sign Call | 44 | 3.7% |

**By owner**

| Owner | Contacts | % | Active status, no touch 60+ days | Never contacted | Past client or SOI, no touch 12+ months |
|---|---|---|---|---|---|
| Pell Mossgrove | 279 | 23.2% | 69 | 60 | 24 |
| Sunny Larkfield | 272 | 22.7% | 63 | 54 | 27 |
| Booker Quillfeather | 221 | 18.4% | 49 | 40 | 23 |
| Marigold Tumbletoes | 198 | 16.5% | 49 | 50 | 18 |
| Fennick Oddsworth | 178 | 14.8% | 39 | 40 | 21 |
| (no owner) | 50 | 4.2% | 14 | 17 | 8 |
| (Shared Pool, no owner) | 2 | 0.2% | 0 | 0 | 1 |

**Contact info**

| Check | Contacts | % |
|---|---|---|
| No email | 77 | 6.4% |
| Email invalid or a placeholder | 10 | 0.8% |
| Email Opt-Out = Yes | 35 | 2.9% |
| No phone | 159 | 13.2% |
| Phone not a valid 10-digit US number | 18 | 1.5% |
| SMS Opt-In = N | 35 | 2.9% |
| No valid email and no valid phone | 12 | 1.0% |

Format checks only: a well-formed email or phone can still be dead.

**Likely duplicates:** 38 merge groups (76 records) share an email or phone under the same or a near-identical name; merging them all would remove 38 records. Another 10 groups (21 records) share an email or phone under a different first name with the same last name: two people can share a number, so a person decides. 7 groups (14 records) share only a name and are listed for review.

**Active statuses with no communication in 60+ days (your standard):** 283 of 477 active-status contacts (59.3%): 133 gone quiet and 150 with no communication on record.

| Status | Contacts |
|---|---|
| New | 118 |
| Warm | 83 |
| Active Buyer | 22 |
| In Escrow | 19 |
| Hot | 19 |
| Appointment Booked | 13 |
| Active Seller | 9 |

By owner: Pell Mossgrove 69, Sunny Larkfield 63, Marigold Tumbletoes 49, Booker Quillfeather 49, Fennick Oddsworth 39, no owner 14.

**Never contacted (added 30+ days ago, no communication on record):** 261. Top sources: Import 45, Zillow 40, Website 31, Open House 30, Facebook Ads 27.

**Past clients and SOI**

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 110 | 55 | 14 |
| SOI | 163 | 67 | 8 |

Past clients: 101 by Past Client status, 9 more by the Closed Client label only.

**Status problems**

| Check | Contacts |
|---|---|
| No status | 71 |
| Status not in your rules (Investor) | 30 |
| Contacted, but still New 60+ days after being added | 114 |
| Closed Client label but status New, Long-Term Nurture or blank | 9 |

189 contacts are still New 60+ days after being added; the 114 above were talked to and never moved, and the rest are counted under never contacted.

**Shared Pool and unassigned:** 62 contacts carry the Shared Pool label, and all but 2 still have an owner (Sunny Larkfield 19, Pell Mossgrove 13, Booker Quillfeather 11, Marigold Tumbletoes 9, Fennick Oddsworth 8). Under your 45-day rule, 213 New or Warm leads qualify for the Shared Pool now. 46 contacts have no owner and no pool label.

**Near-duplicate labels:** First-Time Buyer (58), first time buyer (58), First Time Buyer (42); Closed Client (56), closed client (29), Closed Clients (25); Move Up Seller (53), Move-Up Seller (38).

**Text consent:** SMS Opt-In shows Y for 323 contacts and N for 35; 842 are blank. 318 are textable (Y, valid phone, not opted out).

## Cleanup Worklist

**File:** cleanup_worklist.csv, 645 rows, one per record that needs work, with the Contact ID so your VA can search each one. It's the only file with names, emails and phone numbers.

| Action | Rows |
|---|---|
| Pond Candidate | 178 |
| Agent Follow-Up Or Pond Decision | 86 |
| Merge Candidate | 76 |
| Fill Missing Phone | 68 |
| Set Stage | 66 |
| Review New-Lead Stage | 46 |
| Assign Agent | 36 |
| Fill Missing Email | 35 |
| Review Shared Contact Info | 21 |
| Fix Invalid Phone | 11 |
| Fix Stage | 8 |
| Fix Invalid Email | 7 |
| Review Possible Duplicate (Name Only) | 6 |
| Fill Missing Contact Info | 1 |
| Archive Candidate | 1 |

How your VA works the top three:
1. **Merge Candidate (76 rows) first.** Sort by Duplicate Group; the row marked Suggested Main Record has the most recent contact. Check how your CRM merges (which record's status and owner survive) before the first one. Leave Review Shared Contact Info rows for a person.
2. **Pond Candidate (178 rows).** These are New or Warm leads with no contact in 45+ days. Move them to the Shared Pool under your rule, after the merges.
3. **Agent Follow-Up Or Pond Decision (86 rows).** Active statuses past your 60-day standard that the pool rule doesn't cover (Hot, Appointment Booked, Active Buyer, Active Seller, In Escrow). Hand each owner their rows.

## Re-Engagement Segments

Your CRM isn't Follow Up Boss, so these are written as plain filters; build them with your CRM's filters. A contact can match two; work them in this order.

**1. Back On The Site (46).** Filter: Last Website Visit in the last 30 days; Last Contacted more than 30 days ago or empty; status not Closed Lost or Do Not Contact. Emailable 41, callable 38, textable 13. Booker Quillfeather 12, Sunny Larkfield 9, Marigold Tumbletoes 9. It includes SOI 11 and Past Client 5. Next move: owner calls today.

**2. Past Clients, No Touch In 12+ Months (55).** Filter: status Past Client or label Closed Client (any spelling); Last Contacted more than 12 months ago or empty. Emailable 50, callable 52, textable 19. Sunny Larkfield 14, Fennick Oddsworth 12, Booker Quillfeather 10. Your rule says once a year; these are past due. Next move: call list by owner, then a personal email.

**3. SOI, No Touch In 12+ Months (67).** Filter: status SOI; Last Contacted more than 12 months ago or empty. Emailable 64, callable 60, textable 16. Pell Mossgrove 15, Sunny Larkfield 13, Booker Quillfeather 13. Next move: an email from each owner, calls to anyone who replies.

**4. Stalled Pipeline, No Touch In 60+ Days (134).** Filter: status Warm, New, Hot, Appointment Booked, Active Buyer, Active Seller or In Escrow; Last Contacted more than 60 days ago. Emailable 122, callable 115, textable 28. Pell Mossgrove 38, Sunny Larkfield 34, Booker Quillfeather 23. It includes In Escrow 10 and Active Buyer 12: check those first, since either the status is out of date or the conversation is happening outside the CRM. Next move: owner calls this week; New and Warm ones still silent follow your Shared Pool rule.

**5. Never-Worked Leads (239).** Filter: Last Contacted empty; Created Date more than 30 days ago; status not Closed Lost, Do Not Contact, Past Client or SOI. Emailable 218, callable 186, textable 55. Pell Mossgrove 54, Sunny Larkfield 52, Marigold Tumbletoes 47. Top sources: Import 40, Zillow 37, Website 28. Next move: call list; the New and Warm ones are Shared Pool candidates under your rule.

**6. Quiet Nurture, No Touch In 180+ Days (205).** Filter: status Long-Term Nurture; Last Contacted more than 180 days ago or empty. Emailable 187, callable 166, textable 53. Sunny Larkfield 59, Pell Mossgrove 46, Marigold Tumbletoes 33. Next move: one re-engagement email; replies go to the owner.

Every email list: Email Opt-Out is not Yes, and the email is valid. Every text list: SMS Opt-In starts with Y, and the phone is valid. Never send texts to a list without the SMS Opt-In filter.

## Questions for the Team

1. **What status should the 71 contacts with none get?** They're Set Stage rows on the worklist.
2. **What is Investor?** 30 contacts carry it and your rules don't define it. I treated it as unknown and left it out of the pipeline checks.
3. **Does the Shared Pool label mean the lead has left its owner?** 62 contacts carry it and all but 2 still have an owner.
4. **Move 213 pool candidates at once, or in batches?** That's how many New and Warm leads pass your 45-day rule today.
5. **Should the 9 Closed Client contacts in New, Long-Term Nurture or no status move to Past Client?** Your rules say to use both.
6. **Who owns the 46 contacts with no owner and no pool label?**
7. **Which label spelling stays** for First-Time Buyer, Closed Client and Move-Up Seller?
8. **What does a Y in SMS Opt-In stand for?** Texts below assume it marks a signed, written consent that names Brightwater Collective and the phone number.

## Nurture Drafts

For each owner to send in their own voice.

**1. Back On The Site**

Call opener: "Hi [First Name], it's [Agent Name] with [Team or Brokerage Name]. It's been a little while since we talked, and I wanted to see whether a move is on your mind this year. What would help most right now?"

Email
Subject: Still Thinking About A Move?
> Hi [First Name],
>
> It's been a while since we last talked, so I wanted to check in. If a move is on your mind, I'm glad to help however is useful: recent sales near you, what's coming on the market, or answers to a few questions.
>
> Would a quick call this week help?
>
> [Agent Name]
>
> To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Checking in: is a move on your mind this year? Happy to help. Reply STOP to opt out."

**2. Past Clients**

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

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. It's been too long! How's the house treating you? Reply STOP to opt out."

**3. SOI**

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

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Just saying hello, it's been too long! How have you been? Reply STOP to opt out."

**4. Stalled Pipeline**

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

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Are your moving plans still on, or has the timing changed? Either is fine. Reply STOP to opt out."

**5. Never-Worked Leads**

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

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Sorry for the slow follow-up on your home search. Still looking? Reply STOP to opt out."

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

Text (SMS Opt-In = Y only): "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]. Still thinking about a move? I'm glad to help whenever you're ready. Reply STOP to opt out."

## Check Before Sending

- **Segment sizes and filter values** against your CRM before sending: Back On The Site 46 (website visit in 30 days, no contact in 30), Past Clients 55 and SOI 67 (12+ months), Stalled Pipeline 134 (60+ days), Never-Worked Leads 239 (added 30+ days ago, never contacted), Quiet Nurture 205 (180+ days).
- **Your rule numbers** as I read them from the rules document: 60 days, 45 days for New and Warm, once a year for past clients and SOI.
- **Text consent:** every contact on a text list has a consent record that names Brightwater Collective (or your brokerage) and the phone number. SMS Opt-In = Y points to it; the record is the proof.
- **Do Not Call:** scrub every call list and text list against the National Do Not Call Registry and your internal list first.
- **Quiet hours:** calls and texts between 8 a.m. and 8 p.m. in the recipient's time zone.
- **Emails:** a working unsubscribe link and your real postal address in place of [Sender Postal Address]; Email Opt-Out = Yes excluded.
- **Placeholders:** [First Name], [Agent Name], [Agent First and Last Name], [Team or Brokerage Name], [Brokerage Name], [Unsubscribe Link], [Sender Postal Address].
- **State rules** for texting and calling where you and your contacts are: confirm with your broker or an attorney.
- **Worklist:** 645 rows with names and phone numbers; share it only with your VA. Nothing in your CRM was changed.

Files: cleanup_worklist.csv and health_report.md.
