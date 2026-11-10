# AI Brain Tune-Up: My Real Estate Assistant (Jamie Testerson, Testerson Home Team)

*Made-up example: what the skill returned for the four practice files and the practice prompt, run on November 10, 2026 and graded in evals/runs/practice/grading.md (10 of 10 expectations, 14 of 14 objective checks). Every person, team, brokerage, client and number in it is made up. The run date matters only for what counts as stale: the 2025 plan is out of date on any day after 2025.*

Prompt: "Tune up my Claude project. Attached are my project instructions, my two knowledge files and my memory, written out by Claude."

Pieces received: Project instructions; Knowledge: 2025 Business Plan; Knowledge: Listing Launch Checklist; Memory, written out by Claude on November 9, 2026 (items M1 to M11). Run on November 10, 2026.

## Flags

1. **Private detail found:** one client's phone number, in memory (M10). It is flagged for removal below and not repeated anywhere in this tune-up.
2. **Compliance lines added:** no piece has a fair housing, texting consent or drafts-only line, so the rewrite adds all three house lines. The house lines are general; state rules were not checked. Ask your broker if your state or brokerage needs more.
3. **Two decisions are yours:** how long client emails should be (finding 3) and your current goal (finding 6). The rewrite holds a placeholder for the first; the memory list holds one for the second.
4. **Placeholders:** 4 in the rewrite, each listed in Check Before Sending with its question.
5. **Not received, so not checked:** Instructions for Claude (Settings > Your Claude > Instructions) and any custom style. A line in either reaches this project too and could fight these instructions.
6. **No voice profile found.** The rewrite asks for your QUICK CARD instead of writing a voice for you.
7. **App:** Claude. The memory copy was written out in a chat inside the project, so it holds the project's memory and your memory from chats outside projects.

## Bottom Line

