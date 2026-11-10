# Touch Plan Guide

The house rules for sorting a sphere into tiers, laying out a year of touches, picking this week's contacts and writing their drafts. The tiers, the cadence and the weekly share are Amplified Impact defaults, not law: the agent's own tiers and cadence always win. The texting, calling and email rules come from `outreach-rules.md`, which every draft follows.

Last verified: 2026-11-10 (house defaults; the legal facts and their sources are in `outreach-rules.md`, the Follow Up Boss facts in `fub-setup.md`).

## Columns to Find

Map columns by name, case and punctuation ignored. These are the names to look for, not a claim about any one vendor's export.

| What | Header names |
|---|---|
| Name | Name, Full Name, Contact Name, or First Name plus Last Name |
| Stage | Stage, Status, Lead Status, Contact Type, Type |
| Tags and tiers | Tags, Labels, Groups, Lists, Rating, Tier, Category, Relationship, Sphere, A/B/C |
| Email | Email, Email Address, Email 1 to 6 |
| Phone | Phone, Mobile, Cell, Phone 1 to 6 |
| Mailing address | Address, Mailing Address, Address 1 - Street, City, State, Zip |
| Closing date | Home Anniversary, Closing Date, Close Date, Closed, Purchase Date, Anniversary; Deal Close Date when Deal Stage is Closed or blank |
| Side of the deal | tags or fields that say Buyer or Seller, Deal Type, Side |
| Notes | Notes, Background, Description, Comments |
| Last touch | Last Communication, Last Contacted, Last Contact Date, Last Touch, Date Last Contacted |
| Text consent | any column naming text or SMS with consent, opt in or OK; tags such as Text OK or SMS Opt In |
| Opt-outs | tags or fields: Do Not Text, Do Not Call, DNC, Do Not Email, Do Not Contact, Unsubscribed, Email Opt Out, STOP, Revoked |

- **Last Activity is not a touch.** In Follow Up Boss it is the contact's own activity (website visits, inquiries), not the agent's outreach. Never use it as the last touch and never mention it in a draft.
- **Two closing dates:** prefer a dedicated anniversary or closing date field; use Deal Close Date otherwise. When two dates disagree for one person, use neither in a draft and flag it.
- **Dates:** read ISO (2023-11-14) and US (11/14/2023) dates. A date that could be read two ways is flagged, never guessed.
- **Ignored on purpose:** deal, sale and list prices; birthdays and ages; credit, income, loan, rate, equity, account and Social Security numbers; marital status, children, gender, race, religion, national origin, disability or veteran status; relationship columns.

## Tiers

Use the agent's own tier markers first (tags or a field such as A, B, C, Sphere A, Sphere B, Inner Circle, VIP, Top 50), with the agent's names for them. Without markers, these defaults, each labeled "default" in the output:

| Tier | Who is in it (default) |
|---|---|
| Past Clients | Stage Past Client or Closed, a Past Client tag, or a closing date with Deal Stage Closed |
| Close Sphere | Tagged as close: Sphere A, A, Inner Circle, Close Friend, VIP, Top 50 |
| Wider Sphere | Everyone else in a sphere stage or tag (Sphere, Sphere B, B, C, Friend, Neighbor, Coworker), plus sphere contacts with no tier marker |

- Someone who fits two tiers goes in the one with more touches (a past client tagged Sphere A is a past client).
- Sphere contacts with no tier marker go to Wider Sphere and are listed as a question: "Which of these are close?"
- **First-year past clients:** a client whose closing date is less than one year before today goes to `post-closing-client-care`, by name, unless their first anniversary falls in this week's window. A past client joins this plan on their first home anniversary.
- **Not in the plan:** leads (Lead, Nurture, Attempted Contact, Spoke with Customer), active clients (Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract, or an open deal), and Trash or Rejected. Give their counts, never their names.

## The 12-Month Cadence (Default)

Month 1 is the month of today's date. Each cell is the kind of touch that tier gets that month. A dash means no planned touch.

| Plan month | Past Clients | Close Sphere | Wider Sphere |
|---|---|---|---|
| 1 | Personal check-in | Personal check-in | Personal check-in |
| 2 | Handwritten note | - | - |
| 3 | Call | Call | - |
| 4 | Home value review offer | - | Home value review offer |
| 5 | Personal check-in | Handwritten note | - |
| 6 | Call | - | - |
| 7 | Handwritten note | Personal check-in | Personal check-in |
| 8 | Personal check-in | - | - |
| 9 | Call | Call | - |
| 10 | Home value review offer | - | Handwritten note |
| 11 | Personal check-in | Personal check-in | - |
| 12 | Call | - | - |

