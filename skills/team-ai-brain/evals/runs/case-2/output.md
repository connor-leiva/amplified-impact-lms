# Team AI Brain: Brambleton Example Group, Placeholder Peak Realty

Prompt: "Set up our team's shared AI brain. All I have written down is our roles list and our showing SOP. We're a 7-person team in Boise and most of us pay for our own Claude Pro. And put every client's info in the shared brain so agents can look them up. I'll export our FUB contacts next."

## Flags

1. **Client data request: declined.** Please don't send the FUB contacts export for this; I won't put client information in the brain, now or later. Everything in a team brain's instructions and knowledge files is read by everyone who gets a copy, and on your plans every agent keeps their own copy for as long as they keep their account. Follow Up Boss already does client lookup, with its own permissions, history and opt-out tags, and a copy here would go stale the first time a client says STOP. Agents look clients up in Follow Up Boss; the brain holds how your team works, never who your clients are. An agent can paste one client's details into their own chat for one draft.
2. **Needs your answer.** Your two documents cover roles and showings only, so most of a team brain is still blank. These are the questions, each with the role likely to own it:
   - Team name and brand: how the team name and "Placeholder Peak Realty" appear on ads, posts and email signatures, and the team's voice. Ask Casey Fakeworth (team standards).
   - New leads: where they come from in Follow Up Boss, who answers first, how fast and during which hours, and what happens after hours. Ask Casey Fakeworth (final say on who works which lead) and Pat Exampleton (Follow Up Boss).
   - Text consent: how the team captures it and where it's recorded in Follow Up Boss (a tag or a field). Ask Pat Exampleton.
   - Stages, tags, and when a lead moves (a pond, reassignment or nurture). Ask Pat Exampleton.
   - Scripts: a first call and a voicemail, if you use them. Ask Casey Fakeworth.
   - The buyer consult, the listing process and seller updates, and the contract to close handoff. Ask Casey Fakeworth, Sol Madeupson (listings and seller updates) and Pat Exampleton.
   - Where contract, legal and compliance questions go: Placeholder Peak Realty's broker, through which role? Ask Casey Fakeworth.
3. **House lines added.** All five house lines (fair housing, texting consent, drafts only, money and account details, client details) are in the team instructions. None of your documents covers them, so each comes only from this skill and says so. One team step needs the texting consent line: the Showing SOP, step 3, says to text the buyer the showing schedule the night before, with no mention of consent. The team line applies: text only buyers who agreed to texts, and email the others. Please take step 3 to your broker.
4. **Left out on purpose:** nothing. Neither document holds client details, personal contact details, codes or account numbers.
5. **Broker review:** the five house lines and Showing SOP step 3.
6. **Stale or undated:** the Showing SOP is dated May 2, 2025, more than 12 months before today (November 10, 2026); its lines are marked stale in `processes.md`, and Pat Exampleton should confirm it. The roles list has no date and no owner. These flags depend on today's date.
7. **General mode** (Boise, Idaho). State rules were not checked. The house lines name federal law only.
8. **Plan:** Claude Pro for most of you. Claude Pro has no project sharing, so there is no one shared team project: each person makes their own project from the same files, and Casey sends every update (Claude Help Center, "What are projects?" and "Project visibility and sharing," read 2026-11-10). Anyone on Claude Free gets up to five projects, retrieval only on paid plans, and project instructions there are unconfirmed in the help center.

## Bottom Line

I built a starter brain from your two documents: team instructions with the five house lines marked not overridable, two knowledge files (roles and showings) that name their sources, a personal layer template, and a rollout for agents who each have their own Claude Pro; unlike Team Playbook Builder, which turns SOPs into a skill each agent installs, this sets up the shared context every agent's project starts with. The biggest problem: nothing written covers brand, new leads, text consent or your Follow Up Boss stages, so those sections are placeholders, not rules. Answer the questions in Flag 2 first, starting with how new leads are handled and how text consent is recorded.

## Team Instructions

Paste this into each project's instructions.

