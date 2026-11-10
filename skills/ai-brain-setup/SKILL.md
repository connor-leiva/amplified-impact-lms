---
name: ai-brain-setup
description: "Interviews a real estate agent or team leader a few questions at a time and builds the Claude workspace every other skill works better on: paste-ready Project instructions with a compliance block, an About My Business file for project knowledge (market, niche, team, CRM such as Follow Up Boss, brokerage rules, compliance limits, goals), a How I Like to Work block for account instructions and a short list of facts for memory, each labeled with exactly where it goes. Uses a voice profile QUICK CARD when there is one. Anything not said stays a [placeholder]; passwords, account numbers and client details are refused. Use it whenever someone says set up my AI brain, set up my Claude project, what goes in project instructions, make Claude know my business, I just got Claude Pro, or attaches interview answers or a QUICK CARD, even if they never say AI brain. Not for auditing a workspace already set up (ai-brain-tuneup), the shared team brain (team-ai-brain), or a team SOP playbook skill (team-playbook-builder)."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# AI Brain Setup

Build the foundation every other skill stands on: a short interview that turns what an agent or team leader says about their business into a Claude setup they paste in once. Claude only knows what it's told. Set up once, every chat and every skill starts out knowing the market, the team, the CRM and the rules, instead of guessing or asking again.

**Run:** asks the interview a round at a time, screens every answer for secrets, client details and protected-class wording, sorts each answer into the right block, picks Utah or general mode, and labels exactly where each block goes. **Draft:** the four blocks (How I Like to Work, Project Instructions with its compliance block, About My Business, Facts to Remember), for the user to read, edit and paste. **Own:** the user pastes every block, decides what Claude remembers, confirms brokerage and state rules with their broker, keeps passwords, account numbers and client details out of Claude, and chooses their plan and settings. This skill never changes a setting, saves a memory or logs in to anything itself.

## 1. Start the Right Way

- Read `references/brain-templates.md` (The Interview, Screening Every Answer, the four blocks) and `references/claude-workspace.md` before the first question.
- **Answers already given** (pasted, an attached answers file, a QUICK CARD): don't re-ask. Build now from what's there. Every gap is a [placeholder], and Still To Fill In lists the questions that would fill them.
- **Nothing given:** run the interview in the guide's five rounds, one round per message, and wait for each round's answers. Open round 1 with the privacy line. "Skip" or "not sure" is fine: that answer becomes a [placeholder]. "Build it now" at any point: build with what you have. In interview mode the output is only the current round.
- Never ask the user to type what a file they have already says. If they attach their brokerage's or team's policy document, take only the rules it states, each with its page.
- Today's date is the chat's date. Write it as the About My Business "Last updated" date.

## 2. Screen Every Answer Before Using It

Use the guide's Screening Every Answer table on every answer and file, the QUICK CARD included. Never repeat a screened item anywhere in the output, not even in part or masked.
- **A secret** (password, login, PIN, code, key; account, routing, wire, card or Social Security number): leave it out, flag it in generic words, and tell the user to copy what they need, delete this chat, check Settings, Your Claude, Manage next to Your memory, and change the password if it was real. Never use it to log in.
- **A client's details:** out of every block and out of memory, even when asked. Client records live in the CRM. Decline "remember my clients' numbers" or "text my clients" in one line, with why: nothing about clients is saved; texts need the client's documented consent; the AI drafts and never sends.
- **People described by a protected class** in a niche or goal ("young families," "retirees"): rewrite as property and transaction terms and flag it without quoting it.
- **Personal details** about a team member, or the user's own health, family or money: leave out.

## 3. Pick Utah or General Mode

- **Utah mode** when the user works in Utah: read `references/utah-brain-notes.md` and paste its Utah Lines, word for word, under STATE RULES.
- **General mode** anywhere else: STATE RULES says "State rules were not checked." with a [placeholder] to ask the broker, and a flag says so.
- **State not given:** [State], general mode, and a flag.

## 4. Build the Four Blocks

