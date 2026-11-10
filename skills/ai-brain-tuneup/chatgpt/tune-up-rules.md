# Tune-Up Rules

How to read a workspace, what counts as each kind of finding, the house compliance lines, and how to write the rewrite, the memory list, the diff and Check Before Sending. Last verified: 2026-11-10. The compliance lines are Amplified Impact's house rules; they are general and were not checked against any state's rules.

## 1. Reading the Workspace

- **Label each piece** by what it is and where it came from: "Project instructions," "Knowledge: [file name]," "Memory," "Account instructions," "Style: [name]." Use the user's own names for projects, files and styles.
- **Number the lines.** In instructions, styles and files, count every non-blank line of the piece as given, from 1. Skip lines that only describe the copy itself (where or when it was copied, a "PRACTICE FILE" label, a heading the export tool added), and say once in Check Before Sending that they were skipped. Number memory items M1, M2 and so on, in the order given, one per entry or bullet. In a PDF, give the page and line.
- **Quote exactly.** A quote is the whole line as written, with only a leading list marker or heading marker left off ("- " or "## "). Never fix a typo in a quote. Private details are replaced by a bracketed label (section 2); that is the only change ever made to a quote.
- **The voice profile.** A block that starts "QUICK CARD" or "Write as me.", or a profile between "===== START OF PROFILE =====" and "===== END OF PROFILE =====" lines (from amplifiedimpact.io/voice-profile). Note where it sits. It is never edited (section 7).
- **Dates.** Today's date from the conversation. Each piece's own dates ("Prepared January 6, 2025," "Updated October 14, 2026," "since August 2026"). The date the user copied a piece, if given. A memory item with no date is undated: never assume when it was saved.

## 2. Privacy Sweep

Do this before any other finding. Flag and never repeat:
- A phone number, personal email, home address, birth date or ID number for anyone other than the user's own business contact lines (a signature block the user wrote for client emails is theirs to keep).
- A client's health, money or family details that a draft doesn't need.
- Passwords, logins, PINs, two-factor or recovery codes, API keys, and door, lockbox, alarm or gate codes.
- Bank, card, account, routing, wire, loan or Social Security numbers, and wire instructions of any kind.

Each one is a Privacy finding. Quote the line with only the value replaced by a label that says what it was: [client phone number removed], [personal email removed], [login email removed], [password removed], [routing number removed], [account number removed]. Never write the value anywhere: not in the table, the fixes, the rewrite, the memory list, the diff or Check Before Sending. Never hint at it ("ends in," "the 801 number," the first or last digits). A client's name may be quoted, since the user put it there; their contact details may not.

The fix for each: delete it where it lives. A password or login that sat in a workspace should also be changed in the account it opens. Deleting a chat doesn't remove memory made from it, so memory items are deleted on their own.

## 3. Finding Types

Every finding has a number, a type, the exact line (or two, for a conflict), where it lives (piece and line), and why it matters: one sentence on what drafts get wrong because of it.

**Stale:** a line that was true once and isn't now.
- A goal, number, plan or date range for a period that has ended by today's date ("2025 Goals" in November 2026).
- A brokerage, team, title, role or tool another piece says changed, or a person another piece says left.
- "This year," "currently" or "now" in a piece whose own date is more than 12 months before today.
Evidence: quote the newer line, or give the dates. When only a date says a line is old, say so and ask whether it still holds. Don't assume it changed.

**Conflict:** two lines that can't both be followed: instruction against instruction (in one piece or across pieces), a style against an instruction, memory against an instruction or a file, file against file. One finding, both quotes, each with where it lives.
- **Settled by the inputs** only when one line is dated or says what changed ("moved the team in March 2026," "since August 2026") and a second piece agrees with it (a file dated after the change names the new brokerage). Then the newer line wins, and the finding names both sources.
- **Otherwise the user decides.** The fix states both options in the user's own words; the rewrite holds a [placeholder] naming both (section 7). Never pick the more recent-sounding one, the more specific one or the one you'd prefer.
- **A line that would make a draft break a compliance line** (texting leads or recruits without consent, describing who an area suits, sending something) is a conflict with that compliance line, even when the compliance line is one this tune-up adds.
- Account-wide instructions reach every chat, inside projects too; a project line and an account line that disagree are a conflict.

**Vague:** a line two people would follow two different ways, or that no one could check a draft against: "be professional," "make it sound good," "use best practices," "help me with whatever I need," or a line that pulls two ways ("short but thorough"). When another line in the instructions pins it down (a QUICK CARD under "write in my voice"), it isn't a finding. When the line that pins it down lives only in memory or a file, it is "Vague (pinned)": quote both, and point the rewrite at what pins it down. Otherwise, replace it in the rewrite with a [placeholder] question. Never write a rule the user didn't give.

**Missing:** a basic from section 4 that no piece states, or something a line points to that isn't in the workspace ("the brand file" with no brand file). Missing items with no line to quote go in the Missing table. A line that points to something missing goes in the Findings table, quoted.

**Privacy:** section 2.

## 4. The Basics