Your workspace has 12 findings (1 privacy, 2 conflicts, 3 stale, 5 vague and 1 line pointing to a file that isn't there), and it has no compliance lines at all. The biggest problem is that nothing limits texts to people who agreed to them, while line 14 tells the AI to text every new lead first. Fix first: delete the memory item that holds your seller's phone number, then paste the rewrite, which keeps your texting line inside a consent rule and adds the fair housing, texting consent and drafts-only lines.

## Findings

| # | Type | Exact line | Where it lives | Why it matters |
|---|---|---|---|---|
| 1 | Privacy | "Jamie is listing the Mockridge home on Sample Creek Lane in Kaysville. The seller, Alex Mockridge, prefers texts after 5 PM at [client phone number removed]." | Memory, M10 | A client's phone number in memory can surface in any chat, inside this project or outside it. Client contact details belong in Follow Up Boss, not in the AI's memory. |
| 2 | Conflict (compliance) | "Always text new leads first, then email if they don't answer." | Project instructions, line 14 | No piece limits texts to people who agreed to get them, so drafts will text every new lead first, consent or not. |
| 3 | Conflict | "Keep client emails under 100 words." against "Jamie likes long, detailed client emails that walk through every comp and every number." | Project instructions, line 7; Memory, M6 | The two can't both be followed, so drafts will swing between a short note and a long walk-through. Neither line is dated, so the inputs don't settle it: you decide. |
| 4 | Stale (settled) | "Fakewood Realty Group" against "In March 2026, Jamie moved the team from Fakewood Realty Group to Placeholder Peak Realty." and "Testerson Home Team, Placeholder Peak Realty" | Knowledge: 2025 Business Plan, line 2; Memory, M2; Knowledge: Listing Launch Checklist, line 2 (updated October 14, 2026) | A draft that leans on the plan can put your old brokerage on client writing. Memory dates the move and the October checklist agrees, so Placeholder Peak Realty is current. |
| 5 | Stale (settled) | "Jordan Notreal: transaction coordinator. Jordan handles all listing paperwork and sends every DocuSign." against "Jordan Notreal left the team in August 2026." and "The team is Jamie, Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026)." | Knowledge: 2025 Business Plan, line 12; Memory, M4 and M3 | A draft could tell a seller that Jordan will send their paperwork. Memory dates the change, and the October checklist agrees: "Casey Mockwell opens the transaction file and sends the listing agreement for signatures." (line 5). |
| 6 | Stale (ask) | "2025 Goals" and "Jamie's goal for the year is 30 closings." | Knowledge: 2025 Business Plan, line 4 (goals on lines 5 to 8); Memory, M9 | 2025 is over. M9 names no year and matches the plan's "30 closed transactions" goal. No piece gives a current goal, so anything about goals runs on last year's plan. Only the dates say it's old: tell me the current goal. |
| 7 | Vague | "Be professional." | Project instructions, line 4 | Two people would write two different emails from it, and nothing else in the workspace pins it down. |
| 8 | Vague | "Make my emails sound good." | Project instructions, line 5 | Nothing says what "good" sounds like for you, so each draft guesses. |
| 9 | Vague | "Keep everything short but thorough." | Project instructions, line 6 | It pulls two ways at once, and it sits beside the length conflict in finding 3. |
| 10 | Missing | "Use the brand colors and logo from the brand file." | Project instructions, line 12 | No brand file is in this project, so the AI has no colors or logo to use and may guess. |
| 11 | Vague | "Write follow-up notes in my CRM notes format." | Project instructions, line 13 | It doesn't name the CRM (memory does: "Jamie uses Follow Up Boss as the team's CRM." M5) or show the format, so every note's layout is a guess. |
| 12 | Vague | "Help me with whatever I need." | Project instructions, line 15 | It adds nothing the jobs above don't, and it invites drafts outside the jobs you listed. |

### Missing

| What's missing | Where I looked | Why it matters | Question for you |
|---|---|---|---|
| Fair housing, texting consent and drafts-only lines | All four pieces | Nothing stops a draft from describing who an area suits, texting someone who never agreed, or reading as ready to send. | None: the three house lines are added in the rewrite. Tell me if your broker wants other wording. |
| Your brokerage, market, team and CRM, in the instructions | Found in memory (M1, M2, M3, M5) and the checklist (line 2) | Instructions are the one piece every chat in the project reads in full; memory can be paused or turned off for a chat. | None: moved into the rewrite from memory. Check each one in Check Before Sending. |
| Your voice | All four pieces: no QUICK CARD, no example email | "Be professional" and "sound good" are all the AI has to go on. | Paste your voice profile QUICK CARD (amplifiedimpact.io/voice-profile), or say in a line or two how client emails should sound. |

## Ranked Fix List

1. **Delete the seller's phone number from memory** (finding 1). Settings > Your Claude, "Manage" next to Your memory, open the topic with the Mockridge listing, and select "Delete." Or, in a regular chat in this project with memory on, say "Forget the Mockridge listing details and the seller's phone number." Deleting a chat doesn't remove memory made from it, so delete the memory itself.
2. **Keep texting inside a consent rule** (finding 2 and the Missing compliance lines). Paste the rewrite: line 14 becomes "Text new leads first only when I tell you they agreed to get texts from me, then email if they don't answer. Without that, email first." and the Compliance block is added at the end. If you'd rather the AI never draft texts to new leads, delete that line instead.
3. **Decide on email length** (finding 3): under 100 words (instructions, line 7), or long and detailed, walking through every comp and every number (memory, M6). Fill the email length placeholder in the rewrite with your choice, then change or delete M6 to match.
4. **Retire the 2025 Business Plan** (findings 4, 5 and 6). Remove it from the project's knowledge (the right side of the project page). If "Where We Work" and "Marketing" still hold, put them in a current file. Then tell me your current goal for M9.
5. **Answer the missing pieces** (finding 10 and the Missing table): paste your QUICK CARD into the voice placeholder, and upload your brand file or type your brand colors where the brand placeholder is.
6. **Replace the vague lines** (findings 7, 8, 9, 11 and 12): the rewrite swaps lines 4 to 6 for the voice and email length placeholders, names Follow Up Boss on line 13 and asks for one example note, and drops line 15.
7. **Move a client's deal out of memory** (memory M11): delete the Exampleton buyer search from memory the same way as fix 1. It belongs in Follow Up Boss.

Then run the tune-up again next month, or sooner when drafts start drifting.

## Rewritten Project Instructions

Paste this into the project's instructions box ("Set project instructions"), replacing what's there, and click "Save instructions." Answer each [placeholder] first.

```text
# My Real Estate Assistant

You are my real estate assistant. I'm Jamie Testerson and I run the Testerson Home Team.
Brokerage: Placeholder Peak Realty (since March 2026).
Market: Davis County, Utah.
Team: Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026).
CRM: Follow Up Boss.

## How to write
- [Voice: paste your voice profile QUICK CARD here (amplifiedimpact.io/voice-profile), or say in a line or two how client emails should sound.]
- [Email length: keep client emails under 100 words, or make them long and detailed, walking through every comp and every number? Pick one.]
- Don't use emojis.
- Sign emails: Jamie Testerson, Testerson Home Team

## What I need help with
- When I paste a listing worksheet, write the MLS description and a social caption.
- Use the brand colors and logo from the brand file. [Brand file: none is in this project. Upload it, or type your brand colors and where the logo comes from.]
- Write follow-up notes in my Follow Up Boss notes format: [paste one note you like, as the example].
- Text new leads first only when I tell you they agreed to get texts from me, then email if they don't answer. Without that, email first.

## Compliance (keep these lines)
- Fair housing: Describe properties, never people. No comments on who a home or area suits, neighborhood demographics, school quality or safety. Point to official sources instead.
- Texting consent: Draft a text only to someone I say agreed to get texts from me. Every marketing text names me and ends with "Reply STOP to opt out."
- Drafts only: Everything you write is a draft for me to read first. Never send, post or text anything, and never write to my CRM.
```

## Clean Memory List

Nothing was changed in your memory. Make these changes in Settings > Your Claude, "Manage" next to Your memory (Topics: select a topic, then the edit icon or "Delete"), or by telling Claude in a regular chat with memory on.

| # | Memory item | Action | New wording | Why |
|---|---|---|---|---|
| M1 | "Jamie Testerson is a Realtor who leads the Testerson Home Team in Davis County, Utah." | Keep | | True, and now also in the instructions. |
| M2 | "In March 2026, Jamie moved the team from Fakewood Realty Group to Placeholder Peak Realty." | Keep | | Current, and it settles finding 4. |
| M3 | "The team is Jamie, Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026)." | Keep | | Current, and it settles finding 5. |
| M4 | "Jordan Notreal left the team in August 2026." | Keep | | True. |
| M5 | "Jamie uses Follow Up Boss as the team's CRM." | Keep | | True, and now also in the instructions. |
| M6 | "Jamie likes long, detailed client emails that walk through every comp and every number." | Decide | | Finding 3. Keep it if you choose long and detailed; delete it if you choose under 100 words. |
| M7 | "Jamie writes MLS descriptions under 900 characters." | Keep | | A standing preference for the MLS job. |
| M8 | "Jamie doesn't like exclamation points in client emails." | Keep | | A standing preference. |
| M9 | "Jamie's goal for the year is 30 closings." | Change | "Jamie's goal for [year] is [number] closings." | Finding 6: it matches the 2025 plan and names no year. |
| M10 | "Jamie is listing the Mockridge home on Sample Creek Lane in Kaysville. The seller, Alex Mockridge, prefers texts after 5 PM at [client phone number removed]." | Remove | | Finding 1: a client's phone number and deal details. They belong in Follow Up Boss. |
| M11 | "Jamie is helping buyers Sam and Lee Exampleton look in Layton under $550,000." | Remove | | A client's deal details stay in memory after the deal is done. They belong in Follow Up Boss. |

## Before and After Diff

Two spaces: unchanged. "- ": removed. "+ ": added. Blank lines left out.

```diff
  # My Real Estate Assistant
  You are my real estate assistant. I'm Jamie Testerson and I run the Testerson Home Team.
+ Brokerage: Placeholder Peak Realty (since March 2026).
+ Market: Davis County, Utah.
+ Team: Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026).
+ CRM: Follow Up Boss.
  ## How to write
- - Be professional.
- - Make my emails sound good.
- - Keep everything short but thorough.
- - Keep client emails under 100 words.
+ - [Voice: paste your voice profile QUICK CARD here (amplifiedimpact.io/voice-profile), or say in a line or two how client emails should sound.]
+ - [Email length: keep client emails under 100 words, or make them long and detailed, walking through every comp and every number? Pick one.]
  - Don't use emojis.
  - Sign emails: Jamie Testerson, Testerson Home Team
  ## What I need help with
  - When I paste a listing worksheet, write the MLS description and a social caption.
- - Use the brand colors and logo from the brand file.
+ - Use the brand colors and logo from the brand file. [Brand file: none is in this project. Upload it, or type your brand colors and where the logo comes from.]
- - Write follow-up notes in my CRM notes format.
+ - Write follow-up notes in my Follow Up Boss notes format: [paste one note you like, as the example].
- - Always text new leads first, then email if they don't answer.
+ - Text new leads first only when I tell you they agreed to get texts from me, then email if they don't answer. Without that, email first.
- - Help me with whatever I need.
+ ## Compliance (keep these lines)
+ - Fair housing: Describe properties, never people. No comments on who a home or area suits, neighborhood demographics, school quality or safety. Point to official sources instead.
+ - Texting consent: Draft a text only to someone I say agreed to get texts from me. Every marketing text names me and ends with "Reply STOP to opt out."
+ - Drafts only: Everything you write is a draft for me to read first. Never send, post or text anything, and never write to my CRM.
```

## Check Before Sending

Before you paste anything:
- **Facts moved into the rewrite, each with its source:**
  - "Brokerage: Placeholder Peak Realty (since March 2026)": memory M2, and the Listing Launch Checklist, line 2.
  - "Market: Davis County, Utah": memory M1.
  - "Team: Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026)": memory M3.
  - "CRM: Follow Up Boss" and "my Follow Up Boss notes format": memory M5.
- **Placeholders in the rewrite, each with its question:**
  - [Voice: paste your voice profile QUICK CARD here (amplifiedimpact.io/voice-profile), or say in a line or two how client emails should sound.]
  - [Email length: keep client emails under 100 words, or make them long and detailed, walking through every comp and every number? Pick one.]
  - [Brand file: none is in this project. Upload it, or type your brand colors and where the logo comes from.]
  - [paste one note you like, as the example]
- **Placeholders in the memory list:** M9's [year] and [number]: your current goal.
- **Decisions waiting on you:** email length (finding 3, both options in fix 3); your current goal (finding 6); and whether to keep the conditioned texting line or delete it (fix 2).
- **Private details removed:** one client phone number, memory M10. Delete it in memory (fix 1); it may also sit in the chat where you first shared it.
- **Compliance lines:** none of your own were found; all three house lines were added under "Compliance (keep these lines)."
- **Voice profile:** none found, so nothing to keep.
- **The diff:** checked both ways. Its unchanged and added lines read exactly as the rewrite, and its unchanged and removed lines read exactly as your original instructions.
- **Lines skipped as copy headers:** the "PRACTICE FILE" line at the top of each file; in the memory copy, the question you asked, "What Claude wrote back:", "Here is everything in my memory about you, word for word." and the four topic headings, which aren't memory items.
- **Where each piece goes:** the rewrite into the project's instructions box, then "Save instructions"; memory changes in Settings > Your Claude, "Manage" next to Your memory; the 2025 plan out of the project's knowledge, on the right side of the project page.
- **Not checked:** Instructions for Claude and any custom style (not received).