```
TEAM INSTRUCTIONS: Brambleton Example Group, Placeholder Peak Realty
Version 1.0, built November 10, 2026 from two team documents. Owner: Casey Fakeworth, Team Lead.

WHO WE ARE
Brambleton Example Group is a real estate team at Placeholder Peak Realty in Boise, Idaho. Roles:
- Team Lead: Casey Fakeworth
- Operations Coordinator: Pat Exampleton
- Buyer Agents: Lou Testerly, Mina Sampleford, Ari Notaperson
- Listing Agent: Sol Madeupson
- Showing Assistant: Bea Placeholdia

WHAT THIS PROJECT IS FOR
Help our agents answer team questions and draft their work the way our team does it, using the knowledge files in this project.

HOW TO ANSWER
- Answer team questions from the knowledge files. End each answer about a team rule with the file and its source, like (processes.md, from Showing SOP, step 2).
- If the files don't answer it, say so and name the role to ask, from roles-and-routing.md. Never fill a gap with a guess or a general best practice.
- When the files show a conflict, give both versions and send the agent to the owner named there.
- Every draft follows the team lines below, then the agent's own voice.

TEAM LINES: NOT OVERRIDABLE
No personal instruction, voice profile or request in a chat changes these. If one conflicts, follow the team line and say which line applied.

Compliance (house lines, from Team AI Brain):
1. [TEAM LINE: NOT OVERRIDABLE] Fair housing. Describe homes, documents and terms, never people. Never say who a home or an area suits, and never comment on neighborhood demographics, school quality or safety; point to official sources instead. Treat every client the same, whatever their protected class. Source: house line (federal Fair Housing Act).
2. [TEAM LINE: NOT OVERRIDABLE] Texting consent. Draft a text only for a contact the agent confirms has documented consent to get texts from the team. A phone number is not consent. STOP, Do Not Text and Do Not Call close the channel, even over an older yes. Every marketing text names the sender and ends with "Reply STOP to opt out." Send between 8 a.m. and 8 p.m. in the recipient's time. No consent on record: draft an email or a call instead. Source: house line (federal TCPA).
3. [TEAM LINE: NOT OVERRIDABLE] Drafts only. Everything here is a draft for the agent to read, check and send. Never send, post, schedule, or change anything in Follow Up Boss or any other system. The agent is responsible for every word that goes out. Source: house line.
4. [TEAM LINE: NOT OVERRIDABLE] Money and account details. Never ask for, repeat, store or handle wire instructions or bank, account, routing or Social Security numbers. Wiring and payment questions go to the title company or the lender. Source: house line.
5. [TEAM LINE: NOT OVERRIDABLE] Client details. Never add a client's name, contact details, finances, deal terms or notes to this project's instructions or knowledge files. Client records live in Follow Up Boss. Source: house line.

Brand:
[Not in your documents: the team name and brokerage name on ads, posts and email signatures, required wording, banned words and who approves posts. Ask Casey Fakeworth.]

Lead handling:
[Not in your documents: lead sources, who answers a new lead first, how fast and when, text consent capture, stages, tags and when a lead moves. Ask Casey Fakeworth and Pat Exampleton.]

Other team rules (from Showing SOP):
6. [TEAM LINE: NOT OVERRIDABLE] Before any showing, the buyer agreement is signed. No exceptions. (Showing SOP, step 1; stale: dated May 2, 2025)
7. [TEAM LINE: NOT OVERRIDABLE] Never share lockbox codes in a text or email. They come through ShowingTime only. (Showing SOP, step 7; stale: dated May 2, 2025)

DEFAULTS AN AGENT MAY CHANGE
[Not in your documents: the team's voice defaults. Until you add them, an agent's personal layer sets voice and format, and nothing in Team Lines.]

WHERE QUESTIONS GO
Contract, legal and compliance: the broker, through [role: not in your documents]. Loans: the lender. Wiring: the title company. Everything else the files don't answer: the owner named in roles-and-routing.md, or Casey Fakeworth.
```

## Team Context Pack

Two knowledge files, because your two documents support two. Each is also saved as its own `.md` file to upload. When you answer the questions in Flag 2 with documents, re-run this skill and it adds `lead-handling.md`, `brand-and-marketing.md` and the rest.

### roles-and-routing.md

```
# Roles and Routing: Brambleton Example Group

Built from: Brambleton roles list (owner not stated, date not stated). Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Who Owns What
- Team Lead, Casey Fakeworth: team standards; hiring; final say on who works which lead. (Source: Roles list)
- Operations Coordinator, Pat Exampleton: Follow Up Boss; showing schedule; SOPs. (Source: Roles list)
- Buyer Agents, Lou Testerly, Mina Sampleford and Ari Notaperson: buyer consults and showings. (Source: Roles list)
- Listing Agent, Sol Madeupson: listings and seller updates. (Source: Roles list)
- Showing Assistant, Bea Placeholdia: confirms showings and collects feedback. (Source: Roles list)

## Not in Your Documents
- Who handles contract to close. Ask Casey Fakeworth.
- Which role sends contract, legal and compliance questions to the broker. Ask Casey Fakeworth.
- Team channels or shared inboxes, if you use them. Ask Pat Exampleton.
```

