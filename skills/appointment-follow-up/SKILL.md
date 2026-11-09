---
name: appointment-follow-up
description: "Turns one client appointment's transcript (a buyer consult or listing appointment, in person, phone or video) into the follow-up an agent writes that night: a recap email in the agent's voice, a paste-ready Follow Up Boss note, dated next steps and a check-before-sending list. Flags a buyer consult with no signed buyer agreement or preapproval, keeps each price exactly as said and by whom, and leaves out protected-class remarks and loan balances. Reads Granola (connector or copied), Zoom, iPhone call or Voice Memos transcripts, or notes. Use it whenever an agent says follow up on my appointment, recap my buyer consult, write the thank-you after my listing appointment (even if the seller wants a higher price), or log this in FUB, or shares a client appointment transcript, even if they never say follow-up. Not for pricing prep before the appointment (pricing-conversation-prep), a recruiting appointment (recruiting-prep), or a team meeting or daily pass over meetings and email (inbox-meeting-follow-through)."
compatibility: "Works on an uploaded or pasted transcript with no connectors. Optional: the Granola connector to read the meeting directly (transcripts need a paid Granola plan) and the Gmail connector to save the email as a draft when the agent asks."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Appointment Follow-Up

Turn one appointment's transcript into the follow-up the agent would otherwise write that night: a recap email in the client's own terms, a CRM note, and next steps with real dates. Follow Up Boss already transcribes and summarizes calls placed through its own calling; this covers the kitchen-table, coffee-shop, Zoom and cell-phone appointments it never hears.

Why it matters: clients judge an agent by whether the promised things arrive when promised, and a CRM note written from memory a day later loses the client's words, the timeline and the next date. A transcript has all of it, plus things that must never be written down: a loan balance, a health detail, or a remark about who lives in a neighborhood.

Run, Draft, Own: this skill reads the whole transcript, works out who said what, resolves "next Saturday" into a date, and checks the buyer agreement and preapproval on its own. The recap email, the optional text and the CRM note are drafts the agent reads first; nothing goes to a client or into a CRM until the agent sends or pastes it. The agent owns every price and money decision, the buyer agreement and its terms, whether to text a client, and any fair housing judgment. Loan questions go to the lender, legal and contract questions to the broker. Wire instructions and account numbers are never asked for, repeated or handled.

## 1. Get the Transcript

- **Granola connector present:** find the meeting by the client's name, or the agent's most recent meeting if they say "my last appointment," and read its notes and full transcript. Transcripts need a paid Granola plan. If only notes come back, work from them, say so at the top, and treat anything not in the notes as unknown.
- **Otherwise:** use the uploaded or pasted transcript or notes. Read `references/follow-up-guide.md` (Where Transcripts Come From) for how each tool labels speakers and where its transcript is copied from.
- **Nothing to work from:** ask once for the transcript or notes, with the one-line source from the guide. Never invent the appointment.
- If the appointment was a call placed through Follow Up Boss's own calling, FUB already has the transcript and summary. Say so, and give only the email and next steps.
- Never ask the agent to type what the transcript already says. If a detail is missing, use a [placeholder], flag it at the top, and keep going.
- Read every line, start to finish. The real next step and the agent's promises often come in the last minute ("Okay, recap from my side...").

## 2. Work Out Who Said What, and When

- **Speakers:** labels vary by tool (Me and Them, Microphone and System audio, Speaker A and B, display names). Two people on one device share one label, and an in-person meeting recorded on a laptop puts everyone on "Microphone." Work out the speaker from context (names used, who asks and who answers). When a price, a promise or a date can't be pinned to one person, attribute it to "the sellers" or "the buyers" and flag it. Don't guess.
- **The appointment date:** from the transcript header, the file name or the agent's message; otherwise [Appointment Date], flagged. Resolve every relative date ("tomorrow," "Tuesday," "next weekend," "the 20th") against it and write the weekday and date. Mark each resolved date in Check before sending with the words it came from. If the words allow two dates, give both and flag it.
- **Written a day or more later:** when the appointment was before today, a promise due "tonight" or "today" is already past. Flag it and make it the first next step ("promised Saturday night: confirm it went out"), and in the email name the appointment day ("on Saturday") rather than "tonight" or "yesterday."
- **Time zones:** when the transcript shows people in different zones, write times in both ("5:00 PM Mountain, 4:00 PM Pacific").
- **Transcription errors:** names, streets, lenders and numbers get misheard. Prefer the spelling in the meeting title, attendee list or the agent's message; otherwise use it as heard and list it to confirm.
- **Names, not pronouns:** call clients by name. Don't write he or she for a client unless the transcript shows it.

## 3. Pull Out What Matters

Read `references/fair-housing-and-privacy.md` before writing anything, and use the checklists in `references/follow-up-guide.md`.

**Every appointment:** type and side, who was there, the client's two or three priorities in their own words, motivation, timeline, concerns, every promise the agent made ("I'll send," "I'll call," "I'll set up"), what the client agreed to do, and the agreed next step with weekday, date, time and place. Note personal details (a pet, a trip, a hobby) for the agent's own personal note only.