- Touches a year: Past Clients 12 (four calls), Close Sphere 6 (two calls), Wider Sphere 4.
- **Anniversaries:** in the month of a past client's closing anniversary, the anniversary message is that month's touch, on or near the date.
- **Personal check-in:** a text where consent is on file, otherwise an email. With no consent column at all, write "Email" in the plan, never "text or email".
- **Home value review offer:** an email offering a review of what their home might sell for. No numbers, values or predictions.
- **Handwritten note:** a card the agent writes by hand, from two or three sentences given to start from.
- Under the table, list closing anniversaries by month (counts only), for past clients in the plan and first-year clients whose first anniversary falls in the next 12 months.

## Who Is Due This Week

The window is today and the next six days, written with weekdays and dates, unless the agent names a week. Work it out in this order, per tier:

1. **Out:** anyone with every channel closed (see Channel). They are listed, never drafted.
2. **Done this month:** a last touch dated this month, before today. They are not due again until next month's touch.
3. **Date-driven, due this week:**
   - a closing anniversary (month and day of the closing date) inside the window;
   - a note or field that asks for a follow-up on a date inside the window, in a week that overlaps it, or in this month ("follow up in November");
   - a note that asks for a follow-up after a date that has passed, with no touch since the note.
4. **Date-driven later this month:** an anniversary or asked-for follow-up later this month. That date is their touch; skip them in the rotation.
5. **Rotation:** only in a month where the tier has a planned touch. The pool is everyone left in the tier. This week's share is the pool divided by the weeks left in the month, counting this week (days left including today, divided by 7, rounded up), rounded up. Fill the share with the oldest last touch first; a blank last touch counts as oldest; ties go in file order. With no last-touch column at all, use file order and say so.

Date-driven contacts are due whatever the share. Say for every pick which rule made them due.

## Channel for Each Contact

Decide each channel from the export and the agent's message, never from a phone number being there.

| Channel | Open when | Closed when |
|---|---|---|
| Text | A consent field or tag shows yes with a written record (a signed form, an e-signature, a written reply), or the agent says in the conversation that this person agreed to texts | No consent field; a blank, No, Revoked or STOP value; a verbal-only yes; Do Not Text, Do Not Call, DNC or Do Not Contact; no phone |
| Email | An email address | Unsubscribed, Do Not Email, Email Opt Out or Do Not Contact; no email |
| Call | A phone number | Do Not Call, DNC or Do Not Contact; no phone |

- A Do Not Call request covers texts too: the FCC treats a text as a call.
- A yes recorded from a website form or an open house sign-in counts only if that form or sheet had text consent wording that names the agent's team or brokerage. Draft the text and put that check first in Check Before Sending.
- A yes from a purchased, portal or shared lead (a portal, a lead company, a referral network) counts only when the consent record names the agent's team or brokerage. If it names only the portal, the lead company or "real estate professionals," no text until the broker confirms it covers them (a conservative default in `outreach-rules.md`): draft an email, or a call note when there is no email, and flag it. If the export doesn't show what it names, draft the text and put that check first in Check Before Sending.
- A yes the agent gives in chat: draft the text and say to keep the written record (the reply, the form) with its date.

**Which draft:** the month's touch kind decides it, then the open channels.

| This month's touch | Draft |
|---|---|
| Anniversary, dated follow-up, personal check-in, home value review | A text if Text is open; otherwise an email; otherwise a call note |
| Call | A call note if Call is open; otherwise a text or an email as above |
| Handwritten note | Card text if there is a mailing address; otherwise as a personal check-in |

No channel open: no draft. List them under Not This Week with the reason. Never suggest a way around an opt-out.

## What a Draft May Mention

Every draft is tied to at least one real thing in the export, named in its "Why now" line: a closing anniversary, a dated note, an interest or project in the notes, a pet named in the notes, a tag, the street of their home, or the last touch date.

