# Open House Follow-Up Guide

Part 1 is the sign-in sheet, the sorting, the counts, the dates and the draft shapes. Part 2 is fair housing, privacy and visitors who have an agent.

# Part 1: Sheets, Sorting and Drafts

Last verified: 2026-11-10. Tool facts (Curb Hero, Google Forms) come from each vendor's help center, linked under Sources. Menus change; if a click path here doesn't match what the agent sees, trust the screen and say so.

## Where Sign-In Sheets Come From

Use this to read the columns and, when nothing was uploaded, to tell the agent in one line where to get the sheet.

| Source | Where the agent gets it | Watch for |
|---|---|---|
| Curb Hero (open house sign-in app) | In the app, open My Leads. Use the filter icon at the top right to pick the listing. Tap the share icon at the top right and send the leads to yourself; they arrive as a CSV attachment | Partial sign-ins show only when "Include Partial Leads" is on. Column names follow the questions on the agent's sign-in form |
| Another sign-in app (Open Home Pro, Spacio, a CRM's open house app) | The app's export or download option for that listing's sign-ins, as CSV or XLSX | Column names vary. Map them with the table below. If the app already sends sign-ins to the CRM, the export is still the easiest input |
| Google Form used as a sign-in sheet | Open the form in Google Forms, select Responses, select the More icon, then "Download responses (.csv)" | The first column is Timestamp. Each question's full wording becomes its column name, so a consent checkbox can arrive as a long sentence |
| Paper sign-in sheet | A clear photo of each page, flat, in good light, every row in frame | Handwriting. Never guess a letter in an email address or a digit in a phone number |
| A typed or pasted list | The agent types or pastes it into the chat | Usually no agent or consent columns. Treat anything not stated as unknown |
| The agent's notes | Typed, dictated, or a Voice Memos transcript, pasted or attached | The only source for what visitors said. Match each note to a visitor by name |

## Reading the Columns

| What it means | Column names seen |
|---|---|
| Name | Name, Full Name, First Name and Last Name, Visitor |
| Email | Email, Email Address, E-mail |
| Phone | Phone, Phone Number, Mobile, Cell |
| Has an agent | Working With An Agent?, Are you working with a real estate agent?, Do you have an agent?, Represented |
| Agent's name | Agent Name, If yes, who?, Agent, Agent Company |
| Timeframe | Timeframe, When are you planning to buy?, Moving In, Buying Timeline |
| Text consent | Consent To Text, SMS Opt-In, OK To Text, or the consent sentence itself ("I agree to receive text messages from...") |
| Opted out | Do Not Contact, No Follow-Up, Unsubscribe |
| When they signed in | Sign-In Time, Timestamp, Date, Created |

Say in Flags which column was read as the agent question and which as consent when the names aren't obvious. A sheet with no consent column has no text consent for anyone.

## Sorting Each Visitor

| On the sheet or in the notes | Status | What they get |
|---|---|---|
| "Yes," an agent named, or the notes say they have an agent (even "my cousin is an agent, nothing signed") | HAS AN AGENT | A thank-you only, by email (by text only when they consented and gave no email). Questions about the home are answered through their agent |
| "No," "Not yet," "Not working with one" | NO AGENT | A full follow-up |
| Blank, "Maybe," "Looking," anything unclear | AGENT STATUS UNKNOWN | A follow-up that offers help only "if you're not already working with an agent," with no request to meet |
| Consent box checked ("Yes," "X," "I agree," "TRUE") with a phone number | TEXT OK | A text as well as the email |
| The agent says in the chat or notes that this visitor agreed to texts, with a phone number | TEXT OK | A text as well as the email; Check before sending asks for the written record |
| Consent blank or "No," no consent column, or only a phone number | EMAIL ONLY | Email only. A phone number alone is never consent |
| Consent checked but no phone number | EMAIL ONLY | Email only; flag it |
| A do-not-contact box, or the notes say no follow-up | NO DRAFT | Listed in Flags; nothing drafted |
| No email and not TEXT OK | NO DRAFT | Listed for the agent to decide. A call is the agent's call: check the Do Not Call list first, and never on a Sunday or a legal holiday |
| The same email, phone or full name on two rows | One visitor | One set of drafts. Count rows and visitors separately |

## Counting for the Seller Update

- **Sign-ins:** the number of rows on the sheet.
- **Visitors:** sign-ins minus duplicates. Say how many duplicates there were.
- **Said they have an agent:** visitors marked HAS AN AGENT.
- **Timeframes:** a tally of the sheet's timeframe answers, one per visitor, with blanks counted as "not given."
- **The agent's own count:** if the notes say how many groups came through, give it too, labeled as the agent's count, next to the sheet's number. Never add, average or estimate.

## Dates and the Send Window

- The open house date comes from the sheet's timestamps, the file name, the notes or the agent's message; otherwise [Open House Date], flagged.
- Resolve every relative date in the notes ("Tuesday," "Monday," "next week") against the open house date and write the weekday and date. "Next week" said on a weekend is ambiguous: give the range or flag it.
- Check every weekday against the calendar before writing it.
- Written a day or more after the open house: the drafts say "on Sunday" or "at Sunday's open house," never "today." Any promise due "today," "tonight" or a day already past is flagged and becomes the first next step.
- Texts go between 8 AM and 8 PM in the visitor's local time (outreach-rules.md). When the open house ended late, say "send by 8 PM tonight or after 8 AM tomorrow" with tomorrow's weekday and date.
- Calls and voicemails: never on a Sunday or a legal holiday, even with consent (a conservative default in `outreach-rules.md`). A call the next steps would put on one moves to the next day that is neither, with a one-line why. Texts and emails keep their day.
- Which holidays: in Utah mode, the Utah legal holidays in `utah-open-house-notes.md`. In general mode, Sundays and the federal legal holidays (5 U.S.C. 6103): New Year's Day (January 1), the Birthday of Martin Luther King, Jr. (third Monday in January), Washington's Birthday (third Monday in February), Memorial Day (last Monday in May), Juneteenth (June 19), Independence Day (July 4), Labor Day (first Monday in September), Columbus Day (second Monday in October), Veterans Day (November 11), Thanksgiving Day (fourth Thursday in November) and Christmas Day (December 25). One that falls on a Saturday is observed the Friday before, and one on a Sunday the Monday after: skip that day too. Say that state holidays were not checked.
- The next federal ones: Wednesday, November 11, 2026; Thursday, November 26, 2026; Friday, December 25, 2026; Friday, January 1, 2027; Monday, January 18, 2027; Monday, February 15, 2027.

## Draft Shapes

### Visitor With No Agent (email)

```
Subject: Thanks For Coming To [Street Address]

Hi [First Name],

Thanks for stopping by the open house at [Street Address] on [weekday, date].
[One or two specifics from the notes: what they liked or asked, as noted.]
[What the agent promised, with its date: "I'll send the HOA details by Thursday, November 12."]

[An offer: questions, a second look, and help with their search.]

[Sign-off]
[Agent Name]

This is a marketing email from [Agent Name], [Brokerage Name]. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]
```

### Agent Status Unknown (email)

The same shape, but the offer is: "If you're not already working with an agent, I'd be glad to help." No request to meet, call or tour until they answer. When they asked for a second look at this home, offer it, with "If you're working with an agent, they can set it up with me."

### Has an Agent: Thank-You Only (email)

```
Subject: Thanks For Visiting [Street Address]

Hi [First Name],

Thanks for coming to the open house at [Street Address] on [weekday, date].
[Only if they asked something: "I'll get the answer on [topic] to [their agent's name], so you'll hear it from them." Only if they asked to see it again: "[Their agent's name] can book a second look with me anytime."]

[Sign-off]
[Agent Name]

This is a marketing email from [Agent Name], [Brokerage Name]. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]
```

No offer to help, represent, meet, call, tour other homes, send listings or set up a search. No question about their agent or their agreement. It still ends with the full footer, like every email here.

### Text (TEXT OK only)

```
Consent: [where it came from: "Consent To Text: Yes" on the sheet, or "you said so in your notes"]

Hi [First Name], it's [Agent Name] with [Brokerage Name]. Thanks for coming to [Street Address] on [day]. [One short line: the next step or what's coming by email.] [Agent Phone]. Reply STOP to opt out.
```

320 characters or fewer, the sender line and opt-out included.

### Seller Update (email)

```
Subject: [Weekday]'s Open House At [Street Address]: Recap

Hi [Seller First Names],

[The count: sign-ins and visitors from the sheet, how many said they have an agent, the timeframe tally, and the agent's own count of groups if noted.]

What visitors liked: [from the notes, as features].
What gave people pause: [from the notes, as features].
Questions to answer: [each question about the home, without who asked].

[What happens next, as the agent noted it.]

[Sign-off]
[Agent Name]

This is a marketing email from [Agent Name], [Brokerage Name]. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]
```

Under 200 words. No visitor names, contact details, financing or descriptions of people. When the agent hosted another agent's listing, a teammate's included, the same update is written to that listing agent ("Listing Agent Update") to pass on, never to the sellers.

## Email Footers

From `outreach-rules.md` (CAN-SPAM and its Conservative Defaults), every email the skill drafts ends with the full footer, with no exception:
- "This is a marketing email from [Agent Name], [Brokerage Name]. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]"
- That is the marketing line, the opt-out and the postal address on every visitor email, the thank-you to a visitor who has an agent included, even when the visitor asked for these emails.
- The seller update carries it too, though it goes to the agent's own clients, and so does a Listing Agent Update.
- This is a conservative default, stricter than the law in places. Keep it unless the agent says their own legal counsel approved a different rule; then follow theirs and say so in Check before sending.

## Sources (all checked 2026-11-10)

- Curb Hero Help Center, "Viewing, downloading and sharing lead data": https://intercom.help/block-party/en/articles/2849017-viewing-downloading-and-sharing-lead-data
- Curb Hero Help Center, "Getting started with the top rated digital open house sign in" (up to 3 added questions in Edit Listing): https://intercom.help/block-party/en/articles/2944795-getting-started-with-the-top-rated-digital-open-house-sign-in
- Google Docs Editors Help, "View and manage form responses" (Download responses (.csv)): https://support.google.com/docs/answer/139706
- 5 U.S.C. 6103, the federal legal public holidays: https://www.law.cornell.edu/uscode/text/5/6103
- Text and email rules: `outreach-rules.md` (its own sources, checked 2026-11-08)

# Part 2: Fair Housing, Privacy and Represented Visitors

Last verified: 2026-11-10. Sources at the end. This is not legal advice; fair housing and ethics questions go to the broker.

Open house follow-ups and the seller update are the agent's own written statements. Keep them to the property, the visit and next steps. Never describe the visitors, and never write who the home suits.

## Protected Classes

- **Federal (Fair Housing Act, 42 U.S.C. 3604):** race, color, religion, sex, handicap (disability), familial status and national origin. Section 3604(c) makes it unlawful to make, print or publish any notice, statement or advertisement about the sale or rental of a dwelling that indicates a preference, limitation or discrimination based on these.
- **Utah (Utah Fair Housing Act, Utah Code 57-21-5):** race, color, religion, sex, national origin, familial status, source of income, disability, sexual orientation and gender identity. Subsection (2) covers spoken or written statements and advertisements that express a preference, openly or implicitly.
- **Other states and cities** add their own classes. In general mode, treat any remark about a person's characteristics as off limits.

## What to Do With the Notes

| The notes say | What goes in the drafts and the update |
|---|---|
| A description of a visitor ("young couple," "older couple," "nice family," "retired," a language, an accent, a religion, a pregnancy, kids) | Nothing. Use the visitor's name in their own draft and "a visitor" in the update |
| Who the home suits ("perfect for a young family," "great for retirees," "ideal starter home for a couple") | Nothing. Describe the home's features instead, only as the notes or the listing state them |
| A visitor's remark about who lives in the area, or who is moving in | Nothing: not the remark, not a paraphrase, not the area as a concern. One generic agent-only flag: "A remark about who lives in the area was left out on purpose (fair housing)." |
| A question about who lives nearby ("Are there a lot of families around here?") | No answer in any draft. Same generic flag |
| "Are the schools good?" | No opinion and no ranking. Point to the school district's boundary lookup and the state's school report card, as [links] |
| "Is it safe?" | No opinion. Point to the local police department's published crime data, as a [link] |
| A need tied to health or disability ("worried about the stairs with her knee") | The feature only: "asked about the stairs to the main bedroom." Never the condition |
| What a visitor liked or disliked about the home | Yes, as noted, as features ("liked the kitchen island," "said the second bedroom felt small") |
| A visitor's comment on the price | In the update as feedback only ("one visitor said the price felt high for the size"). Never a recommendation |
| The agent's own price opinion ("we should drop 10k") | Not in the update. Flag it: price conversations are the agent's |

## Privacy

- The seller update never names a visitor, gives contact details, or says anything about a visitor's financing, budget, job or family.
- No draft or update mentions preapproval, budget, down payment, income or credit, even if the sheet asked.
- The output names visitors only in their own drafts and in the agent-only visitor list. It repeats no email addresses or phone numbers, except to flag a missing or unreadable one.
- Never ask for, repeat or handle wire, account, routing or Social Security numbers.

## Visitors Who Have an Agent

The NAR Code of Ethics (effective January 1, 2026) binds REALTORS; many brokerages hold every agent to it.
- **Article 16:** REALTORS shall not take any action inconsistent with exclusive representation or exclusive brokerage relationship agreements that other REALTORS have with clients.
- **Standard of Practice 16-5:** REALTORS shall not solicit buyer agreements from buyers who are subject to exclusive buyer agreements (a future agreement may be discussed only in the narrow case the standard describes).
- **Standard of Practice 16-9:** before entering into a representation agreement, REALTORS must make reasonable efforts to find out whether the prospect is subject to a current, valid exclusive agreement for the same kind of service.
- **Standard of Practice 16-13:** dealings with buyers who are subject to exclusive agreements are carried on with their representative, not the buyer, unless the representative consents or the buyer starts the dealings. Before providing substantive services, REALTORS ask prospects whether they are party to an exclusive representation agreement.

What the skill does with that:
- A visitor who says they have an agent gets a thank-you only: no offer to help, represent, meet, call, show other homes, send listings or set up a search, and no question about their agreement. The skill doesn't judge whether the agreement is exclusive or signed; the visitor's answer is enough.
- A represented visitor's question about the home is answered through their agent when the sheet names one. The thank-you says so, and Next Steps lists it.
- A visitor whose agent status is unknown gets help offered only "if you're not already working with an agent," and no request to meet.
- An agent who hosted another agent's listing, a teammate's included, writes the update to the listing agent, never to the sellers, who are that agent's clients.
- Utah adds a license rule for represented buyers: see `utah-open-house-notes.md`.

## Sources (all checked 2026-11-10)

- 42 U.S.C. 3604, Fair Housing Act: https://www.law.cornell.edu/uscode/text/42/3604
- Utah Code 57-21-5, discriminatory practices (current version effective May 6, 2026): https://le.utah.gov/xcode/Title57/Chapter21/57-21-S5.html
- NAR Code of Ethics, Article 16 and its Standards of Practice (effective January 1, 2026): https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/the-code-of-ethics-article-16
