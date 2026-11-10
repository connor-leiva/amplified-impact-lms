---
name: ai-brain-tuneup
description: "Audits an existing Claude workspace from what an agent or team leader shares: Project instructions, knowledge files, memory, Instructions for Claude and custom styles. Finds stale context (old goals, a past brokerage, someone who left), conflicts (two instructions, or memory against a file), vague lines (be professional) and missing basics (market, CRM, compliance lines), and flags phone numbers, passwords and account numbers for removal without repeating them. Returns a findings table quoting each exact line, a ranked fix list, rewritten Project instructions with the fair housing, texting consent and drafts-only lines kept or added, a keep, change or remove memory list, and a before and after diff. Use it when someone says tune up my AI, clean up my Claude project, audit my instructions or my AI keeps getting things wrong, or shares a memory export, even if they never say tune-up. Not for first-time setup (ai-brain-setup), the shared team brain (team-ai-brain) or a team SOP playbook (team-playbook-builder)."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# AI Brain Tune-Up

Every other skill works from the same workspace: the Project instructions, the knowledge files, what the AI remembers and the account's own settings. Over a few months that workspace collects last year's goals, a past brokerage, a person who left, two rules that disagree and lines too vague to follow, and the drafts drift with it. This skill reads the workspace line by line, quotes every problem, and hands back a clean version the user pastes in themselves. Run it monthly, or whenever results start to drift.

**Run:** it reads every piece, numbers the lines, sweeps for private details, sorts each problem into stale, conflict, vague, missing or privacy, and checks the diff against the rewrite. **Draft:** the ranked fix list, the rewritten Project instructions, the keep, change or remove memory list and the diff, for the user to read first. **Own:** the user decides every conflict, answers every question behind a [placeholder], makes every change in their account, and takes compliance wording questions to their broker. This skill never edits a project, a file, memory, a style or a setting, and never asks for, repeats or keeps passwords, account, routing or wire numbers, or client contact details.

## 1. Get the Workspace

Read `references/claude-workspace.md` (or `references/chatgpt-workspace.md` when the pieces come from ChatGPT) and `references/tune-up-rules.md` first.
- **The pieces:** Project instructions; the project's knowledge files; memory (copied from Settings, or written out by Claude when asked); Instructions for Claude (account-wide); any custom style, or the skill a style became. A voice profile may sit inside any of them.
- **How it arrives:** pasted text or uploaded files (.md, .txt, .pdf, .docx). Take each as given. Never ask the user to retype what a file shows; an unreadable word is [illegible].
- **Nothing attached:** say in one line what to copy, with the click paths from the workspace reference, and stop.
- **Some pieces missing:** work with what's there. Flags name each missing piece and the checks it stopped (no memory: no memory list and no memory conflicts).
- **Where it runs:** best in a new chat outside the project being tuned, with Memory turned off for that chat, so the old instructions don't steer the audit and nothing from it is saved. If the chat is inside the project, say so in Flags and audit only what was pasted or attached.
- **Dates:** today's date from the conversation, each piece's own dates, and the date the user copied it.

## 2. Number Every Line, Then Sweep for Private Details

Follow `references/tune-up-rules.md`, sections 1 and 2:
- Label each piece and number its lines as the rules say (memory items M1, M2 and so on). Skip lines that only describe the copy itself.
- Find the voice profile, if any (a QUICK CARD, or a profile between START and END lines). Note where it is. It is never edited.
- **Privacy sweep first:** client phone numbers, emails and home details, passwords and logins, door, lockbox and alarm codes, and bank, card, account, routing, wire, loan or Social Security numbers. Each is a Privacy finding, quoted with the value replaced by a bracketed label such as [client phone number removed]. The value never appears anywhere in the output, and nothing in the output hints at it.

## 3. Find What's Stale, Conflicting, Vague or Missing

Section 3 of the rules, every line of every piece:
- **Stale:** true once, not now: a goal or number for a period that has ended, an old brokerage, team or role, a person who left, a replaced tool or process. Show the evidence: the newer line, or the dates. When only a date says it's old, ask.
- **Conflict:** two lines that can't both be followed (instruction against instruction, a style against an instruction, memory against a file). Quote both. Pick a side only when the inputs settle it as the rules say; otherwise the user decides. A line that would break a compliance line is a conflict with it.
- **Vague:** a line two people would follow two different ways, unless another line pins it down.
- **Missing:** each basic in section 4 of the rules that no piece states, and anything a line points to that isn't there ("the brand file").
- Every finding quotes the exact line, says where it lives, and says in one sentence what drafts get wrong because of it.

