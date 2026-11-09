# Follow-Up Guide

Last verified: 2026-11-08. Tool facts below (Granola, Zoom, Apple, Follow Up Boss) come from each vendor's help center, linked under Sources. Menus change; if a click path here doesn't match what the agent sees, trust the screen and say so.

## Where Transcripts Come From

Use this to read the speaker labels correctly and, when nothing was uploaded, to tell the agent in one line where to get the transcript.

| Source | Where the agent gets it | Speaker labels | Watch for |
|---|---|---|---|
| Granola, desktop app (Mac or Windows), on a Zoom, Meet, Teams or computer phone call | Open the meeting note, click the transcript button (the waveform bars left of the "Ask anything" bar; close Chat first if it's open), then the copy icon at the top right of the transcript panel | Me (the computer's microphone) and Them (system audio, everyone on the call). Through the connector, Microphone and System audio. Real names only when speaker tags are set up for Meet, Zoom or Teams | Everyone on the far end shares one label, even two buyers on one laptop. Granola keeps no audio, so the transcript is the only record |
| Granola, desktop app, in person (laptop on the kitchen table) | Same as above | Everyone talks into the laptop's microphone, so nearly every turn is Me or Microphone | Work out each speaker from names and context. Prices and promises need a person, or "the sellers" and a flag |
| Granola, mobile app (iPhone or Android), in person | Open the note, tap the three dots (...) at top right, then View transcript; share it from there | Speaker A, Speaker B, and so on | Letters, not names, and Granola says identification may not be exact. The mobile apps are free |
| Granola connector in Claude | Claude reads the meeting directly | Microphone and System audio, or Speaker A and B from mobile | The transcript tool needs a paid Granola plan; the free Basic plan gives notes from the last 30 days without the transcript |
| Granola CSV export | Settings > Profile > Generate CSV; the file is emailed within a few hours and the link lasts 24 hours | As above | Only notes with a summary, one export per 24 hours. Use it for an old meeting, not tonight's |
| Zoom cloud recording audio transcript | Zoom web portal > Recordings & Transcripts > Cloud recordings > the meeting; the transcript is a separate VTT file | Speaker names from Zoom (in practice, each participant's display name); an unnamed one shows as Unknown Speaker | Needs a Pro, Business, Education or Enterprise account with cloud recording and audio transcript on before the meeting. Display names can be a device ("Jordan's iPad"). Claude's upload list names TXT, not VTT: if the file won't upload, open it in a text editor and paste the text |
| iPhone call recording (phone appointments) | During a call in the Phone app, tap the more button, then Call Recording. Afterward: Notes > Call Recordings folder > the note > the recording > Copy Transcript | Apple says the speaker of each statement is identified | Only on a call with one other person. Both people hear an audio notice that the call is being recorded. Not offered in every country or language. Apple says to verify a transcript before relying on it |
| iPhone Voice Memos (in person) | Voice Memos > the recording > more button > Copy Transcript | Apple's guide doesn't say speakers are labeled; treat it as unlabeled | Work out speakers from context and flag anything that matters |
| Follow Up Boss calling | FUB already transcribes and summarizes calls made through the FUB number when the account owner has the call recording power-up on | Not needed | Don't rebuild FUB's summary. Give the email and next steps only |
| Notes typed or dictated by the agent | Pasted into the chat | None | Only as complete as the notes. Say so |

Granola only transcribes live meetings; it can't take an uploaded audio file. An agent who recorded on another app brings that app's transcript instead.

## What to Pull From Every Appointment

- Type and side: buyer consult, listing appointment, pre-listing walkthrough, second meeting, or other
- Who was there, and who was missing that decides (a co-buyer, a co-owner)
- The client's two or three priorities, in their own words, with the timestamp
- Motivation: why they're moving, in neutral terms ("job starts in Lehi March 1," "moving closer to family")
- Timeline: the dates they gave, and what drives them (lease end, job start, a rental starting)
- Concerns, in their words
- Every promise the agent made, with the date or day said; every task the client took on
- The agreed next step: weekday, date, time, place or link
- Contact preferences they stated ("text me," "email me")
- Personal details for the agent's own note: pets, a trip, a hobby. Nothing in the leave-out lists in `fair-housing-and-privacy.md`

### Buyer Consult

- Buyer agreement status: signed, discussed but not signed, or not mentioned. Any tour planned (in person or live video) needs it signed first; see `buyer-agreements.md`. Record a term or compensation only as the agent stated it, and keep compensation out of the email.
- Financing: preapproved (lender, loan officer, loan type, letter date), in process (what the lender still needs, and when the buyer will send it), cash, or not discussed. Down payment assistance or other programs: record only that it was mentioned and who is checking.
- Criteria: price range as the buyer stated it, areas, home type, beds and baths, must-haves, deal-breakers (busy road, HOA), parking, lot, and accessibility needs written as features.
- A home to sell first: its status, and the listing conversation to book.

### Listing Appointment

- Motivation and timeline: move date, target list date, target close date, and what's fixed (a rental start, a job).
- Price, attributed: the agent's range and recommendation, the seller's number, and any portal estimate or neighbor's sale the seller cited, each exactly as stated. If it's undecided, the next step is the decision, with its date, and a suggestion to run `pricing-conversation-prep` on the CMA first.
- Concerns: pets, showings, privacy, net proceeds (as a concern only; no figures), sitting on the market.
- Prep items, each with who does it and when: paint, repairs, cleaning, decluttering, landscaping. A vendor the agent offered (a handyman, a photographer) by name only as said.
- Dates: photos, launch, next meeting, and when the listing paperwork gets signed.

## Dates and Times

- Anchor every relative date to the appointment date. "Tomorrow," "Tuesday," "Thursday" mean the next one after the appointment. "Next Saturday" said on a Saturday means seven days later. "Next weekend" said on a weekend is ambiguous: give both readings or the one the transcript settles ("Not this weekend, next weekend" said on Sunday, November 8 means November 14 and 15).
- Write weekday and date together: "Tuesday, November 10, at 6:30 PM."
- A time with no AM or PM: use the one the conversation makes clear ("after six"); otherwise [time] and a flag.
- Different time zones: write both.
- Check every weekday against the calendar before writing it.
- Written a day or more after the appointment: "tonight" and "today" in the transcript mean the appointment day, so those promises are already due. Flag each one ("promised Saturday night: confirm it went out"), and in the email call the appointment "Saturday," not "yesterday" or "last night."

## The Recap Email

Shape, under 200 words in the body:

```
Subject: [Title Case, names the next step]

[First names],

[One line of thanks, specific to the appointment.]

[Their two or three priorities, in their words.]

[The next step: weekday, date, time, place or link.]

[What I'll send and when. What you said you'd do.]

[Personal note: add by voice]

[Sign-off from the voice profile, or a plain one]
[User's name, or Agent Name]
```

- Title Case means every word capitalized, as in "Next Steps For Saturday's Tour".
- A list is fine for three or more promised items.
- Use the client's words for their priorities ("a garden," "no busy roads"), not real estate terms.
- Don't restate anything the client said about their finances or health.

## The Follow Up Boss Note

Plain text, one labeled line per topic, about 200 words or fewer. Fragments, not sentences, and each fact on one line only (a promise goes under Promised, not again under Next step). Write "Not discussed" rather than leaving a line out.

```
[Appointment type], [how: in person, Zoom, phone], [weekday, date]. [Client names].
Motivation: ...
Timeline: ...
Criteria: ... (buyer)  /  Property: ... (seller)
Price discussed: ... (listing, each number with who said it)
Financing: ... (buyer)
Buyer agreement: ... (buyer)
Concerns: ...
Promised: ...
Next step: [weekday, date, time]: ...
Follow-up: [date]
Contact: ... (only a preference the client stated: "text," "email")
Suggested Timeframe to Move: [value]
```

Paste it on the contact: in the note box on the person's profile (the yellow note section), then Create Note. It pastes the same way into any CRM's note field.

**Timeframe to Move** is a Follow Up Boss field with these values: 0-3 months, 3-6 months, 6-12 months, +12 months, No plans. Suggest the one that matches the client's stated move date counted from the appointment date. The agent sets it on the profile; FUB uses it with stages and Smart Lists for follow-up cadence.

## Check Before Sending

List, for items 4 to 6 of the output:
- Every date and time, with the transcript words it came from; resolved dates marked "resolved from 'next Saturday'"
- Every price and number, with who said it and the timestamp
- Every name as spelled (clients, lender, loan officer, vendors, streets, subdivisions), marked "as heard" when nothing else confirms it
- Every promise in the email, with its timestamp
- Every quoted phrase

## Sources (all checked 2026-11-08)

- Granola, How transcription works (labels, copying, no audio kept, no imported recordings): https://docs.granola.ai/help-center/taking-notes/transcription
- Granola, Speaker tags (Me and Them as microphone and system audio): https://docs.granola.ai/help-center/taking-notes/speaker-attribution
- Granola, How transcription works on mobile (Speaker A and B, View transcript): https://docs.granola.ai/help-center/ios/transcription
- Granola, MCP (transcript tool on paid plans; Basic sees the last 30 days): https://docs.granola.ai/help-center/sharing/integrations/mcp
- Granola, Exporting notes (Generate CSV): https://docs.granola.ai/help-center/sharing/exporting-notes
- Granola, Subscriptions and billing (mobile apps free; plans): https://docs.granola.ai/help-center/managing-your-account/subscriptions-and-billing
- Granola, Get Note API (speaker source microphone or speaker; Speaker A and B buckets on iOS): https://docs.granola.ai/api-reference/get-note
- Zoom, Using audio transcription for cloud recordings (VTT file, requirements, Recordings & Transcripts, Unknown Speaker): https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064927
- Claude, Upload files to Claude (supported file types: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, JSON, XLSX): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Apple, Record and transcribe a call on iPhone (one other person; audio notice; verify the transcript): https://support.apple.com/guide/iphone/record-and-transcribe-a-call-iph57c6590e9/ios
- Apple, View a transcription (Voice Memos): https://support.apple.com/guide/iphone/view-a-transcription-iph00953a982/ios
- Follow Up Boss, Call Transcripts and Summaries: https://help.followupboss.com/hc/en-us/articles/23799926737687
- Follow Up Boss, Team Mentions (the yellow note section and Create Note): https://help.followupboss.com/hc/en-us/articles/4402379946007
- Follow Up Boss, Timeframe to Move (values and use with Smart Lists): https://help.followupboss.com/hc/en-us/articles/27096493859735