- **May use:** the anniversary and the years since (worked out from the date), the street from the address or the notes, a project, hobby, trip, pet, business or request the notes name, and a favor the notes say the agent did.
- **Home anniversary or closing anniversary:** say "home anniversary" only when the export shows they bought (a Buyer tag, a buyer-side deal, or a field named for the home). For a sale, name the closing ("Two years ago this week we closed on Teacup Way"). When the side is unclear, "it's been three years since we closed."
- **Never use, even when the notes say it:** health or medical details; money (loans, refinancing, rates, payments, income, jobs, layoffs, debts, equity, prices); family status and changes in it (marriage, engagement, divorce, pregnancy, children, a parent moving in, a death); religion, national origin, disability, age or retirement; anything a contact told the agent in confidence. Leave the whole note out. Add one agent-only line, "Left out on purpose: N notes with health, money or family details. Read them yourself before you reach out," without repeating any of them.
- **Never invent:** no life events, anniversaries, children, pets, interests, trips, ages or favors that the export doesn't state. Never join two facts into one the note doesn't make ("grows dahlias; won a ribbon" is not "your ribbon-winning dahlias"). No market numbers, home values, rates, prices or predictions. No promise of a result.
- Never mention website visits, emails opened, saved searches or anything tracking shows.
- Never comment on a neighborhood, its schools, its safety or who lives there.
- An offer of help (a contractor name, a painter name) is fine when the notes or the month's touch call for it; put "have the names ready" in Check Before Sending.

## Writing the Drafts

Follow the user's voice profile QUICK CARD when one is in the conversation, including its sign-off and the words it bans. Without one: warm, plain, direct. Sign with the user's name or [Agent Name]. Call people by first name. No "stunning," "dream home," "don't hesitate to reach out," "touch base," "circle back," "just checking in" or "I hope this email finds you well."

- **Text:** 300 characters or fewer, one question, no links unless the agent gives one. Start "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]." End with "Reply STOP to opt out." Each one is for the agent to send by hand, one at a time, from their own number. Never a mass text.
- **Email:** a Title Case subject that says what the email is (never "RE:" or "FWD:"); 120 words or fewer; short paragraphs; one easy question. After the sign-off, on every email, a one-to-one note to a past client included, this footer, from `outreach-rules.md`: "To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name]."
- **Call note:** the agent's name and team in the first sentence, the "why now" in the second, one open question, and a one-line voicemail with [Agent Phone]. Nothing that pressures or misleads.
- **No calls on Sundays or legal holidays** (a conservative default in `outreach-rules.md`): a call note's send day is never a Sunday or a federal legal holiday. One that would land on one moves to the next day that is neither, with a one-line why. When the send day is "this week," name the days to skip. Texts and emails keep their day.
- **Federal legal holidays** (5 U.S.C. 6103, checked 2026-11-10): New Year's Day (January 1), the Birthday of Martin Luther King, Jr. (third Monday in January), Washington's Birthday (third Monday in February), Memorial Day (last Monday in May), Juneteenth (June 19), Independence Day (July 4), Labor Day (first Monday in September), Columbus Day (second Monday in October), Veterans Day (November 11), Thanksgiving Day (fourth Thursday in November) and Christmas Day (December 25). One that falls on a Saturday is observed the Friday before, and one on a Sunday the Monday after: skip that day too. State holidays, Utah's included, were not checked; say so.
- **The next ones:** Wednesday, November 11, 2026; Thursday, November 26, 2026; Friday, December 25, 2026; Friday, January 1, 2027; Monday, January 18, 2027; Monday, February 15, 2027; Monday, May 31, 2027; Friday, June 18, and Saturday, June 19, 2027; Monday, July 5, 2027 (July 4 is a Sunday); Monday, September 6, 2027; Monday, October 11, 2027; Thursday, November 11, 2027.
- **Card text:** two or three sentences in the agent's hand, tied to the "why now." No footer needed for mail.
- Each draft gets: who it goes to, the tier, the channel and why (for example "Email: Text Consent says Revoked"), the day to send it (the anniversary day, or the first day of the window), and the "Why now" line with the column or note it came from.

## Check Before Sending (Items Every Run Lists)

- Each anniversary date and the years worked out, with the column it came from.
- Each fact a draft mentions, with the note's date or the column.
- Texts: the written consent record for each person texted (it names the agent or team and the phone number), including any yes the agent gave in chat and any open house or website form yes; texts go out one at a time by hand.
- Calls and texts: scrub the numbers against the National Do Not Call Registry and the agent's internal do-not-call list, unless the broker confirms an exception applies (a past client within 18 months of closing is one example in `outreach-rules.md`). Follow Up Boss has no built-in scrub.
- Quiet hours: texts and calls between 8 a.m. and 8 p.m. in the recipient's time zone. No calls on a Sunday or a legal holiday; texts and emails keep their day, weekends included.
- Emails: the unsubscribe link works and the postal address is real.
- Opt-outs: honor every STOP, unsubscribe and do-not-call request within 10 business days and mark it in the CRM.
- State rules: federal rules and three states are in `outreach-rules.md`; other states' calling and texting rules, Utah's included, were not checked, and neither were state holidays. Confirm with your broker.
