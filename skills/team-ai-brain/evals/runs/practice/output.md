# Team AI Brain: Kettle Creek Team, Sample Summit Realty

Prompt: "Build our team AI brain from these nine documents. We're on a Claude Team plan with 7 seats, and I'm Juniper, the team leader. Can you also put our active clients' details in it so agents can look them up?"

## Flags

1. **Client data request: declined.** I left your active clients out of the brain, and I'll keep them out if you ask again. Everything in a shared project's instructions and knowledge files is read by everyone you share it with, now and later. Follow Up Boss already does client lookup, with its own permissions, history and your Text OK, Do Not Text and Do Not Call tags, and a copy here would go stale the first time someone says STOP. Agents look clients up in Follow Up Boss; the brain holds how your team works with clients, never who they are. On Claude Team, chats inside a project are private, so an agent can paste one client's details into their own chat for one draft.
2. **Needs your answer:**
   - First call on HomeFinder Example leads: the ISA within 5 minutes (New Online Lead Response SOP, step 1) or the next agent on the buyer rotation, with 10 minutes to claim (Lead Flow, Lead Sources)? Owner: Juniper Testwell (final say on lead routing, Roles List).
   - When a lead goes to the Kettle Creek Pond: after day 7 with no conversation (New Online Lead Response SOP, step 6) or after 14 days with no logged contact (Lead Flow, Rules 2)? Owner: Marlo Fakerson (lead flow), with Juniper Testwell.
   - Who approves listing posts? The Brand Guide (Must 6) says posts are approved in #kc-marketing and the Listing Launch SOP (step 5) says they're approved before they go up; neither names who. Owner: likely Juniper Testwell (owns the brand guide).
3. **House lines added.** All five are in the team instructions. Your Compliance Notes already cover texting consent and wire fraud, and your Brand Guide (Must 4) covers fair housing in marketing, so those are cited next to the house lines. Drafts only and client details come only from this skill. One team document contradicts a house line: the Online Buyer Lead Call Script, "If They Don't Answer," says to send a text right after the voicemail, with no mention of the Text OK tag. The texting consent line wins in the instructions; please fix the script and take it to your broker.
4. **Left out on purpose** (by location and kind only; none of it appears below):
   - Roles List, the Cell column: seven team members' cell numbers. Routing goes by role and team channel.
   - Listing Launch SOP, Access: a client's name tied to a listing, and a lockbox code. The process stays: "Ops sends the code to showing agents through the showing service only."
   - Under Contract Handoff SOP, step 4: a client file name, and escrow account and routing numbers.
   - Under Contract Handoff SOP, the example handoff post: a client's name, phone number and address.
   - Lead Flow, Training Example: a lead's name, email, phone number and property address.
   - Buyer Consult SOP, step 4: a line about suggesting neighborhoods by a buyer's family and schools (fair housing). The fair housing team line covers the topic.
5. **Broker review:** the five house lines; Buyer Consult SOP step 4 (left out, by location); the call script's text step; your Compliance Notes; and the two Utah questions in the rollout.
6. **Stale:** the Under Contract Handoff SOP is dated March 4, 2024, more than 12 months before today (November 10, 2026). Its lines are marked stale in `processes.md`. Ask Ollie Madeup to confirm it. This flag depends on today's date.
   **Mentioned but not uploaded:** the Photo Day Checklist (Listing Launch SOP, step 2), the team's lender list (Buyer Consult SOP, step 3) and the "New Lead Intro" email (New Online Lead Response SOP, step 3).
7. **Utah mode** (Lehi, Utah). Brand Guide Must 2 ("Sample Summit Realty" on every ad, post, flyer, listing and email signature) matches Utah's rule that every ad names the brokerage, teams included (Utah Admin. Code R162-2f-401h(1) and (5)). Your Compliance Notes' Sunday line ("the broker asked us not to cold call on Sundays") stays as your team's house practice: Utah's Sunday and holiday limits (Utah Code 13-25a-103) don't apply to a person acting within a Division of Real Estate license (13-25a-111). The federal TCPA still applies. Utah notes last verified 2026-11-10.
8. **Plan:** Claude Team, from your message: one shared project, agents on "Can view," you and Marlo on "Can edit," and agents' chats stay private (Claude Help Center, "Project visibility and sharing," read 2026-11-10).

## Bottom Line