For a real estate agent's, team leader's or ops person's workspace, look for each of these in every piece:
1. Who the user is: the name they sign with, their role, their team.
2. Brokerage.
3. Market: the cities, counties or areas served.
4. Team roles, when a team or helper is mentioned: who does what (transaction coordinator, assistant, buyer's agents, ops).
5. CRM and the tools the AI is asked to work with.
6. Voice: a voice profile QUICK CARD, or how client writing should sound.
7. How client writing is signed.
8. The compliance lines: fair housing, texting consent, drafts only.

When a basic is missing from the instructions but stated in another piece (memory, a file), and it isn't stale, it moves into the rewrite with its source. When no piece states it, it becomes a question and a [placeholder]. A missing voice profile is a question, never a written voice: point to amplifiedimpact.io/voice-profile.

## 5. The House Compliance Lines

Add each one, word for word, when the workspace has no line covering it:

- Fair housing: Describe properties, never people. No comments on who a home or area suits, neighborhood demographics, school quality or safety. Point to official sources instead.
- Texting consent: Draft a text only to someone I say agreed to get texts from me. Every marketing text names me and ends with "Reply STOP to opt out."
- Drafts only: Everything you write is a draft for me to read first. Never send, post or text anything, and never write to my CRM.

Rules:
- **The user's own lines come first.** Keep any fair housing, texting consent or drafts-only line the user wrote, word for word, wherever it is. When the user's line lives in a knowledge file but not the instructions, copy it into the instructions' compliance block word for word and cite the file, instead of the house line.
- **A topic covered only in part** (a line about schools only, or about leads but not recruits): keep the user's line and add the house line under it.
- Put added lines under a heading "Compliance (keep these lines)" at the end of the instructions, after the user's last line.
- Flags say which lines were added and that "The house lines are general; state rules were not checked. Ask your broker if your state or brokerage needs more."
- Never drop, shorten or soften a compliance line, the user's or the house's.

## 6. Ranking the Fixes

1. **Privacy:** each private detail, where it lives, deleted (and the password changed).
2. **Compliance:** lines that conflict with a compliance line, then the missing compliance lines (added in the rewrite).
3. **Conflicts** the user decides, and conflicts the inputs settled.
4. **Stale** facts, lines and files.
5. **Missing basics:** the questions.
6. **Vague** lines.
7. **Housekeeping:** client deal details moved out of memory.

Each fix: the change in one sentence; where to make it, with the click path from the workspace file; and the finding numbers. A decision gives the options; it never recommends one. When a whole file is stale, the fix is to remove it or replace it with a current one, and to keep any parts the user says still hold. The last line of the list: "Then run the tune-up again next month, or sooner when drafts start drifting."

## 7. The Rewrite

- **Which piece:** the Project instructions. With none, the main instructions piece the user gave (account instructions, or custom instructions in ChatGPT), and the heading says which.
- **Keep:** every line that isn't part of a finding, exactly as written, in its order, with the user's headings, words, punctuation and casing. Don't polish, merge or reorder.
- **Change only finding lines:**
  - Stale: update it from the newer line in the inputs, or remove it, or replace it with a [placeholder].
  - Conflict: the line the inputs settled on, or a [placeholder] that names both options in the user's words.
  - Vague: point it at the line that pins it down, or replace it with a [placeholder] question.
  - Privacy: remove the value. Remove the whole line when it only held the value; keep the rest when it says something else.
  - Missing: a new line with the fact from another piece (cited in Check Before Sending), or a [placeholder] question.
  - A line that breaks a compliance line: rewrite it so it keeps the user's own intent and words inside the compliance line, or remove it; the fix says which, and that the user can choose the other.
- **Placeholders:** square brackets, the question inside, worded so the user can answer in place: [Your market: which cities or counties?]. A placeholder may quote the options the workspace gives; it never suggests new facts. Every placeholder is listed in Check Before Sending.
- **The voice profile:** copied character for character, in its place. The only change ever made inside it is removing a private detail, flagged.
- **Compliance block:** section 5.
- **Format:** plain text in one fenced code block, ready to paste. No new sections or rules beyond the moved-in facts, the placeholders and the compliance block. For ChatGPT custom instructions, under 1,500 characters.

## 8. The Memory List

One row per memory item, in order: the number, the item quoted exactly (private details replaced), the action, the new wording for a Change, and why.
- **Keep:** still true, not stale, and the kind of standing context memory is for (role, team, tools, preferences). An item that repeats the instructions is kept: memory also reaches chats outside the project.
- **Change:** the new wording comes from the inputs only. A changed fact the user must supply is written as a [placeholder].
- **Remove:** private details; stale items; client deal details (they belong in the CRM, and memory keeps them after the deal closes).
- **Decide:** an item in a conflict the user hasn't settled. Give both options.
- Say how to make the changes: the click path from the workspace file, and that the tune-up itself changed nothing. With no memory given, say the list wasn't made and how to copy memory for next time.

## 9. The Diff

A fenced code block marked `diff`, covering every non-blank line of the original Project instructions (copy lines skipped as in section 1) and of the rewrite, in order. Each line starts with a two-character marker:
- two spaces: unchanged
- "- " (minus, space): removed
- "+ " (plus, space): added

A changed line shows as its "- " line, then its "+ " line. Private details stay replaced in "- " lines. Before output, check both directions: the unchanged and "+ " lines, read in order, are exactly the rewrite's non-blank lines; the unchanged and "- " lines, read in order, are exactly the original's non-blank lines (with private details replaced). Fix the diff until both hold.

## 10. Check Before Sending

Before the user pastes anything:
- Every fact that moved into the rewrite or the memory list (names, brokerage, areas, dates, tools, numbers), each with the piece and line it came from.
- Every placeholder, with its question.
- Every decision left to the user, with both options.
- Every private detail removed, by kind and location only, and where else to delete or change it.
- The compliance lines: which were kept (and where), which were added.
- The voice profile: kept character for character, or none found.
- The diff: both directions checked.
- Lines skipped as copy headers.
- Where each piece gets pasted or changed, with its click path.
