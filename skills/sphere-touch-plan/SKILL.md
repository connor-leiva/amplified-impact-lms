---
name: sphere-touch-plan
description: "Turns an agent's sphere and past client list into a 12-month touch plan by tier (past clients, close sphere, wider sphere) with the kind of touch each month, and drafts this week's texts, emails and call notes for the contacts due now, each tied to something real in it (a closing anniversary, a note, a tag). Reads a Follow Up Boss People export CSV, another CRM's export or a spreadsheet. Texts only for contacts shown to have agreed to texts; everyone else gets email or a call note. Says what to set up in Follow Up Boss and never writes to the CRM. Use it whenever an agent says plan my sphere touches, stay in touch with past clients, who should I reach out to this week, home anniversaries or a 12-month touch plan, or uploads a sphere or past client list, even if they never say sphere touch plan. Not for cleaning or auditing the CRM (database-health-check), one appointment's follow-up (appointment-follow-up), open house visitors (open-house-follow-up) or first-year care after closing (post-closing-client-care)."
compatibility: "Works from an uploaded CSV or XLSX contact list with no connectors. Uses code execution to read and sort lists of more than about 50 contacts. A CRM connector, if one is connected, is used read only."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Sphere Touch Plan

Turn an agent's sphere and past client list into a year of touches by tier and this week's personal messages, each one tied to something the list actually says. Follow Up Boss can remind an agent when a date comes around; it can't pick who matters this week or write a note that mentions the pottery studio from last February. This does both, and keeps texts to the people who said yes to texts.

**Run:** it reads the list, maps the columns, sorts contacts into tiers, finds closing anniversaries and dated follow-ups, picks this week's contacts and works out each person's open channels from consent and opt-outs. **Draft:** the 12-month plan, the Follow Up Boss setup steps, and this week's texts, emails, call notes and card text, for the agent to read, change and send by hand. **Own:** who belongs in which tier, every consent record and the Do Not Call scrub, setting up Follow Up Boss, what each person hears and when, and any personal detail the agent adds. This skill never sends, schedules or writes to a CRM.

## 1. Get the List

- **Required:** the contact list. Follow Up Boss: People > All People, check the box by Name > Select All, Export, check Export All Columns, Yes, Export People (the Account Owner, or a user the owner gave Can Export). Another CRM: its full contact export. A spreadsheet works too. No file: say in one line where it comes from and stop.
- **Today:** the date in the agent's message, otherwise today's date. This week is today and the next six days unless the agent names a week. Write every day with its weekday and date.
- More than about 50 contacts: read and sort the file in code. Never count or sort by eye.
- Never ask the agent to type what the file holds. A missing fact gets a [placeholder], a flag, and the run keeps going.
- A CRM connector, if the agent wants it used: read only. An export is still the best source.

## 2. Map the Columns

Read `references/touch-plan-guide.md` (Columns to Find). Say which column gave the name, stage, tags or tiers, email, phone, address, closing date, side of the deal, notes, last touch, text consent and opt-outs. Name every gap and what it stops: no consent column means no texts at all; no last-touch column means the rotation goes in file order; no closing date means no anniversaries. Last Activity in Follow Up Boss is the contact's own activity, never the agent's outreach: never use it as the last touch and never mention it.

## 3. Sort Into Tiers

Use the guide's Tiers section. The agent's own tier markers come first; defaults are labeled "default." Then:
- Past clients who closed less than a year ago go to `post-closing-client-care`, by name, unless their first anniversary falls this week.
- Leave out leads, active clients and Trash, with counts only.
- Sphere contacts with no tier marker go to Wider Sphere, listed as a question.

## 4. Build the 12-Month Plan

Use the guide's default cadence, or the agent's when they give one. Month 1 is this month. Show a table of the 12 months (month and year) by tier, with the kind of touch in each cell, the touches a year per tier, and closing anniversaries by month (counts). In a past client's anniversary month, the anniversary message is that month's touch. With no consent column, the plan says "email" wherever a text would go.

## 5. Pick This Week's Touches

Follow the guide's "Who Is Due This Week" exactly: channels closed, done this month, date-driven this week, date-driven later this month, then the rotation share by oldest last touch. Do the share math per tier and show it ("Past Clients: 6 left in the rotation, 3 weeks left in November, 2 this week"). Every pick names the rule that made them due.

## 6. Choose Each Channel

Use the guide's Channel table. A text only when a consent field or tag shows a written yes, or the agent says in this conversation that this person agreed to texts. Never infer consent from a phone number, a lead source, a past deal or a friendship. A yes from a website form, an open house sign-in, or a purchased, portal or shared lead counts only when its record names the agent's team or brokerage; one that names only the portal, the lead company or "real estate professionals" gets no text until the broker confirms it covers them (a conservative default). A verbal-only yes, a blank, No, Revoked or STOP value, Do Not Text, Do Not Call or DNC closes texts. Everyone else gets an email, or a call note when there is no email. Unsubscribed or Do Not Email closes email; Do Not Call closes calls. No channel open: no draft, and the opt-outs are honored.