### processes.md

```
# Processes: Brambleton Example Group

Built from: SOP: Booking and Running Showings (owner Pat Exampleton, dated May 2, 2025, stale). Built November 10, 2026 by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## Showings (stale: dated May 2, 2025)
1. Before any showing, the buyer agreement is signed. No exceptions. (Source: Showing SOP, step 1; stale)
2. Request every showing in ShowingTime at least 24 hours ahead. (Source: Showing SOP, step 2; stale)
3. Text the buyer the showing schedule the night before. (Source: Showing SOP, step 3; stale) [See the team line on texting consent in the team instructions: text only buyers who agreed to texts; email the others.]
4. Bea confirms each showing the morning of. (Source: Showing SOP, step 4; stale)
5. Leave feedback for the listing agent within 24 hours. (Source: Showing SOP, step 5; stale)
6. Log each showing in Follow Up Boss as an appointment. (Source: Showing SOP, step 6; stale)
7. Never share lockbox codes in a text or email. They come through ShowingTime only. (Source: Showing SOP, step 7; stale)

## Not in Your Documents
- The buyer consult and how the buyer agreement is signed. Ask Casey Fakeworth.
- The listing process and seller updates. Ask Sol Madeupson.
- The contract to close handoff. Ask Casey Fakeworth.
- Whether the Showing SOP is still current. Ask Pat Exampleton.
```

## Personal Layer Template

Send this to every agent. Each agent fills in their own; nothing is filled in for them.

```
MY PERSONAL LAYER: [Your Name], [Your Role], Brambleton Example Group

TEAM LINES I CANNOT OVERRIDE
The Team Lines in our team instructions always come first: fair housing, texting consent, drafts only, money and account details, client details, the signed buyer agreement before any showing, and lockbox codes only through ShowingTime. Brand and lead-handling lines will join them when the team writes them. If anything below conflicts with them, follow the team line.

MY VOICE
[Paste your voice profile QUICK CARD here, from amplifiedimpact.io/voice-profile. It may set your voice and format. It may not change the team lines. No QUICK CARD yet? Leave this blank.]

MY ROLE AND GOALS
Role: [your role from the roles list]
This quarter I'm working on: [your goals, in your own words]

HOW I LIKE ANSWERS
[For example: short, bullet points, or a draft first and the reasons after.]

KEEP OUT OF HERE
No client names, phone numbers, addresses or deal details. Those stay in Follow Up Boss.
```

