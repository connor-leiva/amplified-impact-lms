# Page Notes: AI Brain Tune-Up (/ai-brain-tuneup)

Skill: `ai-brain-tuneup`, version 1.0. Works in Claude (skill) and ChatGPT (Project). Part of the AI Brain set with `ai-brain-setup` (first-time setup) and `team-ai-brain` (the shared team brain). The skill is paid (in the Amplified Skill Library), so the page shows its hero and sample with the Skill Library card; the setup words below are for the day it is free. Every fact below was checked on 2026-11-10; sources are inline and in `references/claude-workspace.md` and `references/chatgpt-workspace.md`.

## One-Line Promise

Paste in what your AI already knows about you (your project's instructions, its files and its memory) and get back every stale, conflicting, vague or missing line, quoted, with a clean set of instructions to paste back in.

## Who It's For

Any agent, team leader or ops person who has used Claude or ChatGPT for a few months and has a project, memory or custom instructions built up. Most useful when drafts have started to drift: an old brokerage in a signature, last year's goals in an answer, a person who left still named in a process, or two settings that fight. It works in any state; it checks the workspace, not state law.

## Connor's Filter

Nothing else in the stack reads the AI's own workspace: Follow Up Boss, Sisu and the dashboards don't touch it. No manual entry beyond copying four or five pieces out of the app. It doesn't rebuild the voice profile (it keeps the QUICK CARD as it is and points to /voice-profile for a new one) or first-time setup (`ai-brain-setup`).

## What to Upload, and Where Each Piece Comes From

Upload files or paste text. Nothing needs retyping.

**Claude** (Claude's Help Center, checked 2026-11-10):
- **Project instructions:** open the project, open its instructions box ("Set project instructions"), select all, copy, paste into the tune-up chat. The help center describes no export button for them. (How can I create and manage projects?, updated 2026-11-06: https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)
- **Project knowledge files:** attach the originals from your computer. The help center doesn't describe downloading a file back out of a project, and Claude's data export "doesn't include the original files you uploaded." (Export your Claude data, updated 2026-11-09: https://support.claude.com/en/articles/9450526-export-your-claude-data) Claude's upload list names TXT, not Markdown; if a .md file won't attach, paste it. (Upload files to Claude: https://support.claude.com/en/articles/8241126-upload-files-to-claude)
- **Memory:** Settings > Your Claude, "Manage" next to Your memory, and copy each topic; or, in a chat inside the project, ask "Write out your memories of me verbatim, exactly as they appear in your memory." and copy the answer. Each project has its own memory, so ask inside the project to get it. (Import and export your memory from Claude, updated 2026-11-02: https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude; Use Claude's chat search and memory, updated 2026-11-05: https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)
- **Instructions for Claude (account-wide):** your initials in the lower left, Settings, Your Claude, Instructions. Copy the box. These reach every chat, inside projects too. (Understanding Claude's personalization features, updated 2026-10-23: https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features)
- **Custom styles:** Claude's styles article returned "not found" on 2026-11-10, and the personalization article now points to skills for tone and format. Secondary sources say custom styles moved into skills (Customize > Skills), switched off; not confirmed on the help center. If your chat box still has a style menu, copy the style's instructions from there; if it became a skill, open it in Customize > Skills and copy what it shows. (Use skills in Claude: https://support.claude.com/en/articles/12512180-use-skills-in-claude)

**ChatGPT** (OpenAI's help center blocks direct reading, so these come from its articles as shown in search results on 2026-11-10, from learn.chatgpt.com read directly, and from Amplified's vendor check of 2026-11-08 for the Project steps):
- **Project instructions:** the project's ••• menu > Project settings > Instructions; select all, copy. (Projects in ChatGPT: https://help.openai.com/en/articles/10169521-projects-in-chatgpt)
- **Project files:** attach the originals from your computer.
- **Memory:** Settings > Personalization > Manage memories; copy the list, or ask ChatGPT to list every saved memory word for word. (Memory FAQ: https://help.openai.com/en/articles/8590148)
- **Custom instructions:** Settings > Personalization; copy each box. Base style and tone is there too. (https://help.openai.com/en/articles/8096356 and https://learn.chatgpt.com/codex/personalize)

**Don't upload a full data export.** Both apps' exports hold every chat you've had. Copy only the pieces above.

**Before you start (Claude):** use a new chat outside the project you're tuning (the project's instructions apply to every chat inside it), and turn Memory off for that chat first: click "+" in the message box, click "Memory," then send. Nothing from the tune-up, including details it flags for removal, gets saved to memory. (Use Claude's chat search and memory, "Turn off memory for a single chat.")

## Things to Say to It

1. "Tune up my Claude project. Here are my project instructions, my knowledge files and my memory."
2. "My AI keeps using my old brokerage. Here's everything it knows about me. What's wrong?"
3. "Audit my instructions against my memory. Which lines disagree?"
4. "Here's my team ops project and my account instructions from Settings. Clean it up."
5. "Just the memory list, please."

## What Comes Back

- **Flags:** private details found (by kind and place, never the value), compliance lines it added, decisions waiting on you, placeholders, pieces it didn't get.
- **A bottom line:** how many findings of each kind, the biggest problem, and the one fix to make first.
- **A findings table:** each stale, conflicting, vague or private line quoted exactly, where it lives, and why it matters, then a table of what's missing, with a question for each.
- **A ranked fix list:** private details first, then compliance, conflicts, stale facts, missing basics and vague lines, each with where to make the change.
- **Rewritten Project instructions,** ready to paste: your own lines kept word for word, only the problem lines changed, a [placeholder] wherever only you know the answer, and the fair housing, texting consent and drafts-only lines kept or added.
- **A clean memory list:** every item quoted, marked Keep, Change, Remove or Decide.
- **A before and after diff** of the instructions, checked against the rewrite.
- **Check before sending:** every fact it moved and where it came from, every placeholder, every decision, and where each piece gets pasted.

## What It Won't Do

- Change anything in your account: not your project, files, memory, styles or settings. You paste and delete.
- Repeat a phone number, password, code, account or wire number it finds. It flags each by kind and place.
- Invent a fact to fill a gap: no made-up goals, markets, team members or brand colors. It asks.
- Pick a side in a conflict the workspace doesn't settle.
- Rewrite your voice profile. It keeps your QUICK CARD word for word; for a new one, use the free guide at /voice-profile.
- Drop or soften a compliance line. It adds the house lines where yours are missing and says so. They're general, not checked against your state's rules.
- Set up a workspace for the first time (AI Brain Setup), build a shared team brain (Team AI Brain) or turn SOPs into a playbook (Team Playbook Builder).

## What the Person Needs

- **Claude:** a plan with skills and code execution on (Settings > Capabilities). The help center lists skills on every plan; projects are on every plan, with five on Free. Memory is on by default for Free, Pro, Max and Ultra; on Team and Enterprise, owners control it. (What are projects?, updated 2026-10-30: https://support.claude.com/en/articles/9517075-what-are-projects)
- **ChatGPT:** a Project (on Free, Go, Plus and Pro); Free holds 5 files, and this version needs 3.
- **Time:** about 10 minutes to copy the pieces; the tune-up itself is one chat.
- **Cost:** nothing beyond the plan. No connectors.
- **How often:** monthly, or when drafts start to drift.

## Run / Draft / Own

- **Run:** reads every piece, numbers the lines, sweeps for private details, sorts each problem, and checks the diff against the rewrite.
- **Draft:** the fix list, the rewritten instructions, the memory list and the diff, for you to read first.
- **Own (you):** every decision in a conflict, every answer behind a placeholder, every change in your account, and any compliance wording question for your broker.

## FAQs

**Why not just ask Claude to clean up its own instructions?** You can, but a general cleanup paraphrases your lines, picks a side in conflicts, fills gaps with plausible guesses and can repeat what it finds. This one quotes every line exactly, keeps your wording where it isn't the problem, leaves every unsettled decision and missing fact to you as a placeholder, never repeats a private detail, keeps your QUICK CARD and compliance lines, and gives a diff that matches the rewrite.

**Will it delete things from my memory?** No. It gives you a keep, change or remove list and the click path. You make each change in Settings, or by telling the AI in a regular chat. Deleting a chat doesn't remove memory made from it, so remove the memory itself.

**What are the compliance lines it adds?** Three lines: fair housing (describe properties, never people), texting consent (text only people who agreed, with "Reply STOP to opt out" on marketing texts) and drafts only. If you have your own, it keeps yours word for word. The house lines are general, not checked against any state's rules; your broker has the last word.

**I don't have a project, just custom instructions or memory.** That works. It rewrites whichever main instructions you give it and says which.

**How often should I run it?** Monthly, or sooner when drafts start getting things wrong: after a brokerage move, a team change or a new year's goals.

## Practice Prompt

Attach the four practice files from `ai-brain-tuneup-practice.zip` and say: **"Tune up my Claude project. Attached are my project instructions, my two knowledge files and my memory, written out by Claude."** The sample on the page is what came back: a made-up agent, Jamie Testerson, whose 2025 plan still names an old brokerage and a transaction coordinator who left, whose instructions and memory disagree on email length, and whose memory holds a seller's phone number. The sample was run on November 10, 2026; the 2025 plan reads as stale on any day after 2025.

## Suggested Library Keywords

ai brain, tune up, tune-up, audit, claude project, project instructions, project knowledge, knowledge files, memory, claude memory, chatgpt memory, custom instructions, instructions for claude, custom style, styles, stale instructions, conflicting instructions, ai keeps getting it wrong, drift, clean up, voice profile, quick card, compliance lines, fair housing, texting consent, drafts only, workspace, context, calibrate

## Tested and Not Tested

**Tested (2026-11-10), on made-up workspaces:**
- Practice set (messy instructions with five vague lines, a texting line with no consent, a length conflict with memory, a stale 2025 plan naming an old brokerage and a departed transaction coordinator, a current checklist, and a memory write-out with a seller's phone number): 10 of 10 expectations, 14 of 14 objective checks. Kept as sample.md.
- Eval 1, a team leader's ops workspace (five pieces, including account-wide instructions and a PDF) with a Follow Up Boss login and password, bank routing and account numbers, a recruit's cell and personal email, an old brokerage, a departed transaction coordinator, a day conflict, a bullets conflict across account and project, a recruiting text with no consent, and partial compliance lines: 11 of 11 expectations, 14 of 14 objective checks.
- Eval 2, a mostly fine workspace with a QUICK CARD and all three compliance lines, whose custom style says casual while the instructions say formal, and a client's phone number in memory: 9 of 9 expectations, 15 of 15 objective checks. The QUICK CARD came through character for character.
- The objective checks (`evals/make/objective_checks.py`): every table quote found word for word in the inputs, private values absent, compliance lines present, the QUICK CARD intact, the diff matching the rewrite both ways, every added placeholder in Check Before Sending, every number in the inputs, and no em or en dashes.

**Not tested:**
- Real workspaces from Utah Life agents or Connor's team, and real Claude memory write-outs (the practice copies follow the help center's export prompt, but their layout is our guess).
- Running the tune-up inside the project being tuned, the new version of projects (beta), or a project in RAG mode.
- Styles that became skills: we couldn't see the migrated skill's details screen, so whether its wording can be copied there is unconfirmed.
- The ChatGPT version inside ChatGPT, and real ChatGPT memory and custom instructions copies.
- Long workspaces (the eval pieces run 3 to 27 lines each), scanned PDFs, and a no-skill baseline.
- The description against every skill installed at once; it names ai-brain-setup, team-ai-brain and team-playbook-builder as the siblings.