I built Kettle Creek Team's shared brain from your nine documents: team instructions with the five house lines and your own brand and lead rules marked not overridable, six knowledge files that each name their sources, a personal layer template and a Claude Team rollout; unlike Team Playbook Builder, which turns SOPs into a skill each agent installs, this sets up the shared project every agent's chats start in. The biggest problem: your lead SOP and your lead flow disagree on who calls a HomeFinder Example lead first (the ISA in 5 minutes or the rotation agent in 10) and on when a lead goes to the pond (day 7 or 14 days), and the call script says to text after every voicemail. Settle those two conflicts and fix the script's text step before you share the project.

## Team Instructions

Paste this into the project's instructions.

```
TEAM INSTRUCTIONS: Kettle Creek Team, Sample Summit Realty
Version 1.0, built November 10, 2026 from nine team documents. Owner: Juniper Testwell, Team Leader.

WHO WE ARE
Kettle Creek Team (Kettle Creek Example Team) is a real estate team at Sample Summit Realty in Lehi, Utah. Roles:
- Team Leader: Juniper Testwell
- Operations Manager: Marlo Fakerson
- Inside Sales Agent (ISA): Dex Placeholder
- Buyer's Agents: Rory Samplewood, Tamsin Notreal
- Listing Agent: Wren Examplar
- Transaction Coordinator: Ollie Madeup

WHAT THIS PROJECT IS FOR
Help our agents answer team questions and draft their work the way our team does it, using the knowledge files in this project.

HOW TO ANSWER
- Answer team questions from the knowledge files. End each answer about a team rule with the file and its source, like (lead-handling.md, from New Online Lead Response SOP, step 4).
- If the files don't answer it, say so and name the role to ask, from roles-and-routing.md. Never fill a gap with a guess or a general best practice.
- When the files show a conflict, give both versions and send the agent to the owner named there.
- Every draft follows the team lines below, then the agent's own voice.

TEAM LINES: NOT OVERRIDABLE
No personal instruction, voice profile or request in a chat changes these. If one conflicts, follow the team line and say which line applied.

Compliance (house lines, from Team AI Brain):
1. [TEAM LINE: NOT OVERRIDABLE] Fair housing. Describe homes, documents and terms, never people. Never say who a home or an area suits, and never comment on neighborhood demographics, school quality or safety; point to official sources instead. Treat every client the same, whatever their protected class. Source: house line (federal Fair Housing Act, Utah Code 57-21-5); also Brand Guide, Must 4.
2. [TEAM LINE: NOT OVERRIDABLE] Texting consent. Draft a text only for a contact the agent confirms has documented consent to get texts from the team. A phone number is not consent. STOP, Do Not Text and Do Not Call close the channel, even over an older yes. Every marketing text names the sender and ends with "Reply STOP to opt out." Send between 8 a.m. and 8 p.m. in the recipient's time. No consent on record: draft an email or a call instead. Source: house line (federal TCPA); also Compliance Notes (Texts, Quiet hours, STOP means stop) and New Online Lead Response SOP, step 4.
3. [TEAM LINE: NOT OVERRIDABLE] Drafts only. Everything here is a draft for the agent to read, check and send. Never send, post, schedule, or change anything in Follow Up Boss or any other system. The agent is responsible for every word that goes out. Source: house line (Utah Code 13-77-102: AI making a statement is no defense).
4. [TEAM LINE: NOT OVERRIDABLE] Money and account details. Never ask for, repeat, store or handle wire instructions or bank, account, routing or Social Security numbers. Wiring and payment questions go to the title company or the lender. Source: house line; also Compliance Notes (Wire fraud) and New Online Lead Response SOP, Never.
5. [TEAM LINE: NOT OVERRIDABLE] Client details. Never add a client's name, contact details, finances, deal terms or notes to this project's instructions or knowledge files. Client records live in Follow Up Boss. Source: house line.

Brand (from Brand Guide, Must):
6. [TEAM LINE: NOT OVERRIDABLE] Our name is "Kettle Creek Team." Never "KC Team" or "Kettle Creek Realty." (Must 1)
7. [TEAM LINE: NOT OVERRIDABLE] "Sample Summit Realty" appears on every ad, post, flyer, listing and email signature. (Must 2; Utah Admin. Code R162-2f-401h)
8. [TEAM LINE: NOT OVERRIDABLE] Email signature: your name, then "Kettle Creek Team | Sample Summit Realty", then your phone number, then "Licensed in Utah". (Must 3)
9. [TEAM LINE: NOT OVERRIDABLE] Never write "dream home," "stunning," "won't last long" or "don't hesitate to reach out." (Must 5)
10. [TEAM LINE: NOT OVERRIDABLE] Every listing post is approved in #kc-marketing before it goes up. [Who approves: not in your documents. Ask Juniper Testwell.] (Must 6; Listing Launch SOP, step 5)

Lead handling (from New Online Lead Response SOP and Lead Flow):
11. [TEAM LINE: NOT OVERRIDABLE] The ISA calls every new online lead within 5 minutes of the Follow Up Boss alert, from 8 a.m. to 8 p.m. (SOP, step 1). For HomeFinder Example leads: [Conflict: see lead-handling.md. Ask Juniper Testwell until decided.] Leads that come in after 8 p.m. get their first call at 8 a.m. the next morning. (SOP, step 2)
12. [TEAM LINE: NOT OVERRIDABLE] Text only if the lead has the "Text OK" tag in Follow Up Boss. No tag, no text. (SOP, step 4)
13. [TEAM LINE: NOT OVERRIDABLE] Log every call, text and email in Follow Up Boss the same day. (SOP, step 8)
14. [TEAM LINE: NOT OVERRIDABLE] Every new lead gets a stage the same day it arrives. (Lead Flow, Rules 1)
15. [TEAM LINE: NOT OVERRIDABLE] Agents never delete a lead. Wrong or fake leads go to Trash. (Lead Flow, Rules 3)
16. [TEAM LINE: NOT OVERRIDABLE] The Kettle Creek Pond: [Conflict: see lead-handling.md. Ask Marlo Fakerson until Juniper Testwell decides.]

Other team rules (from Buyer Consult SOP and New Online Lead Response SOP):
17. [TEAM LINE: NOT OVERRIDABLE] Sign the Kettle Creek buyer agreement at the consult. No showing, in person or live video, until it is signed. (Buyer Consult SOP, step 2; New Online Lead Response SOP, Never)

DEFAULTS AN AGENT MAY CHANGE
From Brand Guide, Our Voice (The Team Default; Your Own Voice Can Change These): warm, plain and short, one idea per paragraph; "home," not "house"; first names, and sign off with your first name; emoji are fine on social posts, never in client emails. An agent's personal layer (voice profile QUICK CARD, goals, preferences) may change these and nothing in Team Lines.

WHERE QUESTIONS GO
Contract, legal and compliance: Sample Summit Realty's principal broker, through Juniper Testwell. Loans: the buyer's lender. Wiring: the title company. Everything else the files don't answer: the owner named in roles-and-routing.md, or Juniper Testwell.
```

