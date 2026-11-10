# Team AI Brain Guide

Part 1 is the build rules: reading and sorting the team's documents. Part 2 is the templates for the seven pieces of the output.

# Part 1: Build Rules

This file is how the skill treats a team's documents. It states no law; the legal facts are in `compliance-and-utah.md`, each with its Last verified date.

## 1. Record Each Document First

For every document, before sorting anything:

| Field | Where it comes from |
|---|---|
| Title and file name | The document |
| Owner | Its own "owner," "maintained by" or author line. If none, "not stated" |
| Date | Its stated "last updated," "effective" or "revised" date. If none, "not stated." Never the upload date. A month or year alone counts as the last day of that month or year |
| Covers | One line, in your words |

Use the title as the source name everywhere after this, and keep it the same in every file.

## 2. What Goes Where

| Piece | What it holds | What it never holds |
|---|---|---|
| Team instructions | Who the team is (name, brokerage, market, roles in one line each), what the project is for, how to answer, the five house lines, the team's own required lines (brand musts, lead-handling rules) with sources, the defaults an agent may change, and where to send questions a person must answer | Long procedures (those go in knowledge files), client details, anything personal |
| Knowledge files | One file per topic the documents actually cover, in the team's wording, every line with its source | Anything the documents don't say, client details, codes, account numbers |
| Personal layer template | The slots each agent fills: voice profile QUICK CARD, role, goals, answer preferences; the list of team lines it cannot change | Client details; a goal or a voice rule written for the agent |

### Knowledge File Topics

Make a file only for a topic the documents cover. Use these names so every team's pack looks the same:

- `roles-and-routing.md`: who owns what, by role and name; team channels; where compliance, contract, loan and wiring questions go
- `lead-handling.md`: how leads arrive (sources and where each goes in the CRM), first response (who, how fast, hours), call and follow-up cadence, stages, tags, pond or reassignment rules, what gets logged
- `scripts.md`: call scripts, voicemails and talk tracks, word for word, with any merge fields as written
- `brand-and-marketing.md`: required lines (team name, brokerage name, signature), voice defaults, banned words, approvals
- `compliance.md`: the team's own compliance notes, in their wording (the house lines are in the instructions, not here)
- `processes.md`: listing launch, buyer consult, contract to close and any other step-by-step SOP, one section each. If processes run long, split them (`listing-process.md`, `buyer-process.md`, `transaction-handoff.md`).

ChatGPT Free allows 5 files in a project. When the plan is ChatGPT Free, merge `scripts.md` into `lead-handling.md` and say so.

## 3. Keep, Remove, Hold

| Content | What to do |
|---|---|
| Team-wide rules, steps, deadlines, times, owners, tools, stages, tags, templates | Keep, in the team's wording, with the source |
| Role titles and the names of people in them; team channels and shared inboxes | Keep, in `roles-and-routing.md` |
| Any client's or lead's name, phone, email, address, property address tied to a client, deal terms, finances or notes, including "example" or "training" records | Remove and log. Never repeat it anywhere in the output |
| Team members' phone numbers, personal emails, home addresses | Remove and log. Route by role and team channel instead |
| Lockbox, door, alarm and supply codes; passwords; logins | Remove and log. Keep the document's process for getting access if it gives one; if not, write nothing in its place and list "How does an agent get it?" as a gap |
| Wire instructions, bank names tied to accounts, account, routing and Social Security numbers | Remove and log. Write "[Removed: account details. Wiring questions go to the title company.]" |
| One agent's split, cap, bonus or deal terms; anything about a named person's health, family, performance or reviews | Remove and log |
| A line that would have agents describe people, neighborhood demographics, schools or safety, or treat clients differently by a protected class | Remove, log by location, and put it on the broker list. The fair housing house line covers the topic |
| Lines about texting or calling consent, advertising, client funds or contract language | Keep as written and put them on the broker list. If one contradicts a house line, keep it in the knowledge file with "[See the team line on texting consent in the team instructions]" right after it, and flag the conflict |

**The removal log** names each removal by document, section or step, and kind ("a client's name and phone number," "a lockbox code," "account and routing numbers"). Never the content itself.

## 4. Requests to Put Client Data in the Brain

