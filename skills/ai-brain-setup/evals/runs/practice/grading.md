# Grading: Practice Run, Juniper Mockwell (Utah Solo Agent, Full Answers and a QUICK CARD)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `brain-templates.md`, `claude-workspace.md` and `utah-brain-notes.md` read where SKILL.md says to (Utah mode: Lehi, Saratoga Springs, Eagle Mountain, American Fork). Inputs: the two practice files, `PRACTICE Interview answers, Juniper Mockwell.md` and `PRACTICE Voice profile QUICK CARD, Juniper Mockwell.md`. Prompt (the page's practice prompt): "Here are my interview answers and my voice QUICK CARD. Set up my AI brain." Code execution was treated as on, so the run also saved `About My Business.txt` beside the output.

Result: **pass, 12 of 12 checks** (after the two SKILL.md fixes below). Objective checks in `objective-checks.txt`: 21 of 21 pass. This run is `sample.md`.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Builds at once from the attached answers, with no round of questions | Pass | The output opens with Flags and the Bottom Line; no question is asked |
| 2 | Every block is labeled, right above it, with exactly where it goes in Claude | Pass | Four Paste into lines: "Settings, Your Claude, Instructions (account-wide)"; "the Juniper's AI Brain project, Set project instructions, then Save instructions"; "the Juniper's AI Brain project's knowledge. Click + ... upload it as About My Business.txt"; "a new chat outside any project" |
| 3 | Where Everything Goes gives the place, the steps and plan notes | Pass | Five rows, each with the click path from `claude-workspace.md` and a plan note (every plan; Free holds five projects; memory on by default on Free, Pro, Max and Ultra; the owner decides on Team or Enterprise), plus the Free fallback for project instructions and "Don't make a style" |
| 4 | The compliance section holds all seven house lines | Pass | Objective check: the seven lines from the template, word for word, with "Follow Up Boss" for [CRM] |
| 5 | Utah mode: the Utah Lines, with 13-25a-111 and house practice | Pass | Objective check: the Utah Lines block word for word; "Utah's evening, Sunday and holiday limits (13-25a-103) don't apply to licensees acting within the license (13-25a-111), but my house practice is..." |
| 6 | The QUICK CARD word for word under MY VOICE; How I Like to Work under 1,500 characters before it | Pass | Objective check: the card from "Write as me." to "Sign-off: Talk soon, Juniper" matches; 969 characters before MY VOICE |
| 7 | Brokerage rules and limits as stated, with nothing added | Pass | Three rules from answer 9 and five limits from answers 10 and 11, each on its own line under "(as I stated them)"; nothing added |
| 8 | Goals exactly as stated, with no total or projection | Pass | "24 closings in 2027, up from 17 this year (2026)," "300 people," "3 times a week." Check Before Pasting says "this year" was written as 2026 from today's date |
| 9 | People described by familial status are rewritten and flagged, not quoted | Pass | "First-time buyers, and buyers moving out from Salt Lake for more space"; the flag says answer 4 "described some of your clients by family status" and why. "young families" appears nowhere (objective check) |
| 10 | Facts to Remember: given facts plus the house lines, no placeholders, nothing about clients | Pass | Seven lines; lines 4 (second sentence), 5 and 7 are the template's house lines; the rest are answers 1, 2, 3, 5, 6 and 15 |
| 11 | Still To Fill In and Check Before Pasting, with answer numbers | Pass | Still To Fill In: "Nothing." Check Before Pasting: 19 rows, each with its answer number or source |
| 12 | Nothing invented | Pass | Answer 8 gave no percentages and none were added ("No percentages were given, and none were added"); answer 15 gave no AM or PM and none was added; no market figures, no example goals |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input or a reference | Pass | Statute numbers (57-21-5, 61-2f-401(12), 13-25a-103, 13-25a-111, 13-77-102 and 103) and 30MB are from the references; 2026 and November 10 are the run date; the rest are in the answers file or the QUICK CARD |
| No em or en dashes | Pass | |
| Title Case subject lines | N/A | This skill writes no email subjects. Section headings are Title Case |
| Check before sending present | Pass | As "Check Before Pasting," this skill's version |
| No secrets, emails or phone numbers | Pass | |
| No protected-class language | Pass | |

## What Failed, and the Fix

- **Plan notes were unconditional.** SKILL.md step 6 said "On Free: ..." and "On Team or Enterprise: ..." as things to always say, while the first draft of this output gave only part of each. Fix to SKILL.md: both lines now apply "when the plan is Free or not given" and "when the plan is Team, Enterprise or not given," and this output now says both (Juniper didn't give her plan).
- **Facts to Remember's standing lines.** The template's "I want drafts only" and "Client records live there" lines are house lines, not Juniper's own words, but SKILL.md said every line is a fact the user gave. Fix to the template and SKILL.md: lines 5 and 7 and the second sentence of line 4 are house lines; every other line is a fact the user gave.