Use the guide's templates exactly, in its order and headings. Plain text, headings in capitals, so each block pastes anywhere.
- **How I Like to Work:** under 1,500 characters before MY VOICE.
- **Project Instructions:** under about 4,000 characters. The COMPLIANCE section always holds all seven house lines, word for word, whatever the user said, plus their own rules and limits marked "as I stated them," plus STATE RULES.
- **About My Business:** facts in the user's words; numbers exactly as stated, never rounded, totaled or projected; the team by roles and counts; the CRM as answered, or [CRM: Follow Up Boss?] when the user didn't say.
- **Facts to Remember:** five to ten lines: the template's house lines, and otherwise only facts the user gave. A line with a gap is left out, never stored as a placeholder, and goes in Still To Fill In. Nothing about clients, nothing secret, nothing that changes week to week.
- **Team leader:** the same blocks for the leader's own workspace, the team by role. Mention once that a brain the whole team shares is team-ai-brain.

## 5. Place the Voice Profile

- **QUICK CARD given:** paste it word for word under MY VOICE (QUICK CARD) at the end of How I Like to Work. Never edit, shorten or summarize it. Say the full profile stays in their My Voice project, and how to add it to this project's files if they want it here too.
- **No QUICK CARD:** use the template's default line, flag it, and point to amplifiedimpact.io/voice-profile: make one free, then paste its QUICK CARD under MY VOICE. Never invent a voice.

## 6. Say Exactly Where Each Piece Goes

From `references/claude-workspace.md` only. The first line above every block is "**Paste into:**" and its exact place and click path. The Where Everything Goes table gives each piece, its place, the steps and the plan notes. Also say:
- Name the project [Name]'s AI Brain. Claude can't see the name or description, so nothing else goes there.
- Say the Facts to Remember in a new chat outside any project, so every project can use them, then check Settings, Your Claude, Manage next to Your memory.
- When the plan is Team, Enterprise or not given: an owner decides whether memory is on. With memory off, the facts still live in About My Business.
- When the plan is Free or not given: Free holds five projects at most, and if Set project instructions isn't there, the Project Instructions block goes at the top of About My Business.
- Don't use a style: the help center now points to skills for tone and format.
- When code execution is on, also hand over About My Business.txt as a file; otherwise the user pastes the block into a plain text file with that name.

## 7. Guardrails

- **Nothing invented.** Every fact, number, date and name comes from the user's answers, their files or this chat. Anything they didn't say is a [placeholder]. No market statistics, no example goals, no sample team.
- **Never asks for or keeps secrets**: no passwords, logins, or account, routing, wire or Social Security numbers. Pasted ones are flagged, never repeated, never used.
- **Nothing about clients** goes into any block or into memory, even when asked.
- **The compliance block is always there**, with fair housing (describe properties, never people), TCPA consent before texts, drafts only and stay in lane, plus Utah Lines or the general-mode line.
- **Stay in lane:** brokerage rules and compliance limits are written as the user states them, never added to or ruled on. Law and brokerage questions go to the broker. No income or production projections; goals only as stated.
- **Drafts only:** never change a setting, save a memory, create a project or log in, even with a connector or when asked. The user pastes everything.
- **Connor's filters:** client records, tasks and reminders stay in the CRM; the brain points to it and never copies it.

## 8. Output, In This Order

In interview mode, only the current round: the privacy line (round 1), that round's questions, and one line on what's next. Once building:

1. **Flags**, only when they apply: screened items (generic words, never repeated), declined requests, protected-class wording rewritten, no QUICK CARD, general mode or no state, plan notes, and the count of placeholders
2. **Bottom line** (three sentences max): what was built, for whom, how many placeholders are left, and the one thing to paste first
3. **Where Everything Goes:** the table
4. **Block 1: How I Like to Work**, with its Paste into line
5. **Block 2: Project Instructions**, with its Paste into line
6. **Block 3: About My Business**, with its Paste into line
7. **Block 4: Facts to Remember**, with its Paste into line
8. **Your Voice:** where the QUICK CARD went, or the pointer to amplifiedimpact.io/voice-profile
9. **Still To Fill In:** every distinct placeholder, with the question that fills it
10. **Check Before Pasting:** every fact and number in the blocks with the answer it came from, each rule marked "as you stated it, confirm with your broker," the Utah lines' check date, and a last check that no secret or client detail appears anywhere

Each block sits in its own code block so it copies cleanly. If the user asks for one piece ("just the project instructions"), give it with the flags, its Paste into line and Check Before Pasting.
