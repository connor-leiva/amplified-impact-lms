# Templates: The Seven Pieces of a Team Brain

Fill each template from the team's documents only. A bracket the documents don't fill stays a bracket and goes in Flags. Keep the team's wording for every rule. No em dashes in anything you write.

## 1. Flags and Bottom Line

**Flags**, only the ones that apply, in this order:
1. **Client data request: declined**, with the three reasons from `brain-build-rules.md` section 4, in one or two sentences, and what to do instead.
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
1. [TEAM LINE: NOT OVERRIDABLE] [fair housing line from compliance-lines.md]
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

Under the template, say where each agent puts it, for the team's plan (`claude-team-workspace.md`, the plan table).

## 5. Rollout Checklist

Numbered, in order, each step with who does it. The leader does everything; the skill does none of it.

1. **Answer the flags** (leader): the conflicts, the placeholders, the client data decision.
2. **Broker review** (leader, with the broker): the five house lines, the broker list from Flags, and in Utah mode the Utah questions.
3. **Make the project** (leader or ops, whoever will hold "Can edit"): the plan's click path from `claude-team-workspace.md`.
4. **Paste the team instructions; upload the knowledge files** (same person). Upload the knowledge files, not the original documents: the originals hold the items this skill left out.
5. **Test before sharing** (leader): five test questions, each with the answer the files should give and its source, plus one the files should send to a person. Write them the way agents ask.
6. **Share** (leader): the plan's sharing steps, with agents on view or chat access and only the leader and ops on edit. On individual plans: send each agent the instructions, the knowledge files and the personal layer template, and the steps to make their own project.
7. **Send the personal layer template and a short note** (leader): a draft note with a Title Case subject: what the project is for, where to start chats, the personal layer and where it goes, what never goes in (client details), and who to tell when an answer looks wrong. Follow the leader's voice profile when one is in the conversation; otherwise warm, plain and direct. Sign with the leader's name or [Team Leader Name].
8. **Training settings** (each person): on individual plans, the training switch; on Team, Enterprise and Business plans, say chats aren't used for training by default.
9. **When someone leaves** (leader): the plan's remove-access step, the same day.

Every plan-dependent step says which plan it's for and cites the help center page and date from `claude-team-workspace.md`.

## 6. Quarterly Refresh

A routine the leader puts on the calendar, once a quarter, on a date they choose:

1. **Collect what changed** (each document's owner): new or edited SOPs, scripts, brand rules, compliance notes, roles and lead flow.
2. **Re-run this skill in update mode** (leader): the current instructions and knowledge files, plus the changed documents. It raises the version and lists every change.
3. **Re-check stale documents** (owners): anything now more than 12 months old.
4. **Re-check the plan facts** (leader or ops): open each help center page in `claude-team-workspace.md`; sharing and settings move often.
5. **Ask agents for wrong answers** (leader): any answer that missed or cited the wrong document. Fix the source document first, then the pack.
6. **Check access** (leader): remove anyone who left; confirm agents are on view or chat access.
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