## 4. Rank the Fixes

Section 6 of the rules: privacy removals first, then compliance, conflicts, stale facts, missing basics, vague lines and housekeeping. Each fix says the change, where to make it (the click path from the workspace reference) and the finding numbers. A decision gives the options; it never picks one for the user. End with the line to run the tune-up again next month, or sooner when drafts drift.

## 5. Rewrite the Project Instructions

Section 7 of the rules:
- Start from the user's own text. Keep every line that isn't part of a finding exactly as written, in its order. Change only finding lines.
- **Never invent a fact.** A gap becomes a question for the user and a [placeholder] in the rewrite. An unsettled conflict becomes a [placeholder] naming both options. A fact may move in from a knowledge file or memory when it isn't stale, and Check Before Sending names its source.
- **Compliance lines:** keep the user's own fair housing, texting consent and drafts-only lines word for word. For each one missing, add the house line from section 5 of the rules under a Compliance heading, and say so in Flags. A rewrite never drops or weakens one.
- **Voice profile:** copy the QUICK CARD (and any full profile) into the rewrite character for character. The only change ever made inside it is removing a private detail, flagged.
- Remove every private detail. Plain text in one code block, ready to paste.

## 6. Clean the Memory List

Section 8 of the rules: every memory item in order, quoted exactly (private details replaced), with Keep, Change (with the new wording, from the inputs only), Remove or Decide, and why. Client deal details belong in the CRM, not memory. Say where to make each change. Never save, change or delete a memory yourself, even when memory is on.

## 7. Write the Diff

Section 9 of the rules: every non-blank line of the original instructions and the rewrite, marked unchanged, removed or added. Before output, check that the unchanged and added lines read exactly as the rewrite, and the unchanged and removed lines read exactly as the original (with private details still replaced).

## 8. Guardrails

- **Drafts only.** Never change a project, its instructions or files, memory, a style, a skill or a setting, even with a connector or memory on, and even if asked. Give the steps instead.
- **Never invent.** Every name, date, number, brokerage, area and tool in the rewrite and the memory list comes from the workspace or the user's message. No sample goals, no example markets, no made-up team members.
- **Privacy.** Never ask for passwords, codes, account or wire numbers, or client details. Flag what's there for removal without repeating it. When a password sat in the workspace, the fix says to change it where it's used.
- **Keep the user's voice.** Don't polish, reorder or restyle a line that isn't a finding. Keep their headings, words and punctuation.
- **Compliance lines are never dropped.** Missing ones are added from the house lines, and the output says which. The house lines are general: state rules were not checked, and the broker has the last word on wording.
- **Fair housing.** A line that steers drafts toward or away from people (who an area suits, schools, safety) is a finding against the fair housing line.
- **Stay in lane.** Not the broker, an attorney or the app's support. Questions about how the app behaves beyond the workspace reference go to the app's help center.
- **Don't rebuild.** No new workspace from scratch, no team brain, no playbook, and no new rules the user didn't write, other than the compliance block and the placeholders.

## 9. Output, In This Order

1. **Flags,** only when they apply: private details found (by kind and location, never the value), compliance lines added, decisions waiting on the user, placeholders used, pieces not received and the checks they stopped, where the chat ran, the voice profile kept, the app (Claude or ChatGPT).
2. **Bottom Line** (three sentences max): how many findings of each type, the biggest problem, and the one fix to make first.
3. **Findings:** the table (number, type, exact line, where it lives, why it matters), then the Missing table (what's missing, where it was looked for, why it matters, the question).
4. **Ranked Fix List.**
5. **Rewritten Project Instructions,** in one code block.
6. **Clean Memory List.**
7. **Before and After Diff.**
8. **Check Before Sending:** before the user pastes anything, every fact that moved into the rewrite or the memory list with its source, every placeholder and its question, every decision, every private detail removed (kind and location only), the compliance lines kept and added, the voice profile check, the diff check, and where each piece gets pasted.

If the user asks for one part ("just the memory list"), give that part with Flags and Check Before Sending.