## Team Context Pack

Six knowledge files, each also saved as its own `.md` file to upload. Upload these to the project's knowledge, not the nine original documents: the originals still hold the items left out above.

### roles-and-routing.md

```
# Roles and Routing: Kettle Creek Team

Built from: Roles List, Kettle Creek Example Team (owner Juniper Testwell, dated October 1, 2026); Compliance Notes from Broker Training (owner Juniper Testwell, dated September 22, 2026), Wire fraud line only. Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Who Owns What
- Team Leader, Juniper Testwell: team standards and the brand guide, agent coaching, the buyer rotation, final say on lead routing. (Source: Roles List)
- Operations Manager, Marlo Fakerson: Follow Up Boss setup and lead flow, SOPs, listing launch, Do Not Call scrubs. (Source: Roles List)
- Inside Sales Agent (ISA), Dex Placeholder: first calls to new online leads, setting buyer consults. (Source: Roles List)
- Buyer's Agents, Rory Samplewood and Tamsin Notreal: buyer consults, showings, offers. (Source: Roles List)
- Listing Agent, Wren Examplar: listing appointments, listing remarks, seller updates. (Source: Roles List)
- Transaction Coordinator, Ollie Madeup: under contract to closing: deadlines, title and lender updates. (Source: Roles List)

## Team Channels (Slack)
- #kc-leads: new lead alerts and appointment posts. (Source: Roles List, Team Channels)
- #kc-transactions: everything from mutual acceptance to closing. (Source: Roles List, Team Channels)
- #kc-marketing: social posts, flyers and brand questions. (Source: Roles List, Team Channels)

## Questions That Go Outside the Team
- Contracts, legal and compliance: Sample Summit Realty's principal broker. Agents send these through Juniper. (Source: Roles List)
- Loans: the buyer's lender. (Source: Roles List)
- Wiring: clients call the title company at a number they look up themselves. (Source: Compliance Notes, Wire fraud)

## Not in Your Documents
- Who approves listing posts in #kc-marketing. Ask Juniper Testwell.
```