**Buyer consult, also:**
- **Written buyer agreement:** signed, discussed but not signed, or not mentioned. Read `references/buyer-agreements.md`. If it isn't signed and any tour is planned, in person or live video, the first flag says to get it signed before that tour, with the date. Never state a compensation amount, term or form version the transcript doesn't, and never draft the agreement.
- **Financing:** preapproved, in process (and what's outstanding), cash, or not discussed, with the lender and loan officer named. Flag pending or missing.
- **Criteria as property features:** the price range as stated, areas, beds and baths, must-haves, deal-breakers, and any home to sell first (a listing conversation to book).

**Listing appointment, also:**
- Motivation, the move date, and the target list or close date.
- **Price, only as stated and by whom:** the agent's recommendation and range, the seller's number, any online estimate the seller quoted. Never suggest a new price, never split the difference, never call one right. If price is still open, say so and suggest running `pricing-conversation-prep` on the CMA before the next meeting.
- Concerns (showings, pets, privacy, timing, net), agreed prep items with who does each, photo, launch and paperwork dates, and whether the listing agreement is signed.

**Location:** Utah mode when the property or the appointment is in Utah: use the Utah forms in `references/buyer-agreements.md`, and read only "Recording a Conversation" in `references/utah-property-notes.md`. Otherwise general mode: skip both Utah sections and say "State rules were not checked."

## 4. Draft the Recap Email

- From the agent, in first person, to the clients by first name. Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill), including its sign-off. Without one: warm, plain, direct.
- A Title Case subject that names the next step, such as "Next Steps After Tonight And Saturday's Tour".
- Under 200 words in the body. Short paragraphs. A brief thanks; their two or three priorities in their own terms; the next step with weekday, date and time; what the agent promised to send and when; what the client agreed to do.
- Every day named in the email carries its date ("by Monday, November 9"), never "tomorrow" or a bare weekday, so it stays right if the email goes out a day late. "Tonight" or "today" for the appointment itself is fine; Check before sending flags it.
- Say a file is coming, never that it's attached; write [Attach: name] where the agent promised one.
- No loan amounts, preapproval figures, credit, income, debts or compensation. A seller's and an agent's prices go in only as each was stated.
- None of "stunning," "dream home," "don't hesitate to reach out," "touch base" or "circle back," even if the agent said them.
- The last line before the sign-off is exactly: [Personal note: add by voice]
- Sign with the user's name (from the voice profile, the conversation, or how the agent introduced themselves in the transcript); otherwise [Agent Name].
- **Text version:** only when a client asked in the appointment to be texted: two sentences on the next step, under 300 characters, to that client. If that client also has something waiting by email (an agreement to sign), say so in Next Steps so the agent can give a heads-up.

## 5. Write the Follow Up Boss Note

Use the template in the guide: labeled plain-text lines (Appointment, Motivation, Timeline, Criteria or Property, Price Discussed, Financing, Buyer Agreement, Concerns, Promised, Next Step, Follow-Up, and Contact when a preference was stated), facts only, no adjectives about the client, about 200 words or fewer: fragments, not sentences, and each fact on one line only. Add the suggested Timeframe to Move value from the guide. The agent pastes it into the note box on the contact and clicks Create Note; it works the same in any CRM. Never write to the CRM.

## 6. List the Next Steps

Numbered, in date order: who (agent, client, lender, other), what, weekday and date, and time when set. Every promise becomes a step. A promise with no date gets [date] and a flag. If price is open on a listing, include the `pricing-conversation-prep` step.

## 7. Guardrails

- Every fact, number, date, name and quote comes from the transcript, the notes or the agent's message. No invented prices, dates, lenders, promises or quotes. If audio is garbled or a number is unclear, say so.
- **Fair housing:** never record, repeat or paraphrase a remark about who lives in an area, or a preference about people, anywhere in the output. Translate needs into property features. An area the client rules out because of who lives there is not a criterion: leave it out entirely. Schools, safety and demographics get official sources, never an opinion. One generic agent-only flag says a remark was left out, without repeating it.
- **Privacy:** leave out loan balances and payoffs, credit scores, income, debts, savings, sale proceeds, account and Social Security numbers, and health details. The preapproval amount goes only in the CRM note. Agent-only MLS fields (private remarks, showing instructions, lockbox and access details) never go to the client.
- **Recording:** when the transcript shows someone on the call was outside Utah, or nobody was told about the notetaker, add one flag line from the recording notes: rules differ by state, some require everyone's consent, confirm with your broker. In general mode, say that state's recording rules were not checked. Note where the transcript shows consent. Don't rule on legality.
- **Stay in lane:** not the lender, attorney, CPA, inspector or broker. Route by role. No promises about price, days on market, appraisal, approval or acceptance.
- **Drafts only:** never send, text, post or write to a CRM. With the Gmail connector and the agent's ask, create a Gmail draft.

## 8. Output, In This Order

1. **Flags**, only when they apply: buyer agreement (first), preapproval, promises already due (written a day or more later), placeholders used, unclear speakers, notes only (no transcript), general mode, recording, and "Left out on purpose" (generic)
2. **Bottom line for the agent** (three sentences max): what kind of appointment, where it landed, the next step with its date, and the one thing to do first
3. **What I heard:** who and when, the client's priorities with timestamps, the buyer or listing extras, motivation, timeline, concerns, and every promise made on both sides
4. **Recap email**
5. **Text version**, only when a client asked to be texted
6. **Follow Up Boss note**, with the suggested Timeframe to Move
7. **Next steps**, dated
8. **Personal note ideas** (agent only): one or two details the client shared
9. **Check before sending:** every date (resolved ones marked with the words they came from), time, price, name spelling, promise and quoted phrase in items 4 to 6, each with its transcript timestamp or quote

If the agent asks for only one piece ("just the FUB note"), give that piece with the flags and Check before sending.
