# Playbook Template

The generated skill is a folder named `team-slug-playbook` with this shape:

```
team-slug-playbook/
  SKILL.md
  references/
    routing.md                  always: who owns what, the source documents, what isn't written yet
    onboarding.md               one file per topic the documents cover (list below)
    lead-routing-and-ponds.md
    ...
```

Nothing else goes in the folder: no test set, no removal log, no source documents. Those stay in the chat for the leader.

## Naming the Skill

Start from the team's name exactly as the documents write it, then:
1. Lowercase it. Turn accented letters into plain ones (é to e). Drop apostrophes ("O'Neil" to "oneil"). Drop "&" and a leading "The".
2. Replace every run of anything other than a to z and 0 to 9 with one hyphen. Trim hyphens from both ends.
3. Add `-playbook`. The whole name must be 64 characters or fewer: drop words from the end of the team part, never cut a word in half.
4. The name must not contain "claude" or "anthropic" anywhere, even inside a word (a team named for Claudette breaks this rule). Drop that word. If nothing is left, use the next word of the team name, or the brokerage's name. Say in one line why the name differs from the team's.
5. The folder name and the `name:` line must match exactly.

Examples: "Smith & Rivera Group" becomes `smith-rivera-group-playbook`. "The O'Neil Home Team" becomes `oneil-home-team-playbook`. "The Claudette Ruiz Team" becomes `ruiz-team-playbook`.

## Topic Files

Use these file names. Make a file only when the documents have content for it. Merge two topics into one file when one of them would hold fewer than three rules.

| File | What goes in it |
|---|---|
| `routing.md` | Always. Roles and what each owns; source documents; known gaps |
| `onboarding.md` | First days and weeks, checklists, training schedule, mentors |
| `lead-routing-and-ponds.md` | Lead sources, assignment, first contact, follow-up expectations, CRM stages, pond rules |
| `crm-and-tech.md` | The tech stack and how-tos (never passwords or logins) |
| `buyers-and-showings.md` | Buyer consultations, buyer agreements, showings, open houses |
| `listings.md` | Listing appointments, listing launch, listing marketing steps |
| `transactions-handoff.md` | What the agent does and what the transactions team does, from acceptance to close |
| `marketing-and-brand.md` | Brand rules, approvals, social media, signs, advertising with the brokerage name |
| `compensation-and-fees.md` | Only when the leader confirms the schedule applies to every agent |
| `meetings-and-expectations.md` | Team meetings, conduct, CRM logging, activity expectations as written |
| `time-off-and-coverage.md` | Vacations, coverage, availability hours |
| `leaving-the-team.md` | Offboarding, leads and pipeline when an agent leaves |
| `policies-and-compliance.md` | The team's written rules on compliance routing, fair housing, wire fraud warnings |

## The Generated SKILL.md

Fill every [bracket] from the documents. Keep the body under about 100 lines. Copy the structure exactly.

```
---
name: [team-slug]-playbook
description: Answers [Team Name] agents' questions about how the team works, from the team's own documents only, and names the document and section behind every answer. Covers [three to six covered topics in plain words]. Use whenever someone on [Team Name] asks what the team's rule is, how the team does something, who owns it, or where something lives, even if they never say "playbook." Not for contract, legal or compliance questions (the [broker role]), brokerage-wide policy ([Brokerage Name]'s own resources), or doing deal work such as pricing, offers or CRM cleanup.
metadata:
  author: [Team Name]
  version: "[1.0, or the next version in update mode]"
---

# [Team Name] Playbook

You answer [Team Name] agents' questions about how the team works, using only the files in `references/`. This playbook was built on [build date] from [N] team documents, listed in `references/routing.md`. The [policy owner role] owns every policy here. You report what the documents say. You don't make or interpret policy.

## How to Answer

1. Find the topic in the index below and read that file. For "who do I ask" questions, read `references/routing.md`.
2. Answer in a few plain sentences. Copy numbers, times, dollar amounts and deadlines exactly as written.
3. End with one line: "Source: [document], [section]."
4. If that section is dated more than 12 months before today, or has no date, add: "This section is dated [date]. Confirm it's still current with [owner]." (or "has no date").
5. If the references don't answer the question, say "The playbook doesn't cover that," and name the role to ask from `references/routing.md`. Don't guess, and don't fill in from general real estate practice, other teams or memory.
6. If the section is marked CONFLICT, say the team's documents disagree, give both versions with their sources, and send the agent to the [decision owner role] for the answer.

## Always Route These to a Person

- Contract language, addenda, disclosures, and legal or compliance questions: the [broker role]. Never draft contract language.
- Deposits, wires or any client funds: never give account or wire details. Send the agent to [the role the documents name].
- Brokerage-wide policy: [Brokerage Name]'s own resources or the [broker role].
- Anyone's individual pay, split or personal arrangement: the [team leader role].
- Tax, legal or loan questions for a client: the client's own CPA, attorney or lender.

## Guardrails

- Answer from the references only. When the wording leaves room for two readings, quote it and name the owner.
- Fair housing: describe processes and properties, never people. No comments on neighborhood demographics, schools or safety; point agents to official sources and the [broker role].
- Don't take actions. You don't send messages, change the CRM or edit team documents. You explain the team's written rules; [the systems and roles the documents name] run them.
- If an agent says an answer is wrong, tell them to send the question and the answer to the [playbook owner role].

## Topic Index

| Topic | File | Owner | Last updated |
|---|---|---|---|
| Who owns what | `references/routing.md` | [role] | [date] |
| [Topic] | `references/[file].md` | [role] | [date] |
```

The description must stay under 1,024 characters with no angle brackets. Aim for 400 to 700.

`author` is the team, because the policies are the team's. Everything else follows the same rules as the Amplified library's skills.

## A Topic File

```
# [Topic Title]

Owner: [role, plus the person's name only if the document names them in that role]
Last updated: [newest source date] (oldest source in this file: [date])
Sources: [document title] ([date]); [document title] ([date])

## [Subtopic]

- [The rule, in the team's wording.] (Source: [document], [section or page]; dated [date])
- [Next rule.] (Source: ...)

## CONFLICT: [What Disagrees]

- [Document A], [section] ([date]): "[exact quote]"
- [Document B], [section] ([date]): "[exact quote]"
- The team hasn't decided which applies. Give agents both versions and send them to the [decision owner role].
```

When the leader settles a conflict, replace the CONFLICT block with the chosen rule, keep its source, and add "(Confirmed by [role], [date])".

## routing.md

```
# Who Owns What

Owner: [playbook owner role]
Last updated: [build date]
Sources: [every document that names roles]

## Roles

| Role | Owns | How to reach | Source |
|---|---|---|---|
| [Role, and name if the document gives one] | [what they own] | [team channel or inbox the document names; never a personal phone number or personal email] | [document, section] |

## Documents This Playbook Was Built From

| Document | Owner | Dated |
|---|---|---|

## Not Written Yet

These questions come up and the team's documents don't answer them yet. Send agents to the role listed.

| Question | Ask |
|---|---|
```
