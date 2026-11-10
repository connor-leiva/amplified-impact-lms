# Open House Guide

Last verified: 2026-11-10. Tool facts (Curb Hero, Google Forms, file uploads) come from each vendor's help center, linked under Sources. Menus change; if a click path here doesn't match what the agent sees, trust the screen and say so.

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
| No email and not TEXT OK | NO DRAFT | Listed for the agent to decide. A call is the agent's call; check the Do Not Call list first |
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

To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]
```

No offer to help, represent, meet, call, tour other homes, send listings or set up a search. No question about their agent or their agreement. No marketing line, because it offers nothing; confirm that with the broker.

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
```

Under 200 words. No visitor names, contact details, financing or descriptions of people. When the agent hosted another agent's listing, a teammate's included, the same update is written to that listing agent ("Listing Agent Update") to pass on, never to the sellers.

## Email Footers

From `outreach-rules.md` (CAN-SPAM), treating each follow-up as a commercial email:
- Every visitor email ends with an opt-out ("To stop these emails, reply UNSUBSCRIBE.") and [Sender Postal Address].
- An email that offers the agent's services also says what it is: "This is a marketing email from [Agent Name], [Brokerage Name]." Leave that line off only when the agent confirms the visitor asked for these emails.
- The seller update goes to the agent's own clients about their listing, so it gets no footer.

## Sources (all checked 2026-11-10)

- Curb Hero Help Center, "Viewing, downloading and sharing lead data": https://intercom.help/block-party/en/articles/2849017-viewing-downloading-and-sharing-lead-data
- Curb Hero Help Center, "Getting started with the top rated digital open house sign in" (up to 3 added questions in Edit Listing): https://intercom.help/block-party/en/articles/2944795-getting-started-with-the-top-rated-digital-open-house-sign-in
- Google Docs Editors Help, "View and manage form responses" (Download responses (.csv)): https://support.google.com/docs/answer/139706
- Claude Help Center, "Uploading files to Claude" (CSV, XLSX, TXT, JPEG and PNG supported): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Text and email rules: `outreach-rules.md` (its own sources, checked 2026-11-08)