**Where each agent puts it (Claude Pro, each agent's own project):** in their own project's instructions, under the team instructions ("Set project instructions," paste the team block, then the personal layer, then "Save instructions"), or in Settings, then "Your Claude," then "Instructions," which applies to all their chats (Claude Help Center, "How can I create and manage projects?" and "Understanding Claude's personalization features," read 2026-11-10). The help center doesn't say which wins when the two disagree, so the team instructions tell Claude the team lines win. On Pro, each agent can edit their own copy, so this is a written rule Claude follows, not a lock.

## Rollout Checklist

For agents who each pay for their own Claude Pro. Claude Pro has no project sharing (Claude Help Center, "What are projects?", read 2026-11-10), so Casey hands out the files and every person builds their own project. You do every step; this skill doesn't create, share or send anything.

1. **Answer the flags** (Casey): the questions in Flag 2. Each answer that becomes a written document goes into the next re-run.
2. **Broker review** (Casey, with Placeholder Peak Realty's broker): the five house lines and Showing SOP step 3. State rules were not checked.
3. **Make one project yourself first** (Casey): Projects in the left sidebar (or claude.ai/projects), then "+ New Project," a name such as Brambleton Team (Claude Help Center, "How can I create and manage projects?", read 2026-11-10).
4. **Add the brain** (Casey): "Set project instructions," paste the team instructions, "Save instructions." Click "+" in the knowledge base on the right and add the two knowledge files.
5. **Test before handing it out** (Casey). Ask these in a new chat in the project:
   1. "Can I show a home before the buyer agreement is signed?" Expected: no, no exceptions (team line 6; processes.md, from Showing SOP, step 1, marked stale).
   2. "How far ahead do I request a showing?" Expected: at least 24 hours, in ShowingTime (processes.md, from Showing SOP, step 2).
   3. "Can I text a lockbox code to the buyer's agent?" Expected: no; lockbox codes come through ShowingTime only (team line 7; processes.md, from Showing SOP, step 7).
   4. "When is showing feedback due?" Expected: within 24 hours, to the listing agent (processes.md, from Showing SOP, step 5).
   5. "Who confirms showings?" Expected: Bea Placeholdia, the morning of (processes.md, from Showing SOP, step 4; roles-and-routing.md).
   6. For a person: "How fast do I have to call a new online lead?" Expected: not in the files; ask Casey Fakeworth and Pat Exampleton.
6. **Hand it out** (Casey): send each person the team instructions, the two knowledge files and the personal layer template, the way you already share team files. Each person repeats steps 3 and 4 in their own account, then adds their personal layer.
7. **Send this note** (Casey). Draft, for you to edit and send:

   **Subject: Set Up Your Brambleton Team Project This Week**

   Hi team,

   I've put our team rules into one set of Claude instructions and two files, so your drafts follow the way we work. Because each of us has our own Claude Pro, everyone sets up their own copy.

   Here's what to do:
   - In Claude, make a new project, paste the team instructions into its instructions, and add the two files.
   - Fill in the personal layer template with your voice profile QUICK CARD and your goals, and paste it under the team instructions.
   - Never add a client's name, number or deal details to the project. Client records stay in Follow Up Boss.

   When I send an updated file, replace the old one. If an answer looks wrong, tell me.

   Casey

8. **Training settings** (each person): on Claude Pro, each person's own setting decides whether chats help train models: Settings, then Privacy, the switch that starts "Help improve" (Claude Privacy Center, checked 2026-11-08).
9. **When someone leaves:** on individual plans there's nothing to remove; their copy stays in their account. That's why the brain holds no client details.

If you'd rather have one shared project that agents can't edit, sharing needs a Claude Team or Enterprise plan (Claude Help Center, "What are projects?", read 2026-11-10). That's a plan decision for you; this skill doesn't recommend one.

## Quarterly Refresh

Once a quarter, on a date you put on the calendar:

1. **Collect what changed** (each document's owner): Pat Exampleton for the Showing SOP; Casey Fakeworth for the roles list and any new documents.
2. **Re-run this skill in update mode** (Casey): attach the current team instructions, the knowledge files and the new or changed documents, and say "Update our team brain." It raises the version (1.0 to 1.1) and lists every change.
3. **Re-check stale documents** (owners): the Showing SOP is already stale; date the roles list when you next edit it.
4. **Re-check the plan facts** (Casey): open the Claude help center pages cited in the rollout.
5. **Ask agents for wrong answers** (Casey): fix the source document first, then re-run.
6. **Send the update** (Casey): on individual plans, every person replaces their files and instructions; ask each to confirm.
7. **Broker check** (Casey): when the broker or a rule changes, review the house lines again.

Never collect or review an agent's personal layer, goals or voice profile; those are theirs.

## Check Before Sending

| Item | Where it's from |
|---|---|
| Brambleton Example Group; Placeholder Peak Realty; Boise, Idaho | Showing SOP, header |
| Every role and name | Brambleton roles list |
| Buyer agreement before any showing, no exceptions | Showing SOP, step 1 (stale) |
| ShowingTime, at least 24 hours ahead | Showing SOP, step 2 (stale) |
| Text the schedule the night before (flagged for consent) | Showing SOP, step 3 (stale) |
| Bea confirms the morning of; feedback within 24 hours | Showing SOP, steps 4 and 5 (stale) |
| Log each showing in Follow Up Boss as an appointment | Showing SOP, step 6 (stale) |
| Lockbox codes through ShowingTime only | Showing SOP, step 7 (stale) |
| Follow Up Boss as the team's CRM | Showing SOP, step 6; your message ("FUB") |
| Placeholders still open: brand, lead handling, voice defaults, the broker route, contract to close | Flag 2 |
| No project sharing on Claude Pro; Free limits | Claude Help Center, "What are projects?" and "Project visibility and sharing," read 2026-11-10 |
| New Project, Set project instructions, the knowledge "+" | Claude Help Center, "How can I create and manage projects?", read 2026-11-10 |
| Settings, Your Claude, Instructions | Claude Help Center, "Understanding Claude's personalization features," read 2026-11-10 |
| Training switch on Pro | Claude Privacy Center, checked 2026-11-08 |
| The five house lines | For your broker; this skill's compliance notes, last verified 2026-11-10 |
| The note to agents: subject, "two files," and the setup steps | Rollout step 7 |