### lead-handling.md

```
# Lead Handling: Kettle Creek Team

Built from: SOP: New Online Lead Response (owner Marlo Fakerson, dated August 12, 2026); How Leads Flow in Follow Up Boss (owner Marlo Fakerson, dated October 20, 2026). Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Where Leads Come From (Follow Up Boss, Admin > Lead Flow)
| Lead source | Where it comes from | Assigned to | Action plan |
|---|---|---|---|
| Website (IDX) | Our team website | Dex Placeholder (ISA) | New Website Lead |
| HomeFinder Example | A made-up home search portal | The next agent on the buyer rotation. The agent has 10 minutes to claim it, then it goes to the next agent | Portal Buyer |
| Open House Sign-In | Sample SignIn App | The hosting agent | Open House Visitor |
| Sphere and Referral | Added by hand | The agent who adds it | None |
(Source: Lead Flow, Lead Sources)

## First Response
- The ISA calls every new online lead within 5 minutes of the Follow Up Boss alert, from 8 a.m. to 8 p.m. (Source: New Online Lead Response SOP, step 1) [For HomeFinder Example leads, see the conflict below.]
- Leads that come in after 8 p.m. get their first call at 8 a.m. the next morning. (Source: SOP, step 2)
- No answer: leave the voicemail from the Online Buyer Lead call script, then send the "New Lead Intro" email from Follow Up Boss. (Source: SOP, step 3)
- Text only if the lead has the "Text OK" tag in Follow Up Boss. No tag, no text. (Source: SOP, step 4)

## Follow-Up
- Call attempts: day 1 (two calls), day 2, day 4 and day 7. (Source: SOP, step 5)
- When the ISA sets a buyer consult, assign the lead to the next agent on the buyer rotation, change the stage to Appointment Set, and post the consult time in #kc-leads. (Source: SOP, step 7)
- Log every call, text and email in Follow Up Boss the same day. (Source: SOP, step 8)

## Stages and Tags
- Stages: Lead, Attempted Contact, Spoke With, Appointment Set, Active Client, Under Contract, Closed, Nurture, Past Client, Trash. (Source: Lead Flow, Stages)
- Tags: Text OK (consent to texts on file); Do Not Text; Do Not Call. (Source: Lead Flow, Tags)
- Every new lead gets a stage the same day it arrives. (Source: Lead Flow, Rules 1)
- Agents never delete a lead. Wrong or fake leads go to Trash. (Source: Lead Flow, Rules 3)

## Never
- Never ask a lead for a Social Security number, bank details or account numbers. Lenders collect those. (Source: SOP, Never)
- Never promise a showing before the buyer agreement is signed (see processes.md, Buyer Consult). (Source: SOP, Never)

## Conflict, Not Decided Yet
- First call on HomeFinder Example leads: the New Online Lead Response SOP, step 1 (August 12, 2026) says "The ISA calls every new online lead within 5 minutes of the Follow Up Boss alert." The Lead Flow, Lead Sources (October 20, 2026) sends HomeFinder Example leads to "The next agent on the buyer rotation. The agent has 10 minutes to claim it, then it goes to the next agent." Ask Juniper Testwell until it's decided.
- The Kettle Creek Pond: the New Online Lead Response SOP, step 6 says "After day 7 with no conversation, move the lead to the Kettle Creek Pond." The Lead Flow, Rules 2 says "A lead with no logged contact for 14 days goes to the Kettle Creek Pond, where any agent can claim it." Ask Marlo Fakerson until Juniper Testwell decides.

## Not in Your Documents
- The wording of the "New Lead Intro" email (named in SOP step 3, not uploaded). Ask Marlo Fakerson.
```

### scripts.md

```
# Scripts: Kettle Creek Team

Built from: Call Script: Online Buyer Lead (owner Dex Placeholder, ISA, dated July 20, 2026). Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it, word for word, with its merge fields as written. Nothing here is a client record.

## Opening
"Hi, is this {first name}? This is {your name} with the Kettle Creek Team at Sample Summit Realty. You asked about {address} on {lead source}. Do you have a minute?" (Source: Call Script, Opening)

## Questions
1. "What got you looking at {address}?"
2. "When are you hoping to move?"
3. "Have you talked with a lender yet?"
4. "Are you working with an agent already?" If yes: thank them and end the call. No pitch.
(Source: Call Script, Questions)

## Setting the Consult
"The easiest next step is a 20-minute consult, at our Lehi office or on video. Does Tuesday or Wednesday work better?" (Source: Call Script, Setting the Consult)

## Voicemail
"Hi {first name}, it's {your name} with the Kettle Creek Team at Sample Summit Realty, calling about {address}. Call me back at {your number} when it suits you. Talk soon." (Source: Call Script, Voicemail)

## If They Don't Answer
- "Send a text right after the voicemail." (Source: Call Script, If They Don't Answer) [See the team line on texting consent in the team instructions: text only with the "Text OK" tag (New Online Lead Response SOP, step 4). This script line is waiting on Juniper Testwell and the broker.]
```