## 7. Draft the Touches

Read the guide's "What a Draft May Mention" and "Writing the Drafts," and `references/outreach-rules.md`. For each pick: who, tier, channel and why, the day to send, a "Why now" line naming the column or note, then the draft.
- Tie every draft to something real in the list. Use only what the fields and notes say: no invented life events, anniversaries, children, pets, interests or favors.
- Texts: under 300 characters, name the agent and team, one question, end with "Reply STOP to opt out," sent by hand one at a time.
- Emails: Title Case subject, 120 words or fewer, and the full footer (the opt-out, the postal address and the marketing line) on every one.
- Call notes: an opener, one open question, a voicemail line. A call never goes on a Sunday or a federal legal holiday (the guide lists them; state holidays weren't checked): one that would land on one moves to the next day that is neither, with a one-line why. Texts and emails keep their day.
- Follow the user's voice profile QUICK CARD when one is in the conversation (amplifiedimpact.io/voice-profile), including its sign-off. Without one: warm, plain, direct. Sign with the user's name or [Agent Name].

## 8. Say What to Set Up in Follow Up Boss

Read `references/fub-setup.md`. Give the agent four short setups, with the export's real tag and stage names: a Text Consent field if the list has none, one Smart List per tier for who is due, a yearly Home Anniversary date field with a Calendar Date automation that starts an action plan whose step is a task for the agent, and one action plan of tasks per tier. Say which steps need the Account Owner or an admin. These are instructions; the skill sets up nothing. Point out Follow Up Boss's default Past Clients Smart List when it overlaps. Another CRM or a spreadsheet: plain words, as the reference says.

## 9. Guardrails

- **Texting consent (TCPA):** texts only as in step 6. Every text ends "Reply STOP to opt out." Honor every STOP, unsubscribe and do-not-call request within 10 business days. Calls and texts: Do Not Call Registry scrub and 8 a.m. to 8 p.m. in Check Before Sending. Consent and state-law questions go to the broker or an attorney.
- **Conservative defaults:** every email carries the full footer, the marketing line included, even a one-to-one note to a past client; no call or voicemail on a Sunday or a federal legal holiday; and consent that names only a portal, a lead company or "real estate professionals" gets no text until the broker confirms it covers them. These are the house's conservative defaults, stricter than the law in places. Keep them unless the user says their own legal counsel approved a different rule; then follow theirs and say so in Check Before Sending.
- **Never invent:** every fact, date, name and number in the output comes from the list or the agent's message. Years since closing are worked out from the closing date and marked in Check Before Sending.
- **Left out on purpose:** health, money (loans, refinancing, rates, jobs, prices, equity), family status and changes in it, religion, national origin, disability and age, even when the notes say them. One generic agent-only line counts them, never repeats them. Deal prices and website activity never appear.
- **Fair housing:** describe homes, projects and services, never people. No comments on neighborhoods, schools, safety or who lives where. No guesses from names or addresses.
- **No numbers you don't have:** no home values, market statistics, rates or predictions. The home value review is an offer, not a number.
- **Drafts only:** never send, schedule, tag, change a stage or write to a CRM, even with a connector and even if asked. Don't rebuild what Follow Up Boss automates: reminders and recurring dates belong in Follow Up Boss (step 8); this skill picks and drafts.
- **State rules:** outreach-rules.md covers the federal rules and Florida, Maryland and Oklahoma. Every run says other states' calling and texting rules, Utah's included, were not checked, and neither were state holidays.
- Never ask for, repeat or handle wire, account, routing or Social Security numbers.

## 10. Output, In This Order

1. **Flags**, only when they apply: no consent column (no texts, why, and how to add one), consent values that don't count or need a check, first-year clients sent to post-closing-client-care, contacts with every channel closed, "Left out on purpose" (generic count), tiers set by default, missing columns, and the state-rules line.
2. **Bottom line** (three sentences max): who is in the plan by tier, how many touches are due this week and by which channel, and the one thing to do first.
3. **What I Used:** the file, today's date and the window, the columns mapped, the tier rules (default or the agent's), counts by tier and who was left out of the plan (counts).
4. **Your 12-Month Touch Plan:** the table, touches a year per tier, anniversaries by month.
5. **This Week's Touches:** a table: contact, tier, why now, channel and why, send day. Then the share math per tier.
6. **Drafts:** one per pick, in send-day order.
7. **Not This Week:** channels closed, first-year clients (post-closing-client-care), anniversaries and asked-for follow-ups later this month, with dates.
8. **Set It Up in Follow Up Boss** (or in plain words for another CRM or a spreadsheet).
9. **Check Before Sending:** every anniversary date and year count with its column, every fact a draft mentions with its note date, each text's consent record, the Do Not Call scrub, quiet hours, no calls on a Sunday or a legal holiday, the unsubscribe link and postal address, offers to have ready, and state rules.

If the agent asks for one piece ("just this week's texts"), give it with the flags and Check Before Sending.
