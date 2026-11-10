# Build Rules: Reading and Sorting the Team's Documents

This file is how the skill treats a team's documents. It states no law; the legal facts are in `compliance-lines.md` and `utah-team-brain-notes.md`, each with its Last verified date.

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

Then say what to do instead: agents look clients up in the CRM, and the brain holds how the team works with clients (the lead-handling and process files), never who the clients are. An agent may paste one client's details into their own private chat for one draft, when their plan keeps that chat private (Claude Team or Enterprise chats in a project, or any agent's own project). Never offer a workaround that stores client data in shared context.

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

- **Plan:** take it from the message. If it isn't there, give the plan table from `claude-team-workspace.md`, ask which plan the team uses, and write the rollout for Claude Team with one line for each other plan. Never guess a plan from the team's size.
- **Utah mode:** the team works in Utah (from the documents or the message). Read `utah-team-brain-notes.md`. Otherwise general mode: say "State rules were not checked," and name only federal law in the house lines.

## 9. Update Mode

When the leader uploads the current pack (instructions and knowledge files) with new or changed documents, read the pack first, change only what the new documents change, raise the version (1.0 to 1.1), keep every source line, and list every change at the top of the rollout as "What changed."