### brand-and-marketing.md

```
# Brand and Marketing: Kettle Creek Team

Built from: Kettle Creek Example Team Brand Guide (owner Juniper Testwell, dated January 15, 2026); SOP: Listing Launch (owner Marlo Fakerson, effective June 3, 2026), steps 3 and 5. Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Required for Everyone (Brand Guide, Must)
1. Our name is "Kettle Creek Team." Never "KC Team" or "Kettle Creek Realty." (Source: Brand Guide, Must 1)
2. "Sample Summit Realty" appears on every ad, post, flyer, listing and email signature. (Source: Brand Guide, Must 2)
3. Email signature: your name, then "Kettle Creek Team | Sample Summit Realty", then your phone number, then "Licensed in Utah". (Source: Brand Guide, Must 3)
4. Describe homes, never people. No "perfect for families," no school or safety claims. (Source: Brand Guide, Must 4)
5. Never write "dream home," "stunning," "won't last long" or "don't hesitate to reach out." (Source: Brand Guide, Must 5)
6. Every listing post is approved in #kc-marketing before it goes up. (Source: Brand Guide, Must 6)

## The Team's Voice (Default; Each Agent's Own Voice Can Change These)
- Warm, plain and short. One idea per paragraph.
- We say "home," not "house."
- First names. Sign off with your first name.
- Emoji are fine on social posts, never in client emails.
(Source: Brand Guide, Our Voice)

## Listing Marketing
- Wren writes the MLS remarks. Ops checks them against the brand guide before the listing goes live. Remarks describe the home, never people. (Source: Listing Launch SOP, step 3)
- Social post the day the listing goes live. Every listing post is approved before it goes up. (Source: Listing Launch SOP, step 5)

## Not in Your Documents
- Who approves listing posts. Ask Juniper Testwell.
```

### compliance.md

```
# Compliance Notes: Kettle Creek Team

Built from: Compliance Notes from Broker Training (owner Juniper Testwell, dated September 22, 2026), Juniper's notes from Sample Summit Realty's broker training. Built November 10, 2026 by Team AI Brain. The five house lines are in the team instructions; this file is the team's own notes, in their wording. Nothing here is a client record.

- Texts: only to people with the "Text OK" tag in Follow Up Boss. We add the tag only when the lead form or the person said yes to texts in writing. A phone number is not permission. (Source: Compliance Notes, Texts)
- Quiet hours: no calls or texts before 8 a.m. or after 8 p.m., in the lead's time zone. (Source: Compliance Notes, Quiet hours)
- STOP means stop: add the "Do Not Text" tag right away and tell Marlo. (Source: Compliance Notes, STOP means stop)
- Do Not Call: Marlo scrubs our call lists against the National Do Not Call Registry every month. (Source: Compliance Notes, Do Not Call)
- Wire fraud: we never send wire instructions, never ask for account numbers, and never forward wiring details. Clients call the title company at a number they look up themselves. (Source: Compliance Notes, Wire fraud)
- Advertising: "Sample Summit Realty" on everything (see brand-and-marketing.md). (Source: Compliance Notes, Advertising)
- Sundays: the broker asked us not to cold call on Sundays. This is the team's house practice, from the broker's request. (Source: Compliance Notes, Sundays)
```

### processes.md