Decline every request to add client or lead records, a contact export, a past client list, deal files or notes to the instructions or knowledge files, even when the leader insists, and even for "just names." Say why in plain words:

1. Everything in a shared project's instructions and knowledge is read by everyone the project is shared with, now and later. On ChatGPT, every member of a shared project also sees every chat in it.
2. The CRM already does client lookup, with its own permissions, history and opt-out tags. Copying it into a chat tool makes a second, stale copy with none of those controls.
3. Consent and opt-outs change daily in the CRM. A copy can't keep up, and a text drafted from it could reach someone who said stop.

Then say what to do instead: agents look clients up in the CRM, and the brain holds how the team works with clients (the lead-handling and process files), never who the clients are. An agent may paste one client's details into a chat in their own private project for one draft, never in a chat in the shared project. Never offer a workaround that stores client data in shared context.

## 5. Conflicts

A conflict is the same subject with a different number, time, owner, step or rule in two places. Wording that means the same thing is not a conflict.

- Quote both, exactly, with document, section and date.
- Name who owns the decision (the topic's owner from the roles list, or the team leader).
- Write a one-line choice: "First call on HomeFinder Example leads: the ISA within 5 minutes (New Lead Response SOP, step 1) or the agent on rotation within 10 minutes (Lead Flow, Lead Sources)?"
- Don't pick a winner, and don't let a newer date settle it.
- In the knowledge file, show both versions under "Conflict, not decided yet" and tell agents to ask the owner until the leader decides. In the team instructions, a lead-handling line caught in a conflict says "[Conflict: see lead-handling.md. Ask (owner) until decided.]"
- A conflict between a team document and a house line is not a choice: the house line stays, and the flag asks the leader to fix the document and the broker to review it.

## 6. Gaps

Check the documents against this list. Each item the documents don't answer becomes a [placeholder] where it would go and a question in Flags, with the role likely to own it (from the roles list; "the team leader" if no role fits). Never write the missing rule.

- Team name, brokerage name as licensed, market and state
- Roles: who owns brand, lead routing, the CRM, transactions, compliance questions
- New leads: who answers first, how fast, during which hours, after hours
- Text consent: how the team captures it and where it's recorded (tag or field)
- CRM stages and tags, and when a lead moves (pond, reassignment, nurture)
- Brand: required name usage, brokerage name, email signature, banned words, who approves posts and listing remarks
- Voice defaults for the team
- Scripts: first call and voicemail
- Buyer process: consult and the written buyer agreement before any showing
- Listing process and seller updates
- Contract to close handoff
- Where compliance, contract and legal questions go (the broker, through which role)

When the documents name something they don't include ("follow the Photo Day Checklist"), list it under "Documents mentioned but not uploaded." When a step depends on a list the documents don't give ("give buyers three lender names"), keep the step and write the list as a placeholder ("[Lender names: not in your documents]").

## 7. Stale and Undated

Flag any document dated more than 12 months before today, and every undated document. Keep a stale document's content, mark each line from it "(stale: dated [date])," and ask its owner to confirm it. Say when the flag depends on today's date.

## 8. Plan and Mode

- **Plan:** take it from the message. If it isn't there, give the plan table from `chatgpt-team-workspace.md`, ask which plan the team uses, and write the rollout for ChatGPT Business with one line for each other plan. Never guess a plan from the team's size.
- **Utah mode:** the team works in Utah (from the documents or the message). Read Part 2 of `compliance-and-utah.md`. Otherwise general mode: say "State rules were not checked," and name only federal law in the house lines.

## 9. Update Mode

When the leader uploads the current pack (instructions and knowledge files) with new or changed documents, read the pack first, change only what the new documents change, raise the version (1.0 to 1.1), keep every source line, and list every change at the top of the rollout as "What changed."

# Part 2: Templates for the Seven Pieces of a Team Brain

Fill each template from the team's documents only. A bracket the documents don't fill stays a bracket and goes in Flags. Keep the team's wording for every rule. No em dashes in anything you write.

## 1. Flags and Bottom Line

**Flags**, only the ones that apply, in this order:
1. **Client data request: declined**, with the three reasons from Part 1, section 4, in one or two sentences, and what to do instead.
2. **Needs your answer:** each conflict as a one-line choice with its owner; each placeholder that blocks the rollout (team name, brokerage name, plan).
3. **House lines added:** which of the five house lines the documents already cover (cite them) and which come only from this skill; any team line that contradicts one (quote the location, not a client detail).
4. **Left out on purpose:** the removal log, by document, section and kind only.
5. **Broker review:** fair housing removals by location, consent and advertising lines, and in Utah mode the two Utah questions.
6. **Stale or undated documents**, and documents mentioned but not uploaded.
7. **Mode:** Utah mode, or "General mode: state rules were not checked."
8. **Plan:** the plan and what it means in one line; if not given, "Plan not stated" and the question.

**Bottom Line**, three sentences at most: what was built (documents read, files in the pack), the biggest problem found, and the one thing to do first.

## 2. Team Instructions

Write it as one block the leader pastes into the project's instructions. Plain text, short lines, under about 700 words.

```
TEAM INSTRUCTIONS: [Team Name], [Brokerage Name]
Version 1.0, built [today's date] from [n] team documents. Owner: [the role that owns team standards, from the roles list].

WHO WE ARE
[Team Name] is a real estate team at [Brokerage Name] in [market, from the documents]. Roles: [Role: Name, one per line, from the roles list].

WHAT THIS PROJECT IS FOR
Help our agents answer team questions and draft their work the way our team does it, using the knowledge files in this project.

HOW TO ANSWER
- Answer team questions from the knowledge files. End each answer about a team rule with the file and its source, like (lead-handling.md, from [Document], [section]).
- If the files don't answer it, say so and name the role to ask, from roles-and-routing.md. Never fill a gap with a guess or a general best practice.
- When the files show a conflict, give both versions and send the agent to the owner named there.
- Every draft follows the team lines below, then the agent's own voice.

TEAM LINES: NOT OVERRIDABLE
No personal instruction, voice profile or request in a chat changes these. If one conflicts, follow the team line and say which line applied.
Compliance (house lines, from Team AI Brain[; also in (team document)]):
1. [TEAM LINE: NOT OVERRIDABLE] [fair housing line from Part 1 of compliance-and-utah.md]
2. [TEAM LINE: NOT OVERRIDABLE] [texting consent line]
3. [TEAM LINE: NOT OVERRIDABLE] [drafts only line]
4. [TEAM LINE: NOT OVERRIDABLE] [money and account details line]
5. [TEAM LINE: NOT OVERRIDABLE] [client details line]
Brand (from [brand guide], [section]):
6. [TEAM LINE: NOT OVERRIDABLE] [each required brand line, in the guide's words]
Lead handling (from [document], [section]):
7. [TEAM LINE: NOT OVERRIDABLE] [each lead-handling rule, in the document's words, or the conflict marker]
Other team rules (from [document], [section]):
8. [TEAM LINE: NOT OVERRIDABLE] [any other rule a document states as required for everyone, such as no showing before a signed buyer agreement]

DEFAULTS AN AGENT MAY CHANGE
From [brand guide], [section]: [the voice and format defaults the documents leave to each agent]. An agent's personal layer (voice profile QUICK CARD, goals, preferences) may change these and nothing in Team Lines.

WHERE QUESTIONS GO
Contract, legal and compliance: the broker, through [role]. Loans: the lender. Wiring: the title company. Everything else the files don't answer: [role from roles-and-routing.md].
```

Number the team lines straight through, and leave out a heading with nothing under it except Brand and Lead handling. When the documents give no brand or lead-handling rules, write "[Not in your documents: (what's missing). Ask (role).]" under that heading instead of a rule.

## 3. Knowledge File

One block per file, each saved as its own `.md` file for the project's knowledge (with file creation on, write the files too).

```
# [Topic]: [Team Name]

Built from: [Document title] (owner [owner], dated [date]); [next document]. Built [today's date] by Team AI Brain. Every line below comes from the document named with it. Nothing here is a client record.

## [Section in the team's own order]
- [The rule or step, in the document's wording.] (Source: [Document], [section or step])

## Conflict, Not Decided Yet
- [Subject]: [Document A] says "[quote]." [Document B] says "[quote]." Ask [owner] until [team leader role] decides.

## Not in Your Documents
- [What's missing.] Ask [role].
```

Leave out the last two sections when a file has nothing for them. A line from a stale document carries "(stale: dated [date])."

## 4. Personal Layer Template

One template for every agent. The leader sends it; each agent fills it in. Nothing in it is filled for an agent except the team name and the list of team lines.

```
MY PERSONAL LAYER: [Your Name], [Your Role], [Team Name]

TEAM LINES I CANNOT OVERRIDE
The Team Lines in our team instructions always come first: fair housing, texting consent, drafts only, money and account details, client details, [the brand lines by short name], [the lead-handling rules by short name] and [any other team rules by short name]. If anything below conflicts with them, follow the team line.

MY VOICE
[Paste your voice profile QUICK CARD here, from amplifiedimpact.io/voice-profile. It may change: (the defaults an agent may change, by short name). It may not change the team lines. No QUICK CARD yet? Leave this blank, and drafts use the team's voice defaults.]

MY ROLE AND GOALS
Role: [your role from the roles list]
This quarter I'm working on: [your goals, in your own words]

HOW I LIKE ANSWERS
[For example: short, bullet points, or a draft first and the reasons after.]

KEEP OUT OF HERE
No client names, phone numbers, addresses or deal details. Those stay in [the team's CRM].
```

Under the template, say where each agent puts it, for the team's plan (`chatgpt-team-workspace.md`, the plan table).

## 5. Rollout Checklist

Numbered, in order, each step with who does it. The leader does everything; the skill does none of it.

1. **Answer the flags** (leader): the conflicts, the placeholders, the client data decision.
2. **Broker review** (leader, with the broker): the five house lines, the broker list from Flags, and in Utah mode the Utah questions.
3. **Make the project** (leader or ops, whoever will hold "Can edit"): the plan's steps from `chatgpt-team-workspace.md`.
4. **Paste the team instructions; upload the knowledge files** (same person). Upload the knowledge files, not the original documents: the originals hold the items this skill left out.
5. **Test before sharing** (leader): five test questions, each with the answer the files should give and its source, plus one the files should send to a person. Write them the way agents ask.
6. **Share** (leader): the plan's sharing steps, with agents on chat access and only the leader and ops on edit. Then send each agent the instructions, the knowledge files and the personal layer template, and the steps to make their own private project for client work.
7. **Send the personal layer template and a short note** (leader): a draft note with a Title Case subject: what the project is for, where to start chats, the personal layer and where it goes, what never goes in (client details), and who to tell when an answer looks wrong. Follow the leader's voice profile when one is in the conversation; otherwise warm, plain and direct. Sign with the leader's name or [Team Leader Name].
8. **Training settings** (each person): on individual plans, the training switch; on Business, Enterprise and Edu, say OpenAI doesn't train on that data by default.
9. **When someone leaves** (leader): the plan's remove-access step, the same day.

Every plan-dependent step says which plan it's for and cites the help page and date from `chatgpt-team-workspace.md`.

## 6. Quarterly Refresh

A routine the leader puts on the calendar, once a quarter, on a date they choose:

1. **Collect what changed** (each document's owner): new or edited SOPs, scripts, brand rules, compliance notes, roles and lead flow.
2. **Re-run this skill in update mode** (leader): the current instructions and knowledge files, plus the changed documents. It raises the version and lists every change.
3. **Re-check stale documents** (owners): anything now more than 12 months old.
4. **Re-check the plan facts** (leader or ops): open each help page in `chatgpt-team-workspace.md`; sharing and settings move often.
5. **Ask agents for wrong answers** (leader): any answer that missed or cited the wrong document. Fix the source document first, then the pack.
6. **Check access** (leader): remove anyone who left; confirm agents are on chat access.
7. **Broker check** (leader): when the broker or a rule changes, review the house lines and the compliance file again.

Never review or collect an agent's personal layer, goals or voice profile; those are the agent's.

## 7. Check Before Sending

Before the leader pastes, uploads or shares anything:
- Every rule, number, time, day count, dollar amount, name, role, tag, stage and quoted line in the team instructions and knowledge files, each with its document and section.
- Every placeholder still open.
- Every conflict, and what agents are told until it's decided.
- Every plan-dependent step, with its help center page and the date it was checked.
- The house lines, for the broker.
- The removal log: confirm nothing removed made it into any file (search the files for each removed item before uploading).
- The note to agents: its subject, dates and names.