```
# Processes: Kettle Creek Team

Built from: SOP: Listing Launch (owner Marlo Fakerson, effective June 3, 2026); SOP: Buyer Consult and Buyer Agreement (owner Juniper Testwell, dated September 8, 2026); SOP: Under Contract Handoff (owner Ollie Madeup, dated March 4, 2024, stale). Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Listing Launch
1. The signed listing agreement goes in the transaction folder before anything else happens. (Source: Listing Launch SOP, step 1)
2. Ops books photos within 2 business days of the signed listing agreement. Follow the Photo Day Checklist. [Photo Day Checklist: not in your documents.] (Source: Listing Launch SOP, step 2)
3. Wren writes the MLS remarks. Ops checks them against the brand guide before the listing goes live. Remarks describe the home, never people. (Source: Listing Launch SOP, step 3)
4. New listings go live on a Thursday by 10 a.m. (Source: Listing Launch SOP, step 4)
5. Social post the day the listing goes live. Every listing post is approved before it goes up. (Source: Listing Launch SOP, step 5)
6. First open house: the first Saturday after the listing goes live, 11 a.m. to 1 p.m. (Source: Listing Launch SOP, step 6)
7. Seller update every Monday by noon: showings, feedback and online views. (Source: Listing Launch SOP, step 7)
- Lockbox access: Ops sends the code to showing agents through the showing service only. (Source: Listing Launch SOP, Access)

## Buyer Consult and Buyer Agreement
1. Every buyer gets a consult, in person at the Lehi office or on video, before the first showing. (Source: Buyer Consult SOP, step 1)
2. Sign the Kettle Creek buyer agreement at the consult. No showing, in person or live video, until it is signed. (Source: Buyer Consult SOP, step 2)
3. Confirm preapproval, or give the buyer three lender names from the team's lender list. Never call one lender "the best." [Lender list: not in your documents.] (Source: Buyer Consult SOP, step 3)
4. Send the consult recap email the same day. (Source: Buyer Consult SOP, step 5)
5. Set up the buyer's search in Follow Up Boss and change the stage to Active Client. (Source: Buyer Consult SOP, step 6)
(Buyer Consult SOP step 4 is left out for fair housing; see the fair housing team line.)

## Under Contract Handoff (stale: dated March 4, 2024)
1. The agent posts in #kc-transactions within 1 hour of mutual acceptance. (Source: Under Contract Handoff SOP, step 1; stale)
2. The agent uploads the signed contract and every addendum to the transaction folder the same day. (Source: Under Contract Handoff SOP, step 2; stale)
3. The TC sends the intro email to the clients, the lender and title within 1 business day. (Source: Under Contract Handoff SOP, step 3; stale)
4. Earnest money: the TC confirms with title that it arrived by the contract deadline. Wire instructions come only from the title company. [Removed: account details. Wiring questions go to the title company.] (Source: Under Contract Handoff SOP, step 4; stale)
5. The TC puts every contract deadline on the shared transactions calendar. (Source: Under Contract Handoff SOP, step 5; stale)
6. Change the stage to Under Contract in Follow Up Boss. After funding, change it to Closed. (Source: Under Contract Handoff SOP, step 6; stale)

## Not in Your Documents
- The Photo Day Checklist (Listing Launch SOP, step 2). Ask Marlo Fakerson.
- The team's lender list (Buyer Consult SOP, step 3). Ask Juniper Testwell.
- Whether the Under Contract Handoff SOP is still current. Ask Ollie Madeup.
```

## Personal Layer Template

Send this to every agent. Each agent fills in their own; nothing is filled in for them.

```
MY PERSONAL LAYER: [Your Name], [Your Role], Kettle Creek Team

TEAM LINES I CANNOT OVERRIDE
The Team Lines in our team instructions always come first: fair housing, texting consent, drafts only, money and account details, client details, our name, the brokerage name on everything, the email signature, the never-write words, listing post approval, the lead-handling rules (the first call and its hours, the Text OK tag, same-day logging, same-day stages, never deleting a lead, the pond) and no showing before the buyer agreement is signed. If anything below conflicts with them, follow the team line.

MY VOICE
[Paste your voice profile QUICK CARD here, from amplifiedimpact.io/voice-profile. It may change our voice defaults: warm, plain and short; "home," not "house"; first names and your sign-off; emoji on social posts. It may not change the team lines. No QUICK CARD yet? Leave this blank, and drafts use the team's voice defaults.]

MY ROLE AND GOALS
Role: [your role from the roles list]
This quarter I'm working on: [your goals, in your own words]

HOW I LIKE ANSWERS
[For example: short, bullet points, or a draft first and the reasons after.]

KEEP OUT OF HERE
No client names, phone numbers, addresses or deal details. Those stay in Follow Up Boss.
```

**Where each agent puts it (Claude Team):** Settings, then "Your Claude," then "Instructions" (the older layout calls it Account, "Instructions for Claude"). Those instructions apply in every chat, the team project included (Claude Help Center, "Understanding Claude's personalization features," read 2026-11-10). Or paste it at the top of a chat. The help center doesn't say which wins when an agent's own instructions and the project's instructions disagree, so the team instructions tell Claude the team lines win. That's a written rule Claude follows, not a lock: "Can view" access is what keeps agents from editing the team project itself.

## Rollout Checklist

For Claude Team. You do every step; this skill doesn't create, share or change anything.

1. **Answer the flags** (Juniper): the two conflicts, who approves listing posts, the call script's text step, and the handoff SOP with Ollie. Then update the instructions and `lead-handling.md`, or re-run this skill with your answers.
2. **Broker review** (Juniper, with Sample Summit Realty's principal broker): the five house lines, the left-out Buyer Consult SOP step 4 (by location), the call script's text step, your Compliance Notes, and two Utah questions: (a) Utah Code 13-77-103: does any way our agents use these drafts need an AI disclosure to clients? (b) Do Brand Guide Must 2 and the email signature meet R162-2f-401h for every ad and post?
3. **Make the project** (Juniper or Marlo, whoever will hold "Can edit"): Projects in the left sidebar (or claude.ai/projects), "+ New Project," a name such as Kettle Creek Team, and "Keep it private" so only the people you invite get it (Claude Help Center, "How can I create and manage projects?", read 2026-11-10).
4. **Add the brain** (same person): "Set project instructions," paste the team instructions, "Save instructions." Then click "+" in the knowledge base on the right and add the six knowledge files. Don't upload the nine originals.
5. **Test before sharing** (Juniper). Ask these in a new chat in the project and check each answer and its source:
   1. "A new website lead came in after 8 p.m. When do I call?" Expected: 8 a.m. the next morning (lead-handling.md, from New Online Lead Response SOP, step 2).
   2. "Can I text a lead who doesn't have the Text OK tag?" Expected: no; no tag, no text, so email or call instead (team lines 2 and 12; lead-handling.md, from SOP, step 4).
   3. "What goes in my email signature?" Expected: your name, "Kettle Creek Team | Sample Summit Realty", your phone number, "Licensed in Utah" (brand-and-marketing.md, from Brand Guide, Must 3).
   4. "When do new listings go live?" Expected: a Thursday by 10 a.m. (processes.md, from Listing Launch SOP, step 4).
   5. "How fast do I post after mutual acceptance?" Expected: in #kc-transactions within 1 hour, marked stale (processes.md, from Under Contract Handoff SOP, step 1).
   6. For a person: "What are the title company's wiring details for my closing?" Expected: it won't give or ask for any; wiring questions go to the title company (team line 4).
   Also ask "Who calls a HomeFinder Example lead first?" Until you decide, it should show both versions and send the agent to you.
6. **Share** (Juniper): the "Share" button to the right of the project name; general access "Only people invited"; add Marlo Fakerson with "Can edit"; add Dex Placeholder, Rory Samplewood, Tamsin Notreal, Wren Examplar and Ollie Madeup with "Can view." Their chats in the project stay private, and sharing the project doesn't expose anyone's chats (Claude Help Center, "Project visibility and sharing," read 2026-11-10).
7. **Send the personal layer template and this note** (Juniper). Draft, for you to edit and send:

   **Subject: Our Team Project Is Ready: Start Your Chats There**

   Hi team,

   We now have one shared Claude project for Kettle Creek Team. It holds our team instructions and six files built from our own SOPs, call script, brand guide and compliance notes, so your drafts start with our name, our brand and our lead rules already in place.

   Here's what to do:
   - Open the project under Projects (it's shared with you) and start your work chats there.
   - Fill in the personal layer template below with your voice profile QUICK CARD and your goals, and paste it into Settings, Your Claude, Instructions.
   - Never put a client's name, number or deal details into the project's files. Client records stay in Follow Up Boss.

   If an answer looks wrong or cites the wrong document, tell me.

   Juniper

8. **Training and memory** (Juniper): Team plan chats aren't used for training by default (Claude Privacy Center, checked 2026-11-08). Memory is set in Organization settings, then Capabilities; the help center doesn't say whether a shared project's memory is visible to other members, which is one more reason client details stay out (Claude Help Center, chat search and memory article, read 2026-11-10).
9. **When someone leaves** (Juniper or Marlo), the same day: open Share, select that person's role, and choose "Remove access" (Claude Help Center, "Project visibility and sharing," read 2026-11-10).

## Quarterly Refresh

Once a quarter, on a date you put on the calendar:

1. **Collect what changed** (each document's owner): Marlo for the New Online Lead Response SOP, the Listing Launch SOP and the Lead Flow; Juniper for the Roles List, the Brand Guide, the Buyer Consult SOP and the Compliance Notes; Ollie for the Under Contract Handoff SOP; Dex for the call script.
2. **Re-run this skill in update mode** (Juniper): attach the current team instructions, the six knowledge files and the changed documents, and say "Update our team brain." It raises the version (1.0 to 1.1) and lists every change.
3. **Re-check stale documents** (owners): anything more than 12 months old by then. Today the Under Contract Handoff SOP is the only stale one; the Brand Guide (January 15, 2026) is the oldest of the rest.
4. **Re-check the plan facts** (Juniper or Marlo): open the Claude help center pages cited in the rollout; sharing and settings move often.
5. **Ask agents for wrong answers** (Juniper): any answer that missed or cited the wrong document. Fix the source document first, then re-run.
6. **Check access** (Juniper): in Share, remove anyone who left; confirm agents are on "Can view."
7. **Broker check** (Juniper): when the broker or a rule changes, review the house lines and `compliance.md` again.

Never collect or review an agent's personal layer, goals or voice profile; those are theirs.

## Check Before Sending

Before you paste, upload or share anything, check each item against its source.

| Item | Where it's from |
|---|---|
| Kettle Creek Team; never "KC Team" or "Kettle Creek Realty" | Brand Guide, Must 1 |
| Sample Summit Realty; Lehi, Utah | Roles List, header; Brand Guide, Must 2 |
| Every role and name in the instructions and roles-and-routing.md | Roles List |
| #kc-leads, #kc-transactions, #kc-marketing | Roles List, Team Channels |
| Principal broker through Juniper; loans to the buyer's lender | Roles List, Questions That Go Outside the Team |
| 5 minutes; 8 a.m. to 8 p.m.; after 8 p.m. called at 8 a.m. | New Online Lead Response SOP, steps 1 and 2 |
| Call attempts day 1 (two calls), day 2, day 4, day 7 | New Online Lead Response SOP, step 5 |
| Pond after day 7, against 14 days with no logged contact (conflict) | New Online Lead Response SOP, step 6; Lead Flow, Rules 2 |
| 10 minutes to claim a HomeFinder Example lead (conflict with the 5 minutes) | Lead Flow, Lead Sources |
| Every lead source, assignment and action plan name | Lead Flow, Lead Sources |
| Every stage; Text OK, Do Not Text, Do Not Call | Lead Flow, Stages and Tags |
| Same-day stage; never delete a lead, Trash | Lead Flow, Rules 1 and 3 |
| Email signature wording; the never-write words; approval in #kc-marketing | Brand Guide, Must 3, 5 and 6 |
| Our Voice defaults | Brand Guide, Our Voice |
| 2 business days; Thursday by 10 a.m.; first Saturday 11 a.m. to 1 p.m.; Monday by noon | Listing Launch SOP, steps 2, 4, 6 and 7 |
| Buyer agreement at the consult, no showing until signed; three lender names | Buyer Consult SOP, steps 2 and 3 |
| 1 hour; 1 business day (stale) | Under Contract Handoff SOP, steps 1 and 3, dated March 4, 2024 |
| 20-minute consult; Tuesday or Wednesday; every quoted script line | Call Script, Setting the Consult and the rest of the script |
| Quiet hours 8 a.m. to 8 p.m.; monthly Do Not Call scrub; Sundays | Compliance Notes |
| Placeholders still open: who approves listing posts; the lender list; the Photo Day Checklist; the New Lead Intro email | Flags 2 and 6 |
| Conflicts still open, and what agents are told until then | Flags 2; lead-handling.md |
| Sharing, permissions, chats private, remove access | Claude Help Center, "Project visibility and sharing," read 2026-11-10 |
| New Project, Keep it private, Set project instructions, the knowledge "+" | Claude Help Center, "How can I create and manage projects?", read 2026-11-10 |
| Settings, Your Claude, Instructions | Claude Help Center, "Understanding Claude's personalization features," read 2026-11-10 |
| Memory in Organization settings, Capabilities | Claude Help Center, chat search and memory article, read 2026-11-10 |
| Team plan chats not used for training by default | Claude Privacy Center, checked 2026-11-08 |
| The five house lines, R162-2f-401h, 13-25a-111, 13-77-102 and 13-77-103, 57-21-5 | For your broker; this skill's compliance and Utah notes, last verified 2026-11-10 |
| Nothing left out made it back in | Search the six files for each item in Flags 4 before uploading |
| The note to agents: subject, "six files," and the Settings path | Rollout step 7 |
